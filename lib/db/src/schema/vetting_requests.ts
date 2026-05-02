import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { vettingPackagesTable } from "./vetting_packages";

export const vettingRequestsTable = pgTable("vetting_requests", {
  id: serial("id").primaryKey(),
  employerId: integer("employer_id").notNull().references(() => usersTable.id),
  workerName: text("worker_name").notNull(),
  workerPhone: text("worker_phone").notNull(),
  workerIdNumber: text("worker_id_number").notNull(),
  workerRole: text("worker_role").notNull(),
  workerPhotoUrl: text("worker_photo_url"),
  workerAddress: text("worker_address"),
  packageId: integer("package_id").notNull().references(() => vettingPackagesTable.id),
  status: text("status").notNull().default("pending_payment"),
  trustScore: integer("trust_score"),
  reportId: integer("report_id"),
  notes: text("notes"),
  adminNotes: text("admin_notes"),
  mpesaRef: text("mpesa_ref"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertVettingRequestSchema = createInsertSchema(vettingRequestsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVettingRequest = z.infer<typeof insertVettingRequestSchema>;
export type VettingRequest = typeof vettingRequestsTable.$inferSelect;
