import { describe, expect, it } from "vitest";
import { productImageUrl } from "./index";

describe("productImageUrl", () => {
  it("uses product image first", () => {
    expect(productImageUrl("/p.jpg", "/t.jpg", "/g.svg")).toBe("/p.jpg");
  });
  it("falls back to tenant placeholder", () => {
    expect(productImageUrl(null, "/t.jpg", "/g.svg")).toBe("/t.jpg");
  });
  it("falls back to global placeholder", () => {
    expect(productImageUrl(undefined, null, "/g.svg")).toBe("/g.svg");
  });
});
