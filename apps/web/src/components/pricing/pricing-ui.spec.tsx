import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type {
  PricingDraft,
  PricingRulesSnapshot,
  PricingStudioCatalog,
} from "../../lib/pricing-types";
import { PricingRuleManager } from "./pricing-rule-manager";
import { PricingStudio } from "./pricing-studio";

const replaceMock = jest.fn();
const pushMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
}));

function rulesSnapshot(): PricingRulesSnapshot {
  return {
    ruleTypes: ["RATE_CARD", "SETUP_FEE", "MARGIN", "DISCOUNT", "TAX", "FORMULA"],
    calculationMethods: ["NONE", "FIXED_AMOUNT", "PERCENTAGE"],
    targetTypes: ["ALL", "MONTHLY", "ONE_TIME"],
    rules: [
      {
        id: "rule-1",
        code: "PR-001",
        name: "Monthly base",
        status: "ACTIVE",
        sortOrder: 0,
        archivedAt: null,
        revisions: [],
        revision: {
          id: "rule-revision-1",
          version: 1,
          status: "ACTIVE",
          effectiveFrom: "2026-01-01T00:00:00.000Z",
          effectiveTo: null,
          formulaOrRule: "hours * rate",
          appliesTo: "Monthly services",
          implementationOwner: "Backend calculation",
          visibility: "Internal",
          ruleType: "RATE_CARD",
          calculationMethod: "NONE",
          value: null,
          currency: "SAR",
          targetType: "MONTHLY",
          targetCode: null,
          priority: 0,
          isStackable: true,
          isEnabled: true,
          conditions: null,
        },
      },
    ],
  };
}

function studioCatalog(): PricingStudioCatalog {
  return {
    defaults: { quoteValidityDays: 30 },
    clients: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        code: "CLIENT-1",
        name: "Acme",
        legalName: "Acme LLC",
        sector: "Technology",
        city: "Riyadh",
        authorizedApprover: "A. Approver",
      },
    ],
    monthlyServices: [
      {
        id: "monthly-1",
        code: "MONTHLY-OPS",
        categoryName: "Operations",
        revision: {
          id: "22222222-2222-4222-8222-222222222222",
          version: 1,
          nameAr: "خدمة شهرية",
          nameEn: "Monthly operations",
          description: "Ongoing operational support.",
          sellingHourlyRateSar: 300,
          setupFeePct: 5,
          levels: [
            {
              id: "33333333-3333-4333-8333-333333333333",
              code: "GROWTH",
              labelAr: "نمو",
              labelEn: "Growth",
              hours: 20,
            },
          ],
        },
      },
    ],
    oneTimeServices: [
      {
        id: "one-time-1",
        code: "BUILD-WEBSITE",
        serviceLine: "Build",
        categoryName: "Build",
        revision: {
          id: "44444444-4444-4444-8444-444444444444",
          version: 1,
          nameAr: "بناء موقع",
          nameEn: "Website build",
          description: "A complete website build.",
          basePriceSar: 12_000,
          estimatedHours: 80,
          durationDays: 30,
        },
      },
    ],
  };
}

function savedDraft(): PricingDraft {
  return {
    id: "55555555-5555-4555-8555-555555555555",
    draftNumber: "PD-20260622-ABC12345",
    clientId: studioCatalog().clients[0]!.id,
    client: {
      id: studioCatalog().clients[0]!.id,
      code: "CLIENT-1",
      name: "Acme",
    },
    title: "Pricing draft",
    notes: null,
    status: "DRAFT",
    currency: "SAR",
    pricingDate: "2026-06-22T00:00:00.000Z",
    calculationVersion: 1,
    lastCalculatedAt: "2026-06-22T01:00:00.000Z",
    createdAt: "2026-06-22T01:00:00.000Z",
    updatedAt: "2026-06-22T01:00:00.000Z",
    monthlySelections: [
      {
        monthlyServiceRevisionId: studioCatalog().monthlyServices[0]!.revision.id,
        serviceLevelId: studioCatalog().monthlyServices[0]!.revision.levels[0]!.id,
        quantity: 1,
      },
    ],
    oneTimeSelections: [],
    calculation: {
      calculatedAt: "2026-06-22T01:00:00.000Z",
      pricingDate: "2026-06-22T00:00:00.000Z",
      currency: "SAR",
      lines: [],
      appliedRules: [],
      totals: {
        subtotalMonthly: 6_000,
        subtotalSetup: 300,
        subtotalOneTime: 0,
        subtotal: 6_300,
        discountTotal: 0,
        finalBeforeTax: 6_300,
        taxTotal: 0,
        finalTotal: 6_300,
        internalCost: 2_000,
        marginAmount: 4_300,
        marginPct: 68.25,
        targetMarginPct: null,
        meetsTargetMargin: null,
      },
    },
  };
}

function jsonResponse(body: unknown, status = 200): Promise<Response> {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);
}

describe("PR 6 pricing UI", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    pushMock.mockReset();
    Object.defineProperty(global, "fetch", {
      configurable: true,
      writable: true,
      value: jest.fn(),
    });
  });

  it("creates a versioned Admin tax rule through the backend", async () => {
    const fetchMock = jest.mocked(fetch);
    fetchMock
      .mockImplementationOnce(() => jsonResponse({ id: "rule-2" }, 201))
      .mockImplementationOnce(() => jsonResponse(rulesSnapshot()));

    render(<PricingRuleManager initialSnapshot={rulesSnapshot()} />);
    fireEvent.click(screen.getByRole("button", { name: "Add pricing rule" }));
    expect(screen.getByRole("dialog", { name: "New pricing rule" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Code"), { target: { value: "price-tax-standard" } });
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Standard tax" } });
    fireEvent.change(screen.getByLabelText("Rule type"), { target: { value: "TAX" } });
    fireEvent.change(screen.getByLabelText("Calculation"), {
      target: { value: "PERCENTAGE" },
    });
    fireEvent.change(screen.getByLabelText("Value"), { target: { value: "15" } });
    fireEvent.change(screen.getByLabelText("Rule description or documentation formula"), {
      target: { value: "final_before_tax * 15%" },
    });
    fireEvent.change(screen.getByLabelText("Applies to"), {
      target: { value: "All pricing drafts" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create rule" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://localhost:4000/api/v1/admin/pricing-rules");
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      code: "PRICE-TAX-STANDARD",
      name: "Standard tax",
      ruleType: "TAX",
      calculationMethod: "PERCENTAGE",
      value: 15,
    });
  });

  it("recalculates selected services through the backend and saves a draft", async () => {
    const fetchMock = jest.mocked(fetch);
    const draft = savedDraft();
    fetchMock
      .mockImplementationOnce(() =>
        jsonResponse({ client: studioCatalog().clients[0], calculation: draft.calculation }),
      )
      .mockImplementationOnce(() => jsonResponse(draft, 201))
      .mockImplementationOnce(() =>
        jsonResponse([
          {
            id: draft.id,
            draftNumber: draft.draftNumber,
            title: draft.title,
            status: draft.status,
            currency: draft.currency,
            pricingDate: draft.pricingDate,
            calculationVersion: 1,
            lastCalculatedAt: draft.lastCalculatedAt,
            updatedAt: draft.updatedAt,
            client: draft.client,
            itemCount: 1,
            totals: draft.calculation?.totals ?? null,
          },
        ]),
      );

    render(
      <PricingStudio
        displayName="Pricing Admin"
        isAdmin
        initialCatalog={studioCatalog()}
        initialDrafts={[]}
      />,
    );
    expect(screen.queryByRole("heading", { name: "Selection summary" })).not.toBeInTheDocument();
    expect(screen.queryByText("Quote readiness")).not.toBeInTheDocument();
    expect(screen.getByText("Hourly rate")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Select Monthly operations"));
    expect(screen.getAllByText("Monthly operations").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Recalculate preview" }));

    await screen.findByText("Backend pricing preview recalculated.");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://localhost:4000/api/v1/pricing/preview");
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      clientId: studioCatalog().clients[0]!.id,
      pricingDate: expect.stringMatching(/T12:00:00\.000Z$/),
      monthlySelections: [
        {
          monthlyServiceRevisionId: studioCatalog().monthlyServices[0]!.revision.id,
          serviceLevelId: studioCatalog().monthlyServices[0]!.revision.levels[0]!.id,
          quantity: 1,
        },
      ],
      oneTimeSelections: [],
    });

    fireEvent.click(screen.getByRole("button", { name: "Save pricing draft" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[1]?.[0]).toBe("http://localhost:4000/api/v1/pricing/drafts");
    expect(replaceMock).toHaveBeenCalledWith(`/pricing/${draft.id}`);
  });

  it("opens saved drafts in a focused dialog and exposes an Arabic date preview", async () => {
    const draft = savedDraft();
    const summary = {
      calculationVersion: draft.calculationVersion,
      client: draft.client,
      currency: draft.currency,
      draftNumber: draft.draftNumber,
      id: draft.id,
      itemCount: 1,
      lastCalculatedAt: draft.lastCalculatedAt,
      pricingDate: draft.pricingDate,
      status: draft.status,
      title: draft.title,
      totals: draft.calculation?.totals ?? null,
      updatedAt: draft.updatedAt,
    };
    render(
      <PricingStudio
        displayName="Pricing Admin"
        isAdmin
        initialCatalog={studioCatalog()}
        initialDraft={draft}
        initialDrafts={[summary]}
        locale="ar"
      />,
    );

    const trigger = screen.getByRole("button", { name: /مسودات التسعير/ });
    expect(screen.queryByRole("dialog", { name: "مسودات التسعير" })).not.toBeInTheDocument();
    expect(screen.getByText(/22.*06.*2026/)).toBeInTheDocument();
    expect(screen.queryByText("06/22/2026")).not.toBeInTheDocument();

    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "مسودات التسعير" });
    expect(within(dialog).getByText("Pricing draft")).toBeInTheDocument();
    expect(within(dialog).getByText("PD-20260622-ABC12345")).toBeInTheDocument();
  });

  it("deletes the open pricing draft after a dedicated confirmation", async () => {
    const draft = savedDraft();
    const fetchMock = jest.mocked(fetch);
    fetchMock.mockImplementationOnce(() =>
      jsonResponse({ id: draft.id, draftNumber: draft.draftNumber }),
    );

    render(
      <PricingStudio
        displayName="مسؤول التسعير"
        isAdmin
        initialCatalog={studioCatalog()}
        initialDraft={draft}
        initialDrafts={[]}
        locale="ar"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "حذف المسودة" }));
    const dialog = await screen.findByRole("dialog", { name: "حذف مسودة التسعير" });
    expect(within(dialog).getByText(draft.draftNumber)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "حذف المسودة نهائيًا" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      `http://localhost:4000/api/v1/pricing/drafts/${draft.id}`,
    );
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "DELETE" });
    expect(replaceMock).toHaveBeenCalledWith("/pricing");
  });

  it("localizes legacy English catalog categories in the Arabic pricing experience", () => {
    render(
      <PricingStudio
        displayName="مسؤول التسعير"
        isAdmin
        initialCatalog={studioCatalog()}
        initialDrafts={[]}
        locale="ar"
      />,
    );

    expect(screen.getAllByText("العمليات").length).toBeGreaterThan(0);
    expect(screen.queryByText("Operations")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /خدمات المرة الواحدة/ }));
    expect(screen.getAllByText("البناء والتطوير").length).toBeGreaterThan(0);
    expect(screen.queryByText("Build")).not.toBeInTheDocument();
  });

  it("creates a new client inside pricing and selects it for the draft", async () => {
    const fetchMock = jest.mocked(fetch);
    fetchMock.mockImplementationOnce(() =>
      jsonResponse(
        {
          id: "77777777-7777-4777-8777-777777777777",
          code: "NEW-CLIENT",
          name: "New Client",
          legalName: "New Client LLC",
          sector: "HR",
          city: "Riyadh",
          authorizedApprover: "New Approver",
        },
        201,
      ),
    );

    render(
      <PricingStudio
        displayName="Pricing Admin"
        isAdmin
        initialCatalog={studioCatalog()}
        initialDrafts={[]}
        openClientCreator
      />,
    );

    expect(screen.getByText("Create a new client inside pricing")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Client code"), { target: { value: "new-client" } });
    fireEvent.change(screen.getByLabelText("Client name"), { target: { value: "New Client" } });
    fireEvent.change(screen.getByLabelText("Sector"), { target: { value: "HR" } });
    fireEvent.change(screen.getByLabelText("Approver"), { target: { value: "New Approver" } });
    fireEvent.click(screen.getByRole("button", { name: "Create client" }));

    await screen.findByText("Client created and selected for this draft.");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://localhost:4000/api/v1/admin/clients");
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      code: "NEW-CLIENT",
      name: "New Client",
      sector: "HR",
      authorizedApprover: "New Approver",
      status: "ACTIVE",
    });
    expect(screen.getByLabelText("Client")).toHaveValue("77777777-7777-4777-8777-777777777777");
  });

  it("creates a quote snapshot from a saved pricing draft", async () => {
    const fetchMock = jest.mocked(fetch);
    const draft = savedDraft();
    fetchMock.mockImplementationOnce(() =>
      jsonResponse({ id: "66666666-6666-4666-8666-666666666666" }, 201),
    );

    render(
      <PricingStudio
        displayName="Pricing Admin"
        isAdmin
        initialCatalog={studioCatalog()}
        initialDrafts={[]}
        initialDraft={draft}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Create quote" }));
    fireEvent.change(screen.getByLabelText("Payment terms"), {
      target: { value: "50% upfront" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create quote snapshot" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://localhost:4000/api/v1/quotes");
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      pricingDraftId: draft.id,
      validityDays: 30,
      terms: { paymentTerms: "50% upfront" },
    });
    expect(pushMock).toHaveBeenCalledWith("/pricing/quotes/66666666-6666-4666-8666-666666666666");
  });

  it("prevents issuing a stale quote until current draft changes are saved", () => {
    const draft = savedDraft();

    render(
      <PricingStudio
        displayName="Pricing Admin"
        isAdmin
        initialCatalog={studioCatalog()}
        initialDrafts={[]}
        initialDraft={draft}
      />,
    );

    const createQuote = screen.getByRole("button", { name: "Create quote" });
    expect(createQuote).toBeEnabled();

    fireEvent.change(screen.getByLabelText("Draft title"), {
      target: { value: "Updated commercial scope" },
    });

    expect(screen.getByText("You have unsaved changes")).toBeInTheDocument();
    expect(createQuote).toBeDisabled();
  });

  it("keeps monthly services without active packages visible but unavailable", () => {
    const catalog = studioCatalog();
    catalog.monthlyServices[0]!.revision.levels = [];

    render(
      <PricingStudio
        displayName="Pricing Admin"
        isAdmin
        initialCatalog={catalog}
        initialDrafts={[]}
      />,
    );

    expect(
      screen.getByText("This service has no active packages. Review its setup before adding it."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Select Monthly operations")).toBeDisabled();
  });
});
