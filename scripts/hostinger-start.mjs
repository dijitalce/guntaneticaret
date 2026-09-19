import { createServer } from "node:http";
import { createRequire } from "node:module";
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import os from "node:os";
import { parse } from "node:url";
import { dirname, join } from "node:path";
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

const NodeModule = createRequire(import.meta.url)("module");

// Hostinger: listen() genelde 3 sn içinde isteniyor — ama yalnızca BİRİNCİL
// kilit alındıktan sonra dinleriz. Kilit doluysa Next yüklemeden ve
// listen etmeden çıkarız (yaşayan birincili ezmemek için).
// - /yonetim/* → admin paneli (subdomain gerekmez)
// - admin.* host → ana site /yonetim’e yönlendir
// - diğer her şey → vitrin

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const storefrontDir = join(root, "apps/storefront");
const adminDir = join(root, "apps/admin");

const port = Number(process.env.PORT || 3000);
const hostname = "0.0.0.0";
const adminBasePath = (process.env.ADMIN_BASE_PATH ?? "/yonetim").replace(/\/$/, "") || "/yonetim";
const publicStoreUrl = (
  process.env.STOREFRONT_URL ?? "https://guntanotoyedekparca.com"
).replace(/\/$/, "");

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
  const host = String(hostHeader ?? "")
    .split(":")[0]
    .toLowerCase();
  if (!host) return false;
  if (host === adminHost) return true;
  return host.startsWith("admin.");
}

function isAdminPath(urlPath) {
  const path = String(urlPath ?? "/").split("?")[0];
  return path === adminBasePath || path.startsWith(`${adminBasePath}/`);
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
// Public self-ping LiteSpeed üzerinden yeni Node start tetikleyebiliyor. Varsayılan KAPALI.
const selfPingMs = Number(process.env.HOSTINGER_SELF_PING_MS ?? "0");
let shuttingDown = false;
let nextBooted = false;
let selfPingStarted = false;
let lockReady = false;
/** @type {import("node:http").Server | null} */
let httpServer = null;
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
  try {
    if (readLockPid() === process.pid) {
      fs.unlinkSync(pidFile);
      console.log(`[hostinger] kilit bırakıldı pid=${process.pid}`);
    }
  } catch {
    /* */
  }
}

function pidAlive(pid) {
  if (!pid || pid === process.pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Yaşayan birincilin kilidini ASLA çalma.
 * Ölü PID / bozuk dosya → temizle ve al.
 * Alamazsan false — çağıran listen/Next yapmadan çıkmalı.
 */
function claimPrimaryLock() {
  for (let i = 0; i < 8; i++) {
    const existing = readLockState();
    if (existing && pidAlive(existing.pid)) {
      console.warn(
        `[hostinger] kilit dolu — yaşayan birincil pid=${existing.pid} ready=${existing.ready} ageMs=${existing.t ? Date.now() - existing.t : "?"} — bu süreç çıkıyor (pid=${process.pid} port=${port})`,
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
      return true;
    } catch (err) {
      if (err?.code !== "EEXIST") {
        console.warn("[hostinger] kilit hatası:", err instanceof Error ? err.message : err);
        // tmp yazılamıyorsa tek süreç varsay — devam et
        return true;
      }
      // yarış: kısa bekle, tekrar
    }
  }
  console.warn(`[hostinger] kilit alınamadı pid=${process.pid} — çıkılıyor`);
  return false;
}

function shutdown(signal) {
  // SIGTERM her zaman kontrollü kapanış — yok sayma (platform yöneticisiyle çatışmasın).
  if (shuttingDown) return;
  shuttingDown = true;
  console.error(
    `[hostinger] kapanış neden=${signal} pid=${process.pid} port=${port} rss=${rssMb()}MB sf=${Boolean(sfHandler)}`,
  );
  clearLock();
  try {
    httpServer?.close(() => {
      console.log(`[hostinger] soket kapandı pid=${process.pid} neden=${signal}`);
      process.exit(0);
    });
  } catch {
    process.exit(0);
  }
  // prepare bitmemişse bekleyen isteklere kısa tolerans; hazırsa 5sn drain
  if (!sfHandler && !bootFailed) {
    const deadline = Date.now() + 10_000;
    const poll = setInterval(() => {
      if (sfHandler || bootFailed || Date.now() >= deadline) {
        clearInterval(poll);
        setTimeout(() => process.exit(0), sfHandler ? 250 : 0);
      }
    }, 200).unref();
  } else {
    setTimeout(() => process.exit(0), 5000);
  }
}

process.on("uncaughtException", (err) => {
  console.error("[hostinger] yakalanmamış hata (süreç açık kalıyor):", err);
});
process.on("unhandledRejection", (err) => {
  console.error("[hostinger] işlenmemiş promise (süreç açık kalıyor):", err);
});
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

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

let sfHandler = null;
let adminHandler = null;
let bootFailed = false;
/** @type {Promise<boolean> | null} */
let adminPrepare = null;
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

  // Klasörlü subdomain Node’a gelmez; gelirse ana site paneline al.
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
      // 503 Hostinger/LiteSpeed sağlık kontrolünü "uygulama öldü" sanıp
      // yeni süreç başlatıyordu; o da birincili öldürüp döngüye giriyordu.
      sendUnavailable(
        res,
        "Site açılıyor",
        "Sunucu hazırlanıyor. Sayfa kendiliğinden yenilenecek.",
        200,
      );
      return;
    }
  }

  res.setHeader("x-guntan-app", "storefront");
  enableSharedHtmlCache(req, res);
  return sfHandler(req, res, parsedUrl);
}

const server = createServer((req, res) => {
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
server.headersTimeout = 66_000;

let parked = false;

function startNextAfterListen() {
  if (nextBooted) return;
  nextBooted = true;
  if (readLockPid() !== process.pid) {
    console.warn(
      `[hostinger] boot iptal — kilit bizde değil pid=${process.pid} sahip=${readLockPid()}`,
    );
    shutdown("FAZLALIK_SÜREÇ");
    return;
  }
  bootNext().catch((err) => {
    console.error("[hostinger] Next başlatılamadı:", err);
    notifyBootFailed();
  });
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

/** Kilit bizde mi diye bak; başkası yaşayan sahipse fazlalığız. */
function watchPrimaryLock() {
  if (primaryWatchStarted) return;
  primaryWatchStarted = true;
  setInterval(() => {
    if (shuttingDown) return;
    const current = readLockState();
    if (!current) {
      // dosya silinmiş — birincil olarak yeniden yaz
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
    console.warn(
      `[hostinger] kilit başkasında pid=${current.pid} (biz=${process.pid}) — FAZLALIK, kapanıyor`,
    );
    shutdown("FAZLALIK_SÜREÇ");
  }, 5_000).unref();
}

function bindPublicPort() {
  if (shuttingDown || server.listening) return;
  if (readLockPid() !== process.pid) {
    console.warn(
      `[hostinger] listen iptal — kilit pid=${readLockPid()} (biz=${process.pid})`,
    );
    process.exit(0);
    return;
  }
  server.listen({ port, host: hostname, exclusive: true }, () => {
    bindAttempts = 0;
    parked = false;
    writeLock(Boolean(sfHandler));
    console.log(
      `[hostinger] dinleniyor ${hostname}:${port} pid=${process.pid} rss=${rssMb()}MB — Next hazırlanıyor (admin ${adminBasePath})`,
    );
    watchPrimaryLock();
    startSelfPing();
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
        // Yaşayan birincili öldürme — port zaten hizmet veriyor.
        console.warn(
          `[hostinger] ${port} yanıt veriyor — birincil kilidimiz var ama port dolu; kilidi bırakıp çıkıyoruz pid=${process.pid}`,
        );
        clearLock();
        process.exit(0);
      }
      if (bindAttempts > 10) {
        console.error(`[hostinger] ${port} alınamadı pid=${process.pid}`);
        clearLock();
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
  clearLock();
  process.exit(1);
});

// Akış: kilit al → alamazsan HİÇ dinleme/Next yok → alırsan listen + prepare.
warnBadEnv();
console.log(
  `[hostinger] start pid=${process.pid} port=${port} entry=hostinger-start node=${process.version}`,
);
if (!claimPrimaryLock()) {
  console.warn(
    `[hostinger] yedek çıkış pid=${process.pid} — yaşayan birincil var, listen/Next yok`,
  );
  process.exit(0);
}
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
