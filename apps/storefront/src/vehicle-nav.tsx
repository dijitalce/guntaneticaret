"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BrandMark } from "./brand-mark";
import { foldTr } from "./format";

export type VehicleNavItem = {
  name: string;
  href: string;
  slug: string;
  logoUrl?: string | null;
};

export function VehicleNav({
  title,
  items,
  activeSlug,
  searchable = false,
}: {
  title: string;
  items: VehicleNavItem[];
  activeSlug?: string;
  searchable?: boolean;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = foldTr(q.trim());
    if (!needle) return items;
    return items.filter((item) => foldTr(item.name).includes(needle) || foldTr(item.slug).includes(needle));
  }, [items, q]);

  const searchPlaceholder = title.toLocaleLowerCase("tr-TR").startsWith("model")
    ? "Model ara"
    : "Marka ara";

  return (
    <nav className="vehicle-nav" aria-label={title}>
      <div className="vehicle-nav-head">{title}</div>
      {searchable && (
        <div className="vehicle-nav-search">
          <label className="sr-only" htmlFor={`nav-search-${title}`}>{searchPlaceholder}</label>
          <input
            id={`nav-search-${title}`}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={searchPlaceholder}
            autoComplete="off"
          />
        </div>
      )}
      <ul className="vehicle-nav-list">
        {filtered.map((item) => (
          <li key={item.slug} className={item.slug === activeSlug ? "is-active" : undefined}>
            <Link href={item.href}>
              <BrandMark name={item.name} logoUrl={item.logoUrl} size={38} />
              <span className="vehicle-nav-label">{item.name}</span>
              <span className="vehicle-nav-chevron" aria-hidden>›</span>
            </Link>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="vehicle-nav-empty">Eşleşen kayıt yok</li>
        )}
      </ul>
    </nav>
  );
}
