import Link from "next/link";
import { and, asc, count, eq, like, type SQL } from "drizzle-orm";
import { db, vehicleBrands, vehicleModels } from "@guntan/db";
import { IconCar, IconEdit, IconExternal, IconEye, IconEyeOff, IconLayers, IconPlus, IconSearch } from "@/src/icons";
import { BrandLogo } from "@/src/brand-logo";
import { withBase } from "@/src/paths";
import { assetUrl, storefrontUrl } from "@/src/storefront";
import { Alert, EmptyState, PageHeader, Panel, StatusBadge } from "@/src/ui";

export const metadata = { title: "Araç markaları" };

const OK: Record<string, string> = {
  aktif: "Marka aktif edildi; vitrinde görünecek.",
  pasif: "Marka pasif yapıldı; vitrinde gizlenecek.",
  silindi: "Marka silindi.",
};

export default async function BrandsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; durum?: string; ok?: string; hata?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const durum = sp.durum ?? "";

  const where: SQL[] = [];
  if (q) where.push(like(vehicleBrands.name, `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`));
  if (durum === "aktif") where.push(eq(vehicleBrands.isActive, true));
  if (durum === "pasif") where.push(eq(vehicleBrands.isActive, false));

  const [rows, modelCounts, totals] = await Promise.all([
    db
      .select()
      .from(vehicleBrands)
      .where(where.length ? and(...where) : undefined)
      .orderBy(asc(vehicleBrands.sortOrder), asc(vehicleBrands.name)),
    db.select({ brandId: vehicleModels.brandId, n: count() }).from(vehicleModels).groupBy(vehicleModels.brandId),
    db.select({ isActive: vehicleBrands.isActive, n: count() }).from(vehicleBrands).groupBy(vehicleBrands.isActive),
  ]);
  const modelsBy = new Map(modelCounts.map((m) => [m.brandId, m.n]));
  const activeN = totals.find((t) => t.isActive)?.n ?? 0;
  const passiveN = totals.find((t) => !t.isActive)?.n ?? 0;
  const listPath = `/catalog/brands${q || durum ? `?${new URLSearchParams({ ...(q ? { q } : {}), ...(durum ? { durum } : {}) })}` : ""}`;
  const tabHref = (d: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (d) p.set("durum", d);
    const s = p.toString();
    return s ? `/catalog/brands?${s}` : "/catalog/brands";
  };
  const site = storefrontUrl();

  return (
    <>
      <PageHeader
        title="Araç markaları"
        description="Vitrindeki marka menüsü. Sıra numarası küçük olan önce gösterilir."
        actions={
          <Link className="btn btn-primary" href="/catalog/brands/new">
            <IconPlus />
            Yeni marka
          </Link>
        }
      />

      {sp.ok && OK[sp.ok] ? <Alert tone="ok">{OK[sp.ok]}</Alert> : null}
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}

      <Panel>
        <nav className="tabs" aria-label="Durum">
          {[
            { d: "", label: "Tümü", n: activeN + passiveN },
            { d: "aktif", label: "Aktif", n: activeN },
            { d: "pasif", label: "Pasif", n: passiveN },
          ].map((t) => (
            <Link key={t.d || "all"} href={tabHref(t.d)} className={durum === t.d ? "is-active" : undefined}>
              {t.label}
              <span>{t.n}</span>
            </Link>
          ))}
        </nav>
        <form className="toolbar" method="get">
          {durum ? <input type="hidden" name="durum" value={durum} /> : null}
          <div className="search-field">
            <IconSearch />
            <input className="input" name="q" defaultValue={q} placeholder="Marka ara" aria-label="Marka ara" />
          </div>
          <button className="btn btn-secondary" type="submit">
            Ara
          </button>
        </form>

        {rows.length === 0 ? (
          <EmptyState
            title="Marka bulunamadı"
            description={q ? `“${q}” için eşleşen marka yok.` : "İlk markayı ekleyin."}
            icon={IconCar}
          />
        ) : (
          <div className="brand-grid">
            {rows.map((b) => (
              <article key={b.id} className={`brand-card${b.isActive ? "" : " is-off"}`}>
                <Link className="brand-card-main" href={`/catalog/brands/${b.id}`}>
                  <BrandLogo src={assetUrl(b.logoUrl)} name={b.name} size={52} />
                  <div>
                    <strong>{b.name}</strong>
                    <span>
                      {(modelsBy.get(b.id) ?? 0).toLocaleString("tr-TR")} model · sıra {b.sortOrder}
                    </span>
                  </div>
                </Link>
                <div className="brand-card-foot">
                  <StatusBadge tone={b.isActive ? "ok" : "neutral"}>{b.isActive ? "Aktif" : "Pasif"}</StatusBadge>
                  <div className="icon-actions">
                    <Link className="icon-btn" href={`/catalog/brands/${b.id}`} title="Düzenle" aria-label={`${b.name} düzenle`}>
                      <IconEdit />
                    </Link>
                    <Link className="icon-btn" href={`/catalog/models?marka=${b.id}`} title="Modeller" aria-label={`${b.name} modelleri`}>
                      <IconLayers />
                    </Link>
                    <form action={withBase(`/api/vehicle-brands/${b.id}`)} method="post">
                      <input type="hidden" name="_action" value="toggle" />
                      <input type="hidden" name="next" value={listPath} />
                      <button
                        className="icon-btn"
                        type="submit"
                        title={b.isActive ? "Pasif yap (vitrinde gizle)" : "Aktif yap (vitrinde göster)"}
                        aria-label={b.isActive ? "Pasif yap" : "Aktif yap"}
                      >
                        {b.isActive ? <IconEyeOff /> : <IconEye />}
                      </button>
                    </form>
                    <a className="icon-btn" href={`${site}/${b.slug}`} target="_blank" rel="noreferrer" title="Vitrinde gör" aria-label="Vitrinde gör">
                      <IconExternal />
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}
