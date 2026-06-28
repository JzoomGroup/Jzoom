import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ClientInvoiceDetail } from "./client-invoice-detail";
import { ClientInvoiceList } from "./client-invoice-list";
import { ClientOverview } from "./client-overview";
import { ClientQuoteDetail } from "./client-quote-detail";
import { ClientQuoteList } from "./client-quote-list";
import { ClientRequestList } from "./client-request-list";
import { createClientServiceRequest } from "../../lib/request-client";
import { fetchActiveRequestTemplate } from "../../lib/request-templates-client";
import type {
  ClientInvoice,
  ClientInvoiceSummary,
  ClientPortalAccount,
  ClientQuote,
  ClientQuoteSummary,
} from "../../lib/client-portal-types";
import type { RequestSummary } from "../../lib/request-types";

const pushMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock("../../lib/request-client", () => ({
  createClientServiceRequest: jest.fn(),
  requestErrorMessage: () => "Request failed",
}));

jest.mock("../../lib/request-templates-client", () => ({
  answersForTemplate: jest.fn(() => []),
  fetchActiveRequestTemplate: jest.fn(),
}));

function account(): ClientPortalAccount {
  return {
    user: {
      id: "user-1",
      email: "client@example.com",
      displayName: "Client User",
      preferredLocale: "en",
    },
    clients: [
      {
        id: "client-1",
        code: "CLIENT-1",
        name: "Client One",
        legalName: "Client One LLC",
        sector: "Technology",
        city: "Riyadh",
        authorizedApprover: "Approver One",
      },
    ],
    services: {
      subscribedMonthly: [],
      availableMonthly: [
        {
          id: "service-1",
          code: "SERVICE-1",
          category: {
            id: "category-1",
            code: "CAT-1",
            nameAr: "Category",
            nameEn: "Category",
          },
          revisionId: "service-revision-1",
          nameAr: "Client Service",
          nameEn: "Client Service",
          description: "A client-visible service.",
          serviceLine: "Operate",
          domain: "Operations",
          defaultSlaHours: 24,
          sellingHourlyRateSar: 100,
          levels: [],
        },
      ],
      availableOneTime: [],
    },
  };
}

function totals() {
  return {
    subtotalMonthly: 100,
    subtotalSetup: 25,
    subtotalOneTime: 300,
    subtotal: 425,
    discountTotal: 25,
    finalBeforeTax: 400,
    taxTotal: 60,
    finalTotal: 460,
    internalCost: 120,
    marginAmount: 280,
    marginPct: 70,
  } as unknown as ClientQuote["totals"];
}

function quoteSummary(): ClientQuoteSummary {
  return {
    id: "quote-1",
    quoteNumber: "QT-1",
    status: "ISSUED",
    currency: "SAR",
    issueDate: "2026-06-22T00:00:00.000Z",
    validUntil: "2026-07-22T00:00:00.000Z",
    acceptedAt: null,
    createdAt: "2026-06-22T00:00:00.000Z",
    updatedAt: "2026-06-22T00:00:00.000Z",
    client: account().clients[0]!,
    title: "Client quote",
    itemCount: 1,
    totals: totals(),
  };
}

function quote(): ClientQuote {
  return {
    ...quoteSummary(),
    snapshotHash: "abc123",
    terms: {
      paymentTerms: "Due in 30 days",
      deliveryTerms: "Remote delivery",
      additionalTerms: "Scope changes require approval",
      clientNotes: "Client-facing note",
      validUntil: "2026-07-22T00:00:00.000Z",
    },
    invoices: [
      { id: "invoice-1", invoiceNumber: "INV-1", status: "ISSUED", createdAt: "", updatedAt: "" },
    ],
    items: [
      {
        id: "quote-item-1",
        lineType: "ONE_TIME",
        serviceSnapshot: {
          serviceCode: "SERVICE-1",
          nameAr: "خدمة",
          nameEn: "Client Service",
          quantity: 1,
          unitPrice: 425,
          baseAmount: 425,
          setupFee: 25,
          lineTotal: 400,
          internalCost: 120,
        } as unknown as ClientQuote["items"][number]["serviceSnapshot"],
        quantity: 1,
        hours: null,
        unitPrice: 425,
        setupFee: 25,
        discount: 25,
        lineTotal: 400,
        sortOrder: 1,
        serviceItems: [
          {
            itemCode: "OUTPUT-1",
            nameAr: "مخرج",
            nameEn: "Visible deliverable",
            expectedOutput: "Output",
            requiresFile: false,
            sortOrder: 1,
          },
        ],
      },
    ],
  };
}

function invoiceSummary(): ClientInvoiceSummary {
  return {
    id: "invoice-1",
    invoiceNumber: "INV-1",
    quoteId: "quote-1",
    quoteNumber: "QT-1",
    status: "ISSUED",
    currency: "SAR",
    issueDate: "2026-06-22T00:00:00.000Z",
    issuedAt: "2026-06-22T00:00:00.000Z",
    createdAt: "2026-06-22T00:00:00.000Z",
    updatedAt: "2026-06-22T00:00:00.000Z",
    client: account().clients[0]!,
    title: "Client invoice",
    itemCount: 1,
    totals: totals(),
    finalDueNoTax: 400,
  };
}

function invoice(): ClientInvoice {
  return {
    ...invoiceSummary(),
    sourceQuoteSnapshotHash: "quotehash",
    snapshotHash: "invoicehash",
    quote: {
      id: "quote-1",
      quoteNumber: "QT-1",
      status: "ACCEPTED",
      snapshotHash: "quotehash",
      terms: quote().terms,
      totals: totals(),
    },
    terms: quote().terms,
    discountTotal: 25,
    items: [
      {
        id: "invoice-item-1",
        quoteItemId: "quote-item-1",
        itemSnapshot: {
          lineType: "ONE_TIME",
          serviceSnapshot: quote().items[0]!.serviceSnapshot,
          serviceItems: quote().items[0]!.serviceItems,
        },
        quantity: 1,
        unitPrice: 425,
        discount: 25,
        lineTotal: 400,
        sortOrder: 1,
      },
    ],
  };
}

function accountWithSubscription(): ClientPortalAccount {
  const base = account();
  return {
    ...base,
    services: {
      ...base.services,
      subscribedMonthly: [
        {
          id: "subscription-service-1",
          subscriptionId: "subscription-1",
          clientId: "client-1",
          client: {
            id: "client-1",
            code: "CLIENT-1",
            name: "Client One",
          },
          status: "ACTIVE",
          startsAt: "2026-06-01T00:00:00.000Z",
          endsAt: null,
          hoursAllocated: 20,
          service: {
            id: "service-1",
            code: "MS-HR",
            revisionId: "service-revision-1",
            nameAr: "خدمة الموارد البشرية",
            nameEn: "HR Support",
            serviceLine: "Operate",
            domain: "HR",
            description: "Monthly HR operating support.",
            category: {
              id: "category-1",
              code: "HR",
              nameAr: "الموارد البشرية",
              nameEn: "Human Resources",
            },
          },
          serviceLevel: {
            id: "level-1",
            code: "CORE",
            labelAr: "أساسي",
            labelEn: "Core",
          },
          serviceItems: [
            {
              id: "service-item-revision-1",
              itemId: "service-item-1",
              code: "SI-HR-001",
              nameAr: "خطاب موظف",
              nameEn: "Employee letter",
              expectedOutput: "Employee letter",
              requiresFile: false,
            },
          ],
        },
      ],
    },
  };
}

function requestSummary(): RequestSummary {
  return {
    id: "request-1",
    requestNumber: "REQ-1",
    status: "NEW",
    title: "Existing request",
    description: "Existing description",
    priority: "NORMAL",
    dueAt: null,
    closedAt: null,
    createdAt: "2026-06-22T00:00:00.000Z",
    updatedAt: "2026-06-22T00:00:00.000Z",
    client: account().clients[0] as RequestSummary["client"],
    service: {
      subscriptionServiceId: "subscription-service-1",
      subscriptionId: "subscription-1",
      hoursAllocated: 20,
      status: "ACTIVE",
      monthlyService: {
        id: "service-1",
        code: "MS-HR",
        revisionId: "service-revision-1",
        nameAr: "خدمة الموارد البشرية",
        nameEn: "HR Support",
        serviceLine: "Operate",
        domain: "HR",
      },
      serviceLevel: {
        id: "level-1",
        code: "CORE",
        labelAr: "أساسي",
        labelEn: "Core",
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

describe("Client portal UI", () => {
  beforeEach(() => {
    pushMock.mockReset();
    jest.mocked(createClientServiceRequest).mockReset();
    jest.mocked(fetchActiveRequestTemplate).mockReset();
  });

  it("renders overview account context and record counts", () => {
    render(
      <ClientOverview
        account={account()}
        quotes={[quoteSummary()]}
        invoices={[invoiceSummary()]}
        requests={[requestSummary()]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Welcome, Client User" })).toBeInTheDocument();
    expect(screen.getByText("CLIENT-1")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Requests and subscription" })).toBeInTheDocument();
    expect(screen.getByText("Open requests")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Service catalog" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View quotes" })).toHaveAttribute(
      "href",
      "/client/quotes",
    );
  });

  it("renders client quote list and PDF detail without internal fields", () => {
    const { container } = render(<ClientQuoteList quotes={[quoteSummary()]} />);
    expect(screen.getByRole("link", { name: /Client quote/ })).toHaveAttribute(
      "href",
      "/client/quotes/quote-1",
    );

    render(<ClientQuoteDetail quote={quote()} />);
    expect(screen.getByRole("link", { name: "View PDF" })).toHaveAttribute(
      "href",
      "http://localhost:4000/api/v1/client-portal/quotes/quote-1/pdf",
    );
    expect(screen.getByText("Client Service")).toBeInTheDocument();
    expect(container.textContent).not.toContain("internalCost");
    expect(document.body.textContent).not.toContain("Margin");
    expect(document.body.textContent).not.toContain("pricing factor");
    expect(document.body.textContent).not.toContain("Internal admin note");
  });

  it("renders client invoice list and PDF detail without payment implementation", () => {
    render(<ClientInvoiceList invoices={[invoiceSummary()]} />);
    expect(screen.getByRole("link", { name: /Client invoice/ })).toHaveAttribute(
      "href",
      "/client/invoices/invoice-1",
    );

    render(<ClientInvoiceDetail invoice={invoice()} />);
    expect(screen.getByRole("link", { name: "View PDF" })).toHaveAttribute(
      "href",
      "http://localhost:4000/api/v1/client-portal/invoices/invoice-1/pdf",
    );
    expect(screen.getByText("Client Service")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("Payment gateway");
    expect(document.body.textContent).not.toContain("Payment status");
    expect(document.body.textContent).not.toContain("ZATCA");
  });

  it("creates client requests from subscribed service and service-item pickers", async () => {
    jest.mocked(fetchActiveRequestTemplate).mockResolvedValue({
      serviceItemRevision: {
        id: "service-item-revision-1",
        serviceItemId: "service-item-1",
        nameAr: "خطاب موظف",
        nameEn: "Employee letter",
        expectedOutput: "Employee letter",
        requiresFile: false,
      },
      serviceItem: {
        id: "service-item-1",
        code: "SI-HR-001",
        monthlyService: { id: "service-1", code: "MS-HR" },
      },
      template: null,
    });
    const createdRequest = {
      ...requestSummary(),
      id: "request-2",
      requestNumber: "REQ-2",
      title: "Need employee letter",
    } as Awaited<ReturnType<typeof createClientServiceRequest>>;
    jest.mocked(createClientServiceRequest).mockResolvedValue(createdRequest);

    render(<ClientRequestList account={accountWithSubscription()} requests={[requestSummary()]} />);

    expect(screen.queryByLabelText("Client ID")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Subscription service ID")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Service item revision ID")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Service item"), {
      target: { value: "service-item-revision-1" },
    });
    await waitFor(() =>
      expect(fetchActiveRequestTemplate).toHaveBeenCalledWith("service-item-revision-1"),
    );

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Need employee letter" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Please prepare an employee letter." },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Create request" }).closest("form")!);

    await waitFor(() =>
      expect(createClientServiceRequest).toHaveBeenCalledWith({
        clientId: "client-1",
        subscriptionServiceId: "subscription-service-1",
        serviceItemRevisionId: "service-item-revision-1",
        title: "Need employee letter",
        description: "Please prepare an employee letter.",
        priority: "NORMAL",
      }),
    );
    expect(pushMock).toHaveBeenCalledWith("/client/requests/request-2");
  });
});
