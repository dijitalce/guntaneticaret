import { describe, expect, it } from "vitest";
import {
  applyMarginToAmount,
  applyMarginToPrice,
  marginPercentForPrice,
  percentConsistentWithSale,
  DEFAULT_PRICE_TIERS,
  normalizePriceTiers,
  repriceSale,
  setActivePriceTiers,
  toStoredTiers,
  type PriceTier,
} from "./price-tiers";

describe("price tiers", () => {
  it("picks percent by band (1000 TL dahil %30)", () => {
    expect(marginPercentForPrice(0)).toBe(30);
    expect(marginPercentForPrice(999.99)).toBe(30);
    expect(marginPercentForPrice(1000)).toBe(30);
    expect(marginPercentForPrice(1000.01)).toBe(25);
    expect(marginPercentForPrice(4999)).toBe(25);
    expect(marginPercentForPrice(5000)).toBe(25);
    expect(marginPercentForPrice(5000.01)).toBe(20);
    expect(marginPercentForPrice(10000)).toBe(20);
    expect(marginPercentForPrice(10000.01)).toBe(15);
    expect(marginPercentForPrice(25000)).toBe(15);
    expect(marginPercentForPrice(25000.01)).toBe(10);
    expect(marginPercentForPrice(100000)).toBe(10);
  });

  it("applies markup to sale from cost", () => {
    expect(applyMarginToPrice(800)).toBe(1040);
    expect(applyMarginToPrice(1000)).toBe(1300);
    expect(applyMarginToPrice(2000)).toBe(2500);
    expect(applyMarginToPrice(8000)).toBe(9600);
    expect(applyMarginToPrice(12000)).toBe(13800);
    expect(applyMarginToPrice(30000)).toBe(33000);
  });

  it("applies the cost band percent to list price too", () => {
    expect(applyMarginToAmount(1000, 1000)).toBe(1300);
    expect(applyMarginToAmount(1000, 1500)).toBe(1950);
    expect(applyMarginToAmount(2000, 2762.97)).toBe(3453.71);
  });

  it("recovers percent from an already marked-up sale", () => {
    expect(percentConsistentWithSale(1300)).toBe(30);
    expect(percentConsistentWithSale(2500)).toBe(25);
  });
});

describe("editable tiers", () => {
  const raised: PriceTier[] = DEFAULT_PRICE_TIERS.map((t) => ({ ...t, percent: t.percent + 5 }));

  it("normalizes stored tiers and forces the last one open-ended", () => {
    const tiers = normalizePriceTiers([
      { below: 1000, percent: 35 },
      { below: 99999, percent: 12.345 },
    ]);
    expect(tiers[1]).toEqual({ below: Number.POSITIVE_INFINITY, percent: 12.35 });
    expect(toStoredTiers(tiers)[1]!.below).toBeNull();
  });

  it("rejects bad tiers", () => {
    expect(() => normalizePriceTiers([])).toThrow();
    expect(() => normalizePriceTiers([{ below: 5000, percent: 20 }, { below: 1000, percent: 10 }, { below: null, percent: 5 }])).toThrow();
    expect(() => normalizePriceTiers([{ below: null, percent: -1 }])).toThrow();
  });

  it("reprices a sale from old tiers to new tiers via cost", () => {
    expect(repriceSale(1300, null, DEFAULT_PRICE_TIERS, raised)).toEqual({ price: 1350, compareAt: null });
    expect(repriceSale(2500, 3000, DEFAULT_PRICE_TIERS, raised)).toEqual({ price: 2600, compareAt: 3120 });
    expect(repriceSale(33000, null, DEFAULT_PRICE_TIERS, raised).price).toBe(34500);
  });

  it("matches a fresh import with the new tiers", () => {
    // Dilim sınırının hemen üstündeki maliyetler (örn. 1000.01) satışta alt dilimle çakışabilir;
    // onları senkron gerçek maliyetten düzeltir.
    for (const cost of [12.5, 800, 1000, 1100, 4321.1, 9999, 26000]) {
      const oldSale = applyMarginToPrice(cost, DEFAULT_PRICE_TIERS);
      const expected = applyMarginToPrice(cost, raised);
      expect(Math.abs(repriceSale(oldSale, null, DEFAULT_PRICE_TIERS, raised).price - expected)).toBeLessThanOrEqual(0.02);
    }
  });

  it("uses active tiers as the default", () => {
    setActivePriceTiers(raised);
    try {
      expect(applyMarginToPrice(1000)).toBe(1350);
    } finally {
      setActivePriceTiers(DEFAULT_PRICE_TIERS);
    }
  });
});
