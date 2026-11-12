/**
 * Sitelerin meta başlık, meta açıklama ve ana sayfa SEO metnini doldurur.
 * Varsayılan olarak yalnızca ne değişeceğini yazar; yazmak için `--apply` verin.
 */
import { eq } from "drizzle-orm";
import { db, pool } from "./client";
import { tenantSettings, tenants } from "./schema";
import { SITE_SEO, SITE_SEO_LIMITS, siteSeoFill } from "./content/site-seo";

function checkLimits() {
  const L = SITE_SEO_LIMITS;
  for (const [slug, s] of Object.entries(SITE_SEO)) {
    const bad =
      s.title.length < L.title.min || s.title.length > L.title.max
        ? `başlık ${s.title.length}`
        : s.description.length < L.description.min || s.description.length > L.description.max
          ? `açıklama ${s.description.length}`
          : s.content.length < L.content.min
            ? `metin ${s.content.length}`
            : null;
    if (bad) throw new Error(`${slug}: ${bad} karakter, sınır dışında.`);
  }
}

async function main() {
  checkLimits();
  const apply = process.argv.includes("--apply");
  const rows = await db
    .select({ slug: tenants.slug, name: tenants.name, settings: tenantSettings })
    .from(tenants)
    .innerJoin(tenantSettings, eq(tenantSettings.tenantId, tenants.id));

  let changed = 0;
  for (const { slug, name, settings } of rows) {
    const fill = siteSeoFill(slug, [name, settings.siteName], settings);
    const keys = Object.keys(fill);
    console.log(`${slug.padEnd(8)} ${keys.length ? keys.join(", ") : "değişiklik yok (elle girilmiş ya da tanımsız site)"}`);
    if (!keys.length) continue;
    changed++;
    if (apply) await db.update(tenantSettings).set(fill).where(eq(tenantSettings.id, settings.id));
  }
  console.log(apply ? `${changed} site güncellendi.` : `${changed} site güncellenecek. Yazmak için: pnpm db:seed-site-seo --apply`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
