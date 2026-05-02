import { Router, type IRouter } from "express";
import { db, vettingRequestsTable, staffRecordsTable, activityItemsTable } from "@workspace/db";
import { eq, and, count, desc, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";

const router: IRouter = Router();

router.get("/dashboard/summary", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const uid = req.userId!;

  const requests = await db.select().from(vettingRequestsTable).where(eq(vettingRequestsTable.employerId, uid));
  const staff = await db.select({ total: count() }).from(staffRecordsTable)
    .where(and(eq(staffRecordsTable.employerId, uid), eq(staffRecordsTable.active, true)));

  const total = requests.length;
  const completed = requests.filter(r => r.status === "completed").length;
  const inProgress = requests.filter(r => r.status === "in_progress").length;
  const pending = requests.filter(r => r.status === "pending_payment" || r.status === "paid").length;

  const scores = requests.filter(r => r.trustScore != null).map(r => r.trustScore!);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  const now = new Date();
  const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const staffList = await db.select().from(staffRecordsTable)
    .where(and(eq(staffRecordsTable.employerId, uid), eq(staffRecordsTable.active, true)));
  const renewals = staffList.filter(s => s.renewalDueAt && new Date(s.renewalDueAt) <= thirtyDaysOut).length;

  res.json({
    totalRequests: total,
    completedRequests: completed,
    inProgressRequests: inProgress,
    pendingRequests: pending,
    totalStaff: Number(staff[0]?.total ?? 0),
    upcomingRenewals: renewals,
    averageTrustScore: avgScore,
  });
});

router.get("/dashboard/activity", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const items = await db.select().from(activityItemsTable)
    .where(eq(activityItemsTable.userId, req.userId!))
    .orderBy(desc(activityItemsTable.createdAt))
    .limit(20);
  res.json(items.map(i => ({
    id: i.id,
    type: i.type,
    message: i.message,
    workerName: i.workerName,
    linkId: i.linkId,
    createdAt: i.createdAt.toISOString(),
  })));
});

export default router;
