import { Router, type IRouter } from "express";
import { db, reportsTable, vettingRequestsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";

const router: IRouter = Router();

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
    .select({ r: reportsTable, vr: vettingRequestsTable })
    .from(reportsTable)
    .innerJoin(vettingRequestsTable, eq(reportsTable.vettingRequestId, vettingRequestsTable.id))
    .where(and(eq(reportsTable.id, id), eq(vettingRequestsTable.employerId, req.userId!)));

  if (!row) { res.status(404).json({ message: "Not found" }); return; }
  res.json(formatReport(row.r, row.vr.id));
});

function formatReport(r: typeof reportsTable.$inferSelect, requestId: number) {
  const breakdown = r.scoreBreakdown as Record<string, number | null> | null;
  return {
    id: r.id,
    requestId,
    vettingRequestId: r.vettingRequestId,
    workerName: r.workerName,
    workerRole: r.workerRole,
    trustScore: r.overallTrustScore,
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
