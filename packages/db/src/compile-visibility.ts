import { and, eq, inArray } from "drizzle-orm";
import type { Database } from "./client";
import {
  brandGroupMembers,
  productCategories,
  productFitments,
  products,
  tenantCatalogIndex,
  tenantCatalogRules,
  tenantVisibleBrands,
  tenants,
  vehicleBrands,
} from "./schema";
import { CATALOG_RULE_KIND, PRODUCT_STATUS, VISIBILITY_MODE } from "@guntan/types";

export async function compileVisibility(db: Database, tenantId?: string) {
  const tenantRows = tenantId
    ? await db.select().from(tenants).where(eq(tenants.id, tenantId))
    : await db.select().from(tenants);

  for (const tenant of tenantRows) {
    await db.delete(tenantCatalogIndex).where(eq(tenantCatalogIndex.tenantId, tenant.id));
    await db.delete(tenantVisibleBrands).where(eq(tenantVisibleBrands.tenantId, tenant.id));

    const rules = await db
      .select()
      .from(tenantCatalogRules)
      .where(eq(tenantCatalogRules.tenantId, tenant.id));

    const includeGroups = rules.filter((r) => r.kind === CATALOG_RULE_KIND.INCLUDE_GROUP).map((r) => r.targetId);
    const includeBrands = rules.filter((r) => r.kind === CATALOG_RULE_KIND.INCLUDE_BRAND).map((r) => r.targetId);
    const includeCategories = rules.filter((r) => r.kind === CATALOG_RULE_KIND.INCLUDE_CATEGORY).map((r) => r.targetId);
    const includeProducts = rules.filter((r) => r.kind === CATALOG_RULE_KIND.INCLUDE_PRODUCT).map((r) => r.targetId);
    const excludeBrands = rules.filter((r) => r.kind === CATALOG_RULE_KIND.EXCLUDE_BRAND).map((r) => r.targetId);
    const excludeCategories = rules.filter((r) => r.kind === CATALOG_RULE_KIND.EXCLUDE_CATEGORY).map((r) => r.targetId);
    const excludeProducts = rules.filter((r) => r.kind === CATALOG_RULE_KIND.EXCLUDE_PRODUCT).map((r) => r.targetId);

    let allowedBrandIds: string[] = [];

    if (tenant.visibilityMode === VISIBILITY_MODE.ALL) {
      const allBrands = await db.select({ id: vehicleBrands.id }).from(vehicleBrands);
      allowedBrandIds = allBrands.map((b) => b.id);
    } else {
      if (includeGroups.length > 0) {
        const members = await db
          .select({ brandId: brandGroupMembers.brandId })
          .from(brandGroupMembers)
          .where(inArray(brandGroupMembers.groupId, includeGroups));
        allowedBrandIds.push(...members.map((m) => m.brandId));
      }
      allowedBrandIds.push(...includeBrands);
      allowedBrandIds = [...new Set(allowedBrandIds)].filter((id) => !excludeBrands.includes(id));
    }

    if (allowedBrandIds.length > 0) {
      await db.insert(tenantVisibleBrands).values(
        allowedBrandIds.map((brandId) => ({ tenantId: tenant.id, brandId })),
      );
    }

    const activeProducts = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.status, PRODUCT_STATUS.ACTIVE));

    let visibleIds = new Set(activeProducts.map((p) => p.id));

    if (tenant.visibilityMode !== VISIBILITY_MODE.ALL) {
      if (allowedBrandIds.length === 0 && includeProducts.length === 0) {
        visibleIds = new Set();
      } else {
        const fit = allowedBrandIds.length
          ? await db
              .select({ productId: productFitments.productId })
              .from(productFitments)
              .where(inArray(productFitments.vehicleBrandId, allowedBrandIds))
          : [];
        const fromFitment = new Set(fit.map((f) => f.productId));
        for (const pid of includeProducts) fromFitment.add(pid);
        visibleIds = new Set([...visibleIds].filter((id) => fromFitment.has(id)));
      }

      if (includeCategories.length > 0) {
        const rows = await db
          .select({ productId: productCategories.productId })
          .from(productCategories)
          .where(inArray(productCategories.categoryId, includeCategories));
        const allowed = new Set(rows.map((r) => r.productId));
        for (const pid of includeProducts) allowed.add(pid);
        visibleIds = new Set([...visibleIds].filter((id) => allowed.has(id)));
      }
    }

    if (excludeCategories.length > 0) {
      const rows = await db
        .select({ productId: productCategories.productId })
        .from(productCategories)
        .where(inArray(productCategories.categoryId, excludeCategories));
      for (const r of rows) visibleIds.delete(r.productId);
    }
    for (const pid of excludeProducts) visibleIds.delete(pid);

    if (excludeBrands.length > 0) {
      const rows = await db
        .select({ productId: productFitments.productId, brandId: productFitments.vehicleBrandId })
        .from(productFitments)
        .where(inArray(productFitments.vehicleBrandId, excludeBrands));
      const excludedProductIds = new Set(rows.map((r) => r.productId));
      for (const pid of excludedProductIds) {
        const other = await db
          .select({ brandId: productFitments.vehicleBrandId })
          .from(productFitments)
          .where(and(eq(productFitments.productId, pid), inArray(productFitments.vehicleBrandId, allowedBrandIds)));
        if (other.length === 0) visibleIds.delete(pid);
      }
    }

    const ids = [...visibleIds];
    if (ids.length > 0) {
      const chunk = 500;
      for (let i = 0; i < ids.length; i += chunk) {
        await db.insert(tenantCatalogIndex).values(
          ids.slice(i, i + chunk).map((productId) => ({ tenantId: tenant.id, productId })),
        );
      }
    }
  }
}
