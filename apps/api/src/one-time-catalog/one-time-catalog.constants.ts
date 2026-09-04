export const MANAGE_ONE_TIME_SERVICES_PERMISSION = "PERM-MANAGE-ONE-TIME-SERVICES";

export const ONE_TIME_SERVICE_PATHS = ["Build", "Digital"] as const;

export const ONE_TIME_SERVICE_COMPATIBILITY_CATEGORY = {
  code: "JZOOM-INTERNAL-ONE-TIME",
  nameAr: "خدمات مرة واحدة",
  nameEn: "One-time services",
} as const;

export const ONE_TIME_CATALOG_EVENT = {
  serviceCreated: "CATALOG_ONE_TIME_SERVICE_CREATED",
  serviceUpdated: "CATALOG_ONE_TIME_SERVICE_UPDATED",
  serviceStatusChanged: "CATALOG_ONE_TIME_SERVICE_STATUS_CHANGED",
  serviceReordered: "CATALOG_ONE_TIME_SERVICE_REORDERED",
  servicesImported: "CATALOG_ONE_TIME_SERVICES_IMPORTED",
  pricingChanged: "CATALOG_ONE_TIME_PRICING_CHANGED",
  durationChanged: "CATALOG_ONE_TIME_DURATION_CHANGED",
  phasesChanged: "CATALOG_ONE_TIME_PHASES_CHANGED",
  deliverablesChanged: "CATALOG_ONE_TIME_DELIVERABLES_CHANGED",
  tasksChanged: "CATALOG_ONE_TIME_TASKS_CHANGED",
} as const;
