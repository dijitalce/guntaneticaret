import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL ?? "postgres://guntan:guntan@localhost:5432/guntan";
const isLocalDb = /localhost|127\.0\.0\.1/.test(connectionString);

const globalForDb = globalThis as unknown as {
  pg: ReturnType<typeof postgres> | undefined;
};

export const pg =
  globalForDb.pg ??
  postgres(connectionString, {
    max: isLocalDb ? 10 : 3,
    ssl: isLocalDb ? undefined : "require",
    // Supabase's transaction pooler (pgbouncer) doesn't support session-level
    // prepared statements across its multiplexed connections.
    prepare: isLocalDb,
  });
if (process.env.NODE_ENV !== "production") {
  globalForDb.pg = pg;
}

export const db = drizzle(pg, { schema });
export type Database = typeof db;
