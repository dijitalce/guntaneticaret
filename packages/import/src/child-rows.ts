import { and, eq, inArray } from "drizzle-orm";
import { db, productCategories, productFitments, productOems } from "@guntan/db";

/*
 * Ürünün OEM / kategori / araç uyumluluğu satırlarını yalnızca farkı yazarak günceller.
 *
 * Önceden içe aktarmalar "değişen" her ürünün bu satırlarını silip yeni rastgele id'lerle yeniden
 * ekliyordu. Fiyat/stok değişimi de ürünü değişmiş saydığı için her senkronda yüz binlerce satır
 * silinip yazılıyor; rastgele UUID'li indeksler parçalanıp veritabanı günde 1-2 GB şişiyor ve
 * barındırma kotasını aşıyordu. Artık yalnızca gerçekten eklenen veya kalkan satırlara dokunulur.
 */

export type OemRow = { productId: string; raw: string; normalized: string };
export type CatRow = { productId: string; categoryId: string };
export type FitRow = {
  productId: string;
  vehicleBrandId: string;
  vehicleModelId: string;
  vehicleGenerationId?: string | null;
  vehicleEngineId?: string | null;
};

const CHUNK = 1000;

function chunks<T>(list: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

const fitKey = (f: FitRow) => `${f.productId}|${f.vehicleModelId}|${f.vehicleGenerationId ?? ""}|${f.vehicleEngineId ?? ""}`;

/**
 * `productIds` için verilen kümeleri olması gereken hâl kabul eder. Verilmeyen küme (undefined)
 * olduğu gibi bırakılır; boş dizi o ürünlerin tüm satırlarını kaldırır.
 */
export async function syncProductChildren(
  productIds: string[],
  want: { oems?: OemRow[]; cats?: CatRow[]; fits?: FitRow[] },
): Promise<{ inserted: number; deleted: number }> {
  let inserted = 0;
  let deleted = 0;
  if (productIds.length === 0) return { inserted, deleted };

  if (want.oems) {
    const existing = new Map<string, string>();
    for (const ids of chunks(productIds)) {
      const rows = await db
        .select({ id: productOems.id, productId: productOems.productId, normalized: productOems.normalized })
        .from(productOems)
        .where(inArray(productOems.productId, ids));
      for (const r of rows) existing.set(`${r.productId}|${r.normalized}`, r.id);
    }
    const wanted = new Map<string, OemRow>();
    for (const o of want.oems) if (o.normalized) wanted.set(`${o.productId}|${o.normalized}`, o);
    const remove = [...existing].filter(([k]) => !wanted.has(k)).map(([, id]) => id);
    const add = [...wanted].filter(([k]) => !existing.has(k)).map(([, o]) => o);
    for (const ids of chunks(remove)) await db.delete(productOems).where(inArray(productOems.id, ids));
    for (const rows of chunks(add)) await db.insert(productOems).ignore().values(rows);
    inserted += add.length;
    deleted += remove.length;
  }

  if (want.cats) {
    const existing = new Set<string>();
    for (const ids of chunks(productIds)) {
      const rows = await db
        .select({ productId: productCategories.productId, categoryId: productCategories.categoryId })
        .from(productCategories)
        .where(inArray(productCategories.productId, ids));
      for (const r of rows) existing.add(`${r.productId}|${r.categoryId}`);
    }
    const wanted = new Map<string, CatRow>();
    for (const c of want.cats) wanted.set(`${c.productId}|${c.categoryId}`, c);
    const remove = [...existing].filter((k) => !wanted.has(k));
    const add = [...wanted].filter(([k]) => !existing.has(k)).map(([, c]) => c);
    // Bileşik anahtar: ürün başına gruplanıp silinir (genelde ürün başına bir kategori).
    const byProduct = new Map<string, string[]>();
    for (const k of remove) {
      const [productId, categoryId] = k.split("|") as [string, string];
      byProduct.set(productId, [...(byProduct.get(productId) ?? []), categoryId]);
    }
    for (const [productId, categoryIds] of byProduct) {
      await db
        .delete(productCategories)
        .where(and(eq(productCategories.productId, productId), inArray(productCategories.categoryId, categoryIds)));
    }
    for (const rows of chunks(add)) await db.insert(productCategories).ignore().values(rows);
    inserted += add.length;
    deleted += remove.length;
  }

  if (want.fits) {
    const existing = new Map<string, string>();
    for (const ids of chunks(productIds)) {
      const rows = await db
        .select({
          id: productFitments.id,
          productId: productFitments.productId,
          vehicleBrandId: productFitments.vehicleBrandId,
          vehicleModelId: productFitments.vehicleModelId,
          vehicleGenerationId: productFitments.vehicleGenerationId,
          vehicleEngineId: productFitments.vehicleEngineId,
        })
        .from(productFitments)
        .where(inArray(productFitments.productId, ids));
      for (const r of rows) existing.set(fitKey(r), r.id);
    }
    const wanted = new Map<string, FitRow>();
    for (const f of want.fits) wanted.set(fitKey(f), f);
    const remove = [...existing].filter(([k]) => !wanted.has(k)).map(([, id]) => id);
    const add = [...wanted].filter(([k]) => !existing.has(k)).map(([, f]) => f);
    for (const ids of chunks(remove)) await db.delete(productFitments).where(inArray(productFitments.id, ids));
    for (const rows of chunks(add)) await db.insert(productFitments).ignore().values(rows);
    inserted += add.length;
    deleted += remove.length;
  }

  return { inserted, deleted };
}
