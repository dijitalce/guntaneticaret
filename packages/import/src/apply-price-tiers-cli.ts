/**
 * Mevcut ürünlerde kademeli marj.
 *
 * Varsayılan: dry-run.
 * APPLY_PRICE_TIERS=1 pnpm import:price-tiers
 *   → satış zaten marjlı kabul edilir; sadece liste (compare_at) aynı yüzdeyle güncellenir.
 *
 * APPLY_PRICE_TIERS=1 pnpm import:price-tiers --from-cost
 *   → price ve compare_at tedarikçi maliyeti/listesi gibi işlenir (marj henüz yoksa).
 *
 * UYARI: --from-cost iki kez çalışırsa marj üstüne marj biner.
 */
import { eq } from "drizzle-orm";
import { db, pool, products } from "@guntan/db";
import {
  applyMarginToAmount,
  applyMarginToPrice,
  applyPercent,
  marginPercentForPrice,
  percentConsistentWithSale,
} from "./price-tiers";

const APPLY = process.env.APPLY_PRICE_TIERS === "1" || process.argv.includes("--apply");
const FROM_COST = process.argv.includes("--from-cost") || process.env.PRICE_TIERS_FROM_COST === "1";
const BATCH = Number(process.env.PRICE_TIER_BATCH || 500);

async function main() {
  console.log(APPLY ? "APPLY mode — fiyatlar güncellenecek" : "DRY-RUN — değişiklik yazılmaz (APPLY_PRICE_TIERS=1 ile uygula)");
  console.log(FROM_COST ? "Kaynak: tedarikçi maliyeti (--from-cost)" : "Kaynak: satış zaten marjlı; liste fiyatına aynı yüzde");

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
        compareAtPrice: products.compareAtPrice,
      })
      .from(products)
      .orderBy(products.id)
      .limit(BATCH)
      .offset(offset);

    if (rows.length === 0) break;
    offset += rows.length;

    for (const row of rows) {
      scanned++;
      const oldSale = Number(row.price);
      if (!Number.isFinite(oldSale) || oldSale < 0) continue;

      let nextSale = oldSale;
      let pct: number;
      if (FROM_COST) {
        pct = marginPercentForPrice(oldSale);
        nextSale = applyMarginToPrice(oldSale);
      } else {
        pct = percentConsistentWithSale(oldSale);
      }

      const oldList = row.compareAtPrice != null && row.compareAtPrice !== "" ? Number(row.compareAtPrice) : Number.NaN;
      let nextList: string | null = row.compareAtPrice;
      if (Number.isFinite(oldList) && oldList > 0) {
        const markedList = FROM_COST ? applyMarginToAmount(oldSale, oldList) : applyPercent(oldList, pct);
        nextList = markedList > nextSale ? markedList.toFixed(2) : null;
      }

      const band = bands.get(pct) ?? { count: 0, sampleOld: oldSale, sampleNew: nextSale };
      band.count++;
      bands.set(pct, band);

      const saleChanged = nextSale !== oldSale;
      const listChanged = (nextList ?? null) !== (row.compareAtPrice ?? null);
      if (APPLY && (saleChanged || listChanged)) {
        await db
          .update(products)
          .set({
            price: nextSale.toFixed(2),
            compareAtPrice: nextList,
            updatedAt: new Date(),
          })
          .where(eq(products.id, row.id));
        updated++;
      }
    }

    console.log(`… tarandı ${scanned}`);
  }

  console.log("\nÖzet (marj → ürün adedi, örnek satış):");
  for (const [pct, info] of [...bands.entries()].sort((a, b) => b[0] - a[0])) {
    console.log(
      `  %${pct}: ${info.count} ürün | örn. ${info.sampleOld.toFixed(2)} → ${info.sampleNew.toFixed(2)}`,
    );
  }
  console.log(`Toplam tarama: ${scanned}${APPLY ? `, güncellenen: ${updated}` : ""}`);
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
