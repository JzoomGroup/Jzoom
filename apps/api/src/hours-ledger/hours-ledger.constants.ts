import { ADMIN_ROLE_CODE, MANAGEMENT_ROLE_CODE } from "../auth/auth.constants.js";
import { ACCOUNT_MANAGER_ROLE_CODE } from "../reports/reports.constants.js";
import { SPECIALIST_ROLE_CODE, SUPERVISOR_ROLE_CODE } from "../requests/requests.constants.js";

export const LEDGER_TRACKED_TIME_ENTRY_STATUSES = ["SUBMITTED", "APPROVED", "REJECTED"] as const;

export const MONTHLY_CLOSING_STATUSES = ["DRAFT", "FINALIZED", "ARCHIVED"] as const;

export const HOURS_LEDGER_VIEW_ROLES = [
  ADMIN_ROLE_CODE,
  MANAGEMENT_ROLE_CODE,
  ACCOUNT_MANAGER_ROLE_CODE,
  SUPERVISOR_ROLE_CODE,
  SPECIALIST_ROLE_CODE,
] as const;

export const HOURS_LEDGER_CLOSING_ROLES = [
  ADMIN_ROLE_CODE,
  MANAGEMENT_ROLE_CODE,
  ACCOUNT_MANAGER_ROLE_CODE,
] as const;

export const HOURS_LEDGER_EVENT = {
  closingFinalized: "MONTHLY_CLOSING_FINALIZED",
  closingPrepared: "MONTHLY_CLOSING_DRAFT_PREPARED",
  closingViewed: "MONTHLY_CLOSING_VIEWED",
  ledgerViewed: "HOURS_LEDGER_VIEWED",
  usageSummaryViewed: "HOURS_LEDGER_USAGE_SUMMARY_VIEWED",
} as const;
