/**
 * B2B (İkimiz Oto) örnek yanıt aracı: giriş yapar, ilk sayfaları çeker, alan adlarını yazdırır ve
 * örnek satırları dosyaya kaydeder. Şifre çıktıya yazılmaz. Eşleme (b2b-ikimiz-map) bu çıktıya göre yazılır.
 *
 * Kullanım (sunucuda, B2B_IKIMIZ_* değerleri guntan-sync.env içinde): pnpm --filter @guntan/import b2b-probe [sayfa=3]
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { B2bIkimizClient, b2bIkimizConfigFromEnv } from "./b2b-ikimiz-fetch";
import { loadSyncEnv, syncHomeDir } from "./sync-env";

const loaded = loadSyncEnv(join(dirname(fileURLToPath(import.meta.url)), "../../.."));
const config = b2bIkimizConfigFromEnv();
if (!config) {
  console.error("B2B_IKIMIZ_USERNAME / B2B_IKIMIZ_PASSWORD tanımlı değil (guntan-sync.env).");
  process.exit(1);
}

const pages = Math.max(1, Number(process.argv[2]) || 3);
const client = new B2bIkimizClient(config);
await client.login();
console.log("giriş: tamam");

const rows: unknown[] = [];
let total = 0;
let n = 0;
for await (const page of client.products(100, pages)) {
  n++;
  total += page.length;
  if (rows.length < 20) rows.push(...page.slice(0, 20 - rows.length));
  if (n >= pages) break;
}
console.log(`${n} sayfa, ${total} satır çekildi`);

const keys = new Map<string, unknown>();
for (const r of rows) {
  if (r && typeof r === "object") for (const [k, v] of Object.entries(r)) if (!keys.has(k) && v != null && v !== "") keys.set(k, v);
}
console.log("alanlar (örnek değer):");
for (const [k, v] of keys) console.log(`  ${k}: ${JSON.stringify(v).slice(0, 80)}`);

const out = join(syncHomeDir(loaded), "b2b-ikimiz-sample.json");
writeFileSync(out, JSON.stringify(rows, null, 2));
console.log(`örnek satırlar: ${out}`);
