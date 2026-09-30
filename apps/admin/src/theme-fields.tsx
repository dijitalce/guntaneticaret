"use client";

import { useState } from "react";

const KEYS = [
  { key: "primary", label: "Ana renk", hint: "Butonlar, fiyatlar, vurgular" },
  { key: "secondary", label: "İkincil renk", hint: "Menü ve alt bilgi" },
  { key: "accent", label: "Vurgu", hint: "İndirim ve rozetler" },
  { key: "background", label: "Arka plan", hint: "Sayfa zemini" },
] as const;

type Key = (typeof KEYS)[number]["key"];

const HEX = /^#[0-9a-f]{6}$/i;

export function ThemeFields({ defaults, siteName, only }: { defaults: Record<Key, string>; siteName: string; only?: Key[] }) {
  const [c, setC] = useState(defaults);
  const set = (k: Key, v: string) => setC((p) => ({ ...p, [k]: v }));
  const keys = only ? KEYS.filter((k) => only.includes(k.key)) : KEYS;
  const safe = (k: Key) => (HEX.test(c[k]) ? c[k] : defaults[k]);

  return (
    <div className="theme-fields">
      <div className="theme-swatches">
        {keys.map((k) => (
          <label key={k.key} className="swatch-field">
            <input type="color" value={safe(k.key)} onChange={(e) => set(k.key, e.target.value)} aria-label={k.label} />
            <span>
              <strong>{k.label}</strong>
              <small>{k.hint}</small>
            </span>
            <input
              className="input"
              name={k.key}
              value={c[k.key]}
              onChange={(e) => set(k.key, e.target.value)}
              pattern="#[0-9a-fA-F]{6}"
              maxLength={7}
              spellCheck={false}
            />
          </label>
        ))}
      </div>
      <div className="theme-preview" style={{ background: safe("background") }} aria-hidden>
        <div className="tp-top" style={{ background: safe("secondary") }}>
          WhatsApp destek · 0850 000 00 00
        </div>
        <div className="tp-head">
          <strong style={{ color: safe("primary") }}>{siteName || "Site adı"}</strong>
          <span className="tp-search">Parça, OEM veya marka ara…</span>
        </div>
        <div className="tp-card">
          <span className="tp-img" />
          <div>
            <span className="tp-badge" style={{ background: safe("accent") }}>
              %15
            </span>
            <b>Ön fren balatası</b>
            <span style={{ color: safe("primary"), fontWeight: 700 }}>1.249,90 ₺</span>
          </div>
          <span className="tp-btn" style={{ background: safe("primary") }}>
            Sepete ekle
          </span>
        </div>
      </div>
    </div>
  );
}
