import Link from "next/link";
import type { ReactNode } from "react";
import { asc, eq } from "drizzle-orm";
import { db, getIntegrationSecrets, getTenantContext, tenantSettings, tenants } from "@guntan/db";
import { IconExternal } from "@/src/icons";
import { withBase } from "@/src/paths";
import { Alert, EmptyState, PageHeader, StatusBadge } from "@/src/ui";
import { TabNav, Toggle } from "@/src/ui-ext";

export const metadata = { title: "Eklentiler" };
export const dynamic = "force-dynamic";

const MASK = "••••••••";

function Card({ title, subtitle, logo, connected, children }: { title: string; subtitle: string; logo: string; connected: boolean; children: ReactNode }) {
  return (
    <section className="panel integration-card">
      <div className="integration-head">
        <span className="integration-logo" aria-hidden>
          {logo}
        </span>
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <StatusBadge tone={connected ? "ok" : "neutral"}>{connected ? "Bağlı" : "Bağlı değil"}</StatusBadge>
      </div>
      <div className="panel-pad form-stack">{children}</div>
    </section>
  );
}

function CopyUrl({ url }: { url: string }) {
  return (
    <div className="copy-url">
      <code>{url}</code>
      <a className="btn btn-ghost btn-xs" href={url} target="_blank" rel="noreferrer">
        <IconExternal width={13} height={13} />
        Aç
      </a>
    </div>
  );
}

export default async function IntegrationsPage({ searchParams }: { searchParams: Promise<{ site?: string; ok?: string; hata?: string }> }) {
  const sp = await searchParams;
  const tenantRows = await db.select({ id: tenants.id, name: tenants.name }).from(tenants).orderBy(asc(tenants.name));
  if (!tenantRows.length) {
    return (
      <>
        <PageHeader title="Eklentiler" />
        <EmptyState title="Önce bir site oluşturun" />
      </>
    );
  }
  const tenantId = tenantRows.find((t) => t.id === sp.site)?.id ?? tenantRows[0]!.id;
  const [[settings], secrets, ctx] = await Promise.all([
    db.select().from(tenantSettings).where(eq(tenantSettings.tenantId, tenantId)).limit(1),
    getIntegrationSecrets(tenantId),
    getTenantContext(tenantId),
  ]);
  const social = (settings?.socialJson ?? {}) as Record<string, string>;
  const site = ctx.url.replace(/\/$/, "");

  return (
    <>
      <PageHeader
        title="Eklentiler"
        description="Reklam, analiz ve ürün kataloğu entegrasyonları. Ayarlar seçili siteye uygulanır."
        actions={
          <Link className="btn btn-secondary" href="/integrations/xml">
            Tedarikçi XML senkronu
          </Link>
        }
      />
      {sp.ok ? <Alert tone="ok">Eklenti ayarları kaydedildi. Sitede birkaç saniye içinde etkin olur.</Alert> : null}
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}
      {tenantRows.length > 1 ? (
        <TabNav label="Site" active={tenantId} items={tenantRows.map((t) => ({ key: t.id, label: t.name, href: `/integrations?site=${t.id}` }))} />
      ) : null}

      <form action={withBase("/api/integrations")} method="post">
        <input type="hidden" name="tenantId" value={tenantId} />
        <div className="integration-grid">
          <Card title="Meta Pixel ve Dönüşüm API'si" subtitle="Facebook ve Instagram reklamları için gelişmiş dönüşüm izleme" logo="f" connected={Boolean(social.metaPixelId)}>
            <div className="field">
              <label htmlFor="metaPixelId">Pixel ID</label>
              <input className="input mono" id="metaPixelId" name="metaPixelId" defaultValue={social.metaPixelId ?? ""} placeholder="123456789012345" />
            </div>
            <div className="field">
              <label htmlFor="metaCapiToken">Conversions API erişim anahtarı</label>
              <input className="input" id="metaCapiToken" name="metaCapiToken" type="password" defaultValue={secrets.metaCapiToken ? MASK : ""} autoComplete="off" />
              <small className="field-hint">Events Manager → Ayarlar → Dönüşüm API’si → Erişim anahtarı oluştur. Satın almalar sunucudan da gönderilir (reklam engelleyicilere takılmaz).</small>
            </div>
            <div className="field">
              <label htmlFor="metaTestCode">Test olay kodu (isteğe bağlı)</label>
              <input className="input mono" id="metaTestCode" name="metaTestCode" defaultValue={secrets.metaTestCode} placeholder="TEST12345" />
              <small className="field-hint">Test bitince boşaltın; aksi halde olaylar yalnızca test ekranında görünür.</small>
            </div>
            <p className="muted text-sm" style={{ margin: 0 }}>
              Gönderilen olaylar: PageView, ViewContent, AddToCart, InitiateCheckout, Purchase (tarayıcı + sunucu, event_id ile tekilleştirilir; e-posta/telefon SHA-256 ile şifrelenir).
            </p>
          </Card>

          <Card title="Meta ürün kataloğu" subtitle="Facebook/Instagram mağaza ve dinamik reklamlar için ürün feed’i" logo="∞" connected={social.metaFeed === "1"}>
            <Toggle name="metaFeed" defaultChecked={social.metaFeed === "1"} label="Katalog feed’ini yayınla" />
            <CopyUrl url={`${site}/feeds/meta.xml`} />
            <small className="field-hint">Commerce Manager → Katalog → Veri kaynakları → Veri akışı → Zamanlanmış akış olarak bu adresi ekleyin (günlük).</small>
          </Card>

          <Card title="Google Analytics 4" subtitle="Ziyaret ve e-ticaret analizi" logo="GA" connected={Boolean(settings?.gaId)}>
            <div className="field">
              <label htmlFor="gaId">Ölçüm kimliği</label>
              <input className="input mono" id="gaId" name="gaId" defaultValue={settings?.gaId ?? ""} placeholder="G-XXXXXXXXXX" />
            </div>
            <div className="field">
              <label htmlFor="ga4ApiSecret">Measurement Protocol API anahtarı</label>
              <input className="input" id="ga4ApiSecret" name="ga4ApiSecret" type="password" defaultValue={secrets.ga4ApiSecret ? MASK : ""} autoComplete="off" />
              <small className="field-hint">GA4 → Yönetici → Veri akışları → Measurement Protocol API anahtarları. Satın almalar sunucudan da iletilir.</small>
            </div>
          </Card>

          <Card title="Google Ads dönüşüm izleme" subtitle="Satın alma dönüşümlerini Google Ads’e bildirir (gelişmiş dönüşümler dahil)" logo="Ads" connected={Boolean(social.googleAdsId && social.googleAdsLabel)}>
            <div className="form-row">
              <div className="field">
                <label htmlFor="googleAdsId">Dönüşüm kimliği</label>
                <input className="input mono" id="googleAdsId" name="googleAdsId" defaultValue={social.googleAdsId ?? ""} placeholder="AW-123456789" />
              </div>
              <div className="field">
                <label htmlFor="googleAdsLabel">Dönüşüm etiketi</label>
                <input className="input mono" id="googleAdsLabel" name="googleAdsLabel" defaultValue={social.googleAdsLabel ?? ""} placeholder="AbC-D_efG-h12_34" />
              </div>
            </div>
          </Card>

          <Card title="Google Merchant Center" subtitle="Google Alışveriş ve Performance Max için ürün feed’i" logo="M" connected={social.merchantFeed === "1"}>
            <Toggle name="merchantFeed" defaultChecked={social.merchantFeed === "1"} label="Merchant feed’ini yayınla" />
            <CopyUrl url={`${site}/feeds/google.xml`} />
            <Toggle name="feedAllProducts" defaultChecked={social.feedAllProducts === "1"} label="Stokta olmayanları da ekle" hint="Kapalıyken yalnızca stoktaki ürünler feed’e girer." />
            <small className="field-hint">Merchant Center → Ürünler → Feed’ler → Planlanmış getirme ile bu adresi ekleyin.</small>
          </Card>

          <Card title="Google Tag Manager" subtitle="Etiketleri tek yerden yönetin; dataLayer e-ticaret olayları gönderilir" logo="GTM" connected={Boolean(settings?.gtmId)}>
            <div className="field">
              <label htmlFor="gtmId">Kapsayıcı kimliği</label>
              <input className="input mono" id="gtmId" name="gtmId" defaultValue={settings?.gtmId ?? ""} placeholder="GTM-XXXXXXX" />
            </div>
          </Card>

          <Card title="TikTok Pixel" subtitle="TikTok reklamları için dönüşüm izleme" logo="♪" connected={Boolean(social.tiktokPixelId)}>
            <div className="field">
              <label htmlFor="tiktokPixelId">Pixel ID</label>
              <input className="input mono" id="tiktokPixelId" name="tiktokPixelId" defaultValue={social.tiktokPixelId ?? ""} placeholder="C1A2B3C4D5E6F7G8H9" />
            </div>
          </Card>

          <Card title="Google Search Console" subtitle="Site sahipliği doğrulama, site haritası ve arama performansı" logo="SC" connected={Boolean(social.googleVerification)}>
            <div className="field">
              <label htmlFor="googleVerification">Google doğrulama kodu</label>
              <input className="input mono" id="googleVerification" name="googleVerification" defaultValue={social.googleVerification ?? ""} placeholder='<meta name="google-site-verification" content="..."> veya yalnızca kod' />
              <small className="field-hint">Search Console → Mülk ekle → URL ön eki → HTML etiketi yöntemi. Etiketin tamamını yapıştırabilirsiniz.</small>
            </div>
            <div className="field">
              <label htmlFor="bingVerification">Bing doğrulama kodu (isteğe bağlı)</label>
              <input className="input mono" id="bingVerification" name="bingVerification" defaultValue={social.bingVerification ?? ""} />
            </div>
            <div className="field">
              <label>Site haritası (Search Console’a gönderin)</label>
              <CopyUrl url={`${site}/sitemap.xml`} />
            </div>
            <a className="btn btn-secondary btn-sm" href="https://search.google.com/search-console" target="_blank" rel="noreferrer">
              <IconExternal width={14} height={14} />
              Search Console’u aç
            </a>
          </Card>

          <Card title="Özel kodlar" subtitle="Canlı destek, ısı haritası vb. üçüncü parti scriptler" logo="</>" connected={Boolean(settings?.customScripts || settings?.headerHtml)}>
            <p className="text-sm" style={{ margin: 0 }}>
              Hotjar, Clarity, canlı destek gibi kodları site ayarlarındaki <strong>Gelişmiş</strong> bölümünden ekleyebilirsiniz.
            </p>
            <Link className="btn btn-secondary btn-sm" href={`/tenants/${tenantId}?sekme=gelismis`}>
              Site ayarlarına git
            </Link>
          </Card>
        </div>
        <div className="form-actions sticky-actions">
          <button className="btn btn-primary" type="submit">
            Eklenti ayarlarını kaydet
          </button>
        </div>
      </form>
    </>
  );
}
