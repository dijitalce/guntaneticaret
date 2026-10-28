import { LISTING_SORT, seoCategory } from "@guntan/types";
import { sentenceCaseTr } from "./format";

/** SEO haritasındaki açık ad (Rl., Isıtma - su rad. gibi katalog kısaltmaları yerine); yoksa katalog adı. */
export function categoryDisplayName(slug: string, name: string) {
  return seoCategory(slug)?.name ?? sentenceCaseTr(name);
}

/** Üretici/marka/model filtreleri ve sıralama aynı ürün kümesinin kopyalarıdır: indekslenmez, bağlantılar izlenir. */
export function isFacetedView(sp: Record<string, string | undefined>) {
  return Boolean(sp.mfr?.trim() || sp.brand?.trim() || sp.model?.trim() || (sp.sort && sp.sort !== LISTING_SORT.RECOMMENDED));
}

export function categoryDescription(siteName: string, slug: string, name: string, seoContent: string | null | undefined) {
  if (seoContent) return seoContent;
  const seo = seoCategory(slug);
  if (!seo) return `${name} için uyumlu oto yedek parçalar. ${siteName} güvencesiyle KDV dahil fiyat.`;
  return `${seo.name} fiyatları ve ${seo.query} seçenekleri. Marka, model ve OEM numarasına göre uyumlu parçayı bulun; KDV dahil fiyat, ${siteName} güvencesi.`;
}
