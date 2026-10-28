import { SEO_BLOG_TOPICS, seoTargetCategorySlug, type SeoBlogTopic } from "@guntan/types";
import { PLAN_ARTICLES } from "../content/blog-plan-articles";
import { blogPlanDraftState, listBlogCategories, saveBlogCategory, saveBlogPost } from "./blog";
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

/** Metni yazılmış konu için tam gövde; yazılmamışsa iskelet. Her iki durumda satış sayfası ve ilgili rehber bağlantıları eklenir. */
export function planBody(topic: SeoBlogTopic): string {
  const art = PLAN_ARTICLES[topic.id];
  const guides = topic.related
    .map((id) => SEO_BLOG_TOPICS.find((t) => t.id === id))
    .filter((t): t is SeoBlogTopic => Boolean(t))
    .map((t) => `<li><a href="/blog/${t.slug}">${esc(t.title)}</a></li>`);
  const tail = [
    `<h2>Uygun parçayı nasıl bulursunuz?</h2>\n<p>Parça seçiminde şasi numarası ve OEM numarasıyla doğrulama yapın; aracınıza uygun ürünleri <a href="${esc(topic.target)}">${esc(topic.anchor)}</a> sayfasından inceleyebilirsiniz.</p>`,
    guides.length ? `<h2>İlgili rehberler</h2>\n<ul>${guides.join("")}</ul>` : "",
  ];
  const head = art
    ? [`<p>${esc(art.intro)}</p>`, ...art.sections.map(([h, p]) => `<h2>${esc(h)}</h2>\n<p>${esc(p)}</p>`)]
    : topic.outline.map((h) => `<h2>${esc(h.charAt(0).toLocaleUpperCase("tr-TR") + h.slice(1))}</h2>\n${SKELETON_NOTE}`);
  return [...head, ...tail].filter(Boolean).join("\n");
}

/**
 * Bir mağaza için eksik taslakları ve kategorileri oluşturur. Daha önce iskelet olarak yüklenmiş ve el değmemiş taslaklar,
 * metni yazılmışsa tam içerikle güncellenir; düzenlenmiş ya da yayınlanmış yazılara dokunulmaz.
 */
export async function seedBlogPlan(tenantId: string): Promise<{ created: number; updated: number; existing: number }> {
  const categories = new Map((await listBlogCategories(tenantId)).map((c) => [c.slug, c.id]));
  const order = [...new Set(SEO_BLOG_TOPICS.map(clusterName))];
  for (const [i, name] of order.entries()) {
    const slug = blogSlug(name);
    if (!categories.has(slug)) {
      categories.set(slug, await saveBlogCategory({ tenantId, name, slug, description: null, metaTitle: null, metaDescription: null, sortOrder: i }));
    }
  }
  let created = 0;
  let updated = 0;
  for (const topic of SEO_BLOG_TOPICS) {
    const state = await blogPlanDraftState(tenantId, topic.slug);
    const art = PLAN_ARTICLES[topic.id];
    if (state && !(state.untouchedDraft && art)) continue;
    const category = seoTargetCategorySlug(topic);
    const input = {
      tenantId,
      title: topic.title,
      slug: topic.slug,
      excerpt: art?.meta ?? null,
      body: planBody(topic),
      coverUrl: null,
      coverAlt: null,
      categoryId: categories.get(blogSlug(clusterName(topic))) ?? null,
      status: "draft" as const,
      publishedAt: null,
      authorName: null,
      metaTitle: art?.metaTitle ?? null,
      metaDescription: art?.meta ?? null,
      canonicalUrl: null,
      ogImageUrl: null,
      noindex: false,
      focusKeyword: art?.kw ?? topic.query,
      relatedCategories: category ? [category] : [],
      relatedProducts: [],
      faq: (art?.faq ?? []).map(([q, a]) => ({ q, a })),
      tags: [topic.cluster],
    };
    if (state) {
      await saveBlogPost(input, state.id);
      updated++;
    } else {
      await saveBlogPost(input);
      created++;
    }
  }
  return { created, updated, existing: SEO_BLOG_TOPICS.length - created - updated };
}
