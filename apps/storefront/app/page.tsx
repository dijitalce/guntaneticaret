import Link from "next/link";
import type { Metadata } from "next";
import { cachedBanners, cachedFeaturedProducts, cachedPopularCategories, cachedVisibleBrands } from "../src/cached-catalog";
import { getTenant } from "../src/tenant";
import { ProductCard } from "../src/product-card";
import { HomeSlider } from "../src/home-slider";
import { HomeRail } from "../src/home-rail";
import { PartIcon, partKind } from "../src/part-icons";
import { BrandMark } from "../src/brand-mark";
import { garantiConfigFromEnv } from "@guntan/ecommerce";
import { sentenceCaseTr } from "../src/format";
import { homeSeo } from "../src/home-seo";
import { AssuranceGrid, MissingPartCta, assuranceItems } from "../src/assurance";
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
    cachedPopularCategories(24),
    cachedBanners(tenant.tenant.id),
  ]);
  const sliderBanners = bannerRows.filter((b) => b.placement === "home_slider");
  const middleBanners = bannerRows.filter((b) => b.placement === "home_middle").slice(0, 3);
  const rootCats = cats.filter((c) => !c.parentId);
  const host = tenant.tenant.canonicalHost;
  const copy = await homeCopy(tenant);
  const garanti = garantiConfigFromEnv();
  const maxInstallments = garanti ? Math.max(1, ...garanti.installments.keys()) : 1;

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
      <div className="home-banner-hero">
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
      <AssuranceGrid variant="strip" items={assuranceItems({ card: Boolean(garanti), maxInstallments })} />
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

      {brands.length > 0 && (
        <HomeRail
          id="home-brands-title"
          className="is-brands"
          eyebrow="Markaya göre alışveriş"
          title="Aracınızın markasını seçin"
          lead="Modelinizi seçin, aracınıza uyumlu parçaları görün"
        >
          {brands.map((b) => (
            <li key={b.id}>
              <Link href={`/${b.slug}`} className="brand-card">
                <span className="brand-card-logo">
                  <BrandMark name={b.name} logoUrl={b.logoUrl} size={64} />
                </span>
                <strong lang="en">{b.name}</strong>
                <span className="brand-card-cta">Parçaları gör</span>
              </Link>
            </li>
          ))}
        </HomeRail>
      )}

      {rootCats.length > 0 && (
        <HomeRail
          id="home-cats-title"
          className="is-categories"
          eyebrow="Parça kategorileri"
          title="İhtiyacınız olan parçayı bulun"
          lead="Fren, motor, alt takım ve bakım parçaları tek yerde"
          action={<Link className="rail-all" href="/arama">Tüm parçalar</Link>}
        >
          {rootCats.map((c, idx) => {
            const kind = partKind(c.name);
            return (
              <li key={c.id}>
                <Link href={`/kategori/${c.slug}`} className="cat-card">
                  <span className="cat-card-no" aria-hidden="true">{String(idx + 1).padStart(2, "0")}</span>
                  <span className="cat-card-icon"><PartIcon icon={kind.icon} /></span>
                  <strong>{sentenceCaseTr(c.name)}</strong>
                  <span className="cat-card-hint">{kind.hint}</span>
                  <span className="cat-card-cta">Parçaları incele</span>
                </Link>
              </li>
            );
          })}
        </HomeRail>
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

      <MissingPartCta whatsapp={tenant.whatsapp} phone={tenant.phone} />

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
    </div>
  );
}
