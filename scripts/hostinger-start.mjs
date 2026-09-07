import { createServer } from "node:http";
import { createRequire } from "node:module";
import { parse } from "node:url";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Hostinger "Application startup file": tek Node süreci.
// Host admin.* ise yönetim paneli, aksi halde vitrin.
// İki Next app aynı PORT üzerinde; process manager SIGTERM’i bu sürece gelir.

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
  // Yerel / geçici: admin.localhost, admin.guntan...
  return host.startsWith("admin.");
}

const storefront = next({
  dev: false,
  dir: storefrontDir,
  hostname,
  port,
});
const admin = next({
  dev: false,
  dir: adminDir,
  hostname,
  port,
});

const sfHandler = storefront.getRequestHandler();
const adminHandler = admin.getRequestHandler();

await Promise.all([storefront.prepare(), admin.prepare()]);

createServer((req, res) => {
  const parsedUrl = parse(req.url ?? "/", true);
  const handler = isAdminHost(req.headers.host) ? adminHandler : sfHandler;
  handler(req, res, parsedUrl);
}).listen(port, hostname, () => {
  console.log(
    `[hostinger] ${hostname}:${port} — admin host: ${adminHost} (ve admin.*)`,
  );
});
