/**
 * Panelden eklenen XML kaynağını indirir ve içe aktarır.
 * Kullanım: tsx src/custom-feed-cli.ts <feedId> [--skip-fetch]
 * Dedupe + görünürlük derlemesi sync-cli tarafından en sonda yapılır.
 */
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { and, eq, inArray, sql } from "drizzle-orm";
import {
  categories,
  db,
  getFeedSecret,
  manufacturers,
  newId,
  pool,
  productCategories,
  productFitments,
  productImages,
  productOems,
  products,
  suppliers,
  vehicleBrands,
  vehicleModels,
  xmlFeeds,
  xmlImportRuns,
} from "@guntan/db";
import { IMPORT_RUN_STATUS, PRODUCT_SOURCE, PRODUCT_STATUS } from "@guntan/types";
import { contentHash, normalizeOem } from "./index";
import { FEEDS_DIR, customFeedPath, downloadFeed, feedConfigFromRow, isCustomFeed, mapCustomItem, parseFeedFile, type CustomMappedProduct } from "./custom-feed";
import { inferFitments } from "./fitment-from-name";
import { useStoredPriceTiers } from "./price-tier-store";
import { resolveFxRates } from "./fx";
import { loadExistingProducts, markMissingFromFeed, needsImport } from "./content-hashes";
import { slugify } from "./basbug-map";

const FORCE_FULL = process.env.FORCE_FULL_IMPORT === "1";
const SKIP_FETCH = process.argv.includes("--skip-fetch");
function splitCategory(raw: string): [string, string] {
  const parts = raw
    .split(/\s*(?:>|»|\||\s-\s)\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return [raw.trim(), raw.trim()];
  if (parts.length === 1) return [parts[0]!, parts[0]!];
  return [parts[0]!, parts.slice(1).join(" - ")];
}

async function main() {
  const feedId = process.argv[2];
  if (!feedId || feedId.startsWith("--")) throw new Error("Kaynak ID verilmedi.");
  const [feed] = await db.select().from(xmlFeeds).where(eq(xmlFeeds.id, feedId)).limit(1);
  if (!feed || !isCustomFeed(feed.mapping)) throw new Error("Kaynak bulunamadı.");
  const cfg = feedConfigFromRow(feed.url, feed.mapping);
  if (!cfg.itemTag || !cfg.mapping.name || !cfg.mapping.price || !(cfg.mapping.sku || cfg.mapping.externalId)) {
    throw new Error("Alan eşleştirmesi eksik (stok kodu, ürün adı, fiyat).");
  }

  const filePath = customFeedPath(feed.id);
  if (!SKIP_FETCH) {
    await mkdir(FEEDS_DIR, { recursive: true });
    const secret = await getFeedSecret(feed.id);
    const { count, bytes } = await downloadFeed(cfg, secret, filePath);
    console.log(`${feed.name}: ${count} ürün indirildi (${(bytes / 1e6).toFixed(1)} MB)`);
  }
  if (!existsSync(filePath)) throw new Error("Sunucuda indirilmiş dosya yok; önce indirme yapılmalı.");

  await useStoredPriceTiers();
  const fx = cfg.currency === "TRY" ? { EUR: 0, USD: 0, source: "yok" } : await resolveFxRates();
  if (cfg.currency !== "TRY") console.log(`Kur (${fx.source}): EUR ${fx.EUR} · USD ${fx.USD}`);

  const rawItems = await parseFeedFile(filePath, cfg.itemTag);
  const byExternal = new Map<string, CustomMappedProduct>();
  let skipped = 0;
  for (const raw of rawItems) {
    const row = mapCustomItem(raw, cfg, fx);
    if (row) byExternal.set(row.externalId, row);
    else skipped += 1;
  }
  const unique = [...byExternal.values()];
  if (!unique.length) throw new Error(`Hiç ürün eşleşmedi (${rawItems.length} satır okundu). Alan eşleştirmesini kontrol edin.`);

  const existing = await loadExistingProducts(feed.supplierId);
  const mapped = unique.filter((row) => needsImport(existing.get(row.externalId), contentHash(row), FORCE_FULL));
  console.log(`Okunan ${rawItems.length}, geçerli ${unique.length}, atlanan ${skipped}, yeni/değişen ${mapped.length}`);

  const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, feed.supplierId)).limit(1);
  const slugPrefix = slugify(supplier?.code ?? "x").slice(0, 24);

  const runId = newId();
  await db.insert(xmlImportRuns).values({
    id: runId,
    feedId: feed.id,
    status: IMPORT_RUN_STATUS.RUNNING,
    startedAt: new Date().toISOString(),
    total: unique.length,
  });

  const mfrCache = new Map<string, string>();
  const catCache = new Map<string, string>();
  const brandCache = new Map<string, string>();
  const modelCache = new Map<string, string>();

  async function ensureMfr(name: string) {
    const slug = slugify(name);
    if (!slug) return null;
    const hit = mfrCache.get(slug);
    if (hit) return hit;
    await db.insert(manufacturers).ignore().values({ id: newId(), name, slug });
    const [row] = await db.select({ id: manufacturers.id }).from(manufacturers).where(eq(manufacturers.slug, slug)).limit(1);
    if (row) mfrCache.set(slug, row.id);
    return row?.id ?? null;
  }
  async function ensureCatPath(name: string, path: string, parentId: string | null) {
    const hit = catCache.get(path);
    if (hit) return hit;
    await db.insert(categories).ignore().values({ id: newId(), name, slug: path.split("/").pop()!, path, parentId, sortOrder: parentId ? 0 : 50 });
    const [row] = await db.select({ id: categories.id }).from(categories).where(eq(categories.path, path)).limit(1);
    catCache.set(path, row!.id);
    return row!.id;
  }
  async function ensureCat(raw: string) {
    const [parentName, childName] = splitCategory(raw);
    const parentPath = slugify(parentName);
    if (!parentPath) return null;
    const parentId = await ensureCatPath(parentName, parentPath, null);
    const childSlug = slugify(childName);
    if (!childSlug || childName === parentName) return parentId;
    return ensureCatPath(childName, `${parentPath}/${childSlug}`, parentId);
  }
  async function ensureFit(brandName: string, modelName: string) {
    const brandSlug = slugify(brandName);
    const modelSlug = slugify(modelName);
    if (!brandSlug || !modelSlug) return null;
    let brandId = brandCache.get(brandSlug);
    if (!brandId) {
      await db.insert(vehicleBrands).ignore().values({ id: newId(), name: brandName, slug: brandSlug });
      const [b] = await db.select({ id: vehicleBrands.id }).from(vehicleBrands).where(eq(vehicleBrands.slug, brandSlug)).limit(1);
      brandId = b!.id;
      brandCache.set(brandSlug, brandId);
    }
    const key = `${brandId}:${modelSlug}`;
    let modelId = modelCache.get(key);
    if (!modelId) {
      await db.insert(vehicleModels).ignore().values({ id: newId(), brandId, name: modelName, slug: modelSlug });
      const [m] = await db
        .select({ id: vehicleModels.id })
        .from(vehicleModels)
        .where(and(eq(vehicleModels.brandId, brandId), eq(vehicleModels.slug, modelSlug)))
        .limit(1);
      modelId = m!.id;
      modelCache.set(key, modelId);
    }
    return { brandId, modelId };
  }

  let created = 0;
  let failed = 0;
  const CHUNK = 400;
  for (let i = 0; i < mapped.length; i += CHUNK) {
    const batch = mapped.slice(i, i + CHUNK);
    try {
      const values = [];
      for (const row of batch) {
        const manufacturerId = row.manufacturer ? await ensureMfr(row.manufacturer) : null;
        const slug = (slugify(`${slugPrefix}-${row.sku}-${row.externalId}`) || `${slugPrefix}-${newId()}`).slice(0, 191);
        values.push({
          id: newId(),
          supplierId: feed.supplierId,
          manufacturerId,
          sku: row.sku,
          externalId: row.externalId,
          name: row.name,
          slug,
          description: row.description ?? null,
          barcode: row.barcode ?? null,
          price: row.price,
          compareAtPrice: row.compareAtPrice ?? null,
          stockQty: row.stock,
          stockStatus: row.stock > 0 ? "in_stock" : "out_of_stock",
          status: PRODUCT_STATUS.ACTIVE,
          contentHash: contentHash(row),
          source: PRODUCT_SOURCE.XML,
        });
      }
      await db.insert(products).values(values).onDuplicateKeyUpdate({
        set: {
          name: sql`VALUES(name)`,
          description: sql`VALUES(description)`,
          barcode: sql`VALUES(barcode)`,
          price: sql`VALUES(price)`,
          compareAtPrice: sql`VALUES(compare_at_price)`,
          stockQty: sql`VALUES(stock_qty)`,
          stockStatus: sql`VALUES(stock_status)`,
          manufacturerId: sql`VALUES(manufacturer_id)`,
          contentHash: sql`VALUES(content_hash)`,
          status: sql`VALUES(status)`,
        },
      });
      const saved = await db
        .select({ id: products.id, externalId: products.externalId })
        .from(products)
        .where(and(eq(products.supplierId, feed.supplierId), inArray(products.externalId, batch.map((r) => r.externalId))));
      const idByExternal = new Map(saved.map((r) => [r.externalId, r.id]));
      const ids = saved.map((r) => r.id);
      if (ids.length) {
        await db.delete(productOems).where(inArray(productOems.productId, ids));
        await db.delete(productCategories).where(inArray(productCategories.productId, ids));
        await db.delete(productFitments).where(inArray(productFitments.productId, ids));
        await db.delete(productImages).where(inArray(productImages.productId, ids));
      }
      const oems: { productId: string; raw: string; normalized: string }[] = [];
      const cats: { productId: string; categoryId: string }[] = [];
      const fits: { productId: string; vehicleBrandId: string; vehicleModelId: string }[] = [];
      const images: { id: string; productId: string; s3Key: string; url: string; alt: string; sortOrder: number }[] = [];
      for (const row of batch) {
        const productId = idByExternal.get(row.externalId);
        if (!productId) continue;
        for (const raw of (row.oem ?? "").split(/[,;|/]+/).map((s) => s.trim()).filter(Boolean).slice(0, 10)) {
          const normalized = normalizeOem(raw);
          if (normalized.length >= 3) oems.push({ productId, raw: raw.slice(0, 191), normalized });
        }
        if (row.category) {
          const categoryId = await ensureCat(row.category);
          if (categoryId) cats.push({ productId, categoryId });
        }
        const fitList = row.vehicleBrand && row.vehicleModel ? [{ brand: row.vehicleBrand, model: row.vehicleModel }] : inferFitments(row.name);
        for (const f of fitList) {
          const ids2 = await ensureFit(f.brand, f.model);
          if (ids2 && !fits.some((x) => x.productId === productId && x.vehicleModelId === ids2.modelId)) {
            fits.push({ productId, vehicleBrandId: ids2.brandId, vehicleModelId: ids2.modelId });
          }
        }
        if (row.imageUrl) images.push({ id: newId(), productId, s3Key: row.imageUrl.slice(0, 512), url: row.imageUrl, alt: row.name.slice(0, 255), sortOrder: 0 });
      }
      if (oems.length) await db.insert(productOems).ignore().values(oems);
      if (cats.length) await db.insert(productCategories).ignore().values(cats);
      if (fits.length) await db.insert(productFitments).ignore().values(fits);
      if (images.length) await db.insert(productImages).values(images);
      created += saved.length;
    } catch (err) {
      failed += batch.length;
      console.error(`Parti ${i} hata:`, err instanceof Error ? err.message : err);
    }
    if (i % 4000 === 0) console.log(`İşlenen ${Math.min(i + CHUNK, mapped.length)} / ${mapped.length}`);
  }

  const missing = failed ? 0 : await markMissingFromFeed(existing, new Set(unique.map((r) => r.externalId)));
  await db
    .update(xmlImportRuns)
    .set({
      status: failed ? IMPORT_RUN_STATUS.COMPLETED_WITH_WARNINGS : IMPORT_RUN_STATUS.COMPLETED,
      finishedAt: new Date().toISOString(),
      total: unique.length,
      createdCount: created,
      unchangedCount: unique.length - mapped.length,
      failedCount: failed + skipped,
      inactivatedCount: missing,
    })
    .where(eq(xmlImportRuns.id, runId));
  console.log({ feed: feed.name, processed: created, unchanged: unique.length - mapped.length, skipped, missing, failed });
  await pool.end();
  if (failed) process.exitCode = 1;
}

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : err);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
