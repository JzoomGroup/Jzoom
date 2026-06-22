"use client";

import { catalogErrorMessage, catalogRequest } from "./catalog-client";
import type { RequestQueueResponse, RequestStatus, ServiceRequest } from "./request-types";

export const requestErrorMessage = catalogErrorMessage;

export function refreshRequestQueue(
  queue: RequestQueueResponse["queue"] = "all",
  filters: Record<string, string> = {},
): Promise<RequestQueueResponse> {
  const query = new URLSearchParams({ ...filters, queue });
  return catalogRequest<RequestQueueResponse>(`requests/queues?${query.toString()}`);
}

export function createServiceRequest(input: {
  clientId: string;
  subscriptionServiceId: string;
  serviceItemRevisionId?: string;
  sourceQuoteId?: string;
  sourceInvoiceId?: string;
  assignedSpecialistId?: string;
  assignedSupervisorId?: string;
  accountManagerId?: string;
  title: string;
  description: string;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  dueAt?: string;
}): Promise<ServiceRequest> {
  return catalogRequest<ServiceRequest>("requests", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function changeRequestStatus(
  id: string,
  status: RequestStatus,
  reason?: string,
): Promise<ServiceRequest> {
  return catalogRequest<ServiceRequest>(`requests/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, ...(reason ? { reason } : {}) }),
  });
}

export function assignRequest(
  id: string,
  input: {
    assignedSpecialistId?: string | null;
    assignedSupervisorId?: string | null;
    accountManagerId?: string | null;
    reason?: string;
  },
): Promise<ServiceRequest> {
  return catalogRequest<ServiceRequest>(`requests/${id}/assignment`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function startRequestWork(id: string): Promise<ServiceRequest> {
  return catalogRequest<ServiceRequest>(`requests/${id}/start`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function supervisorReviewRequest(
  id: string,
  action: "APPROVE" | "RETURN" | "REJECT" | "ESCALATE",
  reason?: string,
): Promise<ServiceRequest> {
  return catalogRequest<ServiceRequest>(`requests/${id}/supervisor-review`, {
    method: "POST",
    body: JSON.stringify({ action, ...(reason ? { reason } : {}) }),
  });
}

export function createRequestTask(
  id: string,
  input: {
    assigneeId?: string;
    description?: string;
    dueAt?: string;
    priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
    sortOrder?: number;
    status?: "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED" | "CANCELLED";
    title: string;
  },
): Promise<ServiceRequest> {
  return catalogRequest<ServiceRequest>(`requests/${id}/tasks`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateRequestTask(
  id: string,
  taskId: string,
  input: {
    assigneeId?: string | null;
    description?: string | null;
    dueAt?: string | null;
    priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
    sortOrder?: number;
    status?: "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED" | "CANCELLED";
    title?: string;
  },
): Promise<ServiceRequest> {
  return catalogRequest<ServiceRequest>(`requests/${id}/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function createRequestOutput(
  id: string,
  input: {
    code: string;
    contentSnapshot?: Record<string, unknown>;
    description?: string;
    dueAt?: string;
    sortOrder?: number;
    title: string;
  },
): Promise<ServiceRequest> {
  return catalogRequest<ServiceRequest>(`requests/${id}/outputs`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateRequestOutput(
  id: string,
  outputId: string,
  input: {
    contentSnapshot?: Record<string, unknown> | null;
    description?: string | null;
    dueAt?: string | null;
    sortOrder?: number;
    title?: string;
  },
): Promise<ServiceRequest> {
  return catalogRequest<ServiceRequest>(`requests/${id}/outputs/${outputId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function submitRequestOutput(id: string, outputId: string): Promise<ServiceRequest> {
  return catalogRequest<ServiceRequest>(`requests/${id}/outputs/${outputId}/submit`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function reviewRequestOutput(
  id: string,
  outputId: string,
  action: "APPROVE" | "RETURN" | "REJECT",
  reason?: string,
): Promise<ServiceRequest> {
  return catalogRequest<ServiceRequest>(`requests/${id}/outputs/${outputId}/review`, {
    method: "POST",
    body: JSON.stringify({ action, ...(reason ? { reason } : {}) }),
  });
}

export function addRequestComment(
  id: string,
  body: string,
  isClientVisible: boolean,
): Promise<ServiceRequest> {
  return catalogRequest<ServiceRequest>(`requests/${id}/comments`, {
    method: "POST",
    body: JSON.stringify({ body, isClientVisible }),
  });
}

export function addInternalNote(id: string, body: string): Promise<ServiceRequest> {
  return catalogRequest<ServiceRequest>(`requests/${id}/internal-notes`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export function addAttachmentMetadata(
  id: string,
  input: {
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
    visibility: "INTERNAL" | "CLIENT_VISIBLE";
  },
): Promise<ServiceRequest> {
  return catalogRequest<ServiceRequest>(`requests/${id}/attachments`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function addClientRequestComment(id: string, body: string): Promise<ServiceRequest> {
  return catalogRequest<ServiceRequest>(`client-portal/requests/${id}/comments`, {
    method: "POST",
    body: JSON.stringify({ body, isClientVisible: true }),
  });
}
