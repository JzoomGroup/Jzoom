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
