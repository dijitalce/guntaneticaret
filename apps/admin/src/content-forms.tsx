import Link from "next/link";
import { asc } from "drizzle-orm";
import { banners, db, pages, tenants } from "@guntan/db";
import { slugify, text } from "./api-helpers";
import { withBase } from "./paths";
import { Toggle } from "./ui-ext";

type PageRow = typeof pages.$inferSelect;
type BannerRow = typeof banners.$inferSelect;

export const BANNER_PLACEMENTS = [
  { key: "home_slider", label: "Ana sayfa slider", hint: "Büyük kayan görsel · önerilen 1200×480" },
  { key: "home_middle", label: "Ana sayfa orta alan", hint: "Güven çubuğunun altı, en fazla 3 adet · önerilen 1200×525" },
];

export function placementLabel(key: string) {
  return BANNER_PLACEMENTS.find((p) => p.key === key)?.label ?? key;
}

export function pageFromForm(form: FormData) {
  const title = text(form, "title").slice(0, 255);
  const tenantId = text(form, "tenantId");
  if (!title || !tenantId) return { error: "Site ve başlık zorunlu." } as const;
  const slug = slugify(text(form, "slug") || title).slice(0, 191);
  if (!slug) return { error: "Geçerli bir adres (slug) girin." } as const;
  return {
    tenantId,
    title,
    slug,
    body: text(form, "body").slice(0, 200_000),
    metaTitle: text(form, "metaTitle").slice(0, 255) || null,
    metaDescription: text(form, "metaDescription").slice(0, 500) || null,
    isPublished: form.get("isPublished") === "1" ? 1 : 0,
  };
}

export function bannerFromForm(form: FormData) {
  const title = text(form, "title").slice(0, 255);
  const tenantId = text(form, "tenantId");
  const imageUrl = text(form, "imageUrl").slice(0, 1000);
  if (!title || !tenantId) return { error: "Site ve başlık zorunlu." } as const;
  if (!/^(https?:\/\/|\/)/.test(imageUrl)) return { error: "Görsel adresi https:// veya / ile başlamalı." } as const;
  const href = text(form, "href").slice(0, 512);
  if (href && !/^(https?:\/\/|\/|#)/.test(href)) return { error: "Bağlantı https://, / veya # ile başlamalı." } as const;
  const placement = text(form, "placement");
  const sort = Math.round(Number(text(form, "sortOrder")));
  return {
    tenantId,
    title,
    imageUrl,
    href: href || null,
    placement: BANNER_PLACEMENTS.some((p) => p.key === placement) ? placement : "home_slider",
    sortOrder: Number.isFinite(sort) ? Math.max(0, Math.min(999, sort)) : 0,
    isActive: form.get("isActive") === "1" ? 1 : 0,
  };
}

async function tenantOptions() {
  return db.select({ id: tenants.id, name: tenants.name }).from(tenants).orderBy(asc(tenants.name));
}

export async function PageForm({ page, defaultTenant }: { page?: PageRow; defaultTenant?: string }) {
  const tenantRows = await tenantOptions();
  return (
    <form action={withBase(page ? `/api/content/pages/${page.id}` : "/api/content/pages")} method="post" className="form-stack">
      <input type="hidden" name="_action" value="save" />
      <div className="form-row">
        <div className="field">
          <label htmlFor="pg-title">Başlık</label>
          <input className="input" id="pg-title" name="title" required maxLength={255} defaultValue={page?.title ?? ""} placeholder="Örn. Hakkımızda" />
        </div>
        <div className="field">
          <label htmlFor="pg-tenant">Site</label>
          <select className="select" id="pg-tenant" name="tenantId" defaultValue={page?.tenantId ?? defaultTenant ?? tenantRows[0]?.id} required>
            {tenantRows.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="pg-slug">Adres (slug)</label>
        <div className="input-prefix">
          <span>/sayfa/</span>
          <input className="input mono" id="pg-slug" name="slug" defaultValue={page?.slug ?? ""} placeholder="Boş bırakılırsa başlıktan üretilir" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="pg-body">İçerik</label>
        <textarea className="input" id="pg-body" name="body" rows={18} defaultValue={page?.body ?? ""} />
        <small className="field-hint">
          Düz metin yazın; boş satır paragraf ayırır, TAMAMI BÜYÜK HARF satırlar başlık olarak gösterilir.
        </small>
      </div>
      <fieldset className="fieldset">
        <legend>Arama motoru (SEO)</legend>
        <div className="field">
          <label htmlFor="pg-mt">Meta başlık</label>
          <input className="input" id="pg-mt" name="metaTitle" maxLength={70} defaultValue={page?.metaTitle ?? ""} placeholder="Boşsa sayfa başlığı kullanılır" />
          <small className="field-hint">En fazla 60–70 karakter önerilir.</small>
        </div>
        <div className="field">
          <label htmlFor="pg-md">Meta açıklama</label>
          <textarea className="input" id="pg-md" name="metaDescription" rows={3} maxLength={170} defaultValue={page?.metaDescription ?? ""} />
          <small className="field-hint">Google sonuçlarında görünen açıklama; 140–160 karakter idealdir.</small>
        </div>
      </fieldset>
      <Toggle name="isPublished" defaultChecked={page ? page.isPublished === 1 : true} label="Yayında" hint="Kapalıyken sayfa sitede 404 döner." />
      <div className="form-actions">
        <button className="btn btn-primary" type="submit">
          {page ? "Kaydet" : "Sayfayı oluştur"}
        </button>
        <Link className="btn btn-ghost" href="/content/pages">
          Vazgeç
        </Link>
      </div>
    </form>
  );
}

export async function BannerForm({ banner, defaultTenant }: { banner?: BannerRow; defaultTenant?: string }) {
  const tenantRows = await tenantOptions();
  return (
    <form action={withBase(banner ? `/api/content/banners/${banner.id}` : "/api/content/banners")} method="post" className="form-stack">
      <input type="hidden" name="_action" value="save" />
      <div className="form-row">
        <div className="field">
          <label htmlFor="bn-title">Başlık (görsel alt metni)</label>
          <input className="input" id="bn-title" name="title" required maxLength={255} defaultValue={banner?.title ?? ""} placeholder="Örn. Fren balatalarında %15 indirim" />
        </div>
        <div className="field">
          <label htmlFor="bn-tenant">Site</label>
          <select className="select" id="bn-tenant" name="tenantId" defaultValue={banner?.tenantId ?? defaultTenant ?? tenantRows[0]?.id} required>
            {tenantRows.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="bn-img">Görsel adresi</label>
        <input className="input" id="bn-img" name="imageUrl" required defaultValue={banner?.imageUrl ?? ""} placeholder="https://.../banner.jpg" />
        {banner?.imageUrl ? <img className="banner-preview" src={banner.imageUrl} alt="" /> : null}
      </div>
      <div className="field">
        <label htmlFor="bn-href">Tıklanınca gidilecek adres</label>
        <input className="input" id="bn-href" name="href" defaultValue={banner?.href ?? ""} placeholder="/kategori/fren-sistemi veya https://..." />
      </div>
      <div className="field">
        <label>Konum</label>
        <div className="choice-grid">
          {BANNER_PLACEMENTS.map((p) => (
            <label key={p.key} className="choice">
              <input type="radio" name="placement" value={p.key} defaultChecked={(banner?.placement ?? "home_slider") === p.key} />
              <span>
                <strong>{p.label}</strong>
                <small>{p.hint}</small>
              </span>
            </label>
          ))}
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="bn-sort">Sıra</label>
          <input className="input" id="bn-sort" name="sortOrder" type="number" min={0} max={999} defaultValue={banner?.sortOrder ?? 0} />
          <small className="field-hint">Küçük sayı önce gösterilir.</small>
        </div>
      </div>
      <Toggle name="isActive" defaultChecked={banner ? banner.isActive === 1 : true} label="Aktif" hint="Değişiklikler sitede en geç 1 dakika içinde görünür." />
      <div className="form-actions">
        <button className="btn btn-primary" type="submit">
          {banner ? "Kaydet" : "Banner ekle"}
        </button>
        <Link className="btn btn-ghost" href="/content/banners">
          Vazgeç
        </Link>
      </div>
    </form>
  );
}
