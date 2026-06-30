export const MANAGE_QUOTES_PERMISSION = "PERM-MANAGE-QUOTES";
export const ACCOUNT_MANAGER_ROLE_CODE = "ROLE-AM";

export const QUOTE_PUBLIC_STATUSES = [
  "DRAFT",
  "ISSUED",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
] as const;

export const QUOTE_EVENT = {
  accepted: "QUOTE_ACCEPTED",
  cancelled: "QUOTE_CANCELLED",
  clientOnboardingCompleted: "QUOTE_CLIENT_ONBOARDING_COMPLETED",
  created: "QUOTE_CREATED",
  expired: "QUOTE_EXPIRED",
  pdfGenerated: "QUOTE_PDF_GENERATED",
  rejected: "QUOTE_REJECTED",
  statusChanged: "QUOTE_STATUS_CHANGED",
} as const;
