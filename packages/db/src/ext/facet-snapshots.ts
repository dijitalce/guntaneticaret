import { sql } from "drizzle-orm";
import { ensureExtTables } from "./tables";
import { exec, first, parseJson } from "./sql";

export type BrandFacetSnapshot = {
  categories: { id: string; name: string; slug: string; count: number }[];
  manufacturers: { id: string; name: string; slug: string; logo: string | null }[];
  engines: { id: string; name: string; slug: string }[];
  /** Filtresiz marka/model listing toplamı (COUNT yerine). */
  productTotal?: number;
};

export type CategoryFacetSnapshot = {
  manufacturers: { id: string; name: string; slug: string; logo: string | null; count: number }[];
  brands: { id: string; name: string; slug: string; count: number }[];
  children: { id: string; name: string; slug: string; count: number }[];
  productTotal?: number;
};

export function brandFacetKey(tenantId: string, brandId: string, modelId?: string | null) {
  return `brand:${tenantId}:${brandId}:${modelId ?? ""}`;
}

export function categoryFacetKey(tenantId: string, categoryId: string) {
  return `cat:${tenantId}:${categoryId}`;
}

export async function readFacetSnapshot<T>(cacheKey: string): Promise<{ payload: T; updatedAt: Date } | null> {
  await ensureExtTables();
  const row = await first<{ payload: unknown; updated_at: Date | string }>(
    sql`select payload, updated_at from catalog_facet_snapshots where cache_key = ${cacheKey} limit 1`,
  );
  if (!row) return null;
  const payload = parseJson<T | null>(row.payload, null);
  if (!payload) return null;
  return { payload, updatedAt: new Date(row.updated_at) };
}

export async function writeFacetSnapshot(cacheKey: string, payload: unknown) {
  await ensureExtTables();
  const json = JSON.stringify(payload);
  await exec(
    sql`insert into catalog_facet_snapshots (cache_key, payload) values (${cacheKey}, cast(${json} as json))
        on duplicate key update payload = values(payload), updated_at = current_timestamp`,
  );
}
