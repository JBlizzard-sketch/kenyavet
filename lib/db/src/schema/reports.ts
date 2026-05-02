import { pgTable, serial, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vettingRequestsTable } from "./vetting_requests";

export const reportsTable = pgTable("reports", {
  id: serial("id").primaryKey(),
  vettingRequestId: integer("vetting_request_id").notNull().references(() => vettingRequestsTable.id),
  workerName: text("worker_name").notNull(),
  workerRole: text("worker_role").notNull(),
  workerPhotoUrl: text("worker_photo_url"),
  packageName: text("package_name").notNull(),
  overallTrustScore: integer("overall_trust_score").notNull(),
  scoreBreakdown: jsonb("score_breakdown").notNull(),
  summary: text("summary").notNull(),
  identityVerified: boolean("identity_verified").notNull().default(false),
  dciCertificateStatus: text("dci_certificate_status").notNull().default("pending"),
  socialMediaSummary: text("social_media_summary"),
  referencesSummary: text("references_summary"),
  addressVerified: boolean("address_verified"),
  flags: text("flags").array().notNull().default([]),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReportSchema = createInsertSchema(reportsTable).omit({ id: true, createdAt: true });
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reportsTable.$inferSelect;
