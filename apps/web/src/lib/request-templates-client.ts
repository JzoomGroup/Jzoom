"use client";

import { catalogErrorMessage, catalogRequest } from "./catalog-client";
import type {
  ActiveRequestTemplateResponse,
  RequestFieldLibraryItem,
  RequestTemplateAnswerInput,
  RequestTemplateVersion,
  RequestTemplatesSnapshot,
} from "./request-template-types";

export const requestTemplateErrorMessage = catalogErrorMessage;

export function refreshRequestTemplates(): Promise<RequestTemplatesSnapshot> {
  return catalogRequest<RequestTemplatesSnapshot>("admin/request-templates");
}

export function createRequestFieldLibraryItem(
  input: Partial<RequestFieldLibraryItem> & {
    code: string;
    fieldType: string;
    labelAr: string;
    labelEn: string;
  },
) {
  return catalogRequest<RequestFieldLibraryItem>("admin/request-templates/field-library", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateRequestFieldLibraryItem(id: string, input: Record<string, unknown>) {
  return catalogRequest<RequestFieldLibraryItem>(`admin/request-templates/field-library/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function applySuggestedRequestTemplate(serviceItemId: string) {
  return catalogRequest<RequestTemplatesSnapshot>(
    `admin/request-templates/service-items/${serviceItemId}/apply-suggested`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export function reviseRequestTemplate(serviceItemId: string, input: Record<string, unknown>) {
  return catalogRequest<RequestTemplatesSnapshot>(
    `admin/request-templates/service-items/${serviceItemId}/template`,
    { method: "PUT", body: JSON.stringify(input) },
  );
}

export function changeRequestTemplateVersionStatus(
  templateId: string,
  versionId: string,
  status: "ACTIVE" | "ARCHIVED",
  reason?: string,
) {
  return catalogRequest<RequestTemplatesSnapshot>(
    `admin/request-templates/templates/${templateId}/versions/${versionId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status, ...(reason ? { reason } : {}) }),
    },
  );
}

export function fetchActiveRequestTemplate(
  serviceItemRevisionId: string,
): Promise<ActiveRequestTemplateResponse> {
  return catalogRequest<ActiveRequestTemplateResponse>(
    `request-templates/service-item-revisions/${serviceItemRevisionId}/active`,
  );
}

export function answersForTemplate(
  template: RequestTemplateVersion | null,
  values: Record<string, unknown>,
): RequestTemplateAnswerInput[] {
  if (!template) return [];
  return template.fields
    .map((field) => ({ fieldCode: field.code, value: values[field.code] }))
    .filter((answer): answer is RequestTemplateAnswerInput => {
      if (answer.value === undefined || answer.value === null) return false;
      if (typeof answer.value === "string") return answer.value.trim().length > 0;
      if (Array.isArray(answer.value)) return answer.value.length > 0;
      return true;
    });
}
