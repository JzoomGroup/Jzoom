"use client";

import { catalogErrorMessage, catalogRequest } from "./catalog-client";
import type { Invoice, InvoiceStatus, InvoiceSummary } from "./invoice-types";

const lifecyclePaths = {
  CANCELLED: "cancel",
  ISSUED: "issue",
  VOIDED: "void",
} satisfies Partial<Record<InvoiceStatus, string>>;

export const invoiceRequest = catalogRequest;
export const invoiceErrorMessage = catalogErrorMessage;

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

export function invoicePdfUrl(id: string): string {
  return `${apiBaseUrl}/invoices/${encodeURIComponent(id)}/pdf`;
}

export function refreshInvoices(): Promise<InvoiceSummary[]> {
  return invoiceRequest<InvoiceSummary[]>("invoices");
}

export function createInvoice(input: { quoteId: string }): Promise<Invoice> {
  return invoiceRequest<Invoice>("invoices", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function changeInvoiceStatus(
  id: string,
  status: InvoiceStatus,
  note?: string,
): Promise<Invoice> {
  return invoiceRequest<Invoice>(`invoices/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, ...(note ? { reason: note } : {}) }),
  });
}

export function advanceInvoiceLifecycle(
  id: string,
  status: Exclude<InvoiceStatus, "DRAFT">,
  note?: string,
): Promise<Invoice> {
  const path = lifecyclePaths[status];
  if (!path) {
    throw new Error(`Unsupported invoice lifecycle status ${status}.`);
  }
  return invoiceRequest<Invoice>(`invoices/${id}/${path}`, {
    method: "POST",
    body: JSON.stringify(note ? { note } : {}),
  });
}

export function issueInvoice(id: string, note?: string): Promise<Invoice> {
  return advanceInvoiceLifecycle(id, "ISSUED", note);
}

export function cancelInvoice(id: string, note?: string): Promise<Invoice> {
  return advanceInvoiceLifecycle(id, "CANCELLED", note);
}

export function voidInvoice(id: string, note?: string): Promise<Invoice> {
  return advanceInvoiceLifecycle(id, "VOIDED", note);
}
