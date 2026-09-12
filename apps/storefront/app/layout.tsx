import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { tryGetTenant, themeToCssVars, allCatalogHref } from "../src/tenant";
import { metadataBaseForHost } from "../src/seo";
import { cachedPopularCategories, cachedVisibleBrands } from "../src/cached-catalog";
import { BrandMark } from "../src/brand-mark";
import { SearchBox } from "../src/search-box";
import { CartShell } from "../src/cart-drawer";
import { IconHeart, IconMenu, IconParts, IconUser } from "../src/icons";
import { sentenceCaseTr } from "../src/format";
import { TENANT_STATUS } from "@guntan/types";

const font = DM_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await tryGetTenant();
  const metadataBase = metadataBaseForHost(tenant?.tenant.canonicalHost);
  if (!tenant) {
    return { metadataBase, title: "Sayfa bulunamadı", robots: { index: false, follow: false } };
  }
  return {
    metadataBase,
    title: tenant.defaultMetaTitle ?? tenant.siteName,
    description: tenant.defaultMetaDescription ?? undefined,
    icons: [
      { rel: "icon", url: tenant.faviconUrl ?? "/favicon.png" },
      { rel: "apple-touch-icon", url: "/apple-touch-icon.png" },
    ],
    openGraph: {
      title: tenant.defaultMetaTitle ?? tenant.siteName,
      description: tenant.defaultMetaDescription ?? undefined,
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
  const [brands, categories] = await Promise.all([
    cachedVisibleBrands(tenant.tenant.id),
    cachedPopularCategories(8),
  ]);
  const navCats = categories.filter((c) => !c.parentId);
  const allParts = allCatalogHref(tenant);
  const logoSrc = `${tenant.logoUrl ?? "/brand/logo.png"}?v=3`;

  return (
    <html lang="tr" className={font.className}>
      <body style={cssVars(themeToCssVars(tenant.theme))}>
        <a className="sr-only" href="#main">İçeriğe geç</a>
        <div className="topbar">
          <div className="container topbar-inner">
            {tenant.whatsapp ? (
              <a className="topbar-wa" href={`https://wa.me/${tenant.whatsapp}`} target="_blank" rel="noreferrer">
                WhatsApp destek {tenant.phone ? `· ${tenant.phone}` : ""}
              </a>
            ) : <span>{tenant.phone}</span>}
            <p className="topbar-note">Havale / EFT · KDV dahil fiyat</p>
          </div>
        </div>
        <header className="site-header">
          <div className="container header-inner">
            <Link className="logo" href="/" aria-label={tenant.siteName}>
              <span className="logo-badge">
                <Image src={logoSrc} alt="" width={320} height={157} priority />
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
            <div className="container site-nav-inner">
              <details className="nav-brands">
                <summary><IconMenu /> Markalar</summary>
                <div className="nav-brands-menu">
                  {brands.map((b) => (
                    <Link key={b.id} href={`/${b.slug}`}>
                      <BrandMark name={b.name} logoUrl={b.logoUrl} size={36} />
                      {b.name}
                    </Link>
                  ))}
                </div>
              </details>
              <div className="site-nav-links">
                <Link href="/">Ana sayfa</Link>
                {navCats.map((c) => (
                  <Link key={c.id} href={`/kategori/${c.slug}`}>{sentenceCaseTr(c.name)}</Link>
                ))}
                <Link href="/sayfa/hakkimizda">Hakkımızda</Link>
                <Link href="/iletisim">İletişim</Link>
              </div>
              {allParts && (
                <a className="nav-all-parts" href={allParts}>
                  <IconParts />
                  Tüm parçalar
                </a>
              )}
            </div>
          </nav>
        </header>
        <main id="main">{children}</main>
        <footer className="site-footer">
          <div className="container">
            <div className="footer-grid">
              <div>
                <h3>{tenant.siteName}</h3>
                <p>{tenant.address}</p>
                <p>{tenant.phone}</p>
              </div>
              <div>
                <h3>Kurumsal</h3>
                <Link href="/sayfa/hakkimizda">Hakkımızda</Link>
                <Link href="/iletisim">İletişim</Link>
                <Link href="/hesabim">Hesabım</Link>
              </div>
              <div>
                <h3>Yardım</h3>
                <Link href="/sayfa/mesafeli-satis">Mesafeli satış</Link>
                <Link href="/sayfa/gizlilik">Gizlilik</Link>
                <Link href="/sayfa/iade">İade şartları</Link>
              </div>
              <div>
                <h3>Alışveriş</h3>
                <p>Havale / EFT ile güvenli ödeme. Stoklar sipariş anında rezerve edilir.</p>
              </div>
            </div>
            <p className="footer-copy">© {new Date().getFullYear()} {tenant.siteName}</p>
          </div>
        </footer>
        {tenant.gaId && (
          <script dangerouslySetInnerHTML={{ __html: `window.GA_ID=${JSON.stringify(tenant.gaId)}` }} />
        )}
      </body>
    </html>
  );
}
