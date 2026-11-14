/**
 * Kategorisi olmayan etkin ürünlere ürün adından kategori atar (bkz. category-from-name.ts).
 * Varsayılan olarak yalnızca raporlar; yazmak için `--apply`. `--limit=50000` ile taranacak ürün sayısı sınırlanır.
 * Yeniden çalıştırmak güvenlidir: yalnızca hâlâ kategorisiz olan ürünlere bakar.
 */
import { sql } from "drizzle-orm";
import { db, pool, productCategories } from "@guntan/db";
import { inferCategory, type InferredCategory } from "./category-from-name";
import { resolveInferredCategory } from "./category-resolve";

const BATCH = 5000;

async function main() {
  const apply = process.argv.includes("--apply");
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;
  if (!(limit > 0)) throw new Error("--limit pozitif bir sayı olmalı.");

  const counts = new Map<string, { inferred: InferredCategory; n: number }>();
  const unmatched: string[] = [];
  let scanned = 0;
  let matched = 0;
  let cursor = "";
  while (scanned < limit) {
    const [rows] = (await db.execute(sql`select p.id, p.name from products p
      where p.id > ${cursor} and p.status = 'active'
        and not exists (select 1 from product_categories pc where pc.product_id = p.id)
      order by p.id asc limit ${Math.min(BATCH, limit - scanned)}`)) as unknown as [Array<{ id: string; name: string }>];
    if (!rows.length) break;
    cursor = rows[rows.length - 1]!.id;
    scanned += rows.length;

    const add: Array<{ productId: string; categoryId: string }> = [];
    for (const row of rows) {
      const inferred = inferCategory(row.name);
      if (!inferred) {
        if (unmatched.length < 40) unmatched.push(row.name);
        continue;
      }
      matched++;
      const hit = counts.get(inferred.slug) ?? { inferred, n: 0 };
      hit.n++;
      counts.set(inferred.slug, hit);
      if (apply) add.push({ productId: row.id, categoryId: await resolveInferredCategory(inferred) });
    }
    for (let i = 0; i < add.length; i += 1000) await db.insert(productCategories).ignore().values(add.slice(i, i + 1000));
    console.log(`${scanned} ürün tarandı, ${matched} eşleşti${apply ? " ve yazıldı" : ""}…`);
  }

  console.log("\nKategori dağılımı:");
  for (const { inferred, n } of [...counts.values()].sort((a, b) => b.n - a.n)) {
    console.log(`${String(n).padStart(8)}  ${inferred.parentName ? `${inferred.parentName} › ` : ""}${inferred.name} (${inferred.slug})`);
  }
  if (unmatched.length) console.log(`\nEşleşmeyen adlardan örnek:\n${unmatched.map((n) => `  ${n}`).join("\n")}`);
  const pct = scanned ? ((100 * matched) / scanned).toFixed(1) : "0";
  console.log(`\n${scanned} kategorisiz ürün tarandı; ${matched} tanesi (%${pct}) ${apply ? "kategoriye atandı" : "atanacak"}.`);
  if (!apply) console.log("Yazmak için: pnpm import:assign-categories --apply");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
