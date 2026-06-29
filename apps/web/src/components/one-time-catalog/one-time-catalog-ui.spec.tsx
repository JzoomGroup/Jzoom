import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { OneTimeCatalogSnapshot } from "../../lib/one-time-catalog-types";
import { OneTimeCategoryManager } from "./one-time-category-manager";
import { OneTimeServiceManager } from "./one-time-service-manager";

function snapshot(): OneTimeCatalogSnapshot {
  return {
    servicePaths: ["Build", "Digital"],
    categories: [
      {
        id: "category-1",
        code: "OT-CAT-BUILD",
        nameAr: "بناء",
        nameEn: "Build",
        description: "Build services",
        status: "ACTIVE",
        sortOrder: 0,
        serviceCount: 1,
        archivedAt: null,
      },
    ],
    services: [
      {
        id: "service-1",
        categoryId: "category-1",
        category: {
          id: "category-1",
          code: "OT-CAT-BUILD",
          nameAr: "بناء",
          nameEn: "Build",
        },
        code: "OT-BUILD-WEBSITE",
        serviceLine: "Build",
        status: "ACTIVE",
        sortOrder: 0,
        archivedAt: null,
        revision: {
          id: "revision-1",
          version: 1,
          status: "ACTIVE",
          effectiveFrom: null,
          effectiveTo: null,
          nameAr: "بناء موقع",
          nameEn: "Website build",
          description: "A complete website build.",
          basePriceSar: 12000,
          estimatedHours: 80,
          internalHourlyCostSar: 120,
          durationDays: 30,
          visibleInPricing: true,
          createsProject: true,
          phases: [
            {
              id: "phase-1",
              code: "PHASE-DISCOVERY",
              nameAr: "الاكتشاف",
              nameEn: "Discovery",
              description: null,
              sortOrder: 0,
              isRequired: true,
              status: "ACTIVE",
            },
          ],
          deliverables: [
            {
              id: "deliverable-1",
              phaseId: "phase-1",
              phaseCode: "PHASE-DISCOVERY",
              code: "DEL-BRIEF",
              nameAr: "موجز المشروع",
              nameEn: "Project brief",
              description: null,
              sortOrder: 0,
              isRequired: true,
              requiresClientApproval: true,
              status: "ACTIVE",
              tasks: [
                {
                  id: "task-1",
                  code: "TASK-INTERVIEW",
                  nameAr: "مقابلة",
                  nameEn: "Stakeholder interview",
                  description: null,
                  estimatedHours: 4,
                  sortOrder: 0,
                  isRequired: true,
                  status: "ACTIVE",
                },
              ],
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

describe("One-time Admin catalog UI", () => {
  beforeEach(() => {
    Object.defineProperty(global, "fetch", {
      configurable: true,
      writable: true,
      value: jest.fn(),
    });
  });

  it("creates a localized category through the backend and refreshes data", async () => {
    const fetchMock = jest.mocked(fetch);
    fetchMock
      .mockImplementationOnce(() => jsonResponse({ id: "category-2" }))
      .mockImplementationOnce(() => jsonResponse(snapshot()));

    render(<OneTimeCategoryManager initialSnapshot={snapshot()} />);
    expect(screen.getByText("One-time category studio")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: "Configured categories" })).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Add category" }));
    fireEvent.change(screen.getByLabelText("Code"), {
      target: { value: "pr5-cat-digital" },
    });
    fireEvent.change(screen.getByLabelText("Arabic name"), {
      target: { value: "رقمي" },
    });
    fireEvent.change(screen.getByLabelText("English name"), {
      target: { value: "Digital" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create category" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://localhost:4000/api/v1/admin/catalog/one-time/categories",
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      code: "PR5-CAT-DIGITAL",
      nameAr: "رقمي",
      nameEn: "Digital",
    });
  });

  it("renders seeded services and saves pricing plus nested templates through APIs", async () => {
    const fetchMock = jest.mocked(fetch);
    fetchMock
      .mockImplementationOnce(() => jsonResponse({ id: "revision-2" }))
      .mockImplementationOnce(() => jsonResponse(snapshot()));

    render(<OneTimeServiceManager initialSnapshot={snapshot()} />);
    expect(screen.getByText("One-time service studio")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: "Configured one-time services" })).toHaveLength(
      2,
    );
    expect(screen.getByRole("heading", { name: "Website build" })).toBeInTheDocument();
    expect(screen.getAllByText("12000 SAR").length).toBeGreaterThan(0);
    expect(screen.getByText("Template links")).toBeInTheDocument();
    expect(screen.getByText("Deliverables and tasks")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit details & template" }));
    expect(screen.getByDisplayValue("Stakeholder interview")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create revision" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://localhost:4000/api/v1/services/one-time/service-1",
    );
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body).toMatchObject({
      categoryId: "category-1",
      serviceLine: "Build",
      basePriceSar: 12000,
      estimatedHours: 80,
      internalHourlyCostSar: 120,
      durationDays: 30,
    });
    expect(body.phases[0].code).toBe("PHASE-DISCOVERY");
    expect(body.deliverables[0].tasks[0].code).toBe("TASK-INTERVIEW");
  });
});
