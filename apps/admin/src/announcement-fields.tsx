"use client";

import { useState } from "react";

const HEX = /^#[0-9a-f]{6}$/i;

type Colors = { bg: string; fg: string };

export function AnnouncementFields({ text, colors, defaults }: { text: string; colors: Colors; defaults: Colors }) {
  const [value, setValue] = useState(text);
  const [c, setC] = useState(colors);
  const set = (k: keyof Colors, v: string) => setC((p) => ({ ...p, [k]: v }));
  const safe = (k: keyof Colors) => (HEX.test(c[k]) ? c[k] : defaults[k]);
  const messages = value.split("\n").map((m) => m.trim()).filter(Boolean);

  return (
    <div className="form-stack">
      <div className="field">
        <label htmlFor="announcementText">Mesajlar</label>
        <textarea
          id="announcementText"
          name="announcementText"
          rows={4}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={"Saat 12:00'a kadar verilen siparişler aynı gün kargoda\n2.000 ₺ ve üzeri ücretsiz kargo\nYeni ürünlerden haberdar olmak için bizi Instagram'dan takip et!"}
        />
        <small className="field-hint">Her satır ayrı bir mesajdır (en fazla 10). Boş bırakılırsa kayan yazı çubuğu gizlenir.</small>
      </div>
      <div className="form-row">
        {(
          [
            { key: "bg", name: "announcementBg", label: "Zemin rengi" },
            { key: "fg", name: "announcementFg", label: "Yazı rengi" },
          ] as const
        ).map((f) => (
          <label key={f.key} className="swatch-field">
            <input type="color" value={safe(f.key)} onChange={(e) => set(f.key, e.target.value)} aria-label={f.label} />
            <span>
              <strong>{f.label}</strong>
            </span>
            <input
              className="input"
              name={f.name}
              value={c[f.key]}
              onChange={(e) => set(f.key, e.target.value)}
              pattern="#[0-9a-fA-F]{6}"
              maxLength={7}
              spellCheck={false}
            />
          </label>
        ))}
      </div>
      <div className="announce-preview" style={{ background: safe("bg"), color: safe("fg") }} aria-hidden>
        {messages.length ? messages.map((m, i) => <span key={i}>{m}</span>) : <span>Önizleme: mesaj ekleyin</span>}
      </div>
    </div>
  );
}
