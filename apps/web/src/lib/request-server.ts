import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type {
  RequestAssignmentCandidates,
  RequestIntakeOptions,
  RequestQueueResponse,
  RequestSummary,
  ServiceRequest,
} from "./request-types";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

function absoluteRequestDownloadUrl(downloadUrl: string | null | undefined) {
  if (!downloadUrl || /^https?:\/\//i.test(downloadUrl)) {
    return downloadUrl ?? null;
  }
  const apiBase = apiBaseUrl.replace(/\/$/, "");
  if (downloadUrl.startsWith("/api/v1/")) {
    return `${apiBase}/${downloadUrl.slice("/api/v1/".length)}`;
  }
  if (downloadUrl.startsWith("api/v1/")) {
    return `${apiBase}/${downloadUrl.slice("api/v1/".length)}`;
  }
  return downloadUrl;
}

function normalizeServiceRequestDownloadUrls(request: ServiceRequest): ServiceRequest {
  return {
    ...request,
    attachments: request.attachments.map((attachment) => ({
      ...attachment,
      downloadUrl: absoluteRequestDownloadUrl(attachment.downloadUrl),
    })),
    documentRequests: request.documentRequests.map((documentRequest) => ({
      ...documentRequest,
      file: documentRequest.file
        ? {
            ...documentRequest.file,
            downloadUrl: absoluteRequestDownloadUrl(documentRequest.file.downloadUrl),
          }
        : null,
    })),
    outputs: request.outputs.map((output) => ({
      ...output,
      attachments: output.attachments.map((attachment) => ({
        ...attachment,
        downloadUrl: absoluteRequestDownloadUrl(attachment.downloadUrl),
      })),
    })),
  };
}

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
  return requireRequestResponse<ServiceRequest>(`requests/${id}`).then(
    normalizeServiceRequestDownloadUrls,
  );
}

export function requireRequestAssignmentCandidates(): Promise<RequestAssignmentCandidates> {
  return requireRequestResponse<RequestAssignmentCandidates>("requests/assignment-candidates");
}

export function requireRequestIntakeOptions(): Promise<RequestIntakeOptions> {
  return requireRequestResponse<RequestIntakeOptions>("requests/intake-options");
}

export function requireClientRequests(): Promise<RequestSummary[]> {
  return requireRequestResponse<RequestSummary[]>("client-portal/requests");
}

export function requireClientRequest(id: string): Promise<ServiceRequest> {
  return requireRequestResponse<ServiceRequest>(`client-portal/requests/${id}`).then(
    normalizeServiceRequestDownloadUrls,
  );
}
