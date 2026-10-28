import { SEO_BLOG_TOPICS, seoTargetCategorySlug, type SeoBlogTopic } from "@guntan/types";
import { blogSlugTaken, listBlogCategories, saveBlogCategory, saveBlogPost } from "./blog";
import { blogSlug } from "./blog-html";

/**
 * SEO haritasındaki 48 blog konusunu TASLAK olarak yükler (tekrar çalıştırmak güvenlidir; var olan slug atlanır).
 * Yazılar yayına alınmaz: gövdeleri iskelettir, teknik iddialar üretici dokümanıyla doğrulanıp yazı tamamlanınca yayınlanır.
 */

const MODEL_CLUSTER = "Araç modelleri";
const SKELETON_NOTE = "<p><em>Taslak bölüm: içerik yazılacak, teknik bilgi üretici dokümanıyla doğrulanacak.</em></p>";

function esc(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function clusterName(topic: SeoBlogTopic) {
  return topic.target === "/" || topic.target.startsWith("/kategori/") ? topic.cluster : MODEL_CLUSTER;
}

function skeletonBody(topic: SeoBlogTopic) {
  const sections = topic.outline.map((h) => `<h2>${esc(h.charAt(0).toLocaleUpperCase("tr-TR") + h.slice(1))}</h2>\n${SKELETON_NOTE}`);
  const guides = topic.related
    .map((id) => SEO_BLOG_TOPICS.find((t) => t.id === id))
    .filter((t): t is SeoBlogTopic => Boolean(t))
    .map((t) => `<li><a href="/blog/${t.slug}">${esc(t.title)}</a></li>`);
  const tail = [
    `<h2>Uygun parçayı bulun</h2>\n<p>Parça seçiminde şasi numarası ve OEM numarasıyla doğrulama yapın: <a href="${esc(topic.target)}">${esc(topic.anchor)}</a>.</p>`,
    guides.length ? `<h2>İlgili rehberler</h2>\n<ul>${guides.join("")}</ul>` : "",
  ];
  return [...sections, ...tail].filter(Boolean).join("\n");
}

/** Bir mağaza için eksik taslakları ve kategorileri oluşturur; yeni oluşturulan taslak sayısını döner. */
export async function seedBlogPlan(tenantId: string): Promise<{ created: number; existing: number }> {
  const categories = new Map((await listBlogCategories(tenantId)).map((c) => [c.slug, c.id]));
  const order = [...new Set(SEO_BLOG_TOPICS.map(clusterName))];
  for (const [i, name] of order.entries()) {
    const slug = blogSlug(name);
    if (!categories.has(slug)) {
      categories.set(slug, await saveBlogCategory({ tenantId, name, slug, description: null, metaTitle: null, metaDescription: null, sortOrder: i }));
    }
  }
  let created = 0;
  for (const topic of SEO_BLOG_TOPICS) {
    if (await blogSlugTaken(tenantId, topic.slug)) continue;
    const category = seoTargetCategorySlug(topic);
    await saveBlogPost({
      tenantId,
      title: topic.title,
      slug: topic.slug,
      excerpt: null,
      body: skeletonBody(topic),
      coverUrl: null,
      coverAlt: null,
      categoryId: categories.get(blogSlug(clusterName(topic))) ?? null,
      status: "draft",
      publishedAt: null,
      authorName: null,
      metaTitle: null,
      metaDescription: null,
      canonicalUrl: null,
      ogImageUrl: null,
      noindex: false,
      focusKeyword: topic.query,
      relatedCategories: category ? [category] : [],
      relatedProducts: [],
      faq: [],
      tags: [topic.cluster],
    });
    created++;
  }
  return { created, existing: SEO_BLOG_TOPICS.length - created };
}
