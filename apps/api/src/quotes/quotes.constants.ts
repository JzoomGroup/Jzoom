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
  created: "QUOTE_CREATED",
  statusChanged: "QUOTE_STATUS_CHANGED",
} as const;
