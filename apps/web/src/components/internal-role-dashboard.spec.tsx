import { render, screen } from "@testing-library/react";
import { InternalRoleDashboard } from "./internal-role-dashboard";
import type { AccountManagerPortfolio, MonthlyUsageResponse } from "../lib/operations-types";
import type { RequestQueueResponse, RequestSummary } from "../lib/request-types";

function request(status: RequestSummary["status"], id = "request-1"): RequestSummary {
  return {
    id,
    requestNumber: `REQ-${id}`,
    status,
    title: "Prepare HR policy",
    description: "Prepare an HR policy package.",
    priority: "HIGH",
    dueAt: "2026-06-30T09:00:00.000Z",
    closedAt: null,
    createdAt: "2026-06-22T00:00:00.000Z",
    updatedAt: id === "request-2" ? "2026-06-23T00:00:00.000Z" : "2026-06-22T00:00:00.000Z",
    client: {
      id: "client-1",
      code: "CLIENT-1",
      name: "Client One",
      legalName: null,
      sector: "Technology",
      city: "Riyadh",
    },
    service: {
      subscriptionServiceId: "subscription-service-1",
      subscriptionId: "subscription-1",
      hoursAllocated: 20,
      status: "ACTIVE",
      monthlyService: {
        id: "service-1",
        code: "MS-HR",
        revisionId: "service-revision-1",
        nameAr: "HR Support",
        nameEn: "HR Support",
        serviceLine: "Operate",
        domain: "HR",
      },
      serviceLevel: {
        id: "level-1",
        code: "CORE",
        labelAr: "Core",
        labelEn: "Core",
      },
    },
    serviceItem: null,
    sourceQuote: null,
    sourceInvoice: null,
    assignments: { specialist: null, supervisor: null, accountManager: null },
    counts: {
      comments: 0,
      documentRequests: 0,
      files: 0,
      internalNotes: 0,
      outputs: 0,
      tasks: 0,
      timeEntries: 0,
      workflowEvents: 0,
    },
  };
}

function queue(): RequestQueueResponse {
  return {
    queue: "specialist",
    filters: {},
    counters: {
      accountManager: 1,
      open: 2,
      overdue: 1,
      specialist: 2,
      supervisor: 1,
    },
    requests: [request("WAITING_CLIENT"), request("WAITING_SUPERVISOR", "request-2")],
  };
}

function usage(): MonthlyUsageResponse {
  return {
    generatedAt: "2026-06-24T00:00:00.000Z",
    period: { start: "2026-06-01", end: "2026-06-30", key: "2026-06" },
    totals: {
      approvedHours: 4,
      billableHours: 3,
      entries: 2,
      hours: 5,
      nonBillableHours: 1,
      rejectedHours: 0,
      submittedHours: 1,
    },
    clients: [],
  };
}

function portfolio(): AccountManagerPortfolio {
  return {
    generatedAt: "2026-06-24T00:00:00.000Z",
    portfolio: [
      {
        client: {
          id: "client-1",
          code: "CLIENT-1",
          name: "Client One",
          sector: "Technology",
          city: "Riyadh",
        },
        accountManagers: [],
        indicators: {
          openRequests: 2,
          overdueRequests: 1,
          waitingClientRequests: 1,
          returnedOutputs: 0,
          overdueDocumentRequests: 0,
          approvedHoursThisMonth: 4,
        },
        health: {
          code: "ATTENTION",
          label: "Needs attention",
          reason: "Delayed work exists.",
        },
        recentActivity: [],
      },
    ],
  };
}

describe("InternalRoleDashboard", () => {
  it("renders a specialist execution dashboard from scoped queue data", () => {
    render(<InternalRoleDashboard mode="specialist" queue={queue()} usage={usage()} />);

    expect(screen.getByRole("heading", { name: "My execution dashboard" })).toBeInTheDocument();
    expect(screen.getByText("Specialist queue")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Priority work" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Work queues/ })).toHaveAttribute(
      "href",
      "/requests/queues",
    );
  });

  it("renders management health and reporting context when provided", () => {
    render(
      <InternalRoleDashboard
        mode="management"
        portfolio={portfolio()}
        queue={{ ...queue(), queue: "all" }}
        reports={[]}
        usage={usage()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Executive operating dashboard" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Client health watch" })).toBeInTheDocument();
    expect(screen.getByText("Delayed work exists.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Reports/ })).toHaveAttribute("href", "/reports");
  });
});
