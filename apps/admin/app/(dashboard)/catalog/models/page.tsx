import Link from "next/link";
import { and, asc, count, eq, like, type SQL } from "drizzle-orm";
import { db, vehicleBrands, vehicleModels } from "@guntan/db";
import { IconEdit, IconExternal, IconEye, IconEyeOff, IconLayers, IconPlus, IconSearch } from "@/src/icons";
import { BrandLogo } from "@/src/brand-logo";
import { withBase } from "@/src/paths";
import { assetUrl, storefrontUrl } from "@/src/storefront";
import { Alert, EmptyState, PageHeader, Panel, StatusBadge } from "@/src/ui";

export const metadata = { title: "Modeller" };

const PAGE_SIZE = 50;
const OK: Record<string, string> = {
  aktif: "Model aktif edildi; vitrinde görünecek.",
  pasif: "Model pasif yapıldı; vitrinde gizlenecek.",
  silindi: "Model silindi.",
};

export default async function ModelsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; marka?: string; durum?: string; sayfa?: string; ok?: string; hata?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const marka = sp.marka ?? "";
  const durum = sp.durum ?? "";
  const page = Math.max(1, Number.parseInt(sp.sayfa ?? "1", 10) || 1);

  const base: SQL[] = [];
  if (marka) base.push(eq(vehicleModels.brandId, marka));
  if (q) base.push(like(vehicleModels.name, `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`));
  const where = [...base];
  if (durum === "aktif") where.push(eq(vehicleModels.isActive, true));
  if (durum === "pasif") where.push(eq(vehicleModels.isActive, false));

  const [brands, rows, totalRows, statusRows] = await Promise.all([
    db.select({ id: vehicleBrands.id, name: vehicleBrands.name, slug: vehicleBrands.slug, logoUrl: vehicleBrands.logoUrl }).from(vehicleBrands).orderBy(asc(vehicleBrands.name)),
    db
      .select({
        id: vehicleModels.id,
        name: vehicleModels.name,
        slug: vehicleModels.slug,
        imageUrl: vehicleModels.imageUrl,
        isActive: vehicleModels.isActive,
        sortOrder: vehicleModels.sortOrder,
        brandId: vehicleModels.brandId,
      })
      .from(vehicleModels)
      .where(where.length ? and(...where) : undefined)
      .orderBy(asc(vehicleModels.brandId), asc(vehicleModels.sortOrder), asc(vehicleModels.name))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ n: count() }).from(vehicleModels).where(where.length ? and(...where) : undefined),
    db
      .select({ isActive: vehicleModels.isActive, n: count() })
      .from(vehicleModels)
      .where(base.length ? and(...base) : undefined)
      .groupBy(vehicleModels.isActive),
  ]);
  const brandBy = new Map(brands.map((b) => [b.id, b]));
  const total = totalRows[0]?.n ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeN = statusRows.find((r) => r.isActive)?.n ?? 0;
  const passiveN = statusRows.find((r) => !r.isActive)?.n ?? 0;
  const selectedBrand = marka ? brandBy.get(marka) : undefined;
  const site = storefrontUrl();

  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { q: q || undefined, marka: marka || undefined, durum: durum || undefined, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/catalog/models?${s}` : "/catalog/models";
  };
  const listPath = href({ sayfa: page > 1 ? String(page) : undefined });

  return (
    <>
      <PageHeader
        title={selectedBrand ? `${selectedBrand.name} modelleri` : "Modeller"}
        description="Vitrinde marka sayfasındaki model listesi. Sıra numarası küçük olan önce gösterilir."
        crumbs={selectedBrand ? [{ href: "/catalog/brands", label: "Araç markaları" }] : undefined}
        actions={
          <Link className="btn btn-primary" href={`/catalog/models/new${marka ? `?marka=${marka}` : ""}`}>
            <IconPlus />
            Yeni model
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
            <Link key={t.d || "all"} href={href({ durum: t.d || undefined, sayfa: undefined })} className={durum === t.d ? "is-active" : undefined}>
              {t.label}
              <span>{t.n.toLocaleString("tr-TR")}</span>
            </Link>
          ))}
        </nav>
        <form className="toolbar" method="get">
          {durum ? <input type="hidden" name="durum" value={durum} /> : null}
          <select className="select" name="marka" defaultValue={marka} aria-label="Marka" style={{ width: "auto", minWidth: 180 }}>
            <option value="">Tüm markalar</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <div className="search-field">
            <IconSearch />
            <input className="input" name="q" defaultValue={q} placeholder="Model ara" aria-label="Model ara" />
          </div>
          <button className="btn btn-secondary" type="submit">
            Filtrele
          </button>
          {q || marka ? (
            <Link className="btn btn-ghost" href={href({ q: undefined, marka: undefined, sayfa: undefined })}>
              Temizle
            </Link>
          ) : null}
        </form>

        {rows.length === 0 ? (
          <EmptyState title="Model bulunamadı" description={q ? `“${q}” için eşleşen model yok.` : "Bu filtrede model yok."} icon={IconLayers} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Model</th>
                  {selectedBrand ? null : <th>Marka</th>}
                  <th className="num">Sıra</th>
                  <th>Durum</th>
                  <th className="num">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => {
                  const brand = brandBy.get(m.brandId);
                  const img = assetUrl(m.imageUrl) ?? assetUrl(brand?.logoUrl);
                  return (
                    <tr key={m.id} className="row-link" data-href={`/catalog/models/${m.id}`}>
                      <td>
                        <div className="item-row">
                          <BrandLogo src={img} name={m.name} size={40} />
                          <div>
                            <Link href={`/catalog/models/${m.id}`}>{m.name}</Link>
                            <span className="sub">
                              /{brand?.slug ?? "?"}/{m.slug}
                            </span>
                          </div>
                        </div>
                      </td>
                      {selectedBrand ? null : (
                        <td>
                          <Link href={href({ marka: m.brandId, sayfa: undefined })}>{brand?.name ?? "—"}</Link>
                        </td>
                      )}
                      <td className="num">{m.sortOrder}</td>
                      <td>
                        <StatusBadge tone={m.isActive ? "ok" : "neutral"}>{m.isActive ? "Aktif" : "Pasif"}</StatusBadge>
                      </td>
                      <td>
                        <div className="icon-actions">
                          <Link className="icon-btn" href={`/catalog/models/${m.id}`} title="Düzenle" aria-label={`${m.name} düzenle`}>
                            <IconEdit />
                          </Link>
                          <form action={withBase(`/api/vehicle-models/${m.id}`)} method="post">
                            <input type="hidden" name="_action" value="toggle" />
                            <input type="hidden" name="next" value={listPath} />
                            <button
                              className="icon-btn"
                              type="submit"
                              title={m.isActive ? "Pasif yap (vitrinde gizle)" : "Aktif yap (vitrinde göster)"}
                              aria-label={m.isActive ? "Pasif yap" : "Aktif yap"}
                            >
                              {m.isActive ? <IconEyeOff /> : <IconEye />}
                            </button>
                          </form>
                          {brand ? (
                            <a
                              className="icon-btn"
                              href={`${site}/${brand.slug}/${m.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              title="Vitrinde gör"
                              aria-label="Vitrinde gör"
                            >
                              <IconExternal />
                            </a>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="toolbar" style={{ justifyContent: "space-between", borderTop: "1px solid var(--a-border)", borderBottom: 0 }}>
          <span className="muted text-sm">
            {total.toLocaleString("tr-TR")} model{pages > 1 ? ` · Sayfa ${page}/${pages}` : ""}
          </span>
          {pages > 1 ? (
            <div className="row-actions">
              {page > 1 ? (
                <Link className="btn btn-secondary btn-sm" href={href({ sayfa: String(page - 1) })}>
                  Önceki
                </Link>
              ) : null}
              {page < pages ? (
                <Link className="btn btn-secondary btn-sm" href={href({ sayfa: String(page + 1) })}>
                  Sonraki
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      </Panel>
    </>
  );
}
