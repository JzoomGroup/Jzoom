import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Invoice, InvoiceSummary } from "../../lib/invoice-types";
import { InvoiceDetail } from "./invoice-detail";
import { InvoiceList } from "./invoice-list";

function invoice(status: Invoice["status"] = "DRAFT"): Invoice {
  return {
    id: "invoice-1",
    invoiceNumber: "INV-20260622-ABC12345",
    quoteId: "quote-1",
    quoteNumber: "QT-20260622-ABC12345",
    status,
    currency: "SAR",
    issueDate: null,
    issuedAt: null,
    cancelledAt: null,
    voidedAt: null,
    statusReason: null,
    statusChangedAt: "2026-06-22T00:00:00.000Z",
    createdAt: "2026-06-22T00:00:00.000Z",
    updatedAt: "2026-06-22T00:00:00.000Z",
    sourceQuoteSnapshotHash: "a".repeat(64),
    snapshotHash: "b".repeat(64),
    client: {
      id: "client-1",
      code: "CLIENT-1",
      name: "Acme",
      legalName: "Acme LLC",
      sector: "Technology",
      city: "Riyadh",
      authorizedApprover: "Approver",
    },
    quote: {
      id: "quote-1",
      quoteNumber: "QT-20260622-ABC12345",
      status: "ACCEPTED",
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
      terms: {},
      totals: {
        subtotalMonthly: 0,
        subtotalSetup: 0,
        subtotalOneTime: 1_000,
        subtotal: 1_000,
        discountTotal: 100,
        finalBeforeTax: 900,
        taxTotal: 135,
        finalTotal: 1_035,
        internalCost: 450,
        marginAmount: 450,
        marginPct: 50,
        targetMarginPct: null,
        meetsTargetMargin: null,
      },
      items: [],
    },
    pricing: {},
    pricingRules: [],
    terms: {},
    totals: {
      subtotalMonthly: 0,
      subtotalSetup: 0,
      subtotalOneTime: 1_000,
      subtotal: 1_000,
      discountTotal: 100,
      finalBeforeTax: 900,
      taxTotal: 135,
      finalTotal: 1_035,
      internalCost: 450,
      marginAmount: 450,
      marginPct: 50,
      targetMarginPct: null,
      meetsTargetMargin: null,
    },
    discountTotal: 100,
    finalDueNoTax: 900,
    items: [
      {
        id: "invoice-item-1",
        quoteItemId: "quote-item-1",
        itemSnapshot: {
          lineType: "ONE_TIME",
          serviceSnapshot: {
            serviceCode: "ONE-TIME",
            nameAr: "خدمة",
            nameEn: "One-time service",
            lineTotal: 900,
          },
        },
        quantity: 1,
        unitPrice: 1_000,
        discount: 100,
        lineTotal: 900,
        sortOrder: 1,
      },
    ],
  };
}

function invoiceSummary(status: Invoice["status"] = "DRAFT"): InvoiceSummary {
  const fullInvoice = invoice(status);
  return {
    id: fullInvoice.id,
    invoiceNumber: fullInvoice.invoiceNumber,
    quoteId: fullInvoice.quoteId,
    quoteNumber: fullInvoice.quoteNumber,
    status,
    currency: fullInvoice.currency,
    issueDate: fullInvoice.issueDate,
    issuedAt: fullInvoice.issuedAt,
    cancelledAt: fullInvoice.cancelledAt,
    voidedAt: fullInvoice.voidedAt,
    createdAt: fullInvoice.createdAt,
    updatedAt: fullInvoice.updatedAt,
    client: {
      id: fullInvoice.client.id,
      code: fullInvoice.client.code,
      name: fullInvoice.client.name,
      legalName: fullInvoice.client.legalName,
    },
    title: "Acme accepted quote",
    itemCount: fullInvoice.items.length,
    totals: fullInvoice.totals,
    finalDueNoTax: fullInvoice.finalDueNoTax,
  };
}

function jsonResponse(body: unknown): Promise<Response> {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: async () => body,
  } as Response);
}

describe("Invoice foundation UI", () => {
  beforeEach(() => {
    Object.defineProperty(global, "fetch", {
      configurable: true,
      writable: true,
      value: jest.fn(),
    });
  });

  it("renders invoice snapshot content and issues a draft invoice", async () => {
    const fetchMock = jest.mocked(fetch);
    fetchMock.mockImplementationOnce(() =>
      jsonResponse({
        ...invoice("ISSUED"),
        issuedAt: "2026-06-22T01:00:00.000Z",
        issueDate: "2026-06-22T01:00:00.000Z",
      }),
    );

    render(<InvoiceDetail initialInvoice={invoice()} />);
    expect(screen.getByText("Acme LLC")).toBeInTheDocument();
    expect(screen.getByText("One-time service")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Source quote" })).toHaveAttribute(
      "href",
      "/pricing/quotes/quote-1",
    );
    expect(screen.getByRole("link", { name: "View PDF" })).toHaveAttribute(
      "href",
      "http://localhost:4000/api/v1/invoices/invoice-1/pdf",
    );

    fireEvent.click(screen.getByRole("button", { name: "Issue invoice" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://localhost:4000/api/v1/invoices/invoice-1/issue",
    );
    expect(await screen.findByText("Invoice moved to ISSUED.")).toBeInTheDocument();
  });

  it("renders compact lifecycle actions on the invoice list", async () => {
    const fetchMock = jest.mocked(fetch);
    fetchMock.mockImplementationOnce(() => jsonResponse(invoice("VOIDED")));

    render(<InvoiceList invoices={[invoiceSummary("ISSUED")]} />);

    fireEvent.click(screen.getByRole("button", { name: "Void invoice" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://localhost:4000/api/v1/invoices/invoice-1/void",
    );
    expect(await screen.findByText("VOIDED")).toBeInTheDocument();
  });
});
