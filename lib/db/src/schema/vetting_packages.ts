import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const vettingPackagesTable = pgTable("vetting_packages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  priceKsh: integer("price_ksh").notNull(),
  description: text("description").notNull(),
  features: text("features").array().notNull().default([]),
  turnaroundHours: integer("turnaround_hours").notNull(),
  popular: boolean("popular").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertVettingPackageSchema = createInsertSchema(vettingPackagesTable).omit({ id: true, createdAt: true });
export type InsertVettingPackage = z.infer<typeof insertVettingPackageSchema>;
export type VettingPackage = typeof vettingPackagesTable.$inferSelect;
