import { createServer } from "node:http";
import { createRequire } from "node:module";
import fs from "node:fs";
import { parse } from "node:url";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Hostinger startup: tek Node süreci.
// - /yonetim/* → admin paneli (subdomain gerekmez)
// - admin.* host → ana site /yonetim’e yönlendir
// - diğer her şey → vitrin

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const storefrontDir = join(root, "apps/storefront");
const adminDir = join(root, "apps/admin");

const requireSf = createRequire(join(storefrontDir, "package.json"));
const next = requireSf("next");

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

function sendHtml(res, status, html) {
  res.statusCode = status;
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.setHeader("x-guntan-app", "gateway");
  res.end(html);
}

const storefront = next({
  dev: false,
  dir: storefrontDir,
  hostname,
  port,
});

const adminNextDir = join(adminDir, ".next");
const adminReady = fs.existsSync(adminNextDir);
let admin = null;
let adminHandler = null;

if (!adminReady) {
  console.warn(
    `[hostinger] ${adminNextDir} yok — ${adminBasePath} 503 döner. Build: pnpm build (admin dahil).`,
  );
} else {
  admin = next({
    dev: false,
    dir: adminDir,
    hostname,
    port,
  });
}

const sfHandler = storefront.getRequestHandler();

await storefront.prepare();
if (admin) {
  try {
    await admin.prepare();
    adminHandler = admin.getRequestHandler();
    console.log(`[hostinger] admin hazır (path ${adminBasePath})`);
  } catch (err) {
    console.error("[hostinger] admin.prepare başarısız:", err);
    adminHandler = null;
  }
}

createServer((req, res) => {
  const parsedUrl = parse(req.url ?? "/", true);
  const pathOnly = parsedUrl.pathname ?? "/";

  // Klasörlü subdomain Node’a gelmez; gelirse ana site paneline al.
  if (isAdminHost(req.headers.host) && !isAdminPath(pathOnly)) {
    const dest = `${publicStoreUrl}${adminBasePath}${pathOnly === "/" ? "" : pathOnly}${parsedUrl.search ?? ""}`;
    res.statusCode = 302;
    res.setHeader("location", dest);
    res.setHeader("x-guntan-app", "admin-redirect");
    res.end();
    return;
  }

  if (isAdminPath(pathOnly) || (isAdminHost(req.headers.host) && isAdminPath(pathOnly))) {
    res.setHeader("x-guntan-app", "admin");
    if (!adminHandler) {
      sendHtml(
        res,
        503,
        `<!doctype html><html lang="tr"><meta charset="utf-8"/><title>Admin hazır değil</title>
<body style="font-family:system-ui;padding:2rem;max-width:40rem">
<h1>Admin paneli derlenmemiş</h1>
<p>Sunucuda <code>apps/admin/.next</code> yok. Hostinger build: kökte <code>pnpm build</code>.</p>
</body></html>`,
      );
      return;
    }
    return adminHandler(req, res, parsedUrl);
  }

  res.setHeader("x-guntan-app", "storefront");
  enableSharedHtmlCache(req, res);
  return sfHandler(req, res, parsedUrl);
}).listen(port, hostname, () => {
  console.log(
    `[hostinger] ${hostname}:${port} — vitrin + admin path ${adminBasePath} (adminHandler=${Boolean(adminHandler)})`,
  );
});
