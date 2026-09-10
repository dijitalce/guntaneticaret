import {
  char,
  index,
  int,
  json,
  mysqlTable,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { id, timestamps } from "./common";
import { suppliers } from "./catalog";

export const xmlFeeds = mysqlTable("xml_feeds", {
  id,
  supplierId: char("supplier_id", { length: 36 }).notNull().references(() => suppliers.id),
  name: varchar("name", { length: 255 }).notNull(),
  url: text("url"),
  filePath: text("file_path"),
  mapping: json("mapping").$type<Record<string, string>>().notNull().default({}),
  scheduleCron: varchar("schedule_cron", { length: 64 }),
  isActive: int("is_active").notNull().default(1),
  ...timestamps,
}, (t) => [
  uniqueIndex("xml_feeds_name_uidx").on(t.name),
]);

export const xmlImportRuns = mysqlTable("xml_import_runs", {
  id,
  feedId: char("feed_id", { length: 36 }).notNull().references(() => xmlFeeds.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 32 }).notNull().default("queued"),
  startedAt: varchar("started_at", { length: 64 }),
  finishedAt: varchar("finished_at", { length: 64 }),
  total: int("total").notNull().default(0),
  createdCount: int("created_count").notNull().default(0),
  updatedCount: int("updated_count").notNull().default(0),
  unchangedCount: int("unchanged_count").notNull().default(0),
  failedCount: int("failed_count").notNull().default(0),
  inactivatedCount: int("inactivated_count").notNull().default(0),
  errorMessage: text("error_message"),
  ...timestamps,
}, (t) => [
  index("xml_import_runs_feed_idx").on(t.feedId),
]);

export const xmlImportRowErrors = mysqlTable("xml_import_row_errors", {
  id,
  runId: char("run_id", { length: 36 }).notNull().references(() => xmlImportRuns.id, { onDelete: "cascade" }),
  rowNo: int("row_no"),
  externalId: varchar("external_id", { length: 191 }),
  message: text("message").notNull(),
  payload: json("payload"),
  ...timestamps,
}, (t) => [
  index("xml_import_row_errors_run_idx").on(t.runId),
]);
