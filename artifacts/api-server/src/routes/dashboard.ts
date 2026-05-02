import { Router, type IRouter } from "express";
import { db, vettingRequestsTable, vettingPackagesTable, staffRecordsTable, activityItemsTable } from "@workspace/db";
import { eq, and, count, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";

const router: IRouter = Router();

router.get("/dashboard/stats", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const uid = req.userId!;
  const requests = await db.select().from(vettingRequestsTable).where(eq(vettingRequestsTable.employerId, uid));
  const [staffRow] = await db.select({ total: count() }).from(staffRecordsTable)
    .where(and(eq(staffRecordsTable.employerId, uid), eq(staffRecordsTable.active, true)));

  res.json({
    totalRequests: requests.length,
    completed: requests.filter(r => r.status === "completed").length,
    inProgress: requests.filter(r => r.status === "in_progress").length,
    pendingPayment: requests.filter(r => r.status === "pending_payment" || r.status === "paid").length,
    staffCount: Number(staffRow?.total ?? 0),
  });
});

router.get("/dashboard/recent-requests", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const uid = req.userId!;
  const rows = await db
    .select({ vr: vettingRequestsTable, pkg: vettingPackagesTable })
    .from(vettingRequestsTable)
    .leftJoin(vettingPackagesTable, eq(vettingRequestsTable.packageId, vettingPackagesTable.id))
    .where(eq(vettingRequestsTable.employerId, uid))
    .orderBy(desc(vettingRequestsTable.createdAt))
    .limit(5);

  res.json(rows.map(r => ({
    id: r.vr.id,
    workerName: r.vr.workerName,
    workerRole: r.vr.workerRole,
    status: r.vr.status,
    packageName: r.pkg?.name ?? "",
    trustScore: r.vr.trustScore,
    createdAt: r.vr.createdAt.toISOString(),
  })));
});

router.get("/dashboard/activity", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const uid = req.userId!;
  const items = await db
    .select()
    .from(activityItemsTable)
    .where(eq(activityItemsTable.userId, uid))
    .orderBy(desc(activityItemsTable.createdAt))
    .limit(20);

  res.json(items.map(item => ({
    id: item.id,
    type: item.type,
    message: item.message,
    workerName: item.workerName,
    linkId: item.linkId,
    createdAt: item.createdAt.toISOString(),
  })));
});

export default router;
