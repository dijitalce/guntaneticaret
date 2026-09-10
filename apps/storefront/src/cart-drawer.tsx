"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";
import { IconCart, IconClose, IconTruck } from "./icons";

export type CartSummaryPayload = {
  qty: number;
  subtotal: number;
  shippingAmount: number;
  freeShippingMin: number;
  remainingForFreeShipping: number;
  freeShippingUnlocked: boolean;
  items: Array<{
    id: string;
    name: string;
    slug: string;
    sku: string;
    qty: number;
    price: string;
    imageUrl: string | null;
  }>;
};

function money(n: number) {
  return `${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
}

export function FreeShippingBar({
  subtotal,
  freeShippingMin,
  remainingForFreeShipping,
  freeShippingUnlocked,
}: {
  subtotal: number;
  freeShippingMin: number;
  remainingForFreeShipping: number;
  freeShippingUnlocked: boolean;
}) {
  const progress = Math.min(100, freeShippingMin > 0 ? (subtotal / freeShippingMin) * 100 : 0);
  return (
    <div className={`free-ship-bar${freeShippingUnlocked ? " is-unlocked" : ""}`}>
      <div className="free-ship-bar-head">
        <IconTruck />
        {freeShippingUnlocked ? (
          <strong>Ücretsiz kargo kazandın</strong>
        ) : (
          <strong>
            Ücretsiz kargoya {money(remainingForFreeShipping)} kaldı
          </strong>
        )}
      </div>
      <div className="free-ship-track" aria-hidden>
        <span style={{ width: `${progress}%` }} />
      </div>
      <p>
        {freeShippingUnlocked
          ? `${money(freeShippingMin)} ve üzeri siparişlerde kargo bedava.`
          : `${money(freeShippingMin)} üzeri alışverişlerde kargo ücretsiz.`}
      </p>
    </div>
  );
}

const emptyCart: CartSummaryPayload = {
  qty: 0,
  subtotal: 0,
  shippingAmount: 0,
  freeShippingMin: 2500,
  remainingForFreeShipping: 2500,
  freeShippingUnlocked: false,
  items: [],
};

export function CartShell({ placeholder }: { placeholder: string }) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cart, setCart] = useState<CartSummaryPayload>(emptyCart);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/cart", { credentials: "same-origin" });
    if (!res.ok) return emptyCart;
    const data = (await res.json()) as CartSummaryPayload;
    setCart(data);
    return data;
  }, []);

  useEffect(() => {
    let cancelled = false;
    refresh().catch(() => {
      if (!cancelled) setCart(emptyCart);
    });

    function onUpdated(e: Event) {
      const detail = (e as CustomEvent<Partial<CartSummaryPayload> & { openDrawer?: boolean }>).detail;
      if (detail && typeof detail.qty === "number" && Array.isArray(detail.items)) {
        setCart({ ...emptyCart, ...detail } as CartSummaryPayload);
      } else {
        refresh().catch(() => {});
      }
      if (detail?.openDrawer !== false) setOpen(true);
    }

    window.addEventListener("cart:updated", onUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener("cart:updated", onUpdated);
    };
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function mutate(action: "update" | "remove", itemId: string, qty?: number) {
    if (busy) return;
    setBusy(true);
    const data = new FormData();
    data.set("ajax", "1");
    data.set("action", action);
    data.set("itemId", itemId);
    if (action === "update") data.set("qty", String(qty ?? 0));
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        body: data,
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      const json = (await res.json()) as CartSummaryPayload & { ok?: boolean };
      if (!res.ok || json.ok === false) throw new Error("cart");
      setCart(json);
      window.dispatchEvent(
        new CustomEvent("cart:updated", { detail: { ...json, openDrawer: false } }),
      );
    } catch {
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  function openDrawer() {
    setOpen(true);
    refresh().catch(() => {});
  }

  return (
    <>
      <button type="button" className="icon-btn cart-chip" onClick={openDrawer} aria-expanded={open}>
        <IconCart />
        <span>Sepet</span>
        {cart.qty > 0 && <em>{cart.qty}</em>}
      </button>

      {open && (
        <div className="cart-drawer-root" role="presentation">
          <button type="button" className="cart-drawer-backdrop" aria-label="Sepeti kapat" onClick={() => setOpen(false)} />
          <aside className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <header className="cart-drawer-head">
              <div>
                <h2 id={titleId}>Sepetin</h2>
                <p>{cart.qty > 0 ? `${cart.qty} ürün` : "Henüz ürün yok"}</p>
              </div>
              <button type="button" className="cart-drawer-close" onClick={() => setOpen(false)} aria-label="Kapat">
                <IconClose />
              </button>
            </header>

            <div className="cart-drawer-ship">
              <FreeShippingBar
                subtotal={cart.subtotal}
                freeShippingMin={cart.freeShippingMin}
                remainingForFreeShipping={cart.remainingForFreeShipping}
                freeShippingUnlocked={cart.freeShippingUnlocked}
              />
            </div>

            <div className="cart-drawer-body">
              {cart.items.length === 0 ? (
                <div className="cart-drawer-empty">
                  <p>Sepetin boş. Aracına uygun parçayı ekleyerek başla.</p>
                  <Link className="btn btn-secondary" href="/" onClick={() => setOpen(false)}>
                    Alışverişe başla
                  </Link>
                </div>
              ) : (
                <ul className="cart-drawer-list">
                  {cart.items.map((item) => {
                    const unit = Number(item.price);
                    const line = unit * item.qty;
                    return (
                      <li key={item.id} className="cart-drawer-item">
                        <Link href={`/urun/${item.slug}`} className="cart-drawer-thumb" onClick={() => setOpen(false)}>
                          <Image src={item.imageUrl || placeholder} alt="" width={72} height={72} />
                        </Link>
                        <div className="cart-drawer-item-main">
                          <Link href={`/urun/${item.slug}`} onClick={() => setOpen(false)}>
                            {item.name}
                          </Link>
                          <span>{item.sku}</span>
                          <div className="cart-drawer-item-actions">
                            <div className="qty-stepper" role="group" aria-label="Adet">
                              <button
                                type="button"
                                disabled={busy}
                                aria-label="Adeti azalt"
                                onClick={() => mutate("update", item.id, item.qty - 1)}
                              >
                                −
                              </button>
                              <span>{item.qty}</span>
                              <button
                                type="button"
                                disabled={busy}
                                aria-label="Adeti artır"
                                onClick={() => mutate("update", item.id, item.qty + 1)}
                              >
                                +
                              </button>
                            </div>
                            <button
                              type="button"
                              className="cart-remove"
                              disabled={busy}
                              onClick={() => mutate("remove", item.id)}
                            >
                              Kaldır
                            </button>
                          </div>
                        </div>
                        <strong>{money(line)}</strong>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {cart.items.length > 0 && (
              <footer className="cart-drawer-foot">
                <dl>
                  <div>
                    <dt>Ara toplam</dt>
                    <dd>{money(cart.subtotal)}</dd>
                  </div>
                  <div>
                    <dt>Kargo</dt>
                    <dd>{cart.shippingAmount <= 0 ? "Ücretsiz" : money(cart.shippingAmount)}</dd>
                  </div>
                  <div className="is-total">
                    <dt>Toplam</dt>
                    <dd>{money(cart.subtotal + cart.shippingAmount)}</dd>
                  </div>
                </dl>
                <Link className="btn btn-primary" href="/odeme" onClick={() => setOpen(false)}>
                  Ödemeye geç
                </Link>
                <Link className="cart-drawer-full" href="/sepet" onClick={() => setOpen(false)}>
                  Sepet sayfasına git
                </Link>
              </footer>
            )}
          </aside>
        </div>
      )}
    </>
  );
}

export function CartBadgeFallback() {
  return (
    <span className="icon-btn cart-chip" aria-busy="true">
      <IconCart />
      <span>Sepet</span>
    </span>
  );
}
