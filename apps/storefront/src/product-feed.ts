import { feedProductsPage, tenantSeesAllCatalog, type FeedProduct } from "@guntan/db";
import { getTenantSalesStatus } from "@guntan/tenant";
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

export type FeedKind = "google" | "meta" | "tiktok" | "pinterest" | "bing" | "chatgpt";

const FEED_FLAG: Record<FeedKind, string> = {
  google: "merchantFeed",
  meta: "metaFeed",
  tiktok: "tiktokFeed",
  pinterest: "pinterestFeed",
  bing: "bingFeed",
  chatgpt: "chatgptFeed",
};

export function validGtin(code: string) {
  if (!/^(\d{8}|\d{12,14})$/.test(code)) return false;
  const digits = [...code].map(Number);
  const check = digits.pop()!;
  const sum = digits.reverse().reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

function productFields(p: FeedProduct, base: string, siteName: string) {
  const price = Number(p.price);
  const compare = Number(p.compare_at_price ?? 0);
  const onSale = compare > price;
  const image = p.image ? (/^https?:\/\//.test(p.image) ? p.image : `${base}${p.image.startsWith("/") ? "" : "/"}${p.image}`) : "";
  const gtin = p.barcode && validGtin(p.barcode) ? p.barcode : "";
  const brand = p.brand?.trim() || siteName;
  return { price, compare, onSale, image, gtin, brand };
}

type Availability = "in_stock" | "out_of_stock";

/** OpenAI (ChatGPT alışveriş) ürün beslemesi: satır başına bir JSON kaydı. */
function itemJsonl(p: FeedProduct, base: string, siteName: string, availability: Availability) {
  const { price, compare, onSale, image, gtin, brand } = productFields(p, base, siteName);
  if (!image || !(price > 0)) return "";
  const record: Record<string, string | boolean> = {
    item_id: p.id,
    title: p.name.slice(0, 150),
    description: plain(p.description, p.name),
    url: `${base}/urun/${p.slug}`,
    brand,
    seller_name: siteName,
    seller_url: base,
    image_url: image,
    availability,
    price: `${(onSale ? compare : price).toFixed(2)} TRY`,
    is_eligible_search: true,
    is_eligible_checkout: false,
    condition: "new",
    product_category: "Otomotiv > Oto Yedek Parça",
  };
  if (onSale) record.sale_price = `${price.toFixed(2)} TRY`;
  if (gtin) record.gtin = gtin;
  if (p.sku) record.mpn = p.sku;
  return `${JSON.stringify(record)}\n`;
}

function itemXml(p: FeedProduct, base: string, siteName: string, availability: Availability) {
  const { price, compare, onSale, image, gtin, brand } = productFields(p, base, siteName);
  const parts = [
    `<g:id>${xml(p.id)}</g:id>`,
    `<title>${xml(p.name.slice(0, 150))}</title>`,
    `<description>${xml(plain(p.description, p.name))}</description>`,
    `<link>${xml(`${base}/urun/${p.slug}`)}</link>`,
    image ? `<g:image_link>${xml(image)}</g:image_link>` : "",
    `<g:availability>${availability}</g:availability>`,
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

/**
 * Katalog beslemesi; akış halinde üretilir. ChatGPT için OpenAI JSONL biçimi,
 * diğerleri (Google, Meta, TikTok, Pinterest, Microsoft) için RSS 2.0 (g: alanları).
 */
export async function productFeedResponse(kind: FeedKind) {
  const tenant = await tenantFromRequest();
  if (!tenant) return new Response("Site bulunamadı", { status: 404 });
  const social = (tenant.social ?? {}) as Record<string, string>;
  if (social[FEED_FLAG[kind]] !== "1") return new Response("Bu besleme panelden etkinleştirilmemiş.", { status: 404 });
  const jsonl = kind === "chatgpt";
  const inStockOnly = social.feedAllProducts !== "1";
  const host = await requestHost();
  const base = `https://${host.split(":")[0]}`;
  const seesAll = await tenantSeesAllCatalog(tenant.tenant.id);
  const availability: Availability = (await getTenantSalesStatus(tenant.tenant.id)).open ? "in_stock" : "out_of_stock";
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      if (!jsonl) {
        controller.enqueue(
          encoder.encode(
            `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>${xml(tenant.siteName)}</title><link>${xml(base)}</link><description>${xml(`${tenant.siteName} ürün kataloğu`)}</description>\n`,
          ),
        );
      }
      const render = jsonl ? itemJsonl : itemXml;
      let afterId = "";
      let count = 0;
      try {
        while (count < MAX_ITEMS) {
          const page = await feedProductsPage({ tenantId: tenant.tenant.id, seesAll, afterId, limit: PAGE, inStockOnly });
          if (!page.length) break;
          controller.enqueue(encoder.encode(page.map((p) => render(p, base, tenant.siteName, availability)).join("")));
          count += page.length;
          afterId = page[page.length - 1]!.id;
          if (page.length < PAGE) break;
        }
      } catch {
        /* yarım besleme yine de kapatılır */
      }
      if (!jsonl) controller.enqueue(encoder.encode("</channel></rss>\n"));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": jsonl ? "application/x-ndjson; charset=utf-8" : "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
