/**
 * Sitelerin ana sayfa SEO metinleri: meta başlık (30–60), meta açıklama (120–160) ve
 * ana sayfa metni (en az 300 karakter; boş satır paragraf ayırır). Sınırlar paneldeki
 * SEO kontrol listesiyle aynıdır.
 */
export type SiteSeo = { title: string; description: string; content: string };

export const SITE_SEO_LIMITS = {
  title: { min: 30, max: 60 },
  description: { min: 120, max: 160 },
  content: { min: 300 },
} as const;

const CLOSING =
  "Tüm fiyatlara KDV dahildir ve siparişler güvenli ödeme ile alınır. Doğru parçadan emin değilseniz şasi numaranızla WhatsApp üzerinden parça danışmanımıza yazabilirsiniz.";

export const SITE_SEO: Record<string, SiteSeo> = {
  guntan: {
    title: "Oto Yedek Parça – Online Yedek Parça Satışı | Güntan",
    description:
      "Tüm marka araçlar için oto yedek parça: orijinal ve muadil parçalar, marka ve modele göre uyumlu parça arama, KDV dahil fiyat ve güvenli alışveriş.",
    content: `Güntan Oto Yedek Parça; Volkswagen, Renault, Fiat, Ford, Toyota, Hyundai, Opel ve Peugeot başta olmak üzere tüm marka araçlar için oto yedek parçayı tek katalogda sunar. Aracınızın markasını ve modelini seçerek yalnızca uyumlu parçaları görebilir, parça adı, OEM numarası ya da ürün koduyla arama yapabilirsiniz.

Motor, fren, süspansiyon, debriyaj, filtre, kaporta ve elektrik gruplarında orijinal ve muadil yedek parçalar listelenir; her ürün sayfasında uyumlu araçlar ve güncel fiyat yer alır. ${CLOSING}`,
  },
  japon: {
    title: "Toyota, Honda, Nissan Yedek Parça | Japon Grup Oto",
    description:
      "Toyota, Honda, Nissan, Mazda, Mitsubishi, Suzuki ve Subaru için oto yedek parça. Orijinal ve muadil parçalar, modele göre uyumlu arama, KDV dahil fiyat.",
    content: `Japon Grup Oto Yedek Parça; Toyota, Honda, Nissan, Mazda, Mitsubishi, Suzuki, Subaru ve Daihatsu gibi Japon marka araçlar için oto yedek parça sunar. Corolla, Civic, Qashqai gibi modellerde aracınızı seçerek yalnızca uyumlu parçaları görebilir, parça adı, OEM numarası ya da ürün koduyla arama yapabilirsiniz.

Motor, fren, süspansiyon, debriyaj, filtre, kaporta ve elektrik gruplarında orijinal ve muadil Japon araç yedek parçaları listelenir; her ürün sayfasında uyumlu araçlar ve güncel fiyat yer alır. ${CLOSING}`,
  },
  alman: {
    title: "Volkswagen, BMW, Mercedes Yedek Parça | Alman Grup Oto",
    description:
      "Volkswagen, BMW, Mercedes, Audi, Opel ve Porsche için oto yedek parça. Orijinal ve muadil parçalar, modele göre uyumlu parça arama, KDV dahil fiyat.",
    content: `Alman Grup Oto Yedek Parça; Volkswagen, BMW, Mercedes, Audi, Opel, Porsche ve Smart gibi Alman marka araçlar için oto yedek parça sunar. Golf, Passat, Astra, 3 Serisi gibi modellerde aracınızı seçerek yalnızca uyumlu parçaları görebilir, parça adı, OEM numarası ya da ürün koduyla arama yapabilirsiniz.

Motor, fren, süspansiyon, debriyaj, filtre, kaporta ve elektrik gruplarında orijinal ve muadil Alman araç yedek parçaları listelenir; her ürün sayfasında uyumlu araçlar ve güncel fiyat yer alır. ${CLOSING}`,
  },
  italy: {
    title: "Fiat, Alfa Romeo, Lancia Yedek Parça | İtalyan Grup Oto",
    description:
      "Fiat, Alfa Romeo ve Lancia için oto yedek parça. Egea, Doblo, Linea ve Giulietta modellerine uyumlu orijinal ve muadil parçalar, KDV dahil fiyat.",
    content: `İtalyan Grup Oto Yedek Parça; Fiat, Alfa Romeo ve Lancia gibi İtalyan marka araçlar için oto yedek parça sunar. Egea, Doblo, Linea, Fiorino, Punto ve Giulietta gibi modellerde aracınızı seçerek yalnızca uyumlu parçaları görebilir, parça adı, OEM numarası ya da ürün koduyla arama yapabilirsiniz.

Motor, fren, süspansiyon, debriyaj, filtre, kaporta ve elektrik gruplarında orijinal ve muadil İtalyan araç yedek parçaları listelenir; her ürün sayfasında uyumlu araçlar ve güncel fiyat yer alır. ${CLOSING}`,
  },
  fransa: {
    title: "Renault, Peugeot, Citroen Yedek Parça | Fransız Grup Oto",
    description:
      "Renault, Peugeot, Citroen ve Dacia için oto yedek parça. Clio, Megane, 308 ve Duster modellerine uyumlu orijinal ve muadil parçalar, KDV dahil fiyat.",
    content: `Fransız Grup Oto Yedek Parça; Renault, Peugeot, Citroen ve Dacia gibi Fransız marka araçlar için oto yedek parça sunar. Clio, Megane, Symbol, 308, C3 ve Duster gibi modellerde aracınızı seçerek yalnızca uyumlu parçaları görebilir, parça adı, OEM numarası ya da ürün koduyla arama yapabilirsiniz.

Motor, fren, süspansiyon, debriyaj, filtre, kaporta ve elektrik gruplarında orijinal ve muadil Fransız araç yedek parçaları listelenir; her ürün sayfasında uyumlu araçlar ve güncel fiyat yer alır. ${CLOSING}`,
  },
  abd: {
    title: "Ford, Chevrolet, Jeep Yedek Parça | ABD Grup Oto",
    description:
      "Ford, Chevrolet, Jeep, Dodge, Chrysler ve Tesla için oto yedek parça. Orijinal ve muadil parçalar, modele göre uyumlu parça arama, KDV dahil fiyat.",
    content: `ABD Grup Oto Yedek Parça; Ford, Chevrolet, Jeep, Dodge, Chrysler, Cadillac ve Tesla gibi Amerikan marka araçlar için oto yedek parça sunar. Focus, Fiesta, Transit, Cruze ve Captiva gibi modellerde aracınızı seçerek yalnızca uyumlu parçaları görebilir, parça adı, OEM numarası ya da ürün koduyla arama yapabilirsiniz.

Motor, fren, süspansiyon, debriyaj, filtre, kaporta ve elektrik gruplarında orijinal ve muadil Amerikan araç yedek parçaları listelenir; her ürün sayfasında uyumlu araçlar ve güncel fiyat yer alır. ${CLOSING}`,
  },
  kore: {
    title: "Hyundai, Kia, Ssangyong Yedek Parça | Kore Grup Oto",
    description:
      "Hyundai, Kia, Ssangyong ve Daewoo için oto yedek parça. i20, Accent, Tucson ve Sportage modellerine uyumlu orijinal ve muadil parçalar, KDV dahil fiyat.",
    content: `Kore Grup Oto Yedek Parça; Hyundai, Kia, Ssangyong ve Daewoo gibi Kore marka araçlar için oto yedek parça sunar. i20, i30, Accent, Tucson, Sportage ve Rio gibi modellerde aracınızı seçerek yalnızca uyumlu parçaları görebilir, parça adı, OEM numarası ya da ürün koduyla arama yapabilirsiniz.

Motor, fren, süspansiyon, debriyaj, filtre, kaporta ve elektrik gruplarında orijinal ve muadil Kore araç yedek parçaları listelenir; her ürün sayfasında uyumlu araçlar ve güncel fiyat yer alır. ${CLOSING}`,
  },
};

type SeoColumns = {
  defaultMetaTitle: string | null;
  defaultMetaDescription: string | null;
  seoContent: string | null;
};

/**
 * Yazılması gereken SEO alanları. Panelden elle girilen metne dokunulmaz: yalnızca boş
 * alanlar ve ilk kurulumun yer tutucuları ("<site adı> için oto yedek parça." vb.) değişir.
 */
export function siteSeoFill(slug: string, siteNames: string[], current: SeoColumns): Partial<SeoColumns> {
  const seo = SITE_SEO[slug];
  if (!seo) return {};
  const stale = (value: string | null, placeholder: (name: string) => string) => {
    const v = (value ?? "").trim();
    return v === "" || siteNames.some((n) => v === placeholder(n));
  };
  const fill: Partial<SeoColumns> = {};
  if (stale(current.defaultMetaTitle, (n) => n)) fill.defaultMetaTitle = seo.title;
  if (stale(current.defaultMetaDescription, (n) => `${n} için oto yedek parça.`)) fill.defaultMetaDescription = seo.description;
  if (stale(current.seoContent, (n) => `${n} yedek parça kataloğu.`)) fill.seoContent = seo.content;
  return fill;
}
