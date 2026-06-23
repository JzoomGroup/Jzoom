import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type {
  AccountManagerPortfolio,
  HoursLedgerResponse,
  MonthlyReport,
  MonthlyClosing,
  MonthlyUsageResponse,
  NotificationListResponse,
} from "./operations-types";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

async function requireOperationsResponse<T>(path: string, fallbackPath = "/profile"): Promise<T> {
  const cookieStore = await cookies();
  const response = await fetch(`${apiBaseUrl}/${path}`, {
    cache: "no-store",
    headers: { cookie: cookieStore.toString() },
  }).catch(() => null);

  if (!response) {
    throw new Error("The operations API is unavailable.");
  }
  if (response.status === 401) {
    redirect("/login");
  }
  if (response.status === 403) {
    redirect("/403");
  }
  if (response.status === 404) {
    redirect(fallbackPath);
  }
  if (!response.ok) {
    throw new Error(`The operations API returned ${response.status}.`);
  }
  return (await response.json()) as T;
}

export function requireNotifications(): Promise<NotificationListResponse> {
  return requireOperationsResponse<NotificationListResponse>("notifications?readState=all");
}

export function requireMonthlyReports(): Promise<MonthlyReport[]> {
  return requireOperationsResponse<MonthlyReport[]>("reports/monthly", "/reports");
}

export function requireClientReports(): Promise<MonthlyReport[]> {
  return requireOperationsResponse<MonthlyReport[]>("client-portal/reports", "/client/reports");
}

export function requireClientReport(id: string): Promise<MonthlyReport> {
  return requireOperationsResponse<MonthlyReport>(`client-portal/reports/${id}`, "/client/reports");
}

export function requireAccountManagerPortfolio(): Promise<AccountManagerPortfolio> {
  return requireOperationsResponse<AccountManagerPortfolio>(
    "account-manager/portfolio",
    "/account-manager",
  );
}

export function requireHoursLedger(): Promise<HoursLedgerResponse> {
  return requireOperationsResponse<HoursLedgerResponse>("hours-ledger", "/hours-ledger");
}

export function requireMonthlyUsage(): Promise<MonthlyUsageResponse> {
  return requireOperationsResponse<MonthlyUsageResponse>("hours-ledger/usage", "/hours-ledger");
}

export function requireMonthlyClosings(): Promise<MonthlyClosing[]> {
  return requireOperationsResponse<MonthlyClosing[]>("hours-ledger/closings", "/hours-ledger");
}
