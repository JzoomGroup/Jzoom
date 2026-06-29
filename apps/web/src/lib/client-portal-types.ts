export type ClientQuoteStatus = "ISSUED" | "ACCEPTED";
export type ClientInvoiceStatus = "ISSUED";

export interface ClientPortalAccount {
  user: {
    id: string;
    email: string;
    displayName: string;
    preferredLocale: string;
  };
  clients: ClientPortalClient[];
  services: ClientPortalServices;
}

export interface ClientPortalClient {
  id: string | null;
  code: string;
  name: string;
  legalName: string | null;
  sector: string | null;
  city: string | null;
  authorizedApprover: string | null;
}

export interface ClientPortalServiceCategory {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
}

export interface ClientPortalSubscribedMonthlyService {
  id: string;
  subscriptionId: string;
  clientId: string;
  client: {
    id: string;
    code: string;
    name: string;
  };
  status: string;
  startsAt: string;
  endsAt: string | null;
  hoursAllocated: number;
  service: {
    id: string;
    code: string;
    revisionId: string;
    nameAr: string;
    nameEn: string;
    serviceLine: string;
    domain: string;
    description: string;
    category: ClientPortalServiceCategory;
  };
  serviceLevel: {
    id: string;
    code: string;
    labelAr: string;
    labelEn: string | null;
  };
  serviceItems: Array<{
    id: string;
    itemId: string;
    code: string;
    nameAr: string;
    nameEn: string;
    expectedOutput: string | null;
    requiresFile: boolean;
  }>;
}

export interface ClientPortalAvailableMonthlyService {
  id: string;
  code: string;
  category: ClientPortalServiceCategory;
  revisionId: string;
  nameAr: string;
  nameEn: string;
  description: string;
  serviceLine: string;
  domain: string;
}

export interface ClientPortalAvailableOneTimeService {
  id: string;
  code: string;
  category: ClientPortalServiceCategory;
  revisionId: string;
  nameAr: string;
  nameEn: string;
  description: string;
  serviceLine: string;
}

export interface ClientPortalServices {
  subscribedMonthly: ClientPortalSubscribedMonthlyService[];
  availableMonthly: ClientPortalAvailableMonthlyService[];
  availableOneTime: ClientPortalAvailableOneTimeService[];
}

export interface ClientPortalTotals {
  subtotalMonthly: number;
  subtotalSetup: number;
  subtotalOneTime: number;
  subtotal: number;
  discountTotal: number;
  finalBeforeTax: number;
  taxTotal: number;
  finalTotal: number;
}

export interface ClientPortalTerms {
  paymentTerms: string;
  deliveryTerms: string | null;
  additionalTerms: string | null;
  clientNotes: string | null;
  validUntil: string | null;
}

export interface ClientPortalServiceSnapshot {
  serviceCode: string;
  nameAr: string;
  nameEn: string;
  serviceLevelCode?: string;
  serviceLevelLabel?: string;
  serviceLine?: string;
  quantity?: number;
  hours?: number;
  estimatedHours?: number;
  unitRate?: number;
  unitPrice?: number;
  baseAmount: number;
  setupFee: number;
  lineTotal: number;
}

export interface ClientPortalServiceItem {
  itemCode: string;
  nameAr: string;
  nameEn: string;
  expectedOutput: string | null;
  requiresFile: boolean;
  sortOrder: number;
}

export interface ClientQuoteSummary {
  id: string;
  quoteNumber: string;
  status: ClientQuoteStatus;
  currency: string;
  issueDate: string | null;
  validUntil: string | null;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
  client: ClientPortalClient;
  title: string;
  itemCount: number;
  totals: ClientPortalTotals;
}

export interface ClientQuoteItem {
  id: string;
  lineType: "MONTHLY" | "ONE_TIME";
  serviceSnapshot: ClientPortalServiceSnapshot;
  quantity: number;
  hours: number | null;
  unitPrice: number;
  setupFee: number;
  discount: number;
  lineTotal: number;
  sortOrder: number;
  serviceItems: ClientPortalServiceItem[];
}

export interface ClientQuote {
  id: string;
  quoteNumber: string;
  status: ClientQuoteStatus;
  currency: string;
  issueDate: string | null;
  validUntil: string | null;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
  snapshotHash: string | null;
  client: ClientPortalClient;
  terms: ClientPortalTerms;
  totals: ClientPortalTotals;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    status: ClientInvoiceStatus;
    createdAt: string;
    updatedAt: string;
  }>;
  items: ClientQuoteItem[];
}

export interface ClientInvoiceSummary {
  id: string;
  invoiceNumber: string;
  quoteId: string;
  quoteNumber: string;
  status: ClientInvoiceStatus;
  currency: string;
  issueDate: string | null;
  issuedAt: string | null;
  createdAt: string;
  updatedAt: string;
  client: ClientPortalClient;
  title: string;
  itemCount: number;
  totals: ClientPortalTotals;
  finalDueNoTax: number;
}

export interface ClientInvoiceItem {
  id: string;
  quoteItemId: string | null;
  itemSnapshot: {
    lineType: "MONTHLY" | "ONE_TIME";
    serviceSnapshot: ClientPortalServiceSnapshot;
    serviceItems: ClientPortalServiceItem[];
  };
  quantity: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
  sortOrder: number;
}

export interface ClientInvoice {
  id: string;
  invoiceNumber: string;
  quoteId: string;
  quoteNumber: string;
  status: ClientInvoiceStatus;
  currency: string;
  issueDate: string | null;
  issuedAt: string | null;
  createdAt: string;
  updatedAt: string;
  sourceQuoteSnapshotHash: string | null;
  snapshotHash: string | null;
  client: ClientPortalClient;
  quote: {
    id: string | null;
    quoteNumber: string | null;
    status: string | null;
    snapshotHash: string | null;
    terms: ClientPortalTerms;
    totals: ClientPortalTotals;
  };
  terms: ClientPortalTerms;
  totals: ClientPortalTotals;
  discountTotal: number;
  finalDueNoTax: number;
  items: ClientInvoiceItem[];
}
