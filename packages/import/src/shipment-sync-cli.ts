/**
 * Kargo/ödeme bakım işi (cron ile saatte bir):
 *   1. Aras'taki gönderilerin takip no ve teslim durumunu çek, teslim edilenleri tamamla
 *   2. Banka sayfasında yarım kalan kart siparişlerinin stok rezervasyonunu bırak
 *
 * Kullanım: pnpm --filter @guntan/import shipment-sync
 */
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../../..");
for (const envFile of [process.env.SYNC_ENV_FILE || join(homedir(), "guntan-sync.env"), join(root, ".env")]) {
  if (existsSync(envFile)) process.loadEnvFile(envFile);
}

function log(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

const { expireStaleCardOrders, syncArasShipments } = await import("@guntan/ecommerce");

let exitCode = 0;
try {
  const stats = await syncArasShipments(log);
  log(`Aras: ${stats.checked} gönderi kontrol edildi, ${stats.tracked} takip no, ${stats.delivered} teslim, ${stats.errors} hata.`);
  if (stats.errors > 0) exitCode = 1;
} catch (err) {
  log(`Aras senkronu başarısız: ${err instanceof Error ? err.message : String(err)}`);
  exitCode = 1;
}
try {
  const expired = await expireStaleCardOrders();
  if (expired > 0) log(`${expired} yarım kalan kart siparişi iptal edildi.`);
} catch (err) {
  log(`Kart siparişi temizliği başarısız: ${err instanceof Error ? err.message : String(err)}`);
  exitCode = 1;
}
process.exit(exitCode);
