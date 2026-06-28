import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type {
  RequestAssignmentCandidates,
  RequestQueueResponse,
  RequestSummary,
  ServiceRequest,
} from "./request-types";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

async function requireRequestResponse<T>(path: string): Promise<T> {
  const cookieStore = await cookies();
  const response = await fetch(`${apiBaseUrl}/${path}`, {
    cache: "no-store",
    headers: { cookie: cookieStore.toString() },
  }).catch(() => null);

  if (!response) {
    throw new Error("The request lifecycle API is unavailable.");
  }
  if (response.status === 401) {
    redirect("/login");
  }
  if (response.status === 403) {
    redirect("/403");
  }
  if (response.status === 404) {
    redirect("/requests");
  }
  if (!response.ok) {
    throw new Error(`The request lifecycle API returned ${response.status}.`);
  }
  return (await response.json()) as T;
}

export function requireRequests(): Promise<RequestSummary[]> {
  return requireRequestResponse<RequestSummary[]>("requests");
}

export function requireRequestQueue(
  queue: RequestQueueResponse["queue"] = "all",
): Promise<RequestQueueResponse> {
  return requireRequestResponse<RequestQueueResponse>(`requests/queues/${queue}`);
}

export function requireRequest(id: string): Promise<ServiceRequest> {
  return requireRequestResponse<ServiceRequest>(`requests/${id}`);
}

export function requireRequestAssignmentCandidates(): Promise<RequestAssignmentCandidates> {
  return requireRequestResponse<RequestAssignmentCandidates>("requests/assignment-candidates");
}

export function requireClientRequests(): Promise<RequestSummary[]> {
  return requireRequestResponse<RequestSummary[]>("client-portal/requests");
}

export function requireClientRequest(id: string): Promise<ServiceRequest> {
  return requireRequestResponse<ServiceRequest>(`client-portal/requests/${id}`);
}
