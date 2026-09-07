import { runDedupeCheapest } from "./dedupe-cheapest";
import { pg } from "@guntan/db";

async function main() {
  console.log("Running OE+brand cheapest dedupe…");
  const result = await runDedupeCheapest({ compile: true });
  console.log(result);
  await pg.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
