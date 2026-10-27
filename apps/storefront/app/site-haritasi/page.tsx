import Link from "next/link";
import type { Metadata } from "next";
import { latestBlogPosts, siteStructure, sitemapFileNames, SITEMAP_STATIC_PAGES } from "@guntan/db";
import { getTenant } from "../../src/tenant";
import { sentenceCaseTr } from "../../src/format";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Site haritası",
  description: "Tüm yedek parça kategorileri, araç markaları ve modelleri tek sayfada.",
  alternates: { canonical: "/site-haritasi" },
};

const n = (v: number) => v.toLocaleString("tr-TR");

export default async function SiteMapPage() {
  const tenant = await getTenant();
  const [s, posts] = await Promise.all([siteStructure(tenant.tenant.id), latestBlogPosts(tenant.tenant.id, 48).catch(() => [])]);
  const cats = s.categories.filter((c) => c.count > 0);
  const roots = cats.filter((c) => !c.parentId || !cats.some((p) => p.id === c.parentId));
  const childrenOf = (id: string) => cats.filter((c) => c.parentId === id);
  const brands = s.brands.filter((b) => b.count > 0);
  const modelTotal = brands.reduce((sum, b) => sum + b.models.filter((m) => m.count > 0).length, 0);

  return (
    <div className="container page-surface html-sitemap">
      <nav className="breadcrumb">
        <Link href="/">Ana Sayfa</Link> › Site haritası
      </nav>
      <h1>Site haritası</h1>
      <p className="html-sitemap-lead">
        {tenant.siteName} kataloğunda {n(s.products)} ürün, {n(cats.length)} kategori, {n(brands.length)} araç markası ve {n(modelTotal)} model bulunur.
      </p>
      <nav className="html-sitemap-jump" aria-label="Bölümler">
        <a href="#kategoriler">Kategoriler</a>
        <a href="#markalar">Araç markaları ve modeller</a>
        <a href="#sayfalar">Sayfalar</a>
      </nav>

      <section id="kategoriler">
        <h2>Kategoriler</h2>
        <div className="html-sitemap-cols">
          {roots.map((c) => (
            <div key={c.id} className="html-sitemap-group">
              <Link className="html-sitemap-head" href={`/kategori/${c.slug}`}>
                {sentenceCaseTr(c.name)} <span>{n(c.count)}</span>
              </Link>
              {childrenOf(c.id).length ? (
                <ul>
                  {childrenOf(c.id).map((k) => (
                    <li key={k.id}>
                      <Link href={`/kategori/${k.slug}`}>
                        {sentenceCaseTr(k.name)} <span>{n(k.count)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section id="markalar">
        <h2>Araç markaları ve modeller</h2>
        <div className="html-sitemap-cols">
          {brands.map((b) => (
            <div key={b.slug} className="html-sitemap-group">
              <Link className="html-sitemap-head" href={`/${b.slug}`}>
                {b.name} yedek parça
              </Link>
              <ul>
                {b.models
                  .filter((m) => m.count > 0)
                  .map((m) => (
                    <li key={m.slug}>
                      <Link href={`/${b.slug}/${m.slug}`}>
                        {b.name} {m.name} <span>{n(m.count)}</span>
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section id="sayfalar">
        <h2>Sayfalar</h2>
        <ul className="html-sitemap-inline">
          <li>
            <Link href="/">Ana sayfa</Link>
          </li>
          {SITEMAP_STATIC_PAGES.filter((p) => p.path !== "/site-haritasi").map((p) => (
            <li key={p.path}>
              <Link href={p.path}>{p.label}</Link>
            </li>
          ))}
          {posts.length ? (
            <li>
              <Link href="/blog">Blog</Link>
            </li>
          ) : null}
        </ul>
        {posts.length ? (
          <>
            <h3>Blog yazıları</h3>
            <ul className="html-sitemap-inline">
              {posts.filter((p) => !p.noindex).map((p) => (
                <li key={p.slug}>
                  <Link href={`/blog/${p.slug}`}>{p.title}</Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <p className="html-sitemap-note">
          Arama motorları için XML site haritası: <a href="/sitemap.xml">sitemap.xml</a> ({sitemapFileNames(s.products, posts.length > 0).length} dosya).
        </p>
      </section>
    </div>
  );
}
