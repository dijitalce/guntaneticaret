import { describe, expect, it } from "vitest";
import { applyMarginToPrice, marginPercentForPrice } from "./price-tiers";

describe("price tiers", () => {
  it("picks percent by band", () => {
    expect(marginPercentForPrice(0)).toBe(30);
    expect(marginPercentForPrice(999.99)).toBe(30);
    expect(marginPercentForPrice(1000)).toBe(25);
    expect(marginPercentForPrice(4999)).toBe(25);
    expect(marginPercentForPrice(5000)).toBe(20);
    expect(marginPercentForPrice(9999)).toBe(20);
    expect(marginPercentForPrice(10000)).toBe(15);
    expect(marginPercentForPrice(24999)).toBe(15);
    expect(marginPercentForPrice(25000)).toBe(10);
    expect(marginPercentForPrice(100000)).toBe(10);
  });

  it("applies markup", () => {
    expect(applyMarginToPrice(800)).toBe(1040);
    expect(applyMarginToPrice(2000)).toBe(2500);
    expect(applyMarginToPrice(8000)).toBe(9600);
    expect(applyMarginToPrice(12000)).toBe(13800);
    expect(applyMarginToPrice(30000)).toBe(33000);
  });
});
