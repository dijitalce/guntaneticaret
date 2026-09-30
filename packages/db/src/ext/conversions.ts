import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../client";
import { orderItems, orders, tenantSettings } from "../schema";
import { getIntegrationSecrets } from "./settings";
import { getOrderAttribution } from "./tracking";
import { addOrderEventSafe } from "./orders";
import { getTenantContext } from "./messaging";

function sha(value: string | null | undefined): string | undefined {
  const v = (value ?? "").trim().toLowerCase();
  return v ? createHash("sha256").update(v).digest("hex") : undefined;
}

function phoneE164(phone: string | null | undefined): string | undefined {
  let d = (phone ?? "").replace(/\D/g, "");
  if (!d) return undefined;
  if (d.startsWith("0")) d = d.slice(1);
  if (!d.startsWith("90")) d = `90${d}`;
  return d;
}

export type PublicIntegrations = {
  metaPixelId?: string;
  tiktokPixelId?: string;
  googleAdsId?: string;
  googleAdsLabel?: string;
  merchantFeed?: string;
  metaFeed?: string;
};

export async function tenantIntegrations(tenantId: string) {
  const [s] = await db.select().from(tenantSettings).where(eq(tenantSettings.tenantId, tenantId)).limit(1);
  const social = (s?.socialJson ?? {}) as Record<string, string>;
  const secrets = await getIntegrationSecrets(tenantId);
  return { gaId: s?.gaId ?? "", social, secrets };
}

/** Satın alma olayını Meta Conversions API ve GA4 Measurement Protocol'e sunucudan gönderir. */
export async function sendServerPurchase(orderId: string) {
  try {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) return;
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    const { gaId, social, secrets } = await tenantIntegrations(order.tenantId);
    const attribution = await getOrderAttribution(orderId).catch(() => null);
    const tenant = await getTenantContext(order.tenantId);
    const address = (order.shippingAddress ?? {}) as Record<string, string>;
    const [firstName, ...rest] = order.fullName.trim().split(/\s+/);
    const value = Number(order.grandTotal);
    const results: string[] = [];

    if (social.metaPixelId && secrets.metaCapiToken) {
      const payload = {
        data: [
          {
            event_name: "Purchase",
            event_time: Math.floor(new Date(order.createdAt).getTime() / 1000),
            event_id: order.orderNo,
            action_source: "website",
            event_source_url: `${tenant.url}/odeme/basarili`,
            user_data: {
              em: sha(order.email) ? [sha(order.email)] : undefined,
              ph: sha(phoneE164(order.phone)) ? [sha(phoneE164(order.phone))] : undefined,
              fn: sha(firstName) ? [sha(firstName)] : undefined,
              ln: sha(rest.join(" ")) ? [sha(rest.join(" "))] : undefined,
              ct: sha(address.city?.replace(/\s/g, "")) ? [sha(address.city?.replace(/\s/g, ""))] : undefined,
              country: [sha("tr")],
              external_id: order.customerId ? [sha(order.customerId)] : undefined,
              client_ip_address: attribution?.ip ?? undefined,
              client_user_agent: attribution?.ua ?? undefined,
              fbp: attribution?.fbp ?? undefined,
              fbc: attribution?.fbc ?? undefined,
            },
            custom_data: {
              currency: "TRY",
              value,
              order_id: order.orderNo,
              content_type: "product",
              content_ids: items.map((i) => i.productId),
              contents: items.map((i) => ({ id: i.productId, quantity: i.qty, item_price: Number(i.unitPrice) })),
              num_items: items.reduce((a, i) => a + i.qty, 0),
            },
          },
        ],
        ...(secrets.metaTestCode ? { test_event_code: secrets.metaTestCode } : {}),
      };
      try {
        const res = await fetch(
          `https://graph.facebook.com/v21.0/${encodeURIComponent(social.metaPixelId)}/events?access_token=${encodeURIComponent(secrets.metaCapiToken)}`,
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(10_000) },
        );
        results.push(res.ok ? "Meta Conversions API: Purchase gönderildi" : `Meta CAPI hata ${res.status}: ${(await res.text()).slice(0, 160)}`);
      } catch (err) {
        results.push(`Meta CAPI hata: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (gaId && secrets.ga4ApiSecret) {
      const clientId = attribution?.ga_cid || `${Math.floor(Math.random() * 1e10)}.${Math.floor(Date.now() / 1000)}`;
      const payload = {
        client_id: clientId,
        ...(order.customerId ? { user_id: order.customerId } : {}),
        events: [
          {
            name: "purchase",
            params: {
              transaction_id: order.orderNo,
              currency: "TRY",
              value,
              shipping: Number(order.shippingTotal),
              ...(order.couponCode ? { coupon: order.couponCode } : {}),
              items: items.map((i) => ({ item_id: i.sku || i.productId, item_name: i.name, price: Number(i.unitPrice), quantity: i.qty })),
            },
          },
        ],
      };
      try {
        const res = await fetch(
          `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(gaId)}&api_secret=${encodeURIComponent(secrets.ga4ApiSecret)}`,
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(10_000) },
        );
        results.push(res.ok || res.status === 204 ? "GA4 Measurement Protocol: purchase gönderildi" : `GA4 MP hata ${res.status}`);
      } catch (err) {
        results.push(`GA4 MP hata: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (results.length) {
      await addOrderEventSafe({ orderId, kind: "conversion", title: "Sunucu taraflı dönüşüm", body: results.join(" · ") });
    }
  } catch {
    /* dönüşüm bildirimi siparişi etkilemez */
  }
}

export function sendServerPurchaseInBackground(orderId: string) {
  void sendServerPurchase(orderId);
}
