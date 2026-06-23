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
      approvedTotal?: number;
      billableHours?: number;
      nonBillableHours?: number;
      source?: "LIVE_TIME_ENTRIES" | "FINALIZED_CLOSING";
    };
    monthlyClosing?: {
      id: string;
      title: string;
      status: string;
      source: "FINALIZED_CLOSING";
      preparedAt: string | null;
      finalizedAt: string | null;
    } | null;
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

export interface HoursBucket {
  approvedHours: number;
  billableHours: number;
  entries: number;
  hours: number;
  nonBillableHours: number;
  rejectedHours: number;
  submittedHours: number;
}

export interface HoursLedgerEntry {
  id: string;
  workDate: string;
  hours: number;
  billable: boolean;
  deductHours: boolean;
  status: "SUBMITTED" | "APPROVED" | "REJECTED";
  notes: string | null;
  submittedAt: string | null;
  decidedAt: string | null;
  decisionReason: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; email: string; displayName: string };
  decidedBy: { id: string; email: string; displayName: string } | null;
  client: {
    id: string;
    code: string;
    name: string;
    sector: string;
    city: string | null;
  };
  request: {
    id: string;
    requestNumber: string;
    title: string;
    status: string;
    priority: string;
  };
  service: {
    subscriptionServiceId: string;
    hoursAllocated: number;
    monthlyService: {
      id: string;
      code: string;
      revisionId: string;
      nameAr: string;
      nameEn: string;
    };
    serviceLevel: { id: string; code: string; labelAr: string; labelEn: string | null };
    serviceItem: {
      id: string;
      code: string;
      revisionId: string;
      nameAr: string;
      nameEn: string;
    } | null;
  };
}

export interface HoursLedgerResponse {
  generatedAt: string;
  period: { start: string; end: string; key: string };
  totals: HoursBucket;
  byStatus: Record<string, HoursBucket>;
  byBillable: Record<string, HoursBucket>;
  byClient: Array<
    HoursBucket & {
      city: string | null;
      code: string;
      id: string;
      name: string;
      sector: string;
    }
  >;
  byRequest: Array<
    HoursBucket & {
      clientId: string;
      id: string;
      requestNumber: string;
      status: string;
      title: string;
    }
  >;
  byService: Array<
    HoursBucket & {
      code: string;
      id: string;
      label: string;
      serviceLevelCode: string;
    }
  >;
  byUser: Array<HoursBucket & { displayName: string; email: string; id: string }>;
  byMonth: Array<HoursBucket & { month: string }>;
  entries: HoursLedgerEntry[];
}

export interface MonthlyUsageResponse {
  generatedAt: string;
  period: { start: string; end: string; key: string };
  totals: HoursBucket;
  clients: HoursLedgerResponse["byClient"];
}

export interface MonthlyClosing {
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
  status: "DRAFT" | "FINALIZED" | "ARCHIVED";
  title: string;
  summary: {
    totals?: HoursBucket;
    byStatus?: Record<string, HoursBucket>;
    byBillable?: Record<string, HoursBucket>;
  };
  preparedBy: { id: string; email: string; displayName: string } | null;
  finalizedBy: { id: string; email: string; displayName: string } | null;
  preparedAt: string | null;
  finalizedAt: string | null;
  archivedAt: string | null;
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
