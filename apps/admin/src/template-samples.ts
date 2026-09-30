import { and, desc, eq, gt, sql } from "drizzle-orm";
import {
  buildOrderVars,
  coupons,
  db,
  emailLayout,
  escapeHtml,
  getTenantContext,
  orders,
  products,
  renderText,
  tenants,
  type ResolvedTemplate,
} from "@guntan/db";

export type PreviewVars = { vars: Record<string, string>; orderNo: string | null; siteName: string; siteUrl: string };

/** Önizleme ve test gönderimi için sitedeki son siparişin, gerçek bir ürünün ve aktif kuponun bilgileri. */
export async function loadPreviewVars(): Promise<PreviewVars> {
  const [lastOrder] = await db.select({ id: orders.id, tenantId: orders.tenantId }).from(orders).orderBy(desc(orders.createdAt)).limit(1);
  const [firstTenant] = lastOrder ? [] : await db.select({ id: tenants.id }).from(tenants).orderBy(tenants.createdAt).limit(1);
  const tenantId = lastOrder?.tenantId ?? firstTenant?.id ?? null;
  const [tenant, orderData, product, coupon] = await Promise.all([
    getTenantContext(tenantId),
    lastOrder ? buildOrderVars(lastOrder.id).catch(() => null) : Promise.resolve(null),
    db
      .select({ name: products.name, slug: products.slug })
      .from(products)
      .where(and(eq(products.status, "active"), gt(products.stockQty, 0)))
      .orderBy(desc(products.updatedAt))
      .limit(1)
      .then((r) => r[0] ?? null),
    db
      .select({ code: coupons.code })
      .from(coupons)
      .where(tenantId ? and(eq(coupons.isActive, 1), sql`(${coupons.tenantId} = ${tenantId} or ${coupons.tenantId} is null)`) : eq(coupons.isActive, 1))
      .limit(1)
      .then((r) => r[0] ?? null),
  ]);
  const vars: Record<string, string> = {
    site_name: tenant.name,
    site_url: tenant.url,
    cart_url: `${tenant.url}/sepet`,
    order_url: `${tenant.url}/hesabim/siparisler`,
    ...(orderData?.vars ?? {}),
  };
  vars.customer_name ||= "Müşteri";
  if (product) {
    vars.product_name = product.name;
    vars.product_url = `${tenant.url}/urun/${product.slug}`;
  }
  if (coupon) {
    vars.coupon_code = coupon.code;
    vars.coupon_block = `<p>Size özel indirim kodu:</p><div class="coupon">${escapeHtml(coupon.code)}</div>`;
  } else {
    vars.coupon_code = "";
    vars.coupon_block = "";
  }
  return { vars, orderNo: orderData?.order.orderNo ?? null, siteName: tenant.name, siteUrl: tenant.url };
}

export function renderPreview(tpl: Pick<ResolvedTemplate, "subject" | "body" | "smsBody" | "marketing">, data: PreviewVars) {
  return {
    subject: renderText(tpl.subject, data.vars, false),
    html: emailLayout({
      siteName: data.siteName,
      siteUrl: data.siteUrl,
      body: renderText(tpl.body, data.vars, true),
      footer: tpl.marketing ? ' · <a class="muted" href="#">Abonelikten çık</a>' : "",
    }),
    sms: renderText(tpl.smsBody, data.vars, false),
  };
}
