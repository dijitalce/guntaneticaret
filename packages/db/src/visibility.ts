import { eq } from "drizzle-orm";
import { VISIBILITY_MODE } from "@guntan/types";
import { db } from "./client";
import { tenants } from "./schema";

const TTL_MS = 60_000;
const modeCache = new Map<string, { mode: string; exp: number }>();

export function invalidateVisibilityModeCache(tenantId?: string) {
  if (tenantId) modeCache.delete(tenantId);
  else modeCache.clear();
}

export async function getTenantVisibilityMode(tenantId: string): Promise<string> {
  const now = Date.now();
  const hit = modeCache.get(tenantId);
  if (hit && hit.exp > now) return hit.mode;
  const [row] = await db
    .select({ visibilityMode: tenants.visibilityMode })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  const mode = row?.visibilityMode ?? VISIBILITY_MODE.ALL;
  modeCache.set(tenantId, { mode, exp: now + TTL_MS });
  return mode;
}

export async function tenantSeesAllCatalog(tenantId: string): Promise<boolean> {
  return (await getTenantVisibilityMode(tenantId)) === VISIBILITY_MODE.ALL;
}

export async function listAllVisibilityTenantIds(): Promise<string[]> {
  const rows = await db
    .select({ id: tenants.id, visibilityMode: tenants.visibilityMode })
    .from(tenants);
  return rows.filter((t) => t.visibilityMode === VISIBILITY_MODE.ALL).map((t) => t.id);
}
