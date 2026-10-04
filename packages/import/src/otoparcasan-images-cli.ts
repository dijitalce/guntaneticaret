/**
 * Altay ürünlerinin görsellerini otoparcasan.com'dan alır (izinli kaynak).
 *
 *   1. Haftada bir: otoparcasan ürün site haritalarını indirir, Altay ürünlerini
 *      "marka + üretici parça no" ile ürün adresine eşler (yalnızca ikisi birlikte tutarsa).
 *   2. Görseli olmayan aktif Altay ürünleri için (stoktakiler önce) ürün sayfasından
 *      ürünün kendi tam boyutlu görselini indirir, guntan-images/files altına yazar,
 *      product_images'a ekler.
 *
 * robots.txt Crawl-delay: 5 → otoparcasan.com'a 5 sn'de en fazla bir istek.
 * Her çalışma OTOPARCASAN_MAX_MINUTES (varsayılan 25) dk sürer; kaldığı yeri dosyaya yazar.
 *
 * Kullanım: bash scripts/otoparcasan-images.sh  [--rebuild-map] [--repair] [--limit=N]
 */
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { open, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSyncEnv, syncHomeDir } from "./sync-env";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const SYNC_HOME = syncHomeDir(loadSyncEnv(root));

const SITE = "https://otoparcasan.com";
const UA = "Mozilla/5.0 (compatible; GuntanImageSync/1.0; +https://guntanotoyedekparca.com)";
const CRAWL_DELAY_MS = 5_000;
const MAP_MAX_AGE_MS = 7 * 24 * 3600_000;
const ERROR_RETRY_MS = 24 * 3600_000;
const MAX_MS = Number(process.env.OTOPARCASAN_MAX_MINUTES || 25) * 60_000;
const LIMIT = Number(process.argv.find((a) => a.startsWith("--limit="))?.slice(8) || Infinity);
const REBUILD = process.argv.includes("--rebuild-map");
const SUPPLIER_CODE = "DEMO";

const STATE_DIR = join(SYNC_HOME, "guntan-images");
const MAP_FILE = join(STATE_DIR, "otoparcasan-map.tsv");
const DONE_FILE = join(STATE_DIR, "otoparcasan-done.tsv");
const LOCK_FILE = join(STATE_DIR, "otoparcasan.lock");
const LOG_FILE = join(STATE_DIR, "otoparcasan.log");
// Hostinger deploy public_html'i sıfırlıyor; dosyalar burada durur, /urun-gorsel/* adresini hostinger-start.mjs sunar.
const IMAGE_DIR = process.env.PRODUCT_IMAGE_DIR || join(STATE_DIR, "files");
const REPAIR = process.argv.includes("--repair");
const IMAGE_BASE = `${(process.env.STOREFRONT_URL || "https://guntanotoyedekparca.com").replace(/\/$/, "")}/urun-gorsel`;

/** Altay marka adı → otoparcasan adresindeki marka yazımları. */
const BRAND_ALIASES: Record<string, string[]> = {
  BLUEPRIN: ["blueprint", "blue-print"],
  "V.REINZ": ["reinz", "victor-reinz"],
  NURAL: ["goetze"],
};
/** Orijinal parça numarası taşıyan markalar; otoparcasan bunları "orjinal" diye listeler. */
const OE_BRANDS = new Set(["ORIJINAL", "MOBIS"]);

const started = Date.now();
const timeLeft = () => MAX_MS - (Date.now() - started);

function log(message: string) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  try {
    if (existsSync(LOG_FILE) && statSync(LOG_FILE).size > 2_000_000) renameSync(LOG_FILE, `${LOG_FILE}.old`);
    appendFileSync(LOG_FILE, `${line}\n`);
  } catch {
    /* log yazılamazsa devam edilir */
  }
}

function slugify(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const compact = (value: string) => slugify(value).replaceAll("-", "");

/** "VAL-877634" → "877634": Altay kodu marka kısaltması + üretici parça no. */
function partNumber(sku: string) {
  return compact(sku.includes("-") ? sku.slice(sku.indexOf("-") + 1) : sku);
}

let lastSiteRequest = 0;
async function siteFetch(url: string): Promise<Response> {
  const wait = lastSiteRequest + CRAWL_DELAY_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastSiteRequest = Date.now();
  return fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(30_000) });
}

class StopRun extends Error {}

function assertNotThrottled(res: Response) {
  if (res.status === 429 || res.status === 403 || res.status >= 500) {
    throw new StopRun(`otoparcasan ${res.status} döndü; bu çalışma durduruluyor.`);
  }
}

type Candidate = { id: string; sku: string; name: string; manufacturer: string | null };

async function loadAltayProducts(onlyWithoutImage: boolean): Promise<Candidate[]> {
  const { pool } = await import("@guntan/db");
  const [rows] = await pool.query(
    `select p.id, p.sku, p.name, m.name manufacturer
       from products p
       join suppliers s on s.id = p.supplier_id and s.code = ?
       left join manufacturers m on m.id = p.manufacturer_id
      where p.status = 'active'
        ${onlyWithoutImage ? "and not exists (select 1 from product_images pi where pi.product_id = p.id)" : ""}
      order by p.stock_qty desc`,
    [SUPPLIER_CODE],
  );
  return rows as Candidate[];
}

async function rebuildMap() {
  log("Eşleme tablosu yeniden oluşturuluyor (site haritaları indiriliyor)…");
  const products = await loadAltayProducts(false);
  const byPart = new Map<string, Candidate[]>();
  for (const p of products) {
    const part = partNumber(p.sku);
    if (part.length < 3 || !p.manufacturer) continue;
    const list = byPart.get(part) ?? [];
    list.push(p);
    byPart.set(part, list);
  }

  const index = await siteFetch(`${SITE}/sitemap/urun.xml`);
  assertNotThrottled(index);
  const sitemaps = [...(await index.text()).matchAll(/<loc>([^<]+urun-\d+\.xml)<\/loc>/g)].map((m) => m[1]!);
  if (sitemaps.length === 0) throw new Error("Ürün site haritası boş geldi.");

  const matched = new Map<string, string>();
  let urlCount = 0;
  for (const sitemap of sitemaps) {
    const res = await siteFetch(sitemap);
    assertNotThrottled(res);
    for (const m of (await res.text()).matchAll(/<loc>https:\/\/otoparcasan\.com\/([^<]+)<\/loc>/g)) {
      urlCount += 1;
      const slug = m[1]!;
      const parts = slug.split("-");
      for (let k = 1; k <= 4 && k < parts.length; k++) {
        const candidates = byPart.get(parts.slice(-k).join(""));
        if (!candidates) continue;
        const before = parts.slice(0, -k).join("-");
        for (const p of candidates) {
          if (matched.has(p.id)) continue;
          const brands = [slugify(p.manufacturer!), ...(BRAND_ALIASES[p.manufacturer!] ?? [])];
          if (OE_BRANDS.has(p.manufacturer!) && partNumber(p.sku).length >= 8) brands.push("orjinal", "orjin");
          if (brands.some((b) => before === b || before.endsWith(`-${b}`))) matched.set(p.id, slug);
        }
      }
    }
  }

  const tmp = `${MAP_FILE}.tmp`;
  writeFileSync(tmp, [...matched].map(([id, slug]) => `${id}\t${slug}`).join("\n"));
  renameSync(tmp, MAP_FILE);
  log(`Eşleme: ${urlCount} otoparcasan ürünü, ${products.length} Altay ürünü, ${matched.size} eşleşme.`);
}

function readTsv(file: string): string[][] {
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => l.split("\t"));
}

function isImage(buf: Buffer): boolean {
  if (buf.length < 2_000) return false;
  if (buf[0] === 0xff && buf[1] === 0xd8) return true;
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return true;
  return buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP";
}

/**
 * Orijinaller 1000px PNG'ye kadar çıkıyor (~300 KB); 86 bin üründe kotayı doldurmasın diye küçültülür.
 * Vitrin görselleri kare alanda object-fit: cover ile gösterir; yatay görsel kırpılmasın diye beyazla kareye tamamlanır.
 */
async function toWebp(buf: Buffer): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  // Barındırma süreç sınırı iş parçacıklarını da sayar.
  sharp.concurrency(1);
  return sharp(buf)
    .flatten({ background: "#ffffff" })
    .resize({ width: 800, height: 800, fit: "contain", background: "#ffffff" })
    .webp({ quality: 80 })
    .toBuffer();
}

/** Ürün sayfasındaki, adı sayfa adresiyle aynı olan tam boyutlu görsel (ilgili ürünlerinki değil). */
function ownImageUrl(html: string, slug: string): string | null {
  const escaped = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`https://image\\.otoparcasan\\.com/[^"'\\s]+?/fit-in/0x0/[^"'\\s]*?/products/${escaped}\\.(?:png|jpe?g|webp)`, "i");
  return html.match(re)?.[0] ?? null;
}

async function processProduct(p: Candidate, slug: string): Promise<"ok" | "noimage"> {
  const page = await siteFetch(`${SITE}/${slug}`);
  assertNotThrottled(page);
  if (page.status === 404 || page.status === 410) return "noimage";
  if (!page.ok) throw new Error(`sayfa ${page.status}`);
  const imageUrl = ownImageUrl(await page.text(), slug);
  if (!imageUrl) return "noimage";

  const img = await fetch(imageUrl, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(30_000) });
  if (!img.ok) return "noimage";
  const buf = Buffer.from(await img.arrayBuffer());
  if (!isImage(buf)) return "noimage";

  const shard = createHash("md5").update(p.id).digest("hex").slice(0, 2);
  const file = `${slugify(p.sku) || p.id}.webp`;
  mkdirSync(join(IMAGE_DIR, shard), { recursive: true });
  await writeFile(join(IMAGE_DIR, shard, file), await toWebp(buf));

  const { db, newId, productImages } = await import("@guntan/db");
  await db.insert(productImages).values({
    id: newId(),
    productId: p.id,
    s3Key: `urun-gorsel/${shard}/${file}`,
    url: `${IMAGE_BASE}/${shard}/${file}`,
    alt: p.name.slice(0, 255),
    sortOrder: 0,
  });
  return "ok";
}

/** Dosyası kaybolmuş görsel kayıtlarını siler ve ürünleri yeniden sıraya alır. */
async function repairMissingFiles() {
  const { pool } = await import("@guntan/db");
  const [rows] = await pool.query(`select id, product_id, s3_key from product_images where s3_key like 'urun-gorsel/%'`);
  const missing = (rows as { id: string; product_id: string; s3_key: string }[]).filter(
    (r) => !existsSync(join(IMAGE_DIR, r.s3_key.slice("urun-gorsel/".length))),
  );
  if (missing.length > 0) {
    for (let i = 0; i < missing.length; i += 500) {
      await pool.query(`delete from product_images where id in (?)`, [missing.slice(i, i + 500).map((r) => r.id)]);
    }
    const lost = new Set(missing.map((r) => r.product_id));
    const kept = readTsv(DONE_FILE).filter(([id]) => !lost.has(id!));
    writeFileSync(DONE_FILE, kept.map((r) => `${r.join("\t")}\n`).join(""));
  }
  log(`Onarım: ${(rows as unknown[]).length} görsel kaydından ${missing.length} tanesinin dosyası yoktu; silindi, ürünler yeniden sırada.`);
}

async function acquireLock(): Promise<boolean> {
  if (existsSync(LOCK_FILE) && Date.now() - statSync(LOCK_FILE).mtimeMs > MAX_MS + 10 * 60_000) await rm(LOCK_FILE, { force: true });
  try {
    const fh = await open(LOCK_FILE, "wx");
    await fh.write(String(process.pid));
    await fh.close();
    return true;
  } catch {
    return false;
  }
}

async function main() {
  mkdirSync(STATE_DIR, { recursive: true });
  if (!(await acquireLock())) {
    log("Başka bir görsel senkronu çalışıyor; çıkılıyor.");
    return;
  }
  try {
    if (REPAIR) await repairMissingFiles();
    if (REBUILD || !existsSync(MAP_FILE) || Date.now() - statSync(MAP_FILE).mtimeMs > MAP_MAX_AGE_MS) await rebuildMap();

    const map = new Map(readTsv(MAP_FILE).map(([id, slug]) => [id!, slug!]));
    const done = new Map<string, { status: string; at: number }>();
    for (const [id, status, at] of readTsv(DONE_FILE)) done.set(id!, { status: status!, at: Number(at) });

    const queue = (await loadAltayProducts(true)).filter((p) => {
      if (!map.has(p.id)) return false;
      const prev = done.get(p.id);
      if (!prev) return true;
      return prev.status === "error" && Date.now() - prev.at > ERROR_RETRY_MS;
    });
    log(`Sırada ${queue.length} ürün (eşleşen ${map.size}, işlenmiş ${done.size}).`);

    const stats = { ok: 0, noimage: 0, error: 0 };
    for (const p of queue) {
      if (stats.ok + stats.noimage + stats.error >= LIMIT || timeLeft() < 60_000) break;
      let status: "ok" | "noimage" | "error";
      try {
        status = await processProduct(p, map.get(p.id)!);
      } catch (err) {
        if (err instanceof StopRun) {
          log(err.message);
          break;
        }
        status = "error";
        log(`${p.sku}: ${err instanceof Error ? err.message : err}`);
      }
      stats[status] += 1;
      appendFileSync(DONE_FILE, `${p.id}\t${status}\t${Date.now()}\n`);
    }
    log(`Bitti: ${stats.ok} görsel eklendi, ${stats.noimage} üründe görsel yok, ${stats.error} hata.`);
  } finally {
    await rm(LOCK_FILE, { force: true });
    const { pool } = await import("@guntan/db");
    await pool.end();
  }
}

main().catch((err) => {
  log(`HATA: ${err instanceof Error ? err.stack ?? err.message : err}`);
  process.exit(1);
});
