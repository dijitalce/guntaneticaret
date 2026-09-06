import { unstable_cache } from "next/cache";
import {
  listModelsForBrand,
  listPopularCategories,
  listVisibleBrands,
  listingFacets,
} from "@guntan/catalog";
import { NAV_CACHE_TTL_SECONDS } from "@guntan/config";

export function cachedVisibleBrands(tenantId: string) {
  return unstable_cache(
    () => listVisibleBrands(tenantId),
    ["nav-brands", tenantId],
    { revalidate: NAV_CACHE_TTL_SECONDS },
  )();
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

export function cachedListingFacets(tenantId: string, brandId: string, modelId?: string) {
  return unstable_cache(
    () => listingFacets(tenantId, brandId, modelId),
    ["listing-facets", tenantId, brandId, modelId ?? "all"],
    { revalidate: NAV_CACHE_TTL_SECONDS },
  )();
}
