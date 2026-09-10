import { randomUUID } from "node:crypto";
import { char, timestamp } from "drizzle-orm/mysql-core";

export const timestamps = {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
};

/** Client-side UUID — MySQL has no RETURNING; callers that need the id should set it explicitly or rely on $defaultFn. */
export const id = char("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID());

export function newId(): string {
  return randomUUID();
}
