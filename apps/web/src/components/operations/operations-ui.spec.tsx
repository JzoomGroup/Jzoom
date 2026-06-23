import { render, screen } from "@testing-library/react";
import { AccountManagerPortfolio } from "./account-manager-portfolio";
import { ClientReportDetail, ClientReportList } from "./client-reports";
import { MonthlyReports } from "./monthly-reports";
import { NotificationInbox } from "./notification-inbox";
import type {
  AccountManagerPortfolio as Portfolio,
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

describe("Operations foundation UI", () => {
  it("renders authenticated-user notifications without external channels", () => {
    render(<NotificationInbox initial={notifications()} />);

    expect(screen.getByRole("heading", { name: "Notification center" })).toBeInTheDocument();
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

  it("renders client-safe published reports", () => {
    render(<ClientReportList reports={[report()]} />);

    expect(screen.getByRole("link", { name: "View report" })).toHaveAttribute(
      "href",
      "/client/reports/report-1",
    );

    render(<ClientReportDetail report={report()} />);
    expect(screen.getByText("Output shared with client")).toBeInTheDocument();
    expect(screen.queryByText("Account Manager")).not.toBeInTheDocument();
  });

  it("renders account-manager portfolio health indicators", () => {
    render(<AccountManagerPortfolio portfolio={portfolio()} />);

    expect(screen.getByRole("heading", { name: "Client portfolio" })).toBeInTheDocument();
    expect(screen.getByText("Needs attention")).toBeInTheDocument();
    expect(screen.getByText("REQ-1")).toBeInTheDocument();
  });
});
