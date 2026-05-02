import { Router, type IRouter } from "express";
import { db, vettingRequestsTable, vettingPackagesTable, vettingStepsTable, activityItemsTable } from "@workspace/db";
import { eq, desc, and, count } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";
import {
  CreateVettingRequestBody,
  UpdateVettingRequestBody,
  GetVettingRequestParams,
  UpdateVettingRequestParams,
  ListVettingRequestsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const STEP_DEFINITIONS = [
  { stepName: "Identity Verification", stepKey: "identity_check", order: 1 },
  { stepName: "Reference Calls", stepKey: "reference_calls", order: 2 },
  { stepName: "DCI Certificate Check", stepKey: "dci_certificate", order: 3 },
  { stepName: "Social Media Review", stepKey: "social_media_review", order: 4 },
];

const PREMIUM_STEPS = [
  ...STEP_DEFINITIONS,
  { stepName: "Physical Address Visit", stepKey: "address_visit", order: 5 },
];

const FINAL_STEP = { stepName: "Report Generation", stepKey: "report_generation", order: 6 };

router.get("/vetting-requests", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const query = ListVettingRequestsQueryParams.safeParse(req.query);
  const page = Number(query.success ? query.data.page ?? 1 : 1);
  const limit = Number(query.success ? query.data.limit ?? 10 : 10);
  const offset = (page - 1) * limit;

  const conditions = [eq(vettingRequestsTable.employerId, req.userId!)];

  const requests = await db
    .select({
      vr: vettingRequestsTable,
      pkg: vettingPackagesTable,
    })
    .from(vettingRequestsTable)
    .leftJoin(vettingPackagesTable, eq(vettingRequestsTable.packageId, vettingPackagesTable.id))
    .where(and(...conditions))
    .orderBy(desc(vettingRequestsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: count() })
    .from(vettingRequestsTable)
    .where(and(...conditions));

  res.json({
    items: requests.map(r => formatRequest(r.vr, r.pkg?.name ?? "")),
    total: Number(total),
    page,
    limit,
  });
});

router.post("/vetting-requests", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateVettingRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;

  const [pkg] = await db.select().from(vettingPackagesTable).where(eq(vettingPackagesTable.id, data.packageId));
  if (!pkg) {
    res.status(400).json({ error: "Invalid package" });
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

  const steps = pkg.slug === "premium" ? PREMIUM_STEPS : STEP_DEFINITIONS;
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

  res.status(201).json(formatRequest(vr, pkg.name));
});

router.get("/vetting-requests/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = GetVettingRequestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const [row] = await db
    .select({ vr: vettingRequestsTable, pkg: vettingPackagesTable })
    .from(vettingRequestsTable)
    .leftJoin(vettingPackagesTable, eq(vettingRequestsTable.packageId, vettingPackagesTable.id))
    .where(and(eq(vettingRequestsTable.id, params.data.id), eq(vettingRequestsTable.employerId, req.userId!)));

  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(formatRequest(row.vr, row.pkg?.name ?? ""));
});

router.patch("/vetting-requests/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = UpdateVettingRequestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const parsed = UpdateVettingRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const update: Record<string, unknown> = {};
  if (parsed.data.workerName != null) update.workerName = parsed.data.workerName;
  if (parsed.data.workerPhone != null) update.workerPhone = parsed.data.workerPhone;
  if (parsed.data.workerAddress != null) update.workerAddress = parsed.data.workerAddress;
  if (parsed.data.notes != null) update.notes = parsed.data.notes;

  const [vr] = await db.update(vettingRequestsTable)
    .set(update)
    .where(and(eq(vettingRequestsTable.id, params.data.id), eq(vettingRequestsTable.employerId, req.userId!)))
    .returning();
  if (!vr) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const [pkg] = await db.select().from(vettingPackagesTable).where(eq(vettingPackagesTable.id, vr.packageId));
  res.json(formatRequest(vr, pkg?.name ?? ""));
});

router.get("/vetting-requests/:id/steps", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = GetVettingRequestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const [vr] = await db.select().from(vettingRequestsTable)
    .where(and(eq(vettingRequestsTable.id, params.data.id), eq(vettingRequestsTable.employerId, req.userId!)));
  if (!vr) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const steps = await db.select().from(vettingStepsTable)
    .where(eq(vettingStepsTable.vettingRequestId, params.data.id))
    .orderBy(vettingStepsTable.order);
  res.json(steps.map(s => ({
    id: s.id,
    vettingRequestId: s.vettingRequestId,
    stepName: s.stepName,
    stepKey: s.stepKey,
    status: s.status,
    order: s.order,
    notes: s.notes,
    completedAt: s.completedAt?.toISOString() ?? null,
  })));
});

function formatRequest(vr: typeof vettingRequestsTable.$inferSelect, packageName: string) {
  return {
    id: vr.id,
    employerId: vr.employerId,
    workerName: vr.workerName,
    workerPhone: vr.workerPhone,
    workerIdNumber: vr.workerIdNumber,
    workerRole: vr.workerRole,
    packageId: vr.packageId,
    packageName,
    status: vr.status,
    trustScore: vr.trustScore,
    workerPhotoUrl: vr.workerPhotoUrl,
    workerAddress: vr.workerAddress,
    notes: vr.notes,
    reportId: vr.reportId,
    completedAt: vr.completedAt?.toISOString() ?? null,
    createdAt: vr.createdAt.toISOString(),
    updatedAt: vr.updatedAt.toISOString(),
  };
}

export default router;
