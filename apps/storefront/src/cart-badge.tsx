"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconCart } from "./icons";

export function CartBadge() {
  const [qty, setQty] = useState(0);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/cart", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : { qty: 0 }))
      .then((data: { qty?: number }) => {
        if (!cancelled) setQty(Number(data.qty ?? 0));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
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
