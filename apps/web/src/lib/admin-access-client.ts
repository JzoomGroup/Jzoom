"use client";

import type { ApiErrorBody } from "./catalog-types";
import type { AdminUsersSnapshot } from "./admin-access-types";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

function cookieValue(name: string): string | undefined {
  return document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export class AdminAccessApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: ApiErrorBody,
  ) {
    super(message);
    this.name = "AdminAccessApiError";
  }
}

export async function adminAccessRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = options.method?.toUpperCase() ?? "GET";
  const csrfCookieName = process.env.NEXT_PUBLIC_AUTH_CSRF_COOKIE_NAME ?? "jzoom_csrf";
  const csrf = cookieValue(csrfCookieName);
  const headers = new Headers(options.headers);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(method) && csrf) {
    headers.set("X-CSRF-Token", decodeURIComponent(csrf));
  }

  const response = await fetch(`${apiBaseUrl}/${path}`, {
    ...options,
    method,
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
    throw new AdminAccessApiError(
      body.message ?? `Admin access request failed with status ${response.status}.`,
      response.status,
      body,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export function adminAccessErrorMessage(error: unknown): string {
  if (error instanceof AdminAccessApiError) {
    const fields = error.body.fieldErrors?.map((field) => field.message).join(" ");
    return fields || error.message;
  }
  return error instanceof Error ? error.message : "The access change could not be saved.";
}

export interface CreateOperatingUserPayload {
  displayName: string;
  email: string;
  roleCode: string;
  clientIds: string[];
  monthlyServiceIds: string[];
  serviceItemIds: string[];
  oneTimeServiceIds: string[];
  supervisorId?: string | undefined;
  specialistIds: string[];
}

export type OperatingUserScopePayload = Omit<
  CreateOperatingUserPayload,
  "displayName" | "email" | "roleCode"
>;

export interface CreateOperatingUserResponse {
  snapshot: AdminUsersSnapshot;
  temporaryPasswordAssigned?: boolean;
}

export function createOperatingUser(
  payload: CreateOperatingUserPayload,
): Promise<CreateOperatingUserResponse> {
  return adminAccessRequest<CreateOperatingUserResponse>("auth/admin/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function resetOperatingUserPassword(userId: string): Promise<{ reset: boolean }> {
  return adminAccessRequest<{ reset: boolean }>(`auth/admin/users/${userId}/reset-password`, {
    method: "POST",
  });
}

export function updateOperatingUserScope(
  userId: string,
  payload: OperatingUserScopePayload,
): Promise<{ updated: boolean }> {
  return adminAccessRequest<{ updated: boolean }>(`auth/admin/users/${userId}/operating-scope`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function fetchAdminUsersSnapshot(): Promise<AdminUsersSnapshot> {
  return adminAccessRequest<AdminUsersSnapshot>("auth/admin/users");
}
