import { render, screen } from "@testing-library/react";
import { AccountManagerPortfolio } from "./account-manager-portfolio";
import { ClientReportDetail, ClientReportList } from "./client-reports";
import { HoursLedger } from "./hours-ledger";
import { MonthlyReports } from "./monthly-reports";
import { NotificationInbox } from "./notification-inbox";
import type {
  AccountManagerPortfolio as Portfolio,
  HoursLedgerResponse,
  MonthlyClosing,
  MonthlyUsageResponse,
  MonthlyReport,
  NotificationListResponse,
} from "../../lib/operations-types";

function report(status: MonthlyReport["status"] = "PUBLISHED"): MonthlyReport {
  return {
    id: "report-1",
    client: {
      id: "client-1",
      code: "CLIENT-1",
      name: "Client One",
      sector: "Technology",
      city: "Riyadh",
    },
    periodStart: "2026-06-01T00:00:00.000Z",
    periodEnd: "2026-07-01T00:00:00.000Z",
    period: "2026-06",
    status,
    title: "June service report",
    summary: {
      requests: { total: 3, byStatus: { IN_PROGRESS: 2, CLOSED: 1 } },
      outputs: { total: 2, byStatus: { SHARED_WITH_CLIENT: 1, ACCEPTED_BY_CLIENT: 1 } },
      documentRequests: { total: 1, byStatus: { UPLOADED: 1 } },
      hours: {
        entries: 2,
        total: 4.5,
        byStatus: { APPROVED: { count: 2, hours: 4.5 } },
      },
      recentClientSafeActivity: [
        {
          id: "activity-1",
          reason: "Output shared with client",
          metadata: { eventCode: "REQUEST_OUTPUT_SHARED_WITH_CLIENT" },
          occurredAt: "2026-06-15T12:00:00.000Z",
          request: {
            id: "request-1",
            requestNumber: "REQ-1",
            title: "Monthly request",
            status: "WAITING_CLIENT",
          },
        },
      ],
    },
    preparedBy: { id: "am-1", email: "am@example.com", displayName: "Account Manager" },
    preparedAt: "2026-06-20T00:00:00.000Z",
    publishedAt: "2026-06-21T00:00:00.000Z",
    createdAt: "2026-06-20T00:00:00.000Z",
    updatedAt: "2026-06-21T00:00:00.000Z",
  };
}

function notifications(): NotificationListResponse {
  return {
    unreadCount: 1,
    notifications: [
      {
        id: "notification-1",
        event: "REQUEST_OUTPUT_SHARED_WITH_CLIENT",
        targetType: "Request",
        targetId: "request-1",
        messageAr: "تمت مشاركة مخرج جديد.",
        messageEn: "A new output is ready for review.",
        deepLink: "/client/requests/request-1",
        status: "DELIVERED",
        readAt: null,
        deliveredAt: "2026-06-22T00:00:00.000Z",
        createdAt: "2026-06-22T00:00:00.000Z",
      },
    ],
  };
}

function portfolio(): Portfolio {
  return {
    generatedAt: "2026-06-22T00:00:00.000Z",
    portfolio: [
      {
        client: {
          id: "client-1",
          code: "CLIENT-1",
          name: "Client One",
          sector: "Technology",
          city: "Riyadh",
        },
        accountManagers: [{ id: "am-1", email: "am@example.com", displayName: "AM One" }],
        indicators: {
          openRequests: 3,
          overdueRequests: 1,
          waitingClientRequests: 1,
          returnedOutputs: 0,
          overdueDocumentRequests: 0,
          approvedHoursThisMonth: 4.5,
        },
        health: {
          code: "ATTENTION",
          label: "Needs attention",
          reason: "Overdue work exists.",
        },
        recentActivity: [
          {
            id: "activity-1",
            actorRole: "ROLE-AM",
            reason: "Request status changed",
            metadata: { eventCode: "REQUEST_STATUS_CHANGED" },
            occurredAt: "2026-06-22T00:00:00.000Z",
            request: {
              id: "request-1",
              requestNumber: "REQ-1",
              title: "Monthly request",
              status: "IN_PROGRESS",
            },
          },
        ],
      },
    ],
  };
}

function ledger(): HoursLedgerResponse {
  return {
    generatedAt: "2026-06-23T00:00:00.000Z",
    period: {
      key: "2026-06",
      start: "2026-06-01T00:00:00.000Z",
      end: "2026-07-01T00:00:00.000Z",
    },
    totals: {
      entries: 2,
      hours: 5,
      approvedHours: 3,
      submittedHours: 2,
      rejectedHours: 0,
      billableHours: 5,
      nonBillableHours: 0,
    },
    byStatus: {},
    byBillable: {},
    byClient: [
      {
        id: "client-1",
        code: "CLIENT-1",
        name: "Client One",
        sector: "Technology",
        city: "Riyadh",
        entries: 2,
        hours: 5,
        approvedHours: 3,
        submittedHours: 2,
        rejectedHours: 0,
        billableHours: 5,
        nonBillableHours: 0,
      },
    ],
    byRequest: [],
    byService: [],
    byUser: [],
    byMonth: [],
    entries: [
      {
        id: "time-1",
        workDate: "2026-06-10T00:00:00.000Z",
        hours: 3,
        billable: true,
        deductHours: true,
        status: "APPROVED",
        notes: null,
        submittedAt: "2026-06-10T10:00:00.000Z",
        decidedAt: "2026-06-11T10:00:00.000Z",
        decisionReason: "approved",
        createdAt: "2026-06-10T10:00:00.000Z",
        updatedAt: "2026-06-11T10:00:00.000Z",
        user: { id: "specialist-1", email: "sp@example.com", displayName: "Specialist One" },
        decidedBy: { id: "supervisor-1", email: "sv@example.com", displayName: "Supervisor" },
        client: {
          id: "client-1",
          code: "CLIENT-1",
          name: "Client One",
          sector: "Technology",
          city: "Riyadh",
        },
        request: {
          id: "request-1",
          requestNumber: "REQ-1",
          title: "Monthly request",
          status: "IN_PROGRESS",
          priority: "NORMAL",
        },
        service: {
          subscriptionServiceId: "subscription-service-1",
          hoursAllocated: 20,
          monthlyService: {
            id: "service-1",
            code: "M-SVC",
            revisionId: "service-revision-1",
            nameAr: "خدمة",
            nameEn: "Monthly service",
          },
          serviceLevel: {
            id: "level-1",
            code: "GROWTH",
            labelAr: "نمو",
            labelEn: "Growth",
          },
          serviceItem: null,
        },
      },
    ],
  };
}

function monthlyUsage(): MonthlyUsageResponse {
  const currentLedger = ledger();
  return {
    generatedAt: currentLedger.generatedAt,
    period: currentLedger.period,
    totals: currentLedger.totals,
    clients: currentLedger.byClient,
  };
}

function closing(): MonthlyClosing {
  return {
    id: "closing-1",
    client: {
      id: "client-1",
      code: "CLIENT-1",
      name: "Client One",
      sector: "Technology",
      city: "Riyadh",
    },
    periodStart: "2026-06-01T00:00:00.000Z",
    periodEnd: "2026-07-01T00:00:00.000Z",
    period: "2026-06",
    status: "DRAFT",
    title: "June closing",
    summary: { totals: ledger().totals },
    preparedBy: { id: "am-1", email: "am@example.com", displayName: "Account Manager" },
    finalizedBy: null,
    preparedAt: "2026-06-23T00:00:00.000Z",
    finalizedAt: null,
    archivedAt: null,
    createdAt: "2026-06-23T00:00:00.000Z",
    updatedAt: "2026-06-23T00:00:00.000Z",
  };
}

describe("Operations foundation UI", () => {
  it("renders authenticated-user notifications without external channels", () => {
    render(<NotificationInbox initial={notifications()} locale="en" />);

    expect(screen.getByRole("heading", { name: "Notifications" })).toBeInTheDocument();
    expect(screen.getByText("A new output is ready for review.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open" })).toHaveAttribute(
      "href",
      "/client/requests/request-1",
    );
  });

  it("renders internal report preparation without exposing advanced analytics", () => {
    render(<MonthlyReports initialReports={[report("PREPARED")]} />);

    expect(screen.getByRole("heading", { name: "Client monthly reports" })).toBeInTheDocument();
    expect(screen.getByText("June service report")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publish to client" })).toBeInTheDocument();
  });

  it("renders internal report preparation in Arabic without English actions", () => {
    render(<MonthlyReports initialReports={[report("PREPARED")]} locale="ar" />);

    expect(screen.getByRole("heading", { name: "تقارير العملاء الشهرية" })).toBeInTheDocument();
    expect(screen.getByText("تقرير خدمات شهر يونيو")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "نشر للعميل" })).toBeInTheDocument();
    expect(screen.queryByText("Publish to client")).not.toBeInTheDocument();
  });

  it("renders client-safe published reports", () => {
    render(<ClientReportList reports={[report()]} />);

    expect(screen.getByRole("heading", { name: "Monthly operating summary" })).toBeInTheDocument();
    expect(screen.getByText("Published reports")).toBeInTheDocument();
    expect(screen.getByText("Approved hours")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View report" })).toHaveAttribute(
      "href",
      "/client/reports/report-1",
    );

    render(<ClientReportDetail report={report()} />);
    expect(screen.getByRole("heading", { name: "What happened this month" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Request mix" })).toBeInTheDocument();
    expect(screen.getByText("Output - Accepted by you")).toBeInTheDocument();
    expect(screen.getByText("Document - Uploaded")).toBeInTheDocument();
    expect(screen.getByText("Output shared with client")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open request" })).toHaveAttribute(
      "href",
      "/client/requests/request-1",
    );
    expect(screen.queryByText("Account Manager")).not.toBeInTheDocument();
  });

  it("localizes client report delivery statuses in Arabic", () => {
    render(<ClientReportDetail report={report()} locale="ar" />);

    expect(screen.getByText("مخرج - مقبول من العميل")).toBeInTheDocument();
    expect(screen.getByText("مستند - تم الرفع")).toBeInTheDocument();
    expect(screen.queryByText("ACCEPTED_BY_CLIENT")).not.toBeInTheDocument();
    expect(screen.queryByText("UPLOADED")).not.toBeInTheDocument();
  });

  it("renders account-manager portfolio health indicators", () => {
    render(<AccountManagerPortfolio portfolio={portfolio()} />);

    expect(screen.getByRole("heading", { name: "Client portfolio" })).toBeInTheDocument();
    expect(screen.getByText("Needs attention")).toBeInTheDocument();
    expect(screen.getByText("REQ-1")).toBeInTheDocument();
  });

  it("renders the internal hours ledger and monthly closing foundation", () => {
    render(
      <HoursLedger
        canManageClosings
        initialClosings={[closing()]}
        initialLedger={ledger()}
        initialUsage={monthlyUsage()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Hours ledger and monthly closing" }),
    ).toBeInTheDocument();
    expect(screen.getByText("June closing")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Finalize and lock" })).toBeInTheDocument();
    expect(screen.getByText("Monthly service")).toBeInTheDocument();
  });

  it("renders the internal hours ledger in Arabic with localized controls", () => {
    render(
      <HoursLedger
        canManageClosings
        initialClosings={[closing()]}
        initialLedger={ledger()}
        initialUsage={monthlyUsage()}
        locale="ar"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "سجل الساعات والإغلاق الشهري" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "اعتماد وإقفال" })).toBeInTheDocument();
    expect(screen.getByText("خدمة")).toBeInTheDocument();
    expect(screen.queryByText("Refresh ledger")).not.toBeInTheDocument();
  });
});
