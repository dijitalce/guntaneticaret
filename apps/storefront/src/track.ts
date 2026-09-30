"use client";

export type TrackItem = { id: string; name: string; price: number; qty: number; brand?: string | null };

type CommerceEvent = "view_item" | "add_to_cart" | "begin_checkout" | "purchase";

type AnyFn = (...args: unknown[]) => void;
type TrackWindow = Window & {
  gtag?: AnyFn;
  fbq?: AnyFn;
  ttq?: { track: AnyFn };
  dataLayer?: unknown[];
  __gtAdsSendTo?: string;
};

const META_EVENT: Record<CommerceEvent, string> = {
  view_item: "ViewContent",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  purchase: "Purchase",
};
const TIKTOK_EVENT: Record<CommerceEvent, string> = {
  view_item: "ViewContent",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  purchase: "CompletePayment",
};
const BEACON_TYPE: Record<CommerceEvent, string> = {
  view_item: "product",
  add_to_cart: "add_to_cart",
  begin_checkout: "checkout",
  purchase: "purchase",
};

export function beacon(payload: Record<string, unknown>) {
  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } });
  } catch {
    /* takip hatası sayfayı etkilemez */
  }
}

/** GA4, GTM dataLayer, Meta Pixel, TikTok Pixel ve kendi ziyaret kaydımıza aynı olayı gönderir. */
export function trackCommerce(event: CommerceEvent, data: { items: TrackItem[]; value?: number; orderNo?: string; shipping?: number }) {
  const w = window as TrackWindow;
  const value = data.value ?? data.items.reduce((a, i) => a + i.price * i.qty, 0);
  const gaItems = data.items.map((i) => ({ item_id: i.id, item_name: i.name, price: i.price, quantity: i.qty, item_brand: i.brand ?? undefined }));
  const params = {
    currency: "TRY",
    value,
    items: gaItems,
    ...(data.orderNo ? { transaction_id: data.orderNo } : {}),
    ...(data.shipping != null ? { shipping: data.shipping } : {}),
  };
  try {
    w.gtag?.("event", event, params);
    if (event === "purchase" && w.__gtAdsSendTo) {
      w.gtag?.("event", "conversion", { send_to: w.__gtAdsSendTo, value, currency: "TRY", transaction_id: data.orderNo });
    }
    if (Array.isArray(w.dataLayer)) {
      w.dataLayer.push({ ecommerce: null });
      w.dataLayer.push({ event, ecommerce: params });
    }
    const metaData = {
      content_ids: data.items.map((i) => i.id),
      contents: data.items.map((i) => ({ id: i.id, quantity: i.qty, item_price: i.price })),
      content_type: "product",
      value,
      currency: "TRY",
      ...(data.items.length === 1 ? { content_name: data.items[0]!.name } : {}),
    };
    w.fbq?.("track", META_EVENT[event], metaData, data.orderNo ? { eventID: data.orderNo } : undefined);
    w.ttq?.track(TIKTOK_EVENT[event], {
      contents: data.items.map((i) => ({ content_id: i.id, content_name: i.name, quantity: i.qty, price: i.price })),
      content_type: "product",
      value,
      currency: "TRY",
    });
  } catch {
    /* üçüncü taraf betik hatası sayfayı etkilemez */
  }
  beacon({
    t: BEACON_TYPE[event],
    p: location.pathname,
    title: data.items.length === 1 ? data.items[0]!.name : document.title,
    meta: { value, items: data.items.length, orderNo: data.orderNo },
  });
}
