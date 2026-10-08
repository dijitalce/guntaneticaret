/**
 * Görseli olmayan ürünlerin görsellerini parcatedarik.com'dan alır.
 *
 *   1. Tarama: bizdeki görselsiz ürünlerin üreticilerine karşılık gelen marka listeleme
 *      sayfalarını (sayfa başına 120 ürün) gezer; her ürünün başlığını ve görsel adresini
 *      parcatedarik-index.tsv dosyasına yazar. Ayda bir baştan taranır.
 *   2. Eşleme: başlıktaki marka ile parça numarası, bizdeki üretici ve SKU ile birlikte
 *      tutarsa ürün eşlenir. Listeleme sayfası markayı değil başlık belirler: "psa" sayfası
 *      GM (Opel) orijinallerini de listeliyor.
 *   3. İndirme: eşlenen ürünün tam boyutlu görselini indirir, guntan-images/files altına
 *      yazar, product_images'a ekler. Birçok üründe ortak kullanılan afiş görselleri ayıklanır.
 *
 * parcatedarik.com'a PARCATEDARIK_DELAY_MS (varsayılan 2000) aralıkla en fazla bir istek.
 * Her çalışma PARCATEDARIK_MAX_MINUTES (varsayılan 14) dk sürer; kaldığı yeri dosyaya yazar.
 *
 * Kullanım: bash scripts/parcatedarik-images.sh  [--recrawl] [--limit=N] [--report]
 *   --report: indirmeden eşleşme sayılarını ve örnek eşleşmeleri log'a yazar.
 */
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { open, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSyncEnv, syncHomeDir } from "./sync-env";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const SYNC_HOME = syncHomeDir(loadSyncEnv(root));

const SITE = "https://parcatedarik.com";
const UA = "Mozilla/5.0 (compatible; GuntanImageSync/1.0; +https://guntanotoyedekparca.com)";
const CRAWL_DELAY_MS = Number(process.env.PARCATEDARIK_DELAY_MS || 2_000);
const RECRAWL_AFTER_MS = 30 * 24 * 3600_000;
const ERROR_RETRY_MS = 24 * 3600_000;
const MAX_MS = Number(process.env.PARCATEDARIK_MAX_MINUTES || 14) * 60_000;
const LIMIT = Number(process.argv.find((a) => a.startsWith("--limit="))?.slice(8) || Infinity);
const RECRAWL = process.argv.includes("--recrawl");
const REPORT = process.argv.includes("--report");
const PAGE_SIZE = 120;

const STATE_DIR = join(SYNC_HOME, "guntan-images");
const INDEX_FILE = join(STATE_DIR, "parcatedarik-index.tsv");
const CRAWL_FILE = join(STATE_DIR, "parcatedarik-crawl.json");
const DONE_FILE = join(STATE_DIR, "parcatedarik-done.tsv");
const GENERIC_FILE = join(STATE_DIR, "parcatedarik-generic.txt");
const LOCK_FILE = join(STATE_DIR, "parcatedarik.lock");
const LOG_FILE = join(STATE_DIR, "parcatedarik.log");
const IMAGE_DIR = process.env.PRODUCT_IMAGE_DIR || join(STATE_DIR, "files");
const IMAGE_BASE = `${(process.env.STOREFRONT_URL || "https://guntanotoyedekparca.com").replace(/\/$/, "")}/urun-gorsel`;

/**
 * Bizdeki üretici adı → parcatedarik başlığındaki marka yazımları (boşluksuz, küçük harf).
 * Listede olmayanlar için üretici adının kendisi kullanılır ("OE-"/"IOE-" öneki atılarak).
 */
const BRAND_ALIASES: Record<string, string[]> = {
  "OE-PSA": ["psa", "peugeot", "citroen"],
  "IOE-PSA": ["psa", "peugeot", "citroen"],
  "OE-OPEL": ["gm", "opel"],
  "IOE-OPEL": ["gm", "opel"],
  "OE-FD": ["ford"],
  "IOE-FD": ["ford"],
  "IOE-VW": ["vw", "volkswagen"],
  "OE-MB": ["mercedes", "mercedesbenz"],
  "OE-HYU": ["hyundai", "mobis"],
  "IOE-HYU": ["hyundai", "mobis"],
  "IOE-LAND": ["landrover"],
  MOBIS: ["mobis", "hyundai", "kia"],
  FEBI: ["febi", "febibilstein"],
  "M.MARELLI": ["magnetimarelli", "marelli"],
  HENGST: ["hengst", "hengstfilter"],
  MANN: ["mann", "mannfilter"],
  "V.REINZ": ["reinz", "victorreinz"],
  "VIEW MAX": ["viewmax"],
  LEMFORDE: ["lemforder"],
  SNR: ["snr", "ntnsnr"],
  BLUEPRIN: ["blueprint"],
  NURAL: ["goetze", "nural"],
  "KALE BALATA": ["kale"],
  VERNET: ["vernet", "calorstat"],
  "SACHS YA": ["sachs"],
};
/** Bizdeki üretici adı → taranacak parcatedarik marka sayfaları (adı doğrudan tutmayanlar). */
const SLUG_ALIASES: Record<string, string[]> = {
  "OE-OPEL": ["psa"],
  "IOE-OPEL": ["psa"],
  "OE-FD": ["ford"],
  "IOE-FD": ["ford"],
  "IOE-VW": ["vw"],
  "OE-MB": ["mercedes-benz"],
  "OE-HYU": ["hyundai", "mobis"],
  "IOE-HYU": ["hyundai", "mobis"],
  "IOE-LAND": ["land-rover"],
  FEBI: ["febi-bilstein"],
  "M.MARELLI": ["magneti-marelli"],
  HENGST: ["hengst-filter"],
  "V.REINZ": ["victor-reinz"],
  "VIEW MAX": ["viewmax"],
  LEMFORDE: ["lemforder"],
  SNR: ["ntn-snr"],
  BLUEPRIN: ["blue-print"],
  NURAL: ["goetze"],
  "KALE BALATA": ["kale"],
  VERNET: ["calorstat-by-vernet"],
  "SACHS YA": ["sachs"],
};

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
const baseBrand = (mfr: string) => mfr.replace(/^I?OE-/, "");
const brandKeys = (mfr: string) => BRAND_ALIASES[mfr] ?? [compact(baseBrand(mfr))];
const brandSlugs = (mfr: string) => SLUG_ALIASES[mfr] ?? [slugify(baseBrand(mfr))];

/** Eşlemede kullanılan parça numarası anahtarları: "BSG 30-700-448" → bsg30700448, 30700448. */
function skuKeys(sku: string): string[] {
  const keys = new Set([compact(sku)]);
  const m = sku.match(/^([A-Za-z]{2,6})[\s-]+(.+)$/);
  if (m) keys.add(compact(m[2]!));
  return [...keys].filter((k) => k.length >= 4 && /\d/.test(k));
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<");
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
    throw new StopRun(`parcatedarik ${res.status} döndü; bu çalışma durduruluyor.`);
  }
}

type Candidate = { id: string; sku: string; name: string; manufacturer: string | null };

async function loadProductsWithoutImage(): Promise<Candidate[]> {
  const { pool } = await import("@guntan/db");
  const [rows] = await pool.query(
    `select p.id, p.sku, p.name, m.name manufacturer
       from products p
       left join manufacturers m on m.id = p.manufacturer_id
      where p.status = 'active'
        and p.manufacturer_id is not null
        and not exists (select 1 from product_images pi where pi.product_id = p.id)
      order by p.stock_qty desc`,
  );
  return rows as Candidate[];
}

function readTsv(file: string): string[][] {
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => l.split("\t"));
}

/* ---------- 1. Tarama ---------- */

type CrawlState = {
  startedAt: number;
  finishedAt: number | null;
  /** Taranacak marka sayfaları, sırayla. */
  slugs: string[];
  /** Sayfa sayısı bilinen markalar ve sıradaki sayfa. */
  progress: Record<string, { pages: number; next: number }>;
};

function readCrawlState(): CrawlState | null {
  if (!existsSync(CRAWL_FILE)) return null;
  return JSON.parse(readFileSync(CRAWL_FILE, "utf8")) as CrawlState;
}

function writeCrawlState(state: CrawlState) {
  writeFileSync(`${CRAWL_FILE}.tmp`, JSON.stringify(state));
  renameSync(`${CRAWL_FILE}.tmp`, CRAWL_FILE);
}

/** Görselsiz ürünü en çok olan üreticilerin marka sayfaları önce taranır. */
async function planCrawl(products: Candidate[]): Promise<CrawlState> {
  const res = await siteFetch(`${SITE}/sitemap-1.xml`);
  assertNotThrottled(res);
  const known = new Set(
    [...(await res.text()).matchAll(/<loc>https:\/\/parcatedarik\.com\/([^<\/]+)<\/loc>/g)].map((m) => m[1]!),
  );
  const weight = new Map<string, number>();
  for (const p of products) {
    for (const slug of brandSlugs(p.manufacturer!)) {
      if (known.has(slug)) weight.set(slug, (weight.get(slug) ?? 0) + 1);
    }
  }
  const slugs = [...weight].sort((a, b) => b[1] - a[1]).map(([s]) => s);
  log(`Tarama planı: ${slugs.length} marka sayfası (${slugs.slice(0, 12).join(", ")}…).`);
  return { startedAt: Date.now(), finishedAt: null, slugs, progress: {} };
}

type ListedItem = { productId: string; title: string; image: string };

function parseListing(html: string): { items: ListedItem[]; lastPage: number } {
  const items: ListedItem[] = [];
  for (const chunk of html.split("data-productid=").slice(1)) {
    const productId = chunk.match(/^"?(\d+)/)?.[1];
    const title = chunk.match(/title="([^"]*)"/)?.[1];
    const thumb = chunk.match(/data-lazyloadsrc="?(https:\/\/parcatedarik\.com\/images\/thumbs\/[^"\s>]+)/)?.[1];
    if (!productId || !title || !thumb || thumb.includes("default-image")) continue;
    items.push({
      productId,
      title: decodeEntities(title).replace(/\s+/g, " ").trim().split(" ").slice(0, 14).join(" "),
      image: thumb.replace(/_\d+(\.[a-z]+(?:-pk\.webp)?)$/i, "$1"),
    });
  }
  const pages = [...html.matchAll(/pagenumber=(\d+)/g)].map((m) => Number(m[1]));
  return { items, lastPage: Math.max(1, ...pages) };
}

/** Tarama süresi bitene kadar marka sayfalarını gezer; tamamlandıysa true döner. */
async function crawl(state: CrawlState, budgetMs: number): Promise<boolean> {
  const until = Date.now() + budgetMs;
  for (const slug of state.slugs) {
    const prog = state.progress[slug] ?? { pages: 0, next: 1 };
    while (prog.pages === 0 || prog.next <= prog.pages) {
      if (Date.now() > until || timeLeft() < 60_000) return false;
      const res = await siteFetch(`${SITE}/${slug}?pagesize=${PAGE_SIZE}&pagenumber=${prog.next}`);
      assertNotThrottled(res);
      if (res.status === 404) {
        prog.pages = prog.next - 1;
        break;
      }
      if (!res.ok) throw new Error(`${slug} sayfa ${prog.next}: ${res.status}`);
      const { items, lastPage } = parseListing(await res.text());
      if (prog.pages === 0) prog.pages = lastPage;
      if (items.length > 0) {
        appendFileSync(INDEX_FILE, items.map((i) => `${i.productId}\t${i.title}\t${i.image}\n`).join(""));
      }
      prog.next += 1;
      state.progress[slug] = prog;
      writeCrawlState(state);
    }
    state.progress[slug] = prog;
  }
  state.finishedAt = Date.now();
  writeCrawlState(state);
  return true;
}

/* ---------- 2. Eşleme ---------- */

/**
 * Başlık "MARKA [MARKA] KOD Ürün adı …" biçiminde; kodun kaç kelime sürdüğü belli değil
 * ("BREMBO P 06 019 Fren…"). Marka kelimesinden sonraki 1–5 kelimelik pencereler denenir,
 * en uzun tutan eşleşme alınır.
 */
function buildMatches(products: Candidate[]): Map<string, { image: string; title: string }> {
  const byKey = new Map<string, Candidate[]>();
  for (const p of products) {
    for (const key of skuKeys(p.sku)) {
      const list = byKey.get(key) ?? [];
      list.push(p);
      byKey.set(key, list);
    }
  }

  const matched = new Map<string, { image: string; title: string; len: number }>();
  const seen = new Set<string>();
  for (const [productId, title, image] of readTsv(INDEX_FILE)) {
    if (!title || !image || seen.has(productId!)) continue;
    seen.add(productId!);
    const words = title.split(" ");
    for (let b = 1; b <= 3 && b < words.length; b++) {
      const brand = compact(words.slice(0, b).join(" "));
      let start = b;
      if (compact(words[start] ?? "") === brand) start += 1;
      for (let len = 5; len >= 1; len--) {
        if (start + len > words.length) continue;
        const key = compact(words.slice(start, start + len).join(" "));
        const withBrand = compact(words.slice(start - 1, start + len).join(" "));
        const candidates = [...(byKey.get(key) ?? []), ...(byKey.get(withBrand) ?? [])];
        for (const p of candidates) {
          if (!brandKeys(p.manufacturer!).includes(brand)) continue;
          const prev = matched.get(p.id);
          if (!prev || prev.len < len) matched.set(p.id, { image, title, len });
        }
      }
    }
  }
  return new Map([...matched].map(([id, m]) => [id, { image: m.image, title: m.title }]));
}

function report(products: Candidate[], matches: Map<string, { image: string; title: string }>) {
  const byMfr = new Map<string, number>();
  const samples: string[] = [];
  for (const p of products) {
    const m = matches.get(p.id);
    if (!m) continue;
    byMfr.set(p.manufacturer!, (byMfr.get(p.manufacturer!) ?? 0) + 1);
    if (samples.length < 40 && Math.random() < 0.02) samples.push(`${p.manufacturer} | ${p.sku} | ${p.name.slice(0, 40)}  ⇢  ${m.title}`);
  }
  log(`Rapor: ${matches.size} eşleşme. Üreticiye göre: ${[...byMfr].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, v]) => `${k}:${v}`).join(" ")}`);
  for (const s of samples) log(`  ${s}`);
}

/* ---------- 3. İndirme ---------- */

function isImage(buf: Buffer): boolean {
  if (buf.length < 2_000) return false;
  if (buf[0] === 0xff && buf[1] === 0xd8) return true;
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return true;
  return buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP";
}

/** Vitrin kare alanda gösterir; yatay görsel kırpılmasın diye beyazla kareye tamamlanır. */
async function toWebp(buf: Buffer): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  sharp.concurrency(1);
  return sharp(buf)
    .flatten({ background: "#ffffff" })
    .resize({ width: 800, height: 800, fit: "contain", background: "#ffffff", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
}

/**
 * parcatedarik birçok üründe gerçek fotoğraf yerine aynı marka afişini ("Genuine Parts" vb.)
 * kullanıyor. Aynı dosya GENERIC_MIN_REPEAT farklı üründe çıkarsa afiş sayılır: bir daha
 * kullanılmaz, daha önce eklendiği ürünlerden de silinir.
 */
const GENERIC_MIN_REPEAT = 3;

type ImageLedger = {
  generic: Set<string>;
  /** Görsel parmak izi → bu görselle eklenmiş ürünler. */
  added: Map<string, string[]>;
};

function readLedger(done: string[][]): ImageLedger {
  const generic = new Set(existsSync(GENERIC_FILE) ? readFileSync(GENERIC_FILE, "utf8").split("\n").filter(Boolean) : []);
  const latest = new Map<string, { status: string; hash?: string }>();
  for (const [id, status, , hash] of done) latest.set(id!, { status: status!, hash });
  const added = new Map<string, string[]>();
  for (const [id, { status, hash }] of latest) {
    if (status !== "ok" || !hash) continue;
    added.set(hash, [...(added.get(hash) ?? []), id]);
  }
  return { generic, added };
}

async function purgeGeneric(hash: string, ledger: ImageLedger) {
  ledger.generic.add(hash);
  appendFileSync(GENERIC_FILE, `${hash}\n`);
  const ids = ledger.added.get(hash) ?? [];
  ledger.added.delete(hash);
  if (ids.length === 0) return;
  const { pool } = await import("@guntan/db");
  const [rows] = await pool.query(`select s3_key from product_images where product_id in (?)`, [ids]);
  for (const r of rows as { s3_key: string }[]) {
    await rm(join(IMAGE_DIR, r.s3_key.slice("urun-gorsel/".length)), { force: true });
  }
  await pool.query(`delete from product_images where product_id in (?)`, [ids]);
  appendFileSync(DONE_FILE, ids.map((id) => `${id}\tgeneric\t${Date.now()}\t${hash}\n`).join(""));
  log(`Afiş görseli ayıklandı (${hash.slice(0, 8)}): ${ids.length} üründen silindi.`);
}

async function processProduct(
  p: Candidate,
  imageUrl: string,
  ledger: ImageLedger,
): Promise<{ status: "ok" | "noimage" | "generic"; hash?: string }> {
  const img = await siteFetch(imageUrl);
  assertNotThrottled(img);
  if (!img.ok) return { status: "noimage" };
  const buf = Buffer.from(await img.arrayBuffer());
  if (!isImage(buf)) return { status: "noimage" };

  const hash = createHash("md5").update(buf).digest("hex");
  if (ledger.generic.has(hash)) return { status: "generic", hash };
  if ((ledger.added.get(hash)?.length ?? 0) + 1 >= GENERIC_MIN_REPEAT) {
    await purgeGeneric(hash, ledger);
    return { status: "generic", hash };
  }

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
  ledger.added.set(hash, [...(ledger.added.get(hash) ?? []), p.id]);
  return { status: "ok", hash };
}

/* ---------- Çalıştırma ---------- */

function lockOwnerAlive(): boolean {
  const pid = Number(readFileSync(LOCK_FILE, "utf8").trim());
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

async function acquireLock(): Promise<boolean> {
  if (existsSync(LOCK_FILE) && (!lockOwnerAlive() || Date.now() - statSync(LOCK_FILE).mtimeMs > MAX_MS + 10 * 60_000)) {
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

async function main() {
  mkdirSync(STATE_DIR, { recursive: true });
  if (MAX_MS < 2 * 60_000) return;
  if (!(await acquireLock())) {
    log("Başka bir parcatedarik senkronu çalışıyor; çıkılıyor.");
    return;
  }
  try {
    const products = (await loadProductsWithoutImage()).filter((p) => p.manufacturer);

    let state = readCrawlState();
    if (RECRAWL || !state || (state.finishedAt && Date.now() - state.finishedAt > RECRAWL_AFTER_MS)) {
      state = await planCrawl(products);
      writeFileSync(INDEX_FILE, "");
      writeCrawlState(state);
    }

    const doneRows = readTsv(DONE_FILE);
    const ledger = readLedger(doneRows);
    const done = new Map<string, { status: string; at: number }>();
    for (const [id, status, at] of doneRows) done.set(id!, { status: status!, at: Number(at) });
    const pending = (matches: Map<string, unknown>) =>
      products.filter((p) => {
        if (!matches.has(p.id)) return false;
        const prev = done.get(p.id);
        if (!prev) return true;
        return prev.status === "error" && Date.now() - prev.at > ERROR_RETRY_MS;
      });

    let matches = buildMatches(products);
    if (REPORT) {
      report(products, matches);
      return;
    }
    let queue = pending(matches);

    // Tarama bitmediyse sıradaki indirmeler çalışmanın yarısını, tarama kalan yarısını kullanır.
    if (!state.finishedAt) {
      const crawlBudget = queue.length > 0 ? Math.floor(timeLeft() / 2) : timeLeft();
      const finished = await crawl(state, crawlBudget);
      const pagesDone = Object.values(state.progress).reduce((s, p) => s + Math.max(0, p.next - 1), 0);
      const pagesTotal = Object.values(state.progress).reduce((s, p) => s + p.pages, 0);
      log(
        `Tarama: ${finished ? "tamamlandı" : "sürüyor"}, ${Object.keys(state.progress).length}/${state.slugs.length} marka, ${pagesDone}/${pagesTotal}+ sayfa.`,
      );
      matches = buildMatches(products);
      queue = pending(matches);
    }
    log(`Sırada ${queue.length} ürün (eşleşen ${matches.size}, işlenmiş ${done.size}).`);

    const stats = { ok: 0, noimage: 0, generic: 0, error: 0 };
    for (const p of queue) {
      if (stats.ok + stats.noimage + stats.generic + stats.error >= LIMIT || timeLeft() < 60_000) break;
      let result: { status: "ok" | "noimage" | "generic" | "error"; hash?: string };
      try {
        result = await processProduct(p, matches.get(p.id)!.image, ledger);
      } catch (err) {
        if (err instanceof StopRun) {
          log(err.message);
          break;
        }
        result = { status: "error" };
        log(`${p.sku}: ${err instanceof Error ? err.message : err}`);
      }
      stats[result.status] += 1;
      appendFileSync(DONE_FILE, `${p.id}\t${result.status}\t${Date.now()}\t${result.hash ?? ""}\n`);
    }
    log(
      `Bitti: ${stats.ok} görsel eklendi, ${stats.generic} afiş görseli atlandı, ${stats.noimage} üründe görsel yok, ${stats.error} hata.`,
    );
  } catch (err) {
    if (err instanceof StopRun) log(err.message);
    else throw err;
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
