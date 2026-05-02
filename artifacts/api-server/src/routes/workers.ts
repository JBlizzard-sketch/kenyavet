import { Router, type IRouter } from "express";
import { db, workersTable } from "@workspace/db";
import { eq, ilike, gte, or, count, desc } from "drizzle-orm";

const router: IRouter = Router();

// IMPORTANT: /workers/verify/:qrCode must be defined BEFORE /workers/:id
router.get("/workers/verify/:qrCode", async (req, res): Promise<void> => {
  const qrCode = req.params.qrCode as string;
  const [worker] = await db.select().from(workersTable).where(eq(workersTable.qrCode, qrCode));
  if (!worker) {
    res.status(404).json({ message: "No verified worker found with that QR code" });
    return;
  }
  res.json(formatWorker(worker));
});

router.get("/workers", async (req, res): Promise<void> => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 12)));
  const offset = (page - 1) * limit;
  const role = req.query.role as string | undefined;
  const query = req.query.query as string | undefined;
  const minScore = req.query.minScore ? Number(req.query.minScore) : undefined;

  const conditions = [];
  if (role) conditions.push(ilike(workersTable.role, `%${role}%`));
  if (query) conditions.push(or(
    ilike(workersTable.name, `%${query}%`),
    ilike(workersTable.neighbourhood, `%${query}%`),
  )!);
  if (minScore) conditions.push(gte(workersTable.trustScore, minScore));

  const workersList = await db.select().from(workersTable)
    .where(conditions.length > 0 ? (conditions.length === 1 ? conditions[0] : conditions[0]) : undefined)
    .orderBy(desc(workersTable.trustScore))
    .limit(limit)
    .offset(offset);

  const [{ total }] = await db.select({ total: count() }).from(workersTable);

  res.json({
    workers: workersList.map(formatWorker),
    total: Number(total),
    page,
    limit,
  });
});

router.get("/workers/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ message: "Invalid ID" }); return; }
  const [worker] = await db.select().from(workersTable).where(eq(workersTable.id, id));
  if (!worker) { res.status(404).json({ message: "Not found" }); return; }
  res.json(formatWorker(worker));
});

function formatWorker(w: typeof workersTable.$inferSelect) {
  return {
    id: w.id,
    name: w.name,
    role: w.role,
    trustScore: w.trustScore,
    photoUrl: w.photoUrl,
    neighbourhood: w.neighbourhood,
    yearsExperience: w.yearsExperience,
    languages: w.languages ?? [],
    badges: w.badges ?? [],
    qrCode: w.qrCode,
    vetCount: w.vetCount,
    verifiedAt: w.verifiedAt?.toISOString() ?? null,
    createdAt: w.createdAt.toISOString(),
  };
}

export default router;
