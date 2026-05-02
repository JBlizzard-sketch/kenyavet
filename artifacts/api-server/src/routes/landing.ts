import { Router, type IRouter } from "express";
import { db, vettingRequestsTable, reportsTable, usersTable } from "@workspace/db";
import { eq, count, avg } from "drizzle-orm";

const router: IRouter = Router();

router.get("/landing/stats", async (_req, res): Promise<void> => {
  const [reportCount] = await db.select({ total: count() }).from(reportsTable);
  const [employerCount] = await db
    .select({ total: count() })
    .from(usersTable)
    .where(eq(usersTable.role, "employer"));
  const [avgScore] = await db.select({ avg: avg(reportsTable.overallTrustScore) }).from(reportsTable);
  const [completedCount] = await db
    .select({ total: count() })
    .from(vettingRequestsTable)
    .where(eq(vettingRequestsTable.status, "completed"));

  res.json({
    workersVetted: Number(completedCount?.total ?? 0),
    reportsIssued: Number(reportCount?.total ?? 0),
    trustedEmployers: Number(employerCount?.total ?? 0),
    avgTrustScore: Math.round(Number(avgScore?.avg ?? 0)),
  });
});

export default router;
