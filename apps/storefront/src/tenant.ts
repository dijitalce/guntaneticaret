import { cache } from "react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getProductBySlug as getProductBySlugRaw } from "@guntan/catalog";
import { resolveTenantByHost, themeToCssVars } from "@guntan/tenant";
import { TENANT_STATUS } from "@guntan/types";
import type { TenantPublicConfig } from "@guntan/types";

export const getTenant = cache(async (): Promise<TenantPublicConfig> => {
  const h = await headers();
  const host = h.get("x-request-host") ?? h.get("host") ?? "guntan.localhost";
  const tenant = await resolveTenantByHost(host);
  if (!tenant) notFound();
  if (tenant.tenant.status === TENANT_STATUS.MAINTENANCE) {
    redirect("/bakim");
  }
  return tenant;
});

/** Request-level dedupe for generateMetadata + page. */
export const getCachedProductBySlug = cache((tenantId: string, slug: string) =>
  getProductBySlugRaw(tenantId, slug),
);

export { themeToCssVars };

export function allCatalogHref(tenant: TenantPublicConfig) {
  if (tenant.tenant.visibilityMode === "ALL") return null;
  const url = tenant.allCatalogUrl;
  if (!url) return null;
  const host = tenant.tenant.hostname;
  if (host === "localhost" || host.endsWith(".localhost")) return "http://localhost:3000";
  return url;
}
