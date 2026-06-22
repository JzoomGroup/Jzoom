"use client";

import { catalogErrorMessage, catalogRequest } from "./catalog-client";
import type { Quote, QuoteStatus, QuoteSummary } from "./quote-types";

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

export function changeQuoteStatus(
  id: string,
  status: QuoteStatus,
  reason?: string,
): Promise<Quote> {
  return quoteRequest<Quote>(`quotes/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, ...(reason ? { reason } : {}) }),
  });
}
