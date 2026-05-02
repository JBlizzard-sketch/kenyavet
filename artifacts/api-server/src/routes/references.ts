import { Router, type IRouter } from "express";
import { db, referenceContactsTable, vettingRequestsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";
import { AddReferenceBody, UpdateReferenceBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/vetting-requests/:id/references", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [vr] = await db.select().from(vettingRequestsTable)
    .where(and(eq(vettingRequestsTable.id, id), eq(vettingRequestsTable.employerId, req.userId!)));
  if (!vr) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const refs = await db.select().from(referenceContactsTable)
    .where(eq(referenceContactsTable.vettingRequestId, id));
  res.json(refs.map(formatRef));
});

router.post("/vetting-requests/:id/references", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [vr] = await db.select().from(vettingRequestsTable)
    .where(and(eq(vettingRequestsTable.id, id), eq(vettingRequestsTable.employerId, req.userId!)));
  if (!vr) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const parsed = AddReferenceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [ref] = await db.insert(referenceContactsTable).values({
    vettingRequestId: id,
    name: parsed.data.name,
    phone: parsed.data.phone,
    relationship: parsed.data.relationship,
    employerName: parsed.data.employerName,
    yearsWorked: parsed.data.yearsWorked,
    callStatus: "pending",
  }).returning();
  res.status(201).json(formatRef(ref));
});

router.patch("/vetting-requests/:requestId/references/:referenceId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const requestId = parseInt(Array.isArray(req.params.requestId) ? req.params.requestId[0] : req.params.requestId, 10);
  const referenceId = parseInt(Array.isArray(req.params.referenceId) ? req.params.referenceId[0] : req.params.referenceId, 10);

  const [vr] = await db.select().from(vettingRequestsTable)
    .where(and(eq(vettingRequestsTable.id, requestId), eq(vettingRequestsTable.employerId, req.userId!)));
  if (!vr) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const parsed = UpdateReferenceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const update: Record<string, unknown> = {};
  if (parsed.data.callStatus !== undefined) update.callStatus = parsed.data.callStatus;
  if (parsed.data.callSummary !== undefined) update.callSummary = parsed.data.callSummary;
  if (parsed.data.rehireWilling !== undefined) update.rehireWilling = parsed.data.rehireWilling;
  if (parsed.data.overallRating !== undefined) update.overallRating = parsed.data.overallRating;
  if (parsed.data.notes !== undefined) update.notes = parsed.data.notes;

  const [ref] = await db.update(referenceContactsTable)
    .set(update)
    .where(and(eq(referenceContactsTable.id, referenceId), eq(referenceContactsTable.vettingRequestId, requestId)))
    .returning();
  if (!ref) {
    res.status(404).json({ error: "Reference not found" });
    return;
  }
  res.json(formatRef(ref));
});

function formatRef(r: typeof referenceContactsTable.$inferSelect) {
  return {
    id: r.id,
    vettingRequestId: r.vettingRequestId,
    name: r.name,
    phone: r.phone,
    relationship: r.relationship,
    employerName: r.employerName,
    yearsWorked: r.yearsWorked,
    callStatus: r.callStatus,
    callSummary: r.callSummary,
    rehireWilling: r.rehireWilling,
    overallRating: r.overallRating,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
  };
}

export default router;
