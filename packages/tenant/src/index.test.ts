import { describe, expect, it } from "vitest";
import { normalizeHost } from "./index";

describe("normalizeHost", () => {
  it("strips www and port", () => {
    expect(normalizeHost("www.japon.localhost:3000")).toBe("japon.localhost");
  });
  it("lowercases", () => {
    expect(normalizeHost("Guntan.Localhost")).toBe("guntan.localhost");
  });
  it("maps www parked domains to apex", () => {
    expect(normalizeHost("www.guntanotoyedekparca.com")).toBe("guntanotoyedekparca.com");
    expect(normalizeHost("www.abdgrupotoyedekparca.com:443")).toBe("abdgrupotoyedekparca.com");
  });
});
