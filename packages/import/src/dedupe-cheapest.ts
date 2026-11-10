import { inArray } from "drizzle-orm";
import { compileVisibility, db, pool, products } from "@guntan/db";
import { PRODUCT_STATUS } from "@guntan/types";

export type DedupeCandidate = {
  id: string;
  price: number;
  supplierCode: string;
  normalizedOem: string;
  manufacturerSlug: string;
  /** Varsayılan true; stoksuz ürün stokta olan rakibini gizlemez. */
  inStock?: boolean;
};

export type DedupeDecision = {
  activateIds: string[];
  deactivateIds: string[];
  groups: number;
};

const PREFERRED_SUPPLIER = "DEMO";

function hasPrice(c: DedupeCandidate) {
  return Number.isFinite(c.price) && c.price > 0;
}

/** Prefer priced, then in-stock, then lower price; on tie keep DEMO (Güntan) over BASBUG. */
export function compareCandidates(a: DedupeCandidate, b: DedupeCandidate): number {
  const aPriced = hasPrice(a);
  const bPriced = hasPrice(b);
  if (aPriced !== bPriced) return aPriced ? -1 : 1;
  const aStock = a.inStock !== false;
  const bStock = b.inStock !== false;
  if (aStock !== bStock) return aStock ? -1 : 1;
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
    if (hasPrice(winner)) activate.add(winner.id);
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
  // Gruplama veritabanında yapılır: yalnızca birden fazla ürün içeren (OEM, üretici) grupları belleğe
  // gelir. Önceden 2 milyon OEM satırının tamamı belleğe alınıyor, süreç barındırmanın bellek sınırına
  // takılıp öldürülüyordu ("basbug-cli.ts çıkış kodu null").
  const [rows] = await pool.query({
    sql: `with dup as (
            select po.normalized, p.manufacturer_id
              from product_oems po
              join products p on p.id = po.product_id
             where p.status in (?, ?) and length(po.normalized) >= 5 and p.manufacturer_id is not null
             group by po.normalized, p.manufacturer_id
            having count(distinct p.id) > 1
          )
          select p.id, p.price, p.stock_qty, p.status, s.code, po.normalized, m.slug
            from dup
            join product_oems po on po.normalized = dup.normalized
            join products p on p.id = po.product_id and p.manufacturer_id = dup.manufacturer_id
            join suppliers s on s.id = p.supplier_id
            join manufacturers m on m.id = p.manufacturer_id
           where p.status in (?, ?)`,
    values: [PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.INACTIVE, PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.INACTIVE],
    rowsAsArray: true,
  });

  const statusById = new Map<string, string>();
  const candidates: DedupeCandidate[] = (rows as unknown[][]).map(([id, price, stockQty, status, supplierCode, normalizedOem, manufacturerSlug]) => {
    statusById.set(String(id), String(status));
    return {
      id: String(id),
      price: Number(price),
      inStock: Number(stockQty) > 0,
      supplierCode: String(supplierCode),
      normalizedOem: String(normalizedOem),
      manufacturerSlug: String(manufacturerSlug),
    };
  });

  const decision = pickCheapestWinners(candidates);

  // Yalnızca durumu gerçekten değişen ürünler yazılır (gereksiz güncelleme indeksleri şişirir).
  const toDeactivate = decision.deactivateIds.filter((id) => statusById.get(id) !== PRODUCT_STATUS.INACTIVE);
  const toActivate = decision.activateIds.filter((id) => statusById.get(id) !== PRODUCT_STATUS.ACTIVE);
  const CHUNK = 500;
  for (let i = 0; i < toDeactivate.length; i += CHUNK) {
    const batch = toDeactivate.slice(i, i + CHUNK);
    await db.update(products).set({ status: PRODUCT_STATUS.INACTIVE }).where(inArray(products.id, batch));
  }
  for (let i = 0; i < toActivate.length; i += CHUNK) {
    const batch = toActivate.slice(i, i + CHUNK);
    await db.update(products).set({ status: PRODUCT_STATUS.ACTIVE }).where(inArray(products.id, batch));
  }

  if (options.compile !== false) {
    await compileVisibility(db);
  }

  return {
    candidates: candidates.length,
    ...decision,
    deactivated: toDeactivate.length,
    activated: toActivate.length,
  };
}
