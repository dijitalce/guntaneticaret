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
import { mkdir, open, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchEryazXml, eryazConfigFromEnv } from "./eryaz-fetch";
import { basbugConfigFromEnv, fetchBasbugCatalog } from "./basbug-fetch";
import { loadSyncEnv, syncHomeDir } from "./sync-env";
import { SYNC_LOCK_PATH, clearDeadSyncLock, startLockHeartbeat } from "./sync-lock";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../../..");
const loadedEnvFiles = loadSyncEnv(root);

const SKIP_FETCH = process.argv.includes("--skip-fetch");
const ONLY_FEED = process.argv.find((a) => a.startsWith("--feed="))?.slice("--feed=".length) || null;
const LOCK_PATH = SYNC_LOCK_PATH;

const altayPath = process.env.ALTAY_XML_PATH || join(root, "products.xml");
const basbugPath = process.env.BASBUG_JSON_PATH || join(root, "data/basbug/all_products.json");

// Panel (XML senkron sayfası) bu dosyaları okur; deploy klasörü dışında tutulur.
const SYNC_HOME = syncHomeDir(loadedEnvFiles);
process.env.FEEDS_DIR ||= join(SYNC_HOME, "guntan-feeds");
const LOG_FILE = process.env.SYNC_LOG_FILE || join(SYNC_HOME, "guntan-sync.log");
const STATUS_FILE = process.env.SYNC_STATUS_FILE || join(SYNC_HOME, "guntan-sync-status.json");
const TRIGGER = process.env.SYNC_TRIGGER || "cron";

// Panel senkronu başlatırken stdout'u zaten log dosyasına bağlar; o durumda dosyaya ikinci kez yazılmaz.
const STDOUT_IS_LOG = process.env.SYNC_STDOUT_IS_LOG === "1";

function appendLog(text: string) {
  try {
    if (existsSync(LOG_FILE) && statSync(LOG_FILE).size > 2_000_000) renameSync(LOG_FILE, `${LOG_FILE}.old`);
    appendFileSync(LOG_FILE, text);
  } catch {
    /* log dosyası yazılamazsa senkron devam eder */
  }
}

function log(message: string) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  if (!STDOUT_IS_LOG) appendLog(`${line}\n`);
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
    // Süreci ölmüş (ör. deploy ile kesilmiş) bir senkronun kilidi yeni çalışmayı engellemesin.
    if (!clearDeadSyncLock(LOCK_PATH)) return false;
    log("Yarıda kesilmiş önceki senkronun kilidi bulundu, siliniyor.");
    return acquireLock();
  }
}

function runScript(file: string, env: Record<string, string>, args: string[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--v8-pool-size=2", "--import", "tsx", join(here, file), ...args], {
      cwd: join(here, ".."),
      // Barındırma süreç sınırı iş parçacıklarını da sayar; esbuild (Go) varsayılan olarak çekirdek sayısı kadar açar.
      env: { ...process.env, GOMAXPROCS: process.env.GOMAXPROCS || "2", UV_THREADPOOL_SIZE: process.env.UV_THREADPOOL_SIZE || "2", ...env },
      stdio: STDOUT_IS_LOG ? "inherit" : ["ignore", "pipe", "pipe"],
    });
    if (!STDOUT_IS_LOG) {
      // İlerleme satırları (Imported x / y) panelin okuduğu log dosyasına da düşsün.
      child.stdout?.on("data", (chunk: Buffer) => {
        process.stdout.write(chunk);
        appendLog(chunk.toString());
      });
      child.stderr?.on("data", (chunk: Buffer) => {
        process.stderr.write(chunk);
        appendLog(chunk.toString());
      });
    }
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${file} çıkış kodu ${code}`))));
  });
}

async function main() {
  if (!(await acquireLock())) {
    log("Başka bir senkron hâlâ çalışıyor, atlanıyor.");
    return 0;
  }
  startLockHeartbeat(LOCK_PATH);
  const startedAt = new Date().toISOString();
  writeStatus({ state: "running", startedAt, pid: process.pid });
  log(`Senkron başladı (${TRIGGER}). Ayar dosyası: ${loadedEnvFiles.join(", ") || "yok (yalnızca ortam değişkenleri)"}`);
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
