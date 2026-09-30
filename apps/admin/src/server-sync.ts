import { execFileSync, spawn } from "node:child_process";
import { chmodSync, existsSync, openSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const LOCK_PATH = join(tmpdir(), "guntan-supplier-sync.lock");
const LOG_FILE = process.env.SYNC_LOG_FILE || join(homedir(), "guntan-sync.log");
const STATUS_FILE = process.env.SYNC_STATUS_FILE || join(homedir(), "guntan-sync-status.json");
const ENV_FILE = process.env.SYNC_ENV_FILE || join(homedir(), "guntan-sync.env");
const CLI_REL = "packages/import/src/sync-cli.ts";

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
  const lock = fileInfo(LOCK_PATH);
  const keys = envKeys(ENV_FILE);
  const altayPath = process.env.ALTAY_XML_PATH || (root ? join(root, "products.xml") : "");
  const basbugPath = process.env.BASBUG_JSON_PATH || (root ? join(root, "data/basbug/all_products.json") : "");
  return {
    root,
    status,
    logTail,
    logFile: LOG_FILE,
    running: lock.exists && Boolean(lock.mtime && Date.now() - lock.mtime.getTime() < 6 * 3600_000),
    lockSince: lock.mtime,
    envFile: { path: ENV_FILE, exists: existsSync(ENV_FILE) },
    processEnvReady: Object.keys(process.env).some((k) => (k.startsWith("ERYAZ_") || k.startsWith("BASBUG_")) && Boolean(process.env[k])),
    eryazReady: ["ERYAZ_USERNAME", "ERYAZ_PASSWORD"].every((k) => keys.includes(k) || Boolean(process.env[k])) || keys.some((k) => k.startsWith("ERYAZ_")),
    basbugReady: keys.some((k) => k.startsWith("BASBUG_")) || Object.keys(process.env).some((k) => k.startsWith("BASBUG_")),
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

/** Senkronu sunucuda ayrı bir süreç olarak başlatır; panel isteği beklemez. */
export function startServerSync(opts: { trigger: string; skipFetch?: boolean; feedId?: string }): { ok: true } | { ok: false; error: string } {
  const root = findRepoRoot();
  if (!root) return { ok: false, error: "Senkron betiği sunucuda bulunamadı." };
  const state = readServerSync();
  if (state.running) return { ok: false, error: "Şu anda çalışan bir senkron var." };
  const args = [join(root, CLI_REL), ...(opts.skipFetch ? ["--skip-fetch"] : []), ...(opts.feedId ? [`--feed=${opts.feedId}`] : [])];
  try {
    const out = openSync(LOG_FILE, "a");
    const env: NodeJS.ProcessEnv = { ...process.env, SYNC_TRIGGER: opts.trigger, NODE_ENV: "production", SYNC_STDOUT_IS_LOG: "1", SYNC_LOG_FILE: LOG_FILE, SYNC_STATUS_FILE: STATUS_FILE };
    const esbuild = ensureEsbuild(root, out);
    if (esbuild) env.ESBUILD_BINARY_PATH = esbuild;
    const child = spawn(process.execPath, ["--import", "tsx", ...args], {
      cwd: join(root, "packages/import"),
      env,
      detached: true,
      stdio: ["ignore", out, out],
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

const SYNC_ENV_PREFIXES = ["DATABASE_", "ERYAZ_", "BASBUG_", "ARAS_", "ALTAY_", "MEILI_"];
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
  if (!keys.some((k) => k.startsWith("ERYAZ_") || k.startsWith("BASBUG_"))) return { written: false, path: ENV_FILE };
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
