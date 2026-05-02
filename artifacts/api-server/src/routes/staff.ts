import { Router, type IRouter } from "express";
import { db, staffRecordsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";
import { AddStaffBody, UpdateStaffBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/staff", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const records = await db.select().from(staffRecordsTable)
    .where(eq(staffRecordsTable.employerId, req.userId!));
  res.json(records.map(formatStaff));
});

router.post("/staff", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = AddStaffBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const d = parsed.data;
  const renewalDue = new Date();
  renewalDue.setFullYear(renewalDue.getFullYear() + 1);
  const [record] = await db.insert(staffRecordsTable).values({
    employerId: req.userId!,
    name: d.name,
    role: d.role,
    startDate: d.startDate,
    phone: d.phone,
    photoUrl: d.photoUrl,
    notes: d.notes,
    vettingRequestId: d.vettingRequestId,
    active: true,
    renewalDueAt: renewalDue,
  }).returning();
  res.status(201).json(formatStaff(record));
});

router.patch("/staff/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const parsed = UpdateStaffBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const update: Record<string, unknown> = {};
  if (parsed.data.name != null) update.name = parsed.data.name;
  if (parsed.data.role != null) update.role = parsed.data.role;
  if (parsed.data.phone != null) update.phone = parsed.data.phone;
  if (parsed.data.notes != null) update.notes = parsed.data.notes;
  if (parsed.data.active != null) update.active = parsed.data.active;
  const [record] = await db.update(staffRecordsTable)
    .set(update)
    .where(and(eq(staffRecordsTable.id, id), eq(staffRecordsTable.employerId, req.userId!)))
    .returning();
  if (!record) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(formatStaff(record));
});

router.delete("/staff/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(staffRecordsTable)
    .where(and(eq(staffRecordsTable.id, id), eq(staffRecordsTable.employerId, req.userId!)));
  res.sendStatus(204);
});

function formatStaff(s: typeof staffRecordsTable.$inferSelect) {
  return {
    id: s.id,
    employerId: s.employerId,
    name: s.name,
    role: s.role,
    startDate: s.startDate,
    phone: s.phone,
    photoUrl: s.photoUrl,
    notes: s.notes,
    active: s.active,
    vettingRequestId: s.vettingRequestId,
    trustScore: s.trustScore,
    renewalDueAt: s.renewalDueAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
  };
}

export default router;
