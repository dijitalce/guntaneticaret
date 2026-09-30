import { and, eq, inArray } from "drizzle-orm";
import { brandGroupMembers, compileVisibility, db, tenantCatalogRules, vehicleBrands } from "@guntan/db";
import { CATALOG_RULE_KIND } from "@guntan/types";

export async function tenantsUsingGroup(groupId: string) {
  const rows = await db
    .select({ tenantId: tenantCatalogRules.tenantId })
    .from(tenantCatalogRules)
    .where(and(eq(tenantCatalogRules.kind, CATALOG_RULE_KIND.INCLUDE_GROUP), eq(tenantCatalogRules.targetId, groupId)));
  return [...new Set(rows.map((r) => r.tenantId))];
}

export async function setGroupMembers(groupId: string, brandIds: string[]) {
  const unique = [...new Set(brandIds)];
  const valid = unique.length
    ? (await db.select({ id: vehicleBrands.id }).from(vehicleBrands).where(inArray(vehicleBrands.id, unique))).map((b) => b.id)
    : [];
  await db.delete(brandGroupMembers).where(eq(brandGroupMembers.groupId, groupId));
  if (valid.length) await db.insert(brandGroupMembers).values(valid.map((brandId) => ({ groupId, brandId })));
  return valid.length;
}

/** Grubu kullanan sitelerin görünür marka/ürün listesini arka planda yeniden derler. */
export function recompileTenants(tenantIds: string[]) {
  if (!tenantIds.length) return;
  void (async () => {
    for (const id of tenantIds) {
      try {
        await compileVisibility(db, id);
      } catch (err) {
        console.error("compileVisibility failed", id, err);
      }
    }
  })();
}
