import { productImageUrl } from "@guntan/catalog";
import { foldTr, sentenceCaseTr } from "./format";
import { validGtin } from "./product-feed";
import { absoluteUrl } from "./seo";

type Fitment = {
  brandName: string;
  modelName: string;
  generationName: string | null;
  engineName: string | null;
  yearFrom: number | null;
  yearTo: number | null;
};

export type ProductSeoInput = {
  host: string;
  siteName: string;
  product: {
    name: string;
    slug: string;
    sku: string;
    barcode: string | null;
    description: string | null;
    price: string;
    stockStatus: string;
  };
  manufacturerName: string | null;
  images: { url: string | null }[];
  categories: { name: string }[];
  fitments: Fitment[];
  /** Site satışa kapalıyken false; teklif stok dışı işaretlenir. */
  available?: boolean;
  /** Yalnızca onaylı müşteri değerlendirmeleri; boşsa yapısal veriye puan yazılmaz. */
  reviews?: {
    summary: { count: number; average: number };
    items: { rating: number; title: string | null; body: string; author_name: string; created_at: Date }[];
  };
};

function years(f: Fitment) {
  if (f.yearFrom && f.yearTo) return f.yearFrom === f.yearTo ? `${f.yearFrom}` : `${f.yearFrom}-${f.yearTo}`;
  return f.yearFrom ? `${f.yearFrom}+` : "";
}

export function vehicleLabel(f: Fitment) {
  const y = years(f);
  return [f.brandName, f.modelName, f.generationName, f.engineName].filter(Boolean).join(" ") + (y ? ` (${y})` : "");
}

/** Benzersiz araç adları; aynı model farklı motorlarla tekrar ediyorsa tek yazılır. */
export function fitmentSummary(fitments: Fitment[], max = 3) {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const f of fitments) {
    const key = `${f.brandName} ${f.modelName}`;
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(`${key}${years(f) ? ` ${years(f)}` : ""}`);
  }
  const extra = labels.length - max;
  return { text: labels.slice(0, max).join(", "), extra: extra > 0 ? extra : 0, count: labels.length };
}

/** Marka adı ürün adında yoksa başa eklenir: arama ve yapay zekâ yanıtları marka + parça adıyla eşleştirir. */
export function productDisplayTitle(name: string, brand: string | null) {
  if (!brand) return name;
  return foldTr(name).includes(foldTr(brand)) ? name : `${brand} ${name}`;
}

function plainText(html: string | null) {
  return (html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function productMetaDescription(input: ProductSeoInput) {
  const { product } = input;
  const title = productDisplayTitle(product.name, input.manufacturerName);
  const fit = fitmentSummary(input.fitments, 2);
  const parts = [
    `${title}.`,
    fit.text ? `Uyumlu araçlar: ${fit.text}${fit.extra ? ` ve ${fit.extra} model daha` : ""}.` : "",
    `KDV dahil ${Number(product.price).toLocaleString("tr-TR")} TL.`,
    input.siteName,
  ];
  return parts.filter(Boolean).join(" ").slice(0, 300);
}

/** Ürün açıklaması boşsa sayfada gösterilen, yalnızca kayıtlı verilerden kurulan özet. */
export function productFactsSummary(input: ProductSeoInput) {
  const text = plainText(input.product.description);
  if (text.length >= 40) return null;
  const title = productDisplayTitle(input.product.name, input.manufacturerName);
  const fit = fitmentSummary(input.fitments, 5);
  const sentences = [
    `${title}, ${input.siteName} kataloğunda yer alır.`,
    fit.text
      ? `${fit.text}${fit.extra ? ` ve ${fit.extra} model daha` : ""} ile uyumlu olarak kayıtlıdır; tam liste uyumluluk tablosundadır.`
      : "",
  ];
  return sentences.filter(Boolean).join(" ");
}

function reviewsJsonLd(reviews: ProductSeoInput["reviews"]) {
  if (!reviews || reviews.summary.count === 0) return {};
  return {
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: reviews.summary.average.toFixed(1),
      reviewCount: reviews.summary.count,
      bestRating: "5",
      worstRating: "1",
    },
    review: reviews.items.slice(0, 5).map((r) => ({
      "@type": "Review",
      reviewRating: { "@type": "Rating", ratingValue: String(r.rating), bestRating: "5", worstRating: "1" },
      author: { "@type": "Person", name: r.author_name },
      datePublished: new Date(r.created_at).toISOString().slice(0, 10),
      ...(r.title ? { name: r.title } : {}),
      reviewBody: r.body,
    })),
  };
}

export function productJsonLd(input: ProductSeoInput) {
  const { product, host } = input;
  const url = absoluteUrl(host, `/urun/${product.slug}`);
  const images = input.images
    .map((i) => (i.url ? productImageUrl(i.url, null) : null))
    .filter((u): u is string => Boolean(u))
    .map((u) => (/^https?:\/\//i.test(u) ? u : absoluteUrl(host, u)));
  const gtin = product.barcode && validGtin(product.barcode) ? product.barcode : undefined;
  const description = plainText(product.description) || productFactsSummary(input) || productMetaDescription(input);
  const cars = new Map<string, Record<string, unknown>>();
  for (const f of input.fitments) {
    const name = vehicleLabel(f);
    if (cars.has(name) || cars.size >= 100) continue;
    cars.set(name, {
      "@type": "Car",
      name,
      brand: { "@type": "Brand", name: f.brandName },
      model: f.modelName,
      ...(f.yearFrom ? { vehicleModelDate: String(f.yearFrom) } : {}),
      ...(f.engineName ? { vehicleEngine: { "@type": "EngineSpecification", name: f.engineName } } : {}),
    });
  }

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: productDisplayTitle(product.name, input.manufacturerName),
    description,
    url,
    ...(gtin ? { gtin } : {}),
    ...(images.length ? { image: images } : {}),
    ...(input.manufacturerName ? { brand: { "@type": "Brand", name: input.manufacturerName } } : {}),
    category: input.categories[0] ? `Oto Yedek Parça > ${sentenceCaseTr(input.categories[0].name)}` : "Oto Yedek Parça",
    ...(cars.size ? { isAccessoryOrSparePartFor: [...cars.values()] } : {}),
    ...reviewsJsonLd(input.reviews),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "TRY",
      price: Number(product.price).toFixed(2),
      availability: input.available === false ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: input.siteName, url: absoluteUrl(host, "/") },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "TR",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 14,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/ReturnFeesCustomerResponsibility",
      },
    },
  };
}
