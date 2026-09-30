"use client";

import Link from "next/link";
import { useState } from "react";
import { DEFAULT_SEO_TITLE_TEMPLATE, DEFAULT_THEME_TOKENS } from "@guntan/types";
import type { PickerBrand } from "./brand-picker";
import { IconCheck } from "./icons";
import { SeoEditor } from "./seo-editor";
import { SEO_LIMITS, lengthState, normalizeHostname } from "./tenant-seo";
import { ThemeFields } from "./theme-fields";
import { VisibilityFields, type PickerGroup } from "./visibility-fields";

function toSlug(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function Step({ n, title, desc, children }: { n: number; title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="panel wizard-step">
      <header>
        <span className="wizard-num">{n}</span>
        <div>
          <h2>{title}</h2>
          <p>{desc}</p>
        </div>
      </header>
      <div className="panel-pad">{children}</div>
    </section>
  );
}

export function NewTenantForm({
  action,
  assetBase,
  groups,
  brands,
}: {
  action: string;
  assetBase: string;
  groups: PickerGroup[];
  brands: PickerBrand[];
}) {
  const [name, setName] = useState("");
  const [siteName, setSiteName] = useState("");
  const [slug, setSlug] = useState("");
  const [host, setHost] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  const brand = siteName.trim() || name.trim();
  const normalizedHost = host ? normalizeHostname(host) : null;
  const effectiveSlug = slug ? toSlug(slug) : toSlug(name);

  const checks = [
    { label: "Site adı", ok: !!name.trim() },
    { label: "Geçerli alan adı", ok: !!normalizedHost },
    { label: "Meta başlık (30–60)", ok: lengthState(title, SEO_LIMITS.title.min, SEO_LIMITS.title.max) === "ok" },
    { label: "Meta açıklama (120–160)", ok: lengthState(desc, SEO_LIMITS.description.min, SEO_LIMITS.description.max) === "ok" },
  ];
  const ready = checks[0]!.ok && checks[1]!.ok;

  return (
    <form
      action={action}
      method="post"
      className="grid-2"
      onInput={(e) => {
        const t = e.target as HTMLInputElement;
        if (t.name === "defaultMetaTitle") setTitle(t.value);
        if (t.name === "defaultMetaDescription") setDesc(t.value);
      }}
    >
      <div>
        <Step n={1} title="Kimlik ve alan adı" desc="Sitenin adı ve yayınlanacağı alan adı.">
          <div className="form-stack">
            <div className="form-row">
              <div className="field">
                <label htmlFor="name">Site adı</label>
                <input className="input" id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn. Renault Yedek Parça" required />
              </div>
              <div className="field">
                <label htmlFor="siteName">Vitrin adı (marka)</label>
                <input className="input" id="siteName" name="siteName" value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder={name || "Boşsa site adı kullanılır"} />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label htmlFor="hostname">Alan adı</label>
                <input className="input" id="hostname" name="hostname" value={host} onChange={(e) => setHost(e.target.value)} placeholder="renaultyedekparca.com" required />
                <small className="field-hint">
                  {host && !normalizedHost ? <span className="text-bad">Geçersiz alan adı.</span> : normalizedHost ? <>Kaydedilecek: <strong>{normalizedHost}</strong></> : "www. ve https:// otomatik temizlenir."}
                </small>
              </div>
              <div className="field">
                <label htmlFor="slug">Site kodu</label>
                <input className="input" id="slug" name="slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder={toSlug(name) || "otomatik"} />
                <small className="field-hint">
                  Kod: <strong>{effectiveSlug || "…"}</strong> · sonradan değiştirilemez.
                </small>
              </div>
            </div>
          </div>
        </Step>

        <Step n={2} title="SEO" desc="Arama sonuçlarında nasıl görüneceğini şimdi belirleyin; sonra da değiştirebilirsiniz.">
          <SeoEditor
            siteName={brand}
            host={normalizedHost ?? ""}
            assetBase={assetBase}
            faviconUrl="/favicon.png"
            defaults={{ title: "", description: "", template: DEFAULT_SEO_TITLE_TEMPLATE, ogImageUrl: "", seoContent: "" }}
          />
        </Step>

        <Step n={3} title="Katalog" desc="Bu sitede hangi markalar listelensin?">
          <VisibilityFields mode="SELECTED" groups={groups} brands={brands} selectedGroups={[]} includeBrands={[]} excludeBrands={[]} />
        </Step>

        <Step n={4} title="Görünüm" desc="Marka renkleri. Logo ve favicon’u oluşturduktan sonra Görünüm sekmesinden değiştirebilirsiniz.">
          <ThemeFields
            siteName={brand}
            defaults={{
              primary: DEFAULT_THEME_TOKENS.primary,
              secondary: DEFAULT_THEME_TOKENS.secondary,
              accent: DEFAULT_THEME_TOKENS.accent,
              background: DEFAULT_THEME_TOKENS.background,
            }}
          />
        </Step>

        <Step n={5} title="İletişim ve ödeme" desc="Müşterilerin size ulaşacağı bilgiler ve havale hesabı (isteğe bağlı).">
          <div className="form-stack">
            <div className="form-row">
              <div className="field">
                <label htmlFor="phone">Telefon</label>
                <input className="input" id="phone" name="phone" placeholder="0216 000 00 00" />
              </div>
              <div className="field">
                <label htmlFor="whatsapp">WhatsApp</label>
                <input className="input" id="whatsapp" name="whatsapp" placeholder="0532 000 00 00" />
              </div>
              <div className="field">
                <label htmlFor="email">E-posta</label>
                <input className="input" id="email" name="email" type="email" placeholder="info@ornek.com" />
              </div>
            </div>
            <div className="field">
              <label htmlFor="address">Adres</label>
              <textarea id="address" name="address" rows={2} placeholder="Mahalle, cadde, no, ilçe / il" />
            </div>
            <details className="details-block">
              <summary>Havale / EFT hesabı ekle</summary>
              <div className="form-row" style={{ marginTop: "0.8rem" }}>
                <div className="field">
                  <label htmlFor="bankName">Banka</label>
                  <input className="input" id="bankName" name="bankName" placeholder="Ziraat Bankası" />
                </div>
                <div className="field">
                  <label htmlFor="accountHolder">Hesap sahibi</label>
                  <input className="input" id="accountHolder" name="accountHolder" placeholder="Şirket unvanı" />
                </div>
                <div className="field">
                  <label htmlFor="iban">IBAN</label>
                  <input className="input mono" id="iban" name="iban" placeholder="TR00 0000 0000 …" />
                </div>
              </div>
            </details>
          </div>
        </Step>
      </div>

      <div>
        <aside className="panel wizard-summary">
          <div className="panel-pad form-stack">
            <div>
              <strong className="wizard-summary-title">{brand || "Yeni site"}</strong>
              <span className="muted text-sm">{normalizedHost ?? "alan adı girilmedi"}</span>
            </div>
            <ul className="wizard-checks">
              {checks.map((c) => (
                <li key={c.label} className={c.ok ? "is-ok" : undefined}>
                  <span aria-hidden>{c.ok ? <IconCheck /> : null}</span>
                  {c.label}
                </li>
              ))}
            </ul>
            <p className="muted text-sm" style={{ margin: 0 }}>
              Taslak site ziyaretçilere kapalıdır; ayarları tamamlayıp Genel sekmesinden yayına alabilirsiniz.
            </p>
            <div className="wizard-actions">
              <button className="btn btn-primary" type="submit" name="status" value="active" disabled={!ready}>
                Oluştur ve yayınla
              </button>
              <button className="btn btn-secondary" type="submit" name="status" value="draft" disabled={!ready}>
                Taslak olarak kaydet
              </button>
              <Link className="btn btn-ghost" href="/tenants">
                Vazgeç
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </form>
  );
}
