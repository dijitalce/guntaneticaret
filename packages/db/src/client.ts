import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import dns from "node:dns";
import * as schema from "./schema";
import { isProductionBuild, mysqlConnectOptions, resolveMysqlUrl } from "./mysql-options";

// Hostinger Remote MySQL often allowlists IPv4 only; Node otherwise prefers IPv6.
dns.setDefaultResultOrder("ipv4first");

const connectionString =
  process.env.DATABASE_URL ?? "mysql://guntan:guntan@localhost:3306/guntan";

export { mysqlConnectOptions, resolveMysqlUrl };

type Schema = typeof schema;

const globalForDb = globalThis as unknown as {
  pool: mysql.Pool | undefined;
  db: MySql2Database<Schema> | undefined;
};

/** During `next build`, never open a real MySQL connection (Hostinger page-data collection). */
function buildTimePool(): mysql.Pool {
  const empty = async () => [[], []];
  return {
    query: empty,
    execute: empty,
    getConnection: async () => ({
      query: empty,
      execute: empty,
      release: () => {},
      beginTransaction: async () => {},
      commit: async () => {},
      rollback: async () => {},
      ping: async () => {},
    }),
    end: async () => {},
    on: () => {},
    pool: { on: () => {} },
  } as unknown as mysql.Pool;
}

function createPool(): mysql.Pool {
  if (isProductionBuild() || process.env.GUNTAN_NEXT_BUILD === "1") {
    console.warn("[db] next build — using in-memory stub pool (no MySQL connection)");
    return buildTimePool();
  }
  return mysql.createPool(mysqlConnectOptions(connectionString));
}

export const pool = globalForDb.pool ?? createPool();
globalForDb.pool = pool;

/** @deprecated Use `pool` */
export const pg = pool;

export const db =
  globalForDb.db ?? drizzle(pool, { schema, mode: "default" });
globalForDb.db = db;

export type Database = typeof db;
