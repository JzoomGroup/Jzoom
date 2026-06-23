"use client";

import { catalogErrorMessage, catalogRequest } from "./catalog-client";
import type { AppNotification, MonthlyReport } from "./operations-types";

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
