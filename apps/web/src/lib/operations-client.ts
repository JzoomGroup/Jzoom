"use client";

import { catalogErrorMessage, catalogRequest } from "./catalog-client";
import type {
  AppNotification,
  HoursLedgerResponse,
  MonthlyClosing,
  MonthlyReport,
  MonthlyUsageResponse,
} from "./operations-types";

export const operationsErrorMessage = catalogErrorMessage;

export function markNotificationRead(id: string): Promise<AppNotification> {
  return catalogRequest<AppNotification>(`notifications/${id}/read`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function markAllNotificationsRead(): Promise<{ markedRead: number }> {
  return catalogRequest<{ markedRead: number }>("notifications/read-all", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function prepareMonthlyReport(input: {
  clientId: string;
  period: string;
  title?: string;
}): Promise<MonthlyReport> {
  return catalogRequest<MonthlyReport>("reports/monthly/prepare", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function publishMonthlyReport(id: string): Promise<MonthlyReport> {
  return catalogRequest<MonthlyReport>(`reports/monthly/${id}/publish`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

function queryString(input: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value) {
      params.set(key, value);
    }
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

export function fetchHoursLedger(input: {
  clientId?: string;
  period?: string;
}): Promise<HoursLedgerResponse> {
  return catalogRequest<HoursLedgerResponse>(
    `hours-ledger${queryString({ clientId: input.clientId, period: input.period })}`,
  );
}

export function fetchMonthlyUsage(input: {
  clientId?: string;
  period?: string;
}): Promise<MonthlyUsageResponse> {
  return catalogRequest<MonthlyUsageResponse>(
    `hours-ledger/usage${queryString({ clientId: input.clientId, period: input.period })}`,
  );
}

export function fetchMonthlyClosings(input: {
  clientId?: string;
  period?: string;
}): Promise<MonthlyClosing[]> {
  return catalogRequest<MonthlyClosing[]>(
    `hours-ledger/closings${queryString({ clientId: input.clientId, period: input.period })}`,
  );
}

export function prepareMonthlyClosing(input: {
  clientId: string;
  period: string;
  title?: string;
}): Promise<MonthlyClosing> {
  return catalogRequest<MonthlyClosing>("hours-ledger/closings/prepare", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function finalizeMonthlyClosing(id: string): Promise<MonthlyClosing> {
  return catalogRequest<MonthlyClosing>(`hours-ledger/closings/${id}/finalize`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}
