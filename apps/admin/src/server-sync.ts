import { execFileSync, spawn } from "node:child_process";
import { chmodSync, existsSync, openSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync, writeSync } from "node:fs";
import { homedir } from "node:os";
import { clearDeadSyncLock, readSyncLock } from "@guntan/import/sync-lock";
import { dirname, join, resolve } from "node:path";

const LOG_FILE = process.env.SYNC_LOG_FILE || join(homedir(), "guntan-sync.log");
const STATUS_FILE = process.env.SYNC_STATUS_FILE || join(homedir(), "guntan-sync-status.json");
const ENV_FILE = process.env.SYNC_ENV_FILE || join(homedir(), "guntan-sync.env");
const CLI_REL = "packages/import/src/sync-cli.ts";

/*
 * Panelden başlatılan senkron web sürecinin altında çalışınca, barındırma site sürecini yeniden
 * başlattığında (bellek sınırı, boşta kalma, dağıtım) onunla birlikte öldürülüyordu. Bu yüzden panel
 * senkronu kendisi başlatmaz; ayar dosyasının yanına bir istek bırakır ve dakikada bir çalışan
 * scripts/sync-queue.sh cron'u isteği alıp senkronu web sürecinden bağımsız başlatır. Aynı cron,
 * panelde ayarlanan saatlerde zamanlanmış senkronu da çalıştırır (saatler SYNC_HOURS_FILE'a yazılır).
 */
const SYNC_DIR = dirname(ENV_FILE);
const REQUEST_FILE = join(SYNC_DIR, "guntan-sync-request");
const QUEUE_SEEN_FILE = join(SYNC_DIR, "guntan-sync-queue.seen");
export const SYNC_HOURS_FILE = join(SYNC_DIR, "guntan-sync-hours");
/** Kuyruk cron'u bu süre içinde görülmediyse kurulmamış sayılır ve panel senkronu eskisi gibi doğrudan başlatır. */
const QUEUE_ALIVE_MS = 3 * 60_000;
/** Bu süreden eski istek, cron durmuş demektir; yok sayılır. */
const REQUEST_STALE_MS = 10 * 60_000;

function mtimeMs(path: string): number | null {
  try {
    return statSync(path).mtimeMs;
  } catch {
    return null;
  }
}

function queueRunnerAlive(): boolean {
  const seen = mtimeMs(QUEUE_SEEN_FILE);
  return seen !== null && Date.now() - seen < QUEUE_ALIVE_MS;
}

function pendingRequestSince(): Date | null {
  const at = mtimeMs(REQUEST_FILE);
  return at !== null && Date.now() - at < REQUEST_STALE_MS ? new Date(at) : null;
}

/** Zamanlanmış senkron saatlerini (Türkiye saati) kuyruk cron'unun okuyacağı dosyaya yazar. */
export function writeSyncHoursFile(hours: number[]) {
  if (process.env.NODE_ENV !== "production" || process.platform !== "linux") return;
  const next = `${hours.join(",")}\n`;
  try {
    if (existsSync(SYNC_HOURS_FILE) && readFileSync(SYNC_HOURS_FILE, "utf8") === next) return;
    writeFileSync(SYNC_HOURS_FILE, next);
  } catch {
    /* yazılamazsa cron varsayılan saatleri kullanır */
  }
}

export function findRepoRoot(): string | null {
  const starts = [process.cwd(), resolve(process.cwd(), ".."), resolve(process.cwd(), "../..")];
  for (const start of starts) {
    let dir = start;
    for (let i = 0; i < 5; i++) {
      if (existsSync(join(dir, CLI_REL))) return dir;
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return null;
}

function fileInfo(path: string) {
  try {
    const s = statSync(path);
    return { path, exists: true, size: s.size, mtime: s.mtime };
  } catch {
    return { path, exists: false, size: 0, mtime: null as Date | null };
  }
}

function envKeys(path: string): string[] {
  try {
    return readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => l.split("=")[0]!.replace(/^export\s+/, "").trim());
  } catch {
    return [];
  }
}

export type SyncStatus = {
  state?: "running" | "ok" | "warning" | "failed";
  trigger?: string;
  startedAt?: string;
  finishedAt?: string;
  errors?: string[];
  pid?: number;
};

/** Oto İsmail marka marka çalışır; ilerleme state.json ve marka dosyalarından okunur. */
function readOtoIsmail(keys: string[]) {
  const dir = process.env.OTOISMAIL_DIR || join(dirname(ENV_FILE), "guntan-otoismail");
  const ready = ["OTOISMAIL_USERNAME", "OTOISMAIL_PASSWORD"].every((k) => keys.includes(k) || Boolean(process.env[k]));
  let doneBrands = 0;
  let cycleStartedAt: number | null = null;
  let lastDoneAt: Date | null = null;
  try {
    const st = JSON.parse(readFileSync(join(dir, "state.json"), "utf8")) as { cycleStartedAt?: number; done?: Record<string, number> };
    cycleStartedAt = st.cycleStartedAt || null;
    const times = Object.values(st.done ?? {});
    doneBrands = times.length;
    if (times.length) lastDoneAt = new Date(Math.max(...times));
  } catch {
    /* henüz çalışmadı */
  }
  let files = 0;
  let size = 0;
  try {
    for (const f of readdirSync(dir)) {
      if (!f.endsWith(".ndjson")) continue;
      files += 1;
      size += statSync(join(dir, f)).size;
    }
  } catch {
    /* klasör yok */
  }
  return { ready, doneBrands, cycleStartedAt, lastDoneAt, files, size };
}

export function readServerSync() {
  try {
    persistSyncEnv();
  } catch {
    /* dosya yazılamazsa panel uyarı gösterir */
  }
  const root = findRepoRoot();
  let status: SyncStatus | null = null;
  try {
    status = JSON.parse(readFileSync(STATUS_FILE, "utf8")) as SyncStatus;
  } catch {
    status = null;
  }
  let logTail: string[] = [];
  try {
    const raw = readFileSync(LOG_FILE, "utf8");
    logTail = raw.slice(-400_000).trimEnd().split("\n").slice(-1500);
  } catch {
    logTail = [];
  }
  const lock = readSyncLock();
  const queuedSince = pendingRequestSince();
  const locked = lock.exists && lock.alive;
  // Sıradaki istek de "çalışıyor" sayılır: buton kapanır, sayfa kendini yeniler.
  const running = locked || queuedSince !== null;
  // Kilit ölü ama durum dosyası "çalışıyor" diyorsa senkron yarıda kesilmiştir.
  const interrupted = !running && status?.state === "running";
  const keys = envKeys(ENV_FILE);
  const altayPath = process.env.ALTAY_XML_PATH || (root ? join(root, "products.xml") : "");
  const basbugPath = process.env.BASBUG_JSON_PATH || (root ? join(root, "data/basbug/all_products.json") : "");
  return {
    root,
    status,
    logTail,
    logFile: LOG_FILE,
    running,
    queued: !locked && queuedSince !== null,
    queueRunner: queueRunnerAlive(),
    interrupted,
    lockSince: locked
      ? status?.state === "running" && status.startedAt
        ? new Date(status.startedAt)
        : lock.since
      : queuedSince,
    envFile: { path: ENV_FILE, exists: existsSync(ENV_FILE) },
    processEnvReady: Object.keys(process.env).some((k) => (k.startsWith("ERYAZ_") || k.startsWith("BASBUG_")) && Boolean(process.env[k])),
    eryazReady: ["ERYAZ_USERNAME", "ERYAZ_PASSWORD"].every((k) => keys.includes(k) || Boolean(process.env[k])) || keys.some((k) => k.startsWith("ERYAZ_")),
    basbugReady: keys.some((k) => k.startsWith("BASBUG_")) || Object.keys(process.env).some((k) => k.startsWith("BASBUG_")),
    otoIsmail: readOtoIsmail(keys),
    b2bIkimizReady: ["B2B_IKIMIZ_USERNAME", "B2B_IKIMIZ_PASSWORD"].every((k) => keys.includes(k) || Boolean(process.env[k])),
    altay: altayPath ? fileInfo(altayPath) : null,
    basbug: basbugPath ? fileInfo(basbugPath) : null,
  };
}

/** Dağıtımda çalıştırma izni düşen esbuild ikilisini onarır; kullanılacak yolu döner. */
function ensureEsbuild(root: string, logFd: number): string {
  const script = join(root, "scripts/ensure-esbuild.cjs");
  if (!existsSync(script)) return "";
  try {
    return execFileSync(process.execPath, [script], { encoding: "utf8", timeout: 60_000, stdio: ["ignore", "pipe", logFd] }).trim();
  } catch {
    return "";
  }
}

// Barındırma süreç sınırı iş parçacıklarını da sayar; esbuild (Go) varsayılan olarak çekirdek sayısı kadar açar.
const LOW_THREAD_ENV = { GOMAXPROCS: "2", UV_THREADPOOL_SIZE: "2" };

/**
 * Senkronu sunucuda başlatır; panel isteği beklemez. Kuyruk cron'u çalışıyorsa yalnızca istek bırakır
 * (senkron en geç bir dakika içinde web sürecinden bağımsız başlar); yoksa eskisi gibi doğrudan başlatır.
 */
export function startServerSync(opts: { trigger: string; skipFetch?: boolean; feedId?: string }): { ok: true } | { ok: false; error: string } {
  const root = findRepoRoot();
  if (!root) return { ok: false, error: "Senkron betiği sunucuda bulunamadı." };
  const state = readServerSync();
  if (state.running) return { ok: false, error: "Şu anda çalışan bir senkron var." };
  if (opts.feedId && !/^[\w-]+$/.test(opts.feedId)) return { ok: false, error: "Geçersiz XML kaynağı." };
  clearDeadSyncLock();
  const flags = [...(opts.skipFetch ? ["--skip-fetch"] : []), ...(opts.feedId ? [`--feed=${opts.feedId}`] : [])];
  if (queueRunnerAlive()) {
    try {
      // Satır 1: tetikleyen, satır 2: sync-cli bayrakları. Cron dosyayı alırken siler.
      const trigger = opts.trigger.replace(/[\r\n]/g, " ");
      writeFileSync(`${REQUEST_FILE}.tmp`, `${trigger}\n${flags.join(" ")}\n`);
      renameSync(`${REQUEST_FILE}.tmp`, REQUEST_FILE);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
  const args = [join(root, CLI_REL), ...flags];
  try {
    const out = openSync(LOG_FILE, "a");
    const env: NodeJS.ProcessEnv = { ...process.env, SYNC_TRIGGER: opts.trigger, NODE_ENV: "production", SYNC_STDOUT_IS_LOG: "1", SYNC_LOG_FILE: LOG_FILE, SYNC_STATUS_FILE: STATUS_FILE, ...LOW_THREAD_ENV };
    const esbuild = ensureEsbuild(root, out);
    if (esbuild) env.ESBUILD_BINARY_PATH = esbuild;
    const child = spawn(process.execPath, ["--v8-pool-size=2", "--import", "tsx", ...args], {
      cwd: join(root, "packages/import"),
      env,
      detached: true,
      stdio: ["ignore", out, out],
    });
    // EAGAIN gibi başlatma hataları olay olarak gelir; dinleyici yoksa panel süreci çöker.
    child.on("error", (err) => {
      try {
        writeSync(out, `[${new Date().toISOString()}] Senkron süreci başlatılamadı: ${err.message}\n`);
      } catch {
        /* günlük yazılamadı */
      }
    });
    child.unref();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function feedFileInfo(path: string) {
  return fileInfo(path);
}

const SYNC_ENV_PREFIXES = ["DATABASE_", "ERYAZ_", "BASBUG_", "OTOISMAIL_", "B2B_IKIMIZ_", "ARAS_", "ALTAY_", "MEILI_"];
const SYNC_ENV_KEYS = ["REDIS_URL", "STOREFRONT_URL", "APP_SECRET", "AUTH_SECRET", "SESSION_SECRET"];

function isSyncEnvKey(key: string) {
  return SYNC_ENV_KEYS.includes(key) || SYNC_ENV_PREFIXES.some((p) => key.startsWith(p));
}

function envLine(key: string, value: string): string | null {
  if (/[\r\n]/.test(value)) return null;
  if (!value.includes("'")) return `${key}='${value}'`;
  if (!value.includes('"')) return `${key}="${value}"`;
  if (!value.includes("`")) return `${key}=\`${value}\``;
  return null;
}

/**
 * hPanel ortam değişkenleri cron'a geçmez. Admin süreci tedarikçi/veritabanı
 * değişkenlerini sunucudaki guntan-sync.env dosyasına yazar; cron betikleri
 * bu dosyayı okur. Dosyadaki diğer satırlar korunur.
 */
export function persistSyncEnv(): { written: boolean; path: string } {
  if (process.env.NODE_ENV !== "production" || process.platform !== "linux") return { written: false, path: ENV_FILE };
  const keys = Object.keys(process.env).filter((k) => isSyncEnvKey(k) && process.env[k]);
  if (!keys.some((k) => k.startsWith("ERYAZ_") || k.startsWith("BASBUG_") || k.startsWith("OTOISMAIL_") || k.startsWith("B2B_IKIMIZ_"))) return { written: false, path: ENV_FILE };
  let existing = "";
  try {
    existing = readFileSync(ENV_FILE, "utf8");
  } catch {
    existing = "";
  }
  const kept = existing
    .split(/\r?\n/)
    .filter((line) => {
      const t = line.trim();
      if (!t || t.startsWith("#") || !t.includes("=")) return Boolean(t) && t !== AUTO_HEADER;
      return !keys.includes(t.split("=")[0]!.replace(/^export\s+/, "").trim());
    });
  const managed = keys.sort().map((k) => envLine(k, process.env[k]!)).filter((l): l is string => Boolean(l));
  const next = `${[...kept, AUTO_HEADER, ...managed].join("\n")}\n`;
  if (next === existing) return { written: false, path: ENV_FILE };
  writeFileSync(ENV_FILE, next, { mode: 0o600 });
  try {
    chmodSync(ENV_FILE, 0o600);
  } catch {
    /* izin değiştirilemezse dosya yine kullanılabilir */
  }
  return { written: true, path: ENV_FILE };
}

const AUTO_HEADER = "# hPanel ortam değişkenlerinden otomatik (admin açılışında güncellenir)";
