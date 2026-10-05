"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { IconSearch } from "./icons";
import { withBase } from "./paths";

type Hit = { group: string; title: string; sub: string; href: string };
export type SearchPage = { href: string; label: string; group: string };

const fold = (s: string) =>
  s
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c");

export function GlobalSearch({ pages, inputRef }: { pages: SearchPage[]; inputRef: RefObject<HTMLInputElement | null> }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const boxRef = useRef<HTMLFormElement>(null);

  const pageHits = useMemo<Hit[]>(() => {
    const term = fold(q.trim());
    if (term.length < 2) return [];
    return pages
      .filter((p) => fold(`${p.label} ${p.group}`).includes(term))
      .slice(0, 5)
      .map((p) => ({ group: "Sayfalar", title: p.label, sub: p.group, href: p.href }));
  }, [q, pages]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(withBase(`/api/search?q=${encodeURIComponent(term)}`), { signal: ctrl.signal });
        const data = (await res.json()) as { hits?: Hit[] };
        setHits(data.hits ?? []);
      } catch {
        if (!ctrl.signal.aborted) setHits([]);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const all = [...pageHits, ...hits];
  const go = (href: string) => {
    setOpen(false);
    setQ("");
    inputRef.current?.blur();
    router.push(href);
  };
  const fallback = () => {
    const term = q.trim();
    if (!term) return;
    const looksLikeOrder = /^gnt-/i.test(term) || term.includes("@");
    go(`${looksLikeOrder ? "/orders" : "/catalog/products"}?q=${encodeURIComponent(term)}`);
  };

  let lastGroup = "";
  return (
    <form
      ref={boxRef}
      className="admin-search"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const hit = all[cursor];
        if (open && hit) go(hit.href);
        else fallback();
      }}
    >
      <IconSearch />
      <input
        ref={inputRef}
        name="q"
        type="search"
        value={q}
        placeholder="Sipariş, müşteri, ürün veya sayfa ara…"
        aria-label="Ara"
        aria-expanded={open && q.trim().length >= 2}
        aria-controls="global-search-results"
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setCursor(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setCursor((c) => Math.min(all.length - 1, c + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setCursor((c) => Math.max(0, c - 1));
          } else if (e.key === "Escape") {
            setOpen(false);
            e.currentTarget.blur();
          }
        }}
      />
      <kbd>⌘K</kbd>
      {open && q.trim().length >= 2 ? (
        <div className="gsearch" id="global-search-results" role="listbox">
          {all.length === 0 ? (
            <div className="gsearch-empty">{loading ? "Aranıyor…" : `“${q.trim()}” için sonuç yok. Enter ile ürünlerde arayın.`}</div>
          ) : (
            all.map((h, i) => {
              const header = h.group !== lastGroup ? h.group : null;
              lastGroup = h.group;
              return (
                <div key={`${h.group}-${h.href}-${i}`}>
                  {header ? <div className="gsearch-group">{header}</div> : null}
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === cursor}
                    className={`gsearch-item${i === cursor ? " is-active" : ""}`}
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => go(h.href)}
                  >
                    <strong>{h.title}</strong>
                    <span>{h.sub}</span>
                  </button>
                </div>
              );
            })
          )}
          {loading && all.length > 0 ? <div className="gsearch-empty">Aranıyor…</div> : null}
          <div className="gsearch-foot">
            <span>↑↓ gez · Enter aç · Esc kapat</span>
          </div>
        </div>
      ) : null}
    </form>
  );
}
