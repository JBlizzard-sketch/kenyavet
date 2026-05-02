import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const activityItemsTable = pgTable("activity_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  type: text("type").notNull(),
  message: text("message").notNull(),
  workerName: text("worker_name"),
  linkId: integer("link_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertActivityItemSchema = createInsertSchema(activityItemsTable).omit({ id: true, createdAt: true });
export type InsertActivityItem = z.infer<typeof insertActivityItemSchema>;
export type ActivityItem = typeof activityItemsTable.$inferSelect;
