import { notFound } from "next/navigation";
import { asc, count, eq } from "drizzle-orm";
import { db, productFitments, vehicleBrands, vehicleGenerations, vehicleModels } from "@guntan/db";
import { GenerationPanel } from "@/src/generation-panel";
import { IconExternal } from "@/src/icons";
import { assetBase, storefrontUrl } from "@/src/storefront";
import { Alert, PageHeader, Panel, StatusBadge } from "@/src/ui";
import { ModelForm } from "@/src/vehicle-forms";
import { VehicleImageForm } from "@/src/vehicle-image-form";

export const metadata = { title: "Model düzenle" };

const OK: Record<string, string> = {
  olusturuldu: "Model oluşturuldu.",
  kaydedildi: "Değişiklikler kaydedildi. Vitrine en geç 10 dakika içinde yansır.",
  aktif: "Model aktif edildi.",
  pasif: "Model pasif yapıldı.",
  "gorsel-yuklendi": "Fotoğraf yüklendi. Vitrine en geç 10 dakika içinde yansır.",
  "gorsel-kaldirildi": "Fotoğraf kaldırıldı.",
  "kasa-eklendi": "Kasa eklendi.",
  "kasa-kaydedildi": "Kasa kaydedildi.",
  "kasa-silindi": "Kasa silindi.",
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
  const [brands, [fitments], generations] = await Promise.all([
    db.select({ id: vehicleBrands.id, name: vehicleBrands.name, slug: vehicleBrands.slug }).from(vehicleBrands).orderBy(asc(vehicleBrands.name)),
    db.select({ n: count() }).from(productFitments).where(eq(productFitments.vehicleModelId, id)),
    db
      .select({
        id: vehicleGenerations.id,
        name: vehicleGenerations.name,
        bodyCode: vehicleGenerations.bodyCode,
        yearFrom: vehicleGenerations.yearFrom,
        yearTo: vehicleGenerations.yearTo,
        imageUrl: vehicleGenerations.imageUrl,
        isActive: vehicleGenerations.isActive,
      })
      .from(vehicleGenerations)
      .where(eq(vehicleGenerations.modelId, id))
      .orderBy(asc(vehicleGenerations.yearFrom), asc(vehicleGenerations.name)),
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
      <div className="form-page is-stack">
        <Panel title="Model fotoğrafı" description="Vitrindeki marka menüsünde model kartında gösterilir." padded>
          <VehicleImageForm entity="model" id={model.id} imageUrl={model.imageUrl} assetBase={assetBase()} next={`/catalog/models/${model.id}`} label={model.name} />
        </Panel>
        <section id="kasalar">
          <Panel title="Kasalar / nesiller" description="Örn. 3 Serisi için E46, E90, F30. Menüde her kasa yıl aralığıyla ayrı kart olarak görünür." padded>
            <GenerationPanel modelId={model.id} modelName={model.name} generations={generations} />
          </Panel>
        </section>
        <Panel title="Model bilgileri" padded>
          <ModelForm model={model} brands={brands} />
        </Panel>
      </div>
    </>
  );
}
