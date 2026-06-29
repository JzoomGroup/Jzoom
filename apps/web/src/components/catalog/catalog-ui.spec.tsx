import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AdminShell } from "../admin-shell";
import type { CatalogSnapshot } from "../../lib/catalog-types";
import { CatalogOverview } from "./catalog-overview";
import { CategoryManager } from "./category-manager";
import { ItemManager } from "./item-manager";
import { LevelManager } from "./level-manager";
import { ServiceManager } from "./service-manager";

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
}));

function catalogSnapshot(): CatalogSnapshot {
  return {
    categories: [
      {
        id: "category-1",
        code: "CAT-HR",
        nameAr: "الموارد البشرية",
        nameEn: "Human Resources",
        description: "People operations services.",
        status: "ACTIVE",
        sortOrder: 1,
        serviceCount: 1,
        archivedAt: null,
      },
    ],
    levels: [
      {
        id: "level-basic",
        code: "BASIC",
        labelAr: "أساسي",
        labelEn: "Basic",
        purpose: "Essential support",
        slaRule: null,
        scopeRule: null,
        governanceRule: null,
        isCustom: false,
        status: "ACTIVE",
        sortOrder: 1,
        archivedAt: null,
      },
    ],
    services: [
      {
        id: "service-1",
        categoryId: "category-1",
        category: {
          id: "category-1",
          code: "CAT-HR",
          nameAr: "الموارد البشرية",
          nameEn: "Human Resources",
        },
        code: "MS-HR",
        externalId: null,
        status: "ACTIVE",
        sortOrder: 1,
        archivedAt: null,
        itemCount: 1,
        revision: {
          id: "service-revision-1",
          version: 1,
          status: "ACTIVE",
          nameAr: "دعم الموارد البشرية",
          nameEn: "HR Support",
          description: "Monthly HR support.",
          visibleInPricing: true,
          sellingHourlyRateSar: 250,
          internalHourlyCostSar: 100,
          setupFeePct: 5,
          defaultSlaHours: 48,
          deductHours: true,
          requiresSupervisor: false,
          requiresManagement: false,
          clientApprovalRequired: false,
          effectiveFrom: null,
          effectiveTo: null,
          levelConfigs: [
            {
              serviceLevelId: "level-basic",
              serviceLevelCode: "BASIC",
              serviceLevelLabelAr: "أساسي",
              serviceLevelLabelEn: "Basic",
              hours: 10,
              slaHours: 48,
              isEnabled: true,
              sortOrder: 1,
            },
          ],
        },
      },
    ],
    items: [
      {
        id: "item-1",
        code: "ITEM-ONE",
        monthlyServiceId: "service-1",
        monthlyService: {
          id: "service-1",
          code: "MS-HR",
          status: "ACTIVE",
          nameAr: "دعم الموارد البشرية",
          nameEn: "HR Support",
        },
        status: "ACTIVE",
        sortOrder: 1,
        archivedAt: null,
        revision: {
          id: "item-revision-1",
          version: 1,
          status: "ACTIVE",
          nameAr: "تهيئة الموظف",
          nameEn: "Employee onboarding",
          expectedOutput: "Completed onboarding checklist.",
          visibleInQuote: true,
          requiresFile: false,
          deductHours: true,
          requestType: "ONBOARDING",
          effectiveFrom: null,
          effectiveTo: null,
          levelInclusions: [
            {
              serviceLevelId: "level-basic",
              serviceLevelCode: "BASIC",
              serviceLevelLabelAr: "أساسي",
              serviceLevelLabelEn: "Basic",
              included: true,
              sortOrder: 1,
            },
          ],
        },
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

describe("Admin catalog UI", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    Object.defineProperty(global, "fetch", {
      configurable: true,
      writable: true,
      value: jest.fn(),
    });
  });

  it("renders the protected Admin navigation with its active catalog area", () => {
    render(
      <AdminShell activePath="/admin/catalog/service-items" displayName="Admin User">
        <p>Catalog content</p>
      </AdminShell>,
    );

    expect(screen.getByText("Admin Console")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Service items" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/settings");
    expect(screen.getByRole("link", { name: "Platform configuration" })).toHaveAttribute(
      "href",
      "/admin/platform-configuration",
    );
    expect(screen.getByRole("link", { name: "Request templates" })).toHaveAttribute(
      "href",
      "/admin/request-templates",
    );
  });

  it("localizes the admin shell for Arabic RTL users", () => {
    const { container } = render(
      <AdminShell activePath="/admin/clients" displayName="Faisal" locale="ar-SA">
        <p>Admin content</p>
      </AdminShell>,
    );

    expect(container.firstElementChild).toHaveAttribute("dir", "rtl");
    expect(container.firstElementChild).toHaveAttribute("lang", "ar");
    expect(screen.getByRole("navigation", { name: "إدارة المنصة" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "لوحة التحكم" })).toHaveAttribute("href", "/admin");
    expect(screen.getByRole("link", { name: "العملاء" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "الإعدادات" })).toHaveAttribute("href", "/settings");
    expect(screen.getByRole("button", { name: "تسجيل الخروج" })).toBeInTheDocument();
  });

  it("renders the current seeded catalog snapshot instead of hardcoded cards", () => {
    render(<CatalogOverview snapshot={catalogSnapshot()} />);

    expect(
      screen.getByRole("row", { name: /HR Support MS-HR Human Resources/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("MS-HR")).toBeInTheDocument();
    expect(screen.getAllByText("1 active")).toHaveLength(2);
  });

  it("creates a category through the catalog API and refreshes the snapshot", async () => {
    const fetchMock = jest.mocked(fetch);
    fetchMock
      .mockImplementationOnce(() => jsonResponse({ id: "category-2" }))
      .mockImplementationOnce(() => jsonResponse(catalogSnapshot()));
    const setSnapshot = jest.fn();

    render(<CategoryManager snapshot={catalogSnapshot()} setSnapshot={setSnapshot} />);

    fireEvent.click(screen.getByRole("button", { name: "Add category" }));
    fireEvent.change(screen.getByLabelText("Code"), {
      target: { value: "cat-finance" },
    });
    fireEvent.change(screen.getByLabelText("Arabic name"), {
      target: { value: "المالية" },
    });
    fireEvent.change(screen.getByLabelText("English name"), {
      target: { value: "Finance" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create category" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://localhost:4000/api/v1/admin/catalog/categories",
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      code: "CAT-FINANCE",
      nameAr: "المالية",
      nameEn: "Finance",
      status: "DRAFT",
    });
    expect(fetchMock.mock.calls[1]?.[0]).toBe("http://localhost:4000/api/v1/admin/catalog");
    expect(setSnapshot).toHaveBeenCalledWith(catalogSnapshot());
  });

  it("updates package inclusion through the revision-safe matrix API", async () => {
    const fetchMock = jest.mocked(fetch);
    fetchMock
      .mockImplementationOnce(() => jsonResponse({ id: "item-revision-2" }))
      .mockImplementationOnce(() => jsonResponse(catalogSnapshot()));
    const setSnapshot = jest.fn();

    render(<ItemManager snapshot={catalogSnapshot()} setSnapshot={setSnapshot} />);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Remove ITEM-ONE from BASIC",
      }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://localhost:4000/api/v1/service-items/item-1/levels",
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      levelInclusions: [
        {
          serviceLevelId: "level-basic",
          included: false,
          sortOrder: 1,
        },
      ],
    });
    expect(setSnapshot).toHaveBeenCalledWith(catalogSnapshot());
  });

  it("renders the package studio and opens the service-level form", () => {
    const setSnapshot = jest.fn();

    render(<LevelManager snapshot={catalogSnapshot()} setSnapshot={setSnapshot} locale="en" />);

    expect(screen.getByText("Package studio")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: "Configured packages" })).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "Basic" })).toBeInTheDocument();
    expect(screen.getAllByText("Linked services").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Add service level" }));

    expect(screen.getByRole("heading", { name: "New service level" })).toBeInTheDocument();
    expect(screen.getByLabelText("Code")).toBeInTheDocument();
  });

  it("renders the monthly service studio and opens the service form", () => {
    const setSnapshot = jest.fn();

    render(<ServiceManager snapshot={catalogSnapshot()} setSnapshot={setSnapshot} locale="en" />);

    expect(screen.getByText("Monthly service studio")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: "Configured services" })).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "HR Support" })).toBeInTheDocument();
    expect(screen.getByText("Monthly HR support.")).toBeInTheDocument();
    expect(screen.getByText("Enabled package links")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add monthly service" }));

    expect(screen.getByRole("heading", { name: "New monthly service" })).toBeInTheDocument();
    expect(screen.getByLabelText("Code")).toBeInTheDocument();
    expect(screen.getByText("Monthly hours by package")).toBeInTheDocument();
  });

  it("renders the service item studio and opens the item form", () => {
    const setSnapshot = jest.fn();

    render(<ItemManager snapshot={catalogSnapshot()} setSnapshot={setSnapshot} locale="en" />);

    expect(screen.getByText("Service item studio")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: "Package inclusion matrix" })).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "Employee onboarding" })).toBeInTheDocument();
    expect(screen.getByText("Completed onboarding checklist.")).toBeInTheDocument();
    expect(screen.getByText("Included package links")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add service item" }));

    expect(screen.getByRole("heading", { name: "New service item" })).toBeInTheDocument();
    expect(screen.getByLabelText("Code")).toBeInTheDocument();
    expect(screen.getAllByText("Package inclusion").length).toBeGreaterThan(0);
  });
});
