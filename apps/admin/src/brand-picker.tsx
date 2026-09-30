"use client";

import { useMemo, useState } from "react";
import { BrandLogo } from "./brand-logo";

export type PickerBrand = { id: string; name: string; logo: string | null; isActive: boolean };

export function BrandPicker({ brands, selected }: { brands: PickerBrand[]; selected: string[] }) {
  const [picked, setPicked] = useState(() => new Set(selected));
  const [q, setQ] = useState("");
  const [onlyPicked, setOnlyPicked] = useState(false);

  const visible = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("tr-TR");
    return brands.filter(
      (b) => (!needle || b.name.toLocaleLowerCase("tr-TR").includes(needle)) && (!onlyPicked || picked.has(b.id)),
    );
  }, [brands, q, onlyPicked, picked]);

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const setMany = (ids: string[], on: boolean) =>
    setPicked((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  return (
    <div className="brand-picker">
      {[...picked].map((id) => (
        <input key={id} type="hidden" name="brandIds" value={id} />
      ))}
      <div className="brand-picker-bar">
        <input
          className="input"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Marka ara…"
          aria-label="Marka ara"
        />
        <div className="seg">
          <button type="button" className={onlyPicked ? undefined : "is-on"} onClick={() => setOnlyPicked(false)}>
            Tümü
          </button>
          <button type="button" className={onlyPicked ? "is-on" : undefined} onClick={() => setOnlyPicked(true)}>
            Seçili ({picked.size})
          </button>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMany(visible.map((b) => b.id), true)}>
          {q ? "Sonuçları seç" : "Tümünü seç"}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMany(visible.map((b) => b.id), false)} disabled={picked.size === 0}>
          Temizle
        </button>
      </div>

      {visible.length === 0 ? (
        <p className="muted text-sm" style={{ padding: "1.5rem", textAlign: "center", margin: 0 }}>
          {onlyPicked ? "Henüz marka seçilmedi." : "Eşleşen marka yok."}
        </p>
      ) : (
        <div className="brand-picker-grid">
          {visible.map((b) => {
            const on = picked.has(b.id);
            return (
              <button
                key={b.id}
                type="button"
                className={`pick-tile${on ? " is-on" : ""}${b.isActive ? "" : " is-off"}`}
                onClick={() => toggle(b.id)}
                aria-pressed={on}
                title={b.isActive ? b.name : `${b.name} (pasif)`}
              >
                <span className="pick-check" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 12 5 5L20 7" />
                  </svg>
                </span>
                <BrandLogo src={b.logo} name={b.name} size={40} />
                <span className="pick-name">{b.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
