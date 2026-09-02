import { createReadStream } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { and, eq, inArray, sql } from "drizzle-orm";
import {
  categories,
  compileVisibility,
  db,
  manufacturers,
  pg,
  productCategories,
  productFitments,
  productOems,
  products,
  suppliers,
  vehicleBrands,
  vehicleModels,
  xmlFeeds,
  xmlImportRuns,
} from "@guntan/db";
import { IMPORT_RUN_STATUS, PRODUCT_SOURCE, PRODUCT_STATUS } from "@guntan/types";
import { contentHash, mapRaw, normalizeOem, parseProductXml } from "./index";
import { inferFitments } from "./fitment-from-name";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const MAPPING = {
  externalId: "Id",
  sku: "Code",
  name: "Name",
  manufacturer: "Manufacturer",
  oem: "ManufacturerCode",
  category: "ProductGroup1",
  price: "Price",
  compareAtPrice: "ListPrice",
  stock: "Availability",
  imageUrl: "PicturePath",
};

const PARENT_SORT: Record<string, number> = {
  "FREN AKSAMI": 1,
  MOTOR: 2,
  "ALT TAKIM": 3,
  ELEKTRIK: 4,
  FILTRE: 5,
  KAPORTA: 6,
  AYDINLATMA: 7,
  KAUCUK: 8,
};

async function upsertNamed<T extends { id: string; slug: string }>(
  table: typeof vehicleBrands,
  cache: Map<string, T>,
  name: string,
  extra: Record<string, unknown> = {},
): Promise<T> {
  const slug = slugify(name);
  const hit = cache.get(slug);
  if (hit) return hit;
  const [existing] = await db.select().from(table).where(eq(table.slug, slug)).limit(1);
  if (existing) {
    cache.set(slug, existing as T);
    return existing as T;
  }
  const [row] = await db.insert(table).values({ name, slug, ...extra } as never).returning();
  cache.set(slug, row as T);
  return row as T;
}

async function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
  const filePath = join(root, "products.xml");
  console.log("Parsing", filePath);
  const rawItems = await parseProductXml(createReadStream(filePath));
  const mappedAll = rawItems.map((raw) => mapRaw(raw, MAPPING)).filter((x): x is NonNullable<typeof x> => x !== null);
  const byExternal = new Map<string, (typeof mappedAll)[number]>();
  for (const row of mappedAll) byExternal.set(row.externalId, row);
  const mapped = [...byExternal.values()];
  console.log(`Parsed ${rawItems.length} items, mapped ${mappedAll.length}, unique ${mapped.length}`);

  const [supplier] = await db.select().from(suppliers).where(eq(suppliers.code, "DEMO")).limit(1);
  if (!supplier) throw new Error("DEMO tedarikçi yok. Önce seed çalıştır.");

  const existingFeed = await db.select().from(xmlFeeds).where(eq(xmlFeeds.name, "Güntan ürün XML")).limit(1);
  let feedId = existingFeed[0]?.id;
  if (!feedId) {
    const [feed] = await db.insert(xmlFeeds).values({
      supplierId: supplier.id,
      name: "Güntan ürün XML",
      filePath,
      mapping: MAPPING,
    }).returning();
    feedId = feed!.id;
  } else {
    await db.update(xmlFeeds).set({ filePath, mapping: MAPPING }).where(eq(xmlFeeds.id, feedId));
  }

  const [run] = await db.insert(xmlImportRuns).values({
    feedId,
    status: IMPORT_RUN_STATUS.RUNNING,
    startedAt: new Date().toISOString(),
    total: mapped.length,
  }).returning();

  const brandCache = new Map<string, typeof vehicleBrands.$inferSelect>();
  for (const b of await db.select().from(vehicleBrands)) brandCache.set(b.slug, b);
  const modelCache = new Map<string, { id: string; brandId: string; slug: string }>();
  for (const m of await db.select().from(vehicleModels)) modelCache.set(`${m.brandId}:${m.slug}`, m);

  const mfrCache = new Map<string, { id: string; slug: string }>();
  for (const m of await db.select({ id: manufacturers.id, slug: manufacturers.slug }).from(manufacturers)) mfrCache.set(m.slug, m);
  const catCache = new Map<string, { id: string; slug: string }>();
  for (const c of await db.select().from(categories)) catCache.set(c.path, c);

  async function ensureBrand(name: string) {
    return upsertNamed(vehicleBrands, brandCache, name);
  }
  async function ensureModel(brandId: string, name: string) {
    const slug = slugify(name);
    const key = `${brandId}:${slug}`;
    const hit = modelCache.get(key);
    if (hit) return hit;
    const [existing] = await db.select().from(vehicleModels).where(and(eq(vehicleModels.brandId, brandId), eq(vehicleModels.slug, slug))).limit(1);
    if (existing) {
      modelCache.set(key, existing);
      return existing;
    }
    const [row] = await db.insert(vehicleModels).values({ brandId, name, slug }).returning();
    modelCache.set(key, row!);
    return row!;
  }
  async function ensureMfr(name: string) {
    const slug = slugify(name);
    const hit = mfrCache.get(slug);
    if (hit) return hit;
    const [existing] = await db.select({ id: manufacturers.id, slug: manufacturers.slug }).from(manufacturers).where(eq(manufacturers.slug, slug)).limit(1);
    if (existing) {
      mfrCache.set(slug, existing);
      return existing;
    }
    const [row] = await db.insert(manufacturers).values({ name, slug }).returning();
    const rec = { id: row!.id, slug };
    mfrCache.set(slug, rec);
    return rec;
  }
  async function ensureCat(raw: string) {
    const [parentName, childName] = raw.includes(" - ")
      ? [raw.split(" - ")[0]!.trim(), raw.split(" - ").slice(1).join(" - ").trim()]
      : [raw, raw];
    const parentPath = slugify(parentName);
    let parent = catCache.get(parentPath);
    if (!parent) {
        const [row] = await db.insert(categories).values({
        name: parentName,
        slug: parentPath,
        path: parentPath,
        sortOrder: PARENT_SORT[parentName] ?? 50,
      }).onConflictDoNothing({ target: categories.path }).returning();
      if (!row) {
        const [ex] = await db.select().from(categories).where(eq(categories.path, parentPath)).limit(1);
        parent = ex!;
      } else parent = row;
      catCache.set(parentPath, parent);
    }
    const childPath = `${parentPath}/${slugify(childName)}`;
    let child = catCache.get(childPath);
    if (!child) {
      const [row] = await db.insert(categories).values({
        name: childName,
        slug: slugify(childName),
        path: childPath,
        parentId: parent.id,
        sortOrder: 0,
      }).onConflictDoNothing({ target: categories.path }).returning();
      if (!row) {
        const [ex] = await db.select().from(categories).where(eq(categories.path, childPath)).limit(1);
        child = ex!;
      } else child = row;
      catCache.set(childPath, child);
    }
    return child;
  }

  const uniqueFits = new Map<string, { brand: string; model: string }>();
  const fitBySku = new Map<string, Array<{ brand: string; model: string }>>();
  for (const row of mapped) {
    const fits = inferFitments(row.name);
    fitBySku.set(row.externalId, fits);
    for (const f of fits) uniqueFits.set(`${f.brand}::${f.model}`, f);
  }
  console.log(`Unique inferred fitments: ${uniqueFits.size}`);
  const fitIds = new Map<string, { brandId: string; modelId: string }>();
  for (const f of uniqueFits.values()) {
    const brand = await ensureBrand(f.brand);
    const model = await ensureModel(brand.id, f.model);
    fitIds.set(`${f.brand}::${f.model}`, { brandId: brand.id, modelId: model.id });
  }

  let created = 0;
  let updated = 0;
  let failed = 0;
  const chunk = 400;
  const usedSlugs = new Set<string>();
  for (let i = 0; i < mapped.length; i += chunk) {
    const batch = mapped.slice(i, i + chunk);
    const values = [];
    for (const row of batch) {
      const mfr = row.manufacturer ? await ensureMfr(row.manufacturer) : null;
      let slug = slugify(`${row.sku}-${row.externalId}`) || `p-${row.externalId}`;
      if (usedSlugs.has(slug)) slug = `${slug}-${row.externalId}`;
      usedSlugs.add(slug);
      values.push({
        supplierId: supplier.id,
        manufacturerId: mfr?.id ?? null,
        sku: row.sku,
        externalId: row.externalId,
        name: row.name,
        slug,
        description: row.name,
        price: row.price,
        compareAtPrice: row.compareAtPrice && Number(row.compareAtPrice) > Number(row.price) ? row.compareAtPrice : null,
        stockQty: row.stock,
        stockStatus: row.stock > 0 ? "in_stock" : "out_of_stock",
        status: PRODUCT_STATUS.ACTIVE,
        contentHash: contentHash(row),
        source: PRODUCT_SOURCE.XML,
      });
    }
    try {
      const inserted = await db.insert(products).values(values).onConflictDoUpdate({
        target: [products.supplierId, products.externalId],
        set: {
          name: sql`excluded.name`,
          price: sql`excluded.price`,
          compareAtPrice: sql`excluded.compare_at_price`,
          stockQty: sql`excluded.stock_qty`,
          stockStatus: sql`excluded.stock_status`,
          manufacturerId: sql`excluded.manufacturer_id`,
          contentHash: sql`excluded.content_hash`,
          status: sql`excluded.status`,
        },
      }).returning({ id: products.id, externalId: products.externalId });
      const productIds = inserted.map((r) => r.id);
      if (productIds.length) {
        await db.delete(productOems).where(inArray(productOems.productId, productIds));
        await db.delete(productCategories).where(inArray(productCategories.productId, productIds));
        await db.delete(productFitments).where(inArray(productFitments.productId, productIds));
      }

      const oems = [];
      const cats = [];
      const fits = [];
      for (const row of batch) {
        const rec = inserted.find((r) => r.externalId === row.externalId);
        if (!rec) continue;
        if (row.oem) {
          oems.push({ productId: rec.id, raw: row.oem, normalized: normalizeOem(row.oem) });
        }
        if (row.category) {
          const cat = await ensureCat(row.category);
          cats.push({ productId: rec.id, categoryId: cat.id });
        }
        for (const f of fitBySku.get(row.externalId) ?? []) {
          const ids = fitIds.get(`${f.brand}::${f.model}`);
          if (!ids) continue;
          if (fits.some((x) => x.productId === rec.id && x.vehicleModelId === ids.modelId)) continue;
          fits.push({
            productId: rec.id,
            vehicleBrandId: ids.brandId,
            vehicleModelId: ids.modelId,
          });
        }
      }
      if (oems.length) await db.insert(productOems).values(oems).onConflictDoNothing();
      if (cats.length) await db.insert(productCategories).values(cats).onConflictDoNothing();
      if (fits.length) {
        await db.insert(productFitments).values(fits).onConflictDoNothing();
      }
      created += inserted.length;
    } catch (err) {
      failed += batch.length;
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Batch failed at", i, msg);
    }
    if (i % 4000 === 0) console.log(`Imported ${Math.min(i + chunk, mapped.length)} / ${mapped.length}`);
  }

  console.log("Compiling visibility…");
  await compileVisibility(db);
  await db.update(xmlImportRuns).set({
    status: failed ? IMPORT_RUN_STATUS.COMPLETED_WITH_WARNINGS : IMPORT_RUN_STATUS.COMPLETED,
    finishedAt: new Date().toISOString(),
    total: mapped.length,
    createdCount: created,
    updatedCount: updated,
    failedCount: failed,
  }).where(eq(xmlImportRuns.id, run!.id));
  console.log({ created, failed, total: mapped.length });
  await pg.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
