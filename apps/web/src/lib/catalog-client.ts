"use client";

import type { ApiErrorBody, CatalogSnapshot } from "./catalog-types";

export const catalogApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

function cookieValue(name: string): string | undefined {
  return document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export class CatalogApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: ApiErrorBody,
  ) {
    super(message);
    this.name = "CatalogApiError";
  }
}

export async function catalogRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = options.method?.toUpperCase() ?? "GET";
  const csrfCookieName = process.env.NEXT_PUBLIC_AUTH_CSRF_COOKIE_NAME ?? "jzoom_csrf";
  const csrf = cookieValue(csrfCookieName);
  const headers = new Headers(options.headers);

  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (options.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(method) && csrf) {
    headers.set("X-CSRF-Token", decodeURIComponent(csrf));
  }

  const response = await fetch(`${catalogApiBaseUrl}/${path}`, {
    ...options,
    method,
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
    throw new CatalogApiError(
      body.message ?? `Catalog request failed with status ${response.status}.`,
      response.status,
      body,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export function refreshCatalog(): Promise<CatalogSnapshot> {
  return catalogRequest<CatalogSnapshot>("admin/catalog");
}

export function catalogErrorMessage(error: unknown): string {
  if (error instanceof CatalogApiError) {
    const fields = error.body.fieldErrors?.map((field) => field.message).join(" ");
    return fields || error.message;
  }
  return error instanceof Error ? error.message : "The catalog change could not be saved.";
}
