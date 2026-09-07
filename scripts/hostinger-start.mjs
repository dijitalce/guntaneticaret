import { createServer } from "node:http";
import { createRequire } from "node:module";
import fs from "node:fs";
import { parse } from "node:url";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Hostinger startup: tek Node süreci.
// Host admin.* → yönetim paneli; aksi halde vitrin.
// Not: panelde Start `pnpm --filter @guntan/storefront start` olsa bile
// storefront package.json bu dosyaya yönlendirir.

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const storefrontDir = join(root, "apps/storefront");
const adminDir = join(root, "apps/admin");

const requireSf = createRequire(join(storefrontDir, "package.json"));
const next = requireSf("next");

const port = Number(process.env.PORT ?? "3000");
const hostname = "0.0.0.0";
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
    `[hostinger] ${adminNextDir} yok — admin host’ları 503 döner. Build: pnpm build (admin dahil).`,
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
    console.log(`[hostinger] admin hazır (${adminHost})`);
  } catch (err) {
    console.error("[hostinger] admin.prepare başarısız:", err);
    adminHandler = null;
  }
}

createServer((req, res) => {
  const parsedUrl = parse(req.url ?? "/", true);
  const adminReq = isAdminHost(req.headers.host);

  if (adminReq) {
    res.setHeader("x-guntan-app", "admin");
    if (!adminHandler) {
      sendHtml(
        res,
        503,
        `<!doctype html><html lang="tr"><meta charset="utf-8"/><title>Admin hazır değil</title>
<body style="font-family:system-ui;padding:2rem;max-width:40rem">
<h1>Admin paneli derlenmemiş</h1>
<p>Sunucuda <code>apps/admin/.next</code> yok. Hostinger build komutu kökte <code>pnpm build</code> olmalı (sadece storefront değil).</p>
</body></html>`,
      );
      return;
    }
    return adminHandler(req, res, parsedUrl);
  }

  res.setHeader("x-guntan-app", "storefront");
  return sfHandler(req, res, parsedUrl);
}).listen(port, hostname, () => {
  console.log(
    `[hostinger] ${hostname}:${port} — storefront + admin host: ${adminHost} (adminHandler=${Boolean(adminHandler)})`,
  );
});
