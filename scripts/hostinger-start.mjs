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

const NodeModule = createRequire(import.meta.url)("module");

// Hostinger: listen() 3 sn içinde çağrılmalı. Next'i listen'den SONRA yükle.
// - /yonetim/* → admin paneli (subdomain gerekmez)
// - admin.* host → ana site /yonetim’e yönlendir
// - diğer her şey → vitrin

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const storefrontDir = join(root, "apps/storefront");
const adminDir = join(root, "apps/admin");

const port = Number(process.env.PORT ?? "3000");
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

/** Hostinger output dir (.next) izlerse cache yazmak SIGTERM + restart tetikler. */
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
      if (st.isSymbolicLink()) {
        if (fs.readlinkSync(appPath) === tmpPath) continue;
        fs.unlinkSync(appPath);
      } else {
        fs.rmSync(appPath, { recursive: true, force: true });
      }
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
let shuttingDown = false;
let nextBooted = false;
/** @type {import("node:http").Server | null} */
let httpServer = null;

function readLockPid() {
  try {
    const n = Number(fs.readFileSync(pidFile, "utf8").trim());
    return Number.isInteger(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function writeLock() {
  try {
    fs.writeFileSync(pidFile, String(process.pid));
  } catch {
    /* tmp yazılamazsa devam */
  }
}

function clearLock() {
  try {
    if (readLockPid() === process.pid) fs.unlinkSync(pidFile);
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

function claimPrimaryLock() {
  for (let i = 0; i < 6; i++) {
    try {
      const fd = fs.openSync(pidFile, "wx");
      fs.writeFileSync(fd, String(process.pid));
      fs.closeSync(fd);
      console.log(`[hostinger] birincil kilit pid=${process.pid}`);
      return true;
    } catch (err) {
      if (err?.code !== "EEXIST") {
        console.warn("[hostinger] kilit atlandı:", err instanceof Error ? err.message : err);
        return true;
      }
      const prev = readLockPid();
      if (pidAlive(prev)) {
        console.warn(`[hostinger] kopya pid=${process.pid} — birincil ${prev}; port 3000 alınmayacak`);
        return false;
      }
      try {
        fs.unlinkSync(pidFile);
      } catch {
        /* */
      }
    }
  }
  return true;
}

function shutdown(signal) {
  // Hostinger Node.js hosting "on-demand" çalışır: trafik yoksa süreci durdurur,
  // sonraki istek yenisini başlatır. SIGTERM'i görmezden gelmek bu devri bozup
  // yeni süreci kilit yüzünden park ettiriyor ve istekler askıda kalıyordu.
  // Bu yüzden SIGTERM'i HER ZAMAN nazikçe kabul ediyoruz — kilidi hemen bırakıp
  // bekleyen kopyanın 3 sn içinde devralmasına izin veriyoruz.
  if (shuttingDown) return;
  shuttingDown = true;
  console.error(`[hostinger] ${signal} pid=${process.pid} rss=${rssMb()}MB — nazikçe kapanıyor`);
  clearLock();
  try {
    httpServer?.close(() => {
      console.error(`[hostinger] ${signal} sonrası soket kapandı pid=${process.pid}`);
      process.exit(0);
    });
  } catch {
    process.exit(0);
  }
  setTimeout(() => process.exit(0), 2000);
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

  const ioredisPkgCandidates = [];
  try {
    ioredisPkgCandidates.push(fromSf.resolve("ioredis/package.json"));
  } catch {
    /* missing */
  }
  const first = ioredisPkgCandidates[0];
  let commandsOk = false;
  if (first) {
    try {
      createRequire(first).resolve("@ioredis/commands");
      commandsOk = true;
    } catch {
      commandsOk = false;
    }
  }
  if (!commandsOk) {
    const pnpmDir = join(root, "node_modules/.pnpm");
    if (fs.existsSync(pnpmDir)) {
      for (const name of fs.readdirSync(pnpmDir)) {
        if (!name.startsWith("ioredis@")) continue;
        const pkg = join(pnpmDir, name, "node_modules/ioredis/package.json");
        if (fs.existsSync(pkg)) ioredisPkgCandidates.push(pkg);
      }
    }
  }

  for (const pkgJson of ioredisPkgCandidates) {
    const fromIoredis = createRequire(pkgJson);
    try {
      fromIoredis.resolve("@ioredis/commands");
      pinned.ioredis = fromIoredis.resolve("ioredis");
      pinned["@ioredis/commands"] = fromIoredis.resolve("@ioredis/commands");
      break;
    } catch {
      /* nested Hostinger copy without commands */
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

function sendUnavailable(res, title, body) {
  sendHtml(
    res,
    503,
    `<!doctype html><html lang="tr"><meta charset="utf-8"/><title>${title}</title>
<body style="font-family:system-ui;padding:2rem;max-width:40rem">
<h1>${title}</h1>
<p>${body}</p>
</body></html>`,
    {
      "x-guntan-app": "unavailable",
      "Retry-After": "5",
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

function waitUntilReady(kind, req) {
  if (isAppReady(kind)) return Promise.resolve(true);
  if (bootFailed) return Promise.resolve(false);
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      waiters = waiters.filter((w) => w !== entry);
      resolve(false);
    }, 90_000);
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
      sendUnavailable(res, "Site kullanılamıyor", "Sunucu şu anda yanıt vermiyor. Biraz sonra tekrar deneyin.");
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
  bootNext().catch((err) => {
    console.error("[hostinger] Next başlatılamadı:", err);
    notifyBootFailed();
  });
}

function parkDuplicate() {
  if (parked) return;
  parked = true;
  console.warn(`[hostinger] kopya pid=${process.pid} rss=${rssMb()}MB — birincil boşalırsa devralmayı deneyecek`);
  // Hostinger "on-demand" modelinde birincil, doğal SIGTERM ile boşalabilir
  // (idle/recycle). Kilidi bırakır bırakmaz bu kopya hemen devralsın ki
  // Hostinger'ın "3 sn içinde listen()" beklentisi karşılansın ve istekler
  // askıda kalmasın. ~2.5 sn içinde devralamazsa pasif beklemeye geçer —
  // birincil zaten canlıysa bu kopya muhtemelen gereksiz bir spawn'dır.
  const deadline = Date.now() + 2500;
  const tryTakeover = () => {
    if (shuttingDown || server.listening) return;
    if (Date.now() > deadline) {
      console.warn(`[hostinger] kopya pid=${process.pid} devralamadı — pasif bekleme, listen yok`);
      setInterval(() => {}, 30_000);
      return;
    }
    if (claimPrimaryLock()) {
      console.log(`[hostinger] kopya pid=${process.pid} birincilliği devraldı`);
      parked = false;
      bindPublicPort();
      return;
    }
    setTimeout(tryTakeover, 200);
  };
  setTimeout(tryTakeover, 200);
}

function bindPublicPort() {
  if (shuttingDown || server.listening) return;
  server.listen({ port, host: hostname, exclusive: true }, () => {
    parked = false;
    writeLock();
    console.log(
      `[hostinger] ${hostname}:${port} dinleniyor pid=${process.pid} rss=${rssMb()}MB — Next hazırlanıyor (admin path ${adminBasePath})`,
    );
    startNextAfterListen();
  });
}

server.on("error", (err) => {
  if (err?.code === "EADDRINUSE") {
    console.warn(`[hostinger] ${port} dolu; bu süreç Next yüklemeden park`);
    parkDuplicate();
    return;
  }
  console.error("[hostinger] sunucu hatası:", err);
  process.exit(1);
});

// Hostinger 3 sn: listen() hemen. 3000 yalnız kilit sahibinde; kopya dummy listen.
if (claimPrimaryLock()) {
  bindPublicPort();
} else {
  parkDuplicate();
}

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
  sfHandler = storefront.getRequestHandler();
  notifyReady("sf");
  console.log(`[hostinger] vitrin hazır pid=${process.pid} rss=${rssMb()}MB`);

  if (!adminBuildReady) {
    console.warn(
      `[hostinger] ${join(adminDir, ".next")} yok — ${adminBasePath} 503 döner. Build: pnpm build (admin dahil).`,
    );
  } else {
    console.log(`[hostinger] ${hostname}:${port} — vitrin hazır, admin ilk ${adminBasePath} isteğinde yüklenecek`);
  }

  setInterval(() => {
    console.log(`[hostinger] canlı pid=${process.pid} rss=${rssMb()}MB sf=${Boolean(sfHandler)} admin=${Boolean(adminHandler)}`);
  }, 120_000).unref();

  // Hostinger "on-demand" modelinde trafiksiz kalan süreç durduruluyor.
  // Gerçek trafik varken sorun yok; sessiz saatlerde soğuk başlangıçları
  // azaltmak için kendimize hafif bir sağlık isteği gönderiyoruz.
  setInterval(selfPing, 4 * 60_000).unref();

  // Son loglarda rss ~225-226MB'a değince Hostinger'ın kendisi süreci
  // durduruyordu (bazen SIGTERM ile, bazen hiç log bırakmadan doğrudan
  // SIGKILL ile — muhtemelen bu Node app slotu için ayrılan bellek
  // tavanına (cgroup limiti) çok yaklaşınca). Platform bize fırsat
  // vermeden kesmeden ÖNCE, kendi kontrolümüzde, temiz bir şekilde
  // kilidi bırakıp çıkalım ki Hostinger'ın "3 sn içinde listen()"
  // beklentisini bozan ani/sessiz ölümler yerine öngörülebilir,
  // loglanan bir devir teslim olsun.
  setInterval(checkMemoryCeiling, 8_000).unref();
}

// Gözlemlenen normal çalışma seviyesi zaten ~200-260MB civarında (leak değil,
// Next.js + admin + DB havuzunun doğal ayak izi); tavanı 200'de tutmak
// gereksiz sık devir teslime yol açıyordu. Hostinger'ın kendi sınırına
// (gözlemlenen ~225-256MB) hâlâ pay bırakarak 215'e çıkarıyoruz; kontrol
// aralığı da 15sn'den 8sn'e indirildi ki hızlı sıçramaları daha erken yakalasın.
const memoryCeilingMb = Number(process.env.HOSTINGER_MEM_CEILING_MB ?? "215");

function checkMemoryCeiling() {
  if (shuttingDown) return;
  const rss = rssMb();
  if (rss < memoryCeilingMb) return;
  console.warn(
    `[hostinger] bellek tavanına yaklaşıldı rss=${rss}MB (sınır ${memoryCeilingMb}MB) pid=${process.pid} — kontrollü devir teslim`,
  );
  shutdown("BELLEK_TAVANI");
}

function selfPing() {
  if (shuttingDown || !server.listening) return;
  try {
    const url = new URL(`${publicStoreUrl}/api/health`);
    const client = url.protocol === "https:" ? https : http;
    const req = client.get(url, { timeout: 8000 }, (res) => {
      res.resume();
    });
    req.on("timeout", () => req.destroy());
    req.on("error", () => {
      /* self-ping başarısızlığı önemsiz */
    });
  } catch {
    /* url geçersizse yok say */
  }
}
