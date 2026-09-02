import { describe, expect, it } from "vitest";
import { availableStock, discountPercent } from "./index";

describe("inventory helpers", () => {
  it("computes available stock", () => {
    expect(availableStock(10, 3)).toBe(7);
    expect(availableStock(2, 5)).toBe(0);
  });
  it("computes discount percent", () => {
    expect(discountPercent("80", "100")).toBe(20);
    expect(discountPercent("100", null)).toBeNull();
  });
});
