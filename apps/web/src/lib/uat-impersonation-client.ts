"use client";

import type { CurrentUser } from "./auth";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

export interface UatImpersonationUser {
  id: string;
  email: string;
  displayName: string;
  userType: "INTERNAL" | "EXTERNAL";
  roles: Array<{ code: string; name: string }>;
  clients: Array<{ id: string; code: string; name: string }>;
  lastLoginAt: string | null;
}

export interface UatSessionUser extends CurrentUser {
  capabilities?: { uatUserSwitcher?: boolean };
  impersonation?: {
    active: true;
    admin: { id: string; email: string; displayName: string };
  } | null;
}

export interface UatImpersonationDirectory {
  users: UatImpersonationUser[];
  recentUserIds: string[];
}

function cookieValue(name: string): string | undefined {
  return document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

async function responseBody<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `UAT user switcher request failed (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

function csrfHeaders(json = false): Headers {
  const csrfCookieName = process.env.NEXT_PUBLIC_AUTH_CSRF_COOKIE_NAME ?? "jzoom_csrf";
  const csrf = cookieValue(csrfCookieName);
  const headers = new Headers();
  if (json) headers.set("Content-Type", "application/json");
  if (csrf) headers.set("X-CSRF-Token", decodeURIComponent(csrf));
  return headers;
}

export async function loadUatSession(): Promise<UatSessionUser> {
  const response = await fetch(`${apiBaseUrl}/auth/me`, {
    cache: "no-store",
    credentials: "include",
  });
  const body = await responseBody<{ user: UatSessionUser }>(response);
  return body.user;
}

export async function loadUatImpersonationUsers(): Promise<UatImpersonationDirectory> {
  const response = await fetch(`${apiBaseUrl}/auth/uat/impersonation/users`, {
    cache: "no-store",
    credentials: "include",
  });
  return responseBody<UatImpersonationDirectory>(response);
}

export async function startUatImpersonation(userId: string): Promise<UatSessionUser> {
  const response = await fetch(`${apiBaseUrl}/auth/uat/impersonation/start`, {
    method: "POST",
    credentials: "include",
    headers: csrfHeaders(true),
    body: JSON.stringify({ userId }),
  });
  const body = await responseBody<{ user: UatSessionUser }>(response);
  return body.user;
}

export async function stopUatImpersonation(): Promise<UatSessionUser> {
  const response = await fetch(`${apiBaseUrl}/auth/uat/impersonation/stop`, {
    method: "POST",
    credentials: "include",
    headers: csrfHeaders(),
  });
  const body = await responseBody<{ user: UatSessionUser }>(response);
  return body.user;
}
