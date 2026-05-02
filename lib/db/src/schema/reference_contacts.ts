import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vettingRequestsTable } from "./vetting_requests";

export const referenceContactsTable = pgTable("reference_contacts", {
  id: serial("id").primaryKey(),
  vettingRequestId: integer("vetting_request_id").notNull().references(() => vettingRequestsTable.id),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  relationship: text("relationship").notNull(),
  employerName: text("employer_name").notNull(),
  yearsWorked: integer("years_worked"),
  callStatus: text("call_status").notNull().default("pending"),
  callSummary: text("call_summary"),
  rehireWilling: boolean("rehire_willing"),
  overallRating: integer("overall_rating"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertReferenceContactSchema = createInsertSchema(referenceContactsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertReferenceContact = z.infer<typeof insertReferenceContactSchema>;
export type ReferenceContact = typeof referenceContactsTable.$inferSelect;
