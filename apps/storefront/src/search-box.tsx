"use client";

import { useEffect, useRef, useState } from "react";
import { IconSearch } from "./icons";

type Hit = { id: string; title: string; slug: string; sku?: string; manufacturer?: string | null; price?: string };

export function SearchBox({ brands }: { brands: { slug: string; name: string }[] }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q.trim())}`)
        .then((r) => r.json())
        .then((data) => {
          setHits(data.hits ?? []);
          setOpen(true);
        })
        .catch(() => setHits([]));
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <form ref={box} className="search-form" action="/arama" method="get" role="search" autoComplete="off">
      <label className="sr-only" htmlFor="brand">Marka</label>
      <select id="brand" name="brand" defaultValue="">
        <option value="">Tüm markalar</option>
        {brands.map((b) => (
          <option key={b.slug} value={b.slug}>{b.name}</option>
        ))}
      </select>
      <label className="sr-only" htmlFor="q">Ürün ara</label>
      <input
        id="q"
        name="q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => q.trim().length >= 2 && setOpen(true)}
        placeholder="Parça, OEM veya SKU"
      />
      <button type="submit" aria-label="Ara"><IconSearch /></button>
      {open && q.trim().length >= 2 && (
        <ul className="search-suggest" role="listbox">
          {hits.map((h) => (
            <li key={h.id}>
              <a href={`/urun/${h.slug}`} onClick={() => setOpen(false)}>
                <span>{h.title}</span>
                <small>{[h.manufacturer, h.sku].filter(Boolean).join(" · ")}</small>
              </a>
            </li>
          ))}
          {hits.length === 0 && (
            <li className="search-suggest-empty">Eşleşen ürün yok — tüm sonuçlara bak</li>
          )}
          <li className="search-suggest-all">
            <button type="submit">Tüm sonuçları gör</button>
          </li>
        </ul>
      )}
    </form>
  );
}
