type BrandName = { name: string; slug: string };

/** Tüm katalogu gösteren site (Güntan) mi, yoksa marka grubu sitesi mi. */
const BROAD_SITE_MIN_BRANDS = 15;

function listTr(names: string[]) {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} ve ${names[names.length - 1]}`;
}

/**
 * Ana sayfa başlığı, açıklaması ve metni; panelde elle girilmediyse sitenin markalarından
 * kurulur. "oto yedek parça", "yedek parça" ve "<marka> yedek parça" aramalarını hedefler.
 */
export function homeSeo(siteName: string, brands: BrandName[], categories: string[]) {
  const broad = brands.length >= BROAD_SITE_MIN_BRANDS;
  const top = brands.slice(0, 3).map((b) => b.name);
  const six = brands.slice(0, 6).map((b) => b.name);

  const title = broad
    ? `Oto Yedek Parça – Online Yedek Parça Satışı | ${siteName}`
    : `${top.join(", ")} Yedek Parça | ${siteName}`;
  const description = `${six.join(", ")} ve ${broad ? "tüm marka" : "diğer"} araçlar için oto yedek parça. Orijinal ve muadil parçalar, marka ve modele göre uyumlu parça arama, KDV dahil fiyat, Havale/EFT ile güvenli alışveriş.`;
  const h1 = broad ? "Oto Yedek Parça" : `${listTr(top)} Yedek Parça`;
  const lead = broad
    ? `${listTr(six)} başta olmak üzere ${brands.length} marka araç için yedek parça; marka ve modeline uygun parçayı birkaç tıkla bul.`
    : `${listTr(brands.slice(0, 8).map((b) => b.name))} araçlar için oto yedek parça; marka ve modeline uygun parçayı birkaç tıkla bul.`;

  const paragraphs = [
    `${siteName}, ${listTr(brands.slice(0, 8).map((b) => b.name))} başta olmak üzere ${brands.length} marka araç için oto yedek parçayı tek katalogda sunar. Aracının markasını ve modelini seçerek yalnızca uyumlu parçaları görebilir, parça adı ya da ürün koduyla arama yapabilirsin.`,
    categories.length
      ? `${listTr(categories.slice(0, 8))} kategorilerinde orijinal ve muadil yedek parçalar listelenir; her ürün sayfasında uyumlu araçlar ve güncel fiyat yer alır.`
      : "",
    "Tüm fiyatlara KDV dahildir, ödemeler Havale/EFT ile güvenle yapılır. Doğru parçadan emin değilsen WhatsApp üzerinden parça danışmanımıza yazabilirsin.",
  ].filter(Boolean);

  return { title, description, h1, lead, heading: `${siteName} ile oto yedek parça`, paragraphs };
}
