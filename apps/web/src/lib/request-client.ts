"use client";

import { catalogErrorMessage, catalogRequest } from "./catalog-client";
import type { RequestTemplateAnswerInput } from "./request-template-types";
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
  requestTemplateVersionId?: string;
  templateAnswers?: RequestTemplateAnswerInput[];
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

export function createClientServiceRequest(input: {
  clientId: string;
  subscriptionServiceId: string;
  serviceItemRevisionId?: string;
  requestTemplateVersionId?: string;
  templateAnswers?: RequestTemplateAnswerInput[];
  sourceQuoteId?: string;
  sourceInvoiceId?: string;
  title: string;
  description: string;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  dueAt?: string;
}): Promise<ServiceRequest> {
  return catalogRequest<ServiceRequest>("client-portal/requests", {
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
    status?:
      | "PENDING"
      | "TODO"
      | "IN_PROGRESS"
      | "DONE"
      | "NOT_APPLICABLE"
      | "BLOCKED"
      | "CANCELLED";
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
    status?:
      | "PENDING"
      | "TODO"
      | "IN_PROGRESS"
      | "DONE"
      | "NOT_APPLICABLE"
      | "BLOCKED"
      | "CANCELLED";
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

export function shareRequestOutput(
  id: string,
  outputId: string,
  reason?: string,
): Promise<ServiceRequest> {
  return catalogRequest<ServiceRequest>(`requests/${id}/outputs/${outputId}/share`, {
    method: "POST",
    body: JSON.stringify({ ...(reason ? { reason } : {}) }),
  });
}

export function closeRequestOutput(
  id: string,
  outputId: string,
  reason?: string,
): Promise<ServiceRequest> {
  return catalogRequest<ServiceRequest>(`requests/${id}/outputs/${outputId}/close`, {
    method: "POST",
    body: JSON.stringify({ ...(reason ? { reason } : {}) }),
  });
}

export function requestClientDocument(
  id: string,
  input: {
    dueAt?: string;
    instructions?: string;
    title: string;
  },
): Promise<ServiceRequest> {
  return catalogRequest<ServiceRequest>(`requests/${id}/document-requests`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function changeClientDocumentRequestStatus(
  id: string,
  documentRequestId: string,
  status: "CANCELLED" | "CLOSED",
  reason?: string,
): Promise<ServiceRequest> {
  return catalogRequest<ServiceRequest>(
    `requests/${id}/document-requests/${documentRequestId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status, ...(reason ? { reason } : {}) }),
    },
  );
}

export function createRequestTimeEntry(
  id: string,
  input: {
    billable?: boolean;
    hours: number;
    notes?: string;
    workDate: string;
  },
): Promise<ServiceRequest> {
  return catalogRequest<ServiceRequest>(`requests/${id}/time-entries`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateRequestTimeEntry(
  id: string,
  timeEntryId: string,
  input: {
    billable?: boolean;
    hours?: number;
    notes?: string | null;
    status?: "DRAFT" | "SUBMITTED";
    workDate?: string;
  },
): Promise<ServiceRequest> {
  return catalogRequest<ServiceRequest>(`requests/${id}/time-entries/${timeEntryId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function submitRequestTimeEntry(id: string, timeEntryId: string): Promise<ServiceRequest> {
  return catalogRequest<ServiceRequest>(`requests/${id}/time-entries/${timeEntryId}/submit`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function reviewRequestTimeEntry(
  id: string,
  timeEntryId: string,
  action: "APPROVE" | "REJECT",
  reason?: string,
): Promise<ServiceRequest> {
  return catalogRequest<ServiceRequest>(`requests/${id}/time-entries/${timeEntryId}/review`, {
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

export function uploadRequestAttachment(
  id: string,
  file: File,
  visibility: "INTERNAL" | "CLIENT_VISIBLE",
): Promise<ServiceRequest> {
  const body = new FormData();
  body.set("file", file);
  body.set("visibility", visibility);
  return catalogRequest<ServiceRequest>(`requests/${id}/attachments/upload`, {
    method: "POST",
    body,
  });
}

export function addClientRequestComment(id: string, body: string): Promise<ServiceRequest> {
  return catalogRequest<ServiceRequest>(`client-portal/requests/${id}/comments`, {
    method: "POST",
    body: JSON.stringify({ body, isClientVisible: true }),
  });
}

export function acceptClientRequestOutput(id: string, outputId: string): Promise<ServiceRequest> {
  return catalogRequest<ServiceRequest>(`client-portal/requests/${id}/outputs/${outputId}/accept`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function returnClientRequestOutput(
  id: string,
  outputId: string,
  reason: string,
): Promise<ServiceRequest> {
  return catalogRequest<ServiceRequest>(`client-portal/requests/${id}/outputs/${outputId}/return`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export function uploadClientRequestedDocument(
  id: string,
  documentRequestId: string,
  file: File | null,
  input: {
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
  },
): Promise<ServiceRequest> {
  if (file) {
    const body = new FormData();
    body.set("file", file);
    return catalogRequest<ServiceRequest>(
      `client-portal/requests/${id}/document-requests/${documentRequestId}/upload`,
      {
        method: "POST",
        body,
      },
    );
  }

  return catalogRequest<ServiceRequest>(
    `client-portal/requests/${id}/document-requests/${documentRequestId}/upload`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}
