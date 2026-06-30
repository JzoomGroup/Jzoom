import { render, screen } from "@testing-library/react";
import { AdminDashboard } from "./admin-dashboard";
import type { ClientsSnapshot } from "../lib/clients-types";
import type {
  AccountManagerPortfolio,
  MonthlyReport,
  MonthlyUsageResponse,
} from "../lib/operations-types";
import type { RequestQueueResponse, RequestSummary } from "../lib/request-types";

function clientsSnapshot(): ClientsSnapshot {
  return {
    clients: [
      {
        id: "client-1",
        code: "CLIENT-1",
        name: "Client One",
        legalName: "Client One LLC",
        commercialRegistration: null,
        sector: "Technology",
        city: "Riyadh",
        employeesCount: 30,
        branchesCount: 1,
        transactionVolume: null,
        operationalComplexity: null,
        dataReadiness: null,
        urgency: null,
        billingContact: "billing@example.com",
        authorizedApprover: "Approver One",
        status: "ACTIVE",
        archivedAt: null,
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-22T00:00:00.000Z",
        counts: { assignments: 1, contacts: 1, quotes: 1, requests: 2 },
        users: [
          {
            id: "user-1",
            email: "client@example.com",
            displayName: "Client User",
            status: "ACTIVE",
            roleCode: "ROLE-CLIENT",
            startsAt: "2026-06-01T00:00:00.000Z",
            endsAt: null,
          },
        ],
      },
      {
        id: "client-2",
        code: "CLIENT-2",
        name: "Client Two",
        legalName: null,
        commercialRegistration: null,
        sector: "Finance",
        city: "Jeddah",
        employeesCount: 12,
        branchesCount: 1,
        transactionVolume: null,
        operationalComplexity: null,
        dataReadiness: null,
        urgency: null,
        billingContact: null,
        authorizedApprover: "Approver Two",
        status: "INACTIVE",
        archivedAt: null,
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-22T00:00:00.000Z",
        counts: { assignments: 0, contacts: 0, quotes: 0, requests: 0 },
        users: [],
      },
    ],
  };
}

function request(status: RequestSummary["status"], id = "request-1"): RequestSummary {
  return {
    id,
    requestNumber: `REQ-${id}`,
    status,
    title: "Monthly SEO update",
    description: "Prepare the monthly SEO package.",
    priority: "HIGH",
    dueAt: "2026-06-30T09:00:00.000Z",
    closedAt: null,
    createdAt: "2026-06-22T00:00:00.000Z",
    updatedAt: id === "request-2" ? "2026-06-23T00:00:00.000Z" : "2026-06-22T00:00:00.000Z",
    client: {
      id: "client-1",
      code: "CLIENT-1",
      name: "Client One",
      legalName: "Client One LLC",
      sector: "Technology",
      city: "Riyadh",
    },
    service: {
      subscriptionServiceId: "subscription-service-1",
      subscriptionId: "subscription-1",
      hoursAllocated: 20,
      status: "ACTIVE",
      monthlyService: {
        id: "monthly-service-1",
        code: "SEO",
        revisionId: "monthly-service-revision-1",
        nameAr: "SEO operations",
        nameEn: "SEO operations",
        serviceLine: "Operate",
        domain: "Marketing",
      },
      serviceLevel: {
        id: "level-1",
        code: "GROWTH",
        labelAr: "Growth",
        labelEn: "Growth",
      },
    },
    serviceItem: null,
    sourceQuote: null,
    sourceInvoice: null,
    assignments: {
      specialist: null,
      supervisor: null,
      accountManager: null,
    },
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

function requestQueue(): RequestQueueResponse {
  return {
    queue: "all",
    filters: {},
    counters: {
      accountManager: 2,
      open: 3,
      overdue: 1,
      specialist: 4,
      supervisor: 1,
    },
    requests: [request("NEW"), request("WAITING_CLIENT", "request-2")],
  };
}

function usage(): MonthlyUsageResponse {
  return {
    generatedAt: "2026-06-24T00:00:00.000Z",
    period: { start: "2026-06-01", end: "2026-06-30", key: "2026-06" },
    totals: {
      approvedHours: 7.5,
      billableHours: 6,
      entries: 3,
      hours: 8,
      nonBillableHours: 1.5,
      rejectedHours: 0,
      submittedHours: 1,
    },
    clients: [
      {
        approvedHours: 7.5,
        billableHours: 6,
        entries: 3,
        hours: 8,
        nonBillableHours: 1.5,
        rejectedHours: 0,
        submittedHours: 1,
        city: "Riyadh",
        code: "CLIENT-1",
        id: "client-1",
        name: "Client One",
        sector: "Technology",
      },
    ],
  };
}

function reports(): MonthlyReport[] {
  return [
    {
      id: "report-1",
      client: {
        id: "client-1",
        code: "CLIENT-1",
        name: "Client One",
        sector: "Technology",
        city: "Riyadh",
      },
      periodStart: "2026-06-01T00:00:00.000Z",
      periodEnd: "2026-06-30T23:59:59.000Z",
      period: "2026-06",
      status: "PUBLISHED",
      title: "June service report",
      summary: {},
      preparedBy: null,
      preparedAt: null,
      publishedAt: "2026-06-24T00:00:00.000Z",
      createdAt: "2026-06-24T00:00:00.000Z",
      updatedAt: "2026-06-24T00:00:00.000Z",
    },
  ];
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
          openRequests: 3,
          overdueRequests: 1,
          waitingClientRequests: 1,
          returnedOutputs: 0,
          overdueDocumentRequests: 0,
          approvedHoursThisMonth: 7.5,
        },
        health: {
          code: "ATTENTION",
          label: "Needs attention",
          reason: "Overdue work exists.",
        },
        recentActivity: [],
      },
    ],
  };
}

describe("AdminDashboard", () => {
  it("renders the read-only operating summary from backend snapshots", () => {
    render(
      <AdminDashboard
        clientsSnapshot={clientsSnapshot()}
        portfolio={portfolio()}
        reports={reports()}
        requestQueue={requestQueue()}
        requests={[
          request("NEW"),
          request("WAITING_CLIENT", "request-2"),
          request("CLOSED", "request-3"),
        ]}
        usage={usage()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Operating dashboard" })).toBeInTheDocument();
    expect(screen.getByText("Total clients")).toBeInTheDocument();
    expect(screen.getByText("1 active")).toBeInTheDocument();
    expect(screen.getByText("Used hours")).toBeInTheDocument();
    expect(screen.getAllByText("7.50h")).toHaveLength(3);
    expect(screen.getAllByText("Waiting on client").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("heading", { name: "Client health watchlist" })).toBeInTheDocument();
    expect(screen.getByText("Overdue work exists.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Client management/ })).toHaveAttribute(
      "href",
      "/admin/clients",
    );
    expect(screen.getByRole("link", { name: /Request templates/ })).toHaveAttribute(
      "href",
      "/admin/request-templates",
    );
  });
});
