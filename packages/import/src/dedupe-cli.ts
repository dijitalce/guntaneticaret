import { runDedupeCheapest } from "./dedupe-cheapest";
import { pg, pruneUnusedCatalog } from "@guntan/db";

async function main() {
  console.log("Running OE+brand cheapest dedupe…");
  const result = await runDedupeCheapest({ compile: true });
  console.log(result);
  console.log("Pruning unused catalog rows…");
  console.log(await pruneUnusedCatalog());
  await pg.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
