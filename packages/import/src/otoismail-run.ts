/**
 * Oto İsmail (ws.otoismail.com.tr) web servisi senkronu.
 *
 *   (varsayılan)  Marka marka: GetProducts → ndjson dosyası → ürün import (fiyat/stok/OEM/uyum).
 *                 Süre dolunca durur, kaldığı markadan devam eder (cron her çalıştığında).
 *   --images      Görseli olmayan ürünleri (tüm tedarikçilerden) marka + parça no ile Oto İsmail
 *                 kayıtlarına eşler, ImageUrl'den indirip webp olarak /urun-gorsel altına yazar.
 *
 * Bayraklar: --brands=GVA,VAL  --skip-fetch  --fresh (yeni döngü başlat)  --limit=N (görsel)
 * Ayarlar (guntan-sync.env): OTOISMAIL_USERNAME, OTOISMAIL_PASSWORD, OTOISMAIL_BRANDS (ops.),
 *   OTOISMAIL_MAX_MINUTES (14), OTOISMAIL_CYCLE_HOURS (24), OTOISMAIL_IMPORT_OUT_OF_STOCK=1,
 *   OTOISMAIL_VAT_RATE (20), OTOISMAIL_IMAGE_DELAY_MS (200)
 */
import { createHash } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { rm, writeFile, open } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
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
  productImages,
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
import { contentHash, normalizeOem } from "./index";
import { slugify } from "./basbug-map";
import { inferFitments } from "./fitment-from-name";
import { resolveFxRates } from "./fx";
import { loadExistingProducts, needsImport } from "./content-hashes";
import { runDedupeCheapest } from "./dedupe-cheapest";
import { useStoredPriceTiers } from "./price-tier-store";
import { loadSyncEnv, syncHomeDir } from "./sync-env";
import { OtoIsmailClient, otoIsmailConfigFromEnv, writeNdjson } from "./otoismail-fetch";
import { nextImageChunk, writeImageCursor } from "./image-cursor";
import { syncProductChildren } from "./child-rows";
import {
  OTOISMAIL_SUPPLIER_CODE,
  imageMatchKeys,
  mapOtoIsmailRow,
  otoIsmailImageUrl,
  otoIsmailNumbers,
  type OtoIsmailRaw,
} from "./otoismail-map";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const SYNC_HOME = syncHomeDir(loadSyncEnv(root));
const DIR = process.env.OTOISMAIL_DIR || join(SYNC_HOME, "guntan-otoismail");
const STATE_FILE = join(DIR, "state.json");
const IMAGE_STATE_DIR = join(SYNC_HOME, "guntan-images");
const IMAGE_DIR = process.env.PRODUCT_IMAGE_DIR || join(IMAGE_STATE_DIR, "files");
const IMAGE_BASE = `${(process.env.STOREFRONT_URL || "https://guntanotoyedekparca.com").replace(/\/$/, "")}/urun-gorsel`;
const IMAGE_DONE_FILE = join(IMAGE_STATE_DIR, "otoismail-done.tsv");
const IMAGE_CURSOR_FILE = join(IMAGE_STATE_DIR, "otoismail-cursor");
const UA = "Mozilla/5.0 (compatible; GuntanImageSync/1.0; +https://guntanotoyedekparca.com)";

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const flag = (name: string) => process.argv.includes(`--${name}`);
const MODE_IMAGES = flag("images");
// Senkron ve görsel çalışması birbirini engellemesin diye ayrı kilit dosyaları.
const LOCK_FILE = join(DIR, MODE_IMAGES ? "images.lock" : "sync.lock");
const MAX_MS = Number(process.env.OTOISMAIL_MAX_MINUTES || 14) * 60_000;
const CYCLE_MS = Number(process.env.OTOISMAIL_CYCLE_HOURS || 24) * 3600_000;
// Stoğu 0 olanlar da varsayılan olarak stokta gösterilip alınır; OTOISMAIL_ASSUME_IN_STOCK=0 ise stoksuz yeni ürünler atlanır.
const IMPORT_OOS = process.env.OTOISMAIL_IMPORT_OUT_OF_STOCK === "1" || process.env.OTOISMAIL_ASSUME_IN_STOCK !== "0";
const FORCE_FULL = process.env.FORCE_FULL_IMPORT === "1";
const started = Date.now();
const timeLeft = () => MAX_MS - (Date.now() - started);

const log = (m: string) => console.log(`[${new Date().toISOString()}] ${m}`);
const fileFor = (brand: string) => join(DIR, `${slugify(brand) || "brand"}.ndjson`);

/** Eşleme mantığı (marka/kategori) değişince artırılır; mevcut ürünlerin yeniden yazılması için döngü baştan başlar. */
const MAPPING_VERSION = `3|${process.env.OTOISMAIL_DISCOUNT_PERCENT ?? ""}|${process.env.OTOISMAIL_BRAND_DISCOUNTS ?? ""}|${process.env.OTOISMAIL_VAT_RATE ?? ""}|${process.env.OTOISMAIL_ASSUME_IN_STOCK ?? ""}`;
type State = { cycleStartedAt: number; done: Record<string, number>; mappingVersion?: string | number };
function readState(): State {
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8")) as State;
  } catch {
    return { cycleStartedAt: 0, done: {} };
  }
}
const writeState = (s: State) => writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));

async function* readRows(path: string): AsyncGenerator<OtoIsmailRaw> {
  const rl = createInterface({ input: createReadStream(path, { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      yield JSON.parse(line) as OtoIsmailRaw;
    } catch {
      /* bozuk satır atlanır */
    }
  }
}

async function acquireLock(): Promise<boolean> {
  if (existsSync(LOCK_FILE)) {
    const pid = Number(readFileSync(LOCK_FILE, "utf8").trim());
    let alive = false;
    if (pid) {
      try {
        process.kill(pid, 0);
        alive = true;
      } catch (e) {
        alive = (e as NodeJS.ErrnoException).code === "EPERM";
      }
    }
    if (alive) return false;
    await rm(LOCK_FILE, { force: true });
  }
  try {
    const fh = await open(LOCK_FILE, "wx");
    await fh.write(String(process.pid));
    await fh.close();
    return true;
  } catch {
    return false;
  }
}

async function getSupplier() {
  let supplier = (await db.select().from(suppliers).where(eq(suppliers.code, OTOISMAIL_SUPPLIER_CODE)).limit(1))[0];
  if (!supplier) {
    const id = newId();
    await db.insert(suppliers).values({ id, name: "Oto İsmail", code: OTOISMAIL_SUPPLIER_CODE });
    supplier = (await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1))[0]!;
  }
  return supplier;
}

async function getFeedId(supplierId: string) {
  const name = "Oto Ismail web servisi";
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
    url: "http://ws.otoismail.com.tr/api/OISML/GetProducts",
    mapping: { externalId: "NetsisStokId", sku: "Kod", name: "Ad", manufacturer: "Marka", price: "Fiyat1", stock: "StokSayisi" },
    isActive: 1, // özel XML döngüsü yalnızca "custom" işaretli kaynakları çalıştırır; bu kayıt ona girmez
  });
  return id;
}

// ───────────────────────── ürün import ─────────────────────────

type Ctx = {
  supplierId: string;
  rates: Awaited<ReturnType<typeof resolveFxRates>>;
  existing: Awaited<ReturnType<typeof loadExistingProducts>>;
  mfrCache: Map<string, string>;
  catCache: Map<string, string>;
  brandCache: Map<string, string>;
  modelCache: Map<string, string>;
  usedSlugs: Set<string>;
};

async function ensureMfr(ctx: Ctx, name: string): Promise<string> {
  const slug = slugify(name);
  const hit = ctx.mfrCache.get(slug);
  if (hit) return hit;
  const [ex] = await db.select({ id: manufacturers.id }).from(manufacturers).where(eq(manufacturers.slug, slug)).limit(1);
  const id = ex?.id ?? newId();
  if (!ex) await db.insert(manufacturers).ignore().values({ id, name, slug });
  const [row] = await db.select({ id: manufacturers.id }).from(manufacturers).where(eq(manufacturers.slug, slug)).limit(1);
  ctx.mfrCache.set(slug, row!.id);
  return row!.id;
}

async function ensureCat(ctx: Ctx, name: string): Promise<string> {
  const path = `otoismail/${slugify(name)}`;
  const hit = ctx.catCache.get(path);
  if (hit) return hit;
  await db.insert(categories).ignore().values({ id: newId(), name, slug: slugify(name), path, sortOrder: 60 });
  const [row] = await db.select({ id: categories.id }).from(categories).where(eq(categories.path, path)).limit(1);
  ctx.catCache.set(path, row!.id);
  return row!.id;
}

async function ensureFit(ctx: Ctx, brand: string, model: string): Promise<{ brandId: string; modelId: string }> {
  const bslug = slugify(brand);
  let brandId = ctx.brandCache.get(bslug);
  if (!brandId) {
    const [ex] = await db.select({ id: vehicleBrands.id }).from(vehicleBrands).where(eq(vehicleBrands.slug, bslug)).limit(1);
    brandId = ex?.id ?? newId();
    if (!ex) await db.insert(vehicleBrands).ignore().values({ id: brandId, name: brand, slug: bslug });
    ctx.brandCache.set(bslug, brandId);
  }
  const mslug = slugify(model);
  const key = `${brandId}:${mslug}`;
  let modelId = ctx.modelCache.get(key);
  if (!modelId) {
    const [ex] = await db
      .select({ id: vehicleModels.id })
      .from(vehicleModels)
      .where(and(eq(vehicleModels.brandId, brandId), eq(vehicleModels.slug, mslug)))
      .limit(1);
    modelId = ex?.id ?? newId();
    if (!ex) await db.insert(vehicleModels).ignore().values({ id: modelId, brandId, name: model, slug: mslug });
    ctx.modelCache.set(key, modelId);
  }
  return { brandId, modelId };
}

async function importBrand(ctx: Ctx, brand: string, path: string) {
  const stats = { total: 0, changed: 0, skippedNew: 0, imported: 0, failed: 0, partial: false };
  let batch: Array<{ raw: OtoIsmailRaw; mapped: NonNullable<ReturnType<typeof mapOtoIsmailRow>>; hash: string }> = [];

  const flush = async () => {
    if (!batch.length) return;
    const items = batch;
    batch = [];
    try {
      const values = [];
      for (const { mapped, hash } of items) {
        const mfrId = mapped.manufacturer ? await ensureMfr(ctx, mapped.manufacturer) : null;
        let slug = slugify(`oi-${mapped.sku}`) || `oi-${mapped.externalId}`;
        if (ctx.usedSlugs.has(slug)) slug = `${slug}-${mapped.externalId}`;
        ctx.usedSlugs.add(slug);
        values.push({
          id: newId(),
          supplierId: ctx.supplierId,
          manufacturerId: mfrId,
          sku: mapped.sku,
          externalId: mapped.externalId,
          name: mapped.name,
          slug,
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
      const rows = await db
        .select({ id: products.id, externalId: products.externalId })
        .from(products)
        .where(and(eq(products.supplierId, ctx.supplierId), inArray(products.externalId, items.map((i) => i.mapped.externalId))));
      const idByExt = new Map(rows.map((r) => [r.externalId, r.id]));
      const ids = rows.map((r) => r.id);
      const oems: Array<{ productId: string; raw: string; normalized: string }> = [];
      const cats: Array<{ productId: string; categoryId: string }> = [];
      const fits = new Map<string, { productId: string; vehicleBrandId: string; vehicleModelId: string }>();
      for (const { raw, mapped } of items) {
        const productId = idByExt.get(mapped.externalId);
        if (!productId) continue;
        for (const n of otoIsmailNumbers(raw)) oems.push({ productId, ...n });
        if (mapped.category) cats.push({ productId, categoryId: await ensureCat(ctx, mapped.category) });
        for (const f of inferFitments(mapped.name, 8)) {
          const ids2 = await ensureFit(ctx, f.brand, f.model);
          fits.set(`${productId}:${ids2.modelId}`, { productId, vehicleBrandId: ids2.brandId, vehicleModelId: ids2.modelId });
        }
      }
      // Yalnızca fark yazılır (bkz. child-rows.ts); fiyat/stok değişiminde bu tablolara dokunulmaz.
      await syncProductChildren(ids, { oems, cats, fits: [...fits.values()] });
      stats.imported += items.length;
    } catch (err) {
      stats.failed += items.length;
      console.error(`Oto İsmail ${brand} grubu yazılamadı:`, err instanceof Error ? err.stack ?? err.message : err);
    }
  };

  for await (const raw of readRows(path)) {
    // Süre bitmeden bırak; yazılanlar kalır, marka tamamlanmış sayılmaz ve sonraki çalışma kaldığı yerden sürer.
    if (stats.total % 500 === 0 && timeLeft() < 45_000) {
      stats.partial = true;
      break;
    }
    stats.total += 1;
    const mapped = mapOtoIsmailRow(raw, ctx.rates);
    if (!mapped) continue;
    const prev = ctx.existing.get(mapped.externalId);
    if (!prev && mapped.stock <= 0 && !IMPORT_OOS) {
      stats.skippedNew += 1;
      continue;
    }
    const hash = contentHash(mapped);
    if (!needsImport(prev, hash, FORCE_FULL)) continue;
    stats.changed += 1;
    batch.push({ raw, mapped, hash });
    if (batch.length >= 200) await flush();
  }
  await flush();
  return stats;
}

async function runSync() {
  const config = otoIsmailConfigFromEnv();
  if (!config && !flag("skip-fetch")) throw new Error("OTOISMAIL_USERNAME / OTOISMAIL_PASSWORD ayarlı değil.");
  mkdirSync(DIR, { recursive: true });

  const state = readState();
  if (flag("fresh") || !state.cycleStartedAt || state.mappingVersion !== MAPPING_VERSION) {
    state.cycleStartedAt = Date.now();
    state.done = {};
    state.mappingVersion = MAPPING_VERSION;
  }

  let brandCodes: string[];
  const client = config ? new OtoIsmailClient(config) : null;
  if (client) await client.login();
  const wanted = (arg("brands") || process.env.OTOISMAIL_BRANDS || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (wanted.length) brandCodes = wanted;
  else if (client) brandCodes = (await client.brands()).map((b) => b.Kod);
  else brandCodes = Object.keys(state.done);
  log(`Oto İsmail: ${brandCodes.length} marka.`);

  let pending = brandCodes.filter((b) => !state.done[b]);
  if (pending.length === 0 && Date.now() - state.cycleStartedAt >= CYCLE_MS) {
    state.cycleStartedAt = Date.now();
    state.done = {};
    pending = brandCodes;
  }
  if (pending.length === 0) {
    log("Bu döngüde işlenecek marka kalmadı.");
    return;
  }

  console.log("Fiyat dilimleri:", JSON.stringify(await useStoredPriceTiers()));
  const supplier = await getSupplier();
  const feedId = await getFeedId(supplier.id);
  const rates = await resolveFxRates();
  log(`Kur: ${JSON.stringify(rates)}`);
  const ctx: Ctx = {
    supplierId: supplier.id,
    rates,
    existing: await loadExistingProducts(supplier.id),
    mfrCache: new Map(),
    catCache: new Map(),
    brandCache: new Map(),
    modelCache: new Map(),
    usedSlugs: new Set(),
  };
  const runId = newId();
  await db.insert(xmlImportRuns).values({ id: runId, feedId, status: IMPORT_RUN_STATUS.RUNNING, startedAt: new Date().toISOString() });

  const totals = { total: 0, imported: 0, failed: 0, skippedNew: 0 };
  for (const brand of pending) {
    if (timeLeft() < 90_000) {
      log("Süre doldu; kalan markalar bir sonraki çalışmada.");
      break;
    }
    const path = fileFor(brand);
    try {
      // Yarım kalan marka bu döngüde zaten indirildiyse dosya yeniden indirilmez.
      const freshFile = existsSync(path) && statSync(path).mtimeMs >= state.cycleStartedAt && !flag("fresh");
      if (client && !flag("skip-fetch") && !freshFile) {
        const t0 = Date.now();
        const rows = await client.products(brand);
        // Boş/şüpheli kısa yanıt mevcut dosyayı ezmesin.
        // Gerçekten ürünü olmayan (daha önce de boş gelmiş) marka hata sayılmaz.
        if (rows.length === 0 && existsSync(path) && statSync(path).size > 0) throw new Error("boş yanıt geldi; mevcut dosya korunuyor");
        await writeNdjson(path, rows);
        log(`${brand}: ${rows.length} ürün indirildi (${Math.round((Date.now() - t0) / 1000)} sn)`);
      }
      if (!existsSync(path)) {
        log(`${brand}: dosya yok, atlandı.`);
        continue;
      }
      const s = await importBrand(ctx, brand, path);
      log(`${brand}: ${s.total} satır, ${s.changed} yeni/değişen, ${s.imported} yazıldı, ${s.skippedNew} stoksuz yeni atlandı, ${s.failed} hata`);
      totals.total += s.total;
      totals.imported += s.imported;
      totals.failed += s.failed;
      totals.skippedNew += s.skippedNew;
      if (s.partial) log(`${brand}: süre doldu, bir sonraki çalışmada devam edecek.`);
      if (s.failed === 0 && !s.partial) {
        state.done[brand] = Date.now();
        writeState(state);
      }
    } catch (err) {
      log(`${brand}: HATA ${err instanceof Error ? err.message : err}`);
      totals.failed += 1;
    }
  }
  writeState(state);

  if (totals.imported > 0) {
    log("Dedupe + görünürlük…");
    const dedupe = await runDedupeCheapest({ compile: false });
    await compileVisibility(db);
    await pruneUnusedCatalog();
    log(`Dedupe: ${dedupe.deactivated} pasif, ${dedupe.activated} aktif.`);
  }
  await db
    .update(xmlImportRuns)
    .set({
      status: totals.failed ? IMPORT_RUN_STATUS.COMPLETED_WITH_WARNINGS : IMPORT_RUN_STATUS.COMPLETED,
      finishedAt: new Date().toISOString(),
      total: totals.total,
      createdCount: totals.imported,
      failedCount: totals.failed,
    })
    .where(eq(xmlImportRuns.id, runId));
  log(`Bitti: ${JSON.stringify(totals)}`);
}

// ───────────────────────── görsel tamamlama ─────────────────────────

function isImage(buf: Buffer): boolean {
  if (buf.length < 1_000) return false;
  if (buf[0] === 0xff && buf[1] === 0xd8) return true;
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return true;
  return buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP";
}

async function toWebp(buf: Buffer): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  sharp.concurrency(1);
  return sharp(buf)
    .flatten({ background: "#ffffff" })
    .resize({ width: 800, height: 800, fit: "contain", background: "#ffffff" })
    .webp({ quality: 80 })
    .toBuffer();
}

/** "VAL-877634" gibi Altay kodlarında önek marka kısaltmasıdır; Başbuğ/diğerleri için sku'nun kendisi de denenir. */
function skuPartCandidates(sku: string): string[] {
  const list = [normalizeOem(sku)];
  if (sku.includes("-")) list.push(normalizeOem(sku.slice(sku.indexOf("-") + 1)));
  if (sku.includes(" ")) list.push(normalizeOem(sku.slice(sku.indexOf(" ") + 1)));
  return list.filter((s) => s.length >= 5);
}

async function runImages() {
  mkdirSync(IMAGE_STATE_DIR, { recursive: true });
  const limit = Number(arg("limit") || Infinity);
  const delay = Number(process.env.OTOISMAIL_IMAGE_DELAY_MS || 200);

  const done = new Set<string>();
  if (existsSync(IMAGE_DONE_FILE)) {
    for (const l of readFileSync(IMAGE_DONE_FILE, "utf8").split("\n")) {
      const [id, status, at] = l.split("\t");
      // Hata alanlar 24 saat sonra, görseli olmayanlar 30 gün sonra yeniden denenir.
      const age = Date.now() - Number(at || 0);
      if (id && (status === "ok" || (status === "noimage" && age < 30 * 86400_000) || (status === "error" && age < 86400_000))) done.add(id);
    }
  }

  // Görseli olmayan aktif ürünler parça parça (id sırasıyla) işlenir; bkz. image-cursor.ts.
  // Anahtar = üretici slug + normalize numara (OEM'ler + sku parçaları).
  type Cand = { id: string; sku: string; name: string; mslug: string; oems: string | null };
  const loadChunk = async (afterId: string, chunk: number) => {
    const [rows] = await pool.query(
      `select p.id, p.sku, p.name, m.slug mslug,
              (select group_concat(o.normalized separator ',') from product_oems o where o.product_id = p.id) oems
         from products p
         join manufacturers m on m.id = p.manufacturer_id
        where p.status = 'active'
          and p.id > ?
          and not exists (select 1 from product_images pi where pi.product_id = p.id)
        order by p.id
        limit ?`,
      [afterId, chunk],
    );
    return rows as Cand[];
  };
  const files = existsSync(DIR) ? readdirSync(DIR).filter((f) => f.endsWith(".ndjson")) : [];
  if (files.length === 0) {
    log("Oto İsmail dosyaları yok (önce senkron çalıştırın).");
    return;
  }

  const stats = { ok: 0, noimage: 0, error: 0 };
  let handled = 0;
  let stopped = false;
  let wraps = 0;
  // Her parça Oto İsmail dosyalarını (~500 MB) bir kez tarar; tek çalışma tüm kataloğu dolaşmasın.
  for (let chunkNo = 0; chunkNo < 10 && !stopped && handled < limit && timeLeft() > 3 * 60_000; chunkNo++) {
    const { rows, wrapped } = await nextImageChunk(IMAGE_CURSOR_FILE, loadChunk);
    if (wrapped && ++wraps > 1) break;
    if (rows.length === 0) break;
    const chunkEnd = rows[rows.length - 1]!.id;

    const index = new Map<string, Cand[]>();
    for (const c of rows) {
      if (done.has(c.id)) continue;
      const keys = new Set([...skuPartCandidates(c.sku), ...(c.oems ? c.oems.split(",").filter((s) => s.length >= 5) : [])]);
      for (const k of keys) {
        const key = `${c.mslug}::${k}`;
        const list = index.get(key);
        if (list) list.push(c);
        else index.set(key, [c]);
      }
    }
    if (index.size === 0) {
      writeImageCursor(IMAGE_CURSOR_FILE, chunkEnd);
      continue;
    }

    // Oto İsmail dosyalarını tara; eşleşen ürün başına ilk görsel adresi alınır.
    const found = new Map<string, { cand: Cand; url: string }>();
    for (const file of files) {
      for await (const raw of readRows(join(DIR, file))) {
        const url = otoIsmailImageUrl(raw);
        if (!url) continue;
        for (const key of imageMatchKeys(raw)) {
          const hit = index.get(key);
          if (!hit) continue;
          for (const cand of hit) if (!found.has(cand.id)) found.set(cand.id, { cand, url });
        }
      }
    }
    // İmleç id sırasıyla ilerlediği için eşleşmeler de id sırasıyla işlenir.
    const matches = [...found.values()].sort((a, b) => (a.cand.id < b.cand.id ? -1 : 1));
    log(`Parça (${rows.length} ürün, ${chunkEnd.slice(0, 8)}…'e kadar): ${matches.length} üründe Oto İsmail görseli bulundu.`);

    let lastHandled: string | null = null;
    let finishedChunk = true;
    for (const { cand, url } of matches) {
      if (handled >= limit || timeLeft() < 60_000) {
        finishedChunk = false;
        break;
      }
      handled += 1;
      let status: "ok" | "noimage" | "error" = "noimage";
      try {
        const res = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(30_000) });
        if (res.ok) {
          const buf = Buffer.from(await res.arrayBuffer());
          if (isImage(buf)) {
            const shard = createHash("md5").update(cand.id).digest("hex").slice(0, 2);
            const file = `${slugify(cand.sku) || cand.id}.webp`;
            mkdirSync(join(IMAGE_DIR, shard), { recursive: true });
            await writeFile(join(IMAGE_DIR, shard, file), await toWebp(buf));
            await db.insert(productImages).values({
              id: newId(),
              productId: cand.id,
              s3Key: `urun-gorsel/${shard}/${file}`,
              url: `${IMAGE_BASE}/${shard}/${file}`,
              alt: cand.name.slice(0, 255),
              sortOrder: 0,
            });
            status = "ok";
          }
        } else if (res.status >= 500 || res.status === 429 || res.status === 403) {
          log(`Görsel sunucusu ${res.status} döndü; çalışma durduruluyor.`);
          stopped = true;
          finishedChunk = false;
          break;
        }
      } catch (err) {
        status = "error";
        log(`${cand.sku}: ${err instanceof Error ? err.message : err}`);
      }
      stats[status] += 1;
      writeFileSync(IMAGE_DONE_FILE, `${cand.id}\t${status}\t${Date.now()}\n`, { flag: "a" });
      lastHandled = cand.id;
      if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    }
    // Parça bittiyse sonuna, yarıda kaldıysa son işlenen ürüne ilerlenir (eşleşmeyenler atlanmış olur).
    if (finishedChunk) writeImageCursor(IMAGE_CURSOR_FILE, chunkEnd);
    else if (lastHandled) writeImageCursor(IMAGE_CURSOR_FILE, lastHandled);
  }
  log(`Görsel: ${stats.ok} eklendi, ${stats.noimage} görselsiz/bozuk, ${stats.error} hata.`);
}

async function main() {
  mkdirSync(DIR, { recursive: true });
  if (!(await acquireLock())) {
    log("Başka bir Oto İsmail çalışması sürüyor; çıkılıyor.");
    return;
  }
  try {
    if (MODE_IMAGES) await runImages();
    else await runSync();
  } finally {
    await rm(LOCK_FILE, { force: true });
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
