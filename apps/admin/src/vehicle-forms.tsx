import Link from "next/link";
import { ConfirmButton, ImageUrlField, NameSlugFields } from "./form-fields";
import { IconTrash } from "./icons";
import { withBase } from "./paths";
import { storefrontUrl } from "./storefront";

type Common = {
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  seoContent: string | null;
};

function StatusAndOrder({ isActive, sortOrder }: { isActive: boolean; sortOrder: number }) {
  return (
    <div className="form-row">
      <div className="field">
        <label htmlFor="sortOrder">Sıra</label>
        <input className="input" id="sortOrder" name="sortOrder" type="number" defaultValue={sortOrder} style={{ maxWidth: 140 }} />
        <small className="field-hint">Küçük numara önce gösterilir.</small>
      </div>
      <label className="switch-field">
        <input type="checkbox" name="isActive" value="1" defaultChecked={isActive} />
        <span className="switch" aria-hidden />
        <span>
          <strong>Vitrinde göster</strong>
          <small>Kapalıysa menüde ve arama filtrelerinde görünmez.</small>
        </span>
      </label>
    </div>
  );
}

function SeoField({ value, what }: { value: string | null; what: string }) {
  return (
    <div className="field">
      <label htmlFor="seoContent">Açıklama (SEO)</label>
      <textarea className="input" id="seoContent" name="seoContent" rows={4} defaultValue={value ?? ""} placeholder={`${what} sayfasının üstünde görünen tanıtım metni`} />
      <small className="field-hint">İlk 160 karakter arama motoru açıklaması olarak kullanılır.</small>
    </div>
  );
}

export function BrandForm({ brand }: { brand?: Common & { id: string; logoUrl: string | null } }) {
  const site = storefrontUrl();
  const action = brand ? withBase(`/api/vehicle-brands/${brand.id}`) : withBase("/api/vehicle-brands");
  return (
    <>
      <form action={action} method="post" className="form-stack">
        <input type="hidden" name="_action" value="save" />
        <div className="form-row">
          <NameSlugFields label="Marka adı" defaultName={brand?.name} slug={brand?.slug} urlPrefix={`${site.replace(/^https?:\/\//, "")}/`} placeholder="Örn. Volkswagen" />
        </div>
        <ImageUrlField
          name="logoUrl"
          label="Logo"
          defaultValue={brand?.logoUrl ?? ""}
          storefrontUrl={site}
          fallback={(brand?.name ?? "?").slice(0, 2).toUpperCase()}
          hint={
            <>
              Hazır logolar: <code>/brands/marka-adi.png</code> (örn. <code>/brands/bmw.png</code>) ya da tam görsel adresi.
            </>
          }
        />
        <StatusAndOrder isActive={brand?.isActive ?? true} sortOrder={brand?.sortOrder ?? 0} />
        <SeoField value={brand?.seoContent ?? null} what="Marka" />
        <div className="form-actions">
          <Link className="btn btn-ghost" href="/catalog/brands">
            Vazgeç
          </Link>
          <button className="btn btn-primary" type="submit">
            {brand ? "Değişiklikleri kaydet" : "Markayı oluştur"}
          </button>
        </div>
      </form>
      {brand ? (
        <form action={action} method="post" className="danger-zone">
          <input type="hidden" name="_action" value="delete" />
          <div>
            <strong>Markayı sil</strong>
            <small>Yalnızca modeli ve ürün bağlantısı olmayan markalar silinebilir. Diğerlerini pasif yapın.</small>
          </div>
          <ConfirmButton className="btn btn-danger btn-sm" message={`“${brand.name}” markası silinsin mi? Bu işlem geri alınamaz.`}>
            <IconTrash />
            Sil
          </ConfirmButton>
        </form>
      ) : null}
    </>
  );
}

export function ModelForm({
  model,
  brands,
  brandId,
}: {
  model?: Common & { id: string; imageUrl: string | null; brandId: string };
  brands: { id: string; name: string; slug: string }[];
  brandId?: string;
}) {
  const site = storefrontUrl();
  const action = model ? withBase(`/api/vehicle-models/${model.id}`) : withBase("/api/vehicle-models");
  const currentBrand = brands.find((b) => b.id === (model?.brandId ?? brandId));
  return (
    <>
      <form action={action} method="post" className="form-stack">
        <input type="hidden" name="_action" value="save" />
        <div className="field">
          <label htmlFor="brandId">Marka</label>
          {model ? (
            <input className="input" id="brandId" value={currentBrand?.name ?? "—"} readOnly disabled />
          ) : (
            <select className="select" id="brandId" name="brandId" defaultValue={brandId ?? ""} required>
              <option value="" disabled>
                Marka seçin
              </option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="form-row">
          <NameSlugFields
            label="Model adı"
            defaultName={model?.name}
            slug={model?.slug}
            urlPrefix={`${site.replace(/^https?:\/\//, "")}/${currentBrand?.slug ?? "marka"}/`}
            placeholder="Örn. Passat"
          />
        </div>
        <ImageUrlField
          name="imageUrl"
          label="Görsel"
          defaultValue={model?.imageUrl ?? ""}
          storefrontUrl={site}
          fallback={(model?.name ?? "?").slice(0, 2).toUpperCase()}
          hint="Model kartında gösterilir. Boş bırakılabilir."
        />
        <StatusAndOrder isActive={model?.isActive ?? true} sortOrder={model?.sortOrder ?? 0} />
        <SeoField value={model?.seoContent ?? null} what="Model" />
        <div className="form-actions">
          <Link className="btn btn-ghost" href={`/catalog/models${currentBrand ? `?marka=${currentBrand.id}` : ""}`}>
            Vazgeç
          </Link>
          <button className="btn btn-primary" type="submit">
            {model ? "Değişiklikleri kaydet" : "Modeli oluştur"}
          </button>
        </div>
      </form>
      {model ? (
        <form action={action} method="post" className="danger-zone">
          <input type="hidden" name="_action" value="delete" />
          <div>
            <strong>Modeli sil</strong>
            <small>Yalnızca ürün bağlantısı olmayan modeller silinebilir. Diğerlerini pasif yapın.</small>
          </div>
          <ConfirmButton className="btn btn-danger btn-sm" message={`“${model.name}” modeli silinsin mi? Bu işlem geri alınamaz.`}>
            <IconTrash />
            Sil
          </ConfirmButton>
        </form>
      ) : null}
    </>
  );
}
