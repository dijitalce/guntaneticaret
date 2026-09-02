import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { id, timestamps } from "./common";
import { suppliers } from "./catalog";

export const xmlFeeds = pgTable("xml_feeds", {
  id,
  supplierId: uuid("supplier_id").notNull().references(() => suppliers.id),
  name: text("name").notNull(),
  url: text("url"),
  filePath: text("file_path"),
  mapping: jsonb("mapping").$type<Record<string, string>>().notNull().default({}),
  scheduleCron: text("schedule_cron"),
  isActive: integer("is_active").notNull().default(1),
  ...timestamps,
}, (t) => [
  uniqueIndex("xml_feeds_name_uidx").on(t.name),
]);

export const xmlImportRuns = pgTable("xml_import_runs", {
  id,
  feedId: uuid("feed_id").notNull().references(() => xmlFeeds.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("queued"),
  startedAt: text("started_at"),
  finishedAt: text("finished_at"),
  total: integer("total").notNull().default(0),
  createdCount: integer("created_count").notNull().default(0),
  updatedCount: integer("updated_count").notNull().default(0),
  unchangedCount: integer("unchanged_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  inactivatedCount: integer("inactivated_count").notNull().default(0),
  errorMessage: text("error_message"),
  ...timestamps,
}, (t) => [
  index("xml_import_runs_feed_idx").on(t.feedId),
]);

export const xmlImportRowErrors = pgTable("xml_import_row_errors", {
  id,
  runId: uuid("run_id").notNull().references(() => xmlImportRuns.id, { onDelete: "cascade" }),
  rowNo: integer("row_no"),
  externalId: text("external_id"),
  message: text("message").notNull(),
  payload: jsonb("payload"),
  ...timestamps,
}, (t) => [
  index("xml_import_row_errors_run_idx").on(t.runId),
]);
