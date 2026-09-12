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

export function marginPercentForPrice(costTry: number, tiers = DEFAULT_PRICE_TIERS): number {
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
export function applyMarginToPrice(costTry: number, tiers = DEFAULT_PRICE_TIERS): number {
  return applyPercent(costTry, marginPercentForPrice(costTry, tiers));
}

/** Liste/compare-at: maliyetin kademesindeki aynı yüzde. */
export function applyMarginToAmount(costTry: number, amountTry: number, tiers = DEFAULT_PRICE_TIERS): number {
  return applyPercent(amountTry, marginPercentForPrice(costTry, tiers));
}

export function applyMarginToPriceString(cost: string | number, tiers = DEFAULT_PRICE_TIERS): string {
  const n = typeof cost === "number" ? cost : Number(cost);
  if (!Number.isFinite(n) || n < 0) return typeof cost === "string" ? cost : "0.00";
  return applyMarginToPrice(n, tiers).toFixed(2);
}

/** Satış zaten marjlıysa hangi yüzde kullanıldığını tahmin et. */
export function percentConsistentWithSale(saleTry: number, tiers = DEFAULT_PRICE_TIERS): number {
  if (!Number.isFinite(saleTry) || saleTry < 0) return 0;
  const rounded = Math.round(saleTry * 100) / 100;
  for (const tier of tiers) {
    const cost = rounded / (1 + tier.percent / 100);
    if (marginPercentForPrice(cost, tiers) !== tier.percent) continue;
    if (applyMarginToPrice(cost, tiers) === rounded) return tier.percent;
  }
  return marginPercentForPrice(rounded, tiers);
}
