"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { BrandMark } from "./brand-mark";
import { IconClose, IconMenu, IconParts } from "./icons";

export type NavModel = { key: string; name: string; slug: string; imageUrl: string | null; years: string | null };
export type NavBrand = { id: string; name: string; slug: string; logoUrl: string | null; models: NavModel[] };
export type NavCategory = { id: string; name: string; slug: string };

const MORE = "__more";
const CATS = "__cats";
const OPEN_DELAY = 90;
const CLOSE_DELAY = 180;
const MOBILE_QUERY = "(max-width: 900px)";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function CarSilhouette() {
  return (
    <svg className="mega-car" viewBox="0 0 120 48" aria-hidden>
      <path d="M6 33C6 29 8 27 12 26L28 23L40 14C43 12 46 11 50 11H76C80 11 83 12 86 15L95 23L106 25C111 26 114 29 114 33V36C114 37.5 113 38 111.5 38H104A10 10 0 0 0 84 38H38A10 10 0 0 0 18 38H8.5C7 38 6 37 6 35.5Z" />
      <path className="mega-car-glass" d="M43 22L50 15.5C51.5 14.5 53 14 55 14H64V22Z" />
      <path className="mega-car-glass" d="M68 14H76C78.5 14 80.5 15 82 16.5L88 22H68Z" />
      <circle cx="28" cy="38" r="7" />
      <circle cx="94" cy="38" r="7" />
      <circle className="mega-car-hub" cx="28" cy="38" r="3" />
      <circle className="mega-car-hub" cx="94" cy="38" r="3" />
    </svg>
  );
}

export function MegaNav({
  brands,
  categories,
  allPartsHref,
}: {
  brands: NavBrand[];
  categories: NavCategory[];
  allPartsHref: string | null;
}) {
  const pathname = usePathname();
  const [active, setActive] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(brands.length);
  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLUListElement>(null);
  const moreRef = useRef<HTMLLIElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerType = useRef<string>("mouse");

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const close = useCallback(() => {
    clearTimer();
    setActive(null);
  }, []);

  const measure = useCallback(() => {
    const bar = barRef.current;
    if (!bar) return;
    if (window.matchMedia(MOBILE_QUERY).matches) {
      setVisibleCount(brands.length);
      return;
    }
    const gap = parseFloat(getComputedStyle(bar).columnGap) || 0;
    const available = bar.clientWidth;
    const widths = itemRefs.current.map((el) => el?.offsetWidth ?? 0);
    const total = widths.reduce((sum, w) => sum + w + gap, 0);
    if (total <= available) {
      setVisibleCount(brands.length);
      return;
    }
    const reserve = (moreRef.current?.offsetWidth ?? 56) + gap;
    let used = 0;
    let count = 0;
    for (const w of widths) {
      if (used + w + gap + reserve > available) break;
      used += w + gap;
      count++;
    }
    setVisibleCount(Math.max(1, count));
  }, [brands.length]);

  useIsoLayoutEffect(() => {
    measure();
    const bar = barRef.current;
    if (!bar || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(bar);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [measure]);

  useEffect(() => {
    close();
  }, [pathname, close]);

  useEffect(() => {
    if (!active) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [active, close]);

  useEffect(() => () => clearTimer(), []);

  useEffect(() => {
    if (!active || !window.matchMedia(MOBILE_QUERY).matches) return;
    barRef.current?.querySelector<HTMLElement>("a.is-active")?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [active]);

  const openSoon = (key: string) => {
    if (pointerType.current !== "mouse") return;
    clearTimer();
    if (active) {
      setActive(key);
      return;
    }
    timer.current = setTimeout(() => setActive(key), OPEN_DELAY);
  };

  const closeSoon = () => {
    if (pointerType.current !== "mouse") return;
    clearTimer();
    timer.current = setTimeout(() => setActive(null), CLOSE_DELAY);
  };

  const onTriggerClick = (key: string, navigates: boolean) => (e: MouseEvent) => {
    if (navigates && pointerType.current === "mouse") {
      close();
      return;
    }
    if (navigates && active === key) return;
    e.preventDefault();
    clearTimer();
    if (pointerType.current === "mouse") setActive(key);
    else setActive((cur) => (cur === key ? null : key));
  };

  const onTriggerKey = (key: string) => (e: KeyboardEvent) => {
    if (e.key !== "ArrowDown") return;
    e.preventDefault();
    setActive(key);
    requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>("a, button")?.focus());
  };

  const overflow = brands.slice(visibleCount);
  const activeBrand = brands.find((b) => b.slug === active) ?? null;
  const activeInOverflow = activeBrand ? overflow.some((b) => b.id === activeBrand.id) : false;

  return (
    <div
      ref={rootRef}
      className={`mega-nav${active ? " is-open" : ""}`}
      onPointerDown={(e) => { pointerType.current = e.pointerType; }}
      onPointerOver={(e) => { pointerType.current = e.pointerType; }}
      onPointerEnter={clearTimer}
      onPointerLeave={closeSoon}
    >
      <div className="container mega-nav-bar">
        <button
          type="button"
          className={`mega-cats-btn${active === CATS ? " is-active" : ""}`}
          aria-expanded={active === CATS}
          aria-haspopup="true"
          onPointerEnter={() => openSoon(CATS)}
          onClick={onTriggerClick(CATS, false)}
          onKeyDown={onTriggerKey(CATS)}
        >
          <IconMenu /> Kategoriler
        </button>
        <ul ref={barRef} className="mega-brands" aria-label="Markalar" lang="en">
          {brands.map((b, i) => (
            <li
              key={b.id}
              ref={(el) => { itemRefs.current[i] = el; }}
              className={i >= visibleCount ? "is-overflow" : undefined}
              aria-hidden={i >= visibleCount || undefined}
            >
              <Link
                href={`/${b.slug}`}
                className={active === b.slug ? "is-active" : undefined}
                aria-expanded={active === b.slug}
                aria-haspopup="true"
                tabIndex={i >= visibleCount ? -1 : undefined}
                onPointerEnter={() => openSoon(b.slug)}
                onClick={onTriggerClick(b.slug, true)}
                onKeyDown={onTriggerKey(b.slug)}
              >
                {b.name}
              </Link>
            </li>
          ))}
          <li ref={moreRef} className={`mega-more${overflow.length ? "" : " is-hidden"}`}>
            <button
              type="button"
              className={active === MORE || activeInOverflow ? "is-active" : undefined}
              aria-label="Diğer markalar"
              aria-expanded={active === MORE}
              aria-haspopup="true"
              onPointerEnter={() => openSoon(MORE)}
              onClick={onTriggerClick(MORE, false)}
              onKeyDown={onTriggerKey(MORE)}
            >
              <span aria-hidden>•••</span>
            </button>
          </li>
        </ul>
        {allPartsHref ? (
          <a className="nav-all-parts" href={allPartsHref}>
            <IconParts />
            Tüm parçalar
          </a>
        ) : null}
      </div>

      {active ? (
        <div ref={panelRef} className="mega-panel" role="region" aria-label="Menü">
          <div className="container mega-panel-inner">
            <button type="button" className="mega-close" onClick={close} aria-label="Menüyü kapat">
              <IconClose />
            </button>

            {active === CATS ? (
              <>
                <div className="mega-panel-head">
                  <h3>Kategoriler</h3>
                  {allPartsHref ? <a href={allPartsHref}>Tüm parçalar →</a> : null}
                </div>
                <div className="mega-cat-grid">
                  {categories.map((c) => (
                    <Link key={c.id} href={`/kategori/${c.slug}`} onClick={close}>{c.name}</Link>
                  ))}
                  <Link href="/sayfa/hakkimizda" onClick={close}>Hakkımızda</Link>
                  <Link href="/iletisim" onClick={close}>İletişim</Link>
                </div>
              </>
            ) : active === MORE ? (
              <>
                <div className="mega-panel-head">
                  <h3>Diğer markalar</h3>
                </div>
                <div className="mega-brand-grid">
                  {overflow.map((b) => (
                    <Link
                      key={b.id}
                      href={`/${b.slug}`}
                      onClick={close}
                      onPointerEnter={() => { if (pointerType.current === "mouse" && b.models.length) setActive(b.slug); }}
                    >
                      <BrandMark name={b.name} logoUrl={b.logoUrl} size={32} />
                      <span>{b.name}</span>
                    </Link>
                  ))}
                </div>
              </>
            ) : activeBrand ? (
              <>
                <div className="mega-panel-head">
                  <BrandMark name={activeBrand.name} logoUrl={activeBrand.logoUrl} size={40} />
                  <div>
                    <h3>{activeBrand.name} modelleri</h3>
                    {activeBrand.models.length ? <small>{new Set(activeBrand.models.map((m) => m.slug)).size} model</small> : null}
                  </div>
                  {activeInOverflow ? (
                    <button type="button" className="mega-back" onClick={() => setActive(MORE)}>← Diğer markalar</button>
                  ) : null}
                  <Link href={`/${activeBrand.slug}`} onClick={close}>Tüm {activeBrand.name} parçaları →</Link>
                </div>
                {activeBrand.models.length ? (
                  <div className="mega-model-grid">
                    {activeBrand.models.map((m) => (
                      <Link key={m.key} href={`/${activeBrand.slug}/${m.slug}`} className="mega-model" onClick={close}>
                        <span className="mega-model-media">
                          {m.imageUrl ? (
                            <Image src={m.imageUrl} alt="" fill sizes="160px" />
                          ) : (
                            <CarSilhouette />
                          )}
                        </span>
                        <span className="mega-model-name" title={m.years ? `${m.name} ${m.years}` : m.name}>
                          {m.name}
                          {m.years ? <small>{m.years}</small> : null}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="mega-empty">
                    Bu marka için model listesi yakında. <Link href={`/${activeBrand.slug}`} onClick={close}>Tüm {activeBrand.name} parçalarını inceleyin →</Link>
                  </p>
                )}
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
