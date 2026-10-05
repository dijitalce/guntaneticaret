import Link from "next/link";
import { asc, sql } from "drizzle-orm";
import { catalogExportPlan, db, EXPORT_PART_BYTES, getCatalogExport, getTenantContext, tenantSeesAllCatalog, tenants } from "@guntan/db";
import { VISIBILITY_MODE } from "@guntan/types";
import { CopyButton } from "./copy-button";
import { IconExternal } from "./icons";
import { withBase } from "./paths";
import { Alert, EmptyState, Panel, formatDate } from "./ui";
import { TabNav } from "./ui-ext";

function mb(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function LinkRow({ url, title, meta }: { url: string; title: string; meta?: string }) {
  return (
    <div className="export-link">
      <div className="export-link-head">
        <strong>{title}</strong>
        {meta ? <span className="muted text-sm">{meta}</span> : null}
      </div>
      <div className="copy-url">
        <code>{url}</code>
        <CopyButton value={url} />
        <a className="btn btn-ghost btn-xs" href={url} target="_blank" rel="noreferrer">
          <IconExternal width={13} height={13} />
          Aç
        </a>
      </div>
    </div>
  );
}

export async function CatalogExportTab({ site, ok }: { site?: string; ok?: string }) {
  const tenantRows = await db
    .select({ id: tenants.id, name: tenants.name })
    .from(tenants)
    .orderBy(sql`${tenants.visibilityMode} = ${VISIBILITY_MODE.ALL} desc`, asc(tenants.name));
  if (!tenantRows.length) return <EmptyState title="Önce bir site oluşturun" />;
  const tenantId = tenantRows.find((t) => t.id === site)?.id ?? tenantRows[0]!.id;
  const [settings, ctx] = await Promise.all([getCatalogExport(tenantId), getTenantContext(tenantId)]);
  const base = ctx.url.replace(/\/$/, "");
  const action = (name: string, label: string, className: string) => (
    <form action={withBase("/api/catalog-export")} method="post" style={{ display: "inline" }}>
      <input type="hidden" name="tenantId" value={tenantId} />
      <input type="hidden" name="action" value={name} />
      <button className={className} type="submit">
        {label}
      </button>
    </form>
  );

  let plan: Awaited<ReturnType<typeof catalogExportPlan>> | null = null;
  let planError = false;
  if (settings.token) {
    try {
      plan = await catalogExportPlan(tenantId, await tenantSeesAllCatalog(tenantId));
    } catch {
      planError = true;
    }
  }
  const root = settings.token ? `${base}/feeds/katalog/${settings.token}` : "";

  return (
    <>
      {ok === "enable" ? <Alert tone="ok">Paylaşım açıldı. Aşağıdaki linkleri kopyalayıp gönderebilirsiniz.</Alert> : null}
      {ok === "rotate" ? <Alert tone="ok">Yeni linkler oluşturuldu; eski linkler artık çalışmaz.</Alert> : null}
      {ok === "disable" ? <Alert tone="ok">Paylaşım kapatıldı; tüm linkler devre dışı.</Alert> : null}
      {tenantRows.length > 1 ? (
        <TabNav
          label="Site"
          active={tenantId}
          items={tenantRows.map((t) => ({ key: t.id, label: t.name, href: `/integrations/xml?sekme=disa-aktar&site=${t.id}` }))}
        />
      ) : null}

      {!settings.token ? (
        <Panel title="Birleşik katalog XML'i" padded>
          <p className="muted" style={{ marginTop: 0 }}>
            Tüm tedarikçilerden birleştirilen ürün kataloğunuzu tek bir XML formatında dışarıya verebilirsiniz. Dosya{" "}
            {Math.round(EXPORT_PART_BYTES / 1024 / 1024)} MB&apos;lık parçalara bölünür (her parça 40 MB&apos;ın altında kalır) ve her açılışta
            canlı veriden üretilir; fiyat ve stok her zaman günceldir. Maliyet ve tedarikçi bilgisi paylaşılmaz.
          </p>
          {action("enable", "Paylaşım linklerini oluştur", "btn btn-primary")}
        </Panel>
      ) : (
        <Panel
          title="Paylaşım linkleri"
          description={`${ctx.name} · ${settings.updatedAt ? `Link oluşturma: ${formatDate(settings.updatedAt)}` : ""}`}
          action={
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {action("rotate", "Linkleri yenile", "btn btn-secondary btn-sm")}
              {action("disable", "Paylaşımı kapat", "btn btn-ghost btn-sm")}
            </div>
          }
          padded
        >
          <p className="muted text-sm" style={{ marginTop: 0 }}>
            Linkler her açıldığında güncel fiyat ve stokla yeniden üretilir. Karşı taraf en kolay <strong>parça listesi</strong> linkini
            kullanır: hangi parçaların olduğunu her zaman doğru gösterir; ürün sayısı artarsa yeni parça otomatik eklenir. Linki alan herkes
            kataloğa erişebilir; paylaşmayı bıraktığınızda &quot;Linkleri yenile&quot; ile eskileri iptal edin.
          </p>
          <LinkRow url={`${root}/index.xml`} title="Parça listesi (index.xml)" meta="Tüm parçaların adresleri" />
          {planError ? (
            <Alert>Parça bilgisi hesaplanamadı. Sayfayı birazdan yenileyin.</Alert>
          ) : plan ? (
            <>
              <div className="export-summary muted text-sm">
                {plan.products.toLocaleString("tr-TR")} ürün · yaklaşık {mb(plan.bytes)} · {plan.parts.length} parça · hesaplama{" "}
                {formatDate(plan.computedAt)}
              </div>
              {plan.parts.map((p) => (
                <LinkRow
                  key={p.index}
                  url={`${root}/parca-${p.index}.xml`}
                  title={`Parça ${p.index}`}
                  meta={`${p.products.toLocaleString("tr-TR")} ürün · ~${mb(p.bytes)}`}
                />
              ))}
            </>
          ) : null}
          <details className="export-format">
            <summary>XML içeriği</summary>
            <p className="muted text-sm">
              Her <code>&lt;urun&gt;</code>: id, stok_kodu, barkod, ad, marka, kategori, fiyat (KDV dahil, TRY), liste_fiyati, kdv_orani, stok,
              durum, url, gorseller, oem_kodlari, aciklama. Parça boyutları tahminidir; sınır 40 MB altında kalacak şekilde pay bırakılır.
            </p>
            <Link className="btn btn-ghost btn-xs" href={`/integrations?site=${tenantId}`}>
              Google / Meta / TikTok beslemeleri için Eklentiler
            </Link>
          </details>
        </Panel>
      )}
    </>
  );
}
