import { readFile } from "node:fs/promises";
import { and, eq, inArray, sql } from "drizzle-orm";
import {
  categories,
  compileVisibility,
  db,
  manufacturers,
  newId,
  pool,
  productCategories,
  productFitments,
  productOems,
  products,
  pruneUnusedCatalog,
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
  const id = newId();
  await db.insert(table).values({ id, name, slug, ...extra } as never);
  const [row] = await db.select().from(table).where(eq(table.id, id)).limit(1);
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
    const id = newId();
    await db.insert(suppliers).values({ id, name: "Basbug", code: SUPPLIER_CODE });
    supplier = (await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1))[0]!;
  }

  const existingFeed = await db.select().from(xmlFeeds).where(eq(xmlFeeds.name, FEED_NAME)).limit(1);
  let feedId = existingFeed[0]?.id;
  if (!feedId) {
    feedId = newId();
    await db.insert(xmlFeeds).values({
      id: feedId,
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
    });
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

  const runId = newId();
  await db.insert(xmlImportRuns).values({
    id: runId,
    feedId,
    status: IMPORT_RUN_STATUS.RUNNING,
    startedAt: new Date().toISOString(),
    total: mappedPairs.length,
  });

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
    const row = { id: newId(), brandId, name, slug };
    await db.insert(vehicleModels).values(row);
    modelCache.set(key, row);
    return row;
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
    const rec = { id: newId(), slug };
    await db.insert(manufacturers).values({ id: rec.id, name, slug });
    mfrCache.set(slug, rec);
    return rec;
  }
  async function ensureCat(name: string) {
    const path = `basbug/${slugify(name)}`;
    let cat = catCache.get(path);
    if (cat) return cat;
    const id = newId();
    await db.insert(categories).ignore().values({
      id,
      name,
      slug: slugify(name),
      path,
      sortOrder: 60,
    });
    const [ex] = await db.select().from(categories).where(eq(categories.path, path)).limit(1);
    cat = ex!;
    catCache.set(path, cat);
    return cat;
  }

  const uniqueFits = new Map<string, { brand: string; model: string }>();
  for (const { raw } of mappedPairs) {
    for (const f of inferBasbugFitments(raw)) uniqueFits.set(`${f.brand}::${f.model}`, f);
  }
  console.log(`Unique inferred fitments: ${uniqueFits.size}`);
  const fitIds = new Map<string, { brandId: string; modelId: string }>();
  for (const f of uniqueFits.values()) {
    const brand = await ensureBrand(f.brand);
    const model = await ensureModel(brand.id, f.model);
    fitIds.set(`${f.brand}::${f.model}`, { brandId: brand.id, modelId: model.id });
  }
  console.log("Fitment IDs ready, starting product upsert…");

  let created = 0;
  let failed = 0;
  const chunk = 100;
  const usedSlugs = new Set<string>();

  for (let i = 0; i < mappedPairs.length; i += chunk) {
    if (i === 0) console.log("Preparing first batch…");
    const batch = mappedPairs.slice(i, i + chunk);
    const values = [];
    for (const { mapped: row } of batch) {
      const mfr = row.manufacturer ? await ensureMfr(row.manufacturer) : null;
      let slug = slugify(`bb-${row.sku}`) || `bb-${row.externalId}`;
      if (usedSlugs.has(slug)) slug = `${slug}-${i}`;
      usedSlugs.add(slug);
      values.push({
        id: newId(),
        supplierId: supplier!.id,
        manufacturerId: mfr?.id ?? null,
        sku: row.sku,
        externalId: row.externalId,
        name: row.name,
        slug,
        description: null,
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
      await db.insert(products).values(values).onDuplicateKeyUpdate({
        set: {
          name: sql`VALUES(name)`,
          price: sql`VALUES(price)`,
          compareAtPrice: sql`VALUES(compare_at_price)`,
          stockQty: sql`VALUES(stock_qty)`,
          stockStatus: sql`VALUES(stock_status)`,
          manufacturerId: sql`VALUES(manufacturer_id)`,
          description: sql`VALUES(description)`,
          contentHash: sql`VALUES(content_hash)`,
          status: sql`VALUES(status)`,
        },
      });
      const inserted = await db
        .select({ id: products.id, externalId: products.externalId })
        .from(products)
        .where(
          and(
            eq(products.supplierId, supplier!.id),
            inArray(
              products.externalId,
              batch.map((r) => r.mapped.externalId),
            ),
          ),
        );

      const productIds = inserted.map((r) => r.id);
      if (productIds.length) {
        await db.delete(productOems).where(inArray(productOems.productId, productIds));
        await db.delete(productCategories).where(inArray(productCategories.productId, productIds));
        await db.delete(productFitments).where(inArray(productFitments.productId, productIds));
      }

      const oems: Array<{ productId: string; raw: string; normalized: string }> = [];
      const cats: Array<{ productId: string; categoryId: string }> = [];
      const fits: Array<{ productId: string; vehicleBrandId: string; vehicleModelId: string }> = [];
      const insertedByExt = new Map(inserted.map((r) => [r.externalId, r.id]));
      for (const { raw, mapped: row } of batch) {
        const productId = insertedByExt.get(row.externalId);
        if (!productId) continue;
        for (const oem of allOemsForRow(raw)) {
          oems.push({ productId, raw: oem.raw, normalized: oem.normalized });
        }
        if (row.category) {
          const cat = await ensureCat(row.category);
          cats.push({ productId, categoryId: cat.id });
        }
        for (const f of inferBasbugFitments(raw)) {
          const ids = fitIds.get(`${f.brand}::${f.model}`);
          if (!ids) continue;
          if (fits.some((x) => x.productId === productId && x.vehicleModelId === ids.modelId)) continue;
          fits.push({
            productId,
            vehicleBrandId: ids.brandId,
            vehicleModelId: ids.modelId,
          });
        }
      }
      if (oems.length) await db.insert(productOems).ignore().values(oems);
      if (cats.length) await db.insert(productCategories).ignore().values(cats);
      if (fits.length) await db.insert(productFitments).ignore().values(fits);
      created += inserted.length;
      if (i === 0) console.log(`First batch OK, inserted=${inserted.length}`);
    } catch (err) {
      failed += batch.length;
      console.error("Batch failed at", i, err instanceof Error ? err.stack ?? err.message : err);
    }
    if (i % 1000 === 0 || i + chunk >= mappedPairs.length) {
      console.log(`Imported ${Math.min(i + chunk, mappedPairs.length)} / ${mappedPairs.length} (failed=${failed})`);
    }
  }

  console.log("Running cheapest dedupe…");
  const dedupe = await runDedupeCheapest({ compile: false });
  console.log({
    candidates: dedupe.candidates,
    groups: dedupe.groups,
    deactivated: dedupe.deactivated,
    activated: dedupe.activated,
  });

  console.log("Compiling visibility…");
  await compileVisibility(db);

  console.log("Pruning unused catalog rows…");
  const pruned = await pruneUnusedCatalog();
  console.log(pruned);

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
    .where(eq(xmlImportRuns.id, runId));

  console.log({ created, failed, total: mappedPairs.length, dedupe: {
    groups: dedupe.groups,
    deactivated: dedupe.deactivated,
    activated: dedupe.activated,
  } });
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
