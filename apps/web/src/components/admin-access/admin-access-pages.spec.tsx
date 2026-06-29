import { render, screen } from "@testing-library/react";
import {
  AdminAuditLogsPageContent,
  AdminPermissionsPageContent,
  AdminRolesPageContent,
  AdminUsersPageContent,
} from "./admin-access-pages";
import type {
  AdminAccessPermission,
  AdminAccessRole,
  AdminAccessUser,
  AdminAuditLog,
} from "../../lib/admin-access-types";

const permission: AdminAccessPermission = {
  action: "manage",
  code: "PERM-MANAGE-USERS",
  description: "Manage portal users",
  module: "ACCESS",
  name: "Manage users",
  scopeRule: "ADMIN_ONLY",
  status: "ACTIVE",
};

const role: AdminAccessRole = {
  capabilities: "Can manage access records",
  code: "ROLE-ADMIN",
  dataScope: "GLOBAL",
  description: "Full platform administration",
  id: "role-1",
  isSystem: true,
  name: "Platform Admin",
  nameAr: "الأدمن",
  nameEn: "Platform Admin",
  permissions: [permission],
  restrictions: "Requires admin permission",
  sortOrder: 1,
  status: "ACTIVE",
  userType: "INTERNAL",
  usersCount: 1,
};

const user: AdminAccessUser = {
  assignedSupervisors: [],
  clientAssignments: [
    {
      client: { code: "CLIENT-1", id: "client-1", name: "Acme" },
      endsAt: null,
      roleCode: "ACCOUNT_MANAGER",
      startsAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  createdAt: "2026-01-01T00:00:00.000Z",
  displayName: "Ada Admin",
  email: "ada@example.com",
  id: "user-1",
  lastLoginAt: "2026-06-01T09:00:00.000Z",
  lockedUntil: null,
  permissionOverrides: [
    {
      effect: "ALLOW",
      expiresAt: null,
      permission,
      reason: "Temporary QA access",
    },
  ],
  preferredLocale: "en",
  roles: [role],
  scopes: [],
  sessionVersion: 1,
  specialistServiceScopes: [],
  status: "ACTIVE",
  supervisedSpecialists: [],
  updatedAt: "2026-01-01T00:00:00.000Z",
  userType: "INTERNAL",
};

const auditLog: AdminAuditLog = {
  actor: { displayName: "Ada Admin", email: "ada@example.com", id: "user-1" },
  entityId: "user-2",
  entityType: "User",
  eventCode: "AUTH_PERMISSION_DENIED",
  id: "audit-1",
  occurredAt: "2026-06-01T09:30:00.000Z",
  reason: "Missing permission",
  requestId: null,
  severity: "CRITICAL",
};

describe("Admin access pages", () => {
  it("renders portal users as access cards with roles and overrides", () => {
    render(<AdminUsersPageContent locale="en" users={[user]} />);

    expect(screen.getByRole("heading", { level: 1, name: "Portal users" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View audit logs" })).toHaveAttribute(
      "href",
      "/admin/audit-logs",
    );
    expect(screen.getByText("Ada Admin")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getAllByText("Platform Admin")).not.toHaveLength(0);
    expect(screen.getByText("Temporary QA access")).toBeInTheDocument();
  });

  it("renders role profiles with capabilities and permission chips", () => {
    render(<AdminRolesPageContent locale="en" permissions={[permission]} roles={[role]} />);

    expect(screen.getByRole("heading", { level: 1, name: "Roles" })).toBeInTheDocument();
    expect(screen.getByText("ROLE-ADMIN")).toBeInTheDocument();
    expect(screen.getByText("Can manage access records")).toBeInTheDocument();
    expect(screen.getByText("Manage users")).toBeInTheDocument();
  });

  it("renders permissions grouped by module", () => {
    render(<AdminPermissionsPageContent locale="en" permissions={[permission]} />);

    expect(screen.getByRole("heading", { level: 1, name: "Permissions" })).toBeInTheDocument();
    expect(screen.getAllByText("Access")).not.toHaveLength(0);
    expect(screen.getByText("PERM-MANAGE-USERS")).toBeInTheDocument();
    expect(screen.getByText("Admin Only")).toBeInTheDocument();
  });

  it("renders permissions in Arabic without exposing internal English labels", () => {
    render(<AdminPermissionsPageContent locale="ar" permissions={[permission]} />);

    expect(screen.getByRole("heading", { level: 1, name: "الصلاحيات" })).toBeInTheDocument();
    expect(screen.getAllByText("الوصول")).not.toHaveLength(0);
    expect(screen.getByText("إدارة المستخدمين")).toBeInTheDocument();
    expect(screen.getByText("الأدمن فقط")).toBeInTheDocument();
    expect(screen.queryByText("Admin Only")).not.toBeInTheDocument();
  });

  it("renders Arabic audit logs as a security review center", () => {
    render(<AdminAuditLogsPageContent locale="ar" logs={[auditLog]} />);

    expect(screen.getByRole("heading", { level: 1, name: "سجل التدقيق" })).toBeInTheDocument();
    expect(screen.getByText("منع وصول بسبب الصلاحية")).toBeInTheDocument();
    expect(screen.getAllByText("حرج")).not.toHaveLength(0);
    expect(screen.getByText("AUTH_PERMISSION_DENIED")).toBeInTheDocument();
    expect(screen.getAllByText("صلاحية غير متوفرة")).not.toHaveLength(0);
  });
});
