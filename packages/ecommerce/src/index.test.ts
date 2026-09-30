import { describe, expect, it } from "vitest";
import { availableStock, discountPercent, isValidTrPhone } from "./index";

describe("isValidTrPhone", () => {
  it("accepts formatted mobile and landline numbers", () => {
    expect(isValidTrPhone("0 (532) 123 45 67")).toBe(true);
    expect(isValidTrPhone("+90 212 123 45 67")).toBe(true);
    expect(isValidTrPhone("5321234567")).toBe(true);
  });
  it("rejects short or invalid numbers", () => {
    expect(isValidTrPhone("0 (532) 123 45")).toBe(false);
    expect(isValidTrPhone("0 (932) 123 45 67")).toBe(false);
    expect(isValidTrPhone("")).toBe(false);
  });
});

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
