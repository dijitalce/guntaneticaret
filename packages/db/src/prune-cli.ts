import { pg } from "./client";
import { pruneUnusedCatalog } from "./prune-catalog";

async function main() {
  console.log("Pruning unused catalog data…");
  if (process.env.VACUUM_FULL === "1") {
    console.log("VACUUM FULL is on — tables will lock until rewrite finishes.");
  }
  const stats = await pruneUnusedCatalog();
  console.log(stats);
  await pg.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
