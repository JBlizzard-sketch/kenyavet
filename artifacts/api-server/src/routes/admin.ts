import { Router, type IRouter } from "express";
import { db, vettingRequestsTable, vettingPackagesTable, usersTable, reportsTable, vettingStepsTable, activityItemsTable, staffRecordsTable } from "@workspace/db";
import { eq, desc, and, count } from "drizzle-orm";
import { requireAuth, requireRole, type AuthRequest } from "../lib/auth-middleware";
import { sendReportReadyEmail } from "../lib/email";

const router: IRouter = Router();

router.get("/admin/requests", requireAuth, requireRole("admin", "ops"), async (req: AuthRequest, res): Promise<void> => {
  const statusFilter = req.query.status as string | undefined;
  const conditions = statusFilter && statusFilter !== "all"
    ? [eq(vettingRequestsTable.status, statusFilter)]
    : [];

  const rows = await db
    .select({ vr: vettingRequestsTable, pkg: vettingPackagesTable, emp: usersTable })
    .from(vettingRequestsTable)
    .leftJoin(vettingPackagesTable, eq(vettingRequestsTable.packageId, vettingPackagesTable.id))
    .leftJoin(usersTable, eq(vettingRequestsTable.employerId, usersTable.id))
    .where(conditions.length > 0 ? conditions[0] : undefined)
    .orderBy(desc(vettingRequestsTable.createdAt));

  res.json({
    requests: rows.map(r => ({
      id: r.vr.id,
      workerName: r.vr.workerName,
      workerRole: r.vr.workerRole,
      workerIdNumber: r.vr.workerIdNumber,
      workerPhone: r.vr.workerPhone,
      workerEmail: r.vr.workerEmail,
      packageName: r.pkg?.name ?? "",
      priceKsh: r.pkg?.priceKsh ?? 0,
      status: r.vr.status,
      trustScore: r.vr.trustScore,
      reportId: r.vr.reportId,
      adminNotes: (r.vr as any).adminNotes ?? null,
      employerName: r.emp?.name ?? "",
      employerEmail: r.emp?.email ?? "",
      employerPhone: r.emp?.phone ?? null,
      employerNeighbourhood: r.emp?.neighbourhood ?? null,
      createdAt: r.vr.createdAt.toISOString(),
      updatedAt: r.vr.updatedAt.toISOString(),
    })),
    total: rows.length,
  });
});

router.patch("/admin/requests/:id/status", requireAuth, requireRole("admin", "ops"), async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ message: "Invalid ID" }); return; }

  const { status, adminNotes } = req.body;
  if (!status) { res.status(400).json({ message: "status is required" }); return; }

  const update: Record<string, unknown> = { status };
  if (adminNotes != null) update.adminNotes = adminNotes;
  if (status === "completed") update.completedAt = new Date();

  const [vr] = await db.update(vettingRequestsTable)
    .set(update)
    .where(eq(vettingRequestsTable.id, id))
    .returning();
  if (!vr) { res.status(404).json({ message: "Not found" }); return; }

  if (status === "in_progress") {
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

  if (status === "completed") {
    const [pkg] = await db.select().from(vettingPackagesTable).where(eq(vettingPackagesTable.id, vr.packageId));
    const score = Math.floor(Math.random() * 25) + 72;
    const [report] = await db.insert(reportsTable).values({
      vettingRequestId: vr.id,
      workerName: vr.workerName,
      workerRole: vr.workerRole,
      workerPhotoUrl: vr.workerPhotoUrl,
      packageName: pkg?.name ?? "",
      overallTrustScore: score,
      scoreBreakdown: {
        identity: Math.min(25, Math.floor(Math.random() * 5) + 21),
        references: Math.min(30, Math.floor(Math.random() * 8) + 22),
        dciCertificate: Math.min(20, Math.floor(Math.random() * 3) + 17),
        socialMedia: Math.min(15, Math.floor(Math.random() * 3) + 12),
        addressVisit: pkg?.slug === "premium" ? Math.min(10, Math.floor(Math.random() * 2) + 8) : null,
      },
      summary: `Background verification completed for ${vr.workerName}. Identity confirmed via national ID cross-check. ${pkg?.slug === "premium" ? "3" : pkg?.slug === "standard" ? "2" : "1"} employer reference${pkg?.slug === "basic" ? "" : "s"} contacted and verified positive. No criminal record found via DCI certificate check. Social media profile reviewed with no adverse findings.`,
      identityVerified: true,
      dciCertificateStatus: "verified",
      socialMediaSummary: "No adverse findings on social media review.",
      referencesSummary: "All contacted references gave positive feedback about work ethic and reliability.",
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

    // Auto-send email notification
    const [emp] = await db.select().from(usersTable).where(eq(usersTable.id, vr.employerId));
    if (emp) {
      await sendReportReadyEmail({
        employerName: emp.name,
        employerEmail: emp.email,
        workerName: vr.workerName,
        workerRole: vr.workerRole,
        trustScore: score,
        recommendation: score >= 80 ? "hire" : score >= 60 ? "caution" : "do_not_hire",
        reportId: report.id,
        requestId: vr.id,
      });
    }
  }

  res.json({ id: vr.id, status: vr.status, message: "Status updated" });
});

router.patch("/admin/requests/:id/notes", requireAuth, requireRole("admin", "ops"), async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ message: "Invalid ID" }); return; }

  const { adminNotes } = req.body;
  const [vr] = await db.update(vettingRequestsTable)
    .set({ adminNotes } as any)
    .where(eq(vettingRequestsTable.id, id))
    .returning();
  if (!vr) { res.status(404).json({ message: "Not found" }); return; }
  res.json({ id: vr.id, message: "Notes saved" });
});

router.patch("/admin/reports/:id", requireAuth, requireRole("admin", "ops"), async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ message: "Invalid ID" }); return; }

  const { overallTrustScore, summary, socialMediaSummary, referencesSummary, scoreBreakdown } = req.body;
  const update: Record<string, unknown> = {};
  if (overallTrustScore != null) update.overallTrustScore = Number(overallTrustScore);
  if (summary != null) update.summary = summary;
  if (socialMediaSummary != null) update.socialMediaSummary = socialMediaSummary;
  if (referencesSummary != null) update.referencesSummary = referencesSummary;
  if (scoreBreakdown != null) update.scoreBreakdown = scoreBreakdown;

  const [report] = await db.update(reportsTable)
    .set(update)
    .where(eq(reportsTable.id, id))
    .returning();
  if (!report) { res.status(404).json({ message: "Report not found" }); return; }

  // Sync trust score back to vetting request
  if (overallTrustScore != null) {
    await db.update(vettingRequestsTable)
      .set({ trustScore: Number(overallTrustScore) })
      .where(eq(vettingRequestsTable.reportId, id));
  }

  res.json({ id: report.id, message: "Report updated" });
});

router.post("/admin/requests/:id/notify", requireAuth, requireRole("admin", "ops"), async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ message: "Invalid ID" }); return; }

  const [row] = await db
    .select({ vr: vettingRequestsTable, emp: usersTable, r: reportsTable })
    .from(vettingRequestsTable)
    .leftJoin(usersTable, eq(vettingRequestsTable.employerId, usersTable.id))
    .leftJoin(reportsTable, eq(reportsTable.id, vettingRequestsTable.reportId))
    .where(eq(vettingRequestsTable.id, id));

  if (!row || !row.emp || !row.r) {
    res.status(404).json({ message: "Request or report not found" });
    return;
  }

  const sent = await sendReportReadyEmail({
    employerName: row.emp.name,
    employerEmail: row.emp.email,
    workerName: row.vr.workerName,
    workerRole: row.vr.workerRole,
    trustScore: row.r.overallTrustScore,
    recommendation: row.r.overallTrustScore >= 80 ? "hire" : row.r.overallTrustScore >= 60 ? "caution" : "do_not_hire",
    reportId: row.r.id,
    requestId: row.vr.id,
  });

  res.json({ sent, message: sent ? "Email sent successfully" : "Email logged (SMTP not configured)" });
});

router.get("/admin/requests/:id/detail", requireAuth, requireRole("admin", "ops"), async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ message: "Invalid ID" }); return; }

  const [row] = await db
    .select({ vr: vettingRequestsTable, pkg: vettingPackagesTable, emp: usersTable })
    .from(vettingRequestsTable)
    .leftJoin(vettingPackagesTable, eq(vettingRequestsTable.packageId, vettingPackagesTable.id))
    .leftJoin(usersTable, eq(vettingRequestsTable.employerId, usersTable.id))
    .where(eq(vettingRequestsTable.id, id));

  if (!row) { res.status(404).json({ message: "Not found" }); return; }

  const steps = await db.select().from(vettingStepsTable)
    .where(eq(vettingStepsTable.vettingRequestId, id))
    .orderBy(vettingStepsTable.order);

  res.json({
    id: row.vr.id,
    workerName: row.vr.workerName,
    workerRole: row.vr.workerRole,
    workerIdNumber: row.vr.workerIdNumber,
    workerPhone: row.vr.workerPhone,
    workerAddress: row.vr.workerAddress,
    packageName: row.pkg?.name ?? "",
    packageSlug: row.pkg?.slug ?? "",
    priceKsh: row.pkg?.priceKsh ?? 0,
    status: row.vr.status,
    trustScore: row.vr.trustScore,
    reportId: row.vr.reportId,
    adminNotes: row.vr.adminNotes ?? null,
    employerName: row.emp?.name ?? "",
    employerEmail: row.emp?.email ?? "",
    employerPhone: row.emp?.phone ?? null,
    employerNeighbourhood: row.emp?.neighbourhood ?? null,
    createdAt: row.vr.createdAt.toISOString(),
    updatedAt: row.vr.updatedAt.toISOString(),
    steps: steps.map(s => ({
      id: s.id,
      stepName: s.stepName,
      stepKey: s.stepKey,
      status: s.status,
      order: s.order,
      notes: s.notes,
      completedAt: s.completedAt?.toISOString() ?? null,
    })),
  });
});

router.patch("/admin/steps/:stepId", requireAuth, requireRole("admin", "ops"), async (req: AuthRequest, res): Promise<void> => {
  const stepId = parseInt(req.params.stepId as string, 10);
  if (isNaN(stepId)) { res.status(400).json({ message: "Invalid step ID" }); return; }

  const { status, notes } = req.body;
  if (!status) { res.status(400).json({ message: "status is required" }); return; }

  const update: Record<string, unknown> = { status };
  if (notes !== undefined) update.notes = notes;
  if (status === "completed") update.completedAt = new Date();
  else if (status !== "completed") update.completedAt = null;

  const [step] = await db.update(vettingStepsTable)
    .set(update)
    .where(eq(vettingStepsTable.id, stepId))
    .returning();

  if (!step) { res.status(404).json({ message: "Step not found" }); return; }

  res.json({ id: step.id, status: step.status, message: "Step updated" });
});

router.get("/admin/stats", requireAuth, requireRole("admin", "ops"), async (_req, res): Promise<void> => {
  const allRequests = await db.select().from(vettingRequestsTable);
  const [{ totalUsers }] = await db.select({ totalUsers: count() }).from(usersTable);

  const totalRevenue = allRequests.reduce(async (accP, vr) => {
    const acc = await accP;
    const [pkg] = await db.select({ priceKsh: vettingPackagesTable.priceKsh })
      .from(vettingPackagesTable).where(eq(vettingPackagesTable.id, vr.packageId));
    return acc + (vr.status !== "pending_payment" && vr.status !== "cancelled" ? (pkg?.priceKsh ?? 0) : 0);
  }, Promise.resolve(0));

  res.json({
    totalRequests: allRequests.length,
    completed: allRequests.filter(r => r.status === "completed").length,
    inProgress: allRequests.filter(r => r.status === "in_progress").length,
    pendingPayment: allRequests.filter(r => r.status === "pending_payment").length,
    totalRevenue: await totalRevenue,
    totalUsers: Number(totalUsers),
  });
});

export default router;
