export type CatalogStatus = "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";

export interface CatalogCategory {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  description: string | null;
  status: CatalogStatus;
  sortOrder: number;
  serviceCount: number;
  archivedAt: string | null;
}

export interface ServiceLevel {
  id: string;
  code: string;
  labelAr: string;
  labelEn: string | null;
  purpose: string | null;
  slaRule: string | null;
  scopeRule: string | null;
  governanceRule: string | null;
  isCustom: boolean;
  status: CatalogStatus;
  sortOrder: number;
  archivedAt: string | null;
}

export interface ServiceLevelConfig {
  serviceLevelId: string;
  serviceLevelCode: string;
  serviceLevelLabelAr: string;
  serviceLevelLabelEn: string | null;
  hours: number;
  slaHours: number | null;
  isEnabled: boolean;
  sortOrder: number;
}

export interface MonthlyService {
  id: string;
  categoryId: string;
  category: {
    id: string;
    code: string;
    nameAr: string;
    nameEn: string;
  };
  code: string;
  externalId: string | null;
  status: CatalogStatus;
  sortOrder: number;
  archivedAt: string | null;
  itemCount: number;
  revision: {
    id: string;
    version: number;
    status: "DRAFT" | "ACTIVE" | "ARCHIVED";
    nameAr: string;
    nameEn: string;
    description: string;
    visibleInPricing: boolean;
    sellingHourlyRateSar: number;
    internalHourlyCostSar: number;
    setupFeePct: number;
    defaultSlaHours: number;
    deductHours: boolean;
    requiresSupervisor: boolean;
    requiresManagement: boolean;
    clientApprovalRequired: boolean;
    effectiveFrom: string | null;
    effectiveTo: string | null;
    levelConfigs: ServiceLevelConfig[];
  } | null;
}

export interface ServiceItemInclusion {
  serviceLevelId: string;
  serviceLevelCode: string;
  serviceLevelLabelAr: string;
  serviceLevelLabelEn: string | null;
  included: boolean;
  sortOrder: number;
}

export interface ServiceItem {
  id: string;
  code: string;
  monthlyServiceId: string;
  monthlyService: {
    id: string;
    code: string;
    status: CatalogStatus;
    nameAr: string;
    nameEn: string;
  };
  status: CatalogStatus;
  sortOrder: number;
  archivedAt: string | null;
  revision: {
    id: string;
    version: number;
    status: "DRAFT" | "ACTIVE" | "ARCHIVED";
    nameAr: string;
    nameEn: string;
    expectedOutput: string | null;
    visibleInQuote: boolean;
    requiresFile: boolean;
    deductHours: boolean;
    requestType: string | null;
    effectiveFrom: string | null;
    effectiveTo: string | null;
    levelInclusions: ServiceItemInclusion[];
  } | null;
}

export interface CatalogSnapshot {
  categories: CatalogCategory[];
  levels: ServiceLevel[];
  services: MonthlyService[];
  items: ServiceItem[];
}

export type CatalogSection = "overview" | "categories" | "services" | "items" | "levels";

export interface ApiErrorBody {
  statusCode?: number;
  code?: string;
  message?: string;
  fieldErrors?: Array<{ field: string; message: string }>;
  requestId?: string;
}
