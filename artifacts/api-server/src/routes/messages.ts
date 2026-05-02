import { Router, type IRouter } from "express";
import { db, messagesTable, vettingRequestsTable, usersTable } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";

const router: IRouter = Router();

// GET /vetting-requests/:id/messages — employer sees own request thread; ops/admin sees all
router.get("/vetting-requests/:id/messages", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const requestId = parseInt(req.params.id as string, 10);
  if (isNaN(requestId)) { res.status(400).json({ message: "Invalid request ID" }); return; }

  // Verify access
  if (req.userRole === "employer") {
    const [vr] = await db.select({ id: vettingRequestsTable.id })
      .from(vettingRequestsTable)
      .where(and(eq(vettingRequestsTable.id, requestId), eq(vettingRequestsTable.employerId, req.userId!)));
    if (!vr) { res.status(404).json({ message: "Request not found" }); return; }
  }

  const messages = await db.select().from(messagesTable)
    .where(eq(messagesTable.requestId, requestId))
    .orderBy(asc(messagesTable.createdAt));

  res.json({ messages });
});

// POST /vetting-requests/:id/messages — send a message
router.post("/vetting-requests/:id/messages", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const requestId = parseInt(req.params.id as string, 10);
  if (isNaN(requestId)) { res.status(400).json({ message: "Invalid request ID" }); return; }

  const { body } = req.body;
  if (!body || typeof body !== "string" || !body.trim()) {
    res.status(400).json({ message: "Message body is required" }); return;
  }

  // Verify access
  if (req.userRole === "employer") {
    const [vr] = await db.select({ id: vettingRequestsTable.id })
      .from(vettingRequestsTable)
      .where(and(eq(vettingRequestsTable.id, requestId), eq(vettingRequestsTable.employerId, req.userId!)));
    if (!vr) { res.status(404).json({ message: "Request not found" }); return; }
  }

  // Look up sender name from DB
  const [userRow] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, req.userId!));
  const senderName = userRow?.name ?? (req.userRole === "ops" ? "KenyaVet Ops" : req.userRole === "admin" ? "KenyaVet Admin" : "Homeowner");

  const [msg] = await db.insert(messagesTable).values({
    requestId,
    userId: req.userId!,
    role: req.userRole!,
    senderName,
    body: body.trim(),
  }).returning();

  res.status(201).json(msg);
});

export default router;
