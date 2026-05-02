import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { vettingRequestsTable } from "./vetting_requests";

export const documentsTable = pgTable("documents", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull().references(() => vettingRequestsTable.id, { onDelete: "cascade" }),
  uploadedBy: integer("uploaded_by").notNull().references(() => usersTable.id),
  uploaderRole: text("uploader_role").notNull(), // "employer" | "ops" | "admin"
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(), // bytes
  mimeType: text("mime_type").notNull(),
  objectPath: text("object_path").notNull(), // e.g. "/objects/uploads/some-uuid"
  label: text("label"), // optional human label e.g. "ID Card Front"
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Document = typeof documentsTable.$inferSelect;
