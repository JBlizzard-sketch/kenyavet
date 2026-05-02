import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const workersTable = pgTable("workers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  trustScore: integer("trust_score").notNull(),
  photoUrl: text("photo_url"),
  neighbourhood: text("neighbourhood"),
  yearsExperience: integer("years_experience"),
  languages: text("languages").array().notNull().default([]),
  badges: text("badges").array().notNull().default([]),
  qrCode: text("qr_code").notNull().unique(),
  vetCount: integer("vet_count").notNull().default(1),
  verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertWorkerSchema = createInsertSchema(workersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWorker = z.infer<typeof insertWorkerSchema>;
export type Worker = typeof workersTable.$inferSelect;
