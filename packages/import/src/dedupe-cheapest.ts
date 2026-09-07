import { and, eq, inArray, sql } from "drizzle-orm";
import { compileVisibility, db, manufacturers, productOems, products, suppliers } from "@guntan/db";
import { PRODUCT_STATUS } from "@guntan/types";

export type DedupeCandidate = {
  id: string;
  price: number;
  supplierCode: string;
  normalizedOem: string;
  manufacturerSlug: string;
};

export type DedupeDecision = {
  activateIds: string[];
  deactivateIds: string[];
  groups: number;
};

const PREFERRED_SUPPLIER = "DEMO";

/** Prefer lower price; on tie keep DEMO (Güntan) over BASBUG. */
export function compareCandidates(a: DedupeCandidate, b: DedupeCandidate): number {
  if (a.price !== b.price) return a.price - b.price;
  if (a.supplierCode === PREFERRED_SUPPLIER && b.supplierCode !== PREFERRED_SUPPLIER) return -1;
  if (b.supplierCode === PREFERRED_SUPPLIER && a.supplierCode !== PREFERRED_SUPPLIER) return 1;
  return a.id.localeCompare(b.id);
}

export function pickCheapestWinners(candidates: DedupeCandidate[]): DedupeDecision {
  const groups = new Map<string, DedupeCandidate[]>();
  for (const c of candidates) {
    if (!c.normalizedOem || !c.manufacturerSlug) continue;
    const key = `${c.normalizedOem}::${c.manufacturerSlug}`;
    const list = groups.get(key);
    if (list) list.push(c);
    else groups.set(key, [c]);
  }

  const activate = new Set<string>();
  const deactivate = new Set<string>();
  let multiGroups = 0;

  for (const list of groups.values()) {
    if (list.length < 2) continue;
    multiGroups += 1;
    const sorted = [...list].sort(compareCandidates);
    const winner = sorted[0]!;
    activate.add(winner.id);
    for (const loser of sorted.slice(1)) {
      if (loser.id !== winner.id) deactivate.add(loser.id);
    }
  }

  // A product that wins one OEM group but loses another stays deactivated.
  for (const id of activate) {
    if (deactivate.has(id)) activate.delete(id);
  }

  return {
    activateIds: [...activate],
    deactivateIds: [...deactivate],
    groups: multiGroups,
  };
}

export async function runDedupeCheapest(options: { compile?: boolean } = {}) {
  const rows = await db
    .select({
      id: products.id,
      price: products.price,
      status: products.status,
      supplierCode: suppliers.code,
      normalizedOem: productOems.normalized,
      manufacturerSlug: manufacturers.slug,
    })
    .from(products)
    .innerJoin(suppliers, eq(products.supplierId, suppliers.id))
    .innerJoin(manufacturers, eq(products.manufacturerId, manufacturers.id))
    .innerJoin(productOems, eq(productOems.productId, products.id))
    .where(
      and(
        inArray(products.status, [PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.INACTIVE]),
        sql`length(${productOems.normalized}) >= 5`,
      ),
    );

  const candidates: DedupeCandidate[] = rows.map((r) => ({
    id: r.id,
    price: Number(r.price),
    supplierCode: r.supplierCode,
    normalizedOem: r.normalizedOem,
    manufacturerSlug: r.manufacturerSlug,
  }));

  const decision = pickCheapestWinners(candidates);

  const CHUNK = 500;
  for (let i = 0; i < decision.deactivateIds.length; i += CHUNK) {
    const batch = decision.deactivateIds.slice(i, i + CHUNK);
    await db.update(products).set({ status: PRODUCT_STATUS.INACTIVE }).where(inArray(products.id, batch));
  }
  for (let i = 0; i < decision.activateIds.length; i += CHUNK) {
    const batch = decision.activateIds.slice(i, i + CHUNK);
    await db.update(products).set({ status: PRODUCT_STATUS.ACTIVE }).where(inArray(products.id, batch));
  }

  if (options.compile !== false) {
    await compileVisibility(db);
  }

  return {
    candidates: candidates.length,
    ...decision,
    deactivated: decision.deactivateIds.length,
    activated: decision.activateIds.length,
  };
}
