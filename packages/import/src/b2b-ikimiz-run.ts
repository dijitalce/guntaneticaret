/**
 * İkimiz Oto B2B web servisi senkronu: sayfa sayfa ürün çeker, yalnızca yeni/değişenleri yazar,
 * listeden çıkanları satıştan kaldırır. Dedupe + görünürlük derlemesini sync-cli en sonda yapar
 * (tek başına çalıştırınca bu dosya yapar).
 *
 * Kullanım: pnpm --filter @guntan/import b2b-sync   (env: B2B_IKIMIZ_USERNAME / B2B_IKIMIZ_PASSWORD)
 * Bayrak: FORCE_FULL_IMPORT=1 değişmeyenleri de yeniden yazar.
 */
import { createHash } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import {
  compileVisibility,
  db,
  manufacturers,
  newId,
  pool,
  products,
  suppliers,
  vehicleBrands,
  vehicleModels,
  xmlFeeds,
  xmlImportRuns,
} from "@guntan/db";
import { IMPORT_RUN_STATUS, PRODUCT_SOURCE, PRODUCT_STATUS } from "@guntan/types";
import { contentHash } from "./index";
import { B2bIkimizClient, b2bIkimizConfigFromEnv } from "./b2b-ikimiz-fetch";
import { B2B_IKIMIZ_SUPPLIER_CODE, b2bIkimizNumbers, mapB2bIkimizRow, type B2bIkimizRaw } from "./b2b-ikimiz-map";
import { slugify } from "./basbug-map";
import { syncProductChildren } from "./child-rows";
import { loadExistingProducts, markMissingFromFeed, needsImport } from "./content-hashes";
import { runDedupeCheapest } from "./dedupe-cheapest";
import { inferFitments } from "./fitment-from-name";
import { resolveFxRates } from "./fx";
import { useStoredPriceTiers } from "./price-tier-store";

const FORCE_FULL = process.env.FORCE_FULL_IMPORT === "1";
const STANDALONE = process.env.B2B_IKIMIZ_STANDALONE === "1";
const PAGE_LEN = Math.max(10, Math.min(500, Number(process.env.B2B_IKIMIZ_PAGE_LEN) || 200));
const WRITE_CHUNK = 400;

type Mapped = NonNullable<ReturnType<typeof mapB2bIkimizRow>>;
type Item = { raw: B2bIkimizRaw; mapped: Mapped; hash: string };

function log(msg: string) {
  console.log(`İkimiz B2B: ${msg}`);
}

async function getSupplier() {
  let [supplier] = await db.select().from(suppliers).where(eq(suppliers.code, B2B_IKIMIZ_SUPPLIER_CODE)).limit(1);
  if (!supplier) {
    const id = newId();
    await db.insert(suppliers).values({ id, name: "İkimiz Oto", code: B2B_IKIMIZ_SUPPLIER_CODE });
    [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
  }
  return supplier!;
}

async function getFeedId(supplierId: string) {
  const name = "İkimiz Oto B2B web servisi";
  const [feed] = await db.select().from(xmlFeeds).where(eq(xmlFeeds.name, name)).limit(1);
  if (feed) {
    // Pano "Ürün güncelliği" kartı yalnızca aktif kaynakları listeler.
    if (!feed.isActive) await db.update(xmlFeeds).set({ isActive: 1 }).where(eq(xmlFeeds.id, feed.id));
    return feed.id;
  }
  const id = newId();
  await db.insert(xmlFeeds).values({
    id,
    supplierId,
    name,
    url: "https://b2b.ikimizoto.com.tr/api/getProductListService",
    mapping: { externalId: "Code", sku: "Code", name: "Name", manufacturer: "Manufacturer", price: "SalePriceContactTax", stock: "Depo_1" },
    isActive: 1,
  });
  return id;
}

type Ctx = {
  supplierId: string;
  mfr: Map<string, string>;
  brand: Map<string, string>;
  model: Map<string, string>;
};

async function ensureMfr(ctx: Ctx, name: string): Promise<string | null> {
  const slug = slugify(name);
  if (!slug) return null;
  const hit = ctx.mfr.get(slug);
  if (hit) return hit;
  await db.insert(manufacturers).ignore().values({ id: newId(), name, slug });
  const [row] = await db.select({ id: manufacturers.id }).from(manufacturers).where(eq(manufacturers.slug, slug)).limit(1);
  if (row) ctx.mfr.set(slug, row.id);
  return row?.id ?? null;
}

async function ensureFit(ctx: Ctx, brandName: string, modelName: string) {
  const bslug = slugify(brandName);
  const mslug = slugify(modelName);
  if (!bslug || !mslug) return null;
  let brandId = ctx.brand.get(bslug);
  if (!brandId) {
    await db.insert(vehicleBrands).ignore().values({ id: newId(), name: brandName, slug: bslug });
    const [b] = await db.select({ id: vehicleBrands.id }).from(vehicleBrands).where(eq(vehicleBrands.slug, bslug)).limit(1);
    brandId = b!.id;
    ctx.brand.set(bslug, brandId);
  }
  const key = `${brandId}:${mslug}`;
  let modelId = ctx.model.get(key);
  if (!modelId) {
    await db.insert(vehicleModels).ignore().values({ id: newId(), brandId, name: modelName, slug: mslug });
    const [m] = await db
      .select({ id: vehicleModels.id })
      .from(vehicleModels)
      .where(and(eq(vehicleModels.brandId, brandId), eq(vehicleModels.slug, mslug)))
      .limit(1);
    modelId = m!.id;
    ctx.model.set(key, modelId);
  }
  return { brandId, modelId };
}

/**
 * Slug benzersiz anahtardır ve toplu "ON DUPLICATE KEY UPDATE" başka ürünün satırını ezebilir:
 * aynı slug başka bir ürüne aitse koda bağlı kısa bir ek getirilir.
 */
async function resolveSlugs(supplierId: string, items: Item[]): Promise<Map<string, string>> {
  const wanted = new Map<string, string>();
  const used = new Set<string>();
  for (const { mapped } of items) {
    let slug = slugify(`ik-${mapped.sku}`) || `ik-${createHash("sha1").update(mapped.externalId).digest("hex").slice(0, 10)}`;
    const suffix = createHash("sha1").update(mapped.externalId).digest("hex").slice(0, 6);
    if (used.has(slug)) slug = `${slug}-${suffix}`;
    used.add(slug);
    wanted.set(mapped.externalId, slug.slice(0, 191));
  }
  const taken = await db
    .select({ slug: products.slug, supplierId: products.supplierId, externalId: products.externalId })
    .from(products)
    .where(inArray(products.slug, [...wanted.values()]));
  const owner = new Map(taken.map((t) => [t.slug, `${t.supplierId}|${t.externalId}`]));
  for (const [externalId, slug] of wanted) {
    const holder = owner.get(slug);
    if (holder && holder !== `${supplierId}|${externalId}`) {
      const suffix = createHash("sha1").update(externalId).digest("hex").slice(0, 6);
      wanted.set(externalId, `${slug.slice(0, 184)}-${suffix}`);
    }
  }
  return wanted;
}

async function writeItems(ctx: Ctx, items: Item[]) {
  const slugs = await resolveSlugs(ctx.supplierId, items);
  const values = [];
  for (const { mapped, hash } of items) {
    const manufacturerId = mapped.manufacturer ? await ensureMfr(ctx, mapped.manufacturer) : null;
    values.push({
      id: newId(),
      supplierId: ctx.supplierId,
      manufacturerId,
      sku: mapped.sku,
      externalId: mapped.externalId,
      name: mapped.name,
      slug: slugs.get(mapped.externalId)!,
      description: null,
      price: mapped.price,
      compareAtPrice: null,
      stockQty: mapped.stock,
      stockStatus: mapped.stock > 0 ? "in_stock" : "out_of_stock",
      status: PRODUCT_STATUS.ACTIVE,
      contentHash: hash,
      source: PRODUCT_SOURCE.XML,
    });
  }
  await db.insert(products).values(values).onDuplicateKeyUpdate({
    set: {
      name: sql`VALUES(name)`,
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
    .where(and(eq(products.supplierId, ctx.supplierId), inArray(products.externalId, items.map((i) => i.mapped.externalId))));
  const idByExt = new Map(saved.map((r) => [r.externalId, r.id]));
  const oems: Array<{ productId: string; raw: string; normalized: string }> = [];
  const fits = new Map<string, { productId: string; vehicleBrandId: string; vehicleModelId: string }>();
  for (const { raw, mapped } of items) {
    const productId = idByExt.get(mapped.externalId);
    if (!productId) continue;
    for (const n of b2bIkimizNumbers(raw)) oems.push({ productId, ...n });
    for (const f of inferFitments(mapped.name, 8)) {
      const ids = await ensureFit(ctx, f.brand, f.model);
      if (ids) fits.set(`${productId}:${ids.modelId}`, { productId, vehicleBrandId: ids.brandId, vehicleModelId: ids.modelId });
    }
  }
  // Yalnızca fark yazılır (bkz. child-rows.ts).
  await syncProductChildren(saved.map((r) => r.id), { oems, fits: [...fits.values()] });
  return saved.length;
}

async function main() {
  const config = b2bIkimizConfigFromEnv();
  if (!config) {
    log("B2B_IKIMIZ_USERNAME / B2B_IKIMIZ_PASSWORD yok, atlandı.");
    return;
  }
  await useStoredPriceTiers();
  const rates = await resolveFxRates();
  const supplier = await getSupplier();
  const feedId = await getFeedId(supplier.id);
  const existing = await loadExistingProducts(supplier.id);
  const ctx: Ctx = { supplierId: supplier.id, mfr: new Map(), brand: new Map(), model: new Map() };

  const runId = newId();
  await db.insert(xmlImportRuns).values({ id: runId, feedId, status: IMPORT_RUN_STATUS.RUNNING, startedAt: new Date().toISOString() });

  const client = new B2bIkimizClient(config);
  const stats = { read: 0, valid: 0, skipped: 0, changed: 0, written: 0, failed: 0, missing: 0 };
  const seen = new Set<string>();
  let batch: Item[] = [];
  let fetchFailed = false;

  const flush = async () => {
    if (!batch.length) return;
    const items = batch;
    batch = [];
    try {
      stats.written += await writeItems(ctx, items);
    } catch (err) {
      stats.failed += items.length;
      console.error("İkimiz B2B: grup yazılamadı:", err instanceof Error ? err.message : err);
    }
  };

  try {
    await client.login();
    log("giriş tamam, ürünler çekiliyor");
    for await (const page of client.products(PAGE_LEN)) {
      for (const raw of page as B2bIkimizRaw[]) {
        stats.read += 1;
        const mapped = mapB2bIkimizRow(raw, rates);
        if (!mapped) {
          stats.skipped += 1;
          continue;
        }
        if (seen.has(mapped.externalId)) continue;
        seen.add(mapped.externalId);
        stats.valid += 1;
        const hash = contentHash(mapped);
        if (!needsImport(existing.get(mapped.externalId), hash, FORCE_FULL)) continue;
        stats.changed += 1;
        batch.push({ raw, mapped, hash });
        if (batch.length >= WRITE_CHUNK) await flush();
      }
      if (stats.read % 5000 < PAGE_LEN) log(`okunan ${stats.read}, yeni/değişen ${stats.changed}`);
    }
    await flush();
  } catch (err) {
    // Çekim yarıda kesildiyse listeden çıkan ürünler işaretlenmez (eksik liste yüzünden ürünler kaybolmasın).
    fetchFailed = true;
    log(`HATA ${err instanceof Error ? err.message : err}`);
    await flush();
  }

  if (!fetchFailed && !stats.failed && stats.valid > 0) {
    stats.missing = await markMissingFromFeed(existing, seen);
  }
  log(
    `okunan ${stats.read}, geçerli ${stats.valid}, atlanan ${stats.skipped}, yeni/değişen ${stats.changed}, yazılan ${stats.written}, satıştan kalkan ${stats.missing}, hatalı ${stats.failed}`,
  );

  if (STANDALONE && stats.written + stats.missing > 0) {
    const dedupe = await runDedupeCheapest({ compile: false });
    await compileVisibility(db);
    log(`Dedupe: ${dedupe.deactivated} pasif, ${dedupe.activated} aktif.`);
  }
  await db
    .update(xmlImportRuns)
    .set({
      status: fetchFailed || stats.failed ? IMPORT_RUN_STATUS.COMPLETED_WITH_WARNINGS : IMPORT_RUN_STATUS.COMPLETED,
      finishedAt: new Date().toISOString(),
      total: stats.valid,
      createdCount: stats.written,
      unchangedCount: stats.valid - stats.changed,
      failedCount: stats.failed + stats.skipped,
      inactivatedCount: stats.missing,
    })
    .where(eq(xmlImportRuns.id, runId));
  await pool.end();
  if (fetchFailed || stats.failed) process.exitCode = 1;
}

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : err);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
