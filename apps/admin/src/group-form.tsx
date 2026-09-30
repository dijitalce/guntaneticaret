import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, vehicleBrands } from "@guntan/db";
import { BrandPicker } from "./brand-picker";
import { ConfirmButton, NameSlugFields } from "./form-fields";
import { IconTrash } from "./icons";
import { withBase } from "./paths";
import { assetUrl } from "./storefront";

export async function GroupForm({ group, memberIds = [] }: { group?: { id: string; name: string; slug: string }; memberIds?: string[] }) {
  const brands = await db
    .select({ id: vehicleBrands.id, name: vehicleBrands.name, logoUrl: vehicleBrands.logoUrl, isActive: vehicleBrands.isActive })
    .from(vehicleBrands)
    .orderBy(asc(vehicleBrands.name));
  const action = group ? withBase(`/api/brand-groups/${group.id}`) : withBase("/api/brand-groups");

  return (
    <>
      <form action={action} method="post" className="form-stack">
        <input type="hidden" name="_action" value="save" />
        <div className="form-row">
          <NameSlugFields label="Grup adı" defaultName={group?.name} slug={group?.slug} urlPrefix="Kod: " placeholder="Örn. Alman markaları" />
        </div>
        <div className="field">
          <label>Gruptaki markalar</label>
          <BrandPicker
            brands={brands.map((b) => ({ id: b.id, name: b.name, logo: assetUrl(b.logoUrl), isActive: b.isActive }))}
            selected={memberIds}
          />
        </div>
        <div className="form-actions">
          <Link className="btn btn-ghost" href="/catalog/groups">
            Vazgeç
          </Link>
          <button className="btn btn-primary" type="submit">
            {group ? "Değişiklikleri kaydet" : "Grubu oluştur"}
          </button>
        </div>
      </form>
      {group ? (
        <form action={action} method="post" className="danger-zone">
          <input type="hidden" name="_action" value="delete" />
          <div>
            <strong>Grubu sil</strong>
            <small>Markalar silinmez, yalnızca grup kaldırılır. Bir sitede kullanılan grup silinemez.</small>
          </div>
          <ConfirmButton className="btn btn-danger btn-sm" message={`“${group.name}” grubu silinsin mi?`}>
            <IconTrash />
            Sil
          </ConfirmButton>
        </form>
      ) : null}
    </>
  );
}
