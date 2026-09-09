import { compileVisibility } from "./compile-visibility";
import { db, pg } from "./client";

async function main() {
  console.log("Compiling tenant visibility…");
  await compileVisibility(db);
  console.log("Done.");
  await pg.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
