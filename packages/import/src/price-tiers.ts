/** Tedarikçi/maliyet fiyatı üzerine kademeli satış marjı. */

export type PriceTier = {
  /** Bu tutara kadar (dahil) üst sınır; son dilimde Infinity */
  below: number;
  /** Marj yüzdesi, örn. 30 → ×1.30 */
  percent: number;
};

/**
 * 0–1.000 → %30  (1000 TL geliş → 1300 TL satış)
 * 1.000–5.000 → %25
 * 5.000–10.000 → %20
 * 10.000–25.000 → %15
 * 25.000+ → %10
 */
export const DEFAULT_PRICE_TIERS: PriceTier[] = [
  { below: 1000, percent: 30 },
  { below: 5000, percent: 25 },
  { below: 10000, percent: 20 },
  { below: 25000, percent: 15 },
  { below: Number.POSITIVE_INFINITY, percent: 10 },
];

let activeTiers: PriceTier[] = DEFAULT_PRICE_TIERS;

/** Import'ların kullanacağı dilimler (senkron başında DB'den yüklenir). */
export function setActivePriceTiers(tiers: PriceTier[]) {
  activeTiers = tiers;
}

export function getActivePriceTiers(): PriceTier[] {
  return activeTiers;
}

export type StoredPriceTier = { below: number | null; percent: number };

export function toStoredTiers(tiers: PriceTier[]): StoredPriceTier[] {
  return tiers.map((t) => ({ below: Number.isFinite(t.below) ? t.below : null, percent: t.percent }));
}

/** Kayıttan/formdan gelen dilimleri doğrular; son dilim her zaman sınırsızdır. */
export function normalizePriceTiers(input: StoredPriceTier[]): PriceTier[] {
  if (!Array.isArray(input) || input.length === 0) throw new Error("En az bir dilim gerekli.");
  if (input.length > 12) throw new Error("En fazla 12 dilim tanımlanabilir.");
  const tiers: PriceTier[] = input.map((t, i) => {
    const percent = Number(t.percent);
    if (!Number.isFinite(percent) || percent < 0 || percent > 500) {
      throw new Error(`${i + 1}. dilimin oranı 0 ile 500 arasında olmalı.`);
    }
    const last = i === input.length - 1;
    const below = last ? Number.POSITIVE_INFINITY : Number(t.below);
    if (!last && (!Number.isFinite(below) || below <= 0)) throw new Error(`${i + 1}. dilimin üst sınırı geçersiz.`);
    return { below, percent: Math.round(percent * 100) / 100 };
  });
  for (let i = 1; i < tiers.length; i++) {
    if (tiers[i]!.below <= tiers[i - 1]!.below) throw new Error("Dilim üst sınırları artan sırada olmalı.");
  }
  return tiers;
}

export function sameTiers(a: PriceTier[], b: PriceTier[]) {
  return a.length === b.length && a.every((t, i) => t.below === b[i]!.below && t.percent === b[i]!.percent);
}

/**
 * Eski dilimlerle hesaplanmış satış fiyatını yeni dilimlere taşır:
 * maliyet geri hesaplanır, yeni oran uygulanır.
 */
export function repriceSale(
  saleTry: number,
  listTry: number | null,
  oldTiers: PriceTier[],
  newTiers: PriceTier[],
): { price: number; compareAt: number | null } {
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const sale = round2(saleTry);
  // Dilim sınırlarında aynı satış iki dilimden gelebilir; kuruşa yuvarlanmış maliyetle
  // birebir tutan dilim tercih edilir.
  const exact = oldTiers.find((t) => {
    const c = round2(sale / (1 + t.percent / 100));
    return marginPercentForPrice(c, oldTiers) === t.percent && applyPercent(c, t.percent) === sale;
  });
  const oldPct = exact?.percent ?? percentConsistentWithSale(sale, oldTiers);
  const cost = round2(sale / (1 + oldPct / 100));
  const newPct = marginPercentForPrice(cost, newTiers);
  const price = applyPercent(cost, newPct);
  let compareAt: number | null = null;
  if (listTry != null && Number.isFinite(listTry) && listTry > 0) {
    const listCost = listTry / (1 + oldPct / 100);
    const next = applyPercent(listCost, newPct);
    compareAt = next > price ? next : null;
  }
  return { price, compareAt };
}

export function marginPercentForPrice(costTry: number, tiers = activeTiers): number {
  if (!Number.isFinite(costTry) || costTry < 0) return 0;
  for (const tier of tiers) {
    if (costTry <= tier.below) return tier.percent;
  }
  return tiers[tiers.length - 1]?.percent ?? 0;
}

export function applyPercent(amountTry: number, percent: number): number {
  return Math.round(amountTry * (1 + percent / 100) * 100) / 100;
}

/** Maliyet TL → satış TL (2 ondalık). */
export function applyMarginToPrice(costTry: number, tiers = activeTiers): number {
  return applyPercent(costTry, marginPercentForPrice(costTry, tiers));
}

/** Liste/compare-at: maliyetin kademesindeki aynı yüzde. */
export function applyMarginToAmount(costTry: number, amountTry: number, tiers = activeTiers): number {
  return applyPercent(amountTry, marginPercentForPrice(costTry, tiers));
}

export function applyMarginToPriceString(cost: string | number, tiers = activeTiers): string {
  const n = typeof cost === "number" ? cost : Number(cost);
  if (!Number.isFinite(n) || n < 0) return typeof cost === "string" ? cost : "0.00";
  return applyMarginToPrice(n, tiers).toFixed(2);
}

/** Satış zaten marjlıysa hangi yüzde kullanıldığını tahmin et. */
export function percentConsistentWithSale(saleTry: number, tiers = activeTiers): number {
  if (!Number.isFinite(saleTry) || saleTry < 0) return 0;
  const rounded = Math.round(saleTry * 100) / 100;
  for (const tier of tiers) {
    const cost = rounded / (1 + tier.percent / 100);
    if (marginPercentForPrice(cost, tiers) !== tier.percent) continue;
    if (applyMarginToPrice(cost, tiers) === rounded) return tier.percent;
  }
  return marginPercentForPrice(rounded, tiers);
}
