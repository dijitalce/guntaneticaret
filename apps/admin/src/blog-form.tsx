import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { blogTagNames, categories, db, getTenantContext, listBlogCategories, tenants, type BlogPost } from "@guntan/db";
import { BlogEditor } from "./blog-editor";
import { faqToText, toLocalInput } from "./blog-input";
import { withBase } from "./paths";
import { assetBase } from "./storefront";
import { Toggle } from "./ui-ext";

/** Yazı oluşturma/düzenleme formu; site değişince kategori listesi için sayfa ?site= ile yeniden açılır. */
export async function BlogPostForm({ post, tenantId }: { post?: BlogPost; tenantId: string }) {
  const [tenantRows, cats, tagNames, catalogCats, tenant] = await Promise.all([
    db.select({ id: tenants.id, name: tenants.name }).from(tenants).orderBy(asc(tenants.name)),
    listBlogCategories(tenantId),
    blogTagNames(tenantId),
    db.select({ slug: categories.slug, name: categories.name }).from(categories).where(eq(categories.isActive, true)).orderBy(asc(categories.name)).limit(800),
    getTenantContext(tenantId),
  ]);
  const host = tenant.url.replace(/^https?:\/\//, "");

  return (
    <form action={withBase(post ? `/api/content/blog/${post.id}` : "/api/content/blog")} method="post" className="blog-form">
      <input type="hidden" name="_action" value="save" />
      <div className="blog-form-main">
        <BlogEditor
          siteName={tenant.name}
          host={host}
          assetBase={assetBase()}
          slugLocked={post?.status === "published"}
          defaults={{
            title: post?.title ?? "",
            slug: post?.slug ?? "",
            excerpt: post?.excerpt ?? "",
            body: post?.body ?? "",
            metaTitle: post?.metaTitle ?? "",
            metaDescription: post?.metaDescription ?? "",
            focusKeyword: post?.focusKeyword ?? "",
            coverUrl: post?.coverUrl ?? "",
            coverAlt: post?.coverAlt ?? "",
            ogImageUrl: post?.ogImageUrl ?? "",
          }}
        />

        <fieldset className="fieldset">
          <legend>İç bağlantılar ve zengin sonuçlar</legend>
          <div className="field">
            <label htmlFor="bf-relcat">İlgili ürün kategorileri</label>
            <input className="input" id="bf-relcat" name="relatedCategories" list="bf-catalog-cats" defaultValue={post?.relatedCategories.join(", ") ?? ""} placeholder="fren-balatasi, fren-diski" />
            <datalist id="bf-catalog-cats">
              {catalogCats.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </datalist>
            <small className="field-hint">Kategori adresleri (slug), virgülle. Yazının altında “Bu konudaki ürünler” bölümünde bağlantı olarak gösterilir.</small>
          </div>
          <div className="field">
            <label htmlFor="bf-relprod">İlgili ürünler</label>
            <textarea className="input mono" id="bf-relprod" name="relatedProducts" rows={2} defaultValue={post?.relatedProducts.join(", ") ?? ""} placeholder="urun-adresi-1, https://site.com/urun/urun-adresi-2" />
            <small className="field-hint">Ürün adresleri veya ürün sayfası linkleri, virgülle (en fazla 12). Ürün kartları yazının sonunda gösterilir.</small>
          </div>
          <div className="field">
            <label htmlFor="bf-faq">Sık sorulan sorular</label>
            <textarea className="input" id="bf-faq" name="faq" rows={5} defaultValue={post ? faqToText(post.faq) : ""} placeholder={"Fren balatası kaç km'de değişir? | Kullanıma göre genelde 30.000–50.000 km arasında.\nBalata değişiminde disk de değişir mi? | Disk kalınlığı sınırın altındaysa evet."} />
            <small className="field-hint">Her satıra “Soru | Cevap”. Yazının sonunda SSS olarak gösterilir ve FAQPage yapısal verisi eklenir.</small>
          </div>
        </fieldset>
      </div>

      <aside className="blog-form-side">
        <div className="panel panel-pad form-stack">
          <div className="field">
            <label htmlFor="bf-status">Durum</label>
            <select className="select" id="bf-status" name="status" defaultValue={post?.status ?? "draft"}>
              <option value="draft">Taslak</option>
              <option value="published">Yayında / zamanlanmış</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="bf-date">Yayın tarihi</label>
            <input className="input" id="bf-date" name="publishedAt" type="datetime-local" defaultValue={toLocalInput(post?.publishedAt)} />
            <small className="field-hint">İleri bir tarih seçerseniz yazı o saatte yayına girer. Boşsa kaydettiğiniz an.</small>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit">
              {post ? "Kaydet" : "Yazıyı oluştur"}
            </button>
            <Link className="btn btn-ghost" href="/content/blog">
              Vazgeç
            </Link>
          </div>
        </div>

        <div className="panel panel-pad form-stack">
          <div className="field">
            <label htmlFor="bf-tenant">Site</label>
            <select className="select" id="bf-tenant" name="tenantId" defaultValue={tenantId} required>
              {tenantRows.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {!post && tenantRows.length > 1 ? <small className="field-hint">Kategori listesi için siteyi sayfanın üstünden seçin.</small> : null}
          </div>
          <div className="field">
            <label htmlFor="bf-cat">Kategori</label>
            <select className="select" id="bf-cat" name="categoryId" defaultValue={post?.categoryId ?? ""}>
              <option value="">— Kategorisiz —</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <small className="field-hint">
              <Link href="/content/blog/categories">Kategorileri yönet</Link>
            </small>
          </div>
          <div className="field">
            <label htmlFor="bf-tags">Etiketler</label>
            <input className="input" id="bf-tags" name="tags" list="bf-tag-list" defaultValue={post?.tags.map((t) => t.name).join(", ") ?? ""} placeholder="fren, bakım, renault" />
            <datalist id="bf-tag-list">
              {tagNames.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <small className="field-hint">Virgülle ayırın. {"3+"} yazısı olan etiket sayfaları dizine eklenir.</small>
          </div>
          <div className="field">
            <label htmlFor="bf-author">Yazar</label>
            <input className="input" id="bf-author" name="authorName" maxLength={191} defaultValue={post?.authorName ?? ""} placeholder={`Boşsa ${tenant.name}`} />
          </div>
        </div>

        <div className="panel panel-pad form-stack">
          <div className="field">
            <label htmlFor="bf-canonical">Canonical adres</label>
            <input className="input mono" id="bf-canonical" name="canonicalUrl" defaultValue={post?.canonicalUrl ?? ""} placeholder="Boş: yazının kendi adresi" />
            <small className="field-hint">Yalnızca içerik başka bir adreste de yayınlanıyorsa doldurun.</small>
          </div>
          <Toggle name="noindex" defaultChecked={post?.noindex ?? false} label="Arama motorlarından gizle (noindex)" hint="Yazı yayında kalır ama Google'a eklenmez ve site haritasından çıkar." />
        </div>
      </aside>
    </form>
  );
}
