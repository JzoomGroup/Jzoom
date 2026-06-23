export interface AppNotification {
  id: string;
  event: string;
  targetType: string;
  targetId: string;
  messageAr: string | null;
  messageEn: string | null;
  deepLink: string;
  status: string;
  readAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  unreadCount: number;
  notifications: AppNotification[];
}

export interface MonthlyReport {
  id: string;
  client: {
    id: string;
    code: string;
    name: string;
    sector: string;
    city: string | null;
  };
  periodStart: string;
  periodEnd: string;
  period: string;
  status: "DRAFT" | "PREPARED" | "PUBLISHED" | "ARCHIVED";
  title: string;
  summary: {
    requests?: { total: number; byStatus: Record<string, number> };
    outputs?: { total: number; byStatus: Record<string, number> };
    documentRequests?: { total: number; byStatus: Record<string, number> };
    hours?: {
      entries: number;
      byStatus: Record<string, { count: number; hours: number }>;
      total: number;
    };
    recentClientSafeActivity?: Array<{
      id: string;
      reason: string | null;
      metadata: unknown;
      occurredAt: string;
      request: {
        id: string;
        requestNumber: string;
        title: string;
        status: string;
      } | null;
    }>;
  };
  preparedBy: { id: string; email: string; displayName: string } | null;
  preparedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccountManagerPortfolio {
  generatedAt: string;
  portfolio: Array<{
    client: {
      id: string;
      code: string;
      name: string;
      sector: string;
      city: string | null;
    };
    accountManagers: Array<{ id: string; email: string; displayName: string }>;
    indicators: {
      openRequests: number;
      overdueRequests: number;
      waitingClientRequests: number;
      returnedOutputs: number;
      overdueDocumentRequests: number;
      approvedHoursThisMonth: number;
    };
    health: {
      code: "ATTENTION" | "WATCH" | "HEALTHY";
      label: string;
      reason: string;
    };
    recentActivity: Array<{
      id: string;
      actorRole: string;
      reason: string | null;
      metadata: unknown;
      occurredAt: string;
      request: {
        id: string;
        requestNumber: string;
        title: string;
        status: string;
      } | null;
    }>;
  }>;
}
