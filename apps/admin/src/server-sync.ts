import { spawn } from "node:child_process";
import { existsSync, openSync, readFileSync, statSync } from "node:fs";
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
    logTail = raw.trimEnd().split("\n").slice(-120);
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
    eryazReady: ["ERYAZ_USERNAME", "ERYAZ_PASSWORD"].every((k) => keys.includes(k) || Boolean(process.env[k])) || keys.some((k) => k.startsWith("ERYAZ_")),
    basbugReady: keys.some((k) => k.startsWith("BASBUG_")) || Object.keys(process.env).some((k) => k.startsWith("BASBUG_")),
    altay: altayPath ? fileInfo(altayPath) : null,
    basbug: basbugPath ? fileInfo(basbugPath) : null,
  };
}

/** Senkronu sunucuda ayrı bir süreç olarak başlatır; panel isteği beklemez. */
export function startServerSync(opts: { trigger: string; skipFetch?: boolean }): { ok: true } | { ok: false; error: string } {
  const root = findRepoRoot();
  if (!root) return { ok: false, error: "Senkron betiği sunucuda bulunamadı." };
  const state = readServerSync();
  if (state.running) return { ok: false, error: "Şu anda çalışan bir senkron var." };
  const tsxBin = join(root, "node_modules/.bin/tsx");
  const args = [join(root, CLI_REL), ...(opts.skipFetch ? ["--skip-fetch"] : [])];
  try {
    const out = openSync(LOG_FILE, "a");
    const useBin = existsSync(tsxBin);
    const child = spawn(useBin ? tsxBin : process.execPath, useBin ? args : ["--import", "tsx", ...args], {
      cwd: join(root, "packages/import"),
      env: { ...process.env, SYNC_TRIGGER: opts.trigger, NODE_ENV: "production" },
      detached: true,
      stdio: ["ignore", out, out],
    });
    child.unref();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
