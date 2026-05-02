import { Router, type IRouter } from "express";
import { db, workersTable, reportsTable, vettingRequestsTable, workerReviewsTable, usersTable } from "@workspace/db";
import { eq, ilike, gte, or, count, desc, and, avg, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";

const router: IRouter = Router();

// IMPORTANT: /workers/verify/:qrCode must be defined BEFORE /workers/:id
router.get("/workers/verify/:qrCode", async (req, res): Promise<void> => {
  const qrCode = req.params.qrCode as string;
  const [worker] = await db.select().from(workersTable).where(eq(workersTable.qrCode, qrCode));
  if (!worker) {
    res.status(404).json({ message: "No verified worker found with that QR code" });
    return;
  }

  const reviews = await db
    .select({ rating: workerReviewsTable.rating })
    .from(workerReviewsTable)
    .where(eq(workerReviewsTable.workerId, worker.id));

  const avgRating = reviews.length > 0
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : null;

  res.json({ ...formatWorker(worker), avgRating, reviewCount: reviews.length });
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

  const whereClause = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);

  const workersList = await db.select().from(workersTable)
    .where(whereClause)
    .orderBy(desc(workersTable.trustScore))
    .limit(limit)
    .offset(offset);

  // Also pull verified workers from completed reports (deduped by name+role)
  const reportWorkers = await db
    .select({ r: reportsTable, vr: vettingRequestsTable })
    .from(reportsTable)
    .innerJoin(vettingRequestsTable, eq(reportsTable.vettingRequestId, vettingRequestsTable.id))
    .where(eq(vettingRequestsTable.status, "completed"))
    .orderBy(desc(reportsTable.overallTrustScore));

  const fromReports = reportWorkers
    .filter(row => {
      const nameMatch = query ? row.r.workerName.toLowerCase().includes(query.toLowerCase()) : true;
      const roleMatch = role ? row.r.workerRole.toLowerCase().includes(role.toLowerCase()) : true;
      const scoreMatch = minScore ? (row.r.overallTrustScore >= minScore) : true;
      const alreadyIn = workersList.some(w => w.name.toLowerCase() === row.r.workerName.toLowerCase());
      return nameMatch && roleMatch && scoreMatch && !alreadyIn;
    })
    .map(row => ({
      id: -row.r.id,
      name: row.r.workerName,
      role: row.r.workerRole,
      trustScore: row.r.overallTrustScore,
      photoUrl: row.r.workerPhotoUrl,
      neighbourhood: row.vr.workerAddress ?? null,
      yearsExperience: null,
      languages: [] as string[],
      badges: (() => {
        const b: string[] = [];
        if (row.r.identityVerified) b.push("Identity Verified");
        if (row.r.dciCertificateStatus === "verified") b.push("DCI Cleared");
        if (row.r.referencesSummary) b.push("References Checked");
        if (row.r.socialMediaSummary) b.push("Social Media Reviewed");
        return b;
      })(),
      qrCode: null,
      vetCount: 1,
      verifiedAt: row.r.completedAt.toISOString(),
      createdAt: row.r.createdAt.toISOString(),
      fromReport: true,
      reportId: row.r.id,
      avgRating: null,
      reviewCount: 0,
    }));

  const [{ total }] = await db.select({ total: count() }).from(workersTable);
  const allWorkers = [...workersList.map(w => ({ ...formatWorker(w), fromReport: false, reportId: null, avgRating: null, reviewCount: 0 })), ...fromReports];

  res.json({
    workers: allWorkers.slice(offset, offset + limit),
    total: Number(total) + fromReports.length,
    page,
    limit,
  });
});

router.get("/workers/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ message: "Invalid ID" }); return; }
  const [worker] = await db.select().from(workersTable).where(eq(workersTable.id, id));
  if (!worker) { res.status(404).json({ message: "Not found" }); return; }

  const reviews = await db
    .select({ rating: workerReviewsTable.rating })
    .from(workerReviewsTable)
    .where(eq(workerReviewsTable.workerId, id));

  const avgRating = reviews.length > 0
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : null;

  res.json({ ...formatWorker(worker), avgRating, reviewCount: reviews.length });
});

// GET /workers/:id/reviews — public, paginated
router.get("/workers/:id/reviews", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ message: "Invalid ID" }); return; }

  const reviews = await db
    .select({
      id: workerReviewsTable.id,
      rating: workerReviewsTable.rating,
      review: workerReviewsTable.review,
      createdAt: workerReviewsTable.createdAt,
      employerName: usersTable.name,
      employerNeighbourhood: usersTable.neighbourhood,
    })
    .from(workerReviewsTable)
    .innerJoin(usersTable, eq(workerReviewsTable.employerId, usersTable.id))
    .where(eq(workerReviewsTable.workerId, id))
    .orderBy(desc(workerReviewsTable.createdAt));

  const avgRating = reviews.length > 0
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : null;

  res.json({
    reviews: reviews.map(r => ({
      id: r.id,
      rating: r.rating,
      review: r.review,
      createdAt: r.createdAt.toISOString(),
      employerName: r.employerName,
      employerNeighbourhood: r.employerNeighbourhood,
    })),
    avgRating,
    totalReviews: reviews.length,
  });
});

// POST /workers/:id/review — auth required, one review per employer per worker
router.post("/workers/:id/review", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ message: "Invalid ID" }); return; }

  const { rating, review } = req.body;
  if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
    res.status(400).json({ message: "Rating must be an integer 1–5" }); return;
  }

  const [worker] = await db.select({ id: workersTable.id }).from(workersTable).where(eq(workersTable.id, id));
  if (!worker) { res.status(404).json({ message: "Worker not found" }); return; }

  const existing = await db
    .select({ id: workerReviewsTable.id })
    .from(workerReviewsTable)
    .where(and(eq(workerReviewsTable.workerId, id), eq(workerReviewsTable.employerId, req.userId!)));

  if (existing.length > 0) {
    await db.update(workerReviewsTable)
      .set({ rating, review: review || null })
      .where(and(eq(workerReviewsTable.workerId, id), eq(workerReviewsTable.employerId, req.userId!)));
    res.json({ message: "Review updated" });
    return;
  }

  await db.insert(workerReviewsTable).values({
    workerId: id,
    employerId: req.userId!,
    rating,
    review: review || null,
  });

  res.status(201).json({ message: "Review submitted" });
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
