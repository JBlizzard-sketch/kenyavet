import { Router, type IRouter } from "express";
import { db, documentsTable, vettingRequestsTable, messagesTable, usersTable } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";

const router: IRouter = Router();

// GET /vetting-requests/:id/documents — list documents for a request
router.get("/vetting-requests/:id/documents", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const requestId = parseInt(req.params.id as string, 10);
  if (isNaN(requestId)) { res.status(400).json({ message: "Invalid request ID" }); return; }

  if (req.userRole === "employer") {
    const [vr] = await db.select({ id: vettingRequestsTable.id })
      .from(vettingRequestsTable)
      .where(and(eq(vettingRequestsTable.id, requestId), eq(vettingRequestsTable.employerId, req.userId!)));
    if (!vr) { res.status(404).json({ message: "Request not found" }); return; }
  }

  const docs = await db.select().from(documentsTable)
    .where(eq(documentsTable.requestId, requestId))
    .orderBy(asc(documentsTable.createdAt));

  res.json({ documents: docs });
});

// POST /vetting-requests/:id/documents — register a document after upload
router.post("/vetting-requests/:id/documents", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const requestId = parseInt(req.params.id as string, 10);
  if (isNaN(requestId)) { res.status(400).json({ message: "Invalid request ID" }); return; }

  if (req.userRole === "employer") {
    const [vr] = await db.select({ id: vettingRequestsTable.id })
      .from(vettingRequestsTable)
      .where(and(eq(vettingRequestsTable.id, requestId), eq(vettingRequestsTable.employerId, req.userId!)));
    if (!vr) { res.status(404).json({ message: "Request not found" }); return; }
  }

  const { fileName, fileSize, mimeType, objectPath, label } = req.body;
  if (!fileName || !fileSize || !mimeType || !objectPath) {
    res.status(400).json({ message: "fileName, fileSize, mimeType, objectPath are required" }); return;
  }

  const [doc] = await db.insert(documentsTable).values({
    requestId,
    uploadedBy: req.userId!,
    uploaderRole: req.userRole!,
    fileName: String(fileName),
    fileSize: Number(fileSize),
    mimeType: String(mimeType),
    objectPath: String(objectPath),
    label: label ? String(label) : null,
  }).returning();

  // Auto-post a message in the thread so both parties are notified
  try {
    let senderName = "KenyaVet Team";
    if (req.userRole === "employer") {
      const [u] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, req.userId!));
      senderName = u?.name ?? "Employer";
    }
    const labelStr = label ? `${String(label)}: ` : "";
    const msgBody = req.userRole === "employer"
      ? `📎 Document uploaded: ${labelStr}${String(fileName)}`
      : `📎 KenyaVet has added a document: ${labelStr}${String(fileName)}`;
    await db.insert(messagesTable).values({
      requestId,
      userId: req.userId!,
      role: req.userRole!,
      senderName,
      body: msgBody,
    });
  } catch { /* non-blocking — doc upload succeeded regardless */ }

  res.status(201).json(doc);
});

// DELETE /vetting-requests/:id/documents/:docId — delete a document (uploader or ops/admin)
router.delete("/vetting-requests/:id/documents/:docId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const requestId = parseInt(req.params.id as string, 10);
  const docId = parseInt(req.params.docId as string, 10);
  if (isNaN(requestId) || isNaN(docId)) { res.status(400).json({ message: "Invalid IDs" }); return; }

  const [doc] = await db.select().from(documentsTable)
    .where(and(eq(documentsTable.id, docId), eq(documentsTable.requestId, requestId)));
  if (!doc) { res.status(404).json({ message: "Document not found" }); return; }

  // Employer can only delete their own uploads; ops/admin can delete any
  if (req.userRole === "employer" && doc.uploadedBy !== req.userId) {
    res.status(403).json({ message: "Cannot delete this document" }); return;
  }

  await db.delete(documentsTable).where(eq(documentsTable.id, docId));
  res.json({ ok: true });
});

export default router;
