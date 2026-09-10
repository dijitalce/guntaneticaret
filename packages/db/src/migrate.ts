import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { mysqlConnectOptions } from "./mysql-options";

const url = process.env.DATABASE_URL ?? "mysql://guntan:guntan@localhost:3306/guntan";
const pool = mysql.createPool({
  ...mysqlConnectOptions(url, { connectionLimit: 1 }),
  multipleStatements: true,
});

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../drizzle");
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

for (const file of files) {
  const ddl = readFileSync(path.join(dir, file), "utf8");
  // Strip drizzle statement breakpoints; run whole file (multipleStatements).
  const cleaned = ddl
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean)
    .join(";\n");
  await pool.query(cleaned);
  console.log("Applied", file);
}

await pool.end();
console.log("Schema applied.");
