/**
 * Katalog facet + ürün sayısı snapshot’larını doldurur.
 * İstek yolu bu tablodan okur; burada hesaplanan ağır COUNT/JOIN’ler canlı trafiği kilitlemez.
 *
 *   bash scripts/refresh-facets.sh
 *   pnpm --filter @guntan/catalog refresh-facets [--tenant=guntan] [--limit=N]
 *
 * FACET_MAX_MINUTES (varsayılan 45): süre dolunca kaldığı yerden sonraki cron devam eder.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { and, asc, eq, isNull } from "drizzle-orm";
import { categories, db, pool, tenants } from "@guntan/db";
import {
  computeAndStoreBrandFacets,
  computeAndStoreCategoryFacets,
  listModelsForBrand,
  listVisibleBrands,
} from "./index";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
// guntan-sync.env: cron HOME'unda veya proje üstünde (import/sync-env ile aynı arama).
for (const file of [process.env.SYNC_ENV_FILE, join(homedir(), "guntan-sync.env"), join(root, ".env")].filter(Boolean) as string[]) {
  if (existsSync(file)) {
    try {
      process.loadEnvFile(file);
    } catch {
      /* ignore */
    }
  }
}
const SYNC_HOME = existsSync(join(homedir(), "guntan-sync.env")) ? homedir() : root;
const STATE_DIR = join(SYNC_HOME, "guntan-facets");
const CURSOR_FILE = join(STATE_DIR, "refresh-cursor.json");
const MAX_MS = Number(process.env.FACET_MAX_MINUTES || 45) * 60_000;
const LIMIT = Number(process.argv.find((a) => a.startsWith("--limit="))?.slice(8) || Infinity);
const ONLY_TENANT = process.argv.find((a) => a.startsWith("--tenant="))?.slice(9);

const started = Date.now();
const timeLeft = () => MAX_MS - (Date.now() - started);

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] facets: ${msg}`);
}

type Cursor = { tenantSlug: string; brandIdx: number; modelIdx: number; catIdx: number; phase: "brand" | "category" };

function readCursor(): Cursor {
  try {
    if (existsSync(CURSOR_FILE)) return JSON.parse(readFileSync(CURSOR_FILE, "utf8")) as Cursor;
  } catch {
    /* ignore */
  }
  return { tenantSlug: "", brandIdx: 0, modelIdx: -1, catIdx: 0, phase: "brand" };
}

function writeCursor(c: Cursor) {
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(CURSOR_FILE, `${JSON.stringify(c)}\n`);
}

async function main() {
  mkdirSync(STATE_DIR, { recursive: true });
  const allTenants = await db
    .select({ id: tenants.id, slug: tenants.slug })
    .from(tenants)
    .orderBy(asc(tenants.slug));
  const sites = allTenants.filter((t) => !ONLY_TENANT || t.slug === ONLY_TENANT);
  if (sites.length === 0) {
    log("Tenant yok.");
    return;
  }

  let cursor = readCursor();
  if (ONLY_TENANT && cursor.tenantSlug && cursor.tenantSlug !== ONLY_TENANT) {
    cursor = { tenantSlug: ONLY_TENANT, brandIdx: 0, modelIdx: -1, catIdx: 0, phase: "brand" };
  }

  let done = 0;
  for (const site of sites) {
    if (timeLeft() < 60_000 || done >= LIMIT) break;
    if (cursor.tenantSlug && cursor.tenantSlug !== site.slug) continue;
    cursor.tenantSlug = site.slug;

    if (cursor.phase === "brand") {
      const brands = await listVisibleBrands(site.id);
      for (let bi = cursor.brandIdx; bi < brands.length; bi++) {
        if (timeLeft() < 60_000 || done >= LIMIT) {
          writeCursor({ ...cursor, brandIdx: bi, phase: "brand" });
          log(`Süre/limit; kaldı: ${site.slug} brand#${bi}`);
          return;
        }
        const brand = brands[bi]!;
        // modelIdx -1 = marka geneli, sonra modeller 0..
        const models = await listModelsForBrand(site.id, brand.id);
        const startModel = bi === cursor.brandIdx ? cursor.modelIdx : -1;
        for (let mi = startModel; mi < models.length; mi++) {
          if (timeLeft() < 60_000 || done >= LIMIT) {
            writeCursor({ tenantSlug: site.slug, brandIdx: bi, modelIdx: mi, catIdx: 0, phase: "brand" });
            log(`Süre/limit; kaldı: ${site.slug}/${brand.slug} model#${mi}`);
            return;
          }
          const modelId = mi < 0 ? undefined : models[mi]!.id;
          const label = mi < 0 ? brand.slug : `${brand.slug}/${models[mi]!.slug}`;
          try {
            const snap = await computeAndStoreBrandFacets(site.id, brand.id, modelId);
            done += 1;
            log(`${site.slug}/${label}: ${snap.productTotal ?? 0} ürün, ${snap.categories.length} kat, ${snap.manufacturers.length} üretici`);
          } catch (err) {
            log(`${site.slug}/${label} HATA: ${err instanceof Error ? err.message : err}`);
          }
          writeCursor({ tenantSlug: site.slug, brandIdx: bi, modelIdx: mi + 1, catIdx: 0, phase: "brand" });
        }
        cursor = { tenantSlug: site.slug, brandIdx: bi + 1, modelIdx: -1, catIdx: 0, phase: "brand" };
        writeCursor(cursor);
      }
      cursor = { tenantSlug: site.slug, brandIdx: 0, modelIdx: -1, catIdx: 0, phase: "category" };
      writeCursor(cursor);
    }

    if (cursor.phase === "category") {
      const roots = await db
        .select({ id: categories.id, slug: categories.slug })
        .from(categories)
        .where(and(isNull(categories.parentId), eq(categories.isActive, true)))
        .orderBy(asc(categories.sortOrder), asc(categories.name));
      // Kök + bir seviye çocuk (facet’lerin çoğu burada).
      const childRows = await db
        .select({ id: categories.id, slug: categories.slug, parentId: categories.parentId })
        .from(categories)
        .where(eq(categories.isActive, true));
      const kids = childRows.filter((c) => c.parentId && roots.some((r) => r.id === c.parentId));
      const targets = [...roots, ...kids];

      for (let ci = cursor.catIdx; ci < targets.length; ci++) {
        if (timeLeft() < 60_000 || done >= LIMIT) {
          writeCursor({ ...cursor, catIdx: ci, phase: "category" });
          log(`Süre/limit; kaldı: ${site.slug} cat#${ci}`);
          return;
        }
        const cat = targets[ci]!;
        try {
          const snap = await computeAndStoreCategoryFacets(site.id, cat.id);
          done += 1;
          log(`${site.slug}/kategori/${cat.slug}: ${snap.productTotal ?? 0} ürün`);
        } catch (err) {
          log(`${site.slug}/kategori/${cat.slug} HATA: ${err instanceof Error ? err.message : err}`);
        }
        writeCursor({ tenantSlug: site.slug, brandIdx: 0, modelIdx: -1, catIdx: ci + 1, phase: "category" });
      }
    }

    // Tenant bitti → sonraki tenant başa
    cursor = { tenantSlug: "", brandIdx: 0, modelIdx: -1, catIdx: 0, phase: "brand" };
    writeCursor(cursor);
  }

  log(`Bitti: ${done} snapshot (${((Date.now() - started) / 1000).toFixed(0)}s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
  });
