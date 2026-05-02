import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vettingRequestsTable } from "./vetting_requests";

export const vettingStepsTable = pgTable("vetting_steps", {
  id: serial("id").primaryKey(),
  vettingRequestId: integer("vetting_request_id").notNull().references(() => vettingRequestsTable.id),
  stepName: text("step_name").notNull(),
  stepKey: text("step_key").notNull(),
  status: text("status").notNull().default("pending"),
  order: integer("order").notNull(),
  notes: text("notes"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertVettingStepSchema = createInsertSchema(vettingStepsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVettingStep = z.infer<typeof insertVettingStepSchema>;
export type VettingStep = typeof vettingStepsTable.$inferSelect;
