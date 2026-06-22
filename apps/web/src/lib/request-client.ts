"use client";

import { catalogErrorMessage, catalogRequest } from "./catalog-client";
import type { RequestStatus, ServiceRequest } from "./request-types";

export const requestErrorMessage = catalogErrorMessage;

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
