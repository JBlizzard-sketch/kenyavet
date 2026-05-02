import { Router, type IRouter } from "express";
import { db, vettingRequestsTable, vettingPackagesTable, reportsTable } from "@workspace/db";
import { eq, and, gte, sql, count, avg } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";

const router: IRouter = Router();

router.get("/analytics", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const isAdmin = req.userRole === "admin" || req.userRole === "ops";
  const userId = req.userId!;

  const baseCondition = isAdmin ? undefined : eq(vettingRequestsTable.employerId, userId);

  // ── Totals ─────────────────────────────────────────────────────────────
  const [totalsRow] = await db
    .select({
      totalRequests: count(),
      avgTrustScore: avg(vettingRequestsTable.trustScore),
    })
    .from(vettingRequestsTable)
    .where(baseCondition);

  const completedRows = await db
    .select({ id: vettingRequestsTable.id })
    .from(vettingRequestsTable)
    .where(
      baseCondition
        ? and(baseCondition, eq(vettingRequestsTable.status, "completed"))
        : eq(vettingRequestsTable.status, "completed"),
    );

  // Join with packages to get spending
  const spendingRows = await db
    .select({ priceKsh: vettingPackagesTable.priceKsh })
    .from(vettingRequestsTable)
    .innerJoin(vettingPackagesTable, eq(vettingRequestsTable.packageId, vettingPackagesTable.id))
    .where(
      baseCondition
        ? and(baseCondition, sql`${vettingRequestsTable.status} != 'pending_payment'`)
        : sql`${vettingRequestsTable.status} != 'pending_payment'`,
    );

  const totalSpendingKsh = spendingRows.reduce((s, r) => s + r.priceKsh, 0);

  // ── Requests over time (last 12 months) ────────────────────────────────
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  const timeCondition = gte(vettingRequestsTable.createdAt, twelveMonthsAgo);
  const overTimeCondition = baseCondition ? and(baseCondition, timeCondition) : timeCondition;

  const overTimeRows = await db
    .select({
      month: sql<string>`TO_CHAR(${vettingRequestsTable.createdAt}, 'YYYY-MM')`,
      count: count(),
    })
    .from(vettingRequestsTable)
    .where(overTimeCondition)
    .groupBy(sql`TO_CHAR(${vettingRequestsTable.createdAt}, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(${vettingRequestsTable.createdAt}, 'YYYY-MM')`);

  // Spending per month (paid requests only)
  const spendingTimeCondition = baseCondition
    ? and(baseCondition, timeCondition, sql`${vettingRequestsTable.status} != 'pending_payment'`)
    : and(timeCondition, sql`${vettingRequestsTable.status} != 'pending_payment'`);

  const spendingOverTimeRaw = await db
    .select({
      month: sql<string>`TO_CHAR(${vettingRequestsTable.createdAt}, 'YYYY-MM')`,
      priceKsh: vettingPackagesTable.priceKsh,
    })
    .from(vettingRequestsTable)
    .innerJoin(vettingPackagesTable, eq(vettingRequestsTable.packageId, vettingPackagesTable.id))
    .where(spendingTimeCondition);

  const spendingByMonth: Record<string, number> = {};
  for (const row of spendingOverTimeRaw) {
    spendingByMonth[row.month] = (spendingByMonth[row.month] ?? 0) + row.priceKsh;
  }

  // Build full 12-month scaffold
  const months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const countByMonth: Record<string, number> = {};
  for (const row of overTimeRows) countByMonth[row.month] = Number(row.count);

  const requestsOverTime = months.map(m => {
    const label = new Date(m + "-01").toLocaleString("en-GB", { month: "short", year: "numeric" });
    return { month: label, count: countByMonth[m] ?? 0, spending: spendingByMonth[m] ?? 0 };
  });

  // ── Status breakdown ───────────────────────────────────────────────────
  const statusRows = await db
    .select({
      status: vettingRequestsTable.status,
      count: count(),
    })
    .from(vettingRequestsTable)
    .where(baseCondition)
    .groupBy(vettingRequestsTable.status);

  const STATUS_LABELS: Record<string, string> = {
    pending_payment: "Pending Payment",
    pending_review: "Pending Review",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  const statusBreakdown = statusRows.map(r => ({
    status: STATUS_LABELS[r.status] ?? r.status,
    count: Number(r.count),
  }));

  // ── Trust score distribution ───────────────────────────────────────────
  const scoredRows = await db
    .select({ trustScore: vettingRequestsTable.trustScore })
    .from(vettingRequestsTable)
    .where(
      baseCondition
        ? and(baseCondition, sql`${vettingRequestsTable.trustScore} IS NOT NULL`)
        : sql`${vettingRequestsTable.trustScore} IS NOT NULL`,
    );

  const buckets = [
    { range: "0–20", min: 0, max: 20, count: 0 },
    { range: "21–40", min: 21, max: 40, count: 0 },
    { range: "41–60", min: 41, max: 60, count: 0 },
    { range: "61–80", min: 61, max: 80, count: 0 },
    { range: "81–100", min: 81, max: 100, count: 0 },
  ];
  for (const row of scoredRows) {
    const score = row.trustScore!;
    for (const b of buckets) {
      if (score >= b.min && score <= b.max) { b.count++; break; }
    }
  }

  // ── Top roles ─────────────────────────────────────────────────────────
  const roleRows = await db
    .select({
      role: vettingRequestsTable.workerRole,
      count: count(),
    })
    .from(vettingRequestsTable)
    .where(baseCondition)
    .groupBy(vettingRequestsTable.workerRole)
    .orderBy(sql`COUNT(*) DESC`)
    .limit(6);

  const topRoles = roleRows.map(r => ({ role: r.role, count: Number(r.count) }));

  res.json({
    totals: {
      totalRequests: Number(totalsRow.totalRequests),
      completedRequests: completedRows.length,
      totalSpendingKsh,
      avgTrustScore: totalsRow.avgTrustScore ? Math.round(Number(totalsRow.avgTrustScore)) : null,
    },
    requestsOverTime,
    statusBreakdown,
    trustScoreDistribution: buckets.map(b => ({ range: b.range, count: b.count })),
    topRoles,
  });
});

export default router;
