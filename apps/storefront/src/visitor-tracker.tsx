"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useConsent } from "./cookie-consent";
import { beacon, trackCommerce, type TrackItem } from "./track";

const HEARTBEAT_MS = 30_000;

/** Sayfa görüntüleme ve aktiflik sinyali; canlı takip ve sipariş kaynağı bu kayıttan beslenir. */
export function VisitorTracker() {
  const pathname = usePathname();
  const first = useRef(true);
  const allowed = useConsent()?.analytics === true;

  useEffect(() => {
    if (!allowed) return;
    beacon({
      t: "pv",
      p: pathname,
      q: first.current ? location.search : "",
      r: first.current ? document.referrer : "",
      title: document.title,
    });
    first.current = false;
  }, [pathname, allowed]);

  useEffect(() => {
    if (!allowed) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") beacon({ t: "hb", p: location.pathname });
    }, HEARTBEAT_MS);
    return () => window.clearInterval(id);
  }, [allowed]);

  return null;
}

/** Sayfa açıldığında bir kez e-ticaret olayı gönderir (ürün görüntüleme, ödeme başlangıcı, satın alma). */
export function CommerceEvent({
  event,
  items,
  value,
  orderNo,
  shipping,
}: {
  event: "view_item" | "begin_checkout" | "purchase";
  items: TrackItem[];
  value?: number;
  orderNo?: string;
  shipping?: number;
}) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    if (orderNo) {
      const key = `gt_purchase_${orderNo}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    }
    sent.current = true;
    const t = window.setTimeout(() => trackCommerce(event, { items, value, orderNo, shipping }), 600);
    return () => window.clearTimeout(t);
  }, [event, items, value, orderNo, shipping]);
  return null;
}
