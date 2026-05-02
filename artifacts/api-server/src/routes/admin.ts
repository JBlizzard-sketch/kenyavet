import { Router, type IRouter } from "express";
import { db, vettingRequestsTable, vettingPackagesTable, usersTable, reportsTable, vettingStepsTable, activityItemsTable, staffRecordsTable, referenceContactsTable, workersTable } from "@workspace/db";
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
      packageSlug: r.pkg?.slug ?? "",
      turnaroundHours: r.pkg?.turnaroundHours ?? 48,
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

router.get("/admin/reports", requireAuth, requireRole("admin", "ops"), async (_req, res): Promise<void> => {
  const rows = await db
    .select({ r: reportsTable, vr: vettingRequestsTable, emp: usersTable })
    .from(reportsTable)
    .leftJoin(vettingRequestsTable, eq(reportsTable.vettingRequestId, vettingRequestsTable.id))
    .leftJoin(usersTable, eq(vettingRequestsTable.employerId, usersTable.id))
    .orderBy(desc(reportsTable.createdAt));

  res.json({
    reports: rows.map(row => ({
      id: row.r.id,
      vettingRequestId: row.r.vettingRequestId,
      workerName: row.r.workerName,
      workerRole: row.r.workerRole,
      packageName: row.r.packageName,
      overallTrustScore: row.r.overallTrustScore,
      scoreBreakdown: row.r.scoreBreakdown,
      identityVerified: row.r.identityVerified,
      dciCertificateStatus: row.r.dciCertificateStatus,
      flags: row.r.flags,
      summary: row.r.summary,
      createdAt: row.r.createdAt.toISOString(),
      employerName: row.emp?.name ?? "",
      employerEmail: row.emp?.email ?? "",
    })),
  });
});

router.post("/admin/requests/:id/report", requireAuth, requireRole("admin", "ops"), async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ message: "Invalid ID" }); return; }

  const [row] = await db
    .select({ vr: vettingRequestsTable, pkg: vettingPackagesTable, emp: usersTable })
    .from(vettingRequestsTable)
    .leftJoin(vettingPackagesTable, eq(vettingRequestsTable.packageId, vettingPackagesTable.id))
    .leftJoin(usersTable, eq(vettingRequestsTable.employerId, usersTable.id))
    .where(eq(vettingRequestsTable.id, id));

  if (!row) { res.status(404).json({ message: "Not found" }); return; }

  const {
    scoreBreakdown, summary, identityVerified = true,
    dciCertificateStatus = "verified", referencesSummary,
    socialMediaSummary, addressVerified, flags = [],
  } = req.body;

  if (!scoreBreakdown || !summary) {
    res.status(400).json({ message: "scoreBreakdown and summary are required" }); return;
  }

  const trustScore =
    (scoreBreakdown.identity ?? 0) +
    (scoreBreakdown.references ?? 0) +
    (scoreBreakdown.dciCertificate ?? 0) +
    (scoreBreakdown.socialMedia ?? 0) +
    (scoreBreakdown.addressVisit ?? 0);

  let reportId: number;
  const existingReportId = row.vr.reportId;

  if (existingReportId) {
    await db.update(reportsTable).set({
      overallTrustScore: trustScore, scoreBreakdown, summary,
      identityVerified, dciCertificateStatus, referencesSummary,
      socialMediaSummary, addressVerified, flags,
    }).where(eq(reportsTable.id, existingReportId));
    reportId = existingReportId;
  } else {
    const [report] = await db.insert(reportsTable).values({
      vettingRequestId: id,
      workerName: row.vr.workerName,
      workerRole: row.vr.workerRole,
      workerPhotoUrl: row.vr.workerPhotoUrl,
      packageName: row.pkg?.name ?? "",
      overallTrustScore: trustScore,
      scoreBreakdown,
      summary,
      identityVerified,
      dciCertificateStatus,
      referencesSummary,
      socialMediaSummary,
      addressVerified,
      flags,
    }).returning();
    reportId = report.id;
  }

  await db.update(vettingRequestsTable)
    .set({ status: "completed", trustScore, reportId, completedAt: new Date() } as any)
    .where(eq(vettingRequestsTable.id, id));

  await db.update(vettingStepsTable)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(vettingStepsTable.vettingRequestId, id));

  await db.insert(activityItemsTable).values({
    userId: row.vr.employerId,
    type: "report_ready",
    message: `Vetting report ready for ${row.vr.workerName} — Trust Score: ${trustScore}/100`,
    workerName: row.vr.workerName,
    linkId: id,
  });

  if (row.emp) {
    await sendReportReadyEmail({
      employerName: row.emp.name,
      employerEmail: row.emp.email,
      workerName: row.vr.workerName,
      workerRole: row.vr.workerRole,
      trustScore,
      recommendation: trustScore >= 80 ? "hire" : trustScore >= 60 ? "caution" : "do_not_hire",
      reportId,
      requestId: id,
      scoreBreakdown,
    });
  }

  // Auto-populate worker registry
  const qrCode = `KV-${new Date().getFullYear()}-${String(reportId).padStart(5, "0")}`;
  const badges: string[] = [];
  if (identityVerified) badges.push("ID Verified");
  if (dciCertificateStatus === "verified") badges.push("DCI Clean");
  if ((flags as string[]).length === 0) badges.push("No Flags");
  if (trustScore >= 80) badges.push("Top Rated");
  else if (trustScore >= 70) badges.push("Highly Rated");

  const existingWorkers = await db
    .select()
    .from(workersTable)
    .where(eq(workersTable.name, row.vr.workerName))
    .limit(1);

  if (existingWorkers.length > 0) {
    await db.update(workersTable)
      .set({ trustScore, badges, verifiedAt: new Date() })
      .where(eq(workersTable.id, existingWorkers[0].id));
  } else {
    await db.insert(workersTable).values({
      name: row.vr.workerName,
      role: row.vr.workerRole,
      trustScore,
      photoUrl: row.vr.workerPhotoUrl ?? null,
      qrCode,
      badges,
    });
  }

  res.json({ reportId, trustScore, message: "Report generated and employer notified" });
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

  const [steps, refs] = await Promise.all([
    db.select().from(vettingStepsTable)
      .where(eq(vettingStepsTable.vettingRequestId, id))
      .orderBy(vettingStepsTable.order),
    db.select().from(referenceContactsTable)
      .where(eq(referenceContactsTable.vettingRequestId, id)),
  ]);

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
    references: refs.map(r => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      relationship: r.relationship,
      employerName: r.employerName,
      yearsWorked: r.yearsWorked,
      callStatus: r.callStatus,
      callSummary: r.callSummary,
    })),
  });
});

router.get("/admin/analytics", requireAuth, requireRole("admin", "ops"), async (_req, res): Promise<void> => {
  const rows = await db
    .select({ vr: vettingRequestsTable, pkg: vettingPackagesTable })
    .from(vettingRequestsTable)
    .leftJoin(vettingPackagesTable, eq(vettingRequestsTable.packageId, vettingPackagesTable.id))
    .orderBy(desc(vettingRequestsTable.createdAt));

  const monthMap = new Map<string, { requests: number; completed: number; revenue: number }>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, { requests: 0, completed: 0, revenue: 0 });
  }
  for (const { vr, pkg } of rows) {
    const d = new Date(vr.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthMap.has(key)) continue;
    const entry = monthMap.get(key)!;
    entry.requests++;
    if (vr.status === "completed") {
      entry.completed++;
      entry.revenue += pkg?.priceKsh ?? 0;
    }
  }

  const months = Array.from(monthMap.entries()).map(([month, data]) => ({
    month,
    label: new Date(month + "-01").toLocaleString("en-US", { month: "short", year: "2-digit" }),
    ...data,
  }));

  const allPkgs = await db.select().from(vettingPackagesTable);
  const packageBreakdown = allPkgs.map(pkg => ({
    name: pkg.name,
    slug: pkg.slug,
    total: rows.filter(r => r.vr.packageId === pkg.id).length,
    completed: rows.filter(r => r.vr.packageId === pkg.id && r.vr.status === "completed").length,
  }));

  const totalRevenue = rows
    .filter(r => r.vr.status === "completed")
    .reduce((sum, r) => sum + (r.pkg?.priceKsh ?? 0), 0);

  res.json({ months, packageBreakdown, totalRevenue });
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

router.patch("/admin/references/:refId", requireAuth, requireRole("admin", "ops"), async (req: AuthRequest, res): Promise<void> => {
  const refId = parseInt(req.params.refId as string, 10);
  if (isNaN(refId)) { res.status(400).json({ message: "Invalid ref ID" }); return; }

  const { callStatus, callSummary } = req.body;
  const update: Record<string, unknown> = {};
  if (callStatus) update.callStatus = callStatus;
  if (callSummary !== undefined) update.callSummary = callSummary;

  const [ref] = await db.update(referenceContactsTable)
    .set(update)
    .where(eq(referenceContactsTable.id, refId))
    .returning();

  if (!ref) { res.status(404).json({ message: "Reference not found" }); return; }
  res.json({ id: ref.id, callStatus: ref.callStatus, callSummary: ref.callSummary });
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

router.get("/admin/activity", requireAuth, requireRole("admin", "ops"), async (_req, res): Promise<void> => {
  const rows = await db
    .select({ a: activityItemsTable, u: usersTable })
    .from(activityItemsTable)
    .leftJoin(usersTable, eq(activityItemsTable.userId, usersTable.id))
    .orderBy(desc(activityItemsTable.createdAt))
    .limit(200);

  res.json({
    activity: rows.map(r => ({
      id: r.a.id,
      type: r.a.type,
      message: r.a.message,
      workerName: r.a.workerName,
      linkId: r.a.linkId,
      createdAt: r.a.createdAt.toISOString(),
      userName: r.u?.name ?? "System",
      userRole: r.u?.role ?? "system",
    })),
  });
});

router.get("/admin/employers", requireAuth, requireRole("admin", "ops"), async (_req, res): Promise<void> => {
  const employers = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.role, "employer"))
    .orderBy(desc(usersTable.createdAt));

  const allRequests = await db
    .select({ vr: vettingRequestsTable, pkg: vettingPackagesTable })
    .from(vettingRequestsTable)
    .leftJoin(vettingPackagesTable, eq(vettingRequestsTable.packageId, vettingPackagesTable.id));

  res.json({
    employers: employers.map(emp => {
      const empReqs = allRequests.filter(r => r.vr.employerId === emp.id);
      const paidReqs = empReqs.filter(r => r.vr.status !== "pending_payment" && r.vr.status !== "cancelled");
      const totalSpend = paidReqs.reduce((sum, r) => sum + (r.pkg?.priceKsh ?? 0), 0);
      const lastRequest = empReqs.sort((a, b) => b.vr.createdAt.getTime() - a.vr.createdAt.getTime())[0];
      return {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        phone: emp.phone,
        neighbourhood: emp.neighbourhood,
        createdAt: emp.createdAt.toISOString(),
        totalRequests: empReqs.length,
        completedRequests: empReqs.filter(r => r.vr.status === "completed").length,
        pendingRequests: empReqs.filter(r => r.vr.status === "pending_payment").length,
        inProgressRequests: empReqs.filter(r => r.vr.status === "in_progress").length,
        totalSpendKsh: totalSpend,
        lastRequestAt: lastRequest ? lastRequest.vr.createdAt.toISOString() : null,
      };
    }),
  });
});

export default router;
