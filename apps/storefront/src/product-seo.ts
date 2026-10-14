import { productImageUrl } from "@guntan/catalog";
import { foldTr, formatTl, sentenceCaseTr } from "./format";
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
  /** Ham OEM referans numaraları (araç üreticisinin parça numarası). */
  oems?: string[];
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
  const oem = input.oems?.[0];
  const parts = [
    `${title}.`,
    oem ? `OEM ${oem}.` : "",
    fit.text ? `Uyumlu araçlar: ${fit.text}${fit.extra ? ` ve ${fit.extra} model daha` : ""}.` : "",
    `KDV dahil ${formatTl(product.price)}, stokta, aynı gün kargo, 14 gün iade.`,
    input.siteName,
  ];
  return parts.filter(Boolean).join(" ").slice(0, 300);
}

/**
 * Ürün sayfasındaki açıklama: yalnızca kayıtlı verilerden (marka, kategori, uyumlu araç, OEM) kurulur,
 * teknik özellik uydurulmaz. Tedarikçi açıklaması varsa onun altına eklenir.
 */
export function productSeoParagraphs(input: ProductSeoInput & { cardPayments?: boolean }) {
  const title = productDisplayTitle(input.product.name, input.manufacturerName);
  const category = input.categories[0] ? sentenceCaseTr(input.categories[0].name).toLocaleLowerCase("tr-TR") : null;
  const fit = fitmentSummary(input.fitments, 6);
  const oems = input.oems ?? [];
  const paragraphs: string[] = [];

  paragraphs.push(
    [
      `${title}, ${input.siteName} güvencesiyle satılan sıfır ${category ? `${category} ürünüdür` : "oto yedek parçadır"}.`,
      input.manufacturerName ? `Ürün ${input.manufacturerName} markalıdır,` : "Ürün",
      "kullanılmamış ve orijinal ambalajında, faturalı olarak gönderilir.",
    ]
      .filter(Boolean)
      .join(" "),
  );

  if (fit.text) {
    paragraphs.push(
      `${fit.text}${fit.extra ? ` ve ${fit.extra} model daha` : ""} ile uyumludur. Marka, model, kasa, yıl ve motor bazında tam liste ` +
        `uyumlu araçlar tablosundadır. Aracınıza uyduğundan emin olmak için şasi numaranızla bize ulaşabilirsiniz; ` +
        `%100 uyumluluk garantisi kapsamında uymayan parçayı iade alırız.`,
    );
  }

  if (oems.length) {
    const list = oems.slice(0, 8).join(", ");
    paragraphs.push(
      `OEM (orijinal parça) referans numarası: ${list}${oems.length > 8 ? ` ve ${oems.length - 8} numara daha` : ""}. ` +
        `Eski parçanızın üzerindeki numarayı veya servis kaydındaki parça numarasını bu kodlarla karşılaştırarak doğru ürünü seçebilirsiniz. ` +
        `Aynı OEM numarasına sahip farklı marka seçenekleri alternatif markalar bölümünde listelenir.`,
    );
  }

  paragraphs.push(
    `${title} stoklarımızda mevcuttur ve aynı gün Aras Kargo ile gönderilir. Fiyata KDV dahildir; ` +
      `${input.cardPayments ? "kredi kartına taksit seçenekleriyle veya havale / EFT ile" : "havale / EFT ile"} %100 güvenli ödeme yapabilirsiniz. ` +
      `Teslimattan itibaren 14 gün içinde iade hakkınız bulunur.`,
  );

  return paragraphs;
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
  const description = plainText(product.description) || productSeoParagraphs(input).slice(0, 2).join(" ");
  const oems = (input.oems ?? []).slice(0, 20);
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
    ...(oems.length
      ? { additionalProperty: oems.map((value) => ({ "@type": "PropertyValue", name: "OEM numarası", value })) }
      : {}),
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
