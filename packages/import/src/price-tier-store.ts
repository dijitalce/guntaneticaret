import { and, asc, gt, ne, sql } from "drizzle-orm";
import { db, getAppSetting, products, setAppSetting } from "@guntan/db";
import { PRODUCT_SOURCE } from "@guntan/types";
import {
  DEFAULT_PRICE_TIERS,
  normalizePriceTiers,
  repriceSale,
  setActivePriceTiers,
  toStoredTiers,
  type PriceTier,
  type StoredPriceTier,
} from "./price-tiers";

const TIERS_KEY = "price_tiers";
const JOB_KEY = "price_reprice_job";
const APPLIED_KEY = "price_tiers_applied";
const BATCH = 1000;
const JOB_STALE_MS = 30 * 60_000;

export type PriceTierSetting = { tiers: PriceTier[]; updatedAt: Date | null; updatedBy: string | null; isDefault: boolean };

export type RepriceJob = {
  status: "running" | "done" | "failed";
  startedAt: string;
  finishedAt?: string;
  scanned: number;
  updated: number;
  total: number;
  by?: string;
  error?: string;
};

export async function loadPriceTiers(): Promise<PriceTierSetting> {
  const row = await getAppSetting<{ tiers: StoredPriceTier[]; by?: string }>(TIERS_KEY);
  if (!row) return { tiers: DEFAULT_PRICE_TIERS, updatedAt: null, updatedBy: null, isDefault: true };
  try {
    return { tiers: normalizePriceTiers(row.value.tiers), updatedAt: row.updatedAt, updatedBy: row.value.by ?? null, isDefault: false };
  } catch {
    return { tiers: DEFAULT_PRICE_TIERS, updatedAt: null, updatedBy: null, isDefault: true };
  }
}

/** Import CLI'ları başında çağırır; DB'ye erişilemezse varsayılan dilimlerle devam eder. */
export async function useStoredPriceTiers(): Promise<PriceTier[]> {
  const { tiers } = await loadPriceTiers().catch(() => ({ tiers: DEFAULT_PRICE_TIERS }));
  setActivePriceTiers(tiers);
  return tiers;
}

export async function savePriceTiers(tiers: PriceTier[], by: string) {
  await setAppSetting(TIERS_KEY, { tiers: toStoredTiers(tiers), by });
}

/** Veritabanındaki satış fiyatlarının hangi dilimlerle hesaplandığı. */
export async function loadAppliedPriceTiers(): Promise<PriceTier[] | null> {
  const row = await getAppSetting<{ tiers: StoredPriceTier[] }>(APPLIED_KEY);
  if (!row) return null;
  try {
    return normalizePriceTiers(row.value.tiers);
  } catch {
    return null;
  }
}

export async function markPriceTiersApplied(tiers: PriceTier[]) {
  await setAppSetting(APPLIED_KEY, { tiers: toStoredTiers(tiers) });
}

export async function getRepriceJob(): Promise<RepriceJob | null> {
  const row = await getAppSetting<RepriceJob>(JOB_KEY);
  return row?.value ?? null;
}

export function isRepriceRunning(job: RepriceJob | null) {
  return job?.status === "running" && Date.now() - Date.parse(job.startedAt) < JOB_STALE_MS;
}

/**
 * XML/tedarikçi kaynaklı ürünleri eski dilimlerden yenilerine taşır.
 * Kesin fiyat bir sonraki senkronda tedarikçi maliyetinden yeniden hesaplanır
 * (content hash değiştiği için ürünler yeniden import edilir).
 */
export async function runRepriceJob(oldTiers: PriceTier[], newTiers: PriceTier[], by: string): Promise<RepriceJob> {
  const scope = ne(products.source, PRODUCT_SOURCE.MANUAL);
  const [{ total }] = (await db.select({ total: sql<number>`count(*)` }).from(products).where(scope)) as [{ total: number }];
  const job: RepriceJob = { status: "running", startedAt: new Date().toISOString(), scanned: 0, updated: 0, total: Number(total), by };
  await setAppSetting(JOB_KEY, job);

  try {
    let lastId = "";
    for (;;) {
      const rows = await db
        .select({ id: products.id, price: products.price, compareAtPrice: products.compareAtPrice })
        .from(products)
        .where(lastId ? and(scope, gt(products.id, lastId)) : scope)
        .orderBy(asc(products.id))
        .limit(BATCH);
      if (rows.length === 0) break;
      lastId = rows[rows.length - 1]!.id;

      const changed: { id: string; price: string; compareAt: string | null }[] = [];
      for (const row of rows) {
        const sale = Number(row.price);
        if (!Number.isFinite(sale) || sale <= 0) continue;
        const list = row.compareAtPrice != null && row.compareAtPrice !== "" ? Number(row.compareAtPrice) : null;
        const next = repriceSale(sale, list, oldTiers, newTiers);
        const price = next.price.toFixed(2);
        const compareAt = next.compareAt != null ? next.compareAt.toFixed(2) : null;
        if (price !== Number(row.price).toFixed(2) || compareAt !== (list != null ? list.toFixed(2) : null)) {
          changed.push({ id: row.id, price, compareAt });
        }
      }

      if (changed.length) {
        const ids = sql.join(changed.map((c) => sql`${c.id}`), sql`, `);
        const priceCase = sql.join(changed.map((c) => sql`when ${c.id} then ${c.price}`), sql` `);
        const listCase = sql.join(changed.map((c) => sql`when ${c.id} then ${c.compareAt}`), sql` `);
        await db.execute(
          sql`update products
              set price = case id ${priceCase} end,
                  compare_at_price = case id ${listCase} end,
                  updated_at = now()
              where id in (${ids})`,
        );
      }

      job.scanned += rows.length;
      job.updated += changed.length;
      await setAppSetting(JOB_KEY, job);
    }
    job.status = "done";
    await markPriceTiersApplied(newTiers);
  } catch (err) {
    job.status = "failed";
    job.error = err instanceof Error ? err.message : String(err);
  }
  job.finishedAt = new Date().toISOString();
  await setAppSetting(JOB_KEY, job);
  return job;
}
