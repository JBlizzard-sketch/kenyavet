import { Router, type IRouter } from "express";
import { db, staffRecordsTable, vettingRequestsTable, reportsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";

const router: IRouter = Router();

router.get("/staff", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const records = await db.select().from(staffRecordsTable)
    .where(eq(staffRecordsTable.employerId, req.userId!));
  res.json({ staff: records.map(formatStaff) });
});

router.post("/staff", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { workerName, role, phone, startDate, notes } = req.body;
  if (!workerName || !role) {
    res.status(400).json({ message: "workerName and role are required" });
    return;
  }
  const renewalDue = new Date();
  renewalDue.setFullYear(renewalDue.getFullYear() + 1);
  const [record] = await db.insert(staffRecordsTable).values({
    employerId: req.userId!,
    name: workerName,
    role,
    startDate: startDate || null,
    phone: phone || null,
    notes: notes || null,
    active: true,
    renewalDueAt: renewalDue,
  }).returning();
  res.status(201).json(formatStaff(record));
});

// Add a staff member from a completed vetting request
router.post("/staff/from-request/:requestId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const requestId = parseInt(req.params.requestId as string, 10);
  if (isNaN(requestId)) { res.status(400).json({ message: "Invalid request ID" }); return; }

  const [row] = await db
    .select({ vr: vettingRequestsTable, r: reportsTable })
    .from(vettingRequestsTable)
    .leftJoin(reportsTable, eq(reportsTable.id, vettingRequestsTable.reportId))
    .where(and(
      eq(vettingRequestsTable.id, requestId),
      eq(vettingRequestsTable.employerId, req.userId!),
    ));

  if (!row) { res.status(404).json({ message: "Request not found" }); return; }
  if (row.vr.status !== "completed") {
    res.status(400).json({ message: "Vetting must be completed before adding to roster" });
    return;
  }

  // Check if already in staff
  const existing = await db.select().from(staffRecordsTable)
    .where(and(
      eq(staffRecordsTable.employerId, req.userId!),
      eq(staffRecordsTable.vettingRequestId, requestId),
    ));
  if (existing.length > 0) {
    res.status(409).json({ message: "Already in staff roster", staff: formatStaff(existing[0]) });
    return;
  }

  const renewalDue = new Date();
  renewalDue.setFullYear(renewalDue.getFullYear() + 1);

  const [record] = await db.insert(staffRecordsTable).values({
    employerId: req.userId!,
    name: row.vr.workerName,
    role: row.vr.workerRole,
    phone: row.vr.workerPhone,
    trustScore: row.vr.trustScore,
    vettingRequestId: requestId,
    startDate: new Date().toISOString().split("T")[0],
    active: true,
    renewalDueAt: renewalDue,
  }).returning();

  res.status(201).json(formatStaff(record));
});

// GET /staff/renewals — must be BEFORE /staff/:id
router.get("/staff/renewals", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const records = await db.select().from(staffRecordsTable)
    .where(and(eq(staffRecordsTable.employerId, req.userId!), eq(staffRecordsTable.active, true)));

  const now = Date.now();
  const SOON_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

  const enriched = records
    .filter(r => r.renewalDueAt != null)
    .map(r => {
      const dueTs = r.renewalDueAt!.getTime();
      const daysUntil = Math.ceil((dueTs - now) / 86400000);
      const urgency: "overdue" | "due_soon" | "ok" =
        dueTs < now ? "overdue" : dueTs < now + SOON_MS ? "due_soon" : "ok";
      return {
        ...formatStaff(r),
        daysUntil,
        urgency,
      };
    })
    .sort((a, b) => {
      const order = { overdue: 0, due_soon: 1, ok: 2 };
      if (order[a.urgency] !== order[b.urgency]) return order[a.urgency] - order[b.urgency];
      return a.daysUntil - b.daysUntil;
    });

  res.json({ renewals: enriched });
});

router.patch("/staff/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ message: "Invalid ID" }); return; }

  const update: Record<string, unknown> = {};
  const { workerName, name, role, phone, notes, status, active, renewalDueAt } = req.body;
  if (workerName != null) update.name = workerName;
  if (name != null) update.name = name;
  if (role != null) update.role = role;
  if (phone != null) update.phone = phone;
  if (notes != null) update.notes = notes;
  if (status != null) update.active = status === "active";
  if (active != null) update.active = active;
  if (renewalDueAt !== undefined) update.renewalDueAt = renewalDueAt ? new Date(renewalDueAt) : null;

  const [record] = await db.update(staffRecordsTable)
    .set(update)
    .where(and(eq(staffRecordsTable.id, id), eq(staffRecordsTable.employerId, req.userId!)))
    .returning();
  if (!record) { res.status(404).json({ message: "Not found" }); return; }
  res.json(formatStaff(record));
});

router.get("/staff/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ message: "Invalid ID" }); return; }
  const [record] = await db.select().from(staffRecordsTable)
    .where(and(eq(staffRecordsTable.id, id), eq(staffRecordsTable.employerId, req.userId!)));
  if (!record) { res.status(404).json({ message: "Not found" }); return; }
  res.json({
    ...formatStaff(record),
    vettingRequestId: record.vettingRequestId ?? null,
  });
});

router.delete("/staff/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(staffRecordsTable)
    .where(and(eq(staffRecordsTable.id, id), eq(staffRecordsTable.employerId, req.userId!)));
  res.sendStatus(204);
});

function formatStaff(s: typeof staffRecordsTable.$inferSelect) {
  return {
    id: s.id,
    employerId: s.employerId,
    workerName: s.name,
    role: s.role,
    startDate: s.startDate,
    phone: s.phone,
    notes: s.notes,
    status: s.active ? "active" : "inactive",
    trustScore: s.trustScore,
    renewalDueAt: s.renewalDueAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
  };
}

export default router;
