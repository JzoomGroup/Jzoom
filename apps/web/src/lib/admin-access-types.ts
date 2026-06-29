export interface AdminAccessRoleRef {
  code: string;
  name: string;
  nameAr: string | null;
  nameEn: string | null;
  status: string;
}

export interface AdminAccessClientRef {
  id: string;
  code: string;
  name: string;
}

export interface AdminAccessPermission {
  id?: string;
  code: string;
  name: string;
  module: string;
  action: string;
  description: string | null;
  status: string;
  sortOrder?: number;
  effect?: string;
  scopeRule?: string | null;
}

export interface AdminAccessUser {
  id: string;
  email: string;
  displayName: string;
  preferredLocale: string;
  userType: "INTERNAL" | "EXTERNAL";
  status: "INVITED" | "ACTIVE" | "DISABLED" | "ARCHIVED";
  lockedUntil: string | null;
  lastLoginAt: string | null;
  sessionVersion: number;
  createdAt: string;
  updatedAt: string;
  roles: AdminAccessRoleRef[];
  scopes: Array<{
    scopeType: string;
    client: AdminAccessClientRef | null;
    domain: string | null;
    teamCode: string | null;
  }>;
  clientAssignments: Array<{
    roleCode: string;
    startsAt: string;
    endsAt: string | null;
    client: AdminAccessClientRef;
  }>;
  permissionOverrides: Array<{
    effect: string;
    reason: string;
    expiresAt: string | null;
    permission: Pick<AdminAccessPermission, "code" | "name" | "module" | "action">;
  }>;
}

export interface AdminAccessRole {
  id: string;
  code: string;
  name: string;
  nameAr: string | null;
  nameEn: string | null;
  userType: "INTERNAL" | "EXTERNAL";
  description: string | null;
  dataScope: string | null;
  capabilities: string | null;
  restrictions: string | null;
  isSystem: boolean;
  status: string;
  sortOrder: number;
  permissions: AdminAccessPermission[];
  usersCount: number;
}

export interface AdminAuditLog {
  id: string;
  eventCode: string;
  entityType: string;
  entityId: string | null;
  reason: string | null;
  requestId: string | null;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  occurredAt: string;
  actor: {
    id: string;
    email: string;
    displayName: string;
  } | null;
}

export interface AdminUsersSnapshot {
  users: AdminAccessUser[];
}

export interface AdminRolesSnapshot {
  roles: AdminAccessRole[];
  permissions: AdminAccessPermission[];
}

export interface AdminPermissionsSnapshot {
  permissions: AdminAccessPermission[];
}

export interface AdminAuditLogsSnapshot {
  logs: AdminAuditLog[];
}
