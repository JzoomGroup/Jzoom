import type { CatalogStatus } from "./catalog-types";

export interface OneTimeCategory {
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

export interface OneTimeTask {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  description: string | null;
  estimatedHours: number;
  sortOrder: number;
  isRequired: boolean;
  status: CatalogStatus;
}

export interface OneTimePhase {
  id: string;
  code: string;
  nameAr: string | null;
  nameEn: string;
  description: string | null;
  sortOrder: number;
  isRequired: boolean;
  status: CatalogStatus;
}

export interface OneTimeDeliverable {
  id: string;
  phaseId: string | null;
  phaseCode: string | null;
  code: string;
  nameAr: string | null;
  nameEn: string;
  description: string | null;
  sortOrder: number;
  isRequired: boolean;
  requiresClientApproval: boolean;
  status: CatalogStatus;
  tasks: OneTimeTask[];
}

export interface OneTimeService {
  id: string;
  categoryId: string;
  category: {
    id: string;
    code: string;
    nameAr: string;
    nameEn: string;
  };
  code: string;
  serviceLine: string;
  status: CatalogStatus;
  sortOrder: number;
  archivedAt: string | null;
  revision: {
    id: string;
    version: number;
    status: "DRAFT" | "ACTIVE" | "ARCHIVED";
    effectiveFrom: string | null;
    effectiveTo: string | null;
    nameAr: string;
    nameEn: string;
    description: string;
    basePriceSar: number;
    estimatedHours: number;
    internalHourlyCostSar: number;
    durationDays: number;
    visibleInPricing: boolean;
    createsProject: boolean;
    phases: OneTimePhase[];
    deliverables: OneTimeDeliverable[];
  } | null;
}

export interface OneTimeCatalogSnapshot {
  servicePaths: string[];
  categories: OneTimeCategory[];
  services: OneTimeService[];
}
