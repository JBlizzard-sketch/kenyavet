import { Router, type IRouter } from "express";
import { db, vettingRequestsTable, vettingPackagesTable, vettingStepsTable, activityItemsTable, referenceContactsTable } from "@workspace/db";
import { eq, desc, and, count } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";
import {
  CreateVettingRequestBody,
  UpdateVettingRequestBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

const STEP_DEFINITIONS = [
  { stepName: "Identity Verification", stepKey: "identity_check", order: 1 },
  { stepName: "DCI Certificate Check", stepKey: "dci_certificate", order: 2 },
  { stepName: "Reference Calls", stepKey: "reference_calls", order: 3 },
  { stepName: "Social Media Review", stepKey: "social_media_review", order: 4 },
];

const PREMIUM_EXTRA = { stepName: "Physical Address Visit", stepKey: "address_visit", order: 5 };
const FINAL_STEP = { stepName: "Report Generation", stepKey: "report_generation", order: 6 };

router.get("/vetting-requests", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 20)));
  const offset = (page - 1) * limit;
  const statusFilter = req.query.status as string | undefined;

  const baseWhere = statusFilter && statusFilter !== "all"
    ? and(eq(vettingRequestsTable.employerId, req.userId!), eq(vettingRequestsTable.status, statusFilter))
    : eq(vettingRequestsTable.employerId, req.userId!);

  const rows = await db
    .select({ vr: vettingRequestsTable, pkg: vettingPackagesTable })
    .from(vettingRequestsTable)
    .leftJoin(vettingPackagesTable, eq(vettingRequestsTable.packageId, vettingPackagesTable.id))
    .where(baseWhere)
    .orderBy(desc(vettingRequestsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: count() })
    .from(vettingRequestsTable)
    .where(baseWhere);

  res.json({
    requests: rows.map(r => formatRequest(r.vr, r.pkg?.name ?? "", r.pkg?.priceKsh ?? 0)),
    total: Number(total),
    page,
    limit,
  });
});

router.post("/vetting-requests", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateVettingRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.message });
    return;
  }
  const data = parsed.data;

  const [pkg] = await db.select().from(vettingPackagesTable).where(eq(vettingPackagesTable.id, data.packageId));
  if (!pkg) {
    res.status(400).json({ message: "Invalid package" });
    return;
  }

  const [vr] = await db.insert(vettingRequestsTable).values({
    employerId: req.userId!,
    workerName: data.workerName,
    workerPhone: data.workerPhone,
    workerIdNumber: data.workerIdNumber,
    workerRole: data.workerRole,
    packageId: data.packageId,
    workerPhotoUrl: data.workerPhotoUrl,
    workerAddress: data.workerAddress,
    notes: data.notes,
    status: "pending_payment",
  }).returning();

  const steps = pkg.slug === "premium" ? [...STEP_DEFINITIONS, PREMIUM_EXTRA] : STEP_DEFINITIONS;
  const allSteps = [...steps, FINAL_STEP];
  for (const step of allSteps) {
    await db.insert(vettingStepsTable).values({
      vettingRequestId: vr.id,
      stepName: step.stepName,
      stepKey: step.stepKey,
      order: step.order,
      status: "pending",
    });
  }

  await db.insert(activityItemsTable).values({
    userId: req.userId!,
    type: "vetting_submitted",
    message: `Vetting request submitted for ${data.workerName}`,
    workerName: data.workerName,
    linkId: vr.id,
  });

  res.status(201).json({ request: formatRequest(vr, pkg.name, pkg.priceKsh) });
});

router.get("/vetting-requests/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ message: "Invalid ID" }); return; }

  const [row] = await db
    .select({ vr: vettingRequestsTable, pkg: vettingPackagesTable })
    .from(vettingRequestsTable)
    .leftJoin(vettingPackagesTable, eq(vettingRequestsTable.packageId, vettingPackagesTable.id))
    .where(and(eq(vettingRequestsTable.id, id), eq(vettingRequestsTable.employerId, req.userId!)));

  if (!row) { res.status(404).json({ message: "Not found" }); return; }

  const [steps, refs] = await Promise.all([
    db.select().from(vettingStepsTable)
      .where(eq(vettingStepsTable.vettingRequestId, id))
      .orderBy(vettingStepsTable.order),
    db.select().from(referenceContactsTable)
      .where(eq(referenceContactsTable.vettingRequestId, id)),
  ]);

  res.json({
    ...formatRequest(row.vr, row.pkg?.name ?? "", row.pkg?.priceKsh ?? 0),
    turnaroundHours: row.pkg?.turnaroundHours ?? 48,
    steps: steps.map(s => ({
      id: s.id,
      stepName: s.stepName,
      status: s.status,
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
    stepProgress: steps.length > 0
      ? { completed: steps.filter(s => s.status === "completed").length, total: steps.length }
      : null,
  });
});

router.post("/vetting-requests/:id/cancel", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ message: "Invalid ID" }); return; }

  const [vr] = await db
    .select()
    .from(vettingRequestsTable)
    .where(and(eq(vettingRequestsTable.id, id), eq(vettingRequestsTable.employerId, req.userId!)));

  if (!vr) { res.status(404).json({ message: "Request not found" }); return; }
  if (vr.status !== "pending_payment") {
    res.status(400).json({ message: "Only requests awaiting payment can be cancelled" });
    return;
  }

  const [updated] = await db.update(vettingRequestsTable)
    .set({ status: "cancelled" })
    .where(eq(vettingRequestsTable.id, id))
    .returning();

  res.json({ id: updated.id, status: updated.status });
});

router.patch("/vetting-requests/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ message: "Invalid ID" }); return; }
  const parsed = UpdateVettingRequestBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: parsed.error.message }); return; }

  const update: Record<string, unknown> = {};
  if (parsed.data.workerName != null) update.workerName = parsed.data.workerName;
  if (parsed.data.workerPhone != null) update.workerPhone = parsed.data.workerPhone;
  if (parsed.data.workerAddress != null) update.workerAddress = parsed.data.workerAddress;
  if (parsed.data.notes != null) update.notes = parsed.data.notes;

  const [vr] = await db.update(vettingRequestsTable)
    .set(update)
    .where(and(eq(vettingRequestsTable.id, id), eq(vettingRequestsTable.employerId, req.userId!)))
    .returning();
  if (!vr) { res.status(404).json({ message: "Not found" }); return; }
  const [pkg] = await db.select().from(vettingPackagesTable).where(eq(vettingPackagesTable.id, vr.packageId));
  res.json(formatRequest(vr, pkg?.name ?? "", pkg?.priceKsh ?? 0));
});

function formatRequest(vr: typeof vettingRequestsTable.$inferSelect, packageName: string, priceKsh: number) {
  return {
    id: vr.id,
    employerId: vr.employerId,
    workerName: vr.workerName,
    workerPhone: vr.workerPhone,
    workerIdNumber: vr.workerIdNumber,
    workerEmail: null as string | null,
    workerRole: vr.workerRole,
    packageId: vr.packageId,
    packageName,
    priceKsh,
    status: vr.status,
    trustScore: vr.trustScore,
    notes: vr.notes,
    reportId: vr.reportId,
    completedAt: vr.completedAt?.toISOString() ?? null,
    createdAt: vr.createdAt.toISOString(),
    updatedAt: vr.updatedAt.toISOString(),
  };
}

export default router;
