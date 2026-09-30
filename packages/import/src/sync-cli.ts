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
import { existsSync } from "node:fs";
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
const LOCK_PATH = join(tmpdir(), "guntan-supplier-sync.lock");
const STALE_LOCK_MS = 6 * 60 * 60 * 1000;

const altayPath = process.env.ALTAY_XML_PATH || join(root, "products.xml");
const basbugPath = process.env.BASBUG_JSON_PATH || join(root, "data/basbug/all_products.json");

function log(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
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

function runScript(file: string, env: Record<string, string>): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", join(here, file)], {
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

  try {
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
    if (basbugReady) {
      // basbug-cli sonunda dedupe + görünürlük derlemesini de yapar.
      basbugImported = await step("Başbuğ import", () => runScript("basbug-cli.ts", { BASBUG_JSON_PATH: basbugPath }));
    } else if (altayReady) {
      await step("Dedupe + görünürlük", () => runScript("dedupe-cli.ts", {}));
    }
    if (tierStore && tiers && altayImported && basbugImported && !errors.length) {
      await tierStore.markPriceTiersApplied(tiers).catch((err) => log(`Uygulanan dilimler kaydedilemedi: ${err}`));
    }
  } finally {
    await rm(LOCK_PATH, { force: true });
  }

  if (errors.length) {
    log(`Senkron uyarılarla bitti:\n  - ${errors.join("\n  - ")}`);
    return 1;
  }
  log("Senkron tamamlandı.");
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch(async (err) => {
    console.error(err);
    await rm(LOCK_PATH, { force: true });
    process.exit(1);
  });
