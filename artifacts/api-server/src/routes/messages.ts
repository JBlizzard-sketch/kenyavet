import { Router, type IRouter } from "express";
import { db, messagesTable, vettingRequestsTable, usersTable } from "@workspace/db";
import { eq, and, asc, ne, sql, inArray } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";

const router: IRouter = Router();

// GET /vetting-requests/:id/messages — employer sees own request thread; ops/admin sees all
router.get("/vetting-requests/:id/messages", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const requestId = parseInt(req.params.id as string, 10);
  if (isNaN(requestId)) { res.status(400).json({ message: "Invalid request ID" }); return; }

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

  if (req.userRole === "employer") {
    const [vr] = await db.select({ id: vettingRequestsTable.id })
      .from(vettingRequestsTable)
      .where(and(eq(vettingRequestsTable.id, requestId), eq(vettingRequestsTable.employerId, req.userId!)));
    if (!vr) { res.status(404).json({ message: "Request not found" }); return; }
  }

  const [userRow] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, req.userId!));
  const senderName = userRow?.name ?? (req.userRole === "ops" ? "KenyaVet Ops" : req.userRole === "admin" ? "KenyaVet Admin" : "Homeowner");

  const [msg] = await db.insert(messagesTable).values({
    requestId,
    userId: req.userId!,
    role: req.userRole!,
    senderName,
    body: body.trim(),
    isRead: false, // recipient hasn't read it yet
  }).returning();

  res.status(201).json(msg);
});

// PATCH /vetting-requests/:id/messages/read — mark all unread messages (from other party) as read
router.patch("/vetting-requests/:id/messages/read", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const requestId = parseInt(req.params.id as string, 10);
  if (isNaN(requestId)) { res.status(400).json({ message: "Invalid request ID" }); return; }

  if (req.userRole === "employer") {
    const [vr] = await db.select({ id: vettingRequestsTable.id })
      .from(vettingRequestsTable)
      .where(and(eq(vettingRequestsTable.id, requestId), eq(vettingRequestsTable.employerId, req.userId!)));
    if (!vr) { res.status(404).json({ message: "Request not found" }); return; }
  }

  // Mark messages from the OTHER party as read
  // employer opens → mark ops/admin messages as read
  // ops/admin opens → mark employer messages as read
  const recipientRole = req.userRole === "employer" ? ["ops", "admin"] : ["employer"];

  await db.update(messagesTable)
    .set({ isRead: true })
    .where(
      and(
        eq(messagesTable.requestId, requestId),
        eq(messagesTable.isRead, false),
        inArray(messagesTable.role, recipientRole)
      )
    );

  res.json({ ok: true });
});

// GET /messages/threads — list all request threads with latest message and unread count
router.get("/messages/threads", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const isEmployer = req.userRole === "employer";

  const rows = await db
    .select({
      msg: messagesTable,
      requestId: vettingRequestsTable.id,
      workerName: vettingRequestsTable.workerName,
      workerRole: vettingRequestsTable.workerRole,
      requestStatus: vettingRequestsTable.status,
      employerName: usersTable.name,
      employerId: vettingRequestsTable.employerId,
    })
    .from(messagesTable)
    .innerJoin(vettingRequestsTable, eq(messagesTable.requestId, vettingRequestsTable.id))
    .innerJoin(usersTable, eq(usersTable.id, vettingRequestsTable.employerId))
    .where(isEmployer ? eq(vettingRequestsTable.employerId, req.userId!) : undefined)
    .orderBy(asc(messagesTable.createdAt));

  // Group by requestId in JS
  const threadMap = new Map<number, {
    requestId: number;
    workerName: string;
    workerRole: string;
    requestStatus: string;
    employerName: string;
    employerId: number;
    messages: (typeof messagesTable.$inferSelect)[];
  }>();

  for (const row of rows) {
    if (!threadMap.has(row.requestId)) {
      threadMap.set(row.requestId, {
        requestId: row.requestId,
        workerName: row.workerName,
        workerRole: row.workerRole,
        requestStatus: row.requestStatus,
        employerName: row.employerName,
        employerId: row.employerId,
        messages: [],
      });
    }
    threadMap.get(row.requestId)!.messages.push(row.msg);
  }

  const recipientRoles = isEmployer ? ["ops", "admin"] : ["employer"];

  const threads = Array.from(threadMap.values())
    .map(t => {
      const last = t.messages[t.messages.length - 1];
      const unread = t.messages.filter(m => !m.isRead && recipientRoles.includes(m.role)).length;
      return {
        requestId: t.requestId,
        workerName: t.workerName,
        workerRole: t.workerRole,
        requestStatus: t.requestStatus,
        employerName: t.employerName,
        employerId: t.employerId,
        lastMessageBody: last.body,
        lastMessageSender: last.senderName,
        lastMessageRole: last.role,
        lastMessageAt: last.createdAt.toISOString(),
        unreadCount: unread,
        totalMessages: t.messages.length,
      };
    })
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

  res.json({ threads });
});

// GET /messages/unread-count — total unread messages across all the caller's requests
router.get("/messages/unread-count", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  let count = 0;

  if (req.userRole === "employer") {
    // Employer: count unread ops/admin messages on their requests
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(messagesTable)
      .innerJoin(vettingRequestsTable, eq(messagesTable.requestId, vettingRequestsTable.id))
      .where(
        and(
          eq(vettingRequestsTable.employerId, req.userId!),
          eq(messagesTable.isRead, false),
          ne(messagesTable.role, "employer")
        )
      );
    count = rows[0]?.count ?? 0;
  } else {
    // Ops/Admin: count unread employer messages across all requests
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(messagesTable)
      .where(
        and(
          eq(messagesTable.isRead, false),
          eq(messagesTable.role, "employer")
        )
      );
    count = rows[0]?.count ?? 0;
  }

  res.json({ count });
});

export default router;
