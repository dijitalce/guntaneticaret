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
export function homeSeo(siteName: string, brands: BrandName[], categories: string[], cardPayments = false) {
  const broad = brands.length >= BROAD_SITE_MIN_BRANDS;
  const top = brands.slice(0, 3).map((b) => b.name);
  const six = brands.slice(0, 6).map((b) => b.name);

  const title = broad
    ? `Oto Yedek Parça – Online Yedek Parça Satışı | ${siteName}`
    : `${top.join(", ")} Yedek Parça | ${siteName}`;
  const description = `${six.join(", ")} ve ${broad ? "tüm marka" : "diğer"} araçlar için oto yedek parça. Orijinal ve muadil parçalar, marka ve modele göre uyumlu parça arama, KDV dahil fiyat, ${cardPayments ? "kredi kartına taksit veya Havale/EFT" : "Havale/EFT"} ile güvenli alışveriş.`;
  const h1 = broad ? "Oto Yedek Parça" : `${listTr(top)} Yedek Parça`;
  const lead = broad
    ? `${listTr(six)} başta olmak üzere ${brands.length} marka araç için yedek parça; marka ve modele uygun parçayı birkaç tıkla bulun.`
    : `${listTr(brands.slice(0, 8).map((b) => b.name))} araçlar için oto yedek parça; marka ve modele uygun parçayı birkaç tıkla bulun.`;

  const paragraphs = [
    `${siteName}, ${listTr(brands.slice(0, 8).map((b) => b.name))} başta olmak üzere ${brands.length} marka araç için oto yedek parçayı tek katalogda sunar. Aracınızın markasını ve modelini seçerek yalnızca uyumlu parçaları görebilir, parça adı ya da ürün koduyla arama yapabilirsiniz.`,
    categories.length
      ? `${listTr(categories.slice(0, 8))} kategorilerinde orijinal ve muadil yedek parçalar listelenir; her ürün sayfasında uyumlu araçlar ve güncel fiyat yer alır.`
      : "",
    `Tüm fiyatlara KDV dahildir, ödemeler ${cardPayments ? "kredi kartına taksitle veya Havale/EFT ile" : "Havale/EFT ile"} güvenle yapılır. Doğru parçadan emin değilseniz WhatsApp üzerinden parça danışmanımıza yazabilirsiniz.`,
  ].filter(Boolean);

  return { title, description, h1, lead, heading: `${siteName} ile oto yedek parça`, paragraphs };
}
