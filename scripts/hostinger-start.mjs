import { createServer } from "node:http";
import { createRequire } from "node:module";
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import os from "node:os";
import { parse } from "node:url";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Next, SIGTERM'de process.exit yapmasın — Hostinger bazen sağlıklı süreci yeniler.
process.env.NEXT_MANUAL_SIG_HANDLE ??= "1";
process.env.NEXT_TELEMETRY_DISABLED ??= "1";
process.env.UV_THREADPOOL_SIZE ??= "2";

// Hostinger'ın "on-demand" modeli süreci ~10-20 sn'de bir yeniden başlatıyor;
// her devir-teslim döngüsü kendi içinde beklenen/rutin birkaç log satırı
// üretiyor (kilit dolu, yedek çıkış, redundant "hazır" bildirimi vb.). Bunlar
// tek başına bir sorun değil ama gün boyunca on binlerce satır biriktirip
// log kotasını/okumasını zorlaştırıyor. Varsayılan olarak sadece ANLAMLI
// olayları (yeni birincil, vitrin hazır, fazlalık temizliği, gerçek hatalar)
// logluyoruz. Ayrıntılı hata ayıklama gerekirse HOSTINGER_VERBOSE_LOGS=1 ile
// eski davranışa dönülebilir.
const VERBOSE = process.env.HOSTINGER_VERBOSE_LOGS === "1";
function vlog(...args) {
  if (VERBOSE) console.log(...args);
}
function vwarn(...args) {
  if (VERBOSE) console.warn(...args);
}

// [hostinger] satırlarına ISO zaman damgası
(function stampHostingerLogs() {
  function wrap(fn) {
    return (...args) => {
      if (typeof args[0] === "string" && args[0].startsWith("[hostinger]")) {
        args[0] = `${new Date().toISOString()} ${args[0]}`;
      }
      return fn(...args);
    };
  }
  console.log = wrap(console.log.bind(console));
  console.warn = wrap(console.warn.bind(console));
  console.error = wrap(console.error.bind(console));
})();

const NodeModule = createRequire(import.meta.url)("module");

// Bilinçli tasarım (Hostinger):
// - listen() Next yüklemeden ÖNCE (3 sn kuralı) — kilit alınamasa bile dinle
// - yaşayan ready birincilin kilidini ÇALMA
// - hazır birincil, kilit kendindeyken SIGTERM'i yok say
// - /yonetim/* → admin; admin.* → /yonetim; diğer → vitrin

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const storefrontDir = join(root, "apps/storefront");
const adminDir = join(root, "apps/admin");

const port = Number(process.env.PORT || 3000);
const hostname = "0.0.0.0";
const adminBasePath = (process.env.ADMIN_BASE_PATH ?? "/yonetim").replace(/\/$/, "") || "/yonetim";
const publicStoreUrl = (
  process.env.STOREFRONT_URL ?? "https://guntanotoyedekparca.com"
).replace(/\/$/, "");
const canonicalHost = (() => {
  try {
    return new URL(publicStoreUrl).hostname.toLowerCase();
  } catch {
    return "guntanotoyedekparca.com";
  }
})();

/** Küçük harf, port yok, baştaki www. yok. */
function normalizeHostName(hostHeader) {
  let h = String(hostHeader ?? "")
    .split(":")[0]
    .toLowerCase()
    .trim();
  if (h.startsWith("www.")) h = h.slice(4);
  return h;
}

/**
 * Ana domain her zaman izinli + ALLOWED_HOSTS (virgülle).
 * Karşılaştırma normalizeHostName ile (www./port/case).
 */
const allowedHosts = (() => {
  const set = new Set([normalizeHostName(canonicalHost)]);
  for (const part of String(process.env.ALLOWED_HOSTS ?? "").split(",")) {
    const h = normalizeHostName(part);
    if (h) set.add(h);
  }
  return set;
})();

function isAllowedHost(hostHeader) {
  const h = normalizeHostName(hostHeader);
  if (!h) return false;
  return allowedHosts.has(h);
}

const bootStuckMs = Number(process.env.HOSTINGER_BOOT_STUCK_MS ?? "90000");
const standbyKeepMs = Number(process.env.HOSTINGER_STANDBY_KEEP_MS ?? "0");
const standbyMax = Math.max(1, Number(process.env.HOSTINGER_STANDBY_MAX ?? "2") || 2);
const standbyFastResponse = process.env.HOSTINGER_STANDBY_FAST_RESPONSE === "1";
const standbyProxy = process.env.HOSTINGER_STANDBY_PROXY === "1";
/**
 * Lazy: proxy→fail→kendi Next; slot tavanı (MAX) + idle çıkış.
 * SIGTERM: hazır birincil nazikçe kilidi bırakır (yok saymaz — Hostinger
 * ignore sonrası SIGKILL ediyordu). Yedekler SIGTERM/idle/max ile çıkar.
 * IDLE yoksa KEEP>0 → KEEP; yoksa 60s.
 */
const lazyStandby = process.env.HOSTINGER_LAZY_STANDBY === "1";
const useStandbyProxy = standbyProxy || lazyStandby;
const standbyIdleMs = (() => {
  const raw = process.env.HOSTINGER_STANDBY_IDLE_MS;
  if (raw != null && String(raw).trim() !== "") {
    const n = Number(raw);
    return Number.isFinite(n) ? Math.max(0, n) : 60_000;
  }
  if (lazyStandby) {
    if (Number.isFinite(standbyKeepMs) && standbyKeepMs > 0) return standbyKeepMs;
    return 60_000;
  }
  return 0;
})();
const primarySockPath = join(os.tmpdir(), "guntan-primary.sock");
const primaryEndpointFile = join(os.tmpdir(), "guntan-primary.json");
const aliveDir = join(os.tmpdir(), "guntan-alive");
const startedAt = Date.now();
let requestsTotal = 0;
let requestsInFlight = 0;
let loggedEarlyRequests = 0;
let loggedProxyAttempts = 0;
let loggedProxyOk = 0;
let loggedPlaceholders = 0;
/** @type {number | null} */
let lastRequestAt = null;
let sigtermCount = 0;
let sigintCount = 0;
let firstSigtermAt = null;
let sigtermIgnoredLogged = false;
let lastSeenPpid = process.ppid;
let cgroupMissingLogged = false;
/** Yedek bekliyor (Next yok) — HTTP "Site açılıyor" döner */
let isStandbyMode = false;
let exitReason = "unknown";
let isPrimaryProcess = false;
let lazyStandbyExiting = false;

const adminHost = (
  process.env.ADMIN_HOST ??
  (() => {
    try {
      return new URL(process.env.ADMIN_URL ?? "https://admin.guntanotoyedekparca.com").hostname;
    } catch {
      return "admin.guntanotoyedekparca.com";
    }
  })()
).toLowerCase();

function isAdminHost(hostHeader) {
  const host = normalizeHostName(hostHeader);
  if (!host) return false;
  if (host === normalizeHostName(adminHost)) return true;
  return host.startsWith("admin.");
}

function isAdminPath(urlPath) {
  const path = String(urlPath ?? "/").split("?")[0];
  return path === adminBasePath || path.startsWith(`${adminBasePath}/`);
}

/** İzin verilmeyen Host → ana siteye 301. admin.* ve /yonetim dokunulmaz. Host ASLA rewrite edilmez. */
function maybeHostRedirect(req, res, pathOnly) {
  if (isAdminHost(req.headers.host) || isAdminPath(pathOnly)) return false;
  if (isAllowedHost(req.headers.host)) return false;
  const dest = `${publicStoreUrl}${req.url ?? "/"}`;
  res.statusCode = 301;
  res.setHeader("location", dest);
  res.setHeader("cache-control", "public, max-age=3600");
  res.setHeader("x-guntan-app", "host-redirect");
  res.end();
  return true;
}

function rssMb() {
  return Math.round(process.memoryUsage().rss / 1024 / 1024);
}

/** Hostinger output dir (.next) izlerse cache yazmak restart tetikleyebilir. */
function redirectNextWritable(appDir, label) {
  const nextDir = join(appDir, ".next");
  if (!fs.existsSync(nextDir)) return;
  const tmpBase = join(os.tmpdir(), "guntan-next", label);
  for (const name of ["cache", "trace", "diagnostics"]) {
    const appPath = join(nextDir, name);
    const tmpPath = join(tmpBase, name);
    fs.mkdirSync(tmpPath, { recursive: true });
    try {
      const st = fs.lstatSync(appPath);
      if (st.isSymbolicLink() && fs.readlinkSync(appPath) === tmpPath) {
        continue; // zaten doğru — sessiz
      }
      if (st.isSymbolicLink()) fs.unlinkSync(appPath);
      else fs.rmSync(appPath, { recursive: true, force: true });
    } catch {
      /* yok */
    }
    try {
      fs.symlinkSync(tmpPath, appPath);
      console.log(`[hostinger] ${label} .next/${name} → ${tmpPath}`);
    } catch (err) {
      console.warn(`[hostinger] ${label} .next/${name} symlink yok:`, err instanceof Error ? err.message : err);
    }
  }
}

const pidFile = join(os.tmpdir(), "guntan-hostinger.pid");
const standbyFile = join(os.tmpdir(), "guntan-standby.json");
// Public self-ping LiteSpeed üzerinden yeni Node start tetikleyebiliyor. Varsayılan KAPALI.
const selfPingMs = Number(process.env.HOSTINGER_SELF_PING_MS ?? "0");
let shuttingDown = false;
let nextBooted = false;
let selfPingStarted = false;
let lockReady = false;
/** @type {import("node:http").Server | null} */
let httpServer = null;
/** LiteSpeed http.Server.listen'ı yamadığı için net.Server ile dinleriz */
/** @type {import("node:net").Server | null} */
let primaryNetServer = null;
/** @type {import("node:net").Server | null} */
let primaryTcpServer = null;
/** listen ÇAĞRILMAZ — sadece connection emit */
/** @type {import("node:http").Server | null} */
let primaryHttpBridge = null;
/** @type {{ kind: "unix", path: string } | { kind: "tcp", host: string, port: number } | null} */
let primaryEndpoint = null;
let primarySockEventLogs = 0;
let bindAttempts = 0;

function warnBadEnv() {
  const db = process.env.DATABASE_URL ?? "";
  if (/supabase|postgres(ql)?:/i.test(db)) {
    console.error(
      "[hostinger] DATABASE_URL hâlâ Postgres/Supabase. Canlıda mysql://... olmalı; eski URL her isteği asar.",
    );
  }
  try {
    const u = new URL(db);
    if (u.protocol.startsWith("mysql") && /hstgr\.io/i.test(u.hostname)) {
      console.warn(
        `[hostinger] DATABASE_URL ${u.hostname} — MySQL aynı Hostinger hesabındaysa host=localhost daha hızlıdır.`,
      );
    }
  } catch {
    /* */
  }
}

/** @returns {{ pid: number, ready: boolean, t: number } | null} */
function readLockState() {
  try {
    const raw = fs.readFileSync(pidFile, "utf8").trim();
    if (!raw) return null;
    if (raw.startsWith("{")) {
      const j = JSON.parse(raw);
      const pid = Number(j.pid);
      if (!Number.isInteger(pid) || pid <= 0) return null;
      return { pid, ready: Boolean(j.ready), t: Number(j.t) || 0 };
    }
    const pid = Number(raw);
    if (!Number.isInteger(pid) || pid <= 0) return null;
    return { pid, ready: true, t: 0 };
  } catch {
    return null;
  }
}

function readLockPid() {
  return readLockState()?.pid ?? null;
}

function writeLock(ready = false) {
  lockReady = Boolean(ready);
  try {
    fs.writeFileSync(
      pidFile,
      JSON.stringify({ pid: process.pid, ready: lockReady, t: Date.now() }),
    );
  } catch (err) {
    console.warn(
      `[hostinger] kilit yazılamadı pid=${process.pid}:`,
      err instanceof Error ? err.message : err,
    );
  }
}

function clearLock() {
  const owned = readLockPid() === process.pid;
  try {
    if (owned) {
      fs.unlinkSync(pidFile);
      console.log(`[hostinger] kilit bırakıldı pid=${process.pid}`);
    }
  } catch {
    /* */
  }
  removeStandbyPid(process.pid);
  if (owned) closePrimarySock();
  clearAlive();
}

function pidAlive(pid) {
  if (!pid || pid === process.pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // EPERM: süreç var ama sinyal hakkımız yok — yaşıyor say.
    return err?.code === "EPERM";
  }
}

/** ppid için: kendimiz değil; EPERM = canlı */
function ppidAlive(ppid) {
  if (!ppid) return false;
  try {
    process.kill(ppid, 0);
    return true;
  } catch (err) {
    return err?.code === "EPERM";
  }
}

/** @returns {number[]} */
function readStandbyPids() {
  try {
    const raw = fs.readFileSync(standbyFile, "utf8").trim();
    if (!raw) return [];
    const j = JSON.parse(raw);
    const pids = Array.isArray(j.pids) ? j.pids : [];
    const parsed = pids.map(Number).filter((p) => Number.isInteger(p) && p > 0);
    const alive = parsed.filter((p) => p === process.pid || pidAlive(p));
    if (alive.length !== parsed.length) writeStandbyPids(alive);
    return alive;
  } catch {
    return [];
  }
}

function writeStandbyPids(pids) {
  try {
    fs.writeFileSync(standbyFile, JSON.stringify({ pids }));
  } catch (err) {
    console.warn(
      `[hostinger] standby yazılamadı:`,
      err instanceof Error ? err.message : err,
    );
  }
}

function pruneStandbyPids() {
  const alive = readStandbyPids().filter((p) => p === process.pid || pidAlive(p));
  writeStandbyPids(alive);
  return alive;
}

/** @returns {boolean} slot alındı mı */
function claimStandbySlot() {
  let alive = pruneStandbyPids();
  // Birincil yanlışlıkla listede kaldıysa slot hesabından düş.
  const lockPid = readLockPid();
  if (lockPid && lockPid !== process.pid && alive.includes(lockPid)) {
    alive = alive.filter((p) => p !== lockPid);
    writeStandbyPids(alive);
  }
  if (alive.includes(process.pid)) return true;
  if (alive.length >= standbyMax) {
    console.warn(
      `[hostinger] yedek slot dolu max=${standbyMax} pids=${alive.join(",")} — hemen çıkılıyor (biz=${process.pid})`,
    );
    return false;
  }
  writeStandbyPids([...alive, process.pid]);
  return true;
}

function removeStandbyPid(pid) {
  const next = readStandbyPids().filter((p) => p !== pid);
  if (next.length === 0) {
    try {
      fs.unlinkSync(standbyFile);
    } catch {
      writeStandbyPids([]);
    }
  } else {
    writeStandbyPids(next);
  }
}

/**
 * Yaşayan birincilin kilidini ASLA çalma.
 * Ölü PID → temizle ve al. Alamazsan false (yine de listen edilir).
 */
function claimPrimaryLock() {
  for (let i = 0; i < 8; i++) {
    const existing = readLockState();
    if (existing && pidAlive(existing.pid)) {
      vwarn(
        `[hostinger] kilit dolu — yaşayan birincil pid=${existing.pid} ready=${existing.ready} ageMs=${existing.t ? Date.now() - existing.t : "?"} — yedek olacağız (pid=${process.pid} port=${port})`,
      );
      return false;
    }
    if (existing) {
      try {
        fs.unlinkSync(pidFile);
        console.log(
          `[hostinger] ölü kilit temizlendi eskiPid=${existing.pid} yeniPid=${process.pid}`,
        );
      } catch {
        /* */
      }
    }
    try {
      const fd = fs.openSync(pidFile, "wx");
      fs.writeFileSync(
        fd,
        JSON.stringify({ pid: process.pid, ready: false, t: Date.now() }),
      );
      fs.closeSync(fd);
      console.log(
        `[hostinger] birincil kilit alındı pid=${process.pid} port=${port} rss=${rssMb()}MB`,
      );
      isPrimaryProcess = true;
      return true;
    } catch (err) {
      if (err?.code !== "EEXIST") {
        console.warn("[hostinger] kilit hatası:", err instanceof Error ? err.message : err);
        isPrimaryProcess = true;
        return true;
      }
    }
  }
  console.warn(`[hostinger] kilit alınamadı pid=${process.pid} — yedek olacağız`);
  return false;
}

/**
 * listen sonrası kilit yenileme.
 * Yaşayan ready sahibi varken EZME. Yok / ölü / bootStuck → yaz.
 * @returns {boolean} bu süreç kilit sahibi mi
 */
function tryAdoptLockOnListen() {
  const existing = readLockState();
  if (!existing) {
    writeLock(false);
    isPrimaryProcess = true;
    return true;
  }
  if (existing.pid === process.pid) {
    writeLock(Boolean(sfHandler));
    isPrimaryProcess = true;
    return true;
  }
  if (!pidAlive(existing.pid)) {
    console.log(
      `[hostinger] listen: ölü sahip pid=${existing.pid} — kilit alınıyor pid=${process.pid}`,
    );
    writeLock(false);
    isPrimaryProcess = true;
    return true;
  }
  if (existing.ready) {
    vwarn(
      `[hostinger] listen: yaşayan ready birincil pid=${existing.pid} — kilit ezilmedi (biz=${process.pid})`,
    );
    return false;
  }
  const age = Date.now() - (existing.t || 0);
  if (age > bootStuckMs) {
    console.warn(
      `[hostinger] listen: bootStuck birincil pid=${existing.pid} ageMs=${age} — kilit devralınıyor (biz=${process.pid})`,
    );
    writeLock(false);
    isPrimaryProcess = true;
    return true;
  }
  console.warn(
    `[hostinger] listen: soğuk birincil pid=${existing.pid} ageMs=${age} — kilit ezilmedi (biz=${process.pid})`,
  );
  return false;
}

function resolveEnvPath(p) {
  if (!p) return null;
  return isAbsolute(p) ? p : resolve(process.cwd(), p);
}

function describePathSize(envPath) {
  if (envPath == null || envPath === "") return "(yok)";
  const abs = resolveEnvPath(envPath);
  try {
    const st = fs.statSync(abs);
    return `${abs} size=${st.size}`;
  } catch {
    return `${abs} (yok)`;
  }
}

function readProcCmdline(pid) {
  try {
    return fs.readFileSync(`/proc/${pid}/cmdline`, "utf8").replace(/\0/g, " ").trim() || null;
  } catch {
    return null;
  }
}

function platformEnvNames() {
  const re = /passenger|lsapi|litespeed|openlitespeed|phusion|hostinger|lsnode|nodejs/i;
  return Object.keys(process.env)
    .filter((k) => re.test(k))
    .sort();
}

function readCgroupMemory() {
  const out = { max: null, current: null };
  const pairs = [
    ["/sys/fs/cgroup/memory.max", "/sys/fs/cgroup/memory.current"],
    [
      "/sys/fs/cgroup/memory/memory.limit_in_bytes",
      "/sys/fs/cgroup/memory/memory.usage_in_bytes",
    ],
  ];
  for (const [maxPath, curPath] of pairs) {
    try {
      if (!fs.existsSync(maxPath)) continue;
      out.max = fs.readFileSync(maxPath, "utf8").trim();
      if (fs.existsSync(curPath)) out.current = fs.readFileSync(curPath, "utf8").trim();
      return out;
    } catch {
      /* */
    }
  }
  try {
    const cg = fs.readFileSync("/proc/self/cgroup", "utf8");
    for (const line of cg.split("\n")) {
      const v2 = line.match(/^0::(.*)$/);
      if (v2) {
        const sub = v2[1] === "/" ? "" : v2[1];
        const maxPath = `/sys/fs/cgroup${sub}/memory.max`;
        const curPath = `/sys/fs/cgroup${sub}/memory.current`;
        if (fs.existsSync(maxPath)) {
          out.max = fs.readFileSync(maxPath, "utf8").trim();
          if (fs.existsSync(curPath)) out.current = fs.readFileSync(curPath, "utf8").trim();
          return out;
        }
      }
      const v1 = line.match(/^\d+:memory:(.*)$/);
      if (v1) {
        const sub = v1[1] === "/" ? "" : v1[1];
        const maxPath = `/sys/fs/cgroup/memory${sub}/memory.limit_in_bytes`;
        const curPath = `/sys/fs/cgroup/memory${sub}/memory.usage_in_bytes`;
        if (fs.existsSync(maxPath)) {
          out.max = fs.readFileSync(maxPath, "utf8").trim();
          if (fs.existsSync(curPath)) out.current = fs.readFileSync(curPath, "utf8").trim();
          return out;
        }
      }
    }
  } catch {
    /* */
  }
  if (!cgroupMissingLogged) {
    cgroupMissingLogged = true;
    if (VERBOSE) console.warn("[hostinger] cgroup okunamadı");
  }
  return out;
}

function logStartupProbe() {
  const ppid = process.ppid;
  const parentCmd = ppid ? readProcCmdline(ppid) : null;
  const line = `[hostinger] teşhis-start pid=${process.pid} ppid=${ppid} parentCmd=${parentCmd ?? "n/a"} argv=${JSON.stringify(process.argv)} port=${port} node=${process.version} primary=${isPrimaryProcess}`;
  if (isPrimaryProcess) console.log(line);
  else vlog(line);
  // Env satırları sadece birincilde + VERBOSE — log hacmini düşür.
  if (!isPrimaryProcess || !VERBOSE) return;
  console.log(
    `[hostinger] teşhis-env-adları ${platformEnvNames().join(",") || "(yok)"}`,
  );
  for (const key of [
    "LSAPI_MAX_PROCESS_TIME",
    "LSAPI_PGRP_MAX_IDLE",
    "LSAPI_PPID_NO_CHECK",
    "LSNODE_GUARD_PPID",
    "LSNODE_CONSOLE_LOG",
    "LSNODE_SOCKET",
    "LSNODE_STARTUP_FILE",
  ]) {
    const val = process.env[key];
    console.log(
      `[hostinger] teşhis-env ${key}=${val === undefined ? "(yok)" : val}`,
    );
  }
  console.log(
    `[hostinger] teşhis-lsnode-console ${describePathSize(process.env.LSNODE_CONSOLE_LOG)}`,
  );
}

function logLifecycleSnapshot(tag) {
  const lock = readLockState();
  const cg = readCgroupMemory();
  const uptimeMs = Date.now() - startedAt;
  const standbyPids = readStandbyPids();
  const line = `[hostinger] ${tag} pid=${process.pid} uptimeMs=${uptimeMs} reqTotal=${requestsTotal} reqInFlight=${requestsInFlight} kilitPid=${lock?.pid ?? "-"} kilitReady=${lock?.ready ?? "-"} standbyPids=${standbyPids.join(",") || "-"} rssMB=${rssMb()} cgroupMax=${cg.max ?? "-"} cgroupCur=${cg.current ?? "-"}`;
  if (tag === "teşhis-30s") {
    if (isPrimaryProcess) console.log(line);
    else vlog(line);
    return;
  }
  if (tag === "teşhis-kapanış-SIGTERM") {
    vlog(line);
    return;
  }
  console.log(line);
}

function startPpidWatch() {
  setInterval(() => {
    const p = process.ppid;
    if (p === lastSeenPpid) return;
    console.warn(
      `[hostinger] ppid değişti ${lastSeenPpid}→${p} primaryUptimeMs=${Date.now() - startedAt} pid=${process.pid}`,
    );
    lastSeenPpid = p;
  }, 2_000).unref();
}

function logPrimarySignal(signal, n) {
  if (!isPrimaryProcess) return;
  const now = Date.now();
  console.warn(
    `[hostinger] teşhis-sinyal ${signal} n=${n} ageMs=${now - startedAt} pid=${process.pid} ppid=${process.ppid} ppidAlive=${ppidAlive(process.ppid)} rss=${rssMb()}MB standby=${isStandbyMode}`,
  );
}

function onSigterm() {
  sigtermCount += 1;
  const now = Date.now();
  if (firstSigtermAt == null) firstSigtermAt = now;
  const role = isStandbyMode ? "standby" : isPrimaryProcess ? "primary" : "yedek";
  const sinceLastReqMs = lastRequestAt == null ? "never" : now - lastRequestAt;
  console.warn(
    `[hostinger] SIGTERM alındı #${sigtermCount} ageMs=${now - startedAt} sinceFirstMs=${now - firstSigtermAt} pid=${process.pid}`,
  );
  vwarn(
    `[hostinger] teşhis-sigterm-anında pid=${process.pid} role=${role} sinceLastReqMs=${sinceLastReqMs} inFlight=${requestsInFlight} primary=${isPrimaryProcess} standby=${isStandbyMode}`,
  );
  logPrimarySignal("SIGTERM", sigtermCount);
  shutdown("SIGTERM");
}

function onSigint() {
  sigintCount += 1;
  console.warn(
    `[hostinger] SIGINT alındı #${sigintCount} ageMs=${Date.now() - startedAt} pid=${process.pid}`,
  );
  logPrimarySignal("SIGINT", sigintCount);
  shutdown("SIGINT");
}

function shutdown(signal) {
  if (shuttingDown) return;

  // SIGTERM yok sayma YOK. Hostinger ignore edilen birincili SIGKILL ile
  // öldürüyordu → ölü kilit + soğuk boot. Kilidi hemen bırak; yedek devralsın.
  const yieldingPrimary =
    signal === "SIGTERM" &&
    Boolean(sfHandler) &&
    !bootFailed &&
    readLockPid() === process.pid;

  shuttingDown = true;
  exitReason = yieldingPrimary ? "birincil-devretme" : signal;
  const ageMs = Date.now() - startedAt;
  if (yieldingPrimary) {
    console.warn(
      `[hostinger] birincil nazikçe devrediyor pid=${process.pid} ageMs=${ageMs} rss=${rssMb()}MB reqTotal=${requestsTotal} inFlight=${requestsInFlight} — kilit bırakılıyor`,
    );
  } else {
    console.error(
      `[hostinger] kapanış neden=${signal} pid=${process.pid} port=${port} ageMs=${ageMs} rss=${rssMb()}MB sf=${Boolean(sfHandler)} reqTotal=${requestsTotal} inFlight=${requestsInFlight} sigtermN=${sigtermCount} sigintN=${sigintCount}`,
    );
  }
  logLifecycleSnapshot(`teşhis-kapanış-${exitReason}`);

  // Önce kilit + primary sock — yedek 1 sn poll içinde devralsın
  clearLock();
  closePrimarySock();

  const graceMs = yieldingPrimary ? 1200 : signal === "SIGTERM" ? 2500 : sfHandler ? 5000 : 10_000;

  if (!sfHandler && !bootFailed) notifyBootFailed();

  try {
    httpServer?.close(() => {
      const msg = `[hostinger] soket kapandı pid=${process.pid} neden=${exitReason}`;
      if (exitReason === "SIGTERM") vlog(msg);
      else console.log(msg);
    });
  } catch {
    /* */
  }

  const graceStart = Date.now();
  const deadline = graceStart + graceMs;
  const poll = setInterval(() => {
    if (requestsInFlight <= 0 || Date.now() >= deadline) {
      clearInterval(poll);
      const ms = Date.now() - graceStart;
      const sonuç = requestsInFlight <= 0 ? "tamam" : "zaman-aşımı";
      const msg = `[hostinger] graceful-bekleme inFlight=${requestsInFlight} sonuç=${sonuç} ms=${ms}`;
      if (sonuç === "zaman-aşımı") console.log(msg);
      else vlog(msg);
      process.exit(0);
    }
  }, 50);
  // SIGTERM'de event loop açık kalsın (unref yok)
  if (signal !== "SIGTERM") poll.unref?.();
  setTimeout(() => {
    console.log(
      `[hostinger] graceful-bekleme inFlight=${requestsInFlight} sonuç=zaman-aşımı ms=${Date.now() - graceStart}`,
    );
    process.exit(0);
  }, graceMs + 200).unref();
}

process.on("uncaughtException", (err) => {
  console.error("[hostinger] yakalanmamış hata (süreç açık kalıyor):", err);
});
process.on("unhandledRejection", (err) => {
  console.error("[hostinger] işlenmemiş promise (süreç açık kalıyor):", err);
});
process.on("SIGTERM", onSigterm);
process.on("SIGINT", onSigint);
process.on("exit", (code) => {
  // sync only — async I/O güvenilmez
  const line = `[hostinger] exit code=${code} reason=${exitReason} ageMs=${Date.now() - startedAt} pid=${process.pid} ppid=${process.ppid} primary=${isPrimaryProcess} standby=${isStandbyMode} sigtermN=${sigtermCount} sigintN=${sigintCount}`;
  if (
    exitReason === "unknown" ||
    exitReason === "FAZLALIK_SÜREÇ" ||
    VERBOSE
  ) {
    console.error(line);
  }
});

function pinResolves(pinned) {
  const orig = NodeModule._resolveFilename;
  NodeModule._resolveFilename = function pinnedResolve(request, parent, isMain, options) {
    if (Object.prototype.hasOwnProperty.call(pinned, request)) {
      return pinned[request];
    }
    return orig.call(this, request, parent, isMain, options);
  };
}

/**
 * Hostinger'ın pnpm hoisting'i bazı paketleri (ioredis, mysql2 gibi) düz bir
 * kopya olarak apps/storefront/node_modules altına koyuyor ama o paketin alt
 * bağımlılıklarını (sırasıyla @ioredis/commands, sql-escaper) getirmiyor —
 * pnpm'in normalde .pnpm sanal deposu üzerinden kurduğu sembolik bağlar
 * kayboluyor. hostPkg nereden çözülüyorsa depName'i önce oradan, olmazsa
 * .pnpm deposundaki başka bir hostPkg kopyasından, o da olmazsa doğrudan
 * .pnpm'deki depName paketinden bulup global pin haritasına ekler.
 */
function tryResolveFrom(pkgJsonPath, depName) {
  try {
    return createRequire(pkgJsonPath).resolve(depName);
  } catch {
    return null;
  }
}

function pnpmFolderPrefix(pkgName) {
  return pkgName.startsWith("@") ? `${pkgName.replace("/", "+")}@` : `${pkgName}@`;
}

function findInPnpmStore(depName) {
  const pnpmDir = join(root, "node_modules/.pnpm");
  if (!fs.existsSync(pnpmDir)) return null;
  const needle = pnpmFolderPrefix(depName);
  let names;
  try {
    names = fs.readdirSync(pnpmDir);
  } catch {
    return null;
  }
  for (const name of names) {
    if (!name.startsWith(needle)) continue;
    const depDir = join(pnpmDir, name, "node_modules", depName);
    const depPkgJson = join(depDir, "package.json");
    if (!fs.existsSync(depPkgJson)) continue;
    const resolved = tryResolveFrom(depPkgJson, depName);
    if (resolved) return resolved;
    try {
      const pkg = JSON.parse(fs.readFileSync(depPkgJson, "utf8"));
      return join(depDir, pkg.main || "index.js");
    } catch {
      /* bu kopya bozuk */
    }
  }
  return null;
}

function pinNestedDep(pinned, hostPkg, depName, fromSf) {
  if (Object.prototype.hasOwnProperty.call(pinned, depName)) return;

  const candidates = [];
  try {
    candidates.push(fromSf.resolve(`${hostPkg}/package.json`));
  } catch {
    /* hostPkg storefront'tan hiç çözülmüyor, yapacak bir şey yok */
    return;
  }

  const already = tryResolveFrom(candidates[0], depName);
  if (already) {
    // Şimdi çözülse bile Next require-hook sonra aynı require'ı
    // izole edip kaçırabiliyor (safer-buffer tam olarak böyle kayboldu).
    pinned[depName] = already;
    return;
  }

  const pnpmDir = join(root, "node_modules/.pnpm");
  if (fs.existsSync(pnpmDir)) {
    const hostNeedle = pnpmFolderPrefix(hostPkg);
    try {
      for (const name of fs.readdirSync(pnpmDir)) {
        if (!name.startsWith(hostNeedle)) continue;
        const pkg = join(pnpmDir, name, "node_modules", hostPkg, "package.json");
        if (fs.existsSync(pkg)) candidates.push(pkg);
      }
    } catch {
      /* */
    }
  }

  for (const pkgJson of candidates) {
    const fromHost = createRequire(pkgJson);
    try {
      const depPath = fromHost.resolve(depName);
      pinned[hostPkg] = fromHost.resolve(hostPkg);
      pinned[depName] = depPath;
      console.log(`[hostinger] ${depName} → ${depPath} (${hostPkg} üzerinden pinlendi)`);
      return;
    } catch {
      /* bu kopyada da yok */
    }
  }

  for (const dir of [storefrontDir, adminDir, root]) {
    const pkgJson = join(dir, "node_modules", depName, "package.json");
    const resolved = fs.existsSync(pkgJson) ? tryResolveFrom(pkgJson, depName) : null;
    if (resolved) {
      pinned[depName] = resolved;
      console.log(`[hostinger] ${depName} → ${resolved} (${dir} node_modules)`);
      return;
    }
  }

  const fromPnpm = findInPnpmStore(depName);
  if (fromPnpm) {
    pinned[depName] = fromPnpm;
    console.log(`[hostinger] ${depName} → ${fromPnpm} (.pnpm mağazasından doğrudan pinlendi)`);
    return;
  }
  console.warn(`[hostinger] ${depName} hiçbir yerde bulunamadı (${hostPkg} bunu istiyor)`);
}

/**
 * hostPkg'ın TÜM runtime bağımlılıklarını (package.json "dependencies")
 * tek tek pinNestedDep ile kontrol eder. sql-escaper, lru.min gibi
 * eksikleri birer birer yamalamak yerine — mysql2/ioredis hangi alt
 * paketi eksik getirirse getirsin otomatik yakalanır.
 */
function pinAllDeps(pinned, hostPkg, fromSf, seen = new Set()) {
  if (seen.has(hostPkg)) return;
  seen.add(hostPkg);
  let pkgJsonPath;
  try {
    pkgJsonPath = fromSf.resolve(`${hostPkg}/package.json`);
  } catch {
    return; // hostPkg storefront'tan hiç çözülmüyor
  }
  let deps;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
    deps = Object.keys(pkg.dependencies ?? {});
  } catch {
    return;
  }
  for (const depName of deps) {
    pinNestedDep(pinned, hostPkg, depName, fromSf);
    // mysql2 → iconv-lite çözülür ama iconv-lite → safer-buffer Hostinger
    // kopyasında kayboluyor. Bir seviye derine inmeden pin kaçıyor.
    pinAllDeps(pinned, depName, fromSf, seen);
  }
}

function pinReactAndIoredis() {
  const fromSf = createRequire(join(storefrontDir, "package.json"));
  const pinned = Object.create(null);
  for (const name of [
    "react",
    "react/jsx-runtime",
    "react/jsx-dev-runtime",
    "react-dom",
    "react-dom/client",
    "react-dom/server",
    "react-dom/server.edge",
    "react-dom/server.browser",
  ]) {
    try {
      pinned[name] = fromSf.resolve(name);
    } catch {
      /* optional */
    }
  }

  pinAllDeps(pinned, "ioredis", fromSf);
  pinAllDeps(pinned, "mysql2", fromSf);
  pinAllDeps(pinned, "iconv-lite", fromSf);

  for (const extra of ["safer-buffer", "sql-escaper", "lru.min", "@ioredis/commands"]) {
    if (Object.prototype.hasOwnProperty.call(pinned, extra)) continue;
    try {
      pinned[extra] = fromSf.resolve(extra);
    } catch {
      const found = findInPnpmStore(extra);
      if (found) {
        pinned[extra] = found;
        console.log(`[hostinger] ${extra} → ${found} (yedek tarama)`);
      } else {
        console.warn(`[hostinger] ${extra} pinlenemedi`);
      }
    }
  }

  pinResolves(pinned);
}

function isPrivatePath(urlPath) {
  const path = String(urlPath ?? "/").split("?")[0];
  if (path.startsWith("/api") || path.startsWith("/yonetim") || isAdminPath(path)) return true;
  return (
    path.startsWith("/sepet") ||
    path.startsWith("/odeme") ||
    path.startsWith("/hesabim") ||
    path.startsWith("/favoriler") ||
    path.startsWith("/giris") ||
    path.startsWith("/kayit") ||
    path.startsWith("/cikis")
  );
}

/** Next.js dynamic pages send no-store; Hostinger CDN then never caches HTML. */
function enableSharedHtmlCache(req, res) {
  const method = req.method ?? "GET";
  if (method !== "GET" && method !== "HEAD") return;
  if (isPrivatePath(req.url ?? "/")) return;

  const cacheValue = "public, s-maxage=60, stale-while-revalidate=300";
  const origSetHeader = res.setHeader.bind(res);
  const origWriteHead = res.writeHead.bind(res);

  const patchHeaders = (hdrs) => {
    if (!hdrs || typeof hdrs !== "object" || Array.isArray(hdrs)) return hdrs;
    const next = { ...hdrs };
    for (const key of Object.keys(next)) {
      if (key.toLowerCase() === "cache-control") delete next[key];
    }
    next["Cache-Control"] = cacheValue;
    next["CDN-Cache-Control"] = cacheValue;
    next["Vary"] = "Host, Accept-Encoding";
    return next;
  };

  const apply = () => {
    if (res.headersSent || res.statusCode >= 400) return;
    origSetHeader("Cache-Control", cacheValue);
    origSetHeader("CDN-Cache-Control", cacheValue);
    origSetHeader("Vary", "Host, Accept-Encoding");
  };

  res.setHeader = (name, value) => {
    if (String(name).toLowerCase() === "cache-control") {
      apply();
      return res;
    }
    return origSetHeader(name, value);
  };
  res.writeHead = (status, reason, headers) => {
    if (status >= 400) {
      return origWriteHead(status, reason, headers);
    }
    if (typeof reason === "object" && reason != null) {
      return origWriteHead(status, patchHeaders(reason));
    }
    if (headers && typeof headers === "object") {
      return origWriteHead(status, reason, patchHeaders(headers));
    }
    apply();
    return origWriteHead(status, reason, headers);
  };
}

function sendHtml(res, status, html, extraHeaders) {
  res.statusCode = status;
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.setHeader("x-guntan-app", extraHeaders?.["x-guntan-app"] ?? "gateway");
  if (extraHeaders) {
    for (const [key, value] of Object.entries(extraHeaders)) {
      if (key === "x-guntan-app") continue;
      res.setHeader(key, value);
    }
  }
  res.end(html);
}

function sendUnavailable(res, title, body, status = 503) {
  // meta refresh=2, soğuk başlangıçta saniyede onlarca istek üreterek
  // Hostinger'ın paralel süreç fırtınasını büyütüyordu. Health storefront
  // hazır olana kadar bekle; ancak o zaman yenile.
  const bootPoll =
    status === 200
      ? `<script>(async()=>{for(let i=0;i<45;i++){await new Promise(r=>setTimeout(r,2000));try{const j=await(await fetch("/api/health",{cache:"no-store"})).json();if(j&&j.storefront){location.reload();return}}catch{}}location.reload()})()</script>`
      : `<meta http-equiv="refresh" content="5"/>`;
  sendHtml(
    res,
    status,
    `<!doctype html><html lang="tr"><meta charset="utf-8"/><title>${title}</title>
${bootPoll}
<body style="font-family:system-ui;padding:2rem;max-width:40rem">
<h1>${title}</h1>
<p>${body}</p>
</body></html>`,
    {
      "x-guntan-app": status === 200 ? "booting" : "unavailable",
      "Retry-After": status === 200 ? "5" : "2",
      "Cache-Control": "no-store",
      "CDN-Cache-Control": "no-store",
    },
  );
}

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "proxy-connection",
  "te",
  "trailer",
  "trailers",
  "transfer-encoding",
  "upgrade",
]);

function isStaticAssetPath(pathOnly) {
  const p = String(pathOnly ?? "");
  if (p.startsWith("/_next/") || p.startsWith("/brands/") || p.startsWith("/slider/")) {
    return true;
  }
  return /\.(?:js|css|mjs|map|png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|eot|mp4|webm|pdf)$/i.test(
    p,
  );
}

function wantsHtml(req) {
  return String(req.headers.accept ?? "").includes("text/html");
}

function closePrimarySock() {
  const netSrv = primaryNetServer;
  const tcpSrv = primaryTcpServer;
  const mayUnlink = isPrimaryProcess === true;
  primaryNetServer = null;
  primaryTcpServer = null;
  primaryHttpBridge = null;
  primaryEndpoint = null;

  const unlinkOwnedArtifacts = () => {
    if (!mayUnlink) return;
    try {
      fs.unlinkSync(primarySockPath);
    } catch {
      /* */
    }
    try {
      const raw = fs.readFileSync(primaryEndpointFile, "utf8");
      const j = JSON.parse(raw);
      // Yalnız kendi yazdığımız endpoint'i sil — başka birincili ezme.
      if (Number(j.pid) === process.pid) fs.unlinkSync(primaryEndpointFile);
    } catch {
      /* parse/okuma hatasında kör unlink YOK */
    }
  };

  let pending = 0;
  const onOneClosed = () => {
    pending -= 1;
    if (pending <= 0) unlinkOwnedArtifacts();
  };

  for (const s of [netSrv, tcpSrv]) {
    if (!s) continue;
    pending += 1;
    try {
      s.once("close", onOneClosed);
      s.close();
    } catch {
      onOneClosed();
    }
  }
  if (pending === 0) unlinkOwnedArtifacts();
}

function writePrimaryEndpoint(ep) {
  primaryEndpoint = ep;
  const payload = {
    pid: process.pid,
    t: Date.now(),
    sockPath: primarySockPath,
    ...ep,
  };
  const tmp = `${primaryEndpointFile}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(payload));
    fs.renameSync(tmp, primaryEndpointFile);
  } catch (err) {
    console.warn(
      `[hostinger] primary-endpoint yazılamadı:`,
      err instanceof Error ? err.message : err,
    );
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* */
    }
  }
}

/** @returns {{ kind: "unix", path: string, pid?: number } | { kind: "tcp", host: string, port: number, pid?: number } | null} */
function readPrimaryEndpoint() {
  try {
    const j = JSON.parse(fs.readFileSync(primaryEndpointFile, "utf8"));
    const pid = Number(j.pid);
    if (Number.isInteger(pid) && pid > 0 && pid !== process.pid && !pidAlive(pid)) {
      return null;
    }
    if (j.kind === "unix" && j.path) return { kind: "unix", path: String(j.path), pid };
    if (j.kind === "tcp" && j.port) {
      return {
        kind: "tcp",
        host: String(j.host || "127.0.0.1"),
        port: Number(j.port),
        pid,
      };
    }
    if (j.sockPath) return { kind: "unix", path: String(j.sockPath), pid };
    if (j.port) {
      return { kind: "tcp", host: "127.0.0.1", port: Number(j.port), pid };
    }
  } catch {
    /* */
  }
  if (fs.existsSync(primarySockPath)) {
    return { kind: "unix", path: primarySockPath };
  }
  return null;
}

function touchAlive() {
  try {
    fs.mkdirSync(aliveDir, { recursive: true });
    fs.writeFileSync(join(aliveDir, String(process.pid)), String(Date.now()));
  } catch {
    /* */
  }
}

function clearAlive() {
  try {
    fs.unlinkSync(join(aliveDir, String(process.pid)));
  } catch {
    /* */
  }
}

function pruneAlive() {
  try {
    if (!fs.existsSync(aliveDir)) return;
    for (const name of fs.readdirSync(aliveDir)) {
      const pid = Number(name);
      if (!Number.isInteger(pid) || pid <= 0) continue;
      if (pid !== process.pid && !pidAlive(pid)) {
        try {
          fs.unlinkSync(join(aliveDir, name));
        } catch {
          /* */
        }
      }
    }
  } catch {
    /* */
  }
}

function countAliveProcesses() {
  pruneAlive();
  try {
    return fs.readdirSync(aliveDir).filter((n) => /^\d+$/.test(n)).length;
  } catch {
    return 0;
  }
}

function logAliveSnapshot(tag) {
  touchAlive();
  console.log(
    `[hostinger] ${tag} pid=${process.pid} aliveCount=${countAliveProcesses()} rss=${rssMb()}MB`,
  );
}


function selfTestPrimaryUnix() {
  return new Promise((resolve) => {
    const req = http.request(
      {
        socketPath: primarySockPath,
        path: "/api/health",
        method: "GET",
        headers: { host: canonicalHost },
        timeout: 2000,
      },
      (res) => {
        res.resume();
        console.log(
          `[hostinger] primary-sock self-test ok status=${res.statusCode} pid=${process.pid}`,
        );
        resolve(true);
      },
    );
    req.on("error", (err) => {
      console.warn(
        `[hostinger] primary-sock self-test FAIL code=${err?.code ?? "-"} message=${err instanceof Error ? err.message : err}`,
      );
      resolve(false);
    });
    req.on("timeout", () => {
      req.destroy();
      console.warn(`[hostinger] primary-sock self-test FAIL code=timeout`);
      resolve(false);
    });
    req.end();
  });
}

/**
 * LiteSpeed http.Server.prototype.listen'ı yamadığı için ikinci listen ignore olur.
 * Bu yüzden net.createServer dinler; http bridge'e connection emit edilir (listen YOK).
 */
function startPrimarySock() {
  if (!useStandbyProxy || shuttingDown) return;
  if (readLockPid() !== process.pid) return;
  if (primaryNetServer?.listening) return;

  closePrimarySock();

  primaryHttpBridge = null;

  const onConnection = (socket) => {
    primarySockEventLogs += 1;
    if (primarySockEventLogs <= 10) {
      vlog(`[hostinger] primary-sock bağlantı n=${primarySockEventLogs}`);
    }
    socket.on("error", (err) => {
      if (primarySockEventLogs <= 10) {
        console.warn(
          `[hostinger] primary-sock soket-hata code=${err?.code ?? "-"} syscall=${err?.syscall ?? "-"} message=${err instanceof Error ? err.message : err}`,
        );
      }
    });
    socket.on("close", (hadError) => {
      if (hadError) {
        console.warn(`[hostinger] primary-sock soket-kapandı hadError=true`);
      } else {
        vwarn(`[hostinger] primary-sock soket-kapandı hadError=false`);
      }
    });
    // Ana server'a ver — sayaç/tracking doğru çalışır.
    if (httpServer) httpServer.emit("connection", socket);
    else {
      console.warn("[hostinger] primary-sock: httpServer yok");
      socket.destroy();
    }
  };

  const listenUnix = () =>
    new Promise((resolve) => {
      try {
        fs.unlinkSync(primarySockPath);
      } catch {
        /* */
      }
      const n = net.createServer(onConnection);
      let settled = false;
      n.once("error", (err) => {
        if (settled) return;
        settled = true;
        console.warn(
          `[hostinger] primary-sock hata: ${err instanceof Error ? err.message : err}`,
        );
        try {
          n.close();
        } catch {
          /* */
        }
        resolve(null);
      });
      n.listen(primarySockPath, () => {
        if (settled) return;
        settled = true;
        try {
          fs.chmodSync(primarySockPath, 0o600);
        } catch (err) {
          console.warn(
            `[hostinger] primary-sock chmod:`,
            err instanceof Error ? err.message : err,
          );
        }
        console.log(
          `[hostinger] primary-sock dinliyor path=${primarySockPath} pid=${process.pid}`,
        );
        resolve(n);
      });
    });

  const listenTcp = () =>
    new Promise((resolve) => {
      const n = net.createServer(onConnection);
      let settled = false;
      n.once("error", (err) => {
        if (settled) return;
        settled = true;
        console.warn(
          `[hostinger] primary-tcp hata: ${err instanceof Error ? err.message : err}`,
        );
        try {
          n.close();
        } catch {
          /* */
        }
        resolve(null);
      });
      n.listen(0, "127.0.0.1", () => {
        if (settled) return;
        settled = true;
        const addr = n.address();
        const p = addr && typeof addr === "object" ? addr.port : 0;
        console.log(
          `[hostinger] primary-tcp dinliyor 127.0.0.1:${p} pid=${process.pid}`,
        );
        resolve({ server: n, port: p });
      });
    });

  (async () => {
    const unix = await listenUnix();
    let unixOk = false;
    if (unix) {
      primaryNetServer = unix;
      unixOk = await selfTestPrimaryUnix();
      if (!unixOk) {
        console.warn(
          `[hostinger] primary-sock self-test başarısız — TCP yedeğe geçiliyor`,
        );
        try {
          unix.close();
        } catch {
          /* */
        }
        primaryNetServer = null;
        try {
          fs.unlinkSync(primarySockPath);
        } catch {
          /* */
        }
      }
    } else {
      console.warn(`[hostinger] primary-sock unix açılamadı`);
    }

    // TCP her zaman aç (unix OK olsa bile GET retry için)
    const tcp = await listenTcp();
    let tcpPort = null;
    if (tcp) {
      // unix dinliyorsa tcp ayrı server — primaryNetServer unix'te kalsın
      if (!primaryNetServer) primaryNetServer = tcp.server;
      else primaryTcpServer = tcp.server;
      tcpPort = tcp.port;
    }

    if (unixOk) {
      writePrimaryEndpoint({
        kind: "unix",
        path: primarySockPath,
        sockPath: primarySockPath,
        tcpPort,
        host: "127.0.0.1",
        port: tcpPort,
      });
      return;
    }
    if (tcp) {
      writePrimaryEndpoint({
        kind: "tcp",
        host: "127.0.0.1",
        port: tcp.port,
        sockPath: null,
        tcpPort: tcp.port,
      });
      return;
    }
    console.error(
      `[hostinger] primary-endpoint BAŞARISIZ — unix ve TCP açılamadı pid=${process.pid}`,
    );
  })();
}

function probePrimaryConnect(ep, timeoutMs = 500) {
  return new Promise((resolve) => {
    const pathOrHost =
      ep.kind === "unix" || ep.path || ep.sockPath
        ? { path: ep.path || ep.sockPath }
        : { host: ep.host || "127.0.0.1", port: Number(ep.port || ep.tcpPort) };
    const sock = pathOrHost.path
      ? net.connect({ path: pathOrHost.path })
      : net.connect({ host: pathOrHost.host, port: pathOrHost.port });
    const timer = setTimeout(() => {
      sock.destroy();
      resolve({ ok: false, reason: "timeout" });
    }, timeoutMs);
    sock.once("connect", () => {
      clearTimeout(timer);
      sock.end();
      resolve({ ok: true, reason: null });
    });
    sock.once("error", (err) => {
      clearTimeout(timer);
      const code = err?.code || "error";
      resolve({ ok: false, reason: code });
    });
  });
}

function logProxyError(reason, detail) {
  console.warn(
    `[hostinger] proxy-hata pid=${process.pid} reason=${reason}${detail ? ` detail=${detail}` : ""}`,
  );
}

function logPlaceholder(kind, req, pathOnly) {
  if (loggedPlaceholders >= 5) return;
  loggedPlaceholders += 1;
  console.warn(
    `[hostinger] yer-tutucu/503 #${loggedPlaceholders} kind=${kind} pid=${process.pid} host=${req.headers.host ?? "-"} url=${pathOnly}`,
  );
}

/**
 * Yedekten birincile unix/TCP üzerinden aktar.
 * @returns {Promise<boolean>}
 */
function proxyToPrimary(req, res) {
  return new Promise((resolve) => {
    const lock = readLockState();
    // ready=false iken de erken sock için denenebilir (çağıran kontrol eder).
    if (!lock || lock.pid === process.pid || !pidAlive(lock.pid)) {
      resolve(false);
      return;
    }

    let ep = readPrimaryEndpoint();
    if (!ep) {
      logProxyError("no-sock", `${primarySockPath}|${primaryEndpointFile}`);
      resolve(false);
      return;
    }

    if (ep.pid && Number(ep.pid) !== lock.pid) {
      console.warn(
        `[hostinger] proxy-atlandı reason=stale-pid jsonPid=${ep.pid} lockPid=${lock.pid}`,
      );
      resolve(false);
      return;
    }

    /** @type {Record<string, string | string[] | undefined>} */
    const headers = { ...req.headers };
    for (const key of Object.keys(headers)) {
      if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) delete headers[key];
    }
    headers["x-forwarded-host"] = String(req.headers.host ?? "");
    headers["x-forwarded-proto"] = String(
      req.headers["x-forwarded-proto"] ?? "https",
    );
    const priorFor = req.headers["x-forwarded-for"];
    const remote = req.socket?.remoteAddress ?? "";
    headers["x-forwarded-for"] = priorFor
      ? `${priorFor}, ${remote}`
      : remote;

    const pathOnly = String(req.url ?? "/").split("?")[0];
    const method = String(req.method ?? "GET").toUpperCase();
    const isIdempotent = method === "GET" || method === "HEAD";
    const proxyT0 = Date.now();
    let settled = false;
    let headersWritten = false;
    let viaUsed = ep.kind === "tcp" ? "tcp" : "unix";
    let enoentRetried = false;
    let tcpTried = false;

    const doneOk = () => {
      if (settled) return;
      settled = true;
      loggedProxyOk += 1;
      const msg = `[hostinger] proxy-ok pid=${process.pid} → primary=${lock.pid} via=${viaUsed} url=${pathOnly} host=${req.headers.host ?? "-"} ms=${Date.now() - proxyT0}`;
      if (loggedProxyOk <= 3 || VERBOSE) console.log(msg);
      resolve(true);
    };

    const doneFail = (reason) => {
      if (settled) return;
      settled = true;
      if (reason) {
        logProxyError(
          reason,
          `headersWritten=${headersWritten} ms=${Date.now() - proxyT0} via=${viaUsed}`,
        );
      }
      resolve(false);
    };

    const pipeUpstream = (opts) => {
      const upstream = http.request(opts, (upRes) => {
        headersWritten = true;
        res.statusCode = upRes.statusCode ?? 502;
        for (const [key, value] of Object.entries(upRes.headers)) {
          if (value == null) continue;
          if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) continue;
          if (key.toLowerCase() === "x-guntan-app") continue;
          res.setHeader(key, value);
        }
        res.setHeader("x-guntan-app", "proxied-standby");
        upRes.pipe(res);
        upRes.on("error", (err) => {
          doneFail(
            `upstream-res:${err instanceof Error ? err.message : String(err)}`,
          );
        });
        res.on("finish", () => doneOk());
      });
      upstream.on("timeout", () => {
        upstream.destroy();
        onUpstreamFail("timeout", "timeout");
      });
      upstream.on("error", (err) => {
        const code = err?.code ?? "";
        const syscall = err?.syscall ?? "-";
        onUpstreamFail(
          `connect code=${code || (err instanceof Error ? err.message : String(err))} syscall=${syscall}`,
          code,
        );
      });
      res.on("close", () => {
        if (!res.writableFinished) {
          try {
            upstream.destroy();
          } catch {
            /* */
          }
        }
      });
      if (isIdempotent) upstream.end();
      else req.pipe(upstream);
    };

    const startUnix = () => {
      viaUsed = "unix";
      loggedProxyAttempts += 1;
      vlog(
        `[hostinger] proxy-deneme #${loggedProxyAttempts} pid=${process.pid} → primary=${lock.pid} via=unix method=${method} url=${pathOnly} host=${req.headers.host ?? "-"}`,
      );
      const sockPath = ep.path || ep.sockPath || primarySockPath;
      pipeUpstream({
        socketPath: sockPath,
        path: req.url ?? "/",
        method: req.method,
        headers,
        timeout: 20_000,
      });
    };

    const startTcp = (afterCode) => {
      // Endpoint'i tazele — unix fail sonrası tcpPort json'da olabilir.
      const fresh = readPrimaryEndpoint();
      if (fresh && (!fresh.pid || Number(fresh.pid) === lock.pid)) {
        ep = fresh;
      }
      const tcpPort = Number(ep.tcpPort || ep.port);
      if (!Number.isInteger(tcpPort) || tcpPort <= 0) {
        doneFail(afterCode ? `no-tcp-after-${afterCode}` : "no-tcp");
        return;
      }
      tcpTried = true;
      viaUsed = "tcp";
      loggedProxyAttempts += 1;
      vlog(
        `[hostinger] proxy-tcp-deneme #${loggedProxyAttempts} via=tcp pid=${process.pid} → primary=${lock.pid} after=${afterCode || "-"} url=${pathOnly} host=${req.headers.host ?? "-"}`,
      );
      pipeUpstream({
        host: String(ep.host || "127.0.0.1"),
        port: tcpPort,
        path: req.url ?? "/",
        method: req.method,
        headers,
        timeout: 20_000,
      });
    };

    /**
     * @param {string} reason
     * @param {string} [errCode]
     */
    function onUpstreamFail(reason, errCode) {
      if (settled || headersWritten || res.headersSent) {
        doneFail(reason);
        return;
      }
      const code =
        errCode ||
        (typeof reason === "string" && reason.includes("ENOENT")
          ? "ENOENT"
          : typeof reason === "string" && reason.includes("ECONNREFUSED")
            ? "ECONNREFUSED"
            : typeof reason === "string" && reason.includes("ECONNRESET")
              ? "ECONNRESET"
              : null);
      const primaryStillAlive = pidAlive(lock.pid);

      // SORUN 2: ENOENT + birincil hayatta → 150ms bekle, sock var mı bak, unix bir kez daha.
      if (
        viaUsed === "unix" &&
        code === "ENOENT" &&
        primaryStillAlive &&
        isIdempotent &&
        !enoentRetried
      ) {
        enoentRetried = true;
        console.warn(
          `[hostinger] proxy-enoent-retry ms=150 pid=${process.pid} primary=${lock.pid} url=${pathOnly}`,
        );
        const t = setTimeout(() => {
          if (settled || res.headersSent || res.writableEnded) return;
          if (!pidAlive(lock.pid)) {
            doneFail("enoent-retry-primary-dead");
            return;
          }
          const sockPath = ep.path || ep.sockPath || primarySockPath;
          if (!fs.existsSync(sockPath)) {
            // Sock hâlâ yok → TCP dene (SORUN 3)
            if (!tcpTried) {
              startTcp("ENOENT");
              return;
            }
            doneFail(reason);
            return;
          }
          startUnix();
        }, 150);
        t.unref?.();
        return;
      }

      // SORUN 3: unix ENOENT/ECONNREFUSED → TCP
      if (
        viaUsed === "unix" &&
        !tcpTried &&
        isIdempotent &&
        (code === "ENOENT" ||
          code === "ECONNREFUSED" ||
          code === "ECONNRESET" ||
          code === "EPIPE" ||
          code === "ENOTCONN")
      ) {
        startTcp(code || reason);
        return;
      }

      doneFail(reason);
    }

    // İlk deneme: unix tercihli; endpoint zaten tcp ise doğrudan tcp.
    if (ep.kind === "tcp") {
      // TCP probe (kısa)
      probePrimaryConnect(ep, 500).then((probeResult) => {
        const okProbe = probeResult === true || probeResult?.ok === true;
        if (!okProbe) {
          logProxyError(
            "connect-probe-fail",
            `reason=${probeResult?.reason ?? "fail"} ${ep.host}:${ep.port}`,
          );
          resolve(false);
          return;
        }
        startTcp("endpoint-tcp");
      });
      return;
    }

    startUnix();
  });
}

function sendProxyFailure(req, res, pathOnly) {
  logPlaceholder("proxy-fail", req, pathOnly);
  if (isStaticAssetPath(pathOnly) || !wantsHtml(req)) {
    res.statusCode = 503;
    res.setHeader("retry-after", "5");
    res.setHeader("cache-control", "no-store");
    res.setHeader("x-guntan-app", "proxied-standby");
    res.end();
    return;
  }
  sendHtml(
    res,
    503,
    `<!doctype html><html lang="tr"><meta charset="utf-8"/><title>Site açılıyor</title>
<meta http-equiv="refresh" content="5"/>
<body style="font-family:system-ui;padding:2rem;max-width:40rem">
<h1>Site açılıyor</h1>
<p>Sunucu hazırlanıyor. Sayfa kendiliğinden yenilenecek.</p>
</body></html>`,
    {
      "x-guntan-app": "proxied-standby",
      "Retry-After": "5",
      "Cache-Control": "no-store",
      "CDN-Cache-Control": "no-store",
    },
  );
}

function sendLazy503(req, res, pathOnly) {
  logPlaceholder("lazy-timeout", req, pathOnly);
  if (isStaticAssetPath(pathOnly) || !wantsHtml(req)) {
    res.statusCode = 503;
    res.setHeader("retry-after", "2");
    res.setHeader("cache-control", "no-store");
    res.setHeader("x-guntan-app", "standby-self");
    res.end();
    return;
  }
  sendHtml(
    res,
    503,
    `<!doctype html><html lang="tr"><meta charset="utf-8"/><title>Site açılıyor</title>
<meta http-equiv="refresh" content="2"/>
<body style="font-family:system-ui;padding:2rem;max-width:40rem">
<h1>Site açılıyor</h1>
<p>Sunucu hazırlanıyor. Sayfa kendiliğinden yenilenecek.</p>
</body></html>`,
    {
      "x-guntan-app": "standby-self",
      "Retry-After": "2",
      "Cache-Control": "no-store",
      "CDN-Cache-Control": "no-store",
    },
  );
}

let sfHandler = null;
let adminHandler = null;
let bootFailed = false;
/** @type {Promise<boolean> | null} */
let adminPrepare = null;
/** @type {Promise<boolean> | null} */
let standbySelfBoot = null;
/** Tek Next yükleme — primary bootNext ile paylaşılır */
/** @type {Promise<boolean> | null} */
let bootNextPromise = null;
let nextFactory = null;
/** @type {{ kind: "sf" | "admin", resolve: (ok: boolean) => void, timer: ReturnType<typeof setTimeout> }[]} */
let waiters = [];

function isAppReady(kind) {
  return kind === "admin" ? Boolean(adminHandler) : Boolean(sfHandler);
}

function notifyReady(kind) {
  const leftover = [];
  for (const waiter of waiters) {
    if (waiter.kind === kind) {
      clearTimeout(waiter.timer);
      waiter.resolve(true);
    } else {
      leftover.push(waiter);
    }
  }
  waiters = leftover;
}

function notifyBootFailed() {
  bootFailed = true;
  for (const waiter of waiters) {
    clearTimeout(waiter.timer);
    waiter.resolve(false);
  }
  waiters = [];
}

// LiteSpeed'in kendi ters-vekil (reverse proxy) zaman aşımı muhtemelen
// 90 saniyeden çok daha kısa (tipik olarak 30-60 sn). İstekleri 90 sn
// bekletmek, LiteSpeed zaten 504 döndürüp gittikten SONRA bile bağlantıyı
// açık tutup kaynak tüketmek demekti — hem gereksiz, hem de yeniden
// başlatma anlarında isteklerin yığılıp ("thundering herd") bir sonraki
// bellek sıçramasını tetiklemesine katkıda bulunuyordu. Kısa tutup, normal
// devir teslim penceresinden (birkaç saniye) biraz fazla pay bırakarak
// LiteSpeed'in 504'ünden ÖNCE kendi temiz 503 sayfamızı (Retry-After ile)
// döndürüyoruz.
const readyWaitMs = Number(process.env.HOSTINGER_READY_WAIT_MS ?? "15000");

function waitUntilReady(kind, req) {
  if (isAppReady(kind)) return Promise.resolve(true);
  if (bootFailed) return Promise.resolve(false);
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      waiters = waiters.filter((w) => w !== entry);
      resolve(false);
    }, readyWaitMs);
    const entry = { kind, resolve, timer };
    waiters.push(entry);
    req.on("close", () => {
      if (!waiters.includes(entry)) return;
      waiters = waiters.filter((w) => w !== entry);
      clearTimeout(timer);
      resolve(false);
    });
  });
}

function sendHealth(res) {
  res.statusCode = 200;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.setHeader("x-guntan-app", "health");
  res.end(
    JSON.stringify({
      ok: true,
      storefront: Boolean(sfHandler),
      admin: Boolean(adminHandler),
    }),
  );
}

const adminBuildReady = fs.existsSync(join(adminDir, ".next"));

async function routeRequest(req, res) {
  const parsedUrl = parse(req.url ?? "/", true);
  const pathOnly = parsedUrl.pathname ?? "/";

  if (pathOnly === "/api/health") {
    sendHealth(res);
    return;
  }

  // Host rewrite yok — tenant Host ile çözülür; izinli değilse 301.
  if (maybeHostRedirect(req, res, pathOnly)) return;

  // Proxy / lazy self-boot (Next henüz yokken).
  if (useStandbyProxy && !sfHandler) {
    const lock = readLockState();
    const primaryAlive =
      lock &&
      lock.pid !== process.pid &&
      pidAlive(lock.pid);
    const primaryAliveReady = Boolean(primaryAlive && lock.ready);
    // ready olmasa da erken sock için bir kez dene
    const shouldProxy = primaryAlive && (lock.ready || lazyStandby);

    if (shouldProxy) {
      const ok = await proxyToPrimary(req, res);
      if (ok || res.headersSent || res.writableEnded) return;
      if (!lazyStandby) {
        sendProxyFailure(req, res, pathOnly);
        return;
      }
    }

    if (lazyStandby) {
      // Kilit sahibi veya boot sürüyorsa self-boot YOK — mevcut promise'i bekle.
      if (readLockPid() === process.pid || bootNextPromise) {
        await ensureBootNext("route-lock-owner");
      } else if (primaryAliveReady) {
        // Hazır birincil yaşıyor — ikinci Next yükleme (sock/kilit çalma) YASAK.
        console.warn(
          `[hostinger] proxy-fail self-boot yok primary=${lock.pid} alive — 503 pid=${process.pid}`,
        );
        sendLazy503(req, res, pathOnly);
        return;
      } else {
        await ensureStandbySelfBoot();
      }
      if (res.writableEnded || res.headersSent) return;
      if (!sfHandler) {
        const ready = await waitUntilReady("sf", req);
        if (res.writableEnded) return;
        if (!ready || !sfHandler) {
          sendLazy503(req, res, pathOnly);
          return;
        }
      }
    }
  }

  // Klasik yedek yer tutucu (lazy kapalıyken).
  if (isStandbyMode && !lazyStandby && !sfHandler) {
    logPlaceholder("standby-placeholder", req, pathOnly);
    sendUnavailable(
      res,
      "Site açılıyor",
      "Sunucu hazırlanıyor. Sayfa kendiliğinden yenilenecek.",
      200,
    );
    return;
  }

  if (standbyFastResponse && !lazyStandby && !isPrimaryProcess && !sfHandler) {
    logPlaceholder("fast-response", req, pathOnly);
    sendUnavailable(
      res,
      "Site açılıyor",
      "Sunucu hazırlanıyor. Sayfa kendiliğinden yenilenecek.",
      200,
    );
    return;
  }

  if (isAdminHost(req.headers.host) && !isAdminPath(pathOnly)) {
    const dest = `${publicStoreUrl}${adminBasePath}${pathOnly === "/" ? "" : pathOnly}${parsedUrl.search ?? ""}`;
    res.statusCode = 302;
    res.setHeader("location", dest);
    res.setHeader("x-guntan-app", "admin-redirect");
    res.end();
    return;
  }

  if (isAdminPath(pathOnly)) {
    res.setHeader("x-guntan-app", "admin");
    if (!adminBuildReady) {
      sendUnavailable(
        res,
        "Admin hazır değil",
        "Sunucuda <code>apps/admin/.next</code> yok. Hostinger build: kökte <code>pnpm build</code>.",
      );
      return;
    }
    if (!adminHandler) {
      const ready = await ensureAdmin();
      if (res.writableEnded) return;
      if (!ready || !adminHandler) {
        sendUnavailable(res, "Admin kullanılamıyor", "Panel şu anda yanıt vermiyor. Biraz sonra tekrar deneyin.");
        return;
      }
    }
    return adminHandler(req, res, parsedUrl);
  }

  if (!sfHandler) {
    const ready = await waitUntilReady("sf", req);
    if (res.writableEnded) return;
    if (!ready || !sfHandler) {
      logPlaceholder("boot-wait", req, pathOnly);
      sendUnavailable(
        res,
        "Site açılıyor",
        "Sunucu hazırlanıyor. Sayfa kendiliğinden yenilenecek.",
        200,
      );
      return;
    }
  }

  const lockNow = readLockState();
  res.setHeader(
    "x-guntan-app",
    lockNow?.pid === process.pid ? "storefront" : "standby-self",
  );
  enableSharedHtmlCache(req, res);
  return sfHandler(req, res, parsedUrl);
}

const server = createServer((req, res) => {
  requestsTotal += 1;
  requestsInFlight += 1;
  const reqStartedAt = Date.now();
  lastRequestAt = reqStartedAt;
  const shouldLogEarly = loggedEarlyRequests < 3;
  const earlyN = shouldLogEarly ? ++loggedEarlyRequests : 0;
  let earlyLogged = false;
  let counted = true;
  const done = () => {
    if (!counted) return;
    counted = false;
    requestsInFlight = Math.max(0, requestsInFlight - 1);
  };
  const logEarlyRequest = () => {
    if (!VERBOSE || !shouldLogEarly || earlyLogged) return;
    earlyLogged = true;
    const pathOnly = String(req.url ?? "/").split("?")[0];
    const role = isStandbyMode ? "standby" : isPrimaryProcess ? "primary" : "yedek";
    const ua = String(req.headers["user-agent"] ?? "-").slice(0, 160);
    console.log(
      `[hostinger] teşhis-istek #${earlyN} pid=${process.pid} role=${role} ageMs=${reqStartedAt - startedAt} method=${req.method ?? "-"} url=${pathOnly} host=${req.headers.host ?? "-"} ua=${JSON.stringify(ua)} remote=${req.socket?.remoteAddress ?? "-"} durationMs=${Date.now() - reqStartedAt}`,
    );
  };
  res.on("finish", () => {
    done();
    logEarlyRequest();
  });
  res.on("close", () => {
    done();
    logEarlyRequest();
  });
  routeRequest(req, res).catch((err) => {
    console.error("[hostinger] istek hatası:", err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end();
    }
  });
});
httpServer = server;
server.keepAliveTimeout = 65_000;
server.on("clientError", (err) => {
  if (primarySockEventLogs < 10) {
    console.warn(
      `[hostinger] primary-sock clientError code=${err?.code ?? "-"} message=${err instanceof Error ? err.message : err}`,
    );
  }
});
server.headersTimeout = 66_000;

let parked = false;

function startNextAfterListen() {
  if (readLockPid() !== process.pid) {
    console.warn(
      `[hostinger] boot iptal — kilit bizde değil pid=${process.pid} sahip=${readLockPid()} (Next yüklenmiyor)`,
    );
    shutdown("FAZLALIK_SÜREÇ");
    return;
  }
  ensureBootNext("primary-listen").catch(() => {});
}

/**
 * Süreçte tek Next prepare. Tekrar çağrıda mevcut promise döner.
 * @param {string} reason
 * @returns {Promise<boolean>}
 */
function ensureBootNext(reason) {
  if (sfHandler) return Promise.resolve(true);
  if (bootFailed) return Promise.resolve(false);
  if (bootNextPromise) {
    console.log(
      `[hostinger] next-yükleme tekrarı engellendi reason=${reason} pid=${process.pid}`,
    );
    return bootNextPromise;
  }
  nextBooted = true;
  console.log(
    `[hostinger] next-yükleme başlıyor reason=${reason} pid=${process.pid} rss=${rssMb()}MB`,
  );
  bootNextPromise = bootNext()
    .then(() => Boolean(sfHandler))
    .catch((err) => {
      console.error("[hostinger] Next başlatılamadı:", err);
      bootNextPromise = null;
      nextBooted = false;
      notifyBootFailed();
      return false;
    });
  return bootNextPromise;
}

function probeLocalHealth() {
  return new Promise((resolve) => {
    const req = http.get(
      { hostname: "127.0.0.1", port, path: "/api/health", timeout: 800 },
      (res) => {
        res.resume();
        resolve(res.statusCode === 200 || res.statusCode === 503);
      },
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

let primaryWatchStarted = false;
let diagHeartbeatStarted = false;

function startDiagHeartbeat() {
  if (diagHeartbeatStarted) return;
  diagHeartbeatStarted = true;
  setInterval(() => {
    if (shuttingDown) return;
    logLifecycleSnapshot("teşhis-30s");
  }, 30_000).unref();
}

function becomePrimaryFromStandby() {
  isStandbyMode = false;
  isPrimaryProcess = true;
  removeStandbyPid(process.pid);
  console.warn(
    `[hostinger] yedek birincili devralıyor pid=${process.pid} (önceki birincil yok/kilit boş)`,
  );
  writeLock(Boolean(sfHandler));
  watchPrimaryLock();
  startSelfPing();
  if (sfHandler) {
    writeLock(true);
    startPrimarySock();
    return;
  }
  startNextAfterListen();
}

/**
 * Lazy yedek: proxy fail / birincil yok → kendi Next (tek promise).
 * Ready birincil varken kilidi EZME. Kilit sahibi / boot inflight → self-boot YOK.
 */
function ensureStandbySelfBoot() {
  if (sfHandler) return Promise.resolve(true);
  if (bootFailed) return Promise.resolve(false);

  if (readLockPid() === process.pid || bootNextPromise) {
    console.log(
      `[hostinger] next-yükleme tekrarı engellendi reason=self-boot-skip-owner pid=${process.pid}`,
    );
    return ensureBootNext("self-boot-redirect-owner");
  }

  if (standbySelfBoot) {
    console.log(
      `[hostinger] next-yükleme tekrarı engellendi reason=self-boot-inflight pid=${process.pid}`,
    );
    return standbySelfBoot;
  }

  standbySelfBoot = (async () => {
    logAliveSnapshot("yedek-self-boot-başlangıç");
    console.log(
      `[hostinger] yedek-self-boot başlıyor pid=${process.pid} rss=${rssMb()}MB`,
    );
    const lock = readLockState();
    const primaryAliveReady =
      Boolean(lock?.ready) &&
      lock.pid !== process.pid &&
      pidAlive(lock.pid);

    if (!primaryAliveReady) {
      removeStandbyPid(process.pid);
      writeLock(false);
      isPrimaryProcess = true;
      isStandbyMode = false;
      watchPrimaryLock();
      startSelfPing();
      // Artık kilit sahibi — ortak bootNext kullan
      return ensureBootNext("self-boot-became-primary");
    }

    console.log(
      `[hostinger] yedek-self-boot kilit ezilmiyor primary=${lock.pid} — kendi sfHandler`,
    );

    // Secondary: ayrı Next ama bootNextPromise ile çakışmasın
    if (bootNextPromise) {
      console.log(
        `[hostinger] next-yükleme tekrarı engellendi reason=secondary-sees-boot pid=${process.pid}`,
      );
      return bootNextPromise;
    }

    try {
      nextBooted = true;
      redirectNextWritable(storefrontDir, "storefront");
      const next = loadNext();
      const storefront = next({
        dev: false,
        dir: storefrontDir,
        hostname,
        port,
      });
      await storefront.prepare();
      if (shuttingDown) return false;

      const after = readLockState();
      const stillSecondary =
        after &&
        after.pid !== process.pid &&
        pidAlive(after.pid) &&
        after.ready;

      if (!stillSecondary) {
        removeStandbyPid(process.pid);
        if (readLockPid() !== process.pid) writeLock(false);
        writeLock(true);
        isPrimaryProcess = true;
        isStandbyMode = false;
        watchPrimaryLock();
        startSelfPing();
        startPrimarySock();
      }

      sfHandler = storefront.getRequestHandler();
      notifyReady("sf");
      console.log(
        `[hostinger] yedek-self-boot hazır pid=${process.pid} role=${stillSecondary ? "standby-self" : "primary"} rss=${rssMb()}MB`,
      );
      return true;
    } catch (err) {
      console.error("[hostinger] yedek-self-boot başarısız:", err);
      standbySelfBoot = null;
      nextBooted = false;
      notifyBootFailed();
      return false;
    }
  })();

  return standbySelfBoot;
}

function exitLazyStandby(reason) {
  if (shuttingDown || lazyStandbyExiting) return;
  if (readLockPid() === process.pid) return;
  lazyStandbyExiting = true;
  removeStandbyPid(process.pid);
  isStandbyMode = false;
  logLifecycleSnapshot(`teşhis-${reason}`);
  exitReason = reason;
  console.warn(
    `[hostinger] lazy-yedek çıkış reason=${reason} pid=${process.pid} idleMs=${standbyIdleMs} max=${standbyMax} sinceLastReqMs=${lastRequestAt == null ? "never" : Date.now() - lastRequestAt} inFlight=${requestsInFlight} rss=${rssMb()}MB`,
  );
  clearAlive();
  // Listen sonrası kısa gecikme — Hostinger 3 sn kuralı / in-flight proxy
  setTimeout(() => {
    if (shuttingDown || readLockPid() === process.pid) return;
    if (requestsInFlight > 0 || sfHandler) {
      shutdown(reason);
      return;
    }
    process.exit(0);
  }, 400).unref();
}

function runAsStandby() {
  startDiagHeartbeat();

  if (lazyStandby) {
    if (!claimStandbySlot()) {
      exitLazyStandby("yedek-fazla");
      return;
    }
    isStandbyMode = true;
    vlog(
      `[hostinger] lazy-yedek dinliyor pid=${process.pid} — max=${standbyMax} idleMs=${standbyIdleMs} istekte proxy/self-boot`,
    );
    setInterval(() => {
      if (shuttingDown) return;
      const lock = readLockState();
      if (!lock || !pidAlive(lock.pid)) {
        if (!sfHandler || readLockPid() !== process.pid) {
          becomePrimaryFromStandby();
        }
        return;
      }
      // Idle / tavan: ready birincil varken gereksiz yedekleri bırak.
      if (readLockPid() === process.pid) return;
      if (standbySelfBoot && !sfHandler) return; // self-boot sürüyor
      if (requestsInFlight > 0) return;
      if (!lock.ready) return;

      if (standbyIdleMs > 0) {
        const last = lastRequestAt ?? startedAt;
        if (Date.now() - last >= standbyIdleMs) {
          exitLazyStandby("yedek-idle");
          return;
        }
      }

      // Slot tavanı aşıldıysa (yarış / eski kayıt) en yeni fazlalık çıksın:
      // biz listede sonlardaysak ve max üstündeysek çık.
      const slots = pruneStandbyPids();
      if (slots.length > standbyMax && slots.includes(process.pid)) {
        const overflow = slots.slice(standbyMax);
        if (overflow.includes(process.pid)) {
          exitLazyStandby("yedek-fazla");
        }
      }
    }, 250).unref();
    return;
  }

  if (!Number.isFinite(standbyKeepMs) || standbyKeepMs <= 0) {
    logLifecycleSnapshot("teşhis-yedek-çıkış");
    exitReason = "yedek-hemen";
    setTimeout(() => process.exit(0), 400).unref();
    return;
  }
  if (!claimStandbySlot()) {
    logLifecycleSnapshot("teşhis-yedek-fazla");
    exitReason = "yedek-fazla";
    clearAlive();
    process.exit(0);
    return;
  }
  isStandbyMode = true;
  console.log(
    `[hostinger] yedek bekliyor pid=${process.pid} keepMs=${standbyKeepMs} max=${standbyMax}`,
  );
  const deadline = Date.now() + standbyKeepMs;
  const poll = setInterval(() => {
    if (shuttingDown) {
      clearInterval(poll);
      return;
    }
    const lock = readLockState();
    if (!lock || !pidAlive(lock.pid)) {
      clearInterval(poll);
      becomePrimaryFromStandby();
      return;
    }
    if (Date.now() >= deadline) {
      clearInterval(poll);
      removeStandbyPid(process.pid);
      isStandbyMode = false;
      logLifecycleSnapshot("teşhis-yedek-çıkış");
      exitReason = "yedek-süre-doldu";
      process.exit(0);
    }
  }, 500);
}

/** Kilit bizde mi diye bak; başkası yaşayan sahipse fazlalığız. */
function watchPrimaryLock() {
  if (primaryWatchStarted) return;
  primaryWatchStarted = true;
  setInterval(() => {
    if (shuttingDown) return;
    const current = readLockState();
    if (!current) {
      writeLock(Boolean(sfHandler));
      console.warn(`[hostinger] kilit dosyası yoktu, yenilendi pid=${process.pid}`);
      return;
    }
    if (current.pid === process.pid) return;
    if (!pidAlive(current.pid)) {
      writeLock(Boolean(sfHandler));
      console.log(
        `[hostinger] ölü sahip pid=${current.pid} — kilit yenilendi pid=${process.pid}`,
      );
      return;
    }
    // Lazy secondary: ready birincil varken kendi sfHandler ile servis — FAZLALIK ile çıkma.
    if (lazyStandby && sfHandler && current.ready) {
      return;
    }
    console.warn(
      `[hostinger] kilit başkasında pid=${current.pid} (biz=${process.pid}) — FAZLALIK, kapanıyor`,
    );
    closePrimarySock();
    shutdown("FAZLALIK_SÜREÇ");
  }, 5_000).unref();
}

function bindPublicPort() {
  if (shuttingDown || server.listening) return;
  // Hostinger 3 sn: her zaman dinle (kilit alınamasa bile).
  server.listen({ port, host: hostname, exclusive: true }, () => {
    bindAttempts = 0;
    parked = false;
    const ownLock = tryAdoptLockOnListen();
    console.log(
      `[hostinger] dinleniyor ${hostname}:${port} pid=${process.pid} rss=${rssMb()}MB ownLock=${ownLock} — ${ownLock ? "Next hazırlanıyor" : "yedek, Next yok"} (admin ${adminBasePath})`,
    );
    if (!ownLock) {
      runAsStandby();
      return;
    }
    startDiagHeartbeat();
    watchPrimaryLock();
    startSelfPing();
    // Next hazır olmadan sock aç — boşluğu kapat; istekler waitUntilReady bekler
    startPrimarySock();
    startNextAfterListen();
  });
}

server.on("error", (err) => {
  if (err?.code === "EADDRINUSE") {
    bindAttempts += 1;
    if (bindAttempts === 1) {
      setTimeout(bindPublicPort, 400);
      return;
    }
    probeLocalHealth().then((healthy) => {
      if (shuttingDown) return;
      if (healthy) {
        console.warn(
          `[hostinger] ${port} yanıt veriyor — yedek pid=${process.pid} çıkıyor (birincil ayakta)`,
        );
        process.exit(0);
      }
      if (bindAttempts > 10) {
        console.error(`[hostinger] ${port} alınamadı pid=${process.pid}`);
        process.exit(1);
      }
      console.warn(
        `[hostinger] ${port} dolu/yanıtsız deneme=${bindAttempts} pid=${process.pid} — tekrar`,
      );
      setTimeout(bindPublicPort, 300);
    });
    return;
  }
  console.error("[hostinger] sunucu hatası:", err);
  process.exit(1);
});

// Akış: kilit dene → HER ZAMAN listen (3 sn) → kilit bizdeyse Next.
warnBadEnv();
touchAlive();
isPrimaryProcess = claimPrimaryLock();
if (!isPrimaryProcess) {
  vwarn(
    `[hostinger] yedek pid=${process.pid} — listen edilecek, yaşayan birincil kilidi ezilmeyecek`,
  );
}
logStartupProbe();
startPpidWatch();
console.log(
  `[hostinger] start pid=${process.pid} port=${port} entry=hostinger-start node=${process.version} lazy=${lazyStandby} proxy=${useStandbyProxy} max=${standbyMax} idleMs=${standbyIdleMs} aliveCount=${countAliveProcesses()}`,
);
bindPublicPort();

function loadNext() {
  if (!nextFactory) {
    pinReactAndIoredis();
    const requireSf = createRequire(join(storefrontDir, "package.json"));
    nextFactory = requireSf("next");
  }
  return nextFactory;
}

async function ensureAdmin() {
  if (adminHandler) return true;
  if (!adminBuildReady) return false;
  if (adminPrepare) return adminPrepare;
  adminPrepare = (async () => {
    console.log(`[hostinger] admin yükleniyor (path ${adminBasePath}) rss=${rssMb()}MB`);
    redirectNextWritable(adminDir, "admin");
    const next = loadNext();
    const admin = next({
      dev: false,
      dir: adminDir,
      hostname,
      port,
    });
    await admin.prepare();
    adminHandler = admin.getRequestHandler();
    notifyReady("admin");
    console.log(`[hostinger] admin hazır (path ${adminBasePath}) rss=${rssMb()}MB`);
    return true;
  })().catch((err) => {
    adminPrepare = null;
    adminHandler = null;
    console.error("[hostinger] admin.prepare başarısız:", err);
    return false;
  });
  return adminPrepare;
}

async function bootNext() {
  redirectNextWritable(storefrontDir, "storefront");
  const next = loadNext();
  const storefront = next({
    dev: false,
    dir: storefrontDir,
    hostname,
    port,
  });

  await storefront.prepare();
  if (readLockPid() !== process.pid) {
    console.warn(
      `[hostinger] prepare bitti ama kilit bizde değil pid=${process.pid} sahip=${readLockPid()} — çıkılıyor`,
    );
    sfHandler = null;
    shutdown("FAZLALIK_SÜREÇ");
    return;
  }
  sfHandler = storefront.getRequestHandler();
  writeLock(true);
  notifyReady("sf");
  startPrimarySock();
  console.log(
    `[hostinger] vitrin hazır pid=${process.pid} port=${port} rss=${rssMb()}MB`,
  );

  if (!adminBuildReady) {
    console.warn(
      `[hostinger] ${join(adminDir, ".next")} yok — ${adminBasePath} 503 döner. Build: pnpm build (admin dahil).`,
    );
  } else {
    vlog(`[hostinger] ${hostname}:${port} — vitrin hazır, admin ilk ${adminBasePath} isteğinde yüklenecek`);
  }

  setInterval(() => {
    const lock = readLockState();
    console.log(
      `[hostinger] canlı pid=${process.pid} port=${port} rss=${rssMb()}MB sf=${Boolean(sfHandler)} admin=${Boolean(adminHandler)} kilitPid=${lock?.pid ?? "-"} kilitReady=${lock?.ready ?? "-"}`,
    );
  }, 120_000).unref();

  setInterval(checkMemoryCeiling, 8_000).unref();
}

// 215MB tavanı denendi ama loglar gösterdi ki uygulama "vitrin hazır" olduktan
// hemen sonra doğal olarak ~216-240MB'a sıçrıyor (leak değil — Next.js'in ilk
// gerçek trafikte route'ları JIT derlemesi, DB/Redis havuzu ısınması) — yani
// tavan, uygulamanın normal ısınma seviyesinin TAM İÇİNDEYDİ. Sonuç: neredeyse
// HER döngüde restart, ve kullanıcının "önce hızlı, biraz sonra donuk" şikayeti
// tam da bu sürekli devir-teslim penceresine denk gelmekten kaynaklanıyordu.
//
// Hesabın gerçek RAM tahsisi (Hostinger Business/Unlimited: 3GB, Cloud: 4GB+)
// bu ~240MB'lık ayak izinin çok üzerinde — önceki "~225-256MB'da Hostinger
// öldürüyor" varsayımı aslında bizim KENDİ eski tavan kodumuzun etkisiydi,
// platformun gerçek bir sınırı değildi. Bu yüzden tavanı ciddi şekilde
// yükseltip uygulamanın doğal ısınma seviyesine ulaşmasına izin veriyoruz;
// kontrol aralığı 8sn'de kalıyor ki gerçek bir sızıntı olursa (sürekli
// tırmanan, plato yapmayan bir eğri) yine erken yakalanabilsin.
const memoryCeilingMb = Number(process.env.HOSTINGER_MEM_CEILING_MB ?? "400");

function checkMemoryCeiling() {
  if (shuttingDown) return;
  const rss = rssMb();
  if (rss < memoryCeilingMb) return;
  console.warn(
    `[hostinger] bellek tavanına yaklaşıldı rss=${rss}MB (sınır ${memoryCeilingMb}MB) pid=${process.pid} — kontrollü devir teslim`,
  );
  shutdown("BELLEK_TAVANI");
}

let publicHealthUrl = null;
try {
  publicHealthUrl = new URL(`${publicStoreUrl}/api/health`);
} catch {
  /* geçersiz STOREFRONT_URL — self-ping devre dışı kalır */
}

function selfPing() {
  if (shuttingDown || !server.listening || !publicHealthUrl) return;
  // Sadece kilit sahibi (veya henüz kimse ready değilken dinleyen süreç)
  // dış ping atsın — aksi halde her hayalet kopya yeni start tetikler.
  const lock = readLockState();
  if (lock && lock.pid !== process.pid && pidAlive(lock.pid)) return;
  const client = publicHealthUrl.protocol === "https:" ? https : http;
  const req = client.get(publicHealthUrl, { timeout: 8000 }, (res) => {
    res.resume();
  });
  req.on("timeout", () => req.destroy());
  req.on("error", () => {
    /* self-ping başarısızlığı önemsiz — DNS/ağ dalgalanması olabilir */
  });
}

function startSelfPing() {
  if (selfPingStarted) return;
  // 0 veya negatif = kapalı. Public URL ping'i yeni Node start fırtınası yaratıyordu.
  if (!Number.isFinite(selfPingMs) || selfPingMs <= 0) {
    vlog("[hostinger] self-ping kapalı (HOSTINGER_SELF_PING_MS<=0)");
    return;
  }
  selfPingStarted = true;
  selfPing();
  setInterval(selfPing, selfPingMs).unref();
}
