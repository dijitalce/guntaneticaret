import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "../client";
import {
  categories,
  productCategories,
  productFitments,
  products,
  tenantCatalogIndex,
  tenantVisibleBrands,
  vehicleBrands,
  vehicleModels,
} from "../schema/catalog";
import { tenantSeesAllCatalog } from "../visibility";

export type StructureCategory = { id: string; parentId: string | null; name: string; slug: string; own: number; count: number };
export type StructureModel = { name: string; slug: string; count: number };
export type StructureBrand = { name: string; slug: string; count: number; models: StructureModel[] };
export type SiteStructure = {
  seesAll: boolean;
  products: number;
  categories: StructureCategory[];
  brands: StructureBrand[];
  generatedAt: string;
};

/** Google sınırı 50.000 adres / 50 MB; ürün adresleri uzun olduğu için pay bırakılır. */
// 40 bin satırlık dosya üretimi süreci bellek tavanına (hostinger-start 400MB) taşıyordu.
export const SITEMAP_PRODUCTS_PER_FILE = 10_000;

/** Vitrinde ana sayfa dışındaki sabit sayfalar (site haritası ve HTML harita). */
export const SITEMAP_STATIC_PAGES = [
  { path: "/sayfa/hakkimizda", label: "Hakkımızda" },
  { path: "/iletisim", label: "İletişim" },
  { path: "/sayfa/iade", label: "İade ve değişim" },
  { path: "/sayfa/mesafeli-satis", label: "Mesafeli satış sözleşmesi" },
  { path: "/sayfa/gizlilik", label: "Gizlilik" },
  { path: "/site-haritasi", label: "Site haritası" },
] as const;

export function sitemapFileNames(productCount: number) {
  const parts = Math.max(1, Math.ceil(productCount / SITEMAP_PRODUCTS_PER_FILE));
  return ["sayfalar.xml", "kategoriler.xml", "markalar.xml", ...Array.from({ length: parts }, (_, i) => `urunler-${i + 1}.xml`)];
}

const TTL_MS = 30 * 60_000;

export type CatalogHealth = {
  active: number;
  inStock: number;
  noImage: number;
  noDescription: number;
  noCategory: number;
  noFitment: number;
  noManufacturer: number;
  generatedAt: string;
};

let healthMem: { exp: number; value: Promise<CatalogHealth> } | null = null;

/** Aktif ürünlerde arama görünürlüğünü etkileyen eksikler (tüm katalog, 30 dk önbellek). */
export function catalogHealth(): Promise<CatalogHealth> {
  if (healthMem && healthMem.exp > Date.now()) return healthMem.value;
  const value = db
    .select({
      active: sql<number>`count(*)`,
      inStock: sql<number>`sum(${products.stockStatus} = 'in_stock')`,
      noImage: sql<number>`sum(not exists (select 1 from product_images pi where pi.product_id = products.id))`,
      noDescription: sql<number>`sum(${products.description} is null or trim(${products.description}) = '')`,
      noCategory: sql<number>`sum(not exists (select 1 from product_categories pc where pc.product_id = products.id))`,
      noFitment: sql<number>`sum(not exists (select 1 from product_fitments pf where pf.product_id = products.id))`,
      noManufacturer: sql<number>`sum(${products.manufacturerId} is null)`,
    })
    .from(products)
    .where(eq(products.status, "active"))
    .then(([r]) => ({
      active: Number(r?.active ?? 0),
      inStock: Number(r?.inStock ?? 0),
      noImage: Number(r?.noImage ?? 0),
      noDescription: Number(r?.noDescription ?? 0),
      noCategory: Number(r?.noCategory ?? 0),
      noFitment: Number(r?.noFitment ?? 0),
      noManufacturer: Number(r?.noManufacturer ?? 0),
      generatedAt: new Date().toISOString(),
    }))
    .catch((err) => {
      healthMem = null;
      throw err;
    });
  healthMem = { exp: Date.now() + TTL_MS, value };
  return value;
}

const mem = new Map<string, { exp: number; value: Promise<SiteStructure> }>();

/** Vitrinde ürünü olan kategori, marka ve modeller (site haritası ve HTML harita için). */
export function siteStructure(tenantId: string): Promise<SiteStructure> {
  const hit = mem.get(tenantId);
  if (hit && hit.exp > Date.now()) return hit.value;
  const value = buildStructure(tenantId).catch((err) => {
    mem.delete(tenantId);
    throw err;
  });
  mem.set(tenantId, { exp: Date.now() + TTL_MS, value });
  return value;
}

async function buildStructure(tenantId: string): Promise<SiteStructure> {
  const seesAll = await tenantSeesAllCatalog(tenantId);
  const visible = seesAll
    ? sql`true`
    : sql`exists (select 1 from tenant_catalog_index tci where tci.product_id = products.id and tci.tenant_id = ${tenantId})`;

  const [productRow, catRows, catCounts, brandRows, modelRows, modelCounts] = await Promise.all([
    seesAll
      ? db.select({ n: sql<number>`count(*)` }).from(products).where(eq(products.status, "active"))
      : db
          .select({ n: sql<number>`count(*)` })
          .from(products)
          .innerJoin(tenantCatalogIndex, eq(tenantCatalogIndex.productId, products.id))
          .where(and(eq(tenantCatalogIndex.tenantId, tenantId), eq(products.status, "active"))),
    db
      .select({ id: categories.id, parentId: categories.parentId, name: categories.name, slug: categories.slug })
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.sortOrder), asc(categories.name)),
    db
      .select({ id: productCategories.categoryId, n: sql<number>`count(*)` })
      .from(productCategories)
      .innerJoin(products, eq(products.id, productCategories.productId))
      .where(and(eq(products.status, "active"), visible))
      .groupBy(productCategories.categoryId),
    db
      .select({ id: vehicleBrands.id, name: vehicleBrands.name, slug: vehicleBrands.slug })
      .from(tenantVisibleBrands)
      .innerJoin(vehicleBrands, eq(tenantVisibleBrands.brandId, vehicleBrands.id))
      .where(and(eq(tenantVisibleBrands.tenantId, tenantId), eq(vehicleBrands.isActive, true)))
      .orderBy(asc(vehicleBrands.sortOrder), asc(vehicleBrands.name)),
    db
      .select({ id: vehicleModels.id, brandId: vehicleModels.brandId, name: vehicleModels.name, slug: vehicleModels.slug })
      .from(vehicleModels)
      .where(eq(vehicleModels.isActive, true))
      .orderBy(asc(vehicleModels.sortOrder), asc(vehicleModels.name)),
    db
      .select({ id: productFitments.vehicleModelId, n: sql<number>`count(distinct ${productFitments.productId})` })
      .from(productFitments)
      .innerJoin(products, eq(products.id, productFitments.productId))
      .where(and(eq(products.status, "active"), visible))
      .groupBy(productFitments.vehicleModelId),
  ]);

  const ownBy = new Map(catCounts.map((c) => [c.id, Number(c.n)]));
  const cats: StructureCategory[] = catRows.map((c) => ({ ...c, own: ownBy.get(c.id) ?? 0, count: ownBy.get(c.id) ?? 0 }));
  const byId = new Map(cats.map((c) => [c.id, c]));
  for (const c of cats) {
    const seen = new Set<string>([c.id]);
    let parent = c.parentId ? byId.get(c.parentId) : undefined;
    while (parent && !seen.has(parent.id) && c.own > 0) {
      parent.count += c.own;
      seen.add(parent.id);
      parent = parent.parentId ? byId.get(parent.parentId) : undefined;
    }
  }

  const modelCountBy = new Map(modelCounts.map((m) => [m.id, Number(m.n)]));
  const brands = brandRows.map((b) => {
    const models = modelRows
      .filter((m) => m.brandId === b.id)
      .map((m) => ({ name: m.name, slug: m.slug, count: modelCountBy.get(m.id) ?? 0 }));
    return { name: b.name, slug: b.slug, count: models.reduce((s, m) => s + m.count, 0), models };
  });

  return {
    seesAll,
    products: Number(productRow[0]?.n ?? 0),
    categories: cats,
    brands,
    generatedAt: new Date().toISOString(),
  };
}
