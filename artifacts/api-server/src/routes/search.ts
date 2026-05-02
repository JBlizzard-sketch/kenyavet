import { Router, type IRouter } from "express";
import { db, workersTable, vettingRequestsTable, reportsTable, vettingPackagesTable } from "@workspace/db";
import { ilike, or, eq, desc, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";

const router: IRouter = Router();

router.get("/search", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const q = (req.query.q as string ?? "").trim();
  if (!q || q.length < 2) {
    res.json({ results: [] });
    return;
  }

  const uid = req.userId!;
  const like = `%${q}%`;

  const [workerRows, requestRows, reportRows] = await Promise.all([
    db.select().from(workersTable)
      .where(or(
        ilike(workersTable.name, like),
        ilike(workersTable.role, like),
        ilike(workersTable.neighbourhood, like),
      )!)
      .orderBy(desc(workersTable.trustScore))
      .limit(5),

    db.select({ vr: vettingRequestsTable, pkg: vettingPackagesTable })
      .from(vettingRequestsTable)
      .leftJoin(vettingPackagesTable, eq(vettingRequestsTable.packageId, vettingPackagesTable.id))
      .where(and(
        eq(vettingRequestsTable.employerId, uid),
        or(
          ilike(vettingRequestsTable.workerName, like),
          ilike(vettingRequestsTable.workerRole, like),
          ilike(vettingRequestsTable.workerIdNumber, like),
        )!,
      ))
      .orderBy(desc(vettingRequestsTable.createdAt))
      .limit(5),

    db.select({ r: reportsTable })
      .from(reportsTable)
      .innerJoin(vettingRequestsTable, eq(reportsTable.vettingRequestId, vettingRequestsTable.id))
      .where(and(
        eq(vettingRequestsTable.employerId, uid),
        or(
          ilike(reportsTable.workerName, like),
          ilike(reportsTable.workerRole, like),
        )!,
      ))
      .orderBy(desc(reportsTable.completedAt))
      .limit(5),
  ]);

  const results = [
    ...workerRows.map(w => ({
      type: "worker" as const,
      id: w.id,
      title: w.name,
      subtitle: `${w.role}${w.neighbourhood ? ` · ${w.neighbourhood}` : ""}${w.trustScore != null ? ` · Score: ${w.trustScore}` : ""}`,
      href: `/workers/${w.id}`,
    })),
    ...requestRows.map(r => ({
      type: "request" as const,
      id: r.vr.id,
      title: r.vr.workerName,
      subtitle: `${r.vr.workerRole} · ${r.pkg?.name ?? ""}  · ${r.vr.status.replace(/_/g, " ")}`,
      href: `/vetting-requests/${r.vr.id}`,
    })),
    ...reportRows.map(r => ({
      type: "report" as const,
      id: r.r.id,
      title: r.r.workerName,
      subtitle: `${r.r.workerRole} · Trust Score: ${r.r.overallTrustScore} · ${r.r.packageName}`,
      href: `/reports/${r.r.id}`,
    })),
  ];

  res.json({ results, query: q });
});

export default router;
