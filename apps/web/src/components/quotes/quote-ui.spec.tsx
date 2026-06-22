import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Quote } from "../../lib/quote-types";
import { QuoteDetail } from "./quote-detail";

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

describe("Quote snapshot UI", () => {
  beforeEach(() => {
    Object.defineProperty(global, "fetch", {
      configurable: true,
      writable: true,
      value: jest.fn(),
    });
    Object.defineProperty(window, "confirm", {
      configurable: true,
      value: jest.fn(() => true),
    });
  });

  it("renders snapshotted content and advances lifecycle through the backend", async () => {
    const fetchMock = jest.mocked(fetch);
    fetchMock.mockImplementationOnce(() =>
      jsonResponse({
        ...quote("ISSUED"),
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

    fireEvent.click(screen.getByRole("button", { name: "Mark issued" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://localhost:4000/api/v1/quotes/quote-1/status");
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      status: "ISSUED",
    });
    expect(await screen.findByText("Quote status changed to ISSUED.")).toBeInTheDocument();
  });
});
