"use client";

import type { ApiErrorBody } from "./catalog-types";
import { localizedApiErrorMessage } from "./api-error-i18n";
import type {
  ProjectOutputStatus,
  ProjectStatus,
  ProjectSummary,
  ProjectTaskStatus,
} from "./project-types";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

function cookieValue(name: string): string | undefined {
  return document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export class ProjectApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: ApiErrorBody,
  ) {
    super(message);
    this.name = "ProjectApiError";
  }
}

export async function projectRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
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

  const response = await fetch(`${apiBaseUrl}/${path}`, {
    ...options,
    credentials: "include",
    headers,
    method,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
    throw new ProjectApiError(
      body.message ?? `Project request failed with status ${response.status}.`,
      response.status,
      body,
    );
  }
  return (await response.json()) as T;
}

export function projectErrorMessage(error: unknown): string {
  if (error instanceof ProjectApiError) {
    return localizedApiErrorMessage(
      error.body,
      error.message,
      "تعذر حفظ إجراء المشروع. راجع البيانات وحاول مرة أخرى.",
    );
  }
  if (error instanceof Error) {
    return localizedApiErrorMessage({}, error.message, "تعذر حفظ إجراء المشروع.");
  }
  return localizedApiErrorMessage(
    {},
    "The project action could not be saved.",
    "تعذر حفظ إجراء المشروع.",
  );
}

export function changeProjectStatus(id: string, status: ProjectStatus): Promise<ProjectSummary> {
  return projectRequest<ProjectSummary>(`projects/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function updateProjectTaskStatus(
  id: string,
  taskId: string,
  status: ProjectTaskStatus,
): Promise<ProjectSummary> {
  return projectRequest<ProjectSummary>(`projects/${id}/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function createProjectOutput(
  id: string,
  input: { title: string; code?: string; description?: string },
): Promise<ProjectSummary> {
  return projectRequest<ProjectSummary>(`projects/${id}/outputs`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function changeProjectOutputStatus(
  id: string,
  outputId: string,
  status: ProjectOutputStatus,
  reason?: string,
): Promise<ProjectSummary> {
  return projectRequest<ProjectSummary>(`projects/${id}/outputs/${outputId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, ...(reason?.trim() ? { reason: reason.trim() } : {}) }),
  });
}

export function uploadProjectOutputFile(
  id: string,
  outputId: string,
  file: File,
): Promise<ProjectSummary> {
  const body = new FormData();
  body.set("file", file);
  return projectRequest<ProjectSummary>(`projects/${id}/outputs/${outputId}/files/upload`, {
    method: "POST",
    body,
  });
}

export function changeClientProjectOutputStatus(
  id: string,
  outputId: string,
  status: "ACCEPTED_BY_CLIENT" | "RETURNED_BY_CLIENT",
  reason?: string,
): Promise<ProjectSummary> {
  return projectRequest<ProjectSummary>(`client-portal/projects/${id}/outputs/${outputId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, ...(reason?.trim() ? { reason: reason.trim() } : {}) }),
  });
}
