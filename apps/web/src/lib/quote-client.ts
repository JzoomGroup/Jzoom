"use client";

import { catalogErrorMessage, catalogRequest } from "./catalog-client";
import type { Quote, QuoteStatus, QuoteSummary } from "./quote-types";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";
const lifecyclePaths = {
  ACCEPTED: "accept",
  CANCELLED: "cancel",
  EXPIRED: "expire",
  REJECTED: "reject",
} satisfies Partial<Record<QuoteStatus, string>>;

export const quoteRequest = catalogRequest;
export const quoteErrorMessage = catalogErrorMessage;

export function refreshQuotes(): Promise<QuoteSummary[]> {
  return quoteRequest<QuoteSummary[]>("quotes");
}

export function createQuote(input: {
  pricingDraftId: string;
  validityDays?: number;
  validUntil?: string;
  terms: {
    paymentTerms: string;
    deliveryTerms?: string;
    additionalTerms?: string;
    clientNotes?: string;
  };
}): Promise<Quote> {
  return quoteRequest<Quote>("quotes", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function changeQuoteStatus(id: string, status: QuoteStatus, note?: string): Promise<Quote> {
  return quoteRequest<Quote>(`quotes/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, ...(note ? { reason: note } : {}) }),
  });
}

export function quotePdfUrl(id: string): string {
  return `${apiBaseUrl}/quotes/${encodeURIComponent(id)}/pdf`;
}

export function advanceQuoteLifecycle(
  id: string,
  status: Exclude<QuoteStatus, "DRAFT">,
  note?: string,
): Promise<Quote> {
  if (status === "ISSUED") {
    return changeQuoteStatus(id, status, note);
  }
  const path = lifecyclePaths[status];
  if (!path) {
    throw new Error(`Unsupported quote lifecycle status ${status}.`);
  }
  return quoteRequest<Quote>(`quotes/${id}/${path}`, {
    method: "POST",
    body: JSON.stringify(note ? { note } : {}),
  });
}

export function acceptQuote(id: string, note?: string): Promise<Quote> {
  return advanceQuoteLifecycle(id, "ACCEPTED", note);
}

export function rejectQuote(id: string, note?: string): Promise<Quote> {
  return advanceQuoteLifecycle(id, "REJECTED", note);
}

export function expireQuote(id: string, note?: string): Promise<Quote> {
  return advanceQuoteLifecycle(id, "EXPIRED", note);
}

export function cancelQuote(id: string, note?: string): Promise<Quote> {
  return advanceQuoteLifecycle(id, "CANCELLED", note);
}
