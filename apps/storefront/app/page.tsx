import Link from "next/link";
import { featuredProducts, listPopularCategories, listVisibleBrands } from "@guntan/catalog";
import { getTenant } from "../src/tenant";
import { ProductCard } from "../src/product-card";
import { VehicleFinder } from "../src/vehicle-finder";
import { VehicleNav } from "../src/vehicle-nav";
import { HomeSlider } from "../src/home-slider";
import { sentenceCaseTr } from "../src/format";
import { IconBox, IconShield, IconTag, IconTruck } from "../src/icons";

export const revalidate = 60;

export default async function HomePage() {
  const tenant = await getTenant();
  const [brands, featured, cats] = await Promise.all([
    listVisibleBrands(tenant.tenant.id),
    featuredProducts(tenant.tenant.id, 8),
    listPopularCategories(6),
  ]);
  const rootCats = cats.filter((c) => !c.parentId);

  return (
    <div className="container home">
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

      <div className="section-head">
        <div>
          <h2>Çok satanlar</h2>
          <p>En çok bakılan bakım ve fren parçaları</p>
        </div>
        <div className="section-tabs">
          <Link className="is-active" href="/">Tümü</Link>
          {rootCats.map((c) => (
            <Link key={c.id} href={`/arama?category=${c.slug}`}>{sentenceCaseTr(c.name)}</Link>
          ))}
        </div>
      </div>
      <div className="product-grid">
        {featured.map((p) => (
          <ProductCard
            key={p.id}
            product={{ ...p, imageUrl: null, oem: null, stockStatus: p.stockStatus }}
            placeholder={tenant.placeholderImageUrl}
          />
        ))}
      </div>

      {tenant.defaultMetaDescription && (
        <section className="seo-block">
          <h2>{tenant.siteName}</h2>
          <p>{tenant.defaultMetaDescription}</p>
        </section>
      )}
    </div>
  );
}
