import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type {
  AdminAuditLogsSnapshot,
  AdminPermissionsSnapshot,
  AdminRolesSnapshot,
  AdminUsersSnapshot,
} from "./admin-access-types";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

async function requireAdminAccessResponse<T>(path: string): Promise<T> {
  const cookieStore = await cookies();
  const response = await fetch(`${apiBaseUrl}/${path}`, {
    cache: "no-store",
    headers: { cookie: cookieStore.toString() },
  }).catch(() => null);

  if (!response) {
    throw new Error("The Admin access API is unavailable.");
  }
  if (response.status === 401) {
    redirect("/login");
  }
  if (response.status === 403) {
    redirect("/403");
  }
  if (!response.ok) {
    throw new Error(`The Admin access API returned ${response.status}.`);
  }

  return (await response.json()) as T;
}

export function requireAdminUsers(): Promise<AdminUsersSnapshot> {
  return requireAdminAccessResponse<AdminUsersSnapshot>("auth/admin/users");
}

export function requireAdminRoles(): Promise<AdminRolesSnapshot> {
  return requireAdminAccessResponse<AdminRolesSnapshot>("auth/admin/roles");
}

export function requireAdminPermissions(): Promise<AdminPermissionsSnapshot> {
  return requireAdminAccessResponse<AdminPermissionsSnapshot>("auth/admin/permissions");
}

export function requireAdminAuditLogs(): Promise<AdminAuditLogsSnapshot> {
  return requireAdminAccessResponse<AdminAuditLogsSnapshot>("auth/admin/audit-logs");
}
