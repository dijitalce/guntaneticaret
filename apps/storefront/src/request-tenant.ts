import { headers } from "next/headers";
import { resolveTenantByHost } from "@guntan/tenant";

export async function requestHost() {
  const h = await headers();
  return h.get("x-request-host") ?? h.get("host") ?? "";
}

export async function tenantFromRequest() {
  return resolveTenantByHost(await requestHost());
}

export const COOKIE_VISITOR = "gt_sid";
export const VISITOR_SESSION_SECONDS = 30 * 60;

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) && value.length <= 191;
}
