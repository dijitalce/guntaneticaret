import { DEFAULT_SEO_TITLE_TEMPLATE, SEO_SOCIAL_KEYS, SOCIAL_LINKS } from "@guntan/types";

export const TENANT_STATUS_META: Record<string, { label: string; hint: string; tone: "ok" | "warn" | "info" }> = {
  active: { label: "Yayında", hint: "Site ziyaretçilere açık.", tone: "ok" },
  draft: { label: "Taslak", hint: "Site kapalı; alan adı 404 döner. Hazırlık için kullanın.", tone: "warn" },
  maintenance: { label: "Bakımda", hint: "Ziyaretçiler bakım sayfasına yönlendirilir.", tone: "info" },
};

export const SEO_LIMITS = {
  title: { min: 30, max: 60 },
  description: { min: 120, max: 160 },
  content: { min: 300 },
};

export type LengthState = "empty" | "short" | "ok" | "long";

export function lengthState(value: string, min: number, max: number): LengthState {
  const n = value.trim().length;
  if (n === 0) return "empty";
  if (n < min) return "short";
  if (n > max) return "long";
  return "ok";
}

/** "https://www.Ornek.com/abc" → "ornek.com". Geçersizse null. */
export function normalizeHostname(raw: string): string | null {
  let h = raw.trim().toLowerCase();
  h = h.replace(/^[a-z]+:\/\//, "").split(/[/?#]/)[0] ?? "";
  h = h.replace(/:\d+$/, "").replace(/^www\./, "").replace(/\.$/, "");
  if (!h || h.length > 253) return null;
  if (!/^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(h)) return null;
  if (!h.includes(".") && h !== "localhost") return null;
  return h;
}

export function normalizeIban(raw: string) {
  return raw.replace(/\s+/g, "").toUpperCase();
}

export function isValidIban(raw: string) {
  const iban = normalizeIban(raw);
  if (!/^TR\d{24}$/.test(iban)) return false;
  const moved = iban.slice(4) + iban.slice(0, 4);
  const digits = moved.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rem = 0;
  for (const d of digits) rem = (rem * 10 + Number(d)) % 97;
  return rem === 1;
}

export function formatIban(raw: string) {
  return normalizeIban(raw).replace(/(.{4})/g, "$1 ").trim();
}

/** WhatsApp için uluslararası rakam dizisi (0532… → 90532…). */
export function normalizeWhatsapp(raw: string) {
  let d = raw.replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = `9${d}`;
  if (d.length === 10 && d.startsWith("5")) d = `90${d}`;
  return d;
}

export function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

export const GA_ID_RE = /^(G|UA|AW)-[A-Z0-9-]{4,}$/;
export const GTM_ID_RE = /^GTM-[A-Z0-9]{4,}$/;

/** Kullanıcı tüm <meta …content="…"> etiketini yapıştırsa da sadece kodu alır. */
export function extractVerification(raw: string) {
  const v = raw.trim();
  const m = v.match(/content\s*=\s*["']([^"']+)["']/i);
  return (m?.[1] ?? v).trim().slice(0, 200);
}

export function isHttpUrl(v: string) {
  return /^https?:\/\/[^\s]+\.[^\s]+/i.test(v);
}

export type SeoAuditInput = {
  status: string;
  siteName: string;
  defaultMetaTitle: string | null;
  defaultMetaDescription: string | null;
  seoTitleTemplate: string | null;
  seoContent: string | null;
  ogImageUrl: string | null;
  faviconUrl: string | null;
  logoUrl: string | null;
  phone: string | null;
  address: string | null;
  gaId: string | null;
  gtmId: string | null;
  social: Record<string, string> | null;
  hasPrimaryDomain: boolean;
};

export type SeoCheck = { key: string; label: string; ok: boolean; hint: string; weight: number; tab: string };

export function seoAudit(s: SeoAuditInput) {
  const social = s.social ?? {};
  const title = s.defaultMetaTitle ?? "";
  const desc = s.defaultMetaDescription ?? "";
  const template = s.seoTitleTemplate || DEFAULT_SEO_TITLE_TEMPLATE;
  const checks: SeoCheck[] = [
    {
      key: "indexable",
      label: "Arama motorlarına açık",
      ok: s.status === "active" && social[SEO_SOCIAL_KEYS.noindex] !== "1",
      hint: "Site yayında olmalı ve “arama motorlarından gizle” kapalı olmalı.",
      weight: 3,
      tab: "seo",
    },
    {
      key: "domain",
      label: "Birincil alan adı",
      ok: s.hasPrimaryDomain,
      hint: "Canonical adresler ve site haritası birincil alan adıyla üretilir.",
      weight: 2,
      tab: "alan-adlari",
    },
    {
      key: "title",
      label: `Meta başlık ${SEO_LIMITS.title.min}–${SEO_LIMITS.title.max} karakter`,
      ok: lengthState(title, SEO_LIMITS.title.min, SEO_LIMITS.title.max) === "ok",
      hint: title ? `Şu an ${title.trim().length} karakter.` : "Ana sayfa başlığı boş; sadece site adı gösteriliyor.",
      weight: 3,
      tab: "seo",
    },
    {
      key: "description",
      label: `Meta açıklama ${SEO_LIMITS.description.min}–${SEO_LIMITS.description.max} karakter`,
      ok: lengthState(desc, SEO_LIMITS.description.min, SEO_LIMITS.description.max) === "ok",
      hint: desc ? `Şu an ${desc.trim().length} karakter.` : "Açıklama boş; Google sayfadan rastgele metin seçer.",
      weight: 3,
      tab: "seo",
    },
    {
      key: "template",
      label: "Başlık şablonu marka adını içeriyor",
      ok: template.includes("{page}") && (template.includes("{siteName}") || template.includes(s.siteName)),
      hint: "Örn. “{page} | {siteName}”. Tüm alt sayfa başlıklarına uygulanır.",
      weight: 1,
      tab: "seo",
    },
    {
      key: "content",
      label: `Ana sayfa SEO metni (en az ${SEO_LIMITS.content.min} karakter)`,
      ok: (s.seoContent ?? "").trim().length >= SEO_LIMITS.content.min,
      hint: "Ana sayfanın altında gösterilir; anahtar kelimeleri doğal şekilde kullanın.",
      weight: 2,
      tab: "seo",
    },
    {
      key: "og",
      label: "Paylaşım görseli (1200×630)",
      ok: !!s.ogImageUrl,
      hint: "WhatsApp, Facebook, X paylaşımlarında görünen görsel.",
      weight: 2,
      tab: "seo",
    },
    { key: "favicon", label: "Favicon", ok: !!s.faviconUrl, hint: "Tarayıcı sekmesinde ve Google sonuçlarında görünür.", weight: 1, tab: "gorunum" },
    { key: "logo", label: "Logo", ok: !!s.logoUrl, hint: "Organization yapısal verisinde kullanılır.", weight: 1, tab: "gorunum" },
    {
      key: "verify",
      label: "Google Search Console doğrulaması",
      ok: !!social[SEO_SOCIAL_KEYS.googleVerification],
      hint: "İndeksleme ve arama performansını takip etmek için gerekli.",
      weight: 2,
      tab: "seo",
    },
    {
      key: "analytics",
      label: "Analytics / Tag Manager",
      ok: !!(s.gaId || s.gtmId),
      hint: "Ziyaretçi ve dönüşüm ölçümü için GA4 veya GTM kimliği.",
      weight: 1,
      tab: "seo",
    },
    {
      key: "local",
      label: "Telefon ve adres (yerel SEO)",
      ok: !!(s.phone && s.address),
      hint: "Yapısal veride işletme bilgisi olarak yayınlanır.",
      weight: 1,
      tab: "iletisim",
    },
    {
      key: "social",
      label: "En az bir sosyal medya profili",
      ok: SOCIAL_LINKS.some((l) => !!social[l.key]),
      hint: "Organization “sameAs” alanına eklenir; marka güvenini artırır.",
      weight: 1,
      tab: "iletisim",
    },
  ];
  const total = checks.reduce((a, c) => a + c.weight, 0);
  const got = checks.reduce((a, c) => a + (c.ok ? c.weight : 0), 0);
  const score = Math.round((got / total) * 100);
  return { checks, score, tone: score >= 80 ? ("ok" as const) : score >= 50 ? ("warn" as const) : ("bad" as const) };
}
