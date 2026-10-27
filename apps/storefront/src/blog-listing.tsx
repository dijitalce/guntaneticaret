import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import {
  BLOG_TAG_INDEX_MIN_POSTS,
  blogCategoryBySlug,
  blogTagBySlug,
  listPublishedPosts,
  popularBlogTags,
  publishedBlogCategories,
} from "@guntan/db";
import { getTenant } from "./tenant";
import { JsonLd, absoluteUrl, breadcrumbJsonLd, pageTitle, pagination } from "./seo";
import { BLOG_PER_PAGE, BlogGrid, BlogPager, BlogTopics, blogImageUrl, blogListJsonLd, blogRobots, blogRssAlternate } from "./blog";

export type BlogListKind = { kind: "all" } | { kind: "category"; slug: string } | { kind: "tag"; slug: string };

type Sp = Record<string, string | undefined>;

/** Liste sayfalarının başlık, açıklama ve yolu; metadata ile sayfa aynı veriyi kullanır. */
const loadList = cache(async (key: string, page: number) => {
  const list = JSON.parse(key) as BlogListKind;
  const tenant = await getTenant();
  const tenantId = tenant.tenant.id;
  const [categories, tags] = await Promise.all([publishedBlogCategories(tenantId), popularBlogTags(tenantId, 12)]);
  if (list.kind === "category") {
    const cat = await blogCategoryBySlug(tenantId, list.slug);
    if (!cat) return null;
    const result = await listPublishedPosts(tenantId, { page, perPage: BLOG_PER_PAGE, categoryId: cat.id });
    return {
      tenant,
      categories,
      tags,
      result,
      path: `/blog/kategori/${cat.slug}`,
      heading: cat.name,
      metaTitle: cat.metaTitle || `${cat.name} – Blog`,
      description: cat.metaDescription || cat.description?.slice(0, 160) || `${cat.name} hakkında ${tenant.siteName} rehber ve bilgi yazıları.`,
      intro: cat.description,
      crumb: cat.name,
      active: `k:${cat.slug}`,
      noindex: cat.postCount === 0,
    };
  }
  if (list.kind === "tag") {
    const tag = await blogTagBySlug(tenantId, list.slug);
    if (!tag) return null;
    const result = await listPublishedPosts(tenantId, { page, perPage: BLOG_PER_PAGE, tagSlug: tag.slug });
    return {
      tenant,
      categories,
      tags,
      result,
      path: `/blog/etiket/${tag.slug}`,
      heading: `“${tag.name}” yazıları`,
      metaTitle: `${tag.name} – Blog yazıları`,
      description: `${tag.name} konusundaki ${tag.postCount} yazı: ${tenant.siteName} oto yedek parça rehberleri, bakım ve arıza ipuçları.`,
      intro: null,
      crumb: `#${tag.name}`,
      active: `e:${tag.slug}`,
      // Az yazılı etiket sayfaları ince içerik sayılır.
      noindex: tag.postCount < BLOG_TAG_INDEX_MIN_POSTS,
    };
  }
  const result = await listPublishedPosts(tenantId, { page, perPage: BLOG_PER_PAGE });
  return {
    tenant,
    categories,
    tags,
    result,
    path: "/blog",
    heading: "Blog",
    metaTitle: "Blog – Oto yedek parça rehberleri ve bakım ipuçları",
    description: `${tenant.siteName} blog: araç bakımı, parça seçimi, arıza belirtileri ve oto yedek parça rehberleri.`,
    intro: "Araç bakımı, doğru parça seçimi ve arıza belirtileri hakkında uzman ekibimizin hazırladığı rehberler.",
    crumb: null,
    active: undefined,
    noindex: false,
  };
});

export async function blogListMetadata(list: BlogListKind, sp: Sp): Promise<Metadata> {
  const pageNo = Math.max(1, Math.floor(Number(sp.page ?? 1)) || 1);
  const data = await loadList(JSON.stringify(list), pageNo);
  if (!data) return { title: "Sayfa bulunamadı", robots: { index: false, follow: true } };
  const { tenant } = data;
  const pg = pagination(sp, data.path);
  const title = pageTitle(tenant, `${data.metaTitle}${pg.suffix}`);
  const url = absoluteUrl(tenant.tenant.canonicalHost, pg.path);
  const image = blogImageUrl(tenant.tenant.canonicalHost, data.result.items[0]?.coverUrl ?? tenant.ogImageUrl);
  return {
    title: { absolute: title },
    description: data.description,
    alternates: { canonical: url, types: blogRssAlternate(tenant) },
    robots: blogRobots(tenant, data.noindex || data.result.items.length === 0),
    openGraph: { title, description: data.description, url, type: "website", siteName: tenant.siteName, locale: "tr_TR", ...(image ? { images: [image] } : {}) },
    twitter: { card: image ? "summary_large_image" : "summary", title, description: data.description, ...(image ? { images: [image] } : {}) },
  };
}

export async function BlogListing({ list, sp }: { list: BlogListKind; sp: Sp }) {
  const pageNo = Math.max(1, Math.floor(Number(sp.page ?? 1)) || 1);
  const data = await loadList(JSON.stringify(list), pageNo);
  if (!data) notFound();
  const { tenant, result } = data;
  const host = tenant.tenant.canonicalHost;
  const totalPages = Math.max(1, Math.ceil(result.total / BLOG_PER_PAGE));
  if (pageNo > totalPages) notFound();
  const crumbs = [{ name: "Ana Sayfa", path: "/" }, { name: "Blog", path: "/blog" }, ...(data.crumb ? [{ name: data.crumb, path: data.path }] : [])];

  return (
    <div className="container page-surface blog-page">
      <JsonLd data={[breadcrumbJsonLd(host, crumbs), blogListJsonLd(tenant, data.heading, data.description, data.path, result.items)]} />
      <nav className="breadcrumb" aria-label="Konum">
        <Link href="/">Ana Sayfa</Link>
        {" › "}
        {data.crumb ? (
          <>
            <Link href="/blog">Blog</Link>
            {" › "}
            {data.crumb}
          </>
        ) : (
          "Blog"
        )}
      </nav>
      <header className="blog-hero">
        <h1>
          {data.heading}
          {pageNo > 1 ? <small> – Sayfa {pageNo}</small> : null}
        </h1>
        {data.intro && pageNo === 1 ? <p>{data.intro}</p> : null}
      </header>
      <BlogTopics categories={data.categories} tags={list.kind === "all" ? data.tags.filter((t) => t.postCount >= 2) : undefined} active={data.active} />
      {result.items.length ? (
        <BlogGrid posts={result.items} host={host} />
      ) : (
        <div className="empty-state">
          <h2>Henüz yazı yok</h2>
          <p>
            Yakında burada bakım ve parça rehberleri yayınlanacak. Bu arada <Link href="/">ürünlerimize göz atın</Link>.
          </p>
        </div>
      )}
      <BlogPager base={data.path} page={pageNo} totalPages={totalPages} />
    </div>
  );
}
