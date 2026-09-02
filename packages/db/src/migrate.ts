import postgres from "postgres";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const url = process.env.DATABASE_URL ?? "postgres://guntan:guntan@localhost:5432/guntan";
const sql = postgres(url, { max: 1 });
const file = path.join(path.dirname(fileURLToPath(import.meta.url)), "../drizzle/0000_init.sql");
const ddl = readFileSync(file, "utf8");
await sql.unsafe(ddl);
await sql.end();
console.log("Schema applied.");
