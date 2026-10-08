import { headers } from "next/headers";
import { and, asc, eq, sql } from "drizzle-orm";
import {
  db,
  products,
  siteStructure,
  sitemapFileNames,
  SITEMAP_PRODUCTS_PER_FILE,
  SITEMAP_STATIC_PAGES,
  tenantCatalogIndex,
} from "@guntan/db";
import { resolveTenantByHost } from "@guntan/tenant";

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
  const structure = await siteStructure(tenant.tenant.id);
  return { tenantId: tenant.tenant.id, base: `https://${tenant.tenant.canonicalHost}`, structure };
}

function urlset(entries: { loc: string; lastmod?: string | null; image?: string | null }[]) {
  const body = entries
    .map(
      (e) =>
        `<url><loc>${esc(e.loc)}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ""}${
          e.image ? `<image:image><image:loc>${esc(e.image)}</image:loc></image:image>` : ""
        }</url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${body}\n</urlset>\n`;
}

const firstImage = sql<string | null>`(select pi.url from product_images pi where pi.product_id = ${products.id} order by pi.sort_order limit 1)`;

function absoluteImage(base: string, url: string | null) {
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

export async function sitemapIndexResponse() {
  const ctx = await sitemapContext();
  if (!ctx) return new Response("Site bulunamadı", { status: 404 });
  const body = sitemapFileNames(ctx.structure.products)
    .map((f) => `<sitemap><loc>${esc(`${ctx.base}/sitemaps/${f}`)}</loc></sitemap>`)
    .join("\n");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`,
    { headers: XML_HEADERS },
  );
}

export async function sitemapFileResponse(file: string) {
  const ctx = await sitemapContext();
  if (!ctx) return new Response("Site bulunamadı", { status: 404 });
  const { base, structure } = ctx;

  if (file === "sayfalar.xml") {
    return new Response(urlset([{ loc: `${base}/` }, ...SITEMAP_STATIC_PAGES.map((p) => ({ loc: `${base}${p.path}` }))]), { headers: XML_HEADERS });
  }
  if (file === "kategoriler.xml") {
    const cats = structure.categories.filter((c) => c.count > 0);
    return new Response(urlset(cats.map((c) => ({ loc: `${base}/kategori/${c.slug}` }))), { headers: XML_HEADERS });
  }
  if (file === "markalar.xml") {
    const entries = structure.brands
      .filter((b) => b.count > 0)
      .flatMap((b) => [
        { loc: `${base}/${b.slug}` },
        ...b.models.filter((m) => m.count > 0).map((m) => ({ loc: `${base}/${b.slug}/${m.slug}` })),
      ]);
    return new Response(urlset(entries), { headers: XML_HEADERS });
  }

  const match = /^urunler-(\d+)\.xml$/.exec(file);
  const part = match ? Number(match[1]) : 0;
  if (part < 1) return new Response("Bulunamadı", { status: 404 });
  const offset = (part - 1) * SITEMAP_PRODUCTS_PER_FILE;
  const rows = structure.seesAll
    ? await db
        .select({ slug: products.slug, updatedAt: products.updatedAt, image: firstImage })
        .from(products)
        .where(eq(products.status, "active"))
        .orderBy(asc(products.id))
        .limit(SITEMAP_PRODUCTS_PER_FILE)
        .offset(offset)
    : await db
        .select({ slug: products.slug, updatedAt: products.updatedAt, image: firstImage })
        .from(products)
        .innerJoin(tenantCatalogIndex, eq(tenantCatalogIndex.productId, products.id))
        .where(and(eq(tenantCatalogIndex.tenantId, ctx.tenantId), eq(products.status, "active")))
        .orderBy(asc(products.id))
        .limit(SITEMAP_PRODUCTS_PER_FILE)
        .offset(offset);
  if (!rows.length) return new Response("Bulunamadı", { status: 404 });
  return new Response(
    urlset(rows.map((p) => ({ loc: `${base}/urun/${p.slug}`, lastmod: isoDate(p.updatedAt), image: absoluteImage(base, p.image) }))),
    { headers: XML_HEADERS },
  );
}
