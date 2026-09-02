import { describe, expect, it } from "vitest";
import { ROLE_PERMISSIONS, ADMIN_ROLE, ADMIN_PERMISSION } from "./index";

describe("RBAC", () => {
  it("super admin has system write", () => {
    expect(ROLE_PERMISSIONS[ADMIN_ROLE.SUPER_ADMIN]).toContain(ADMIN_PERMISSION.SYSTEM_WRITE);
  });
  it("viewer cannot write catalog", () => {
    expect(ROLE_PERMISSIONS[ADMIN_ROLE.VIEWER]).not.toContain(ADMIN_PERMISSION.CATALOG_WRITE);
  });
});
