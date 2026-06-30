"use client";

import type { ApiErrorBody } from "./catalog-types";
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

  if (options.body && !headers.has("Content-Type")) {
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
    const fields = error.body.fieldErrors?.map((field) => field.message).join(" ");
    return fields || error.message;
  }
  return error instanceof Error ? error.message : "The project action could not be saved.";
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
): Promise<ProjectSummary> {
  return projectRequest<ProjectSummary>(`projects/${id}/outputs/${outputId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function changeClientProjectOutputStatus(
  id: string,
  outputId: string,
  status: "ACCEPTED_BY_CLIENT" | "RETURNED_BY_CLIENT",
): Promise<ProjectSummary> {
  return projectRequest<ProjectSummary>(`client-portal/projects/${id}/outputs/${outputId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
