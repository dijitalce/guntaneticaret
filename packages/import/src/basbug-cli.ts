import { readFile } from "node:fs/promises";
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
import { contentHash } from "./index";
import {
  allOemsForRow,
  fxRatesFromEnv,
  inferBasbugFitments,
  mapBasbugRow,
  slugify,
  type BasbugRaw,
} from "./basbug-map";
import { runDedupeCheapest } from "./dedupe-cheapest";

const DEFAULT_PATH = "/Users/alperengoktuna/Desktop/aktan-xml/data/basbug/all_products.json";
const FEED_NAME = "Basbug malzeme JSON";
const SUPPLIER_CODE = "BASBUG";

async function upsertNamed(
  table: typeof vehicleBrands,
  cache: Map<string, typeof vehicleBrands.$inferSelect>,
  name: string,
  extra: Record<string, unknown> = {},
): Promise<typeof vehicleBrands.$inferSelect> {
  const slug = slugify(name);
  const hit = cache.get(slug);
  if (hit) return hit;
  const [existing] = await db.select().from(table).where(eq(table.slug, slug)).limit(1);
  if (existing) {
    cache.set(slug, existing);
    return existing;
  }
  const [row] = await db.insert(table).values({ name, slug, ...extra } as never).returning();
  cache.set(slug, row!);
  return row!;
}

async function main() {
  const filePath = process.env.BASBUG_JSON_PATH || DEFAULT_PATH;
  const rates = fxRatesFromEnv();
  console.log("Loading", filePath);
  console.log("FX rates TRY:", rates);

  const rawJson = JSON.parse(await readFile(filePath, "utf8")) as {
    malzemeListesi?: BasbugRaw[];
  };
  const rawItems = rawJson.malzemeListesi ?? [];
  console.log(`Loaded ${rawItems.length} Basbug rows`);

  let supplier = (await db.select().from(suppliers).where(eq(suppliers.code, SUPPLIER_CODE)).limit(1))[0];
  if (!supplier) {
    [supplier] = await db
      .insert(suppliers)
      .values({ name: "Basbug", code: SUPPLIER_CODE })
      .returning();
  }

  const existingFeed = await db.select().from(xmlFeeds).where(eq(xmlFeeds.name, FEED_NAME)).limit(1);
  let feedId = existingFeed[0]?.id;
  if (!feedId) {
    const [feed] = await db
      .insert(xmlFeeds)
      .values({
        supplierId: supplier!.id,
        name: FEED_NAME,
        filePath,
        mapping: {
          externalId: "no",
          sku: "no",
          name: "ac",
          manufacturer: "uk",
          oem: "oe",
          category: "_listeGrubuAd",
          price: "lf",
        },
      })
      .returning();
    feedId = feed!.id;
  } else {
    await db.update(xmlFeeds).set({ filePath }).where(eq(xmlFeeds.id, feedId));
  }

  const byExternal = new Map<
    string,
    { raw: BasbugRaw; mapped: NonNullable<ReturnType<typeof mapBasbugRow>> }
  >();
  for (const raw of rawItems) {
    const mapped = mapBasbugRow(raw, rates);
    if (!mapped) continue;
    byExternal.set(mapped.externalId, { raw, mapped });
  }
  const mappedPairs = Array.from(byExternal.values());
  console.log(`Mapped unique products: ${mappedPairs.length}`);

  const [run] = await db
    .insert(xmlImportRuns)
    .values({
      feedId,
      status: IMPORT_RUN_STATUS.RUNNING,
      startedAt: new Date().toISOString(),
      total: mappedPairs.length,
    })
    .returning();

  const brandCache = new Map<string, typeof vehicleBrands.$inferSelect>();
  for (const b of await db.select().from(vehicleBrands)) brandCache.set(b.slug, b);
  const modelCache = new Map<string, { id: string; brandId: string; slug: string }>();
  for (const m of await db.select().from(vehicleModels)) modelCache.set(`${m.brandId}:${m.slug}`, m);

  const mfrCache = new Map<string, { id: string; slug: string }>();
  for (const m of await db.select({ id: manufacturers.id, slug: manufacturers.slug }).from(manufacturers)) {
    mfrCache.set(m.slug, m);
  }
  const catCache = new Map<string, { id: string; slug: string; path: string }>();
  for (const c of await db.select().from(categories)) catCache.set(c.path, c);

  async function ensureBrand(name: string) {
    return upsertNamed(vehicleBrands, brandCache, name);
  }
  async function ensureModel(brandId: string, name: string) {
    const slug = slugify(name);
    const key = `${brandId}:${slug}`;
    const hit = modelCache.get(key);
    if (hit) return hit;
    const [existing] = await db
      .select()
      .from(vehicleModels)
      .where(and(eq(vehicleModels.brandId, brandId), eq(vehicleModels.slug, slug)))
      .limit(1);
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
    const [existing] = await db
      .select({ id: manufacturers.id, slug: manufacturers.slug })
      .from(manufacturers)
      .where(eq(manufacturers.slug, slug))
      .limit(1);
    if (existing) {
      mfrCache.set(slug, existing);
      return existing;
    }
    const [row] = await db.insert(manufacturers).values({ name, slug }).returning();
    const rec = { id: row!.id, slug };
    mfrCache.set(slug, rec);
    return rec;
  }
  async function ensureCat(name: string) {
    const path = `basbug/${slugify(name)}`;
    let cat = catCache.get(path);
    if (cat) return cat;
    const [row] = await db
      .insert(categories)
      .values({
        name,
        slug: slugify(name),
        path,
        sortOrder: 60,
      })
      .onConflictDoNothing({ target: categories.path })
      .returning();
    if (!row) {
      const [ex] = await db.select().from(categories).where(eq(categories.path, path)).limit(1);
      cat = ex!;
    } else cat = row;
    catCache.set(path, cat);
    return cat;
  }

  const uniqueFits = new Map<string, { brand: string; model: string }>();
  const fitByExternal = new Map<string, Array<{ brand: string; model: string }>>();
  for (const { raw, mapped } of mappedPairs) {
    const fits = inferBasbugFitments(raw);
    fitByExternal.set(mapped.externalId, fits);
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
  let failed = 0;
  const chunk = 400;
  const usedSlugs = new Set<string>();

  for (let i = 0; i < mappedPairs.length; i += chunk) {
    const batch = mappedPairs.slice(i, i + chunk);
    const values = [];
    for (const { mapped: row } of batch) {
      const mfr = row.manufacturer ? await ensureMfr(row.manufacturer) : null;
      let slug = slugify(`bb-${row.sku}`) || `bb-${row.externalId}`;
      if (usedSlugs.has(slug)) slug = `${slug}-${slugify(row.externalId).slice(0, 12)}`;
      usedSlugs.add(slug);
      values.push({
        supplierId: supplier!.id,
        manufacturerId: mfr?.id ?? null,
        sku: row.sku,
        externalId: row.externalId,
        name: row.name,
        slug,
        description: row.description ?? row.name,
        price: row.price,
        compareAtPrice: null,
        stockQty: row.stock,
        stockStatus: "in_stock",
        status: PRODUCT_STATUS.ACTIVE,
        contentHash: contentHash(row),
        source: PRODUCT_SOURCE.XML,
      });
    }
    try {
      const inserted = await db
        .insert(products)
        .values(values)
        .onConflictDoUpdate({
          target: [products.supplierId, products.externalId],
          set: {
            name: sql`excluded.name`,
            price: sql`excluded.price`,
            compareAtPrice: sql`excluded.compare_at_price`,
            stockQty: sql`excluded.stock_qty`,
            stockStatus: sql`excluded.stock_status`,
            manufacturerId: sql`excluded.manufacturer_id`,
            description: sql`excluded.description`,
            contentHash: sql`excluded.content_hash`,
            status: sql`excluded.status`,
          },
        })
        .returning({ id: products.id, externalId: products.externalId });

      const productIds = inserted.map((r) => r.id);
      if (productIds.length) {
        await db.delete(productOems).where(inArray(productOems.productId, productIds));
        await db.delete(productCategories).where(inArray(productCategories.productId, productIds));
        await db.delete(productFitments).where(inArray(productFitments.productId, productIds));
      }

      const oems: Array<{ productId: string; raw: string; normalized: string }> = [];
      const cats: Array<{ productId: string; categoryId: string }> = [];
      const fits: Array<{ productId: string; vehicleBrandId: string; vehicleModelId: string }> = [];
      for (const { raw, mapped: row } of batch) {
        const rec = inserted.find((r) => r.externalId === row.externalId);
        if (!rec) continue;
        for (const oem of allOemsForRow(raw)) {
          oems.push({ productId: rec.id, raw: oem.raw, normalized: oem.normalized });
        }
        if (row.category) {
          const cat = await ensureCat(row.category);
          cats.push({ productId: rec.id, categoryId: cat.id });
        }
        for (const f of fitByExternal.get(row.externalId) ?? []) {
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
      if (fits.length) await db.insert(productFitments).values(fits).onConflictDoNothing();
      created += inserted.length;
    } catch (err) {
      failed += batch.length;
      console.error("Batch failed at", i, err instanceof Error ? err.message : err);
    }
    if (i % 4000 === 0) console.log(`Imported ${Math.min(i + chunk, mappedPairs.length)} / ${mappedPairs.length}`);
  }

  console.log("Running cheapest dedupe…");
  const dedupe = await runDedupeCheapest({ compile: false });
  console.log(dedupe);

  console.log("Compiling visibility…");
  await compileVisibility(db);

  await db
    .update(xmlImportRuns)
    .set({
      status: failed ? IMPORT_RUN_STATUS.COMPLETED_WITH_WARNINGS : IMPORT_RUN_STATUS.COMPLETED,
      finishedAt: new Date().toISOString(),
      total: mappedPairs.length,
      createdCount: created,
      updatedCount: 0,
      failedCount: failed,
      inactivatedCount: dedupe.deactivated,
    })
    .where(eq(xmlImportRuns.id, run!.id));

  console.log({ created, failed, total: mappedPairs.length, dedupe });
  await pg.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
