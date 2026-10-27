import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getPublishedPostBySlug, prepareBlogHtml, relatedBlogPosts } from "@guntan/db";
import { getTenant } from "../../../src/tenant";
import { cachedCategoryBySlug, cachedProductBySlug } from "../../../src/cached-catalog";
import { ProductCard } from "../../../src/product-card";
import { sentenceCaseTr } from "../../../src/format";
import { JsonLd, absoluteUrl, breadcrumbJsonLd } from "../../../src/seo";
import { BlogGrid, blogDate, blogImageUrl, blogPostingJsonLd, blogRobots, blogRssAlternate, faqJsonLd } from "../../../src/blog";

type Props = { params: Promise<{ slug: string }> };

const loadPost = cache(async (slug: string) => {
  const tenant = await getTenant();
  const post = await getPublishedPostBySlug(tenant.tenant.id, decodeURIComponent(slug));
  return post ? { tenant, post } : null;
});

function describe(post: { metaDescription: string | null; excerpt: string | null; body: string }) {
  const raw = post.metaDescription || post.excerpt || post.body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return raw.length > 160 ? `${raw.slice(0, 157).replace(/\s+\S*$/, "")}…` : raw;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadPost(slug);
  if (!data) return { title: "Yazı bulunamadı", robots: { index: false, follow: true } };
  const { tenant, post } = data;
  const host = tenant.tenant.canonicalHost;
  const url = absoluteUrl(host, `/blog/${post.slug}`);
  const canonical = post.canonicalUrl ? (/^https?:\/\//i.test(post.canonicalUrl) ? post.canonicalUrl : absoluteUrl(host, post.canonicalUrl)) : url;
  const description = describe(post);
  const image = blogImageUrl(host, post.ogImageUrl || post.coverUrl || tenant.ogImageUrl);
  const title = post.metaTitle || post.title;
  return {
    title,
    description,
    alternates: { canonical, types: blogRssAlternate(tenant) },
    robots: blogRobots(tenant, post.noindex),
    authors: [{ name: post.authorName || tenant.siteName }],
    keywords: post.tags.length ? post.tags.map((t) => t.name) : undefined,
    openGraph: {
      type: "article",
      url,
      title,
      description,
      siteName: tenant.siteName,
      locale: "tr_TR",
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      section: post.category?.name,
      tags: post.tags.map((t) => t.name),
      authors: [post.authorName || tenant.siteName],
      ...(image ? { images: [{ url: image, alt: post.coverAlt || post.title }] } : {}),
    },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, ...(image ? { images: [image] } : {}) },
  };
}

async function relatedProducts(tenantId: string, slugs: string[]) {
  const rows = await Promise.all(slugs.map((s) => cachedProductBySlug(tenantId, s).catch(() => null)));
  return rows
    .filter((r): r is NonNullable<typeof r> => r != null)
    .map((r) => ({
      id: r.product.id,
      name: r.product.name,
      slug: r.product.slug,
      sku: r.product.sku,
      price: r.product.price,
      compareAtPrice: r.product.compareAtPrice,
      manufacturerName: r.manufacturerName,
      manufacturerLogo: r.manufacturerLogo,
      imageUrl: [...r.images].sort((a, b) => a.sortOrder - b.sortOrder)[0]?.url ?? null,
      stockStatus: r.product.stockStatus,
    }));
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const data = await loadPost(slug);
  if (!data) notFound();
  const { tenant, post } = data;
  const host = tenant.tenant.canonicalHost;
  const url = absoluteUrl(host, `/blog/${post.slug}`);
  const { html, toc } = prepareBlogHtml(post.body, { siteHost: host });
  const [related, products, cats] = await Promise.all([
    relatedBlogPosts(post, 3),
    relatedProducts(tenant.tenant.id, post.relatedProducts),
    Promise.all(post.relatedCategories.map((s) => cachedCategoryBySlug(s).catch(() => null))),
  ]);
  const categories = cats.filter((c): c is NonNullable<typeof c> => c != null);
  const cover = blogImageUrl(host, post.coverUrl);
  const description = describe(post);
  const updated = post.publishedAt && post.updatedAt.getTime() - post.publishedAt.getTime() > 86_400_000 ? post.updatedAt : null;
  const crumbs = [
    { name: "Ana Sayfa", path: "/" },
    { name: "Blog", path: "/blog" },
    ...(post.category ? [{ name: post.category.name, path: `/blog/kategori/${post.category.slug}` }] : []),
    { name: post.title, path: `/blog/${post.slug}` },
  ];
  const share = encodeURIComponent(url);
  const shareText = encodeURIComponent(post.title);

  return (
    <div className="container page-surface blog-page">
      <JsonLd
        data={[blogPostingJsonLd(tenant, post, description), breadcrumbJsonLd(host, crumbs), ...(post.faq.length ? [faqJsonLd(post.faq)] : [])]}
      />
      <nav className="breadcrumb" aria-label="Konum">
        <Link href="/">Ana Sayfa</Link>
        {" › "}
        <Link href="/blog">Blog</Link>
        {post.category ? (
          <>
            {" › "}
            <Link href={`/blog/kategori/${post.category.slug}`}>{post.category.name}</Link>
          </>
        ) : null}
      </nav>

      <article className="blog-article">
        <header className="blog-article-head">
          {post.category ? (
            <Link className="blog-kicker" href={`/blog/kategori/${post.category.slug}`}>
              {post.category.name}
            </Link>
          ) : null}
          <h1>{post.title}</h1>
          {post.excerpt ? <p className="blog-lead">{post.excerpt}</p> : null}
          <div className="blog-meta">
            <span>{post.authorName || tenant.siteName}</span>
            {post.publishedAt ? (
              <time dateTime={post.publishedAt.toISOString()}>{blogDate(post.publishedAt)}</time>
            ) : null}
            {updated ? (
              <span>
                Güncellendi: <time dateTime={updated.toISOString()}>{blogDate(updated)}</time>
              </span>
            ) : null}
            <span>{post.readingMinutes} dk okuma</span>
          </div>
        </header>

        {cover ? (
          <figure className="blog-cover">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt={post.coverAlt || post.title} width={1200} height={675} fetchPriority="high" decoding="async" />
          </figure>
        ) : null}

        <div className={`blog-article-layout${toc.length >= 3 ? " has-toc" : ""}`}>
          {toc.length >= 3 ? (
            <aside className="blog-toc">
              <details open>
                <summary>İçindekiler</summary>
                <ol>
                  {toc.map((t) => (
                    <li key={t.id} className={t.level === 3 ? "is-sub" : undefined}>
                      <a href={`#${t.id}`}>{t.text}</a>
                    </li>
                  ))}
                </ol>
              </details>
            </aside>
          ) : null}

          <div className="blog-article-main">
            <div className="blog-content" dangerouslySetInnerHTML={{ __html: html }} />

            {post.faq.length ? (
              <section className="blog-faq" aria-labelledby="sss">
                <h2 id="sss">Sık sorulan sorular</h2>
                {post.faq.map((f) => (
                  <details key={f.q}>
                    <summary>{f.q}</summary>
                    <p>{f.a}</p>
                  </details>
                ))}
              </section>
            ) : null}

            {categories.length ? (
              <section className="blog-links" aria-labelledby="ilgili-kategoriler">
                <h2 id="ilgili-kategoriler">Bu konudaki parçalar</h2>
                <div className="blog-link-chips">
                  {categories.map((c) => (
                    <Link key={c.slug} href={`/kategori/${c.slug}`}>
                      {sentenceCaseTr(c.name)} yedek parça
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {post.tags.length ? (
              <div className="blog-tags" aria-label="Etiketler">
                {post.tags.map((t) => (
                  <Link key={t.slug} href={`/blog/etiket/${t.slug}`}>
                    #{t.name}
                  </Link>
                ))}
              </div>
            ) : null}

            <div className="blog-share">
              <span>Paylaş:</span>
              <a href={`https://wa.me/?text=${shareText}%20${share}`} target="_blank" rel="noopener nofollow">
                WhatsApp
              </a>
              <a href={`https://www.facebook.com/sharer/sharer.php?u=${share}`} target="_blank" rel="noopener nofollow">
                Facebook
              </a>
              <a href={`https://x.com/intent/post?url=${share}&text=${shareText}`} target="_blank" rel="noopener nofollow">
                X
              </a>
            </div>

            {tenant.whatsapp ? (
              <aside className="blog-cta">
                <div>
                  <strong>Aracınıza uygun parçayı birlikte bulalım</strong>
                  <p>Şasi numaranızı WhatsApp&apos;tan gönderin; uzman ekibimiz doğru parçayı ve fiyatı iletsin.</p>
                </div>
                <a
                  className="btn btn-primary"
                  href={`https://wa.me/${tenant.whatsapp}?text=${encodeURIComponent(`Merhaba, "${post.title}" yazınızı okudum, parça sormak istiyorum.`)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp&apos;tan sorun
                </a>
              </aside>
            ) : null}
          </div>
        </div>
      </article>

      {products.length ? (
        <section className="blog-section" aria-labelledby="ilgili-urunler">
          <h2 id="ilgili-urunler">Yazıda geçen ürünler</h2>
          <div className="product-grid">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} placeholder={tenant.placeholderImageUrl} />
            ))}
          </div>
        </section>
      ) : null}

      {related.length ? (
        <section className="blog-section" aria-labelledby="ilgili-yazilar">
          <h2 id="ilgili-yazilar">İlgili yazılar</h2>
          <BlogGrid posts={related} host={host} heading="h3" />
        </section>
      ) : null}
    </div>
  );
}
