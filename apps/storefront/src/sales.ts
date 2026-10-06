import { cache } from "react";
import { getTenantSalesStatus } from "@guntan/tenant";
import { salesStatusFromSocial, type SalesStatus } from "@guntan/types";
import { tryGetTenant } from "./tenant";

/** Mevcut isteğin sitesi için satış durumu (istek başına bir kez okunur). */
export const getSalesStatus = cache(async (): Promise<SalesStatus> => {
  const tenant = await tryGetTenant();
  if (!tenant) return salesStatusFromSocial(null);
  return getTenantSalesStatus(tenant.tenant.id);
});
