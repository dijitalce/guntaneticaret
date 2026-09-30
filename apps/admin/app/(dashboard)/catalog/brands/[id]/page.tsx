import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, count, eq } from "drizzle-orm";
import { db, productFitments, vehicleBrands, vehicleModels } from "@guntan/db";
import { IconEdit, IconExternal, IconPlus } from "@/src/icons";
import { storefrontUrl } from "@/src/storefront";
import { Alert, EmptyState, PageHeader, Panel, StatusBadge } from "@/src/ui";
import { BrandForm } from "@/src/vehicle-forms";

export const metadata = { title: "Marka düzenle" };

const OK: Record<string, string> = {
  olusturuldu: "Marka oluşturuldu. Vitrinde görünmesi için bu markaya bağlı ürün olmalı.",
  kaydedildi: "Değişiklikler kaydedildi. Vitrine en geç 10 dakika içinde yansır.",
  aktif: "Marka aktif edildi.",
  pasif: "Marka pasif yapıldı.",
};

export default async function BrandEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; hata?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const [brand] = await db.select().from(vehicleBrands).where(eq(vehicleBrands.id, id)).limit(1);
  if (!brand) notFound();
  const [models, [fitments]] = await Promise.all([
    db
      .select({ id: vehicleModels.id, name: vehicleModels.name, isActive: vehicleModels.isActive })
      .from(vehicleModels)
      .where(eq(vehicleModels.brandId, id))
      .orderBy(asc(vehicleModels.sortOrder), asc(vehicleModels.name)),
    db.select({ n: count() }).from(productFitments).where(eq(productFitments.vehicleBrandId, id)),
  ]);

  return (
    <>
      <PageHeader
        title={brand.name}
        crumbs={[{ href: "/catalog/brands", label: "Araç markaları" }]}
        actions={
          <>
            <StatusBadge tone={brand.isActive ? "ok" : "neutral"}>{brand.isActive ? "Aktif" : "Pasif"}</StatusBadge>
            <a className="btn btn-secondary" href={`${storefrontUrl()}/${brand.slug}`} target="_blank" rel="noreferrer">
              <IconExternal />
              Vitrinde gör
            </a>
          </>
        }
      />
      {sp.ok && OK[sp.ok] ? <Alert tone="ok">{OK[sp.ok]}</Alert> : null}
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}

      <div className="grid-2">
        <div>
          <Panel title="Marka bilgileri" padded>
            <BrandForm brand={brand} />
          </Panel>
        </div>
        <div>
          <Panel
            title="Modeller"
            description={`${models.length} model · ${(fitments?.n ?? 0).toLocaleString("tr-TR")} ürün uyumluluğu`}
            action={
              <Link className="btn btn-secondary btn-sm" href={`/catalog/models/new?marka=${brand.id}`}>
                <IconPlus />
                Ekle
              </Link>
            }
          >
            {models.length === 0 ? (
              <EmptyState title="Model yok" />
            ) : (
              <div className="todo-list" style={{ maxHeight: 420, overflowY: "auto" }}>
                {models.map((m) => (
                  <Link key={m.id} className="todo" href={`/catalog/models/${m.id}`}>
                    <span className={`todo-dot${m.isActive ? " is-ok" : ""}`} />
                    <div>
                      <strong>{m.name}</strong>
                    </div>
                    <IconEdit width={15} height={15} style={{ color: "var(--a-muted)" }} />
                  </Link>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
