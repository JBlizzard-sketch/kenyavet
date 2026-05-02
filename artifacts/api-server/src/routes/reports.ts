import { Router, type IRouter } from "express";
import { db, reportsTable, vettingRequestsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";

const router: IRouter = Router();

router.get("/reports/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [report] = await db.select().from(reportsTable).where(eq(reportsTable.id, id));
  if (!report) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const [vr] = await db.select().from(vettingRequestsTable)
    .where(and(eq(vettingRequestsTable.id, report.vettingRequestId), eq(vettingRequestsTable.employerId, req.userId!)));
  if (!vr) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({
    id: report.id,
    vettingRequestId: report.vettingRequestId,
    workerName: report.workerName,
    workerRole: report.workerRole,
    workerPhotoUrl: report.workerPhotoUrl,
    packageName: report.packageName,
    overallTrustScore: report.overallTrustScore,
    scoreBreakdown: report.scoreBreakdown,
    summary: report.summary,
    identityVerified: report.identityVerified,
    dciCertificateStatus: report.dciCertificateStatus,
    socialMediaSummary: report.socialMediaSummary,
    referencesSummary: report.referencesSummary,
    addressVerified: report.addressVerified,
    flags: report.flags ?? [],
    completedAt: report.completedAt.toISOString(),
  });
});

export default router;
