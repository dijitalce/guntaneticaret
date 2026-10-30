import Link from "next/link";
import { unstable_cache } from "next/cache";
import type { Metadata } from "next";
import { countPublishedPosts, publishedPostsForCategory, type BlogPost, type BlogPostSummary } from "@guntan/db";
import type { TenantPublicConfig } from "@guntan/types";
import { absoluteUrl, tenantNoIndex } from "./seo";

export const BLOG_PER_PAGE = 12;

/** Header/footer'daki Blog bağlantısı yalnızca yayında yazı varsa gösterilir. */
export function cachedBlogPostCount(tenantId: string) {
  return unstable_cache(() => countPublishedPosts(tenantId).catch(() => 0), ["blog-count", tenantId], { revalidate: 600 })();
}

/** Kategori sayfasındaki "rehberler" bölümü: yalnızca yayındaki, bu kategoriyi ilgili gösteren yazılar. */
export async function cachedGuidesForCategory(tenantId: string, categorySlug: string) {
  const posts = await unstable_cache(() => publishedPostsForCategory(tenantId, categorySlug, 4).catch(() => []), ["blog-category-guides", tenantId, categorySlug], { revalidate: 600 })();
  // unstable_cache sonucu JSON'a çevirir; tarihler önbellekten metin döner, BlogCard Date bekliyor.
  return posts.map((p) => ({
    ...p,
    publishedAt: p.publishedAt ? new Date(p.publishedAt) : null,
    updatedAt: new Date(p.updatedAt),
    createdAt: new Date(p.createdAt),
  }));
}

export function blogImageUrl(host: string, url: string | null | undefined) {
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : absoluteUrl(host, url);
}

const DATE_FMT = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" });

export function blogDate(d: Date | null | undefined) {
  return d ? DATE_FMT.format(d) : "";
}

export function blogRobots(tenant: TenantPublicConfig, noindex: boolean): Metadata["robots"] {
  if (tenantNoIndex(tenant)) return { index: false, follow: false };
  if (noindex) return { index: false, follow: true };
  return { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 };
}

export function blogRssAlternate(tenant: TenantPublicConfig) {
  return { "application/rss+xml": [{ url: absoluteUrl(tenant.tenant.canonicalHost, "/blog/rss.xml"), title: `${tenant.siteName} Blog` }] };
}

export function publisherJsonLd(tenant: TenantPublicConfig) {
  const host = tenant.tenant.canonicalHost;
  const logo = blogImageUrl(host, tenant.logoUrl ?? "/brand/logo.png");
  return {
    "@type": "Organization",
    "@id": `${absoluteUrl(host, "/")}#organization`,
    name: tenant.siteName,
    url: absoluteUrl(host, "/"),
    ...(logo ? { logo: { "@type": "ImageObject", url: logo } } : {}),
  };
}

export function blogPostingJsonLd(tenant: TenantPublicConfig, post: BlogPost, description: string) {
  const host = tenant.tenant.canonicalHost;
  const url = absoluteUrl(host, `/blog/${post.slug}`);
  const image = blogImageUrl(host, post.ogImageUrl || post.coverUrl);
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    headline: post.title.slice(0, 110),
    description,
    inLanguage: "tr-TR",
    ...(image ? { image: [image] } : {}),
    datePublished: post.publishedAt?.toISOString(),
    dateModified: (post.updatedAt > (post.publishedAt ?? post.updatedAt) ? post.updatedAt : post.publishedAt ?? post.updatedAt).toISOString(),
    author: post.authorName
      ? { "@type": "Person", name: post.authorName }
      : { "@type": "Organization", name: tenant.siteName, url: absoluteUrl(host, "/") },
    publisher: publisherJsonLd(tenant),
    wordCount: post.wordCount,
    timeRequired: `PT${post.readingMinutes}M`,
    ...(post.category ? { articleSection: post.category.name } : {}),
    ...(post.tags.length ? { keywords: post.tags.map((t) => t.name).join(", ") } : {}),
    isPartOf: { "@type": "Blog", "@id": `${absoluteUrl(host, "/blog")}#blog`, name: `${tenant.siteName} Blog` },
  };
}

export function faqJsonLd(faq: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

export function blogListJsonLd(tenant: TenantPublicConfig, name: string, description: string, path: string, posts: BlogPostSummary[]) {
  const host = tenant.tenant.canonicalHost;
  return {
    "@context": "https://schema.org",
    "@type": path === "/blog" ? "Blog" : "CollectionPage",
    ...(path === "/blog" ? { "@id": `${absoluteUrl(host, "/blog")}#blog` } : {}),
    name,
    description,
    url: absoluteUrl(host, path),
    inLanguage: "tr-TR",
    publisher: publisherJsonLd(tenant),
    mainEntity: {
      "@type": "ItemList",
      itemListElement: posts.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: absoluteUrl(host, `/blog/${p.slug}`),
        name: p.title,
      })),
    },
  };
}

export function BlogCard({
  post,
  host,
  priority = false,
  heading: Heading = "h2",
}: {
  post: BlogPostSummary;
  host: string;
  priority?: boolean;
  heading?: "h2" | "h3";
}) {
  const href = `/blog/${post.slug}`;
  const img = blogImageUrl(host, post.coverUrl);
  return (
    <article className="blog-card">
      <Link className="blog-card-media" href={href} tabIndex={-1} aria-hidden>
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={post.coverAlt ?? ""} width={640} height={360} loading={priority ? "eager" : "lazy"} decoding="async" />
        ) : (
          <span className="blog-card-ph">{post.category?.name ?? "Blog"}</span>
        )}
      </Link>
      <div className="blog-card-body">
        <div className="blog-meta">
          {post.category ? <Link href={`/blog/kategori/${post.category.slug}`}>{post.category.name}</Link> : null}
          {post.publishedAt ? <time dateTime={post.publishedAt.toISOString()}>{blogDate(post.publishedAt)}</time> : null}
          <span>{post.readingMinutes} dk okuma</span>
        </div>
        <Heading className="blog-card-title">
          <Link href={href}>{post.title}</Link>
        </Heading>
        {post.excerpt ? <p className="blog-card-excerpt">{post.excerpt}</p> : null}
      </div>
    </article>
  );
}

export function BlogGrid({ posts, host, heading }: { posts: BlogPostSummary[]; host: string; heading?: "h2" | "h3" }) {
  return (
    <div className="blog-grid">
      {posts.map((p, i) => (
        <BlogCard key={p.id} post={p} host={host} priority={!heading && i < 3} heading={heading} />
      ))}
    </div>
  );
}

export function BlogPager({ base, page, totalPages }: { base: string; page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  const href = (n: number) => (n <= 1 ? base : `${base}?page=${n}`);
  const pages: number[] = [];
  for (let n = Math.max(1, page - 2); n <= Math.min(totalPages, page + 2); n++) pages.push(n);
  return (
    <nav className="blog-pager" aria-label="Sayfalar">
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev">
          ‹ Önceki
        </Link>
      ) : null}
      {pages[0]! > 1 ? (
        <>
          <Link href={href(1)}>1</Link>
          {pages[0]! > 2 ? <span aria-hidden>…</span> : null}
        </>
      ) : null}
      {pages.map((n) =>
        n === page ? (
          <span key={n} aria-current="page" className="is-current">
            {n}
          </span>
        ) : (
          <Link key={n} href={href(n)}>
            {n}
          </Link>
        ),
      )}
      {pages[pages.length - 1]! < totalPages ? (
        <>
          {pages[pages.length - 1]! < totalPages - 1 ? <span aria-hidden>…</span> : null}
          <Link href={href(totalPages)}>{totalPages}</Link>
        </>
      ) : null}
      {page < totalPages ? (
        <Link href={href(page + 1)} rel="next">
          Sonraki ›
        </Link>
      ) : null}
    </nav>
  );
}

export function BlogTopics({
  categories,
  tags,
  active,
}: {
  categories: { slug: string; name: string; postCount: number }[];
  tags?: { slug: string; name: string; postCount: number }[];
  active?: string;
}) {
  if (!categories.length && !tags?.length) return null;
  return (
    <nav className="blog-topics" aria-label="Blog konuları">
      <Link href="/blog" className={!active ? "is-active" : undefined}>
        Tümü
      </Link>
      {categories.map((c) => (
        <Link key={c.slug} href={`/blog/kategori/${c.slug}`} className={active === `k:${c.slug}` ? "is-active" : undefined}>
          {c.name} <small>{c.postCount}</small>
        </Link>
      ))}
      {tags?.map((t) => (
        <Link key={t.slug} href={`/blog/etiket/${t.slug}`} className={`is-tag${active === `e:${t.slug}` ? " is-active" : ""}`}>
          #{t.name}
        </Link>
      ))}
    </nav>
  );
}
