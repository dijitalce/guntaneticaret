import Link from "next/link";
import { and, eq } from "drizzle-orm";
import {
  catalogHealth,
  db,
  getTenantContext,
  products,
  siteStructure,
  sitemapFileNames,
  SITEMAP_PRODUCTS_PER_FILE,
  SITEMAP_STATIC_PAGES,
  tenantSettings,
} from "@guntan/db";
import { IconExternal, IconRefresh } from "@/src/icons";
import { liveSeoCheck } from "@/src/seo-live-check";
import { loadSites, SitePicker } from "@/src/site-picker";
import { Alert, EmptyState, Kpi, PageHeader, Panel, StatusBadge, formatDate } from "@/src/ui";
import { percent } from "@/src/ui-ext";

export const metadata = { title: "SEO ve site haritası" };
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const n = (v: number) => v.toLocaleString("tr-TR");

const FILE_LABEL: Record<string, string> = {
  "sayfalar.xml": "Ana sayfa ve kurumsal sayfalar",
  "kategoriler.xml": "Ürünü olan kategoriler",
  "markalar.xml": "Araç markaları ve modelleri",
};

export default async function SeoPage({ searchParams }: { searchParams: Promise<{ site?: string; kontrol?: string }> }) {
  const sp = await searchParams;
  const sites = await loadSites();
  if (!sites.length) {
    return (
      <>
        <PageHeader title="SEO ve site haritası" />
        <EmptyState title="Önce bir site oluşturun" />
      </>
    );
  }
  const current = sites.find((s) => s.id === sp.site) ?? sites[0]!;
  const [structure, health, ctx, [settings], [sampleProduct]] = await Promise.all([
    siteStructure(current.id),
    catalogHealth(),
    getTenantContext(current.id),
    db.select({ socialJson: tenantSettings.socialJson }).from(tenantSettings).where(eq(tenantSettings.tenantId, current.id)).limit(1),
    db
      .select({ slug: products.slug })
      .from(products)
      .where(and(eq(products.status, "active"), eq(products.stockStatus, "in_stock")))
      .limit(1),
  ]);
  const site = ctx.url.replace(/\/$/, "");
  const social = (settings?.socialJson ?? {}) as Record<string, string>;

  const cats = structure.categories;
  const liveCats = cats.filter((c) => c.count > 0);
  const emptyCats = cats.filter((c) => c.count === 0);
  const models = structure.brands.flatMap((b) => b.models.map((m) => ({ ...m, brand: b.name })));
  const liveModels = models.filter((m) => m.count > 0);
  const emptyModels = models.filter((m) => m.count === 0);
  const liveBrands = structure.brands.filter((b) => b.count > 0);
  const sampleCategory = [...liveCats].sort((a, b) => b.count - a.count)[0];

  const files = sitemapFileNames(structure.products).map((file) => {
    const part = /^urunler-(\d+)\.xml$/.exec(file);
    const urls = part
      ? Math.min(SITEMAP_PRODUCTS_PER_FILE, structure.products - (Number(part[1]) - 1) * SITEMAP_PRODUCTS_PER_FILE)
      : file === "sayfalar.xml"
        ? SITEMAP_STATIC_PAGES.length + 1
        : file === "kategoriler.xml"
          ? liveCats.length
          : liveBrands.length + liveModels.length;
    return { file, label: part ? `Ürünler (${part[1]}. dosya)` : FILE_LABEL[file]!, urls };
  });
  const totalUrls = files.reduce((s, f) => s + f.urls, 0);

  const checks = sp.kontrol ? await liveSeoCheck(site, { product: sampleProduct?.slug, category: sampleCategory?.slug }) : null;
  const failed = checks?.filter((c) => !c.ok).length ?? 0;
  const siteParam = sites.length > 1 ? `site=${current.id}&` : "";

  const quality = [
    { label: "Görseli olmayan ürün", value: health.noImage, why: "Google Alışveriş, ChatGPT ve Merchant beslemeleri görselsiz ürünü listelemez; aramada tıklanma da düşer." },
    { label: "Araç uyumluluğu olmayan ürün", value: health.noFitment, why: "Marka ve model sayfalarında listelenmez; “Passat fren balatası” gibi aramalarda görünmez." },
    { label: "Kategorisi olmayan ürün", value: health.noCategory, why: "Kategori sayfalarından ulaşılamaz; yalnızca arama ve site haritasıyla bulunur." },
    { label: "Üreticisi olmayan ürün", value: health.noManufacturer, why: "Ürün verisinde marka (brand) boş kalır; Google Merchant bunu uyarı olarak gösterir." },
    { label: "Özgün açıklaması olmayan ürün", value: health.noDescription, why: "Sayfa otomatik özetle doldurulur; özgün açıklama sıralamaya katkı sağlar." },
  ];

  const engines = [
    { label: "Google Search Console doğrulaması", ok: Boolean(social.googleVerification) },
    { label: "Bing Webmaster doğrulaması", ok: Boolean(social.bingVerification) },
    { label: "Google Merchant beslemesi", ok: social.merchantFeed === "1" },
    { label: "ChatGPT ürün beslemesi", ok: social.chatgptFeed === "1" },
    { label: "Microsoft (Bing) beslemesi", ok: social.bingFeed === "1" },
  ];

  return (
    <>
      <PageHeader
        title="SEO ve site haritası"
        description="Arama motorlarına ve yapay zekâ asistanlarına bildirilen sayfalar, canlı kontrol ve ürün sayfalarının eksikleri."
        actions={
          <>
            <a className="btn btn-secondary" href={`${site}/site-haritasi`} target="_blank" rel="noreferrer">
              <IconExternal width={14} height={14} />
              HTML site haritası
            </a>
            <Link className="btn btn-primary" href={`/seo?${siteParam}kontrol=1`}>
              <IconRefresh width={14} height={14} />
              Canlı kontrolü çalıştır
            </Link>
          </>
        }
      />
      <SitePicker sites={sites} current={current.id} href={(id) => `/seo?site=${id}`} />

      <div className="kpis">
        <Kpi label="Site haritasındaki adres" value={n(totalUrls)} hint={`${files.length} dosya`} />
        <Kpi label="Ürün sayfası" value={n(structure.products)} hint={`${n(health.inStock)} ürün stokta`} />
        <Kpi label="Kategori sayfası" value={n(liveCats.length)} hint={emptyCats.length ? `${n(emptyCats.length)} boş kategori haritaya alınmadı` : "Boş kategori yok"} />
        <Kpi label="Marka ve model sayfası" value={n(liveBrands.length + liveModels.length)} hint={`${n(liveBrands.length)} marka · ${n(liveModels.length)} model`} />
      </div>

      {checks ? (
        <Panel
          title="Canlı kontrol"
          description={failed ? `${failed} kontrol başarısız. Kırmızı satırların açıklamasına bakın.` : "Tüm kontroller başarılı. Arama motorları siteyi doğru okuyabiliyor."}
          action={<StatusBadge tone={failed ? "bad" : "ok"}>{failed ? `${failed} sorun` : "Sorun yok"}</StatusBadge>}
        >
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Kontrol</th>
                  <th>Sonuç</th>
                  <th>Durum</th>
                  <th style={{ textAlign: "right" }}>Süre</th>
                </tr>
              </thead>
              <tbody>
                {checks.map((c) => (
                  <tr key={c.url + c.label}>
                    <td>
                      <a href={c.url} target="_blank" rel="noreferrer">
                        {c.label}
                      </a>
                    </td>
                    <td>
                      <StatusBadge tone={c.ok ? "ok" : "bad"}>{c.ok ? "Tamam" : "Sorun"}</StatusBadge> <span className="text-sm">{c.detail}</span>
                    </td>
                    <td className="mono text-sm">{c.status}</td>
                    <td className="text-sm" style={{ textAlign: "right" }}>
                      {(c.ms / 1000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} sn
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : (
        <Alert tone="info">
          Canlı kontrol; site haritası dosyalarını, robots.txt, llms.txt, örnek ürün ve kategori sayfasını Google’ın gördüğü gibi açar. 10–30 saniye sürebilir.{" "}
          <Link href={`/seo?${siteParam}kontrol=1`}>Şimdi çalıştır</Link>
        </Alert>
      )}

      <Panel
        title="Site haritası dosyaları"
        description={`Search Console ve Bing Webmaster’a yalnızca ${site}/sitemap.xml adresini göndermeniz yeterli; diğer dosyalar oradan bulunur. Sayılar ${formatDate(structure.generatedAt)} itibarıyla.`}
      >
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Dosya</th>
                <th>İçerik</th>
                <th style={{ textAlign: "right" }}>Adres</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="mono text-sm">sitemap.xml</td>
                <td>Dizin (Google’a gönderilecek adres)</td>
                <td style={{ textAlign: "right" }}>{files.length} dosya</td>
                <td style={{ textAlign: "right" }}>
                  <a className="btn btn-ghost btn-xs" href={`${site}/sitemap.xml`} target="_blank" rel="noreferrer">
                    <IconExternal width={13} height={13} />
                    Aç
                  </a>
                </td>
              </tr>
              {files.map((f) => (
                <tr key={f.file}>
                  <td className="mono text-sm">{f.file}</td>
                  <td>{f.label}</td>
                  <td style={{ textAlign: "right" }}>{n(f.urls)}</td>
                  <td style={{ textAlign: "right" }}>
                    <a className="btn btn-ghost btn-xs" href={`${site}/sitemaps/${f.file}`} target="_blank" rel="noreferrer">
                      <IconExternal width={13} height={13} />
                      Aç
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Ürün sayfalarındaki eksikler" description={`Tüm aktif ürünler (${n(health.active)}) üzerinden. Eksik azaldıkça Google ve yapay zekâ asistanları ürünleri daha çok önerir.`}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Eksik</th>
                <th style={{ textAlign: "right" }}>Ürün</th>
                <th style={{ textAlign: "right" }}>Oran</th>
                <th>Neden önemli</th>
              </tr>
            </thead>
            <tbody>
              {quality.map((q) => (
                <tr key={q.label}>
                  <td>
                    <strong>{q.label}</strong>
                  </td>
                  <td style={{ textAlign: "right" }}>{n(q.value)}</td>
                  <td style={{ textAlign: "right" }}>
                    <StatusBadge tone={q.value === 0 ? "ok" : q.value / Math.max(1, health.active) > 0.2 ? "bad" : "warn"}>{percent(q.value, health.active)}</StatusBadge>
                  </td>
                  <td className="text-sm muted">{q.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="seo-grid">
        <Panel title="Arama motorları ve beslemeler" description="Eklentiler sayfasından açılır.">
          <ul className="seo-checklist-list">
            {engines.map((e) => (
              <li key={e.label}>
                <StatusBadge tone={e.ok ? "ok" : "warn"}>{e.ok ? "Açık" : "Kapalı"}</StatusBadge>
                <span>{e.label}</span>
              </li>
            ))}
          </ul>
          <div className="seo-links">
            <Link className="btn btn-secondary btn-sm" href={`/integrations?site=${current.id}`}>
              Eklentilere git
            </Link>
            <a className="btn btn-ghost btn-sm" href="https://search.google.com/search-console" target="_blank" rel="noreferrer">
              <IconExternal width={13} height={13} />
              Search Console
            </a>
            <a className="btn btn-ghost btn-sm" href="https://www.bing.com/webmasters" target="_blank" rel="noreferrer">
              <IconExternal width={13} height={13} />
              Bing Webmaster
            </a>
            {sampleProduct ? (
              <a
                className="btn btn-ghost btn-sm"
                href={`https://search.google.com/test/rich-results?url=${encodeURIComponent(`${site}/urun/${sampleProduct.slug}`)}`}
                target="_blank"
                rel="noreferrer"
              >
                <IconExternal width={13} height={13} />
                Zengin sonuç testi (örnek ürün)
              </a>
            ) : null}
          </div>
        </Panel>

        <Panel title="Haritaya alınmayan boş sayfalar" description="Ürünü olmayan sayfalar Google’da “zayıf içerik” sayılır; ürün eklenince otomatik olarak haritaya girer.">
          <details className="seo-empty">
            <summary>
              {n(emptyCats.length)} boş kategori
            </summary>
            <p className="text-sm">{emptyCats.length ? emptyCats.map((c) => c.name).join(", ") : "Yok"}</p>
          </details>
          <details className="seo-empty">
            <summary>
              {n(emptyModels.length)} boş araç modeli
            </summary>
            <p className="text-sm">
              {emptyModels.length
                ? emptyModels
                    .slice(0, 200)
                    .map((m) => `${m.brand} ${m.name}`)
                    .join(", ") + (emptyModels.length > 200 ? ` ve ${n(emptyModels.length - 200)} model daha` : "")
                : "Yok"}
            </p>
          </details>
        </Panel>
      </div>
    </>
  );
}
