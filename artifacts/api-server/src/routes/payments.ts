import { Router, type IRouter } from "express";
import { db, vettingRequestsTable, vettingPackagesTable, vettingStepsTable, activityItemsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";

const router: IRouter = Router();

router.post("/vetting-requests/:id/pay", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ message: "Invalid ID" }); return; }

  const { phone } = req.body;
  if (!phone) { res.status(400).json({ message: "phone is required" }); return; }

  const [row] = await db
    .select({ vr: vettingRequestsTable, pkg: vettingPackagesTable })
    .from(vettingRequestsTable)
    .leftJoin(vettingPackagesTable, eq(vettingRequestsTable.packageId, vettingPackagesTable.id))
    .where(and(eq(vettingRequestsTable.id, id), eq(vettingRequestsTable.employerId, req.userId!)));

  if (!row) { res.status(404).json({ message: "Request not found" }); return; }
  if (row.vr.status !== "pending_payment") {
    res.status(400).json({ message: `Cannot pay for a request with status: ${row.vr.status}` });
    return;
  }

  const mpesaRef = `KV${Date.now().toString().slice(-8)}`;

  await db.update(vettingRequestsTable)
    .set({ status: "in_progress", updatedAt: new Date() })
    .where(eq(vettingRequestsTable.id, id));

  await db.update(vettingStepsTable)
    .set({ status: "in_progress" })
    .where(and(eq(vettingStepsTable.vettingRequestId, id), eq(vettingStepsTable.order, 1)));

  await db.insert(activityItemsTable).values({
    userId: req.userId!,
    type: "payment_received",
    message: `Payment confirmed for ${row.vr.workerName} — Ref: ${mpesaRef}`,
    workerName: row.vr.workerName,
    linkId: id,
  });

  res.json({
    success: true,
    mpesaRef,
    phone,
    amount: row.pkg?.priceKsh ?? 0,
    message: `Payment of KES ${row.pkg?.priceKsh?.toLocaleString() ?? "0"} confirmed. Vetting begins within 2 hours.`,
  });
});

export default router;
