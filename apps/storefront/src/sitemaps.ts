import { headers } from "next/headers";
import { and, asc, count, eq } from "drizzle-orm";
import { resolveTenantByHost } from "@guntan/tenant";
import {
  categories,
  db,
  products,
  tenantCatalogIndex,
  tenantSeesAllCatalog,
  tenantVisibleBrands,
  vehicleBrands,
  vehicleModels,
} from "@guntan/db";
import { VISIBILITY_MODE } from "@guntan/types";

/** Google sınırı 50.000 adres / 50 MB; ürün adresleri uzun olduğu için pay bırakılır. */
export const PRODUCTS_PER_SITEMAP = 40_000;

const XML_HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=3600, s-maxage=3600",
};

function esc(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function isoDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

async function sitemapContext() {
  const h = await headers();
  const host = h.get("x-request-host") ?? h.get("host") ?? "";
  const tenant = await resolveTenantByHost(host);
  if (!tenant) return null;
  const seesAll =
    tenant.tenant.visibilityMode === VISIBILITY_MODE.ALL || (await tenantSeesAllCatalog(tenant.tenant.id));
  return { tenantId: tenant.tenant.id, base: `https://${tenant.tenant.canonicalHost}`, seesAll };
}

async function productCount(tenantId: string, seesAll: boolean) {
  const [row] = seesAll
    ? await db.select({ n: count() }).from(products).where(eq(products.status, "active"))
    : await db
        .select({ n: count() })
        .from(products)
        .innerJoin(tenantCatalogIndex, eq(tenantCatalogIndex.productId, products.id))
        .where(and(eq(tenantCatalogIndex.tenantId, tenantId), eq(products.status, "active")));
  return Number(row?.n ?? 0);
}

function urlset(entries: { loc: string; lastmod?: string | null }[]) {
  const body = entries
    .map((e) => `<url><loc>${esc(e.loc)}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ""}</url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export async function sitemapIndexResponse() {
  const ctx = await sitemapContext();
  if (!ctx) return new Response("Site bulunamadı", { status: 404 });
  const total = await productCount(ctx.tenantId, ctx.seesAll);
  const parts = Math.max(1, Math.ceil(total / PRODUCTS_PER_SITEMAP));
  const now = new Date().toISOString();
  const files = ["sayfalar.xml", ...Array.from({ length: parts }, (_, i) => `urunler-${i + 1}.xml`)];
  const body = files
    .map((f) => `<sitemap><loc>${esc(`${ctx.base}/sitemaps/${f}`)}</loc><lastmod>${now}</lastmod></sitemap>`)
    .join("\n");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`,
    { headers: XML_HEADERS },
  );
}

export async function sitemapFileResponse(file: string) {
  const ctx = await sitemapContext();
  if (!ctx) return new Response("Site bulunamadı", { status: 404 });

  if (file === "sayfalar.xml") {
    const [brandRows, modelRows, catRows] = await Promise.all([
      db
        .select({ slug: vehicleBrands.slug })
        .from(tenantVisibleBrands)
        .innerJoin(vehicleBrands, eq(tenantVisibleBrands.brandId, vehicleBrands.id))
        .where(and(eq(tenantVisibleBrands.tenantId, ctx.tenantId), eq(vehicleBrands.isActive, true)))
        .orderBy(asc(vehicleBrands.sortOrder)),
      db
        .select({ brand: vehicleBrands.slug, model: vehicleModels.slug })
        .from(vehicleModels)
        .innerJoin(vehicleBrands, eq(vehicleModels.brandId, vehicleBrands.id))
        .innerJoin(tenantVisibleBrands, eq(tenantVisibleBrands.brandId, vehicleBrands.id))
        .where(
          and(
            eq(tenantVisibleBrands.tenantId, ctx.tenantId),
            eq(vehicleBrands.isActive, true),
            eq(vehicleModels.isActive, true),
          ),
        ),
      db.select({ slug: categories.slug }).from(categories).where(eq(categories.isActive, true)),
    ]);
    return new Response(
      urlset([
        { loc: `${ctx.base}/` },
        ...catRows.map((c) => ({ loc: `${ctx.base}/kategori/${c.slug}` })),
        ...brandRows.map((b) => ({ loc: `${ctx.base}/${b.slug}` })),
        ...modelRows.map((m) => ({ loc: `${ctx.base}/${m.brand}/${m.model}` })),
        ...["hakkimizda", "iade", "mesafeli-satis", "gizlilik"].map((s) => ({ loc: `${ctx.base}/sayfa/${s}` })),
        { loc: `${ctx.base}/iletisim` },
      ]),
      { headers: XML_HEADERS },
    );
  }

  const match = /^urunler-(\d+)\.xml$/.exec(file);
  const part = match ? Number(match[1]) : 0;
  if (part < 1) return new Response("Bulunamadı", { status: 404 });
  const offset = (part - 1) * PRODUCTS_PER_SITEMAP;
  const rows = ctx.seesAll
    ? await db
        .select({ slug: products.slug, updatedAt: products.updatedAt })
        .from(products)
        .where(eq(products.status, "active"))
        .orderBy(asc(products.id))
        .limit(PRODUCTS_PER_SITEMAP)
        .offset(offset)
    : await db
        .select({ slug: products.slug, updatedAt: products.updatedAt })
        .from(products)
        .innerJoin(tenantCatalogIndex, eq(tenantCatalogIndex.productId, products.id))
        .where(and(eq(tenantCatalogIndex.tenantId, ctx.tenantId), eq(products.status, "active")))
        .orderBy(asc(products.id))
        .limit(PRODUCTS_PER_SITEMAP)
        .offset(offset);
  if (!rows.length) return new Response("Bulunamadı", { status: 404 });
  return new Response(
    urlset(rows.map((p) => ({ loc: `${ctx.base}/urun/${p.slug}`, lastmod: isoDate(p.updatedAt) }))),
    { headers: XML_HEADERS },
  );
}
