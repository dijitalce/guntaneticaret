import { cache } from "react";
import { unstable_cache } from "next/cache";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { resolveTenantByHost, themeToCssVars } from "@guntan/tenant";
import { TENANT_HOST_CACHE_TTL_SECONDS, TENANT_STATUS } from "@guntan/types";
import type { TenantPublicConfig } from "@guntan/types";

function cachedTenantByHost(host: string) {
  return unstable_cache(
    () => resolveTenantByHost(host),
    ["tenant-host", host],
    { revalidate: TENANT_HOST_CACHE_TTL_SECONDS },
  )();
}

export const getTenant = cache(async (): Promise<TenantPublicConfig> => {
  const h = await headers();
  const host = h.get("x-request-host") ?? h.get("host") ?? "guntan.localhost";
  const tenant = await cachedTenantByHost(host);
  if (!tenant) notFound();
  if (tenant.tenant.status === TENANT_STATUS.MAINTENANCE) {
    redirect("/bakim");
  }
  return tenant;
});

export { themeToCssVars };

export function allCatalogHref(tenant: TenantPublicConfig) {
  if (tenant.tenant.visibilityMode === "ALL") return null;
  const url = tenant.allCatalogUrl;
  if (!url) return null;
  const host = tenant.tenant.hostname;
  if (host === "localhost" || host.endsWith(".localhost")) return "http://localhost:3000";
  return url;
}
