/**
 * Tedarikçi senkronu (cron ile 12 saatte bir):
 *   1. Altay (Eryaz) XML'i indir
 *   2. Başbuğ API'den malzeme + net fiyat + stok + döviz çek
 *   3. Değişen ürünleri import et (marj her seferinde ham maliyetten hesaplanır)
 *   4. En ucuz/stoktaki eşleşmeyi seç, görünürlüğü derle
 *
 * Kullanım: pnpm import:sync
 * Bayraklar: --skip-fetch (mevcut dosyalarla sadece import)
 */
import { spawn } from "node:child_process";
import { appendFileSync, existsSync, renameSync, statSync, writeFileSync } from "node:fs";
import { mkdir, open, rm, stat } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchEryazXml, eryazConfigFromEnv } from "./eryaz-fetch";
import { basbugConfigFromEnv, fetchBasbugCatalog } from "./basbug-fetch";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../../..");
// Hostinger panel ortam değişkenleri cron'a geçmez; ayarlar deploy klasörü
// dışındaki bir dosyadan okunur (deploy'da silinmez).
for (const envFile of [process.env.SYNC_ENV_FILE || join(homedir(), "guntan-sync.env"), join(root, ".env")]) {
  if (existsSync(envFile)) process.loadEnvFile(envFile);
}

const SKIP_FETCH = process.argv.includes("--skip-fetch");
const ONLY_FEED = process.argv.find((a) => a.startsWith("--feed="))?.slice("--feed=".length) || null;
const LOCK_PATH = join(tmpdir(), "guntan-supplier-sync.lock");
const STALE_LOCK_MS = 6 * 60 * 60 * 1000;

const altayPath = process.env.ALTAY_XML_PATH || join(root, "products.xml");
const basbugPath = process.env.BASBUG_JSON_PATH || join(root, "data/basbug/all_products.json");

// Panel (XML senkron sayfası) bu dosyaları okur; deploy klasörü dışında tutulur.
const LOG_FILE = process.env.SYNC_LOG_FILE || join(homedir(), "guntan-sync.log");
const STATUS_FILE = process.env.SYNC_STATUS_FILE || join(homedir(), "guntan-sync-status.json");
const TRIGGER = process.env.SYNC_TRIGGER || "cron";

function log(message: string) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  try {
    if (existsSync(LOG_FILE) && statSync(LOG_FILE).size > 2_000_000) renameSync(LOG_FILE, `${LOG_FILE}.old`);
    appendFileSync(LOG_FILE, `${line}\n`);
  } catch {
    /* log dosyası yazılamazsa senkron devam eder */
  }
}

function writeStatus(status: Record<string, unknown>) {
  try {
    writeFileSync(STATUS_FILE, JSON.stringify({ trigger: TRIGGER, ...status }, null, 2));
  } catch {
    /* durum dosyası opsiyonel */
  }
}

async function acquireLock(): Promise<boolean> {
  try {
    const handle = await open(LOCK_PATH, "wx");
    await handle.writeFile(String(process.pid));
    await handle.close();
    return true;
  } catch {
    const { mtimeMs } = await stat(LOCK_PATH);
    if (Date.now() - mtimeMs < STALE_LOCK_MS) return false;
    log("Eski kilit dosyası bulundu (6 saatten eski), siliniyor.");
    await rm(LOCK_PATH, { force: true });
    return acquireLock();
  }
}

function runScript(file: string, env: Record<string, string>, args: string[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", join(here, file), ...args], {
      cwd: join(here, ".."),
      env: { ...process.env, ...env },
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${file} çıkış kodu ${code}`))));
  });
}

async function main() {
  if (!(await acquireLock())) {
    log("Başka bir senkron hâlâ çalışıyor, atlanıyor.");
    return 0;
  }
  const startedAt = new Date().toISOString();
  writeStatus({ state: "running", startedAt, pid: process.pid });
  log(`Senkron başladı (${TRIGGER}).`);
  const errors: string[] = [];
  const step = async (name: string, fn: () => Promise<void>) => {
    log(`▶ ${name}`);
    try {
      await fn();
      log(`✔ ${name}`);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${name}: ${msg}`);
      log(`✖ ${name}: ${msg}`);
      return false;
    }
  };

  // db istemcisi env yüklendikten sonra oluşmalı; bu yüzden dinamik import.
  const tierStore = await import("./price-tier-store").catch(() => null);
  const tiers = tierStore ? await tierStore.loadPriceTiers().then((s) => s.tiers).catch(() => null) : null;
  let altayImported = false;
  let basbugImported = false;
  const customFeeds = await listCustomFeeds().catch((err) => {
    log(`Özel XML kaynakları okunamadı: ${err instanceof Error ? err.message : err}`);
    return [] as { id: string; name: string }[];
  });
  const runCustomFeeds = async () => {
    let any = false;
    for (const feed of customFeeds) {
      const ok = await step(`${feed.name} (XML kaynağı)`, () => runScript("custom-feed-cli.ts", {}, [feed.id, ...(SKIP_FETCH ? ["--skip-fetch"] : [])]));
      any ||= ok;
    }
    return any;
  };

  try {
    if (ONLY_FEED) {
      const feed = customFeeds.find((f) => f.id === ONLY_FEED);
      if (!feed) throw new Error("Kaynak bulunamadı veya pasif.");
      customFeeds.splice(0, customFeeds.length, feed);
      if (await runCustomFeeds()) await step("Dedupe + görünürlük", () => runScript("dedupe-cli.ts", {}));
      return finish(startedAt, errors);
    }

    let altayReady = existsSync(altayPath);
    let basbugReady = existsSync(basbugPath);

    if (!SKIP_FETCH) {
      const eryaz = eryazConfigFromEnv();
      if (eryaz) {
        altayReady = await step("Altay XML indir", async () => {
          const { count, bytes } = await fetchEryazXml(eryaz, altayPath);
          log(`Altay: ${count} ürün, ${(bytes / 1e6).toFixed(1)} MB`);
        });
      } else {
        log("ERYAZ_* ayarları yok, Altay indirme atlandı; mevcut dosya kullanılacak.");
      }

      const basbug = basbugConfigFromEnv();
      if (basbug) {
        await mkdir(dirname(basbugPath), { recursive: true });
        basbugReady = await step("Başbuğ API çek", async () => {
          const { items, groups, doviz } = await fetchBasbugCatalog(basbug, basbugPath);
          log(`Başbuğ: ${groups} grup, ${items} ürün, kur ${JSON.stringify(doviz)}`);
        });
      } else {
        log("BASBUG_* ayarları yok, Başbuğ çekme atlandı; mevcut dosya kullanılacak.");
      }
    }

    if (altayReady) altayImported = await step("Altay import", () => runScript("cli.ts", { ALTAY_XML_PATH: altayPath }));
    const customImported = await runCustomFeeds();
    if (basbugReady) {
      // basbug-cli sonunda dedupe + görünürlük derlemesini de yapar.
      basbugImported = await step("Başbuğ import", () => runScript("basbug-cli.ts", { BASBUG_JSON_PATH: basbugPath }));
    } else if (altayReady || customImported) {
      await step("Dedupe + görünürlük", () => runScript("dedupe-cli.ts", {}));
    }
    if (tierStore && tiers && altayImported && basbugImported && !errors.length) {
      await tierStore.markPriceTiersApplied(tiers).catch((err) => log(`Uygulanan dilimler kaydedilemedi: ${err}`));
    }
  } finally {
    await rm(LOCK_PATH, { force: true });
  }
  return finish(startedAt, errors);
}

function finish(startedAt: string, errors: string[]) {
  writeStatus({ state: errors.length ? "warning" : "ok", startedAt, finishedAt: new Date().toISOString(), errors });
  if (errors.length) {
    log(`Senkron uyarılarla bitti:\n  - ${errors.join("\n  - ")}`);
    return 1;
  }
  log("Senkron tamamlandı.");
  return 0;
}

async function listCustomFeeds(): Promise<{ id: string; name: string }[]> {
  const [{ db, xmlFeeds }, { eq }, { isCustomFeed }] = await Promise.all([import("@guntan/db"), import("drizzle-orm"), import("./custom-feed")]);
  const rows = await db.select().from(xmlFeeds).where(eq(xmlFeeds.isActive, 1));
  return rows.filter((r) => isCustomFeed(r.mapping)).map((r) => ({ id: r.id, name: r.name }));
}

main()
  .then((code) => process.exit(code))
  .catch(async (err) => {
    console.error(err);
    log(`Senkron hata ile durdu: ${err instanceof Error ? err.message : String(err)}`);
    writeStatus({ state: "failed", finishedAt: new Date().toISOString(), errors: [String(err)] });
    await rm(LOCK_PATH, { force: true });
    process.exit(1);
  });
