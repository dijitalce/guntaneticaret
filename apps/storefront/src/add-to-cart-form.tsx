"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { trackCommerce, type TrackItem } from "./track";

export function AddToCartForm({
  slug,
  className,
  children,
  track,
}: {
  slug: string;
  className?: string;
  children: ReactNode;
  track?: TrackItem;
}) {
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setDone(false);
    const form = e.currentTarget;
    const data = new FormData(form);
    data.set("ajax", "1");
    data.set("returnTo", `${window.location.pathname}${window.location.search}`);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        body: data,
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      const json = (await res.json().catch(() => null)) as
        | ({ ok?: boolean; error?: string } & Record<string, unknown>)
        | null;
      if (!res.ok || !json || json.ok === false) throw new Error(String(json?.error ?? "sepet"));
      window.dispatchEvent(new CustomEvent("cart:updated", { detail: { ...json, openDrawer: true } }));
      if (track) {
        const qty = Math.max(1, Number(data.get("qty") ?? 1) || 1);
        trackCommerce("add_to_cart", { items: [{ ...track, qty }] });
      }
      setDone(true);
      window.setTimeout(() => setDone(false), 1800);
    } catch {
      window.location.assign(`/urun/${encodeURIComponent(slug)}?sepet=hata`);
      return;
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={className} action="/api/cart" method="post" onSubmit={onSubmit} data-pending={pending || undefined}>
      <input type="hidden" name="slug" value={slug} />
      <fieldset className="add-to-cart-fields" disabled={pending}>
        {children}
      </fieldset>
      {done && (
        <span className="add-to-cart-feedback" role="status">
          Sepete eklendi
        </span>
      )}
    </form>
  );
}
