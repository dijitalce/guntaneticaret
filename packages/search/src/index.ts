import { MeiliSearch } from "meilisearch";
import { eq, inArray } from "drizzle-orm";
import {
  db,
  listAllVisibilityTenantIds,
  manufacturers,
  productFitments,
  productImages,
  productOems,
  products,
  tenantCatalogIndex,
  vehicleBrands,
  vehicleModels,
  categories,
  productCategories,
} from "@guntan/db";

const INDEX = "products";

function meiliConfigured() {
  const host = process.env.MEILI_HOST ?? "";
  if (!host) return false;
  if (process.env.NODE_ENV === "production" && /localhost|127\.0\.0\.1/.test(host)) return false;
  return true;
}

export function getMeili() {
  const g = globalThis as unknown as { __guntanMeili?: MeiliSearch };
  if (!g.__guntanMeili) {
    g.__guntanMeili = new MeiliSearch({
      host: process.env.MEILI_HOST ?? "http://localhost:7700",
      apiKey: process.env.MEILI_MASTER_KEY ?? "dev_meili_master_key_change_me",
      timeout: 800,
    });
  }
  return g.__guntanMeili;
}

export async function ensureIndex() {
  const client = getMeili();
  try {
    await client.getIndex(INDEX);
  } catch {
    await client.createIndex(INDEX, { primaryKey: "id" });
  }
  const index = client.index(INDEX);
  await index.updateSettings({
    searchableAttributes: ["title", "sku", "oems", "barcode", "manufacturer", "vehicleBrands", "vehicleModels", "categories"],
    filterableAttributes: ["tenant_ids", "in_stock", "price"],
    rankingRules: ["words", "typo", "proximity", "attribute", "sort", "exactness"],
    typoTolerance: { disableOnAttributes: ["sku", "oems", "barcode"] },
  });
}

export async function reindexAll() {
  await ensureIndex();
  const all = await db.select().from(products).where(eq(products.status, "active"));
  if (all.length === 0) return;
  const ids = all.map((p) => p.id);
  const oems = await db.select().from(productOems).where(inArray(productOems.productId, ids));
  const fits = await db
    .select({
      productId: productFitments.productId,
      brand: vehicleBrands.name,
      model: vehicleModels.name,
    })
    .from(productFitments)
    .innerJoin(vehicleBrands, eq(productFitments.vehicleBrandId, vehicleBrands.id))
    .innerJoin(vehicleModels, eq(productFitments.vehicleModelId, vehicleModels.id));
  const vis = await db.select().from(tenantCatalogIndex);
  const allTenantIds = await listAllVisibilityTenantIds();
  const cats = await db
    .select({ productId: productCategories.productId, name: categories.name })
    .from(productCategories)
    .innerJoin(categories, eq(productCategories.categoryId, categories.id));
  const mfrs = await db.select().from(manufacturers);
  const images = await db
    .select({ productId: productImages.productId, url: productImages.url, sortOrder: productImages.sortOrder })
    .from(productImages)
    .where(inArray(productImages.productId, ids));

  const oemBy = new Map<string, string[]>();
  for (const o of oems) {
    const arr = oemBy.get(o.productId) ?? [];
    arr.push(o.raw, o.normalized);
    oemBy.set(o.productId, arr);
  }
  const brandBy = new Map<string, Set<string>>();
  const modelBy = new Map<string, Set<string>>();
  for (const f of fits) {
    (brandBy.get(f.productId) ?? brandBy.set(f.productId, new Set()).get(f.productId)!).add(f.brand);
    (modelBy.get(f.productId) ?? modelBy.set(f.productId, new Set()).get(f.productId)!).add(f.model);
  }
  const tenantBy = new Map<string, string[]>();
  for (const v of vis) {
    const arr = tenantBy.get(v.productId) ?? [];
    arr.push(v.tenantId);
    tenantBy.set(v.productId, arr);
  }
  const catBy = new Map<string, string[]>();
  for (const c of cats) {
    const arr = catBy.get(c.productId) ?? [];
    arr.push(c.name);
    catBy.set(c.productId, arr);
  }
  const thumbBy = new Map<string, string>();
  for (const img of images.sort((a, b) => a.sortOrder - b.sortOrder)) {
    if (!thumbBy.has(img.productId)) thumbBy.set(img.productId, img.url);
  }
  const mfrName = Object.fromEntries(mfrs.map((m) => [m.id, m.name]));

  const docs = all.map((p) => ({
    id: p.id,
    title: p.name,
    sku: p.sku,
    oems: oemBy.get(p.id) ?? [],
    barcode: p.barcode ?? "",
    manufacturer: p.manufacturerId ? mfrName[p.manufacturerId] ?? "" : "",
    vehicleBrands: [...(brandBy.get(p.id) ?? [])],
    vehicleModels: [...(modelBy.get(p.id) ?? [])],
    categories: catBy.get(p.id) ?? [],
    price: Number(p.price),
    in_stock: p.stockStatus === "in_stock",
    slug: p.slug,
    thumbnail: thumbBy.get(p.id) ?? "",
    tenant_ids: [...new Set([...(tenantBy.get(p.id) ?? []), ...allTenantIds])],
  }));

  await getMeili().index(INDEX).addDocuments(docs, { primaryKey: "id" });
}

export async function searchProducts(tenantId: string, q: string, limit = 8) {
  if (!meiliConfigured()) return [];
  const res = await getMeili().index(INDEX).search(q, {
    filter: `tenant_ids = "${tenantId}"`,
    limit,
  });
  return res.hits as Array<{
    id: string;
    title: string;
    slug: string;
    sku: string;
    manufacturer: string;
    price?: number;
    thumbnail?: string;
  }>;
}
