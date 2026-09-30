import { notFound } from "next/navigation";
import { asc, count, eq } from "drizzle-orm";
import { db, productFitments, vehicleBrands, vehicleModels } from "@guntan/db";
import { IconExternal } from "@/src/icons";
import { storefrontUrl } from "@/src/storefront";
import { Alert, PageHeader, Panel, StatusBadge } from "@/src/ui";
import { ModelForm } from "@/src/vehicle-forms";

export const metadata = { title: "Model düzenle" };

const OK: Record<string, string> = {
  olusturuldu: "Model oluşturuldu.",
  kaydedildi: "Değişiklikler kaydedildi. Vitrine en geç 10 dakika içinde yansır.",
  aktif: "Model aktif edildi.",
  pasif: "Model pasif yapıldı.",
};

export default async function ModelEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; hata?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const [model] = await db.select().from(vehicleModels).where(eq(vehicleModels.id, id)).limit(1);
  if (!model) notFound();
  const [brands, [fitments]] = await Promise.all([
    db.select({ id: vehicleBrands.id, name: vehicleBrands.name, slug: vehicleBrands.slug }).from(vehicleBrands).orderBy(asc(vehicleBrands.name)),
    db.select({ n: count() }).from(productFitments).where(eq(productFitments.vehicleModelId, id)),
  ]);
  const brand = brands.find((b) => b.id === model.brandId);

  return (
    <>
      <PageHeader
        title={`${brand?.name ?? ""} ${model.name}`.trim()}
        description={`${(fitments?.n ?? 0).toLocaleString("tr-TR")} ürün bu modelle uyumlu`}
        crumbs={[
          { href: "/catalog/brands", label: "Araç markaları" },
          { href: `/catalog/models?marka=${model.brandId}`, label: brand?.name ?? "Modeller" },
        ]}
        actions={
          <>
            <StatusBadge tone={model.isActive ? "ok" : "neutral"}>{model.isActive ? "Aktif" : "Pasif"}</StatusBadge>
            {brand ? (
              <a className="btn btn-secondary" href={`${storefrontUrl()}/${brand.slug}/${model.slug}`} target="_blank" rel="noreferrer">
                <IconExternal />
                Vitrinde gör
              </a>
            ) : null}
          </>
        }
      />
      {sp.ok && OK[sp.ok] ? <Alert tone="ok">{OK[sp.ok]}</Alert> : null}
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}
      <div className="form-page">
        <Panel title="Model bilgileri" padded>
          <ModelForm model={model} brands={brands} />
        </Panel>
      </div>
    </>
  );
}
