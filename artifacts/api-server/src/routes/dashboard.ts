import { Router, type IRouter } from "express";
import { db, vettingRequestsTable, vettingPackagesTable, staffRecordsTable, activityItemsTable, reportsTable } from "@workspace/db";
import { eq, and, count, desc, isNull, lte } from "drizzle-orm";
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
    reportId: r.vr.reportId,
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
    .limit(50);

  res.json(items.map(item => ({
    id: item.id,
    type: item.type,
    message: item.message,
    workerName: item.workerName,
    linkId: item.linkId,
    readAt: item.readAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
  })));
});

router.patch("/notifications/:id/read", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ message: "Invalid ID" }); return; }
  const [item] = await db.update(activityItemsTable)
    .set({ readAt: new Date() })
    .where(and(eq(activityItemsTable.id, id), eq(activityItemsTable.userId, req.userId!)))
    .returning();
  if (!item) { res.status(404).json({ message: "Not found" }); return; }
  res.json({ success: true });
});

router.post("/notifications/mark-all-read", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  await db.update(activityItemsTable)
    .set({ readAt: new Date() })
    .where(and(
      eq(activityItemsTable.userId, req.userId!),
      isNull(activityItemsTable.readAt),
    ));
  res.json({ success: true });
});

export default router;
