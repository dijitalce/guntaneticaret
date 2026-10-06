import { describe, expect, it } from "vitest";
import {
  ROLE_PERMISSIONS,
  ADMIN_ROLE,
  ADMIN_PERMISSION,
  DEFAULT_SALES_CLOSED_MESSAGE,
  SALES_SOCIAL_KEYS,
  salesStatusFromSocial,
} from "./index";

describe("RBAC", () => {
  it("super admin has system write", () => {
    expect(ROLE_PERMISSIONS[ADMIN_ROLE.SUPER_ADMIN]).toContain(ADMIN_PERMISSION.SYSTEM_WRITE);
  });
  it("viewer cannot write catalog", () => {
    expect(ROLE_PERMISSIONS[ADMIN_ROLE.VIEWER]).not.toContain(ADMIN_PERMISSION.CATALOG_WRITE);
  });
});

describe("salesStatusFromSocial", () => {
  it("is open by default", () => {
    expect(salesStatusFromSocial(null)).toEqual({ open: true, message: DEFAULT_SALES_CLOSED_MESSAGE });
    expect(salesStatusFromSocial({ facebook: "https://facebook.com/x" }).open).toBe(true);
  });
  it("is closed only when the flag is set", () => {
    expect(salesStatusFromSocial({ [SALES_SOCIAL_KEYS.closed]: "1" }).open).toBe(false);
    expect(salesStatusFromSocial({ [SALES_SOCIAL_KEYS.closed]: "" }).open).toBe(true);
  });
  it("uses the custom message or falls back to the default", () => {
    expect(salesStatusFromSocial({ [SALES_SOCIAL_KEYS.closed]: "1", [SALES_SOCIAL_KEYS.message]: "  Tatildeyiz.  " }).message).toBe("Tatildeyiz.");
    expect(salesStatusFromSocial({ [SALES_SOCIAL_KEYS.closed]: "1", [SALES_SOCIAL_KEYS.message]: "   " }).message).toBe(DEFAULT_SALES_CLOSED_MESSAGE);
  });
});
