import type { AdminAccessPermission, AdminAccessRole } from "../../lib/admin-access-types";
import {
  summarizeEffectivePermissions,
  type EditablePermissionOverride,
} from "./use-user-access-editor";

const allowPermission: AdminAccessPermission = {
  action: "VIEW",
  code: "PERM-VIEW",
  description: null,
  effect: "ALLOW",
  module: "ACCESS",
  name: "View",
  status: "ACTIVE",
};

const denyPermission: AdminAccessPermission = {
  ...allowPermission,
  code: "PERM-DENIED-BY-ROLE",
  effect: "DENY",
  name: "Denied by role",
};

const role: AdminAccessRole = {
  capabilities: null,
  code: "ROLE-TEST",
  dataScope: null,
  description: null,
  id: "role-1",
  isSystem: false,
  name: "Test",
  nameAr: "اختبار",
  nameEn: "Test",
  permissions: [allowPermission, denyPermission],
  restrictions: null,
  sortOrder: 1,
  status: "ACTIVE",
  userType: "INTERNAL",
  usersCount: 1,
};

function override(
  permissionCode: string,
  effect: EditablePermissionOverride["effect"],
  expiresOn = "",
): EditablePermissionOverride {
  return { effect, expiresOn, permissionCode, reason: "Test exception" };
}

describe("effective user permissions", () => {
  it("combines role permissions with active user exceptions", () => {
    const summary = summarizeEffectivePermissions({
      overrides: [override("PERM-VIEW", "DENY"), override("PERM-DENIED-BY-ROLE", "ALLOW")],
      permissions: [allowPermission, denyPermission],
      roleCodes: [role.code],
      roles: [role],
      today: "2026-08-17",
    });

    expect(summary).toEqual({
      allowed: 1,
      denied: 1,
      codes: ["PERM-DENIED-BY-ROLE"],
    });
  });

  it("ignores expired exceptions", () => {
    const summary = summarizeEffectivePermissions({
      overrides: [override("PERM-VIEW", "DENY", "2026-08-16")],
      permissions: [allowPermission, denyPermission],
      roleCodes: [role.code],
      roles: [role],
      today: "2026-08-17",
    });

    expect(summary.codes).toContain("PERM-VIEW");
    expect(summary.allowed).toBe(1);
    expect(summary.denied).toBe(1);
  });
});
