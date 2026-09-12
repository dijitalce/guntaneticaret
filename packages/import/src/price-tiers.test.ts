import { describe, expect, it } from "vitest";
import {
  applyMarginToAmount,
  applyMarginToPrice,
  marginPercentForPrice,
  percentConsistentWithSale,
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
