"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export type ProductTab = { id: string; label: string; count?: number; content: ReactNode };

export function ProductTabs({ tabs }: { tabs: ProductTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const listRef = useRef<HTMLDivElement>(null);
  const idKey = tabs.map((t) => t.id).join(",");

  useEffect(() => {
    const ids = new Set(idKey.split(","));
    const open = (id: string) => {
      setActive(id);
      requestAnimationFrame(() => listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    };
    const initial = decodeURIComponent(window.location.hash.slice(1));
    if (ids.has(initial)) open(initial);
    // Panel gizliyken tarayıcı çapaya kaydıramaz; sayfadaki #sekme bağlantıları önce sekmeyi açar.
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href^='#']");
      const id = a?.getAttribute("href")?.slice(1);
      if (!id || !ids.has(id)) return;
      e.preventDefault();
      history.replaceState(null, "", `#${id}`);
      open(id);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [idKey]);

  useEffect(() => {
    const list = listRef.current;
    const btn = document.getElementById(`tab-${active}`);
    if (!list || !btn) return;
    const l = list.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    if (b.left < l.left || b.right > l.right) list.scrollBy({ left: b.left - l.left - 12, behavior: "smooth" });
  }, [active]);

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = tabs[(i + step + tabs.length) % tabs.length]!;
    setActive(next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
  };

  return (
    <section className="pdp-tabs">
      <div className="pdp-tablist" role="tablist" aria-label="Ürün detayları" ref={listRef}>
        {tabs.map((t, i) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={active === t.id}
            aria-controls={t.id}
            tabIndex={active === t.id ? 0 : -1}
            onClick={() => setActive(t.id)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {t.label}
            {t.count ? <span className="pdp-tab-count">{t.count}</span> : null}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} id={t.id} className="pdp-tabpanel" role="tabpanel" aria-labelledby={`tab-${t.id}`} hidden={active !== t.id}>
          {t.content}
        </div>
      ))}
    </section>
  );
}
