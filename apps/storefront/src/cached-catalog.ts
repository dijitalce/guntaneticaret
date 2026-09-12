import { unstable_cache } from "next/cache";
import {
  featuredProducts,
  getBrandBySlug,
  getCategoryById,
  getCategoryBySlug,
  getManufacturerBySlug,
  getModelBySlug,
  getProductBySlug,
  listModelsForBrand,
  listPopularCategories,
  listProducts,
  listVisibleBrands,
  listingFacets,
  listingFacetsForCategory,
  relatedProducts,
  type ListingQuery,
} from "@guntan/catalog";
import { NAV_CACHE_TTL_SECONDS } from "@guntan/config";

const LISTING_CACHE_TTL_SECONDS = 90;
const PRODUCT_CACHE_TTL_SECONDS = 300;

export async function cachedVisibleBrands(tenantId: string) {
  const rows = await unstable_cache(
    () => listVisibleBrands(tenantId),
    ["nav-brands", tenantId, "v2"],
    { revalidate: NAV_CACHE_TTL_SECONDS },
  )();
  // Tenant sync sırasında boş sonuç gelirse cache’i zehirleme.
  if (rows.length === 0) return listVisibleBrands(tenantId);
  return rows;
}

export function cachedPopularCategories(limit = 8) {
  return unstable_cache(
    () => listPopularCategories(limit),
    ["nav-categories", String(limit)],
    { revalidate: NAV_CACHE_TTL_SECONDS },
  )();
}

export function cachedModelsForBrand(tenantId: string, brandId: string) {
  return unstable_cache(
    () => listModelsForBrand(tenantId, brandId),
    ["nav-models", tenantId, brandId],
    { revalidate: NAV_CACHE_TTL_SECONDS },
  )();
}

export function cachedBrandBySlug(tenantId: string, slug: string) {
  return unstable_cache(
    () => getBrandBySlug(tenantId, slug),
    ["brand-slug", tenantId, slug],
    { revalidate: NAV_CACHE_TTL_SECONDS },
  )();
}

export function cachedModelBySlug(brandId: string, slug: string) {
  return unstable_cache(
    () => getModelBySlug(brandId, slug),
    ["model-slug", brandId, slug],
    { revalidate: NAV_CACHE_TTL_SECONDS },
  )();
}

export function cachedCategoryBySlug(slug: string) {
  return unstable_cache(
    () => getCategoryBySlug(slug),
    ["category-slug", slug],
    { revalidate: NAV_CACHE_TTL_SECONDS },
  )();
}

export function cachedCategoryById(id: string) {
  return unstable_cache(
    () => getCategoryById(id),
    ["category-id", id],
    { revalidate: NAV_CACHE_TTL_SECONDS },
  )();
}

export function cachedManufacturerBySlug(slug: string) {
  return unstable_cache(
    () => getManufacturerBySlug(slug),
    ["manufacturer-slug", slug],
    { revalidate: NAV_CACHE_TTL_SECONDS },
  )();
}

export function cachedListProducts(query: ListingQuery) {
  return unstable_cache(
    () => listProducts(query),
    [
      "listing-fitv1",
      query.tenantId,
      query.brandId ?? "",
      query.modelId ?? "",
      query.categoryId ?? "",
      query.manufacturerId ?? "",
      query.engineId ?? "",
      query.inStock ? "1" : "0",
      String(query.minPrice ?? ""),
      String(query.maxPrice ?? ""),
      query.sort ?? "",
      String(query.page ?? 1),
    ],
    { revalidate: LISTING_CACHE_TTL_SECONDS },
  )();
}

export function cachedListingFacets(tenantId: string, brandId: string, modelId?: string) {
  return unstable_cache(
    () => listingFacets(tenantId, brandId, modelId),
    ["listing-facets", tenantId, brandId, modelId ?? "all"],
    { revalidate: NAV_CACHE_TTL_SECONDS },
  )();
}

export function cachedListingFacetsForCategory(tenantId: string, categoryId: string) {
  return unstable_cache(
    () => listingFacetsForCategory(tenantId, categoryId),
    ["listing-facets-cat", tenantId, categoryId],
    { revalidate: NAV_CACHE_TTL_SECONDS },
  )();
}

export function cachedFeaturedProducts(tenantId: string, limit = 8) {
  return unstable_cache(
    () => featuredProducts(tenantId, limit),
    ["featured-fitv1", tenantId, String(limit)],
    { revalidate: NAV_CACHE_TTL_SECONDS },
  )();
}

export function cachedProductBySlug(tenantId: string, slug: string) {
  return unstable_cache(
    () => getProductBySlug(tenantId, slug),
    ["product-slug", tenantId, slug],
    { revalidate: PRODUCT_CACHE_TTL_SECONDS },
  )();
}

export function cachedRelatedProducts(tenantId: string, productId: string, modelId: string | undefined, limit = 8) {
  return unstable_cache(
    () => relatedProducts(tenantId, productId, modelId, limit),
    ["related-products-fitv1", tenantId, productId, modelId ?? "", String(limit)],
    { revalidate: PRODUCT_CACHE_TTL_SECONDS },
  )();
}
