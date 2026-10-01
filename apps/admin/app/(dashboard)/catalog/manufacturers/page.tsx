import Link from "next/link";
import { and, count, eq, isNotNull } from "drizzle-orm";
import { db, manufacturers, products } from "@guntan/db";
import { builtinManufacturerLogo, MANUFACTURER_LOGO_MAX_BYTES } from "@guntan/config/manufacturer-logos";
import { BrandLogo } from "@/src/brand-logo";
import { IconImage, IconSearch } from "@/src/icons";
import { ManufacturerLogoForm } from "@/src/manufacturer-logo-form";
import { assetUrl } from "@/src/storefront";
import { Alert, EmptyState, PageHeader, Panel, StatusBadge } from "@/src/ui";
import { buildHref, pageNumber, Pager } from "@/src/ui-ext";

export const metadata = { title: "Üreticiler" };
export const dynamic = "force-dynamic";

const PER_PAGE = 48;

type Source = "custom" | "builtin" | "none";

const TABS: { key: string; label: string; match: (s: Source) => boolean }[] = [
  { key: "", label: "Tümü", match: () => true },
  { key: "eksik", label: "Logosu eksik", match: (s) => s === "none" },
  { key: "yuklenen", label: "Panelden yüklenen", match: (s) => s === "custom" },
  { key: "hazir", label: "Hazır logo", match: (s) => s === "builtin" },
];

const SOURCE_BADGE: Record<Source, { tone: "ok" | "info" | "warn"; label: string }> = {
  custom: { tone: "ok", label: "Yüklenen logo" },
  builtin: { tone: "info", label: "Hazır logo" },
  none: { tone: "warn", label: "Logo yok" },
};

export default async function ManufacturersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; durum?: string; sayfa?: string; ok?: string; m?: string; hata?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().toLocaleLowerCase("tr-TR");
  const durum = TABS.some((t) => t.key === sp.durum) ? sp.durum! : "";
  const page = pageNumber(sp.sayfa);

  const [rows, counts] = await Promise.all([
    db.select({ id: manufacturers.id, name: manufacturers.name, logoUrl: manufacturers.logoUrl }).from(manufacturers),
    db
      .select({ id: products.manufacturerId, n: count() })
      .from(products)
      .where(and(eq(products.status, "active"), isNotNull(products.manufacturerId)))
      .groupBy(products.manufacturerId),
  ]);
  const countBy = new Map(counts.map((c) => [c.id, c.n]));

  const all = rows
    .map((m) => {
      const builtin = builtinManufacturerLogo(m.name);
      const source: Source = m.logoUrl ? "custom" : builtin ? "builtin" : "none";
      const preview = m.logoUrl?.startsWith("data:") ? m.logoUrl : assetUrl(m.logoUrl || builtin);
      return { ...m, source, preview, products: countBy.get(m.id) ?? 0 };
    })
    .filter((m) => m.products > 0)
    .sort((a, b) => b.products - a.products || a.name.localeCompare(b.name, "tr"));

  const tabCount = (key: string) => all.filter((m) => TABS.find((t) => t.key === key)!.match(m.source)).length;
  const tab = TABS.find((t) => t.key === durum)!;
  const filtered = all.filter((m) => tab.match(m.source) && (!q || m.name.toLocaleLowerCase("tr-TR").includes(q)));
  const shown = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const params = { q: sp.q?.trim() || undefined, durum: durum || undefined };
  const next = buildHref("/catalog/manufacturers", { ...params, sayfa: page > 1 ? page : undefined });
  const missingProducts = all.filter((m) => m.source === "none").reduce((s, m) => s + m.products, 0);

  return (
    <>
      <PageHeader
        title="Üreticiler"
        description="Ürünlerin üretici markaları. Logolar ürün kartlarında, ürün sayfasında, filtrelerde ve aramada gösterilir."
      />

      {sp.ok === "yuklendi" ? <Alert tone="ok">{sp.m ?? "Üretici"} logosu kaydedildi. Vitrinde birkaç dakika içinde görünür.</Alert> : null}
      {sp.ok === "kaldirildi" ? <Alert tone="ok">{sp.m ?? "Üretici"} için yüklenen logo kaldırıldı; varsa hazır logo kullanılır.</Alert> : null}
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}
      {tabCount("eksik") > 0 && !durum ? (
        <Alert tone="info">
          {tabCount("eksik").toLocaleString("tr-TR")} üreticinin logosu yok ({missingProducts.toLocaleString("tr-TR")} ürün).{" "}
          <Link href="/catalog/manufacturers?durum=eksik">Eksik olanları göster</Link>
        </Alert>
      ) : null}

      <Panel>
        <nav className="tabs" aria-label="Logo durumu">
          {TABS.map((t) => (
            <Link key={t.key || "all"} href={buildHref("/catalog/manufacturers", { q: params.q, durum: t.key || undefined })} className={durum === t.key ? "is-active" : undefined}>
              {t.label}
              <span>{tabCount(t.key).toLocaleString("tr-TR")}</span>
            </Link>
          ))}
        </nav>
        <form className="toolbar" method="get">
          {durum ? <input type="hidden" name="durum" value={durum} /> : null}
          <div className="search-field">
            <IconSearch />
            <input className="input" name="q" defaultValue={sp.q ?? ""} placeholder="Üretici ara" aria-label="Üretici ara" />
          </div>
          <button className="btn btn-secondary" type="submit">
            Ara
          </button>
          <span className="muted text-sm mfr-hint">PNG, JPG, WEBP veya SVG · en fazla {MANUFACTURER_LOGO_MAX_BYTES / 1024} KB · şeffaf arka planlı yatay logo önerilir</span>
        </form>

        {shown.length === 0 ? (
          <EmptyState title="Üretici bulunamadı" description={q ? `“${sp.q}” için eşleşen üretici yok.` : "Bu filtrede üretici yok."} icon={IconImage} />
        ) : (
          <div className="mfr-grid">
            {shown.map((m) => (
              <article key={m.id} className={`mfr-card is-${m.source}`}>
                <div className="mfr-logo-box">
                  {m.preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.preview} alt={m.name} loading="lazy" />
                  ) : (
                    <BrandLogo src={null} name={m.name} size={44} />
                  )}
                </div>
                <div className="mfr-body">
                  <strong title={m.name}>{m.name}</strong>
                  <span>{m.products.toLocaleString("tr-TR")} ürün</span>
                  <StatusBadge tone={SOURCE_BADGE[m.source].tone}>{SOURCE_BADGE[m.source].label}</StatusBadge>
                </div>
                <ManufacturerLogoForm id={m.id} name={m.name} next={next} hasCustom={m.source === "custom"} />
              </article>
            ))}
          </div>
        )}
        <Pager base="/catalog/manufacturers" page={page} total={filtered.length} perPage={PER_PAGE} params={params} />
      </Panel>
    </>
  );
}
