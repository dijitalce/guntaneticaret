import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { pgConnectOptions } from "./pg-options";

const connectionString = process.env.DATABASE_URL ?? "postgres://guntan:guntan@localhost:5432/guntan";

export { pgConnectOptions };

const globalForDb = globalThis as unknown as {
  pg: ReturnType<typeof postgres> | undefined;
};

export const pg =
  globalForDb.pg ??
  postgres(connectionString, pgConnectOptions(connectionString));
// Always pin on globalThis so Next.js module duplication (or HMR) cannot open
// extra postgres pools — each pool holds real connections/file descriptors
// that Hostinger counts toward process limits.
globalForDb.pg = pg;

export const db = drizzle(pg, { schema });
export type Database = typeof db;
