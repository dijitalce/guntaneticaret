import { randomUUID } from "node:crypto";
import { sql, type SQL } from "drizzle-orm";
import { ensureExtTables } from "./tables";
import { exec, first, num, parseJson, rows } from "./sql";
import { blogReadingMinutes, blogSlug, blogWordCount, sanitizeBlogHtml } from "./blog-html";

export type BlogStatus = "draft" | "published";
export type BlogFaq = { q: string; a: string };
export type BlogTag = { slug: string; name: string };

export type BlogCategory = {
  id: string;
  tenantId: string;
  slug: string;
  name: string;
  description: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  sortOrder: number;
  postCount: number;
  updatedAt: Date;
};

export type BlogPostSummary = {
  id: string;
  tenantId: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverUrl: string | null;
  coverAlt: string | null;
  status: BlogStatus;
  publishedAt: Date | null;
  updatedAt: Date;
  createdAt: Date;
  authorName: string | null;
  noindex: boolean;
  metaDescription: string | null;
  wordCount: number;
  readingMinutes: number;
  category: { id: string; slug: string; name: string } | null;
};

export type BlogPost = BlogPostSummary & {
  body: string;
  categoryId: string | null;
  metaTitle: string | null;
  canonicalUrl: string | null;
  ogImageUrl: string | null;
  focusKeyword: string | null;
  relatedCategories: string[];
  relatedProducts: string[];
  faq: BlogFaq[];
  tags: BlogTag[];
};

/** /blog altında yazı adresi olarak kullanılamayan yollar. */
export const BLOG_RESERVED_SLUGS = ["kategori", "etiket", "rss.xml", "feed", "sayfa", "ara"];

/** Bu kadar yazısı olmayan etiket sayfası ince içerik sayılır: noindex ve site haritası dışı. */
export const BLOG_TAG_INDEX_MIN_POSTS = 3;

type ArticleRow = {
  id: string;
  tenant_id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body?: string;
  cover_url: string | null;
  cover_alt: string | null;
  category_id: string | null;
  status: string;
  published_at: Date | string | null;
  author_name: string | null;
  meta_title?: string | null;
  meta_description: string | null;
  canonical_url?: string | null;
  og_image_url?: string | null;
  noindex: number;
  focus_keyword?: string | null;
  related_categories?: string | null;
  related_products?: string | null;
  faq?: unknown;
  word_count: number;
  created_at: Date | string;
  updated_at: Date | string;
  cat_slug: string | null;
  cat_name: string | null;
};

const SUMMARY_COLS = sql.raw(`a.id, a.tenant_id, a.slug, a.title, a.excerpt, a.cover_url, a.cover_alt, a.category_id, a.status,
  a.published_at, a.author_name, a.meta_description, a.noindex, a.word_count, a.created_at, a.updated_at,
  c.slug cat_slug, c.name cat_name`);
const FULL_COLS = sql.raw(`a.*, c.slug cat_slug, c.name cat_name`);
const LIVE = sql.raw(`a.status = 'published' and a.published_at is not null and a.published_at <= current_timestamp`);

function date(v: Date | string | null | undefined): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** JS Date'i oturum saat diliminden bağımsız yazar (mysql2 "Z" + sunucu saat dilimi farkı kaymasını önler). */
function tsParam(d: Date | null): SQL {
  return d ? sql`from_unixtime(${Math.floor(d.getTime() / 1000)})` : sql`null`;
}

function listCol(v: string | null | undefined): string[] {
  return (v ?? "")
    .split(/[,\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function toSummary(r: ArticleRow): BlogPostSummary {
  const words = num(r.word_count);
  return {
    id: r.id,
    tenantId: r.tenant_id,
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    coverUrl: r.cover_url,
    coverAlt: r.cover_alt,
    status: r.status === "published" ? "published" : "draft",
    publishedAt: date(r.published_at),
    updatedAt: date(r.updated_at) ?? new Date(),
    createdAt: date(r.created_at) ?? new Date(),
    authorName: r.author_name,
    noindex: num(r.noindex) === 1,
    metaDescription: r.meta_description,
    wordCount: words,
    readingMinutes: blogReadingMinutes(words),
    category: r.category_id && r.cat_slug ? { id: r.category_id, slug: r.cat_slug, name: r.cat_name ?? r.cat_slug } : null,
  };
}

function toPost(r: ArticleRow, tags: BlogTag[]): BlogPost {
  return {
    ...toSummary(r),
    body: r.body ?? "",
    categoryId: r.category_id,
    metaTitle: r.meta_title ?? null,
    canonicalUrl: r.canonical_url ?? null,
    ogImageUrl: r.og_image_url ?? null,
    focusKeyword: r.focus_keyword ?? null,
    relatedCategories: listCol(r.related_categories),
    relatedProducts: listCol(r.related_products),
    faq: parseJson<BlogFaq[]>(r.faq, []).filter((f) => f && f.q && f.a),
    tags,
  };
}

async function tagsFor(ids: string[]): Promise<Map<string, BlogTag[]>> {
  const map = new Map<string, BlogTag[]>();
  if (!ids.length) return map;
  const list = await rows<{ article_id: string; slug: string; name: string }>(
    sql`select article_id, slug, name from blog_article_tags where article_id in (${sql.join(ids.map((i) => sql`${i}`), sql`, `)}) order by name`,
  );
  for (const t of list) {
    const arr = map.get(t.article_id) ?? [];
    arr.push({ slug: t.slug, name: t.name });
    map.set(t.article_id, arr);
  }
  return map;
}

/* ——— Yönetim ——— */

export type BlogPostInput = {
  tenantId: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  coverUrl: string | null;
  coverAlt: string | null;
  categoryId: string | null;
  status: BlogStatus;
  publishedAt: Date | null;
  authorName: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  ogImageUrl: string | null;
  noindex: boolean;
  focusKeyword: string | null;
  relatedCategories: string[];
  relatedProducts: string[];
  faq: BlogFaq[];
  tags: string[];
};

export async function listBlogPostsAdmin(opts: { tenantId?: string | null; status?: string | null; q?: string | null; limit?: number; offset?: number } = {}) {
  await ensureExtTables();
  const where: SQL[] = [sql`1 = 1`];
  if (opts.tenantId) where.push(sql`a.tenant_id = ${opts.tenantId}`);
  if (opts.status === "draft") where.push(sql`a.status = 'draft'`);
  if (opts.status === "published") where.push(LIVE);
  if (opts.status === "scheduled") where.push(sql`a.status = 'published' and a.published_at > current_timestamp`);
  if (opts.q) where.push(sql`(a.title like ${`%${opts.q}%`} or a.slug like ${`%${opts.q}%`})`);
  const cond = sql.join(where, sql` and `);
  const list = await rows<ArticleRow>(sql`select ${SUMMARY_COLS}, a.focus_keyword, a.meta_title from blog_articles a
    left join blog_categories c on c.id = a.category_id
    where ${cond} order by coalesce(a.published_at, a.updated_at) desc limit ${opts.limit ?? 50} offset ${opts.offset ?? 0}`);
  const [c] = await rows<{ c: number }>(sql`select count(*) c from blog_articles a where ${cond}`);
  return {
    items: list.map((r) => ({ ...toSummary(r), metaTitle: r.meta_title ?? null, focusKeyword: r.focus_keyword ?? null })),
    total: num(c?.c),
  };
}

export async function blogAdminCounts(tenantId?: string | null) {
  await ensureExtTables();
  const t = tenantId ? sql`where a.tenant_id = ${tenantId}` : sql``;
  const r = await first<{ total: number; live: number; draft: number; scheduled: number }>(sql`select count(*) total,
      sum(${LIVE}) live,
      sum(a.status = 'draft') draft,
      sum(a.status = 'published' and a.published_at > current_timestamp) scheduled
    from blog_articles a ${t}`);
  return { total: num(r?.total), live: num(r?.live), draft: num(r?.draft), scheduled: num(r?.scheduled) };
}

export async function getBlogPost(id: string): Promise<BlogPost | null> {
  await ensureExtTables();
  const r = await first<ArticleRow>(sql`select ${FULL_COLS} from blog_articles a left join blog_categories c on c.id = a.category_id where a.id = ${id} limit 1`);
  if (!r) return null;
  return toPost(r, (await tagsFor([r.id])).get(r.id) ?? []);
}

export async function blogSlugTaken(tenantId: string, slug: string, exceptId?: string) {
  await ensureExtTables();
  const r = await first<{ id: string }>(
    sql`select id from blog_articles where tenant_id = ${tenantId} and slug = ${slug} ${exceptId ? sql`and id <> ${exceptId}` : sql``} limit 1`,
  );
  return Boolean(r);
}

export async function saveBlogPost(input: BlogPostInput, id?: string): Promise<string> {
  await ensureExtTables();
  const body = sanitizeBlogHtml(input.body);
  const words = blogWordCount(body);
  const postId = id ?? randomUUID();
  // Yayına alınırken tarih girilmemişse şimdi yayınlanır.
  const publishedAt = input.status === "published" ? (input.publishedAt ?? new Date()) : input.publishedAt;
  const faq = input.faq.length ? JSON.stringify(input.faq.slice(0, 30)) : null;
  const values: Record<string, unknown> = {
    slug: input.slug,
    title: input.title,
    excerpt: input.excerpt,
    body,
    cover_url: input.coverUrl,
    cover_alt: input.coverAlt,
    category_id: input.categoryId,
    status: input.status,
    published_at: tsParam(publishedAt ?? null),
    author_name: input.authorName,
    meta_title: input.metaTitle,
    meta_description: input.metaDescription,
    canonical_url: input.canonicalUrl,
    og_image_url: input.ogImageUrl,
    noindex: input.noindex ? 1 : 0,
    focus_keyword: input.focusKeyword,
    related_categories: input.relatedCategories.join(",") || null,
    related_products: input.relatedProducts.join(",") || null,
    faq,
    word_count: words,
  };
  if (id) {
    const set = sql.join(
      Object.entries(values).map(([k, v]) => sql`${sql.raw(k)} = ${v}`),
      sql`, `,
    );
    await exec(sql`update blog_articles set ${set}, tenant_id = ${input.tenantId} where id = ${id}`);
  } else {
    const cols = ["id", "tenant_id", ...Object.keys(values)];
    const vals = [postId, input.tenantId, ...Object.values(values)];
    await exec(sql`insert into blog_articles (${sql.raw(cols.join(", "))}) values (${sql.join(vals.map((v) => sql`${v}`), sql`, `)})`);
  }
  await exec(sql`delete from blog_article_tags where article_id = ${postId}`);
  const tags = new Map<string, string>();
  for (const name of input.tags) {
    const n = name.trim().slice(0, 80);
    const s = blogSlug(n);
    if (s && !tags.has(s)) tags.set(s, n);
  }
  for (const [slug, name] of [...tags].slice(0, 20)) {
    await exec(sql`insert into blog_article_tags (article_id, tenant_id, slug, name) values (${postId}, ${input.tenantId}, ${slug}, ${name})`);
  }
  return postId;
}

export async function setBlogPostStatus(id: string, status: BlogStatus) {
  await ensureExtTables();
  if (status === "published") {
    await exec(sql`update blog_articles set status = 'published', published_at = coalesce(published_at, current_timestamp) where id = ${id}`);
  } else {
    await exec(sql`update blog_articles set status = 'draft' where id = ${id}`);
  }
}

export async function deleteBlogPost(id: string) {
  await ensureExtTables();
  await exec(sql`delete from blog_article_tags where article_id = ${id}`);
  await exec(sql`delete from blog_articles where id = ${id}`);
}

type CategoryRow = {
  id: string;
  tenant_id: string;
  slug: string;
  name: string;
  description: string | null;
  meta_title: string | null;
  meta_description: string | null;
  sort_order: number;
  post_count: number;
  updated_at: Date | string;
};

function toCategory(r: CategoryRow): BlogCategory {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    metaTitle: r.meta_title,
    metaDescription: r.meta_description,
    sortOrder: num(r.sort_order),
    postCount: num(r.post_count),
    updatedAt: date(r.updated_at) ?? new Date(),
  };
}

/** Yönetim: tüm kategoriler; postCount yayındaki yazı sayısıdır. */
export async function listBlogCategories(tenantId?: string | null): Promise<BlogCategory[]> {
  await ensureExtTables();
  const list = await rows<CategoryRow>(sql`select c.*, (select count(*) from blog_articles a where a.category_id = c.id and ${LIVE}) post_count
    from blog_categories c ${tenantId ? sql`where c.tenant_id = ${tenantId}` : sql``}
    order by c.sort_order, c.name`);
  return list.map(toCategory);
}

export async function getBlogCategory(id: string): Promise<BlogCategory | null> {
  await ensureExtTables();
  const r = await first<CategoryRow>(sql`select c.*, 0 post_count from blog_categories c where c.id = ${id} limit 1`);
  return r ? toCategory(r) : null;
}

export type BlogCategoryInput = {
  tenantId: string;
  name: string;
  slug: string;
  description: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  sortOrder: number;
};

export async function saveBlogCategory(input: BlogCategoryInput, id?: string): Promise<string> {
  await ensureExtTables();
  if (id) {
    await exec(sql`update blog_categories set tenant_id = ${input.tenantId}, name = ${input.name}, slug = ${input.slug},
      description = ${input.description}, meta_title = ${input.metaTitle}, meta_description = ${input.metaDescription}, sort_order = ${input.sortOrder}
      where id = ${id}`);
    return id;
  }
  const newId = randomUUID();
  await exec(sql`insert into blog_categories (id, tenant_id, name, slug, description, meta_title, meta_description, sort_order)
    values (${newId}, ${input.tenantId}, ${input.name}, ${input.slug}, ${input.description}, ${input.metaTitle}, ${input.metaDescription}, ${input.sortOrder})`);
  return newId;
}

export async function deleteBlogCategory(id: string) {
  await ensureExtTables();
  await exec(sql`update blog_articles set category_id = null where category_id = ${id}`);
  await exec(sql`delete from blog_categories where id = ${id}`);
}

export async function blogTagNames(tenantId: string): Promise<string[]> {
  await ensureExtTables();
  const list = await rows<{ name: string }>(sql`select min(name) name from blog_article_tags where tenant_id = ${tenantId} group by slug order by count(*) desc limit 200`);
  return list.map((t) => t.name);
}

/* ——— Vitrin ——— */

export async function listPublishedPosts(
  tenantId: string,
  opts: { page?: number; perPage?: number; categoryId?: string; tagSlug?: string } = {},
): Promise<{ items: BlogPostSummary[]; total: number }> {
  await ensureExtTables();
  const perPage = Math.min(48, Math.max(1, opts.perPage ?? 12));
  const page = Math.max(1, opts.page ?? 1);
  const where: SQL[] = [sql`a.tenant_id = ${tenantId}`, LIVE];
  if (opts.categoryId) where.push(sql`a.category_id = ${opts.categoryId}`);
  if (opts.tagSlug) where.push(sql`exists (select 1 from blog_article_tags t where t.article_id = a.id and t.slug = ${opts.tagSlug})`);
  const cond = sql.join(where, sql` and `);
  const list = await rows<ArticleRow>(sql`select ${SUMMARY_COLS} from blog_articles a left join blog_categories c on c.id = a.category_id
    where ${cond} order by a.published_at desc, a.id limit ${perPage} offset ${(page - 1) * perPage}`);
  const [c] = await rows<{ c: number }>(sql`select count(*) c from blog_articles a where ${cond}`);
  return { items: list.map(toSummary), total: num(c?.c) };
}

export async function getPublishedPostBySlug(tenantId: string, slug: string): Promise<BlogPost | null> {
  await ensureExtTables();
  const r = await first<ArticleRow>(sql`select ${FULL_COLS} from blog_articles a left join blog_categories c on c.id = a.category_id
    where a.tenant_id = ${tenantId} and a.slug = ${slug} and ${LIVE} limit 1`);
  if (!r) return null;
  return toPost(r, (await tagsFor([r.id])).get(r.id) ?? []);
}

/** Ortak etiket sayısı ve aynı kategori ağırlıklı benzer yazılar; yetmezse en yeniler. */
export async function relatedBlogPosts(post: BlogPost, limit = 3): Promise<BlogPostSummary[]> {
  await ensureExtTables();
  const tagSlugs = post.tags.map((t) => t.slug);
  const tagScore = tagSlugs.length
    ? sql`(select count(*) from blog_article_tags t where t.article_id = a.id and t.slug in (${sql.join(tagSlugs.map((s) => sql`${s}`), sql`, `)}))`
    : sql`0`;
  const catScore = post.categoryId ? sql`(a.category_id = ${post.categoryId})` : sql`0`;
  const list = await rows<ArticleRow>(sql`select ${SUMMARY_COLS} from blog_articles a left join blog_categories c on c.id = a.category_id
    where a.tenant_id = ${post.tenantId} and a.id <> ${post.id} and ${LIVE}
    order by (${tagScore} * 2 + ${catScore}) desc, a.published_at desc limit ${limit}`);
  return list.map(toSummary);
}

export async function publishedBlogCategories(tenantId: string): Promise<BlogCategory[]> {
  return (await listBlogCategories(tenantId)).filter((c) => c.postCount > 0);
}

export async function blogCategoryBySlug(tenantId: string, slug: string): Promise<BlogCategory | null> {
  return (await listBlogCategories(tenantId)).find((c) => c.slug === slug) ?? null;
}

export async function blogTagBySlug(tenantId: string, slug: string): Promise<(BlogTag & { postCount: number }) | null> {
  await ensureExtTables();
  const r = await first<{ name: string; c: number }>(sql`select min(t.name) name, count(*) c from blog_article_tags t
    join blog_articles a on a.id = t.article_id
    where t.tenant_id = ${tenantId} and t.slug = ${slug} and ${LIVE}`);
  if (!r || !num(r.c)) return null;
  return { slug, name: r.name, postCount: num(r.c) };
}

export async function popularBlogTags(tenantId: string, limit = 20): Promise<(BlogTag & { postCount: number })[]> {
  await ensureExtTables();
  const list = await rows<{ slug: string; name: string; c: number }>(sql`select t.slug, min(t.name) name, count(*) c from blog_article_tags t
    join blog_articles a on a.id = t.article_id
    where t.tenant_id = ${tenantId} and ${LIVE}
    group by t.slug order by c desc, name limit ${limit}`);
  return list.map((t) => ({ slug: t.slug, name: t.name, postCount: num(t.c) }));
}

/** Site haritası: noindex ve başka adrese canonical veren yazılar hariç. */
export async function blogSitemapData(tenantId: string) {
  await ensureExtTables();
  const posts = await rows<{ slug: string; updated_at: Date | string; published_at: Date | string; cover_url: string | null; canonical_url: string | null }>(
    sql`select a.slug, a.updated_at, a.published_at, a.cover_url, a.canonical_url from blog_articles a
      where a.tenant_id = ${tenantId} and ${LIVE} and a.noindex = 0 order by a.published_at desc limit 5000`,
  );
  const categories = await rows<{ slug: string; last: Date | string }>(sql`select c.slug, max(a.updated_at) last from blog_categories c
    join blog_articles a on a.category_id = c.id and ${LIVE} and a.noindex = 0
    where c.tenant_id = ${tenantId} group by c.id, c.slug`);
  const tags = await rows<{ slug: string; last: Date | string }>(sql`select t.slug, max(a.updated_at) last from blog_article_tags t
    join blog_articles a on a.id = t.article_id and ${LIVE} and a.noindex = 0
    where t.tenant_id = ${tenantId} group by t.slug having count(*) >= ${BLOG_TAG_INDEX_MIN_POSTS}`);
  return {
    posts: posts.map((p) => ({ slug: p.slug, updatedAt: date(p.updated_at), publishedAt: date(p.published_at), coverUrl: p.cover_url, canonicalUrl: p.canonical_url })),
    categories: categories.map((c) => ({ slug: c.slug, updatedAt: date(c.last) })),
    tags: tags.map((t) => ({ slug: t.slug, updatedAt: date(t.last) })),
  };
}

export async function countPublishedPosts(tenantId: string): Promise<number> {
  await ensureExtTables();
  const r = await first<{ c: number }>(sql`select count(*) c from blog_articles a where a.tenant_id = ${tenantId} and ${LIVE}`);
  return num(r?.c);
}

/** RSS / llms.txt için son yazılar (gövde dahil değil). */
export async function latestBlogPosts(tenantId: string, limit = 20): Promise<BlogPostSummary[]> {
  return (await listPublishedPosts(tenantId, { perPage: limit })).items;
}
