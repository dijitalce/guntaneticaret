import { describe, expect, it } from "vitest";
import {
  ROLE_PERMISSIONS,
  ADMIN_ROLE,
  ADMIN_PERMISSION,
  ANNOUNCEMENT_KEYS,
  DEFAULT_ANNOUNCEMENT_COLORS,
  DEFAULT_SALES_CLOSED_MESSAGE,
  announcementFromSocial,
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

describe("announcementFromSocial", () => {
  it("splits non-empty lines into messages", () => {
    const a = announcementFromSocial({ [ANNOUNCEMENT_KEYS.text]: " Aynı gün kargo \n\n  \n14 gün iade\r\n" });
    expect(a.messages).toEqual(["Aynı gün kargo", "14 gün iade"]);
  });
  it("falls back to default colors for invalid values", () => {
    expect(announcementFromSocial(null)).toEqual({ messages: [], ...DEFAULT_ANNOUNCEMENT_COLORS });
    const a = announcementFromSocial({ [ANNOUNCEMENT_KEYS.bg]: "#112233", [ANNOUNCEMENT_KEYS.fg]: "red" });
    expect(a.bg).toBe("#112233");
    expect(a.fg).toBe(DEFAULT_ANNOUNCEMENT_COLORS.fg);
  });
});
