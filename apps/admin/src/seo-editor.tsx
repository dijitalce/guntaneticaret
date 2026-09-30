"use client";

import { useState } from "react";
import { DEFAULT_SEO_TITLE_TEMPLATE, applySeoTitleTemplate } from "@guntan/types";
import { resolveAssetUrl } from "./form-fields";
import { SEO_LIMITS, lengthState, type LengthState } from "./tenant-seo";

const STATE_TEXT: Record<LengthState, string> = {
  empty: "Boş",
  short: "Kısa",
  ok: "İdeal",
  long: "Uzun — kesilir",
};

function Counter({ value, min, max }: { value: string; min: number; max: number }) {
  const n = value.trim().length;
  const state = lengthState(value, min, max);
  const pct = Math.min(100, Math.round((n / max) * 100));
  return (
    <span className={`seo-counter is-${state}`}>
      <span className="seo-counter-bar" aria-hidden>
        <span style={{ width: `${pct}%` }} />
      </span>
      <b>
        {n}/{max}
      </b>
      {STATE_TEXT[state]}
    </span>
  );
}

function clip(s: string, max: number) {
  const t = s.trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

export type SeoEditorDefaults = {
  title: string;
  description: string;
  template: string;
  ogImageUrl: string;
  seoContent: string;
};

export function SeoEditor({
  siteName,
  host,
  assetBase,
  faviconUrl,
  defaults,
}: {
  siteName: string;
  host: string;
  assetBase: string;
  faviconUrl?: string | null;
  defaults: SeoEditorDefaults;
}) {
  const [title, setTitle] = useState(defaults.title);
  const [description, setDescription] = useState(defaults.description);
  const [template, setTemplate] = useState(defaults.template || DEFAULT_SEO_TITLE_TEMPLATE);
  const [og, setOg] = useState(defaults.ogImageUrl);
  const [ogBroken, setOgBroken] = useState(false);
  const [content, setContent] = useState(defaults.seoContent);
  const [preview, setPreview] = useState<"google" | "mobile" | "social">("google");
  const [favBroken, setFavBroken] = useState(false);

  const name = siteName.trim() || "Site adı";
  const domain = host.trim() || "alanadi.com";
  const homeTitle = title.trim() || name;
  const sampleTitle = applySeoTitleTemplate(template, "Fren Balatası", name);
  const templateOk = template.includes("{page}");
  const desc =
    description.trim() || "Açıklama girilmezse Google sayfadaki metinlerden kendi seçtiği bir parçayı gösterir.";
  const ogSrc = resolveAssetUrl(og.trim(), assetBase);
  const favSrc = faviconUrl ? resolveAssetUrl(faviconUrl, assetBase) : "";
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;

  const insert = (token: string) => setTemplate((t) => (t.includes(token) ? t : `${t}${t ? " " : ""}${token}`));

  return (
    <div className="seo-editor">
      <div className="form-stack">
        <div className="field">
          <div className="field-top">
            <label htmlFor="defaultMetaTitle">Ana sayfa başlığı (meta title)</label>
            <Counter value={title} min={SEO_LIMITS.title.min} max={SEO_LIMITS.title.max} />
          </div>
          <input
            className="input"
            id="defaultMetaTitle"
            name="defaultMetaTitle"
            value={title}
            maxLength={255}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`${name} | Oto Yedek Parça`}
          />
          <small className="field-hint">Ana anahtar kelimeyi başa yazın; marka adını sona ekleyin. Her site için benzersiz olmalı.</small>
        </div>

        <div className="field">
          <div className="field-top">
            <label htmlFor="defaultMetaDescription">Meta açıklama</label>
            <Counter value={description} min={SEO_LIMITS.description.min} max={SEO_LIMITS.description.max} />
          </div>
          <textarea
            id="defaultMetaDescription"
            name="defaultMetaDescription"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Örn. Renault ve Dacia için orijinal ve muadil yedek parça. KDV dahil fiyat, aynı gün kargo, uzman destek."
          />
          <small className="field-hint">Arama sonucunda başlığın altında görünür. Fayda + harekete geçirici ifade kullanın.</small>
        </div>

        <div className="field">
          <label htmlFor="seoTitleTemplate">Alt sayfa başlık şablonu</label>
          <div className="input-with-chips">
            <input
              className="input"
              id="seoTitleTemplate"
              name="seoTitleTemplate"
              value={template}
              maxLength={255}
              onChange={(e) => setTemplate(e.target.value)}
            />
            <button type="button" className="chip" onClick={() => insert("{page}")}>
              {"{page}"}
            </button>
            <button type="button" className="chip" onClick={() => insert("{siteName}")}>
              {"{siteName}"}
            </button>
          </div>
          <small className="field-hint">
            {templateOk ? (
              <>
                Ürün, marka ve kategori sayfalarına uygulanır. Örnek: <strong>{sampleTitle}</strong>
              </>
            ) : (
              <span className="text-bad">Şablonda {"{page}"} olmalı; yoksa varsayılan “{DEFAULT_SEO_TITLE_TEMPLATE}” kullanılır.</span>
            )}
          </small>
        </div>

        <div className="field">
          <label htmlFor="ogImageUrl">Paylaşım görseli (Open Graph)</label>
          <input
            className="input"
            id="ogImageUrl"
            name="ogImageUrl"
            value={og}
            onChange={(e) => {
              setOg(e.target.value);
              setOgBroken(false);
            }}
            placeholder="/brand/og.jpg veya https://…"
          />
          <small className="field-hint">
            {ogBroken ? <span className="text-bad">Görsel yüklenemedi, adresi kontrol edin.</span> : "Önerilen boyut 1200×630 piksel (JPG/PNG, 1 MB altı)."}
          </small>
        </div>

        <div className="field">
          <div className="field-top">
            <label htmlFor="seoContent">Ana sayfa SEO metni</label>
            <span className={`seo-counter is-${content.trim().length >= SEO_LIMITS.content.min ? "ok" : content.trim() ? "short" : "empty"}`}>
              <b>{content.trim().length}</b> karakter · {words} kelime
            </span>
          </div>
          <textarea
            id="seoContent"
            name="seoContent"
            rows={7}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Sitenin ne sattığını, hangi markalara hizmet verdiğini, kargo ve garanti avantajlarını anlatan özgün bir metin yazın. Paragraflar için boş satır bırakın."
          />
          <small className="field-hint">
            Ana sayfanın altında gösterilir. En az {SEO_LIMITS.content.min} karakter önerilir; başka sitelerden kopyalamayın.
          </small>
        </div>
      </div>

      <aside className="seo-preview">
        <div className="seg" role="tablist" aria-label="Önizleme">
          <button type="button" className={preview === "google" ? "is-on" : undefined} onClick={() => setPreview("google")}>
            Google
          </button>
          <button type="button" className={preview === "mobile" ? "is-on" : undefined} onClick={() => setPreview("mobile")}>
            Mobil
          </button>
          <button type="button" className={preview === "social" ? "is-on" : undefined} onClick={() => setPreview("social")}>
            Paylaşım
          </button>
        </div>

        {preview === "social" ? (
          <div className="og-card">
            <div className="og-img">
              {ogSrc && !ogBroken ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ogSrc} alt="" onError={() => setOgBroken(true)} />
              ) : (
                <span>Görsel yok</span>
              )}
            </div>
            <div className="og-body">
              <span>{domain.toUpperCase()}</span>
              <strong>{clip(homeTitle, 70)}</strong>
              <p>{clip(desc, 110)}</p>
            </div>
          </div>
        ) : (
          <div className={`serp${preview === "mobile" ? " is-mobile" : ""}`}>
            <div className="serp-site">
              <span className="serp-fav">
                {favSrc && !favBroken ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={favSrc} alt="" onError={() => setFavBroken(true)} />
                ) : (
                  name.slice(0, 1).toUpperCase()
                )}
              </span>
              <div>
                <strong>{name}</strong>
                <span>https://{domain}</span>
              </div>
            </div>
            <h3>{clip(homeTitle, preview === "mobile" ? 75 : 60)}</h3>
            <p>{clip(desc, preview === "mobile" ? 120 : 160)}</p>
            <div className="serp-sub">
              <span>Alt sayfa örneği</span>
              <em>{clip(sampleTitle, 60)}</em>
            </div>
          </div>
        )}
        <p className="muted text-sm" style={{ margin: 0 }}>
          Önizleme yaklaşıktır; Google başlığı piksel genişliğine göre keser.
        </p>
      </aside>
    </div>
  );
}
