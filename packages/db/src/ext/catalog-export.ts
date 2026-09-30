import { randomBytes } from "node:crypto";
import { sql, type SQL } from "drizzle-orm";
import { getAppSetting, setAppSetting } from "../app-settings";
import { rows } from "./sql";

/** Parça başına hedef boyut; 40 MB sınırının altında pay bırakır. */
export const EXPORT_PART_BYTES = 35 * 1024 * 1024;
/** Etiketler, URL, fiyat ve stok gibi sabit alanlar için ürün başına eklenen bayt. */
const ITEM_OVERHEAD = 1100;
const PARTS_TTL_MS = 15 * 60 * 1000;

export type CatalogExportSettings = { token: string | null; updatedAt: string | null };

const settingKey = (tenantId: string) => `catalog_export:${tenantId}`;

export async function getCatalogExport(tenantId: string): Promise<CatalogExportSettings> {
  const hit = await getAppSetting<CatalogExportSettings>(settingKey(tenantId)).catch(() => null);
  return { token: hit?.value.token ?? null, updatedAt: hit?.value.updatedAt ?? null };
}

/** Yeni bir erişim anahtarı üretir (eski linkler geçersiz olur) veya `null` ile paylaşımı kapatır. */
export async function setCatalogExportToken(tenantId: string, enabled: boolean): Promise<CatalogExportSettings> {
  const next: CatalogExportSettings = { token: enabled ? randomBytes(18).toString("base64url") : null, updatedAt: new Date().toISOString() };
  await setAppSetting(settingKey(tenantId), next);
  partsCache.delete(tenantId);
  return next;
}

export type ExportPart = { index: number; afterId: string; lastId: string | null; products: number; bytes: number };
export type ExportPlan = { parts: ExportPart[]; products: number; bytes: number; computedAt: Date };

const partsCache = new Map<string, { at: number; plan: Promise<ExportPlan> }>();

function visibleWhere(tenantId: string, seesAll: boolean): SQL {
  return sql`p.status = 'active'
    and (o.is_hidden is null or o.is_hidden = 0)
    ${seesAll ? sql`` : sql`and exists (select 1 from tenant_catalog_index t where t.tenant_id = ${tenantId} and t.product_id = p.id)`}`;
}

async function computePlan(tenantId: string, seesAll: boolean): Promise<ExportPlan> {
  const sizes = await rows<{ id: string; est: number | string }>(sql`select p.id,
      octet_length(p.name) + coalesce(octet_length(p.description), 0) + octet_length(p.sku) + octet_length(p.slug)
      + coalesce(octet_length(p.barcode), 0) + coalesce(octet_length(m.name), 0)
      + coalesce((select sum(octet_length(i.url)) + count(*) * 24 from product_images i where i.product_id = p.id), 0)
      + coalesce((select sum(octet_length(e.raw)) + count(*) * 14 from product_oems e where e.product_id = p.id), 0) est
    from products p
    left join manufacturers m on m.id = p.manufacturer_id
    left join tenant_product_overrides o on o.product_id = p.id and o.tenant_id = ${tenantId}
    where ${visibleWhere(tenantId, seesAll)}
    order by p.id asc`);
  const parts: ExportPart[] = [];
  let current: ExportPart = { index: 1, afterId: "", lastId: null, products: 0, bytes: 0 };
  let total = 0;
  for (const row of sizes) {
    // Kaçış karakterleri (&amp; vb.) için %15 pay.
    const bytes = Math.ceil(Number(row.est) * 1.15) + ITEM_OVERHEAD;
    if (current.products > 0 && current.bytes + bytes > EXPORT_PART_BYTES) {
      parts.push(current);
      current = { index: current.index + 1, afterId: current.lastId!, lastId: null, products: 0, bytes: 0 };
    }
    current.products++;
    current.bytes += bytes;
    current.lastId = row.id;
    total += bytes;
  }
  if (current.products > 0 || !parts.length) parts.push(current);
  // Son parça açık uçludur: plan hesaplandıktan sonra eklenen ürünler de oraya düşer.
  parts[parts.length - 1]!.lastId = null;
  return { parts, products: sizes.length, bytes: total, computedAt: new Date() };
}

/** Kataloğun parçalara bölünme planı; 15 dakika önbelleklenir. */
export function catalogExportPlan(tenantId: string, seesAll: boolean, { fresh = false } = {}): Promise<ExportPlan> {
  const hit = partsCache.get(tenantId);
  if (!fresh && hit && Date.now() - hit.at < PARTS_TTL_MS) return hit.plan;
  const plan = computePlan(tenantId, seesAll);
  partsCache.set(tenantId, { at: Date.now(), plan });
  plan.catch(() => partsCache.delete(tenantId));
  return plan;
}

export type ExportProduct = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string | null;
  barcode: string | null;
  price: string;
  compare_at_price: string | null;
  vat_rate: string;
  stock: number;
  brand: string | null;
  category: string | null;
  images: string[];
  oems: string[];
};

/** Bir parçanın ürünlerini sayfa sayfa okur (id sırası, keyset). */
export async function catalogExportPage(opts: { tenantId: string; seesAll: boolean; afterId: string; untilId: string | null; limit: number }): Promise<ExportProduct[]> {
  const base = await rows<Omit<ExportProduct, "images" | "oems" | "category">>(sql`select p.id, p.sku, p.name, p.slug, p.description, p.barcode,
      coalesce(o.price, p.price) price, coalesce(o.compare_at_price, p.compare_at_price) compare_at_price, p.vat_rate,
      greatest(p.stock_qty - p.reserved_qty, 0) stock, m.name brand
    from products p
    left join manufacturers m on m.id = p.manufacturer_id
    left join tenant_product_overrides o on o.product_id = p.id and o.tenant_id = ${opts.tenantId}
    where ${visibleWhere(opts.tenantId, opts.seesAll)} and p.id > ${opts.afterId}
      ${opts.untilId ? sql`and p.id <= ${opts.untilId}` : sql``}
    order by p.id asc limit ${opts.limit}`);
  if (!base.length) return [];
  const ids = base.map((p) => p.id);
  const idList = sql.join(
    ids.map((id) => sql`${id}`),
    sql`, `,
  );
  const [images, oems, cats] = await Promise.all([
    rows<{ product_id: string; url: string }>(sql`select product_id, url from product_images where product_id in (${idList}) order by product_id, sort_order`),
    rows<{ product_id: string; raw: string }>(sql`select product_id, raw from product_oems where product_id in (${idList})`),
    rows<{ product_id: string; name: string }>(sql`select pc.product_id, c.name from product_categories pc join categories c on c.id = pc.category_id where pc.product_id in (${idList})`),
  ]);
  const group = <T extends { product_id: string }>(list: T[], pick: (r: T) => string) => {
    const map = new Map<string, string[]>();
    for (const r of list) {
      const arr = map.get(r.product_id) ?? [];
      arr.push(pick(r));
      map.set(r.product_id, arr);
    }
    return map;
  };
  const imageMap = group(images, (r) => r.url);
  const oemMap = group(oems, (r) => r.raw);
  const catMap = group(cats, (r) => r.name);
  return base.map((p) => ({
    ...p,
    stock: Number(p.stock),
    category: catMap.get(p.id)?.[0] ?? null,
    images: imageMap.get(p.id) ?? [],
    oems: [...new Set(oemMap.get(p.id) ?? [])],
  }));
}
