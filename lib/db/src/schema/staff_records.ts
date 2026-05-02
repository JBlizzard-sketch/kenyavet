import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const staffRecordsTable = pgTable("staff_records", {
  id: serial("id").primaryKey(),
  employerId: integer("employer_id").notNull().references(() => usersTable.id),
  name: text("name").notNull(),
  role: text("role").notNull(),
  startDate: text("start_date").notNull(),
  phone: text("phone"),
  photoUrl: text("photo_url"),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  vettingRequestId: integer("vetting_request_id"),
  trustScore: integer("trust_score"),
  renewalDueAt: timestamp("renewal_due_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertStaffRecordSchema = createInsertSchema(staffRecordsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStaffRecord = z.infer<typeof insertStaffRecordSchema>;
export type StaffRecord = typeof staffRecordsTable.$inferSelect;
