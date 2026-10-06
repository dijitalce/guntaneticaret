import { sql } from "drizzle-orm";
import { rows } from "./sql";

export type FeedProduct = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string | null;
  barcode: string | null;
  price: string;
  compare_at_price: string | null;
  available: number;
  brand: string | null;
  image: string | null;
};

/** Katalog beslemesi için sayfalı ürün okuması (id sırasıyla, keyset). */
export async function feedProductsPage(opts: { tenantId: string; seesAll: boolean; afterId: string; limit: number; inStockOnly: boolean }) {
  return rows<FeedProduct>(sql`select p.id, p.sku, p.name, p.slug, p.description, p.barcode,
      coalesce(o.price, p.price) price, coalesce(o.compare_at_price, p.compare_at_price) compare_at_price,
      p.stock_qty - p.reserved_qty available, m.name brand,
      (select url from product_images i where i.product_id = p.id order by i.sort_order asc limit 1) image
    from products p
    left join manufacturers m on m.id = p.manufacturer_id
    left join tenant_product_overrides o on o.product_id = p.id and o.tenant_id = ${opts.tenantId}
    where p.status = 'active' and p.id > ${opts.afterId}
      and (o.is_hidden is null or o.is_hidden = 0)
      and coalesce(o.price, p.price) > 0
      ${opts.inStockOnly ? sql`and p.stock_qty - p.reserved_qty > 0` : sql``}
      ${opts.seesAll ? sql`` : sql`and exists (select 1 from tenant_catalog_index t where t.tenant_id = ${opts.tenantId} and t.product_id = p.id)`}
    order by p.id asc limit ${opts.limit}`);
}
