import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";
import { mysqlConnectOptions } from "./mysql-options";

const connectionString =
  process.env.DATABASE_URL ?? "mysql://guntan:guntan@localhost:3306/guntan";

export { mysqlConnectOptions };

const globalForDb = globalThis as unknown as {
  pool: mysql.Pool | undefined;
};

export const pool =
  globalForDb.pool ??
  mysql.createPool(mysqlConnectOptions(connectionString));
// Always pin on globalThis so Next.js module duplication (or HMR) cannot open
// extra pools — each pool holds real connections that Hostinger counts toward
// process/connection limits.
globalForDb.pool = pool;

/** @deprecated Use `pool` — kept so CLI scripts that still import `pg` keep working. */
export const pg = pool;

export const db = drizzle(pool, { schema, mode: "default" });
export type Database = typeof db;
