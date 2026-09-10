import { pool } from "./client";
import { pruneUnusedCatalog } from "./prune-catalog";

async function main() {
  console.log("Pruning unused catalog data…");
  if (process.env.VACUUM_FULL === "1") {
    console.log("OPTIMIZE TABLE (full rewrite) is on — tables may lock until finished.");
  }
  const stats = await pruneUnusedCatalog();
  console.log(stats);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
