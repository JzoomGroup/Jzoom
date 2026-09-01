import { fireEvent, render, screen } from "@testing-library/react";
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
import { eventLabel, roleLabel, scopesLabel } from "./admin-access-formatters";

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
  mustChangePassword: false,
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
  it("localizes operational audit events in the Arabic interface", () => {
    expect(eventLabel("CLIENT_PROJECT_VIEWED", "ar")).toBe("عرض مشروع العميل");
    expect(eventLabel("CLIENT_REQUEST_VIEWED", "ar")).toBe("عرض طلب العميل");
    expect(eventLabel("HOURS_LEDGER_USAGE_SUMMARY_VIEWED", "ar")).toBe(
      "عرض ملخص استخدام سجل الساعات",
    );
    expect(eventLabel("PROJECT_OUTPUT_CREATED", "ar")).toBe("إنشاء مخرج مشروع");
    expect(eventLabel("PROJECT_OUTPUT_FILE_UPLOADED", "ar")).toBe("رفع ملف مخرج مشروع");
    expect(eventLabel("PROJECT_OUTPUT_STATUS_CHANGED", "ar")).toBe("تغيير حالة مخرج مشروع");
    expect(eventLabel("QUOTE_ACTIVATED", "ar")).toBe("تفعيل عرض سعر");
    expect(eventLabel("QUOTE_APPROVED", "ar")).toBe("اعتماد عرض سعر");
    expect(eventLabel("QUOTE_PAYMENT_CONFIRMED", "ar")).toBe("تأكيد دفع عرض سعر");
  });

  it("localizes system role and scope codes when Arabic source labels are missing", () => {
    const managementRole = {
      ...role,
      code: "ROLE-MGMT",
      name: "Jzoom Management",
      nameAr: null,
      nameEn: "Jzoom Management",
    };
    const globallyScopedUser = {
      ...user,
      clientAssignments: [],
      roles: [managementRole],
      scopes: [
        {
          client: null,
          domain: null,
          scopeType: "GLOBAL",
          teamCode: null,
        },
      ],
    };

    expect(roleLabel(managementRole, "ar")).toBe("الإدارة");
    expect(scopesLabel(globallyScopedUser, "ar")).toBe("عام");
  });

  it("renders portal users as access cards with roles and overrides", () => {
    render(
      <AdminUsersPageContent
        canModifyPermissions
        locale="en"
        permissions={[permission]}
        roles={[role]}
        users={[user]}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Portal users" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add operating user" })).toBeInTheDocument();
    expect(screen.queryByText("Security notes")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "View audit logs" })).not.toBeInTheDocument();
    expect(screen.getByText("Ada Admin")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getAllByText("Platform Admin")).not.toHaveLength(0);
    expect(screen.getByText("Temporary QA access")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Manage user" }));
    expect(screen.getByRole("dialog", { name: "Ada Admin" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "User record" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Ada Admin")).toBeInTheDocument();
    expect(screen.getByDisplayValue("ada@example.com")).toBeInTheDocument();
  });

  it("filters and paginates the user directory without rendering every account at once", () => {
    const users = Array.from({ length: 13 }, (_, index) => ({
      ...user,
      displayName: `Directory User ${index + 1}`,
      email: `directory-${index + 1}@example.com`,
      id: `user-${index + 1}`,
      permissionOverrides: [],
    }));

    render(
      <AdminUsersPageContent locale="en" permissions={[permission]} roles={[role]} users={users} />,
    );

    expect(screen.getAllByRole("button", { name: "Manage user" })).toHaveLength(12);
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Directory User 13")).toBeInTheDocument();
    expect(screen.queryByText("Directory User 1")).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: "Search users" }), {
      target: { value: "directory-4@example.com" },
    });
    expect(screen.getByText("Directory User 4")).toBeInTheDocument();
    expect(screen.queryByText("Directory User 13")).not.toBeInTheDocument();
  });

  it("renders role profiles with capabilities and permission chips", () => {
    render(<AdminRolesPageContent locale="en" permissions={[permission]} roles={[role]} />);

    expect(screen.getByRole("heading", { level: 1, name: "Roles" })).toBeInTheDocument();
    expect(screen.getByText("ROLE-ADMIN")).toBeInTheDocument();
    expect(screen.getByText("Can manage access records")).toBeInTheDocument();
    expect(screen.getByText("Manage users")).toBeInTheDocument();
    expect(screen.queryByText("Security notes")).not.toBeInTheDocument();
  });

  it("renders permissions grouped by module", () => {
    render(<AdminPermissionsPageContent locale="en" permissions={[permission]} roles={[role]} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Permission management center" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Access")).not.toHaveLength(0);
    expect(screen.getByText("PERM-MANAGE-USERS")).toBeInTheDocument();
    expect(screen.getByText("Admin Only")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Manage users/ })).toBeChecked();
    expect(screen.queryByText("Security notes")).not.toBeInTheDocument();
  });

  it("renders permissions in Arabic without exposing internal English labels", () => {
    render(<AdminPermissionsPageContent locale="ar" permissions={[permission]} roles={[role]} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "مركز إدارة الصلاحيات" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("الوصول")).not.toHaveLength(0);
    expect(screen.getByText("إدارة المستخدمين")).toBeInTheDocument();
    expect(screen.getByText("الأدمن فقط")).toBeInTheDocument();
    expect(screen.queryByText("Admin Only")).not.toBeInTheDocument();
  });

  it("renders Arabic audit logs as a security review center", () => {
    window.history.replaceState({}, "", "/admin/audit-logs");
    render(<AdminAuditLogsPageContent locale="ar" logs={[auditLog]} />);

    expect(screen.getByRole("heading", { level: 1, name: "سجل التدقيق" })).toBeInTheDocument();
    expect(screen.getAllByText("منع وصول بسبب الصلاحية")).not.toHaveLength(0);
    expect(screen.getAllByText("حرج")).not.toHaveLength(0);
    expect(screen.getByText("AUTH_PERMISSION_DENIED")).toBeInTheDocument();
    expect(screen.getAllByText("صلاحية غير متوفرة")).not.toHaveLength(0);
    expect(screen.queryByText("ملاحظات الأمان")).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("بحث بالمستخدم أو الحدث أو السجل"), {
      target: { value: "AUTH_PERMISSION_DENIED" },
    });
    expect(new URL(window.location.href).searchParams.get("q")).toBe("AUTH_PERMISSION_DENIED");
  });
});
