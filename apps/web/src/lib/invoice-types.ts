import type { PricingCalculation, PricingClient } from "./pricing-types";

export type InvoiceStatus = "DRAFT" | "ISSUED" | "CANCELLED" | "VOIDED";

export interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  quoteId: string;
  quoteNumber: string;
  status: InvoiceStatus;
  currency: string;
  issueDate: string | null;
  issuedAt: string | null;
  cancelledAt: string | null;
  voidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  client: Pick<PricingClient, "id" | "code" | "name" | "legalName">;
  title: string;
  itemCount: number;
  totals: PricingCalculation["totals"] | null;
  finalDueNoTax: number;
}

export interface InvoiceItem {
  id: string;
  quoteItemId: string | null;
  itemSnapshot: {
    lineType: "MONTHLY" | "ONE_TIME";
    serviceSnapshot: {
      serviceCode: string;
      nameAr: string;
      nameEn: string;
      serviceLevelLabel?: string;
      baseAmount?: number;
      setupFee?: number;
      lineTotal: number;
    };
    serviceItems?: Array<{
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
  unitPrice: number;
  discount: number;
  lineTotal: number;
  sortOrder: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  quoteId: string;
  quoteNumber: string;
  status: InvoiceStatus;
  currency: string;
  issueDate: string | null;
  issuedAt: string | null;
  cancelledAt: string | null;
  voidedAt: string | null;
  statusReason: string | null;
  statusChangedAt: string;
  createdAt: string;
  updatedAt: string;
  sourceQuoteSnapshotHash: string | null;
  snapshotHash: string | null;
  client: PricingClient;
  quote: {
    id: string;
    quoteNumber: string;
    status: string;
    snapshotHash: string | null;
    client: PricingClient;
    terms: unknown;
    totals: PricingCalculation["totals"];
    items: unknown[];
  };
  pricing: unknown;
  pricingRules: PricingCalculation["appliedRules"] | null;
  terms: unknown;
  totals: PricingCalculation["totals"] | null;
  discountTotal: number;
  finalDueNoTax: number;
  items: InvoiceItem[];
}
