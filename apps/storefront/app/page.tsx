import Link from "next/link";
import type { Metadata } from "next";
import { cachedBanners, cachedFeaturedProducts, cachedPopularCategories, cachedVisibleBrands } from "../src/cached-catalog";
import { getTenant } from "../src/tenant";
import { ProductCard } from "../src/product-card";
import { HomeSlider } from "../src/home-slider";
import { HomeSideBanners } from "../src/home-side-banners";
import { BrandMark } from "../src/brand-mark";
import { sentenceCaseTr } from "../src/format";
import { LaunchNotice } from "../src/launch-notice";
import { homeSeo } from "../src/home-seo";
import {
  JsonLd,
  absoluteUrl,
  itemListJsonLd,
  metadataBaseForHost,
  socialProfileUrls,
} from "../src/seo";

export const revalidate = 60;

async function homeCopy(tenant: Awaited<ReturnType<typeof getTenant>>) {
  const [brands, cats] = await Promise.all([cachedVisibleBrands(tenant.tenant.id), cachedPopularCategories(8)]);
  const rootCats = cats.filter((c) => !c.parentId);
  return homeSeo(tenant.siteName, brands, rootCats.map((c) => sentenceCaseTr(c.name).toLocaleLowerCase("tr-TR")));
}

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenant();
  const copy = await homeCopy(tenant);
  const title = tenant.defaultMetaTitle ?? copy.title;
  const description = tenant.defaultMetaDescription ?? copy.description;
  return {
    metadataBase: metadataBaseForHost(tenant.tenant.canonicalHost),
    title: { absolute: title },
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
  const [brands, featured, cats, bannerRows] = await Promise.all([
    cachedVisibleBrands(tenant.tenant.id),
    cachedFeaturedProducts(tenant.tenant.id, 8),
    cachedPopularCategories(8),
    cachedBanners(tenant.tenant.id),
  ]);
  const sliderBanners = bannerRows.filter((b) => b.placement === "home_slider");
  const middleBanners = bannerRows.filter((b) => b.placement === "home_middle").slice(0, 3);
  const sideBanners = bannerRows.filter((b) => b.placement === "home_side").slice(0, 4);
  const rootCats = cats.filter((c) => !c.parentId);
  const host = tenant.tenant.canonicalHost;
  const copy = await homeCopy(tenant);

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
            logo: tenant.logoUrl
              ? /^https?:\/\//i.test(tenant.logoUrl) ? tenant.logoUrl : absoluteUrl(host, tenant.logoUrl)
              : undefined,
            sameAs: socialProfileUrls(tenant),
            telephone: tenant.phone ?? undefined,
            email: tenant.email ?? undefined,
            address: tenant.address
              ? { "@type": "PostalAddress", streetAddress: tenant.address, addressCountry: "TR" }
              : undefined,
          },
          itemListJsonLd(host, "Çok satanlar", featured),
        ]}
      />
      <div className="home-hero2">
        <HomeSideBanners banners={sideBanners} whatsapp={tenant.whatsapp ?? null} />
        <HomeSlider
          slides={sliderBanners.length ? sliderBanners.map((b) => ({ alt: b.title, href: b.href || "/arama", image: b.imageUrl })) : [
            {
              alt: "Aracınıza uygun parçalar — motor, fren, süspansiyon. Hemen incele.",
              href: "/arama",
              image: "/slider/araciniza-uygun.jpg",
            },
            {
              alt: "Güvenilir oto yedek parça — 140.000+ ürün, kaliteli ürünler, hızlı tedarik.",
              href: "/arama",
              image: "/slider/guvenilir-yedek-parca.jpg",
            },
          ]}
        />
      </div>
      <div className="home-intro">
        <h1>{copy.h1}</h1>
        <p>{copy.lead}</p>
      </div>
      {middleBanners.length > 0 && (
        <section className={`home-banners is-${middleBanners.length}`} aria-label="Kampanyalar">
          {middleBanners.map((b) => (
            <Link key={b.id} href={b.href || "/arama"} className="home-banner">
              <img src={b.imageUrl} alt={b.title} loading="lazy" />
            </Link>
          ))}
        </section>
      )}

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

      {brands.length > 0 && (
        <section className="home-brands" aria-labelledby="home-brands-title">
          <div className="section-head">
            <div>
              <h2 id="home-brands-title">Markalar</h2>
              <p>Aracının markasını seç, uyumlu parçaları gör</p>
            </div>
          </div>
          <div className="home-brand-grid">
            {brands.map((b) => (
              <Link key={b.id} href={`/${b.slug}`} className="home-brand">
                <BrandMark name={b.name} logoUrl={b.logoUrl} size={40} />
                <span>{b.name}</span>
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
        {featured.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            placeholder={tenant.placeholderImageUrl}
          />
        ))}
      </div>

      <section className="seo-block">
        <h2>{copy.heading}</h2>
        {tenant.seoContent ? <p>{tenant.seoContent}</p> : copy.paragraphs.map((p) => <p key={p}>{p}</p>)}
        {brands.length > 0 ? (
          <p className="seo-links">
            {brands.slice(0, 16).map((b) => (
              <Link key={b.id} href={`/${b.slug}`}>{b.name} yedek parça</Link>
            ))}
          </p>
        ) : null}
      </section>
      <LaunchNotice whatsapp={tenant.whatsapp} phone={tenant.phone} />
    </div>
  );
}
