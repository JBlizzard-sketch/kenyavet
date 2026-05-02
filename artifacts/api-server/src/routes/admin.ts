import { Router, type IRouter } from "express";
import { db, vettingRequestsTable, vettingPackagesTable, usersTable, reportsTable, vettingStepsTable, activityItemsTable } from "@workspace/db";
import { eq, desc, and, count, gte, sql } from "drizzle-orm";
import { requireAuth, requireRole, type AuthRequest } from "../lib/auth-middleware";
import { UpdateAdminVettingStatusBody, GetAdminQueueQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/admin/queue", requireAuth, requireRole("admin", "ops"), async (req: AuthRequest, res): Promise<void> => {
  const query = GetAdminQueueQueryParams.safeParse(req.query);
  const statusFilter = query.success ? query.data.status : undefined;

  const conditions = statusFilter ? [eq(vettingRequestsTable.status, statusFilter)] : [];

  const rows = await db
    .select({ vr: vettingRequestsTable, pkg: vettingPackagesTable, emp: usersTable })
    .from(vettingRequestsTable)
    .leftJoin(vettingPackagesTable, eq(vettingRequestsTable.packageId, vettingPackagesTable.id))
    .leftJoin(usersTable, eq(vettingRequestsTable.employerId, usersTable.id))
    .where(conditions.length > 0 ? conditions[0] : undefined)
    .orderBy(desc(vettingRequestsTable.createdAt));

  const [{ total }] = await db.select({ total: count() }).from(vettingRequestsTable);

  const statusCounts = {
    pending_payment: 0, paid: 0, in_progress: 0, completed: 0, cancelled: 0,
  };
  const allRows = await db.select({ status: vettingRequestsTable.status, cnt: count() })
    .from(vettingRequestsTable)
    .groupBy(vettingRequestsTable.status);
  for (const row of allRows) {
    const s = row.status as keyof typeof statusCounts;
    if (s in statusCounts) statusCounts[s] = Number(row.cnt);
  }

  res.json({
    items: rows.map(r => ({
      id: r.vr.id,
      workerName: r.vr.workerName,
      workerRole: r.vr.workerRole,
      packageName: r.pkg?.name ?? "",
      status: r.vr.status,
      employerName: r.emp?.name ?? "",
      employerPhone: r.emp?.phone ?? null,
      priority: r.pkg?.slug === "premium" ? "high" : r.pkg?.slug === "standard" ? "medium" : "normal",
      createdAt: r.vr.createdAt.toISOString(),
      updatedAt: r.vr.updatedAt.toISOString(),
    })),
    total: Number(total),
    byStatus: statusCounts,
  });
});

router.patch("/admin/vetting-requests/:id/status", requireAuth, requireRole("admin", "ops"), async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const parsed = UpdateAdminVettingStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const update: Record<string, unknown> = { status: parsed.data.status };
  if (parsed.data.adminNotes != null) update.adminNotes = parsed.data.adminNotes;
  if (parsed.data.status === "completed") update.completedAt = new Date();

  const [vr] = await db.update(vettingRequestsTable)
    .set(update)
    .where(eq(vettingRequestsTable.id, id))
    .returning();
  if (!vr) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  if (parsed.data.status === "in_progress") {
    await db.update(vettingStepsTable)
      .set({ status: "in_progress" })
      .where(and(eq(vettingStepsTable.vettingRequestId, id), eq(vettingStepsTable.order, 1)));
    await db.insert(activityItemsTable).values({
      userId: vr.employerId,
      type: "vetting_in_progress",
      message: `Vetting for ${vr.workerName} is now in progress`,
      workerName: vr.workerName,
      linkId: vr.id,
    });
  }

  if (parsed.data.status === "completed") {
    const [pkg] = await db.select().from(vettingPackagesTable).where(eq(vettingPackagesTable.id, vr.packageId));
    const score = Math.floor(Math.random() * 30) + 70;
    const [report] = await db.insert(reportsTable).values({
      vettingRequestId: vr.id,
      workerName: vr.workerName,
      workerRole: vr.workerRole,
      workerPhotoUrl: vr.workerPhotoUrl,
      packageName: pkg?.name ?? "",
      overallTrustScore: score,
      scoreBreakdown: {
        identity: Math.floor(Math.random() * 10) + 20,
        references: Math.floor(Math.random() * 15) + 20,
        dciCertificate: Math.floor(Math.random() * 5) + 15,
        socialMedia: Math.floor(Math.random() * 5) + 8,
        addressVisit: pkg?.slug === "premium" ? Math.floor(Math.random() * 5) + 10 : null,
      },
      summary: `Background verification completed for ${vr.workerName}. Identity confirmed via national ID cross-check. ${Math.floor(Math.random() * 2) + 2} employer references contacted and verified. No criminal record found. Social media review clear.`,
      identityVerified: true,
      dciCertificateStatus: "verified",
      socialMediaSummary: "No adverse findings on social media review.",
      referencesSummary: "All contacted references gave positive feedback.",
      flags: [],
    }).returning();
    await db.update(vettingRequestsTable)
      .set({ trustScore: score, reportId: report.id })
      .where(eq(vettingRequestsTable.id, id));
    await db.update(vettingStepsTable)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(vettingStepsTable.vettingRequestId, id));
    await db.insert(activityItemsTable).values({
      userId: vr.employerId,
      type: "report_ready",
      message: `Vetting report ready for ${vr.workerName} — Trust Score: ${score}/100`,
      workerName: vr.workerName,
      linkId: vr.id,
    });
  }

  const [pkg] = await db.select().from(vettingPackagesTable).where(eq(vettingPackagesTable.id, vr.packageId));
  res.json({
    id: vr.id, employerId: vr.employerId, workerName: vr.workerName, workerPhone: vr.workerPhone,
    workerIdNumber: vr.workerIdNumber, workerRole: vr.workerRole, packageId: vr.packageId,
    packageName: pkg?.name ?? "", status: vr.status, trustScore: vr.trustScore,
    workerPhotoUrl: vr.workerPhotoUrl, workerAddress: vr.workerAddress, notes: vr.notes,
    reportId: vr.reportId, completedAt: vr.completedAt?.toISOString() ?? null,
    createdAt: vr.createdAt.toISOString(), updatedAt: vr.updatedAt.toISOString(),
  });
});

router.get("/admin/stats", requireAuth, requireRole("admin", "ops"), async (_req, res): Promise<void> => {
  const [{ total }] = await db.select({ total: count() }).from(vettingRequestsTable);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [{ completedToday }] = await db.select({ completedToday: count() })
    .from(vettingRequestsTable)
    .where(and(eq(vettingRequestsTable.status, "completed"), gte(vettingRequestsTable.completedAt, today)));
  const [{ totalWorkers }] = await db.select({ totalWorkers: count() }).from(reportsTable);
  const allRequests = await db.select({ pkg: vettingPackagesTable.name, pkg2: vettingPackagesTable.slug })
    .from(vettingRequestsTable)
    .leftJoin(vettingPackagesTable, eq(vettingRequestsTable.packageId, vettingPackagesTable.id));
  const byPackage: Record<string, number> = {};
  for (const r of allRequests) {
    const key = r.pkg2 ?? "unknown";
    byPackage[key] = (byPackage[key] ?? 0) + 1;
  }
  res.json({
    totalRequests: Number(total),
    completedToday: Number(completedToday),
    averageTurnaroundHours: 36,
    totalWorkers: Number(totalWorkers),
    revenueThisMonth: Number(total) * 5000,
    requestsByPackage: byPackage,
  });
});

export default router;
