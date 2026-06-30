import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ProjectSummary } from "./project-types";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

async function requireProjectResponse<T>(path: string, fallbackPath: string): Promise<T> {
  const cookieStore = await cookies();
  const response = await fetch(`${apiBaseUrl}/${path}`, {
    cache: "no-store",
    headers: { cookie: cookieStore.toString() },
  }).catch(() => null);

  if (!response) {
    throw new Error("The project delivery API is unavailable.");
  }
  if (response.status === 401) {
    redirect("/login");
  }
  if (response.status === 403) {
    redirect("/403");
  }
  if (response.status === 404) {
    redirect(fallbackPath);
  }
  if (!response.ok) {
    throw new Error(`The project delivery API returned ${response.status}.`);
  }
  return (await response.json()) as T;
}

export function requireProjects(): Promise<ProjectSummary[]> {
  return requireProjectResponse<ProjectSummary[]>("projects", "/projects");
}

export function requireProject(id: string): Promise<ProjectSummary> {
  return requireProjectResponse<ProjectSummary>(`projects/${id}`, "/projects");
}

export function requireClientProjects(): Promise<ProjectSummary[]> {
  return requireProjectResponse<ProjectSummary[]>("client-portal/projects", "/client/projects");
}

export function requireClientProject(id: string): Promise<ProjectSummary> {
  return requireProjectResponse<ProjectSummary>(`client-portal/projects/${id}`, "/client/projects");
}
