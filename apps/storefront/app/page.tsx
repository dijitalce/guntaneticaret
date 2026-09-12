import Link from "next/link";
import type { Metadata } from "next";
import { cachedFeaturedProducts, cachedPopularCategories, cachedVisibleBrands } from "../src/cached-catalog";
import { getTenant } from "../src/tenant";
import { ProductCard } from "../src/product-card";
import { VehicleFinder } from "../src/vehicle-finder";
import { VehicleNav } from "../src/vehicle-nav";
import { HomeSlider } from "../src/home-slider";
import { sentenceCaseTr } from "../src/format";
import { IconBox, IconShield, IconTag, IconTruck } from "../src/icons";
import { LaunchNotice } from "../src/launch-notice";
import {
  JsonLd,
  absoluteUrl,
  itemListJsonLd,
  metadataBaseForHost,
} from "../src/seo";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenant();
  const title = tenant.defaultMetaTitle ?? `${tenant.siteName} | Oto Yedek Parça`;
  const description =
    tenant.defaultMetaDescription ??
    `${tenant.siteName} — araç marka ve modeline uygun yedek parça. KDV dahil fiyat, stokta ürün, hızlı tedarik.`;
  return {
    metadataBase: metadataBaseForHost(tenant.tenant.canonicalHost),
    title,
    description,
    alternates: { canonical: absoluteUrl(tenant.tenant.canonicalHost, "/") },
    openGraph: {
      title,
      description,
      url: absoluteUrl(tenant.tenant.canonicalHost, "/"),
      type: "website",
      images: tenant.ogImageUrl ? [tenant.ogImageUrl] : undefined,
    },
  };
}

export default async function HomePage() {
  const tenant = await getTenant();
  const [brands, featured, cats] = await Promise.all([
    cachedVisibleBrands(tenant.tenant.id),
    cachedFeaturedProducts(tenant.tenant.id, 8),
    cachedPopularCategories(8),
  ]);
  const rootCats = cats.filter((c) => !c.parentId);
  const host = tenant.tenant.canonicalHost;
  const seoBody =
    tenant.seoContent ??
    tenant.defaultMetaDescription ??
    `${tenant.siteName} oto yedek parça kataloğunda marka ve modele göre filtreleyerek fren, motor, süspansiyon ve bakım parçalarına ulaşabilirsiniz.`;

  return (
    <div className="container home">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: tenant.siteName,
            url: absoluteUrl(host, "/"),
            potentialAction: {
              "@type": "SearchAction",
              target: `${absoluteUrl(host, "/arama")}?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: tenant.siteName,
            url: absoluteUrl(host, "/"),
            logo: tenant.logoUrl ? absoluteUrl(host, tenant.logoUrl) : undefined,
            telephone: tenant.phone ?? undefined,
            email: tenant.email ?? undefined,
            address: tenant.address
              ? { "@type": "PostalAddress", streetAddress: tenant.address, addressCountry: "TR" }
              : undefined,
          },
          itemListJsonLd(host, "Çok satanlar", featured),
        ]}
      />
      <div className="home-ia">
        <VehicleNav
          title="Markalar"
          searchable
          items={brands.map((b) => ({
            name: b.name,
            slug: b.slug,
            href: `/${b.slug}`,
            logoUrl: b.logoUrl,
          }))}
        />
        <div className="home-ia-main">
          <HomeSlider
            slides={[
              {
                alt: "Aracınıza uygun parçalar — motor, fren, süspansiyon. Hemen incele.",
                href: "#finder",
                image: "/slider/araciniza-uygun.jpg",
              },
              {
                alt: "Güvenilir oto yedek parça — 140.000+ ürün, kaliteli ürünler, hızlı tedarik.",
                href: "/arama",
                image: "/slider/guvenilir-yedek-parca.jpg",
              },
            ]}
          />
          <div id="finder" className="home-finder">
            <VehicleFinder brands={brands} compact />
          </div>
        </div>
      </div>

      <div className="trust-bar">
        <div className="trust-item"><span><IconTag /></span>KDV dahil fiyat</div>
        <div className="trust-item"><span><IconTruck /></span>Hızlı kargo</div>
        <div className="trust-item"><span><IconBox /></span>Stokta ürün</div>
        <div className="trust-item"><span><IconShield /></span>Havale ile güvenli ödeme</div>
      </div>

      {rootCats.length > 0 && (
        <section className="home-categories" aria-labelledby="home-cats-title">
          <div className="section-head">
            <div>
              <h2 id="home-cats-title">Ürün kategorileri</h2>
              <p>Fren, motor ve bakım parçalarına kategori sayfalarından ulaş</p>
            </div>
          </div>
          <div className="category-grid">
            {rootCats.map((c) => (
              <Link key={c.id} className="category-tile" href={`/kategori/${c.slug}`}>
                <strong>{sentenceCaseTr(c.name)}</strong>
                <span>İncele</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="section-head">
        <div>
          <h2>Çok satanlar</h2>
          <p>En çok bakılan bakım ve fren parçaları</p>
        </div>
        <div className="section-tabs">
          <Link className="is-active" href="/">Tümü</Link>
          {rootCats.slice(0, 6).map((c) => (
            <Link key={c.id} href={`/kategori/${c.slug}`}>{sentenceCaseTr(c.name)}</Link>
          ))}
        </div>
      </div>
      <div className="product-grid">
        {featured.map((p, i) => (
          <ProductCard
            key={p.id}
            product={p}
            placeholder={tenant.placeholderImageUrl}
            priority={i < 4}
          />
        ))}
      </div>

      <section className="seo-block">
        <h2>{tenant.siteName}</h2>
        <p>{seoBody}</p>
      </section>
      <LaunchNotice whatsapp={tenant.whatsapp} phone={tenant.phone} />
    </div>
  );
}
