import { Router, type IRouter } from "express";
import { db, vettingRequestsTable, vettingPackagesTable, staffRecordsTable, activityItemsTable, reportsTable, usersTable } from "@workspace/db";
import { eq, and, count, desc, isNull, lte, isNotNull } from "drizzle-orm";
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

router.get("/dashboard/onboarding", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const uid = req.userId!;
  const [userRow] = await db.select().from(usersTable).where(eq(usersTable.id, uid)).limit(1);
  const requests = await db.select().from(vettingRequestsTable).where(eq(vettingRequestsTable.employerId, uid));

  const profileComplete = !!(userRow?.phone && userRow?.neighbourhood);
  const hasRequest = requests.length > 0;
  const hasPaid = requests.some(r => r.mpesaRef != null);
  const hasReport = requests.some(r => r.status === "completed" && r.reportId != null);

  const steps = [
    { id: "profile", label: "Complete your profile", sublabel: "Add your phone number and neighbourhood", done: profileComplete, href: "/profile" },
    { id: "request", label: "Submit your first vetting request", sublabel: "Enter worker details and choose a package", done: hasRequest, href: "/vetting-requests/new" },
    { id: "payment", label: "Complete M-Pesa payment", sublabel: "Pay via Lipa Na M-Pesa to start vetting", done: hasPaid, href: "/vetting-requests" },
    { id: "report", label: "Receive your vetting report", sublabel: "Your report with trust score will be ready in 24–48h", done: hasReport, href: "/reports" },
  ];

  res.json({ steps, allDone: steps.every(s => s.done) });
});

router.get("/billing/history", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const uid = req.userId!;
  const rows = await db
    .select({ vr: vettingRequestsTable, pkg: vettingPackagesTable })
    .from(vettingRequestsTable)
    .leftJoin(vettingPackagesTable, eq(vettingRequestsTable.packageId, vettingPackagesTable.id))
    .where(and(
      eq(vettingRequestsTable.employerId, uid),
      isNotNull(vettingRequestsTable.mpesaRef),
    ))
    .orderBy(desc(vettingRequestsTable.updatedAt));

  const totalSpend = rows.reduce((sum, r) => sum + (r.pkg?.priceKsh ?? 0), 0);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const last30Spend = rows
    .filter(r => r.vr.updatedAt > thirtyDaysAgo)
    .reduce((sum, r) => sum + (r.pkg?.priceKsh ?? 0), 0);

  res.json({
    totalSpend,
    last30DaysSpend: last30Spend,
    transactionCount: rows.length,
    transactions: rows.map(r => ({
      id: r.vr.id,
      workerName: r.vr.workerName,
      workerRole: r.vr.workerRole,
      packageName: r.pkg?.name ?? "",
      packageSlug: r.pkg?.slug ?? "",
      priceKsh: r.pkg?.priceKsh ?? 0,
      mpesaRef: r.vr.mpesaRef ?? "",
      paidAt: r.vr.updatedAt.toISOString(),
      status: r.vr.status,
    })),
  });
});

router.get("/billing/export", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const uid = req.userId!;
  const rows = await db
    .select({ vr: vettingRequestsTable, pkg: vettingPackagesTable })
    .from(vettingRequestsTable)
    .leftJoin(vettingPackagesTable, eq(vettingRequestsTable.packageId, vettingPackagesTable.id))
    .where(and(eq(vettingRequestsTable.employerId, uid), isNotNull(vettingRequestsTable.mpesaRef)))
    .orderBy(desc(vettingRequestsTable.updatedAt));

  const headers = ["Request ID", "Worker Name", "Worker Role", "Package", "Price (Ksh)", "M-Pesa Ref", "Paid At", "Status"];
  const csvRows = rows.map(r => [
    r.vr.id,
    `"${r.vr.workerName}"`,
    `"${r.vr.workerRole}"`,
    `"${r.pkg?.name ?? ""}"`,
    r.pkg?.priceKsh ?? 0,
    r.vr.mpesaRef ?? "",
    r.vr.updatedAt.toISOString().split("T")[0],
    r.vr.status,
  ]);
  const csv = [headers.join(","), ...csvRows.map(r => r.join(","))].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="kenyavet-billing-${new Date().toISOString().split("T")[0]}.csv"`);
  res.send(csv);
});

router.get("/dashboard/weekly-activity", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const uid = req.userId!;
  const rows = await db
    .select({ createdAt: vettingRequestsTable.createdAt })
    .from(vettingRequestsTable)
    .where(eq(vettingRequestsTable.employerId, uid));

  const days: { label: string; date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().split("T")[0];
    const label = d.toLocaleDateString("en-US", { weekday: "short" });
    const dayCount = rows.filter(r => r.createdAt.toISOString().split("T")[0] === dayStr).length;
    days.push({ label, date: dayStr, count: dayCount });
  }

  res.json({ days });
});

export default router;
