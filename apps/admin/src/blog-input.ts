import { BLOG_RESERVED_SLUGS, type BlogCategoryInput, type BlogFaq, type BlogPostInput } from "@guntan/db";
import { slugify, text } from "./api-helpers";

function optional(form: FormData, key: string, max: number) {
  return text(form, key).slice(0, max) || null;
}

function urlOrNull(form: FormData, key: string) {
  const v = text(form, key).slice(0, 1000);
  return /^(https?:\/\/|\/(?!\/))/i.test(v) ? v : null;
}

/** "Soru? | Cevap" satırları veya JSON. */
export function parseFaq(raw: string): BlogFaq[] {
  const t = raw.trim();
  if (!t) return [];
  if (t.startsWith("[")) {
    try {
      const v = JSON.parse(t) as BlogFaq[];
      return v.filter((f) => f?.q && f?.a).map((f) => ({ q: String(f.q).slice(0, 300), a: String(f.a).slice(0, 2000) }));
    } catch {
      /* satır biçimine düş */
    }
  }
  return t
    .split("\n")
    .map((line) => {
      const at = line.indexOf("|");
      if (at < 0) return null;
      const q = line.slice(0, at).trim();
      const a = line.slice(at + 1).trim();
      return q && a ? { q: q.slice(0, 300), a: a.slice(0, 2000) } : null;
    })
    .filter((f): f is BlogFaq => f !== null);
}

export function faqToText(faq: BlogFaq[]) {
  return faq.map((f) => `${f.q} | ${f.a}`).join("\n");
}

function slugList(value: string, max = 12) {
  return [...new Set(value.split(/[,\n]+/).map((s) => slugify(s.trim().replace(/^.*\/(urun|kategori)\//, "").replace(/[/?#].*$/, ""))).filter(Boolean))].slice(0, max);
}

/** datetime-local (Türkiye saati) → Date. */
export function parseLocalDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return null;
  const d = new Date(`${value.slice(0, 16)}:00+03:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toLocalInput(d: Date | null | undefined): string {
  if (!d) return "";
  const tr = new Date(d.getTime() + 3 * 3600_000);
  return tr.toISOString().slice(0, 16);
}

export function blogPostFromForm(form: FormData): BlogPostInput | { error: string } {
  const title = text(form, "title").slice(0, 255);
  const tenantId = text(form, "tenantId");
  if (!title || !tenantId) return { error: "Site ve başlık zorunlu." };
  const slug = slugify(text(form, "slug") || title).slice(0, 180);
  if (!slug) return { error: "Geçerli bir adres (slug) girin." };
  if (BLOG_RESERVED_SLUGS.includes(slug)) return { error: `“${slug}” adresi blog sistemine ayrılmış; başka bir adres seçin.` };
  const body = String(form.get("body") ?? "").slice(0, 1_000_000);
  const status = text(form, "status") === "published" ? "published" : "draft";
  const publishedRaw = text(form, "publishedAt");
  const publishedAt = parseLocalDate(publishedRaw);
  if (publishedRaw && !publishedAt) return { error: "Yayın tarihi geçersiz." };
  const canonicalRaw = text(form, "canonicalUrl");
  const canonicalUrl = urlOrNull(form, "canonicalUrl");
  if (canonicalRaw && !canonicalUrl) return { error: "Canonical adres https:// veya / ile başlamalı." };
  return {
    tenantId,
    title,
    slug,
    excerpt: optional(form, "excerpt", 600),
    body,
    coverUrl: urlOrNull(form, "coverUrl"),
    coverAlt: optional(form, "coverAlt", 255),
    categoryId: text(form, "categoryId") || null,
    status,
    publishedAt,
    authorName: optional(form, "authorName", 191),
    metaTitle: optional(form, "metaTitle", 255),
    metaDescription: optional(form, "metaDescription", 500),
    canonicalUrl,
    ogImageUrl: urlOrNull(form, "ogImageUrl"),
    noindex: form.get("noindex") === "1",
    focusKeyword: optional(form, "focusKeyword", 191),
    relatedCategories: slugList(text(form, "relatedCategories")),
    relatedProducts: slugList(text(form, "relatedProducts")),
    faq: parseFaq(String(form.get("faq") ?? "")),
    tags: text(form, "tags")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
  };
}

export function blogCategoryFromForm(form: FormData): BlogCategoryInput | { error: string } {
  const name = text(form, "name").slice(0, 191);
  const tenantId = text(form, "tenantId");
  if (!name || !tenantId) return { error: "Site ve kategori adı zorunlu." };
  const slug = slugify(text(form, "slug") || name).slice(0, 180);
  if (!slug) return { error: "Geçerli bir adres (slug) girin." };
  const sort = Math.round(Number(text(form, "sortOrder")));
  return {
    tenantId,
    name,
    slug,
    description: optional(form, "description", 5000),
    metaTitle: optional(form, "metaTitle", 255),
    metaDescription: optional(form, "metaDescription", 500),
    sortOrder: Number.isFinite(sort) ? Math.max(0, Math.min(999, sort)) : 0,
  };
}
