"use client";

import { catalogErrorMessage, catalogRequest } from "./catalog-client";
import type {
  PricingDraft,
  PricingDraftSummary,
  PricingInput,
  PricingPreview,
  PricingRulesSnapshot,
  PricingStudioCatalog,
} from "./pricing-types";

export const pricingRequest = catalogRequest;
export const pricingErrorMessage = catalogErrorMessage;

export function refreshPricingRules(): Promise<PricingRulesSnapshot> {
  return pricingRequest<PricingRulesSnapshot>("admin/pricing-rules");
}

export function refreshPricingCatalog(): Promise<PricingStudioCatalog> {
  return pricingRequest<PricingStudioCatalog>("pricing/catalog");
}

export function refreshPricingDrafts(): Promise<PricingDraftSummary[]> {
  return pricingRequest<PricingDraftSummary[]>("pricing/drafts");
}

export function fetchPricingDraft(id: string): Promise<PricingDraft> {
  return pricingRequest<PricingDraft>(`pricing/drafts/${id}`);
}

export function previewPricing(input: PricingInput): Promise<PricingPreview> {
  return pricingRequest<PricingPreview>("pricing/preview", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
