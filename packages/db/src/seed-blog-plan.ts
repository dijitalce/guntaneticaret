import { eq } from "drizzle-orm";
import { SEO_BLOG_TOPICS, seoTargetCategorySlug, type SeoBlogTopic } from "@guntan/types";
import { pool, db } from "./client";
import { tenants } from "./schema/tenant";
import { blogSlugTaken, listBlogCategories, saveBlogCategory, saveBlogPost } from "./ext/blog";
import { blogSlug } from "./ext/blog-html";

/**
 * SEO haritasındaki 48 blog konusunu TASLAK olarak yükler (tekrar çalıştırmak güvenlidir; var olan slug atlanır).
 * Yazılar yayına alınmaz: gövdeleri iskelettir, teknik iddialar üretici dokümanıyla doğrulanıp yazı tamamlanınca
 * admin > İçerik > Blog'dan yayınlanır. Hedef kategori sayfasında "rehberler" bölümü yayından sonra görünür.
 *   TENANT_SLUG=<slug> ile tek mağaza seçilir; boşsa tüm mağazalar.
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

const targetTenants = await db.select({ id: tenants.id, slug: tenants.slug }).from(tenants).where(process.env.TENANT_SLUG ? eq(tenants.slug, process.env.TENANT_SLUG) : undefined);

for (const tenant of targetTenants) {
  const existing = new Map((await listBlogCategories(tenant.id)).map((c) => [c.slug, c.id]));
  const order = [...new Set(SEO_BLOG_TOPICS.map(clusterName))];
  for (const [i, name] of order.entries()) {
    const slug = blogSlug(name);
    if (!existing.has(slug)) {
      existing.set(slug, await saveBlogCategory({ tenantId: tenant.id, name, slug, description: null, metaTitle: null, metaDescription: null, sortOrder: i }));
    }
  }
  let created = 0;
  for (const topic of SEO_BLOG_TOPICS) {
    if (await blogSlugTaken(tenant.id, topic.slug)) continue;
    const category = seoTargetCategorySlug(topic);
    await saveBlogPost({
      tenantId: tenant.id,
      title: topic.title,
      slug: topic.slug,
      excerpt: null,
      body: skeletonBody(topic),
      coverUrl: null,
      coverAlt: null,
      categoryId: existing.get(blogSlug(clusterName(topic))) ?? null,
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
  console.log(`${tenant.slug}: ${created} taslak oluşturuldu, ${SEO_BLOG_TOPICS.length - created} zaten vardı.`);
}

await pool.end();
