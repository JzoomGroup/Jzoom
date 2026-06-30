"use client";

import type { ApiErrorBody } from "./catalog-types";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

function cookieValue(name: string): string | undefined {
  return document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export class AuthApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: ApiErrorBody,
  ) {
    super(message);
    this.name = "AuthApiError";
  }
}

export async function changePassword(newPassword: string, confirmPassword: string) {
  const csrfCookieName = process.env.NEXT_PUBLIC_AUTH_CSRF_COOKIE_NAME ?? "jzoom_csrf";
  const csrf = cookieValue(csrfCookieName);
  const headers = new Headers({ "Content-Type": "application/json" });
  if (csrf) {
    headers.set("X-CSRF-Token", decodeURIComponent(csrf));
  }

  const response = await fetch(`${apiBaseUrl}/auth/me/password`, {
    method: "PATCH",
    credentials: "include",
    headers,
    body: JSON.stringify({ newPassword, confirmPassword }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
    throw new AuthApiError(
      body.message ?? `Password change failed with status ${response.status}.`,
      response.status,
      body,
    );
  }

  return response.json() as Promise<{ user: { roles: string[] } }>;
}
