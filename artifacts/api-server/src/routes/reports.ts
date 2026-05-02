import { Router, type IRouter } from "express";
import { db, reportsTable, vettingRequestsTable, usersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireRole, type AuthRequest } from "../lib/auth-middleware";

const router: IRouter = Router();

// PUBLIC — used by QR card scan links, no auth required
router.get("/reports/verify/:reportId", async (req, res): Promise<void> => {
  const reportId = parseInt(req.params.reportId as string, 10);
  if (isNaN(reportId)) { res.status(400).json({ message: "Invalid report ID" }); return; }

  const [row] = await db
    .select({ r: reportsTable, vr: vettingRequestsTable })
    .from(reportsTable)
    .innerJoin(vettingRequestsTable, eq(reportsTable.vettingRequestId, vettingRequestsTable.id))
    .where(eq(reportsTable.id, reportId));

  if (!row) { res.status(404).json({ message: "Report not found" }); return; }

  const { r, vr } = row;
  const breakdown = r.scoreBreakdown as Record<string, number | null> | null;

  const badges: string[] = [];
  if (r.identityVerified) badges.push("Identity Verified");
  if (r.dciCertificateStatus === "verified") badges.push("DCI Cleared");
  if (breakdown?.references != null && (breakdown.references ?? 0) >= 70) badges.push("References Checked");
  if (r.addressVerified) badges.push("Address Verified");
  if (r.socialMediaSummary) badges.push("Social Media Reviewed");

  res.json({
    reportId: r.id,
    workerName: r.workerName,
    workerRole: r.workerRole,
    workerPhotoUrl: r.workerPhotoUrl,
    trustScore: r.overallTrustScore,
    packageName: r.packageName,
    badges,
    summary: r.summary,
    flags: (r.flags as string[] | null) ?? [],
    verifiedAt: r.completedAt.toISOString(),
    vetCount: vr.id ? 1 : 0,
  });
});

router.get("/reports", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const rows = await db
    .select({ r: reportsTable, vr: vettingRequestsTable })
    .from(reportsTable)
    .innerJoin(vettingRequestsTable, eq(reportsTable.vettingRequestId, vettingRequestsTable.id))
    .where(eq(vettingRequestsTable.employerId, req.userId!))
    .orderBy(desc(reportsTable.completedAt));

  res.json({
    reports: rows.map(({ r, vr }) => formatReport(r, vr.id)),
  });
});

router.get("/reports/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ message: "Invalid ID" }); return; }

  const [row] = await db
    .select({ r: reportsTable, vr: vettingRequestsTable, emp: usersTable })
    .from(reportsTable)
    .innerJoin(vettingRequestsTable, eq(reportsTable.vettingRequestId, vettingRequestsTable.id))
    .innerJoin(usersTable, eq(vettingRequestsTable.employerId, usersTable.id))
    .where(and(eq(reportsTable.id, id), eq(vettingRequestsTable.employerId, req.userId!)));

  if (!row) { res.status(404).json({ message: "Not found" }); return; }
  res.json({
    ...formatReport(row.r, row.vr.id),
    employerName: row.emp.name,
    employerNeighbourhood: row.emp.neighbourhood,
    workerIdNumber: row.vr.workerIdNumber,
    workerPhone: row.vr.workerPhone,
    socialMediaSummary: row.r.socialMediaSummary,
    referencesSummary: row.r.referencesSummary,
    scoreBreakdown: row.r.scoreBreakdown,
    flags: row.r.flags ?? [],
  });
});

router.get("/reports/by-request/:requestId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const requestId = parseInt(req.params.requestId as string, 10);
  if (isNaN(requestId)) { res.status(400).json({ message: "Invalid request ID" }); return; }

  const [row] = await db
    .select({ r: reportsTable, vr: vettingRequestsTable, emp: usersTable })
    .from(reportsTable)
    .innerJoin(vettingRequestsTable, eq(reportsTable.vettingRequestId, vettingRequestsTable.id))
    .innerJoin(usersTable, eq(vettingRequestsTable.employerId, usersTable.id))
    .where(and(eq(reportsTable.vettingRequestId, requestId), eq(vettingRequestsTable.employerId, req.userId!)));

  if (!row) { res.status(404).json({ message: "Not found" }); return; }
  res.json({
    ...formatReport(row.r, row.vr.id),
    employerName: row.emp.name,
    employerNeighbourhood: row.emp.neighbourhood,
    workerIdNumber: row.vr.workerIdNumber,
    workerPhone: row.vr.workerPhone,
    socialMediaSummary: row.r.socialMediaSummary,
    referencesSummary: row.r.referencesSummary,
    scoreBreakdown: row.r.scoreBreakdown,
    flags: row.r.flags ?? [],
  });
});

function formatReport(r: typeof reportsTable.$inferSelect, requestId: number) {
  const breakdown = r.scoreBreakdown as Record<string, number | null> | null;
  return {
    id: r.id,
    requestId,
    vettingRequestId: r.vettingRequestId,
    workerName: r.workerName,
    workerRole: r.workerRole,
    workerPhotoUrl: r.workerPhotoUrl,
    packageName: r.packageName,
    trustScore: r.overallTrustScore,
    scoreBreakdown: breakdown,
    summary: r.summary,
    recommendation: r.overallTrustScore >= 80 ? "hire" : r.overallTrustScore >= 60 ? "caution" : "do_not_hire",
    identityStatus: r.identityVerified ? "passed" : "failed",
    dciStatus: r.dciCertificateStatus === "verified" ? "passed" : r.dciCertificateStatus === "not_found" ? "failed" : "pending",
    referenceStatus: breakdown?.references != null ? "passed" : "pending",
    socialMediaStatus: r.socialMediaSummary ? "passed" : "pending",
    addressStatus: r.addressVerified ? "passed" : "not_applicable",
    flags: r.flags ?? [],
    createdAt: r.completedAt.toISOString(),
  };
}

export default router;
