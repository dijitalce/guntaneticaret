import { asc } from "drizzle-orm";
import { db, vehicleBrands } from "@guntan/db";
import { Alert, PageHeader, Panel } from "@/src/ui";
import { ModelForm } from "@/src/vehicle-forms";

export const metadata = { title: "Yeni model" };

export default async function NewModelPage({ searchParams }: { searchParams: Promise<{ marka?: string; hata?: string }> }) {
  const sp = await searchParams;
  const brands = await db
    .select({ id: vehicleBrands.id, name: vehicleBrands.name, slug: vehicleBrands.slug })
    .from(vehicleBrands)
    .orderBy(asc(vehicleBrands.name));
  return (
    <>
      <PageHeader title="Yeni model" crumbs={[{ href: `/catalog/models${sp.marka ? `?marka=${sp.marka}` : ""}`, label: "Modeller" }]} />
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}
      <div className="form-page">
        <Panel padded>
          <ModelForm brands={brands} brandId={sp.marka} />
        </Panel>
      </div>
    </>
  );
}
