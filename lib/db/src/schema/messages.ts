import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { vettingRequestsTable } from "./vetting_requests";

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull().references(() => vettingRequestsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  role: text("role").notNull(), // "employer" | "ops" | "admin"
  senderName: text("sender_name").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Message = typeof messagesTable.$inferSelect;
