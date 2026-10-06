"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { trackCommerce, type TrackItem } from "./track";

export function AddToCartForm({
  id,
  slug,
  className,
  children,
  track,
}: {
  id?: string;
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
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const buyNow = submitter?.name === "intent" && submitter.value === "buy";
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
      if (track) {
        const qty = Math.max(1, Number(data.get("qty") ?? 1) || 1);
        trackCommerce("add_to_cart", { items: [{ ...track, qty }] });
      }
      if (buyNow) {
        window.location.assign("/odeme");
        return;
      }
      window.dispatchEvent(new CustomEvent("cart:updated", { detail: { ...json, openDrawer: true } }));
      setDone(true);
      window.setTimeout(() => setDone(false), 1800);
    } catch (err) {
      const flag = err instanceof Error && err.message === "sales_closed" ? "kapali" : "hata";
      window.location.assign(`/urun/${encodeURIComponent(slug)}?sepet=${flag}`);
      return;
    } finally {
      setPending(false);
    }
  }

  return (
    <form id={id} className={className} action="/api/cart" method="post" onSubmit={onSubmit} data-pending={pending || undefined}>
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
