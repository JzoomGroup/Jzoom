import type { PricingCalculation, PricingClient, PricingLine } from "./pricing-types";

export type QuoteStatus = "DRAFT" | "ISSUED" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CANCELLED";
export type QuoteInvoiceStatus = "DRAFT" | "ISSUED" | "CANCELLED" | "VOIDED";

export interface QuoteTerms {
  paymentTerms: string;
  deliveryTerms: string | null;
  additionalTerms: string | null;
  clientNotes: string | null;
  validUntil: string;
}

export interface QuoteSummary {
  id: string;
  quoteNumber: string;
  status: QuoteStatus;
  currency: string;
  issueDate: string | null;
  validUntil: string | null;
  createdAt: string;
  updatedAt: string;
  client: Pick<PricingClient, "id" | "code" | "name" | "legalName">;
  title: string;
  itemCount: number;
  totals: PricingCalculation["totals"] | null;
}

export interface QuoteItem {
  id: string;
  lineType: "MONTHLY" | "ONE_TIME";
  serviceSnapshot: PricingLine & {
    monthlyServiceRevisionId?: string;
    oneTimeServiceRevisionId?: string;
    serviceItems?: Array<{
      serviceItemRevisionId: string;
      itemCode: string;
      nameAr: string;
      nameEn: string;
      expectedOutput: string | null;
      requiresFile: boolean;
      deductHours: boolean;
      sortOrder: number;
    }>;
  };
  quantity: number;
  hours: number | null;
  unitPrice: number;
  setupFee: number;
  discount: number;
  lineTotal: number;
  internalCost: number;
  sortOrder: number;
  serviceItems: Array<{
    itemCode: string;
    nameAr: string;
    nameEn: string;
    expectedOutput: string | null;
    requiresFile: boolean;
    deductHours: boolean;
    sortOrder: number;
  }>;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  status: QuoteStatus;
  currency: string;
  issueDate: string | null;
  validUntil: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  expiredAt: string | null;
  cancelledAt: string | null;
  statusReason: string | null;
  statusChangedAt: string;
  createdAt: string;
  updatedAt: string;
  sourcePricingDraftId: string | null;
  sourceDraftVersion: number | null;
  snapshotHash: string | null;
  client: PricingClient;
  pricing: {
    calculatedAt: string;
    pricingDate: string;
    currency: string;
    lines: PricingLine[];
  };
  pricingRules: PricingCalculation["appliedRules"];
  terms: QuoteTerms;
  sourceDraft: {
    id: string;
    draftNumber: string;
    title: string;
    notes: string | null;
    pricingDate: string;
    calculationVersion: number;
    lastCalculatedAt: string | null;
    selections: unknown[];
  };
  totals: PricingCalculation["totals"];
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    status: QuoteInvoiceStatus;
    createdAt: string;
    updatedAt: string;
  }>;
  items: QuoteItem[];
}

export interface QuoteOnboardingOptions {
  quote: {
    id: string;
    quoteNumber: string;
    status: QuoteStatus;
  };
  client: {
    id: string | null;
    code: string;
    name: string;
    legalName: string | null;
    defaultPortalEmail: string;
  };
  portalUsers: Array<{
    id: string;
    email: string;
    displayName: string;
    preferredLocale: string;
    status: string;
  }>;
  specialists: Array<{
    id: string;
    email: string;
    displayName: string;
  }>;
  services: Array<{
    quoteItemId: string;
    lineType: "MONTHLY" | "ONE_TIME";
    serviceCode: string;
    nameAr: string;
    nameEn: string;
    serviceLevelLabel: string | null;
    hoursAllocated: number | null;
    monthlyServiceId: string | null;
    monthlyServiceRevisionId: string | null;
    oneTimeServiceId: string | null;
    oneTimeServiceRevisionId: string | null;
    serviceLevelId: string | null;
    existingSpecialistIds: string[];
  }>;
}

export interface QuoteOnboardingInput {
  portalUser?: {
    email: string;
    displayName: string;
    preferredLocale?: "ar" | "en";
  };
  serviceAssignments: Array<{
    quoteItemId: string;
    specialistIds: string[];
  }>;
}

export interface QuoteOnboardingResult {
  completed: boolean;
  portalUser: null | {
    id: string;
    email: string;
    displayName: string;
    created: boolean;
    temporaryPasswordAssigned: boolean;
  };
  subscription: {
    subscriptionId: string | null;
    createdServiceIds: string[];
    reusedServiceIds: string[];
  };
  assignments: Array<{
    quoteItemId: string;
    lineType: "MONTHLY" | "ONE_TIME";
    serviceCode: string;
    specialistIds: string[];
  }>;
}
