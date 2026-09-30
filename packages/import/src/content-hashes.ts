import { and, eq, inArray } from "drizzle-orm";
import { db, products } from "@guntan/db";
import { PRODUCT_SOURCE, PRODUCT_STATUS } from "@guntan/types";

export type ExistingProduct = { id: string; contentHash: string | null; status: string };

/** externalId → mevcut ürün; değişmeyen satırları atlamak ve listeden çıkanları bulmak için. */
export async function loadExistingProducts(supplierId: string): Promise<Map<string, ExistingProduct>> {
  const rows = await db
    .select({
      id: products.id,
      externalId: products.externalId,
      contentHash: products.contentHash,
      status: products.status,
    })
    .from(products)
    .where(and(eq(products.supplierId, supplierId), eq(products.source, PRODUCT_SOURCE.XML)));
  return new Map(rows.map((r) => [r.externalId, { id: r.id, contentHash: r.contentHash, status: r.status }]));
}

/** Yeni, değişmiş ya da listeye geri dönmüş ürün yeniden işlenir. */
export function needsImport(existing: ExistingProduct | undefined, hash: string, force = false): boolean {
  return force || !existing || existing.contentHash !== hash || existing.status === PRODUCT_STATUS.MISSING_FROM_FEED;
}

/**
 * Tedarikçi listesinde artık olmayan ürünleri satıştan kaldırır.
 * Liste mevcut ürünlerin %80'inden azsa (yarım/bozuk dosya) hiçbir şey yapmaz.
 */
export async function markMissingFromFeed(
  existing: Map<string, ExistingProduct>,
  feedExternalIds: Set<string>,
  minRatio = 0.8,
): Promise<number> {
  if (existing.size > 0 && feedExternalIds.size < existing.size * minRatio) {
    console.warn(
      `Liste şüpheli küçük (${feedExternalIds.size} / mevcut ${existing.size}); listeden çıkan ürün işaretlemesi atlandı.`,
    );
    return 0;
  }
  const ids: string[] = [];
  for (const [externalId, row] of existing) {
    if (feedExternalIds.has(externalId) || row.status === PRODUCT_STATUS.MISSING_FROM_FEED) continue;
    ids.push(row.id);
  }
  for (let i = 0; i < ids.length; i += 500) {
    await db
      .update(products)
      .set({ status: PRODUCT_STATUS.MISSING_FROM_FEED })
      .where(inArray(products.id, ids.slice(i, i + 500)));
  }
  return ids.length;
}
