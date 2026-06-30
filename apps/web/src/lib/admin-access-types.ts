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

export interface AdminAccessOperatingUserRef {
  id: string;
  email: string;
  displayName: string;
}

export interface AdminAccessServiceRef {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  domain: string | null;
  serviceLine: string | null;
}

export interface AdminAccessServiceItemRef {
  id: string;
  code: string;
  monthlyServiceId: string;
  monthlyServiceCode: string;
  nameAr: string;
  nameEn: string;
  requestType: string | null;
}

export interface AdminAccessOneTimeServiceRef {
  id: string;
  code: string;
  serviceLine: string;
  nameAr: string;
  nameEn: string;
}

export interface AdminAccessSetup {
  clients: AdminAccessClientRef[];
  roles: Array<AdminAccessRoleRef & { id: string }>;
  monthlyServices: AdminAccessServiceRef[];
  serviceItems: AdminAccessServiceItemRef[];
  oneTimeServices: AdminAccessOneTimeServiceRef[];
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
  mustChangePassword: boolean;
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
  specialistServiceScopes: Array<{
    id: string;
    isPrimary: boolean;
    status: string;
    startsAt: string;
    endsAt: string | null;
    client: AdminAccessClientRef | null;
    monthlyService: Pick<AdminAccessServiceRef, "id" | "code" | "nameAr" | "nameEn"> | null;
    serviceItem: Pick<
      AdminAccessServiceItemRef,
      "id" | "code" | "monthlyServiceId" | "nameAr" | "nameEn"
    > | null;
    oneTimeService: AdminAccessOneTimeServiceRef | null;
  }>;
  assignedSupervisors: Array<{
    id: string;
    startsAt: string;
    endsAt: string | null;
    client: AdminAccessClientRef | null;
    supervisor: AdminAccessOperatingUserRef;
  }>;
  supervisedSpecialists: Array<{
    id: string;
    startsAt: string;
    endsAt: string | null;
    client: AdminAccessClientRef | null;
    specialist: AdminAccessOperatingUserRef;
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
  setup: AdminAccessSetup;
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
