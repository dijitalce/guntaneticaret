"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { beacon } from "./track";

export type PopupConfig = {
  id: string;
  kind: "newsletter" | "announcement" | "coupon";
  title: string;
  body: string | null;
  image_url: string | null;
  cta_text: string | null;
  cta_url: string | null;
  coupon_code: string | null;
  trigger_type: "delay" | "exit" | "scroll";
  delay_sec: number;
  scroll_pct: number;
  pages: "all" | "home" | "product" | "category";
  device: "all" | "mobile" | "desktop";
  frequency_days: number;
};

function pageMatches(pages: PopupConfig["pages"], path: string) {
  if (pages === "home") return path === "/";
  if (pages === "product") return path.startsWith("/urun/");
  if (pages === "category") return path.startsWith("/kategori/");
  return !path.startsWith("/odeme") && !path.startsWith("/sepet") && !path.startsWith("/hesabim");
}

export function MarketingPopup({ popup }: { popup: PopupConfig }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const storageKey = `gt_popup_${popup.id}`;

  useEffect(() => {
    if (!pageMatches(popup.pages, path)) return;
    const mobile = window.matchMedia("(max-width: 760px)").matches;
    if ((popup.device === "mobile" && !mobile) || (popup.device === "desktop" && mobile)) return;
    const last = Number(localStorage.getItem(storageKey) ?? "0");
    if (last && Date.now() - last < Math.max(0, popup.frequency_days) * 86_400_000) return;
    const show = () => {
      setOpen(true);
      localStorage.setItem(storageKey, String(Date.now()));
      beacon({ t: "popup_view", p: location.pathname, meta: { popupId: popup.id } });
    };
    if (popup.trigger_type === "exit" && !mobile) {
      const onLeave = (e: MouseEvent) => {
        if (e.clientY <= 0) {
          show();
          document.removeEventListener("mouseout", onLeave);
        }
      };
      document.addEventListener("mouseout", onLeave);
      return () => document.removeEventListener("mouseout", onLeave);
    }
    if (popup.trigger_type === "scroll") {
      const onScroll = () => {
        const pct = ((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight) * 100;
        if (pct >= popup.scroll_pct) {
          show();
          window.removeEventListener("scroll", onScroll);
        }
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }
    const t = window.setTimeout(show, Math.max(0, popup.delay_sec) * 1000);
    return () => window.clearTimeout(t);
  }, [path, popup, storageKey]);

  async function subscribe(e: FormEvent) {
    e.preventDefault();
    setState("sending");
    try {
      const res = await fetch("/api/marketing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, popupId: popup.id }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (!open) return null;
  return (
    <div className="mk-popup-backdrop" role="dialog" aria-modal="true" aria-label={popup.title} onClick={() => setOpen(false)}>
      <div className="mk-popup" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="mk-popup-close" aria-label="Kapat" onClick={() => setOpen(false)}>
          ×
        </button>
        {popup.image_url ? <img className="mk-popup-img" src={popup.image_url} alt="" /> : null}
        <div className="mk-popup-body">
          <h2>{popup.title}</h2>
          {popup.body ? <p>{popup.body}</p> : null}
          {popup.kind === "newsletter" ? (
            state === "done" ? (
              <div className="mk-popup-done">
                <strong>Teşekkürler!</strong>
                {popup.coupon_code ? (
                  <>
                    <span>İndirim kodunuz:</span>
                    <code className="mk-popup-code">{popup.coupon_code}</code>
                  </>
                ) : (
                  <span>Kampanyalardan ilk siz haberdar olacaksınız.</span>
                )}
              </div>
            ) : (
              <form className="mk-popup-form" onSubmit={subscribe}>
                <input
                  type="email"
                  required
                  placeholder="E-posta adresiniz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-label="E-posta adresiniz"
                />
                <button type="submit" disabled={state === "sending"}>
                  {popup.cta_text || "Abone ol"}
                </button>
                {state === "error" ? <small className="mk-popup-err">Kayıt yapılamadı, tekrar deneyin.</small> : null}
                <small className="mk-popup-legal">Kampanya e-postaları almayı kabul ediyorum. İstediğiniz zaman abonelikten çıkabilirsiniz.</small>
              </form>
            )
          ) : null}
          {popup.kind === "coupon" && popup.coupon_code ? <code className="mk-popup-code">{popup.coupon_code}</code> : null}
          {popup.kind !== "newsletter" && popup.cta_url ? (
            <a
              className="mk-popup-cta"
              href={popup.cta_url}
              onClick={() => beacon({ t: "popup_click", p: location.pathname, meta: { popupId: popup.id } })}
            >
              {popup.cta_text || "İncele"}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
