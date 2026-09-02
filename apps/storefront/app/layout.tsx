import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { COOKIE_CART } from "@guntan/config";
import { listPopularCategories, listVisibleBrands } from "@guntan/catalog";
import { cartQty } from "@guntan/ecommerce";
import { getTenant, themeToCssVars, allCatalogHref } from "../src/tenant";
import { BrandMark } from "../src/brand-mark";
import { SearchBox } from "../src/search-box";
import { IconCart, IconHeart, IconMenu, IconParts, IconUser } from "../src/icons";
import { sentenceCaseTr } from "../src/format";

const font = DM_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
});

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenant();
  return {
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
  const tenant = await getTenant();
  const [brands, categories] = await Promise.all([
    listVisibleBrands(tenant.tenant.id),
    listPopularCategories(8),
  ]);
  const navCats = categories.filter((c) => !c.parentId);
  const qty = await cartQty(tenant.tenant.id, (await cookies()).get(COOKIE_CART)?.value);
  const allParts = allCatalogHref(tenant);

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
                <img src={`${tenant.logoUrl ?? "/brand/logo.png"}?v=3`} alt="" width={320} height={157} />
              </span>
            </Link>
            <SearchBox brands={brands} />
            <nav className="header-tools" aria-label="Hesap">
              <Link className="icon-btn" href="/hesabim">
                <IconUser />
                <span>Hesabım</span>
              </Link>
              <Link className="icon-btn" href="/favoriler">
                <IconHeart />
                <span>Favoriler</span>
              </Link>
              <Link className="icon-btn cart-chip" href="/sepet">
                <IconCart />
                <span>Sepet</span>
                {qty > 0 && <em>{qty}</em>}
              </Link>
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
                  <Link key={c.id} href={`/arama?category=${c.slug}`}>{sentenceCaseTr(c.name)}</Link>
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
