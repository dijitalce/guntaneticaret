import Link from "next/link";
import type { ReactNode } from "react";
import { eq } from "drizzle-orm";
import { db, getIntegrationSecrets, getTenantContext, tenantSettings } from "@guntan/db";
import { IconExternal } from "@/src/icons";
import { withBase } from "@/src/paths";
import { loadSites, SitePicker } from "@/src/site-picker";
import { Alert, EmptyState, PageHeader, StatusBadge } from "@/src/ui";
import { Toggle } from "@/src/ui-ext";

export const metadata = { title: "Eklentiler" };
export const dynamic = "force-dynamic";

const MASK = "••••••••";

function Item({
  title,
  subtitle,
  logo,
  connected,
  onLabel = "Bağlı",
  offLabel = "Bağlı değil",
  children,
}: {
  title: string;
  subtitle: string;
  logo: string;
  connected: boolean;
  onLabel?: string;
  offLabel?: string;
  children: ReactNode;
}) {
  return (
    <details className="int-item">
      <summary>
        <span className="integration-logo" aria-hidden>
          {logo}
        </span>
        <span className="int-item-text">
          <strong>{title}</strong>
          <small>{subtitle}</small>
        </span>
        <StatusBadge tone={connected ? "ok" : "neutral"}>{connected ? onLabel : offLabel}</StatusBadge>
        <svg className="int-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className="int-item-body form-stack">{children}</div>
    </details>
  );
}

function Group({ title, description, active, total, extra, children }: { title: string; description: string; active: number; total: number; extra?: ReactNode; children: ReactNode }) {
  return (
    <section className="panel int-group">
      <header className="int-group-head">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <span className={`int-count${active ? " is-on" : ""}`}>
          {active}/{total} etkin
        </span>
      </header>
      {extra ? <div className="int-group-extra">{extra}</div> : null}
      <div className="int-list">{children}</div>
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
  const sites = await loadSites();
  if (!sites.length) {
    return (
      <>
        <PageHeader title="Eklentiler" />
        <EmptyState title="Önce bir site oluşturun" />
      </>
    );
  }
  const current = sites.find((t) => t.id === sp.site) ?? sites[0]!;
  const tenantId = current.id;
  const [[settings], secrets, ctx] = await Promise.all([
    db.select().from(tenantSettings).where(eq(tenantSettings.tenantId, tenantId)).limit(1),
    getIntegrationSecrets(tenantId),
    getTenantContext(tenantId),
  ]);
  const social = (settings?.socialJson ?? {}) as Record<string, string>;
  const site = ctx.url.replace(/\/$/, "");

  const tracking = {
    ga: Boolean(settings?.gaId),
    gtm: Boolean(settings?.gtmId),
    ads: Boolean(social.googleAdsId && social.googleAdsLabel),
    meta: Boolean(social.metaPixelId),
    tiktok: Boolean(social.tiktokPixelId),
  };
  const feeds = {
    merchant: social.merchantFeed === "1",
    chatgpt: social.chatgptFeed === "1",
    bing: social.bingFeed === "1",
    meta: social.metaFeed === "1",
    tiktok: social.tiktokFeed === "1",
    pinterest: social.pinterestFeed === "1",
  };
  const search = {
    google: Boolean(social.googleVerification) || social.googleDnsVerified === "1",
    bing: Boolean(social.bingVerification) || social.bingDnsVerified === "1",
  };
  const custom = Boolean(settings?.customScripts || settings?.headerHtml);
  const on = (o: Record<string, boolean>) => Object.values(o).filter(Boolean).length;

  return (
    <>
      <PageHeader
        title="Eklentiler"
        description="Reklam, analiz, ürün beslemeleri ve arama motoru bağlantıları. Ayarlar seçili siteye uygulanır."
        actions={
          <Link className="btn btn-secondary" href="/integrations/xml">
            Tedarikçi XML senkronu
          </Link>
        }
      />
      {sp.ok ? <Alert tone="ok">Eklenti ayarları kaydedildi. Sitede birkaç saniye içinde etkin olur.</Alert> : null}
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}

      <SitePicker sites={sites} current={tenantId} href={(id) => `/integrations?site=${id}`} />

      <form action={withBase("/api/integrations")} method="post" className="int-form">
        <input type="hidden" name="tenantId" value={tenantId} />

        <Group title="Analiz ve reklam" description="Ziyaretçi ve satış ölçümü, reklam dönüşüm izleme" active={on(tracking)} total={5}>
          <Item title="Google Analytics 4" subtitle="Ziyaret ve e-ticaret analizi" logo="GA" connected={tracking.ga}>
            <div className="field">
              <label htmlFor="gaId">Ölçüm kimliği</label>
              <input className="input mono" id="gaId" name="gaId" defaultValue={settings?.gaId ?? ""} placeholder="G-XXXXXXXXXX" />
            </div>
            <div className="field">
              <label htmlFor="ga4ApiSecret">Measurement Protocol API anahtarı</label>
              <input className="input" id="ga4ApiSecret" name="ga4ApiSecret" type="password" defaultValue={secrets.ga4ApiSecret ? MASK : ""} autoComplete="off" />
              <small className="field-hint">GA4 → Yönetici → Veri akışları → Measurement Protocol API anahtarları. Satın almalar sunucudan da iletilir.</small>
            </div>
          </Item>

          <Item title="Google Tag Manager" subtitle="Etiketleri tek yerden yönetin; dataLayer e-ticaret olayları gönderilir" logo="GTM" connected={tracking.gtm}>
            <div className="field">
              <label htmlFor="gtmId">Kapsayıcı kimliği</label>
              <input className="input mono" id="gtmId" name="gtmId" defaultValue={settings?.gtmId ?? ""} placeholder="GTM-XXXXXXX" />
            </div>
          </Item>

          <Item title="Google Ads dönüşüm izleme" subtitle="Satın alma dönüşümlerini Google Ads’e bildirir" logo="Ads" connected={tracking.ads}>
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
          </Item>

          <Item title="Meta Pixel ve Dönüşüm API'si" subtitle="Facebook ve Instagram reklamları için dönüşüm izleme" logo="f" connected={tracking.meta}>
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
            <div className="field">
              <label htmlFor="metaDomainVerification">Alan adı doğrulama kodu (isteğe bağlı)</label>
              <input className="input mono" id="metaDomainVerification" name="metaDomainVerification" defaultValue={social.metaDomainVerification ?? ""} placeholder='<meta name="facebook-domain-verification" content="..."> veya yalnızca kod' />
              <small className="field-hint">Business Ayarları → Marka Güvenliği → Alan Adları → Meta etiketi yöntemi. DNS ile doğruladıysanız boş bırakın.</small>
            </div>
            <p className="muted text-sm" style={{ margin: 0 }}>
              Gönderilen olaylar: PageView, ViewContent, AddToCart, InitiateCheckout, Purchase (tarayıcı + sunucu, event_id ile tekilleştirilir; e-posta/telefon SHA-256 ile şifrelenir).
            </p>
          </Item>

          <Item title="TikTok Pixel" subtitle="TikTok reklamları için dönüşüm izleme" logo="♪" connected={tracking.tiktok}>
            <div className="field">
              <label htmlFor="tiktokPixelId">Pixel ID</label>
              <input className="input mono" id="tiktokPixelId" name="tiktokPixelId" defaultValue={social.tiktokPixelId ?? ""} placeholder="C1A2B3C4D5E6F7G8H9" />
            </div>
          </Item>
        </Group>

        <Group
          title="Ürün beslemeleri"
          description="Ürünlerinizi alışveriş platformlarına ve yapay zekâ asistanlarına otomatik gönderin"
          active={on(feeds)}
          total={6}
          extra={<Toggle name="feedAllProducts" defaultChecked={social.feedAllProducts === "1"} label="Stokta olmayanları da ekle" hint="Tüm ürün beslemelerine uygulanır. Kapalıyken yalnızca stoktaki ürünler gönderilir." />}
        >
          <Item title="Google Merchant Center" subtitle="Google Alışveriş ve Performance Max" logo="M" connected={feeds.merchant} onLabel="Yayında" offLabel="Kapalı">
            <Toggle name="merchantFeed" defaultChecked={feeds.merchant} label="Merchant beslemesini yayınla" />
            <CopyUrl url={`${site}/feeds/google.xml`} />
            <small className="field-hint">Merchant Center → Ürünler → Feed’ler → Planlanmış getirme ile bu adresi ekleyin.</small>
          </Item>

          <Item title="ChatGPT ürün kataloğu" subtitle="ChatGPT alışveriş sonuçları için OpenAI biçiminde (JSONL) besleme" logo="AI" connected={feeds.chatgpt} onLabel="Yayında" offLabel="Kapalı">
            <Toggle name="chatgptFeed" defaultChecked={feeds.chatgpt} label="ChatGPT beslemesini yayınla" />
            <CopyUrl url={`${site}/feeds/chatgpt.jsonl`} />
            <small className="field-hint">
              chatgpt.com/merchants üzerinden satıcı başvurusu yapıp bu adresi ürün kaynağı olarak verin. Görseli ve fiyatı olmayan ürünler beslemeye alınmaz.
            </small>
            <a className="btn btn-secondary btn-sm" href="https://chatgpt.com/merchants" target="_blank" rel="noreferrer">
              <IconExternal width={14} height={14} />
              ChatGPT satıcı başvurusu
            </a>
          </Item>

          <Item title="Microsoft Merchant Center (Bing)" subtitle="Bing Alışveriş, Microsoft reklamları ve Copilot" logo="B" connected={feeds.bing} onLabel="Yayında" offLabel="Kapalı">
            <Toggle name="bingFeed" defaultChecked={feeds.bing} label="Microsoft beslemesini yayınla" />
            <CopyUrl url={`${site}/feeds/bing.xml`} />
            <small className="field-hint">Microsoft Merchant Center → Mağaza → Feed’ler → Zamanlanmış indirme ile bu adresi ekleyin.</small>
          </Item>

          <Item title="Meta ürün kataloğu" subtitle="Facebook/Instagram mağaza ve dinamik reklamlar" logo="∞" connected={feeds.meta} onLabel="Yayında" offLabel="Kapalı">
            <Toggle name="metaFeed" defaultChecked={feeds.meta} label="Meta beslemesini yayınla" />
            <CopyUrl url={`${site}/feeds/meta.xml`} />
            <small className="field-hint">Commerce Manager → Katalog → Veri kaynakları → Veri akışı → Zamanlanmış akış olarak bu adresi ekleyin (günlük).</small>
          </Item>

          <Item title="TikTok ürün kataloğu" subtitle="TikTok Shop ve katalog reklamları" logo="♪" connected={feeds.tiktok} onLabel="Yayında" offLabel="Kapalı">
            <Toggle name="tiktokFeed" defaultChecked={feeds.tiktok} label="TikTok beslemesini yayınla" />
            <CopyUrl url={`${site}/feeds/tiktok.xml`} />
            <small className="field-hint">TikTok Ads Manager → Varlıklar → Kataloglar → Ürün ekle → Veri akışı (zamanlanmış) ile bu adresi ekleyin.</small>
          </Item>

          <Item title="Pinterest ürün kataloğu" subtitle="Pinterest alışveriş pinleri ve reklamları" logo="P" connected={feeds.pinterest} onLabel="Yayında" offLabel="Kapalı">
            <Toggle name="pinterestFeed" defaultChecked={feeds.pinterest} label="Pinterest beslemesini yayınla" />
            <CopyUrl url={`${site}/feeds/pinterest.xml`} />
            <small className="field-hint">Pinterest Business → Kataloglar → Veri kaynağı oluştur → bu adresi girin (para birimi TRY).</small>
            <div className="field">
              <label htmlFor="pinterestVerification">Pinterest site doğrulama kodu (isteğe bağlı)</label>
              <input className="input mono" id="pinterestVerification" name="pinterestVerification" defaultValue={social.pinterestVerification ?? ""} placeholder='<meta name="p:domain_verify" content="..."> veya yalnızca kod' />
              <small className="field-hint">Katalog için sitenin Pinterest’te doğrulanmış olması gerekir: Ayarlar → Doğrulanmış hesaplar → HTML etiketi.</small>
            </div>
          </Item>
        </Group>

        <Group title="Arama motorları" description="Site sahipliği doğrulama, site haritası ve yapay zekâ tarayıcıları" active={on(search)} total={2}>
          <Item title="Google Search Console" subtitle="Sahiplik doğrulama ve arama performansı" logo="G" connected={search.google} onLabel="Doğrulandı" offLabel="Doğrulanmadı">
            <Toggle name="googleDnsVerified" defaultChecked={social.googleDnsVerified === "1"} label="Alan adı (DNS) ile doğrulandı — kod gerekmez" />
            <div className="field">
              <label htmlFor="googleVerification">Google doğrulama kodu</label>
              <input className="input mono" id="googleVerification" name="googleVerification" defaultValue={social.googleVerification ?? ""} placeholder='<meta name="google-site-verification" content="..."> veya yalnızca kod' />
              <small className="field-hint">Search Console → Mülk ekle → URL ön eki → HTML etiketi yöntemi. Etiketin tamamını yapıştırabilirsiniz.</small>
            </div>
            <a className="btn btn-secondary btn-sm" href="https://search.google.com/search-console" target="_blank" rel="noreferrer">
              <IconExternal width={14} height={14} />
              Search Console’u aç
            </a>
          </Item>

          <Item title="Bing Webmaster Tools" subtitle="Bing, Copilot ve ChatGPT aramasında görünürlük" logo="B" connected={search.bing} onLabel="Doğrulandı" offLabel="Doğrulanmadı">
            <Toggle name="bingDnsVerified" defaultChecked={social.bingDnsVerified === "1"} label="Search Console’dan içe aktarıldı / DNS ile doğrulandı — kod gerekmez" />
            <div className="field">
              <label htmlFor="bingVerification">Bing doğrulama kodu</label>
              <input className="input mono" id="bingVerification" name="bingVerification" defaultValue={social.bingVerification ?? ""} placeholder='<meta name="msvalidate.01" content="..."> veya yalnızca kod' />
              <small className="field-hint">Bing Webmaster → Site ekle → HTML Meta etiketi. Search Console’dan içe aktarma da kullanılabilir.</small>
            </div>
            <a className="btn btn-secondary btn-sm" href="https://www.bing.com/webmasters" target="_blank" rel="noreferrer">
              <IconExternal width={14} height={14} />
              Bing Webmaster’ı aç
            </a>
          </Item>

          <div className="int-links">
            <div className="field">
              <label>Site haritası (Search Console ve Bing’e gönderin)</label>
              <CopyUrl url={`${site}/sitemap.xml`} />
            </div>
            <div className="field">
              <label>Yapay zekâ özeti (llms.txt)</label>
              <CopyUrl url={`${site}/llms.txt`} />
            </div>
          </div>
        </Group>

        <Group title="Özel kodlar" description="Canlı destek, ısı haritası gibi üçüncü parti scriptler" active={custom ? 1 : 0} total={1}>
          <Item title="Özel kodlar" subtitle="Hotjar, Clarity, canlı destek vb." logo="</>" connected={custom} onLabel="Ekli" offLabel="Yok">
            <p className="text-sm" style={{ margin: 0 }}>
              Bu kodlar site ayarlarındaki <strong>Gelişmiş</strong> bölümünden yönetilir.
            </p>
            <Link className="btn btn-secondary btn-sm" href={`/tenants/${tenantId}?sekme=gelismis`}>
              Site ayarlarına git
            </Link>
          </Item>
        </Group>

        <div className="form-actions sticky-actions">
          <span className="muted text-sm int-save-note">{current.name} için kaydedilir</span>
          <button className="btn btn-primary" type="submit">
            Eklenti ayarlarını kaydet
          </button>
        </div>
      </form>
    </>
  );
}
