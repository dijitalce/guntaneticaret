import { feedProductsPage, tenantSeesAllCatalog, type FeedProduct } from "@guntan/db";
import { requestHost, tenantFromRequest } from "./request-tenant";

const PAGE = 2000;
const MAX_ITEMS = 150_000;
// Google ürün kategorisi: Taşıtlar ve Parçalar > Taşıt Parçaları ve Aksesuarları > Motorlu Taşıt Parçaları
const GOOGLE_CATEGORY = "899";

function xml(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function plain(html: string | null, fallback: string) {
  const text = (html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return (text || fallback).slice(0, 4900);
}

function itemXml(p: FeedProduct, base: string, siteName: string) {
  const price = Number(p.price);
  const compare = Number(p.compare_at_price ?? 0);
  const onSale = compare > price;
  const image = p.image ? (/^https?:\/\//.test(p.image) ? p.image : `${base}${p.image.startsWith("/") ? "" : "/"}${p.image}`) : "";
  const gtin = p.barcode && /^\d{8,14}$/.test(p.barcode) ? p.barcode : "";
  const brand = p.brand?.trim() || siteName;
  const parts = [
    `<g:id>${xml(p.id)}</g:id>`,
    `<title>${xml(p.name.slice(0, 150))}</title>`,
    `<description>${xml(plain(p.description, p.name))}</description>`,
    `<link>${xml(`${base}/urun/${p.slug}`)}</link>`,
    image ? `<g:image_link>${xml(image)}</g:image_link>` : "",
    `<g:availability>${p.available > 0 ? "in_stock" : "out_of_stock"}</g:availability>`,
    `<g:price>${(onSale ? compare : price).toFixed(2)} TRY</g:price>`,
    onSale ? `<g:sale_price>${price.toFixed(2)} TRY</g:sale_price>` : "",
    `<g:brand>${xml(brand)}</g:brand>`,
    gtin ? `<g:gtin>${gtin}</g:gtin>` : "",
    `<g:mpn>${xml(p.sku)}</g:mpn>`,
    gtin || p.sku ? "" : "<g:identifier_exists>no</g:identifier_exists>",
    "<g:condition>new</g:condition>",
    `<g:google_product_category>${GOOGLE_CATEGORY}</g:google_product_category>`,
    `<g:product_type>Oto Yedek Parça</g:product_type>`,
  ];
  return `<item>${parts.join("")}</item>\n`;
}

/** Google Merchant Center ve Meta katalog için RSS 2.0 (g: alanları) ürün beslemesi; akış halinde üretilir. */
export async function productFeedResponse(kind: "google" | "meta") {
  const tenant = await tenantFromRequest();
  if (!tenant) return new Response("Site bulunamadı", { status: 404 });
  const social = (tenant.social ?? {}) as Record<string, string>;
  const enabled = kind === "google" ? social.merchantFeed === "1" : social.metaFeed === "1";
  if (!enabled) return new Response("Bu besleme panelden etkinleştirilmemiş.", { status: 404 });
  const inStockOnly = social.feedAllProducts !== "1";
  const host = await requestHost();
  const base = `https://${host.split(":")[0]}`;
  const seesAll = await tenantSeesAllCatalog(tenant.tenant.id);
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(
        encoder.encode(
          `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>${xml(tenant.siteName)}</title><link>${xml(base)}</link><description>${xml(`${tenant.siteName} ürün kataloğu`)}</description>\n`,
        ),
      );
      let afterId = "";
      let count = 0;
      try {
        while (count < MAX_ITEMS) {
          const page = await feedProductsPage({ tenantId: tenant.tenant.id, seesAll, afterId, limit: PAGE, inStockOnly });
          if (!page.length) break;
          controller.enqueue(encoder.encode(page.map((p) => itemXml(p, base, tenant.siteName)).join("")));
          count += page.length;
          afterId = page[page.length - 1]!.id;
          if (page.length < PAGE) break;
        }
      } catch {
        /* yarım besleme yine de kapatılır */
      }
      controller.enqueue(encoder.encode("</channel></rss>\n"));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
