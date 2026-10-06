"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { IconClose, IconSearch } from "./icons";
import { ManufacturerLogo } from "./manufacturer-logo";

type Hit = {
  id: string;
  title: string;
  slug: string;
  manufacturer?: string | null;
  manufacturerLogo?: string | null;
  price?: string | number | null;
  thumbnail?: string | null;
};

type QuickLink = { name: string; slug: string };

function formatPrice(value: Hit["price"]) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
}

export function SearchBox({ quickLinks = [] }: { quickLinks?: QuickLink[] }) {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const term = q.trim();

  useEffect(() => {
    setActive(-1);
    if (term.length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((data) => {
          setHits(data.hits ?? []);
          setLoading(false);
        })
        .catch((e) => {
          if (e?.name === "AbortError") return;
          setHits([]);
          setLoading(false);
        });
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [term]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      input.current?.blur();
      return;
    }
    if (!open || hits.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % hits.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? hits.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      setOpen(false);
      router.push(`/urun/${hits[active]!.slug}`);
    }
  }

  const showQuick = open && term.length < 2 && quickLinks.length > 0;
  const showHits = open && term.length >= 2;

  return (
    <form
      ref={box}
      className={`search-form${open && (showQuick || showHits) ? " is-open" : ""}`}
      action="/arama"
      method="get"
      role="search"
      autoComplete="off"
      onSubmit={() => setOpen(false)}
    >
      <span className="search-lead" aria-hidden="true"><IconSearch /></span>
      <label className="sr-only" htmlFor="q">Yedek parça ara</label>
      <input
        ref={input}
        id="q"
        name="q"
        type="search"
        enterKeyHint="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Yedek parça ara… (ör. fren balatası)"
        role="combobox"
        aria-expanded={showHits || showQuick}
        aria-controls={listId}
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
      />
      {q ? (
        <button
          type="button"
          className="search-clear"
          aria-label="Aramayı temizle"
          onClick={() => {
            setQ("");
            input.current?.focus();
          }}
        >
          <IconClose />
        </button>
      ) : null}
      <button type="submit" className="search-submit">
        <IconSearch />
        <span>Ara</span>
      </button>

      {showQuick ? (
        <div className="search-panel" id={listId}>
          <p className="search-panel-title">Popüler kategoriler</p>
          <div className="search-chips">
            {quickLinks.map((c) => (
              <Link key={c.slug} href={`/kategori/${c.slug}`} onClick={() => setOpen(false)}>
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {showHits ? (
        <div className="search-panel">
          {loading && hits.length === 0 ? (
            <p className="search-panel-empty">Aranıyor…</p>
          ) : hits.length === 0 ? (
            <p className="search-panel-empty">“{term}” için eşleşen parça bulunamadı. Farklı bir kelime deneyin.</p>
          ) : (
            <ul className="search-hits" role="listbox" id={listId}>
              {hits.map((h, i) => {
                const price = formatPrice(h.price);
                return (
                  <li key={h.id} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
                    <Link
                      href={`/urun/${h.slug}`}
                      className={i === active ? "is-active" : undefined}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => setOpen(false)}
                    >
                      <span className="search-hit-thumb">
                        {h.thumbnail ? <img src={h.thumbnail} alt="" loading="lazy" /> : <IconSearch />}
                      </span>
                      <span className="search-hit-body">
                        <span className="search-hit-title">{h.title}</span>
                        {h.manufacturer ? (
                          <ManufacturerLogo name={h.manufacturer} src={h.manufacturerLogo} className="search-suggest-mfr" height={14} />
                        ) : null}
                      </span>
                      {price ? <strong className="search-hit-price">{price}</strong> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <button type="submit" className="search-all">
            “{term}” için tüm sonuçları gör
          </button>
        </div>
      ) : null}
    </form>
  );
}
