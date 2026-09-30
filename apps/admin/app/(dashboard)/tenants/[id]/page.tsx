import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, count, eq } from "drizzle-orm";
import {
  brandGroupMembers,
  brandGroups,
  db,
  tenantBankAccounts,
  tenantCatalogIndex,
  tenantCatalogRules,
  tenantDomains,
  tenantSettings,
  tenants,
  tenantVisibleBrands,
  vehicleBrands,
} from "@guntan/db";
import { CATALOG_RULE_KIND, DEFAULT_THEME_TOKENS, SEO_SOCIAL_KEYS, SOCIAL_LINKS } from "@guntan/types";
import { ConfirmButton, ImageUrlField } from "@/src/form-fields";
import { IconBank, IconCheck, IconExternal, IconGlobe, IconPlus, IconTrash } from "@/src/icons";
import { withBase } from "@/src/paths";
import { ScoreRing, SeoChecklist } from "@/src/seo-checklist";
import { SeoEditor } from "@/src/seo-editor";
import { assetBase, assetUrl } from "@/src/storefront";
import { TENANT_STATUS_META, seoAudit } from "@/src/tenant-seo";
import { ThemeFields } from "@/src/theme-fields";
import { Alert, EmptyState, PageHeader, Panel, StatusBadge, formatDate } from "@/src/ui";
import { VisibilityFields } from "@/src/visibility-fields";

export const metadata = { title: "Site ayarları" };

const TABS = [
  { key: "genel", label: "Genel" },
  { key: "alan-adlari", label: "Alan adları" },
  { key: "seo", label: "SEO" },
  { key: "gorunum", label: "Görünüm" },
  { key: "iletisim", label: "İletişim" },
  { key: "katalog", label: "Katalog" },
  { key: "banka", label: "Banka" },
  { key: "gelismis", label: "Gelişmiş" },
] as const;
type Tab = (typeof TABS)[number]["key"];

const OK: Record<string, string> = {
  olusturuldu: "Site oluşturuldu. Katalog arka planda hazırlanıyor. SEO sekmesindeki eksikleri tamamlamayı unutmayın.",
  kaydedildi: "Değişiklikler kaydedildi. Sitede birkaç dakika içinde görünür.",
  derleniyor: "Katalog kuralları kaydedildi. Görünür markalar ve ürünler arka planda yeniden hesaplanıyor (birkaç dakika sürebilir).",
  "alan-eklendi": "Alan adı eklendi. DNS kaydının sunucuya yönlendirildiğinden emin olun.",
  "alan-silindi": "Alan adı kaldırıldı.",
  birincil: "Birincil alan adı güncellendi. Canonical adresler ve site haritası artık bu alan adını kullanır.",
  "banka-eklendi": "Banka hesabı eklendi.",
  "banka-silindi": "Banka hesabı silindi.",
};

export default async function TenantEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sekme?: string; ok?: string; hata?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const tab: Tab = TABS.some((t) => t.key === sp.sekme) ? (sp.sekme as Tab) : "genel";

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  if (!tenant) notFound();
  const [[settingsRow], domains, rules, banks, [visibleBrandRow], [indexRow]] = await Promise.all([
    db.select().from(tenantSettings).where(eq(tenantSettings.tenantId, id)).limit(1),
    db.select().from(tenantDomains).where(eq(tenantDomains.tenantId, id)).orderBy(asc(tenantDomains.hostname)),
    db.select().from(tenantCatalogRules).where(eq(tenantCatalogRules.tenantId, id)),
    db.select().from(tenantBankAccounts).where(eq(tenantBankAccounts.tenantId, id)).orderBy(asc(tenantBankAccounts.sortOrder)),
    db.select({ n: count() }).from(tenantVisibleBrands).where(eq(tenantVisibleBrands.tenantId, id)),
    tenant.visibilityMode === "ALL"
      ? Promise.resolve([{ n: -1 }])
      : db.select({ n: count() }).from(tenantCatalogIndex).where(eq(tenantCatalogIndex.tenantId, id)),
  ]);
  const settings = settingsRow ?? null;
  const social = (settings?.socialJson ?? {}) as Record<string, string>;
  const theme = { ...DEFAULT_THEME_TOKENS, ...((settings?.themeTokens ?? {}) as Record<string, string>) };
  const primary = domains.find((d) => d.isPrimary) ?? domains[0];
  const siteName = settings?.siteName ?? tenant.name;
  const siteUrl = primary ? `https://${primary.hostname}` : null;
  const status = TENANT_STATUS_META[tenant.status] ?? TENANT_STATUS_META.draft!;
  const audit = seoAudit({
    status: tenant.status,
    siteName,
    defaultMetaTitle: settings?.defaultMetaTitle ?? null,
    defaultMetaDescription: settings?.defaultMetaDescription ?? null,
    seoTitleTemplate: settings?.seoTitleTemplate ?? null,
    seoContent: settings?.seoContent ?? null,
    ogImageUrl: settings?.ogImageUrl ?? null,
    faviconUrl: settings?.faviconUrl ?? null,
    logoUrl: settings?.logoUrl ?? null,
    phone: settings?.phone ?? null,
    address: settings?.address ?? null,
    gaId: settings?.gaId ?? null,
    gtmId: settings?.gtmId ?? null,
    social,
    hasPrimaryDomain: !!primary,
  });
  const tabHref = (key: string) => `/tenants/${id}?sekme=${key}`;
  const action = withBase(`/api/tenants/${id}`);
  const base = assetBase();

  return (
    <>
      <PageHeader
        title={siteName}
        description={primary ? primary.hostname : "Alan adı tanımlı değil"}
        crumbs={[{ href: "/tenants", label: "Siteler" }]}
        actions={
          <>
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            {siteUrl && tenant.status !== "draft" ? (
              <a className="btn btn-secondary" href={siteUrl} target="_blank" rel="noreferrer">
                <IconExternal />
                Siteyi aç
              </a>
            ) : null}
          </>
        }
      />
      {sp.ok && OK[sp.ok] ? <Alert tone="ok">{OK[sp.ok]}</Alert> : null}
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}

      <nav className="tabs tabs-page" aria-label="Site ayarları">
        {TABS.map((t) => (
          <Link key={t.key} href={tabHref(t.key)} className={tab === t.key ? "is-active" : undefined}>
            {t.label}
            {t.key === "seo" ? <span className={`tab-score is-${audit.tone}`}>{audit.score}</span> : null}
            {t.key === "alan-adlari" ? <span>{domains.length}</span> : null}
            {t.key === "banka" ? <span>{banks.length}</span> : null}
          </Link>
        ))}
      </nav>

      {tab === "genel" ? (
        <div className="grid-2">
          <div>
            <Panel title="Site kimliği" description="Panelde ve vitrinde kullanılan adlar ile yayın durumu." padded>
              <form action={action} method="post" className="form-stack">
                <input type="hidden" name="_section" value="genel" />
                <div className="form-row">
                  <div className="field">
                    <label htmlFor="name">Panel adı</label>
                    <input className="input" id="name" name="name" defaultValue={tenant.name} required />
                    <small className="field-hint">Sadece yönetim panelinde görünür.</small>
                  </div>
                  <div className="field">
                    <label htmlFor="siteName">Vitrin adı (marka)</label>
                    <input className="input" id="siteName" name="siteName" defaultValue={siteName} required />
                    <small className="field-hint">Başlık şablonundaki {"{siteName}"}, logo alt metni ve alt bilgide kullanılır.</small>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="slug">Site kodu</label>
                  <input className="input" id="slug" value={tenant.slug} readOnly disabled />
                  <small className="field-hint">Sistem içi eşleşmeler için sabittir.</small>
                </div>
                <div className="field">
                  <label>Yayın durumu</label>
                  <div className="choice-grid is-3">
                    {Object.entries(TENANT_STATUS_META).map(([value, meta]) => (
                      <label key={value} className="choice-card is-radio">
                        <input type="radio" name="status" value={value} defaultChecked={tenant.status === value} />
                        <strong>
                          <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                        </strong>
                        <span>{meta.hint}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-actions">
                  <button className="btn btn-primary" type="submit">
                    Kaydet
                  </button>
                </div>
              </form>
            </Panel>
          </div>
          <div>
            <Panel title="SEO sağlığı" action={<ScoreRing score={audit.score} tone={audit.tone} size={48} />} padded>
              <SeoChecklist checks={audit.checks.filter((c) => !c.ok).slice(0, 5)} hrefFor={tabHref} />
              {audit.checks.every((c) => c.ok) ? <p className="muted text-sm">Tüm temel SEO kontrolleri tamam.</p> : null}
              <Link className="btn btn-secondary btn-sm" href={tabHref("seo")} style={{ marginTop: "0.8rem" }}>
                SEO ayarlarına git
              </Link>
            </Panel>
            <Panel title="Özet" padded>
              <dl className="dl-rows">
                <div>
                  <dt>Birincil alan adı</dt>
                  <dd>{primary?.hostname ?? "—"}</dd>
                </div>
                <div>
                  <dt>Katalog</dt>
                  <dd>{tenant.visibilityMode === "ALL" ? "Tüm katalog" : "Seçili markalar"}</dd>
                </div>
                <div>
                  <dt>Görünür marka</dt>
                  <dd>{(visibleBrandRow?.n ?? 0).toLocaleString("tr-TR")}</dd>
                </div>
                <div>
                  <dt>Görünür ürün</dt>
                  <dd>{indexRow && indexRow.n >= 0 ? indexRow.n.toLocaleString("tr-TR") : "Tümü"}</dd>
                </div>
                <div>
                  <dt>Aktif banka hesabı</dt>
                  <dd>{banks.filter((b) => b.isActive).length}</dd>
                </div>
                <div>
                  <dt>Oluşturulma</dt>
                  <dd>{formatDate(tenant.createdAt, false)}</dd>
                </div>
              </dl>
            </Panel>
          </div>
        </div>
      ) : null}

      {tab === "alan-adlari" ? (
        <div className="grid-2">
          <div>
            <Panel title="Bağlı alan adları" description="Birincil alan adı canonical adreslerde, site haritasında ve paylaşımlarda kullanılır.">
              {domains.length === 0 ? (
                <EmptyState title="Alan adı yok" description="Site ziyaret edilemez; sağdan bir alan adı ekleyin." icon={IconGlobe} />
              ) : (
                <ul className="domain-list">
                  {domains.map((d) => (
                    <li key={d.id}>
                      <IconGlobe />
                      <div>
                        <a href={`https://${d.hostname}`} target="_blank" rel="noreferrer">
                          {d.hostname}
                        </a>
                        <small>{d.isPrimary ? "Birincil — diğer alan adları buna yönlendirilmeli" : "Ek alan adı"}</small>
                      </div>
                      {d.isPrimary ? (
                        <StatusBadge tone="ok">Birincil</StatusBadge>
                      ) : (
                        <form action={withBase(`/api/tenants/${id}/domains`)} method="post" className="icon-actions">
                          <input type="hidden" name="domainId" value={d.id} />
                          <button className="btn btn-ghost btn-sm" name="_action" value="primary" type="submit">
                            <IconCheck />
                            Birincil yap
                          </button>
                          <ConfirmButton
                            className="icon-btn is-danger"
                            name="_action"
                            value="delete"
                            title="Kaldır"
                            message={`${d.hostname} bu siteden kaldırılsın mı?`}
                          >
                            <IconTrash />
                          </ConfirmButton>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
          <div>
            <Panel title="Alan adı ekle" padded>
              <form action={withBase(`/api/tenants/${id}/domains`)} method="post" className="form-stack">
                <input type="hidden" name="_action" value="add" />
                <div className="field">
                  <label htmlFor="hostname">Alan adı</label>
                  <input className="input" id="hostname" name="hostname" placeholder="ornekotoparca.com" required />
                  <small className="field-hint">“https://” ve “www.” yazmanıza gerek yok; otomatik temizlenir.</small>
                </div>
                <label className="switch-field" style={{ paddingTop: 0 }}>
                  <input type="checkbox" name="primary" />
                  <span className="switch" aria-hidden />
                  <span>
                    <strong>Birincil yap</strong>
                    <small>Canonical adresler bu alan adına geçer.</small>
                  </span>
                </label>
                <button className="btn btn-primary" type="submit">
                  <IconPlus />
                  Ekle
                </button>
              </form>
            </Panel>
            <Panel title="DNS ve SEO notları" padded>
              <ul className="note-list">
                <li>Alan adının A kaydı sunucu IP’sine (Hostinger) yönlenmiş olmalı.</li>
                <li>Aynı içerik birden fazla alan adında yayınlanırsa Google yinelenen içerik görür; ek alan adlarını hosting panelinden birincile 301 yönlendirin.</li>
                <li>Birincil alan adını değiştirirseniz Search Console’a yeni mülkü ekleyip site haritasını tekrar gönderin.</li>
              </ul>
            </Panel>
          </div>
        </div>
      ) : null}

      {tab === "seo" ? (
        <form action={action} method="post" className="grid-2">
          <input type="hidden" name="_section" value="seo" />
          <input type="hidden" name="_seoFlags" value="1" />
          <div>
            <Panel title="Arama motoru görünümü" description="Ana sayfa başlığı, açıklaması, alt sayfa şablonu ve paylaşım görseli." padded>
              <SeoEditor
                siteName={siteName}
                host={primary?.hostname ?? ""}
                assetBase={base}
                faviconUrl={settings?.faviconUrl}
                defaults={{
                  title: settings?.defaultMetaTitle ?? "",
                  description: settings?.defaultMetaDescription ?? "",
                  template: settings?.seoTitleTemplate ?? "",
                  ogImageUrl: settings?.ogImageUrl ?? "",
                  seoContent: settings?.seoContent ?? "",
                }}
              />
            </Panel>
            <Panel title="Ölçüm ve doğrulama" description="Google Search Console, Bing, Yandex doğrulamaları ve analitik kimlikleri." padded>
              <div className="form-stack">
                <div className="form-row">
                  <div className="field">
                    <label htmlFor="gaId">Google Analytics 4 ölçüm kimliği</label>
                    <input className="input mono" id="gaId" name="gaId" defaultValue={settings?.gaId ?? ""} placeholder="G-XXXXXXXXXX" />
                  </div>
                  <div className="field">
                    <label htmlFor="gtmId">Google Tag Manager</label>
                    <input className="input mono" id="gtmId" name="gtmId" defaultValue={settings?.gtmId ?? ""} placeholder="GTM-XXXXXXX" />
                    <small className="field-hint">GTM içinde GA4 varsa yukarıdaki alanı boş bırakın (çift sayım olmasın).</small>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor={SEO_SOCIAL_KEYS.googleVerification}>Google Search Console doğrulama kodu</label>
                  <input
                    className="input mono"
                    id={SEO_SOCIAL_KEYS.googleVerification}
                    name={SEO_SOCIAL_KEYS.googleVerification}
                    defaultValue={social[SEO_SOCIAL_KEYS.googleVerification] ?? ""}
                    placeholder='<meta name="google-site-verification" content="…"> veya sadece kod'
                  />
                  <small className="field-hint">Search Console → Mülk ekle → “HTML etiketi” yöntemi. Etiketin tamamını yapıştırabilirsiniz.</small>
                </div>
                <div className="form-row">
                  <div className="field">
                    <label htmlFor={SEO_SOCIAL_KEYS.bingVerification}>Bing Webmaster (msvalidate.01)</label>
                    <input
                      className="input mono"
                      id={SEO_SOCIAL_KEYS.bingVerification}
                      name={SEO_SOCIAL_KEYS.bingVerification}
                      defaultValue={social[SEO_SOCIAL_KEYS.bingVerification] ?? ""}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor={SEO_SOCIAL_KEYS.yandexVerification}>Yandex Webmaster</label>
                    <input
                      className="input mono"
                      id={SEO_SOCIAL_KEYS.yandexVerification}
                      name={SEO_SOCIAL_KEYS.yandexVerification}
                      defaultValue={social[SEO_SOCIAL_KEYS.yandexVerification] ?? ""}
                    />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor={SEO_SOCIAL_KEYS.twitterHandle}>X (Twitter) kullanıcı adı</label>
                  <input
                    className="input"
                    id={SEO_SOCIAL_KEYS.twitterHandle}
                    name={SEO_SOCIAL_KEYS.twitterHandle}
                    defaultValue={social[SEO_SOCIAL_KEYS.twitterHandle] ?? ""}
                    placeholder="@kullaniciadi"
                  />
                  <small className="field-hint">Paylaşım kartlarında “twitter:site” olarak kullanılır.</small>
                </div>
              </div>
            </Panel>
            <Panel title="İndeksleme" padded>
              <label className="switch-field" style={{ paddingTop: 0 }}>
                <input type="checkbox" name="noindex" defaultChecked={social[SEO_SOCIAL_KEYS.noindex] === "1"} />
                <span className="switch" aria-hidden />
                <span>
                  <strong>Arama motorlarından gizle (noindex)</strong>
                  <small>
                    Test veya hazırlık aşamasındaki siteler için. Açıkken robots.txt tüm sayfaları engeller ve sayfalara “noindex” eklenir.
                  </small>
                </span>
              </label>
            </Panel>
            <div className="sticky-actions">
              <button className="btn btn-primary" type="submit">
                SEO ayarlarını kaydet
              </button>
            </div>
          </div>
          <div>
            <Panel title="SEO kontrol listesi" description="Temel teknik ve içerik kontrolleri." action={<ScoreRing score={audit.score} tone={audit.tone} size={52} />} padded>
              <SeoChecklist checks={audit.checks} hrefFor={tabHref} />
            </Panel>
            {siteUrl ? (
              <Panel title="Hızlı kontroller" padded>
                <div className="link-list">
                  <a href={`${siteUrl}/sitemap.xml`} target="_blank" rel="noreferrer">
                    <IconExternal /> Site haritası (sitemap.xml)
                  </a>
                  <a href={`${siteUrl}/robots.txt`} target="_blank" rel="noreferrer">
                    <IconExternal /> robots.txt
                  </a>
                  <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer">
                    <IconExternal /> Google Search Console
                  </a>
                  <a href={`https://search.google.com/test/rich-results?url=${encodeURIComponent(siteUrl)}`} target="_blank" rel="noreferrer">
                    <IconExternal /> Zengin sonuç testi
                  </a>
                  <a href={`https://pagespeed.web.dev/analysis?url=${encodeURIComponent(siteUrl)}`} target="_blank" rel="noreferrer">
                    <IconExternal /> PageSpeed Insights
                  </a>
                </div>
              </Panel>
            ) : null}
            <Panel title="Otomatik yapılanlar" padded>
              <ul className="note-list">
                <li>Her sayfada canonical adres, Open Graph ve Twitter kartı</li>
                <li>Ürün, marka, model ve kategori sayfaları için başlık şablonu</li>
                <li>WebSite + arama kutusu, Organization, Breadcrumb ve ürün listesi yapısal verisi</li>
                <li>Görünür markalara göre otomatik site haritası</li>
              </ul>
            </Panel>
          </div>
        </form>
      ) : null}

      {tab === "gorunum" ? (
        <form action={action} method="post" className="form-page is-wide form-stack">
          <input type="hidden" name="_section" value="gorunum" />
          <Panel title="Logo ve görseller" description="Göreli yol (/brand/logo.png) veya tam adres (https://…) girebilirsiniz." padded>
            <div className="form-row">
              <ImageUrlField name="logoUrl" label="Logo" defaultValue={settings?.logoUrl ?? ""} storefrontUrl={base} fallback="Logo" hint="Önerilen: şeffaf PNG/SVG, en az 320×160." />
              <ImageUrlField name="logoDarkUrl" label="Koyu zemin logosu" defaultValue={settings?.logoDarkUrl ?? ""} storefrontUrl={base} fallback="Logo" hint="Koyu arka planlar için açık renkli sürüm (isteğe bağlı)." />
              <ImageUrlField name="faviconUrl" label="Favicon" defaultValue={settings?.faviconUrl ?? ""} storefrontUrl={base} fallback="ico" hint="Kare, en az 48×48 (Google sonuçlarında görünür)." />
              <ImageUrlField name="placeholderImageUrl" label="Görselsiz ürün resmi" defaultValue={settings?.placeholderImageUrl ?? ""} storefrontUrl={base} fallback="—" hint="Ürün görseli olmadığında gösterilir." />
            </div>
          </Panel>
          <Panel title="Tema renkleri" description="Değişiklikleri sağdaki önizlemede anında görün." padded>
            <ThemeFields
              siteName={siteName}
              defaults={{ primary: theme.primary!, secondary: theme.secondary!, accent: theme.accent!, background: theme.background! }}
            />
          </Panel>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit">
              Görünümü kaydet
            </button>
          </div>
        </form>
      ) : null}

      {tab === "iletisim" ? (
        <form action={action} method="post" className="form-page is-wide form-stack">
          <input type="hidden" name="_section" value="iletisim" />
          {tenant.slug === "guntan" ? (
            <Alert tone="info">Bu sitede telefon, WhatsApp ve adres şirket bilgilerinden otomatik gösterilir; buradaki değerler yapısal veri ve e-postalarda kullanılır.</Alert>
          ) : null}
          <Panel title="İletişim bilgileri" description="Üst bar, alt bilgi, iletişim sayfası ve Organization yapısal verisinde kullanılır." padded>
            <div className="form-stack">
              <div className="form-row">
                <div className="field">
                  <label htmlFor="phone">Telefon</label>
                  <input className="input" id="phone" name="phone" defaultValue={settings?.phone ?? ""} placeholder="0216 000 00 00" />
                </div>
                <div className="field">
                  <label htmlFor="whatsapp">WhatsApp</label>
                  <input className="input" id="whatsapp" name="whatsapp" defaultValue={settings?.whatsapp ?? ""} placeholder="0532 000 00 00" />
                  <small className="field-hint">
                    {settings?.whatsapp ? (
                      <>
                        Bağlantı: <code>wa.me/{settings.whatsapp}</code>
                      </>
                    ) : (
                      "Başında 0 olsa da olur; 90… biçimine çevrilir."
                    )}
                  </small>
                </div>
                <div className="field">
                  <label htmlFor="email">E-posta</label>
                  <input className="input" id="email" name="email" type="email" defaultValue={settings?.email ?? ""} placeholder="info@ornek.com" />
                </div>
              </div>
              <div className="field">
                <label htmlFor="address">Adres</label>
                <textarea id="address" name="address" rows={2} defaultValue={settings?.address ?? ""} placeholder="Mahalle, cadde, no, ilçe / il" />
                <small className="field-hint">Yerel aramalarda (örn. “yedek parça Kadıköy”) güven sinyali olarak kullanılır.</small>
              </div>
            </div>
          </Panel>
          <Panel title="Sosyal medya" description="Organization yapısal verisine “sameAs” olarak eklenir." padded>
            <div className="form-row">
              {SOCIAL_LINKS.map((l) => (
                <div className="field" key={l.key}>
                  <label htmlFor={`social_${l.key}`}>{l.label}</label>
                  <input className="input" id={`social_${l.key}`} name={`social_${l.key}`} defaultValue={social[l.key] ?? ""} placeholder={l.placeholder} />
                </div>
              ))}
            </div>
          </Panel>
          {tenant.visibilityMode !== "ALL" ? (
            <Panel title="Tüm parçalar bağlantısı" padded>
              <div className="field">
                <label htmlFor="allCatalogUrl">Ana katalog adresi</label>
                <input className="input" id="allCatalogUrl" name="allCatalogUrl" defaultValue={social.allCatalogUrl ?? ""} placeholder="https://guntanotoyedekparca.com" />
                <small className="field-hint">Menüdeki “Tüm parçalar” düğmesi bu adrese gider. Boş bırakılırsa düğme gizlenir.</small>
              </div>
            </Panel>
          ) : null}
          <div className="form-actions">
            <button className="btn btn-primary" type="submit">
              İletişim bilgilerini kaydet
            </button>
          </div>
        </form>
      ) : null}

      {tab === "katalog" ? <CatalogTab tenantId={id} mode={tenant.visibilityMode} rules={rules} action={action} /> : null}

      {tab === "banka" ? (
        <div className="grid-2">
          <div>
            <Panel title="Havale / EFT hesapları" description="Ödeme adımında ve sipariş onayında müşteriye gösterilir.">
              {banks.length === 0 ? (
                <EmptyState title="Banka hesabı yok" description="Havale ile ödeme için en az bir hesap ekleyin." icon={IconBank} />
              ) : (
                <ul className="domain-list">
                  {banks.map((b) => (
                    <li key={b.id} className={b.isActive ? undefined : "is-off"}>
                      <IconBank />
                      <div>
                        <strong>{b.bankName}</strong>
                        <small className="mono">{b.iban}</small>
                        <small>{b.accountHolder}</small>
                      </div>
                      <form action={withBase(`/api/tenants/${id}/banks`)} method="post" className="icon-actions">
                        <input type="hidden" name="bankId" value={b.id} />
                        <button className="btn btn-ghost btn-sm" name="_action" value="toggle" type="submit">
                          {b.isActive ? "Pasifleştir" : "Aktifleştir"}
                        </button>
                        <ConfirmButton className="icon-btn is-danger" name="_action" value="delete" title="Sil" message={`${b.bankName} hesabı silinsin mi?`}>
                          <IconTrash />
                        </ConfirmButton>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
          <div>
            <Panel title="Hesap ekle" padded>
              <form action={withBase(`/api/tenants/${id}/banks`)} method="post" className="form-stack">
                <input type="hidden" name="_action" value="add" />
                <div className="field">
                  <label htmlFor="bankName">Banka</label>
                  <input className="input" id="bankName" name="bankName" placeholder="Ziraat Bankası" required />
                </div>
                <div className="field">
                  <label htmlFor="accountHolder">Hesap sahibi</label>
                  <input className="input" id="accountHolder" name="accountHolder" placeholder="Şirket unvanı" required />
                </div>
                <div className="field">
                  <label htmlFor="iban">IBAN</label>
                  <input className="input mono" id="iban" name="iban" placeholder="TR00 0000 0000 0000 0000 0000 00" required />
                  <small className="field-hint">IBAN kontrol hanesi doğrulanır.</small>
                </div>
                <button className="btn btn-primary" type="submit">
                  <IconPlus />
                  Hesap ekle
                </button>
              </form>
            </Panel>
          </div>
        </div>
      ) : null}

      {tab === "gelismis" ? (
        <form action={action} method="post" className="form-page is-wide form-stack">
          <input type="hidden" name="_section" value="gelismis" />
          <Alert tone="warn">
            Bu alanlardaki HTML/JavaScript doğrudan sitede çalışır. Yalnızca güvendiğiniz kaynaklardan (Meta Pixel, canlı destek vb.) kod ekleyin; hatalı kod siteyi bozabilir ve hızını düşürebilir.
          </Alert>
          <Panel title="Özel kodlar" padded>
            <div className="form-stack">
              <div className="field">
                <label htmlFor="customScripts">Ek script’ler</label>
                <textarea className="mono" id="customScripts" name="customScripts" rows={6} defaultValue={settings?.customScripts ?? ""} placeholder={"<script>…</script>"} />
                <small className="field-hint">Sayfa yüklendikten sonra eklenir. GA4 ve GTM için SEO sekmesindeki alanları kullanın.</small>
              </div>
              <div className="field">
                <label htmlFor="headerHtml">Üst duyuru alanı (HTML)</label>
                <textarea className="mono" id="headerHtml" name="headerHtml" rows={3} defaultValue={settings?.headerHtml ?? ""} placeholder={'<div style="background:#111;color:#fff;text-align:center;padding:6px">Kargo bedava!</div>'} />
              </div>
              <div className="field">
                <label htmlFor="footerHtml">Alt bilgi ek alanı (HTML)</label>
                <textarea className="mono" id="footerHtml" name="footerHtml" rows={3} defaultValue={settings?.footerHtml ?? ""} placeholder="ETBİS logosu, güven rozetleri vb." />
              </div>
            </div>
          </Panel>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit">
              Kaydet
            </button>
          </div>
        </form>
      ) : null}
    </>
  );
}

async function CatalogTab({
  tenantId,
  mode,
  rules,
  action,
}: {
  tenantId: string;
  mode: string;
  rules: { kind: string; targetId: string }[];
  action: string;
}) {
  const [groups, members, brands] = await Promise.all([
    db.select().from(brandGroups).orderBy(asc(brandGroups.name)),
    db.select().from(brandGroupMembers),
    db
      .select({ id: vehicleBrands.id, name: vehicleBrands.name, logoUrl: vehicleBrands.logoUrl, isActive: vehicleBrands.isActive })
      .from(vehicleBrands)
      .orderBy(asc(vehicleBrands.name)),
  ]);
  const of = (kind: string) => rules.filter((r) => r.kind === kind).map((r) => r.targetId);
  return (
    <form action={action} method="post" className="form-page is-wide form-stack">
      <input type="hidden" name="_section" value="katalog" />
      <input type="hidden" name="tenantId" value={tenantId} />
      <Panel title="Katalog görünürlüğü" description="Bu sitede hangi markaların ve ürünlerin listeleneceğini belirleyin. Site haritası da buna göre oluşur." padded>
        <VisibilityFields
          mode={mode === "ALL" ? "ALL" : "SELECTED"}
          groups={groups.map((g) => ({ id: g.id, name: g.name, memberIds: members.filter((m) => m.groupId === g.id).map((m) => m.brandId) }))}
          brands={brands.map((b) => ({ id: b.id, name: b.name, logo: assetUrl(b.logoUrl), isActive: b.isActive }))}
          selectedGroups={of(CATALOG_RULE_KIND.INCLUDE_GROUP)}
          includeBrands={of(CATALOG_RULE_KIND.INCLUDE_BRAND)}
          excludeBrands={of(CATALOG_RULE_KIND.EXCLUDE_BRAND)}
        />
      </Panel>
      <div className="form-actions">
        <button className="btn btn-primary" type="submit">
          Kaydet ve kataloğu yeniden hesapla
        </button>
      </div>
    </form>
  );
}
