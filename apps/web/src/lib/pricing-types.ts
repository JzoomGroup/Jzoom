import type { CatalogStatus } from "./catalog-types";

export type PricingRuleType = "RATE_CARD" | "SETUP_FEE" | "MARGIN" | "DISCOUNT" | "TAX" | "FORMULA";
export type PricingCalculationMethod = "NONE" | "FIXED_AMOUNT" | "PERCENTAGE";
export type PricingTargetType = "ALL" | "MONTHLY" | "ONE_TIME";

export interface PricingRuleRevision {
  id: string;
  version: number;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  effectiveFrom: string | null;
  effectiveTo: string | null;
  formulaOrRule: string;
  appliesTo: string;
  implementationOwner: string | null;
  visibility: string | null;
  ruleType: PricingRuleType;
  calculationMethod: PricingCalculationMethod;
  value: number | null;
  currency: string;
  targetType: PricingTargetType;
  targetCode: string | null;
  priority: number;
  isStackable: boolean;
  isEnabled: boolean;
  conditions: unknown;
}

export interface PricingRule {
  id: string;
  code: string;
  name: string;
  status: CatalogStatus;
  sortOrder: number;
  archivedAt: string | null;
  revisions: PricingRuleRevision[];
  revision: PricingRuleRevision | null;
}

export interface PricingRulesSnapshot {
  ruleTypes: PricingRuleType[];
  calculationMethods: PricingCalculationMethod[];
  targetTypes: PricingTargetType[];
  rules: PricingRule[];
}

export interface PricingClient {
  id: string;
  code: string;
  name: string;
  legalName: string | null;
  sector: string;
  city: string | null;
  authorizedApprover: string;
}

export interface PricingMonthlyService {
  id: string;
  code: string;
  categoryName: string;
  revision: {
    id: string;
    version: number;
    nameAr: string;
    nameEn: string;
    description: string;
    sellingHourlyRateSar: number;
    setupFeePct: number;
    levels: Array<{
      id: string;
      code: string;
      labelAr: string;
      labelEn: string | null;
      hours: number;
    }>;
  };
}

export interface PricingOneTimeService {
  id: string;
  code: string;
  serviceLine: string;
  categoryName: string;
  revision: {
    id: string;
    version: number;
    nameAr: string;
    nameEn: string;
    description: string;
    basePriceSar: number;
    estimatedHours: number;
    durationDays: number;
  };
}

export interface PricingStudioCatalog {
  clients: PricingClient[];
  monthlyServices: PricingMonthlyService[];
  oneTimeServices: PricingOneTimeService[];
}

export interface MonthlyPricingSelection {
  monthlyServiceRevisionId: string;
  serviceLevelId: string;
  quantity: number;
}

export interface OneTimePricingSelection {
  oneTimeServiceRevisionId: string;
  quantity: number;
}

export interface PricingInput {
  clientId: string;
  title: string;
  notes?: string;
  pricingDate: string;
  currency: string;
  monthlySelections: MonthlyPricingSelection[];
  oneTimeSelections: OneTimePricingSelection[];
}

export interface PricingLine {
  sortOrder: number;
  lineType: "MONTHLY" | "ONE_TIME";
  serviceCode: string;
  nameAr: string;
  nameEn: string;
  quantity: number;
  baseAmount: number;
  setupFee: number;
  lineTotal: number;
  internalCost: number;
  serviceLevelCode?: string;
  serviceLevelLabel?: string;
  hours?: number;
  unitRate?: number;
  serviceLine?: string;
  estimatedHours?: number;
  unitPrice?: number;
}

export interface PricingCalculation {
  calculatedAt: string;
  pricingDate: string;
  currency: string;
  lines: PricingLine[];
  appliedRules: Array<{
    code: string;
    name: string;
    version: number;
    ruleType: PricingRuleType;
    calculationMethod: PricingCalculationMethod;
    value: number | null;
  }>;
  totals: {
    subtotalMonthly: number;
    subtotalSetup: number;
    subtotalOneTime: number;
    subtotal: number;
    discountTotal: number;
    finalBeforeTax: number;
    taxTotal: number;
    finalTotal: number;
    internalCost: number;
    marginAmount: number;
    marginPct: number;
    targetMarginPct: number | null;
    meetsTargetMargin: boolean | null;
  };
}

export interface PricingPreview {
  client: PricingClient;
  calculation: PricingCalculation;
}

export interface PricingDraftSummary {
  id: string;
  draftNumber: string;
  title: string;
  status: CatalogStatus;
  currency: string;
  pricingDate: string;
  calculationVersion: number;
  lastCalculatedAt: string | null;
  updatedAt: string;
  client: Pick<PricingClient, "id" | "code" | "name">;
  itemCount: number;
  totals: PricingCalculation["totals"] | null;
}

export interface PricingDraft {
  id: string;
  draftNumber: string;
  clientId: string;
  client: Pick<PricingClient, "id" | "code" | "name">;
  title: string;
  notes: string | null;
  status: CatalogStatus;
  currency: string;
  pricingDate: string;
  calculationVersion: number;
  lastCalculatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  monthlySelections: MonthlyPricingSelection[];
  oneTimeSelections: OneTimePricingSelection[];
  calculation: PricingCalculation | null;
}
