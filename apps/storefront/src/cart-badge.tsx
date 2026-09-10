"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconCart } from "./icons";

async function fetchQty(): Promise<number> {
  const r = await fetch("/api/cart", { credentials: "same-origin" });
  if (!r.ok) return 0;
  const data = (await r.json()) as { qty?: number };
  return Number(data.qty ?? 0);
}

export function CartBadge() {
  const [qty, setQty] = useState(0);
  useEffect(() => {
    let cancelled = false;
    fetchQty()
      .then((n) => {
        if (!cancelled) setQty(n);
      })
      .catch(() => {});

    function onUpdated(e: Event) {
      const detail = (e as CustomEvent<{ qty?: number }>).detail;
      if (typeof detail?.qty === "number") {
        setQty(detail.qty);
        return;
      }
      fetchQty()
        .then((n) => {
          if (!cancelled) setQty(n);
        })
        .catch(() => {});
    }
    window.addEventListener("cart:updated", onUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener("cart:updated", onUpdated);
    };
  }, []);
  return (
    <Link className="icon-btn cart-chip" href="/sepet">
      <IconCart />
      <span>Sepet</span>
      {qty > 0 && <em>{qty}</em>}
    </Link>
  );
}

export function CartBadgeFallback() {
  return (
    <Link className="icon-btn cart-chip" href="/sepet" aria-busy="true">
      <IconCart />
      <span>Sepet</span>
    </Link>
  );
}
