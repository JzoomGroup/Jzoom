export const ACCOUNT_MANAGER_ROLE_CODE = "ROLE-AM";
export const CLIENT_ROLE_CODE = "ROLE-CLIENT";

export const MONTHLY_REPORT_STATUSES = ["DRAFT", "PREPARED", "PUBLISHED", "ARCHIVED"] as const;

export const REPORT_EVENT = {
  accountManagerPortfolioViewed: "ACCOUNT_MANAGER_PORTFOLIO_VIEWED",
  clientMonthlyReportViewed: "CLIENT_MONTHLY_REPORT_VIEWED",
  monthlyReportPrepared: "CLIENT_MONTHLY_REPORT_PREPARED",
  monthlyReportPublished: "CLIENT_MONTHLY_REPORT_PUBLISHED",
  monthlyReportViewed: "CLIENT_MONTHLY_REPORT_INTERNAL_VIEWED",
} as const;
