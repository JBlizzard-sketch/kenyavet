import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { workersTable } from "./workers";

export const workerReviewsTable = pgTable("worker_reviews", {
  id: serial("id").primaryKey(),
  workerId: integer("worker_id").notNull().references(() => workersTable.id, { onDelete: "cascade" }),
  employerId: integer("employer_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  review: text("review"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type WorkerReview = typeof workerReviewsTable.$inferSelect;
