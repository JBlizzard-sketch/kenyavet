import { Router, type IRouter } from "express";
import { db, workersTable, reportsTable, vettingRequestsTable } from "@workspace/db";
import { eq, ilike, gte, or, count, desc, ne } from "drizzle-orm";

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
      // Don't show if already in workersList by name
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
    }));

  const [{ total }] = await db.select({ total: count() }).from(workersTable);
  const allWorkers = [...workersList.map(w => ({ ...formatWorker(w), fromReport: false, reportId: null })), ...fromReports];

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
