import { Router, type IRouter } from "express";
import { db, workersTable } from "@workspace/db";
import { eq, ilike, gte, or, count, desc } from "drizzle-orm";
import { ListWorkersQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/workers", async (req, res): Promise<void> => {
  const query = ListWorkersQueryParams.safeParse(req.query);
  const page = Number(query.success ? query.data.page ?? 1 : 1);
  const limit = Number(query.success ? query.data.limit ?? 12 : 12);
  const offset = (page - 1) * limit;

  const conditions = [];
  if (query.success && query.data.role) {
    conditions.push(ilike(workersTable.role, `%${query.data.role}%`));
  }
  if (query.success && query.data.query) {
    conditions.push(or(
      ilike(workersTable.name, `%${query.data.query}%`),
      ilike(workersTable.neighbourhood, `%${query.data.query}%`),
    ));
  }
  if (query.success && query.data.minScore) {
    conditions.push(gte(workersTable.trustScore, Number(query.data.minScore)));
  }

  const workers = await db.select().from(workersTable)
    .where(conditions.length > 0 ? (conditions.length === 1 ? conditions[0] : conditions.reduce((a, b) => a && b)) : undefined)
    .orderBy(desc(workersTable.trustScore))
    .limit(limit)
    .offset(offset);

  const [{ total }] = await db.select({ total: count() }).from(workersTable);

  res.json({
    items: workers.map(formatWorker),
    total: Number(total),
    page,
    limit,
  });
});

router.get("/workers/verify/:qrCode", async (req, res): Promise<void> => {
  const qrCode = Array.isArray(req.params.qrCode) ? req.params.qrCode[0] : req.params.qrCode;
  const [worker] = await db.select().from(workersTable).where(eq(workersTable.qrCode, qrCode));
  if (!worker) {
    res.status(404).json({ error: "Worker not found" });
    return;
  }
  res.json({
    worker: formatWorker(worker),
    isValid: true,
    verifiedAt: worker.verifiedAt.toISOString(),
  });
});

router.get("/workers/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [worker] = await db.select().from(workersTable).where(eq(workersTable.id, id));
  if (!worker) {
    res.status(404).json({ error: "Not found" });
    return;
  }
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
    verifiedAt: w.verifiedAt.toISOString(),
    createdAt: w.createdAt.toISOString(),
  };
}

export default router;
