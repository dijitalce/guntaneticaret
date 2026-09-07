/**
 * Mevcut ürün fiyatlarına kademeli marj uygular.
 *
 * Varsayılan: dry-run (yazmaz).
 * Uygulamak için: APPLY_PRICE_TIERS=1 pnpm import:price-tiers
 *
 * UYARI: İki kez çalıştırırsan marj üstüne marj biner.
 * Import (XML/Basbug) artık marjı kaynak fiyata uygular; bu script tek seferlik mevcut DB içindir.
 */
import { eq } from "drizzle-orm";
import { db, pg, products } from "@guntan/db";
import { applyMarginToPrice, marginPercentForPrice } from "./price-tiers";

const APPLY = process.env.APPLY_PRICE_TIERS === "1" || process.argv.includes("--apply");
const BATCH = Number(process.env.PRICE_TIER_BATCH || 500);

async function main() {
  console.log(APPLY ? "APPLY mode — fiyatlar güncellenecek" : "DRY-RUN — değişiklik yazılmaz (APPLY_PRICE_TIERS=1 ile uygula)");

  const bands = new Map<number, { count: number; sampleOld: number; sampleNew: number }>();
  let scanned = 0;
  let updated = 0;
  let offset = 0;

  for (;;) {
    const rows = await db
      .select({
        id: products.id,
        sku: products.sku,
        price: products.price,
      })
      .from(products)
      .orderBy(products.id)
      .limit(BATCH)
      .offset(offset);

    if (rows.length === 0) break;
    offset += rows.length;

    for (const row of rows) {
      scanned++;
      const old = Number(row.price);
      if (!Number.isFinite(old) || old < 0) continue;
      const pct = marginPercentForPrice(old);
      const next = applyMarginToPrice(old);
      const band = bands.get(pct) ?? { count: 0, sampleOld: old, sampleNew: next };
      band.count++;
      bands.set(pct, band);

      if (APPLY && next !== old) {
        await db
          .update(products)
          .set({
            price: next.toFixed(2),
            updatedAt: new Date(),
          })
          .where(eq(products.id, row.id));
        updated++;
      }
    }

    console.log(`… tarandı ${scanned}`);
  }

  console.log("\nÖzet (marj → ürün adedi, örnek):");
  for (const [pct, info] of [...bands.entries()].sort((a, b) => b[0] - a[0])) {
    console.log(
      `  %${pct}: ${info.count} ürün | örn. ${info.sampleOld.toFixed(2)} → ${info.sampleNew.toFixed(2)}`,
    );
  }
  console.log(`Toplam tarama: ${scanned}${APPLY ? `, güncellenen: ${updated}` : ""}`);
  await pg.end();
}

main().catch(async (err) => {
  console.error(err);
  await pg.end();
  process.exit(1);
});
