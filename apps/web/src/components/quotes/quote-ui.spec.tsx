import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Quote, QuoteSummary } from "../../lib/quote-types";
import { QuoteDetail } from "./quote-detail";
import { QuoteList } from "./quote-list";
import { QuoteShell } from "./quote-shell";

const pushMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

function quote(status: Quote["status"] = "DRAFT"): Quote {
  return {
    id: "quote-1",
    quoteNumber: "QT-20260622-ABC12345",
    status,
    currency: "SAR",
    issueDate: null,
    validUntil: "2026-07-22T00:00:00.000Z",
    acceptedAt: null,
    rejectedAt: null,
    expiredAt: null,
    cancelledAt: null,
    statusReason: null,
    statusChangedAt: "2026-06-22T00:00:00.000Z",
    createdAt: "2026-06-22T00:00:00.000Z",
    updatedAt: "2026-06-22T00:00:00.000Z",
    sourcePricingDraftId: "draft-1",
    sourceDraftVersion: 1,
    snapshotHash: "a".repeat(64),
    client: {
      id: "client-1",
      code: "CLIENT-1",
      name: "Acme",
      legalName: "Acme LLC",
      sector: "Technology",
      city: "Riyadh",
      authorizedApprover: "Approver",
    },
    pricing: {
      calculatedAt: "2026-06-22T00:00:00.000Z",
      pricingDate: "2026-06-22T00:00:00.000Z",
      currency: "SAR",
      lines: [],
    },
    pricingRules: [
      {
        code: "PR7-TAX",
        name: "Tax",
        version: 1,
        ruleType: "TAX",
        calculationMethod: "PERCENTAGE",
        value: 1,
      },
    ],
    terms: {
      paymentTerms: "50% upfront",
      deliveryTerms: "According to plan",
      additionalTerms: null,
      clientNotes: null,
      validUntil: "2026-07-22T00:00:00.000Z",
    },
    sourceDraft: {
      id: "draft-1",
      draftNumber: "PD-1",
      title: "Acme pricing",
      notes: null,
      pricingDate: "2026-06-22T00:00:00.000Z",
      calculationVersion: 1,
      lastCalculatedAt: "2026-06-22T00:00:00.000Z",
      selections: [],
    },
    totals: {
      subtotalMonthly: 6_000,
      subtotalSetup: 300,
      subtotalOneTime: 0,
      subtotal: 6_300,
      discountTotal: 0,
      finalBeforeTax: 6_300,
      taxTotal: 63,
      finalTotal: 6_363,
      internalCost: 2_000,
      marginAmount: 4_300,
      marginPct: 68.25,
      targetMarginPct: null,
      meetsTargetMargin: null,
    },
    invoices: [],
    items: [
      {
        id: "item-1",
        lineType: "MONTHLY",
        serviceSnapshot: {
          sortOrder: 0,
          lineType: "MONTHLY",
          serviceCode: "MONTHLY-OPS",
          nameAr: "خدمة شهرية",
          nameEn: "Monthly operations",
          quantity: 1,
          baseAmount: 6_000,
          setupFee: 300,
          lineTotal: 6_300,
          internalCost: 2_000,
          serviceLevelCode: "GROWTH",
          serviceLevelLabel: "Growth",
        },
        quantity: 1,
        hours: 20,
        unitPrice: 300,
        setupFee: 300,
        discount: 0,
        lineTotal: 6_300,
        internalCost: 2_000,
        sortOrder: 0,
        serviceItems: [
          {
            itemCode: "ITEM-1",
            nameAr: "مخرج",
            nameEn: "Monthly output",
            expectedOutput: "A completed output",
            requiresFile: false,
            deductHours: true,
            sortOrder: 0,
          },
        ],
      },
    ],
  };
}

function jsonResponse(body: unknown): Promise<Response> {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: async () => body,
  } as Response);
}

function quoteSummary(status: Quote["status"] = "ISSUED"): QuoteSummary {
  const fullQuote = quote(status);
  return {
    id: fullQuote.id,
    quoteNumber: fullQuote.quoteNumber,
    status,
    currency: fullQuote.currency,
    issueDate: fullQuote.issueDate,
    validUntil: fullQuote.validUntil,
    createdAt: fullQuote.createdAt,
    updatedAt: fullQuote.updatedAt,
    client: {
      id: fullQuote.client.id,
      code: fullQuote.client.code,
      name: fullQuote.client.name,
      legalName: fullQuote.client.legalName,
    },
    title: fullQuote.sourceDraft.title,
    itemCount: fullQuote.items.length,
    totals: fullQuote.totals,
  };
}

describe("Quote snapshot UI", () => {
  beforeEach(() => {
    pushMock.mockReset();
    Object.defineProperty(global, "fetch", {
      configurable: true,
      writable: true,
      value: jest.fn(),
    });
    Object.defineProperty(window, "confirm", {
      configurable: true,
      value: jest.fn(() => true),
    });
    Object.defineProperty(window, "prompt", {
      configurable: true,
      value: jest.fn(() => ""),
    });
  });

  it("shows role-relevant internal navigation", () => {
    const { rerender } = render(
      <QuoteShell
        displayName="Specialist User"
        isAdmin={false}
        permissions={[]}
        roles={["ROLE-SPECIALIST"]}
      >
        <p>Specialist dashboard</p>
      </QuoteShell>,
    );

    expect(screen.getByRole("link", { name: "Specialist" })).toHaveAttribute("href", "/specialist");
    expect(screen.getByRole("link", { name: "Requests" })).toHaveAttribute("href", "/requests");
    expect(screen.queryByRole("link", { name: "Pricing drafts" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Quotes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Invoices" })).not.toBeInTheDocument();

    rerender(
      <QuoteShell
        displayName="Account Manager"
        isAdmin={false}
        permissions={["PERM-USE-PRICING-STUDIO", "PERM-MANAGE-QUOTES", "PERM-MANAGE-INVOICES"]}
        roles={["ROLE-AM"]}
      >
        <p>Account manager dashboard</p>
      </QuoteShell>,
    );

    expect(screen.getByRole("link", { name: "Account Manager" })).toHaveAttribute(
      "href",
      "/account-manager",
    );
    expect(screen.getByRole("link", { name: "Pricing drafts" })).toHaveAttribute(
      "href",
      "/pricing",
    );
    expect(screen.getByRole("link", { name: "Quotes" })).toHaveAttribute("href", "/pricing/quotes");
    expect(screen.getByRole("link", { name: "Invoices" })).toHaveAttribute(
      "href",
      "/pricing/invoices",
    );
  });

  it("localizes the internal shell for Arabic RTL users", () => {
    const { container } = render(
      <QuoteShell
        activePath="/requests"
        displayName="Faisal"
        isAdmin={false}
        locale="ar-SA"
        permissions={[]}
        roles={["ROLE-SPECIALIST"]}
      >
        <p>Specialist content</p>
      </QuoteShell>,
    );

    expect(container.firstElementChild).toHaveAttribute("dir", "rtl");
    expect(container.firstElementChild).toHaveAttribute("lang", "ar");
    expect(screen.getByRole("navigation", { name: "تنقل منصة التشغيل" })).toBeInTheDocument();
    expect(screen.getByText("منصة التشغيل")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "المختص" })).toHaveAttribute("href", "/specialist");
    expect(screen.getByRole("link", { name: "الطلبات" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "تسجيل الخروج" })).toBeInTheDocument();
  });

  it("renders snapshotted content and advances lifecycle through explicit backend actions", async () => {
    const fetchMock = jest.mocked(fetch);
    fetchMock
      .mockImplementationOnce(() =>
        jsonResponse({
          ...quote("ISSUED"),
          issueDate: "2026-06-22T01:00:00.000Z",
        }),
      )
      .mockImplementationOnce(() =>
        jsonResponse({
          ...quote("ACCEPTED"),
          acceptedAt: "2026-06-22T02:00:00.000Z",
          issueDate: "2026-06-22T01:00:00.000Z",
        }),
      );

    render(<QuoteDetail initialQuote={quote()} />);
    expect(screen.getByText("Acme LLC")).toBeInTheDocument();
    expect(screen.getByText("50% upfront")).toBeInTheDocument();
    expect(screen.getByText("Monthly output")).toBeInTheDocument();
    expect(screen.getByText(/PR7-TAX v1/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View PDF" })).toHaveAttribute(
      "href",
      "http://localhost:4000/api/v1/quotes/quote-1/pdf",
    );

    fireEvent.click(screen.getByRole("button", { name: "Issue quote" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://localhost:4000/api/v1/quotes/quote-1/status");
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      status: "ISSUED",
    });
    expect(await screen.findByText("Quote status changed to ISSUED.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Accept quote" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1]?.[0]).toBe("http://localhost:4000/api/v1/quotes/quote-1/accept");
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({});
    expect(await screen.findByText("ACCEPTED")).toBeInTheDocument();
  });

  it("renders compact lifecycle actions on the quote list", async () => {
    const fetchMock = jest.mocked(fetch);
    fetchMock.mockImplementationOnce(() => jsonResponse(quote("ACCEPTED")));

    render(<QuoteList quotes={[quoteSummary("ISSUED")]} />);

    fireEvent.click(screen.getByRole("button", { name: "Accept quote" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://localhost:4000/api/v1/quotes/quote-1/accept");
    expect(await screen.findByText("ACCEPTED")).toBeInTheDocument();
  });

  it("creates an invoice from an accepted quote snapshot", async () => {
    const fetchMock = jest.mocked(fetch);
    fetchMock.mockImplementationOnce(() =>
      jsonResponse({ id: "invoice-1", invoiceNumber: "INV-20260622-ABC12345" }),
    );

    render(<QuoteDetail initialQuote={quote("ACCEPTED")} />);

    fireEvent.click(screen.getByRole("button", { name: "Create invoice" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://localhost:4000/api/v1/invoices");
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ quoteId: "quote-1" });
    expect(pushMock).toHaveBeenCalledWith("/pricing/invoices/invoice-1");
  });

  it("links an existing invoice from quote detail", () => {
    render(
      <QuoteDetail
        initialQuote={{
          ...quote("ACCEPTED"),
          invoices: [
            {
              id: "invoice-1",
              invoiceNumber: "INV-20260622-ABC12345",
              status: "DRAFT",
              createdAt: "2026-06-22T00:00:00.000Z",
              updatedAt: "2026-06-22T00:00:00.000Z",
            },
          ],
        }}
      />,
    );

    expect(
      screen.getByRole("link", { name: /View invoice INV-20260622-ABC12345/ }),
    ).toHaveAttribute("href", "/pricing/invoices/invoice-1");
  });
});
