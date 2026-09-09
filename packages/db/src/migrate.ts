import postgres from "postgres";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { pgConnectOptions } from "./pg-options";

const url = process.env.DATABASE_URL ?? "postgres://guntan:guntan@localhost:5432/guntan";
const sql = postgres(url, pgConnectOptions(url, { max: 1 }));
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../drizzle");
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();
for (const file of files) {
  const ddl = readFileSync(path.join(dir, file), "utf8");
  await sql.unsafe(ddl);
  console.log("Applied", file);
}
await sql.end();
console.log("Schema applied.");
