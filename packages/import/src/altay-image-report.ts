/**
 * Altay XML'indeki PicturePath doluluğunu ve veritabanındaki görsel durumunu raporlar.
 * Hiçbir şey yazmaz. Kullanım: pnpm --filter @guntan/import altay-image-report
 */
import { createReadStream, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSyncEnv } from "./sync-env";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
loadSyncEnv(root);
// @guntan/db bağlantıyı import anında kurar; env yüklenmeden içe aktarılmamalı.
const { parseProductXml } = await import("./index");
const xmlPath = process.env.ALTAY_XML_PATH || join(root, "products.xml");

async function xmlReport() {
  if (!existsSync(xmlPath)) {
    console.log(`XML bulunamadı: ${xmlPath}`);
    return;
  }
  const items = await parseProductXml(createReadStream(xmlPath));
  const urls = items.map((i) => String(i.PicturePath ?? "").trim());
  const filled = urls.filter(Boolean);
  const counts = new Map<string, number>();
  for (const u of filled) counts.set(u, (counts.get(u) ?? 0) + 1);
  const hosts = new Map<string, number>();
  for (const u of filled) {
    let host = "(geçersiz adres)";
    try {
      host = new URL(u).host;
    } catch {
      /* göreli yol */
    }
    hosts.set(host, (hosts.get(host) ?? 0) + 1);
  }
  const shared = [...counts.entries()].filter(([, n]) => n > 5).sort((a, b) => b[1] - a[1]);

  console.log(`\n== Altay XML: ${xmlPath}`);
  console.log(`Ürün: ${items.length}`);
  console.log(`PicturePath dolu: ${filled.length} (%${((filled.length / Math.max(items.length, 1)) * 100).toFixed(1)})`);
  console.log(`Farklı görsel adresi: ${counts.size}`);
  console.log("Sunucular:", Object.fromEntries(hosts));
  console.log("5'ten fazla üründe tekrar eden adresler (muhtemelen genel görsel):");
  for (const [u, n] of shared.slice(0, 10)) console.log(`  ${n}x ${u}`);

  const samples = [...counts.keys()].filter((u) => (counts.get(u) ?? 0) === 1).slice(0, 8);
  console.log("Örnek ürünler:");
  for (const item of items.filter((i) => samples.includes(String(i.PicturePath ?? "").trim()))) {
    console.log(`  ${item.Code} | ${item.Name} | ${item.PicturePath}`);
  }

  console.log("Örnek adreslere erişim:");
  for (const u of samples.slice(0, 5)) {
    try {
      const res = await fetch(u, { method: "HEAD", signal: AbortSignal.timeout(10_000) });
      console.log(`  ${res.status} ${res.headers.get("content-type") ?? "-"} ${res.headers.get("content-length") ?? "-"}B ${u}`);
    } catch (err) {
      console.log(`  HATA ${err instanceof Error ? err.message : err} ${u}`);
    }
  }
}

async function dbReport() {
  const { pool } = await import("@guntan/db");
  try {
    const [rows] = await pool.query(
      `select s.code, s.name, count(distinct p.id) urun, sum(p.status = 'active') aktif,
              count(distinct pi.product_id) gorselli
         from products p
         join suppliers s on s.id = p.supplier_id
         left join product_images pi on pi.product_id = p.id
        group by s.code, s.name`,
    );
    console.log("\n== Veritabanı (tedarikçi bazında)");
    console.table(rows);
  } finally {
    await pool.end();
  }
}

await xmlReport();
await dbReport();
