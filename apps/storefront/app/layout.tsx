import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { tryGetTenant, themeToCssVars, allCatalogHref } from "../src/tenant";
import { metadataBaseForHost, pageTitle, tenantNoIndex, tenantVerification } from "../src/seo";
import { Analytics, CustomScripts } from "../src/analytics";
import { CookieConsent, CookieSettingsLink } from "../src/cookie-consent";
import { VisitorTracker } from "../src/visitor-tracker";
import { MarketingPopup } from "../src/marketing-popup";
import { getActivePopup } from "@guntan/db";
import { cachedPopularCategories, cachedVisibleBrands, cachedVisibleGenerations, cachedVisibleModels } from "../src/cached-catalog";
import { SearchBox } from "../src/search-box";
import { CartShell } from "../src/cart-drawer";
import { MegaNav, type NavBrand, type NavModel } from "../src/mega-nav";
import { IconHeart, IconUser } from "../src/icons";
import { sentenceCaseTr } from "../src/format";
import { getSalesStatus } from "../src/sales";
import { SEO_SOCIAL_KEYS, TENANT_STATUS } from "@guntan/types";
import { COMPANY_CONTACT } from "@guntan/db/content/contact";

const font = DM_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700"],
  // Çoklu weight/subset preload'u kullanılmayan woff2 uyarısı üretiyor;
  // font CSS ile yine yüklenir, sadece link rel=preload kalkar.
  preload: false,
});

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await tryGetTenant();
  const metadataBase = metadataBaseForHost(tenant?.tenant.canonicalHost);
  if (!tenant) {
    return { metadataBase, title: "Sayfa bulunamadı", robots: { index: false, follow: false } };
  }
  const defaultTitle = tenant.defaultMetaTitle ?? tenant.siteName;
  const noindex = tenantNoIndex(tenant);
  const twitterHandle = tenant.social?.[SEO_SOCIAL_KEYS.twitterHandle];
  return {
    metadataBase,
    title: { default: defaultTitle, template: pageTitle(tenant, "%s") },
    description: tenant.defaultMetaDescription ?? undefined,
    applicationName: tenant.siteName,
    icons: [
      { rel: "icon", url: tenant.faviconUrl ?? "/favicon.png" },
      { rel: "apple-touch-icon", url: tenant.faviconUrl ?? "/apple-touch-icon.png" },
    ],
    robots: noindex ? { index: false, follow: false } : { index: true, follow: true },
    verification: tenantVerification(tenant),
    openGraph: {
      title: defaultTitle,
      description: tenant.defaultMetaDescription ?? undefined,
      siteName: tenant.siteName,
      locale: "tr_TR",
      type: "website",
      images: tenant.ogImageUrl ? [tenant.ogImageUrl] : undefined,
    },
    twitter: {
      card: tenant.ogImageUrl ? "summary_large_image" : "summary",
      site: twitterHandle || undefined,
      images: tenant.ogImageUrl ? [tenant.ogImageUrl] : undefined,
    },
  };
}

function cssVars(css: string): CSSProperties {
  return Object.fromEntries(
    css.split(";").filter(Boolean).map((pair) => {
      const [k, v] = pair.split(":");
      return [k, v];
    }),
  ) as CSSProperties;
}

const OTHER_MODEL = /^di[gğ]er/i;

function yearRange(from: number | null, to: number | null) {
  if (from && to) return from === to ? String(from) : `${from}–${to}`;
  if (from) return `${from}–`;
  return to ? `–${to}` : null;
}

function buildNavBrands(
  brands: { id: string; name: string; slug: string; logoUrl: string | null }[],
  models: { id: string; brandId: string; name: string; slug: string; imageUrl: string | null }[],
  generations: { modelId: string; name: string; yearFrom: number | null; yearTo: number | null; imageUrl: string | null }[],
): NavBrand[] {
  const gensByModel = new Map<string, typeof generations>();
  for (const g of generations) {
    const list = gensByModel.get(g.modelId) ?? [];
    list.push(g);
    gensByModel.set(g.modelId, list);
  }
  const byBrand = new Map<string, { named: NavModel[]; other: NavModel[] }>();
  for (const m of models) {
    const bucket = byBrand.get(m.brandId) ?? { named: [], other: [] };
    if (OTHER_MODEL.test(m.name)) {
      bucket.other.push({ key: m.id, name: "Diğer modeller", slug: m.slug, imageUrl: m.imageUrl, years: null });
    } else {
      const gens = gensByModel.get(m.id);
      if (gens?.length) {
        for (const [i, g] of gens.entries()) {
          bucket.named.push({ key: `${m.id}:${i}`, name: `${m.name} ${g.name}`, slug: m.slug, imageUrl: g.imageUrl ?? m.imageUrl, years: yearRange(g.yearFrom, g.yearTo) });
        }
      } else {
        bucket.named.push({ key: m.id, name: m.name, slug: m.slug, imageUrl: m.imageUrl, years: null });
      }
    }
    byBrand.set(m.brandId, bucket);
  }
  return brands.map((b) => {
    const bucket = byBrand.get(b.id);
    return { ...b, models: bucket ? [...bucket.named, ...bucket.other] : [] };
  });
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const tenant = await tryGetTenant();
  if (!tenant) {
    return (
      <html lang="tr" className={font.className}>
        <body>{children}</body>
      </html>
    );
  }
  if (tenant.tenant.status === TENANT_STATUS.MAINTENANCE) {
    redirect("/bakim");
  }
  const [brands, models, generations, categories, popup, sales] = await Promise.all([
    cachedVisibleBrands(tenant.tenant.id),
    cachedVisibleModels(tenant.tenant.id),
    cachedVisibleGenerations(tenant.tenant.id).catch(() => []),
    cachedPopularCategories(8),
    getActivePopup(tenant.tenant.id),
    getSalesStatus(),
  ]);
  const social = (tenant.social ?? {}) as Record<string, string>;
  const navCats = categories.filter((c) => !c.parentId);
  const navBrands = buildNavBrands(brands, models, generations);
  const allParts = allCatalogHref(tenant);
  const logoSrc = `${tenant.logoUrl ?? "/brand/logo.png"}?v=3`;

  return (
    <html lang="tr" className={font.className}>
      <body style={cssVars(themeToCssVars(tenant.theme))}>
        <a className="sr-only" href="#main">İçeriğe geç</a>
        {tenant.headerHtml ? <div className="site-custom-html" dangerouslySetInnerHTML={{ __html: tenant.headerHtml }} /> : null}
        <div className="topbar">
          <div className="container topbar-inner">
            {tenant.whatsapp ? (
              <a className="topbar-wa" href={`https://wa.me/${tenant.whatsapp}`} target="_blank" rel="noreferrer">
                WhatsApp destek {tenant.phone ? `· ${tenant.phone}` : ""}
              </a>
            ) : <span>{tenant.phone}</span>}
            <div className="topbar-links">
              <p className="topbar-note">Havale / EFT · KDV dahil fiyat</p>
              <Link href="/sayfa/hakkimizda">Hakkımızda</Link>
              <Link href="/iletisim">İletişim</Link>
            </div>
          </div>
        </div>
        {!sales.open ? (
          <p className="sales-closed-bar" role="status">
            {sales.message}
          </p>
        ) : null}
        <header className="site-header">
          <div className="container header-inner">
            <Link className="logo" href="/" aria-label={tenant.siteName}>
              <span className="logo-badge">
                <Image src={logoSrc} alt="" width={320} height={157} loading="eager" />
              </span>
            </Link>
            <SearchBox brands={brands} />
            <nav className="header-tools" aria-label="Hesap">
              <Link className="icon-btn" href="/hesabim">
                <IconUser />
                <span>Hesabım</span>
              </Link>
              <Link className="icon-btn header-fav" href="/favoriler">
                <IconHeart />
                <span>Favoriler</span>
              </Link>
              <CartShell placeholder={tenant.placeholderImageUrl ?? "/placeholder-product.jpg"} />
            </nav>
          </div>
          <nav className="site-nav" aria-label="Ana menü">
            <MegaNav
              brands={navBrands}
              categories={navCats.map((c) => ({ id: c.id, name: sentenceCaseTr(c.name), slug: c.slug }))}
              allPartsHref={allParts ?? null}
            />
          </nav>
        </header>
        <main id="main">{children}</main>
        <footer className="site-footer">
          <div className="container">
            <div className="footer-grid">
              <div>
                <h3>{tenant.siteName}</h3>
                {tenant.tenant.slug === "guntan" ? (
                  <p className="footer-address">
                    {COMPANY_CONTACT.lines.map((line) => (
                      <span key={line}>{line}</span>
                    ))}
                  </p>
                ) : (
                  <p>{tenant.address}</p>
                )}
                {tenant.tenant.slug === "guntan" ? (
                  <>
                    <p>
                      <a href={`tel:${COMPANY_CONTACT.phoneTel}`}>{COMPANY_CONTACT.phone}</a>
                    </p>
                    <p>
                      <a href={`https://wa.me/${COMPANY_CONTACT.whatsapp}`} target="_blank" rel="noreferrer">
                        WhatsApp {COMPANY_CONTACT.phone}
                      </a>
                    </p>
                  </>
                ) : (
                  tenant.phone ? <p>{tenant.phone}</p> : null
                )}
              </div>
              <div>
                <h3>Kurumsal</h3>
                <Link href="/sayfa/hakkimizda">Hakkımızda</Link>
                <Link href="/iletisim">İletişim</Link>
                <Link href="/hesabim">Hesabım</Link>
              </div>
              <div>
                <h3>Yardım</h3>
                <Link href="/sayfa/mesafeli-satis">Mesafeli satış sözleşmesi</Link>
                <Link href="/sayfa/gizlilik">Gizlilik</Link>
                <Link href="/sayfa/cerez-politikasi">Çerez politikası</Link>
                <CookieSettingsLink />
                <Link href="/sayfa/iade">İade ve değişim</Link>
                <Link href="/site-haritasi">Site haritası</Link>
              </div>
              <div>
                <h3>Alışveriş</h3>
                <p>Havale / EFT ile güvenli ödeme. Stoklar sipariş anında rezerve edilir.</p>
              </div>
            </div>
            <p className="footer-copy">© {new Date().getFullYear()} {tenant.siteName}</p>
          </div>
        </footer>
        {tenant.footerHtml ? <div className="site-custom-html" dangerouslySetInnerHTML={{ __html: tenant.footerHtml }} /> : null}
        <Analytics
          gaId={tenant.gaId}
          gtmId={tenant.gtmId}
          metaPixelId={social.metaPixelId}
          tiktokPixelId={social.tiktokPixelId}
          googleAdsId={social.googleAdsId}
          googleAdsLabel={social.googleAdsLabel}
        />
        <VisitorTracker />
        {popup ? <MarketingPopup popup={popup} /> : null}
        {tenant.customScripts ? <CustomScripts html={tenant.customScripts} /> : null}
        <CookieConsent />
      </body>
    </html>
  );
}
