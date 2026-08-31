import "reflect-metadata";
import { ConflictException } from "@nestjs/common";
import { jest } from "@jest/globals";
import type { AuthAuditService } from "../src/auth/audit.service.js";
import type { DatabaseService } from "../src/database/database.service.js";
import type { ImportOneTimeCatalogDto } from "../src/one-time-catalog/one-time-catalog.dto.js";
import { OneTimeCatalogService } from "../src/one-time-catalog/one-time-catalog.service.js";

function input(): ImportOneTimeCatalogDto {
  return {
    format: "jzoom-one-time-catalog",
    version: 1,
    services: [
      {
        code: "ot-import",
        categoryCode: "ot-category",
        serviceLine: "Build",
        status: "ACTIVE",
        sortOrder: 0,
        nameAr: "خدمة مستوردة",
        nameEn: "Imported service",
        description: "Imported safely",
        basePriceSar: 1_000,
        estimatedHours: 10,
        internalHourlyCostSar: 50,
        durationDays: 5,
        visibleInPricing: true,
        createsProject: true,
        phases: [
          {
            code: "phase-1",
            nameAr: "مرحلة",
            nameEn: "Phase",
            isRequired: true,
            status: "ACTIVE",
          },
        ],
        deliverables: [
          {
            code: "deliverable-1",
            phaseCode: "phase-1",
            nameAr: "مخرج",
            nameEn: "Deliverable",
            isRequired: true,
            status: "ACTIVE",
            tasks: [],
          },
        ],
      },
    ],
  };
}

function setup(existingCodes: string[] = []) {
  const transaction = {
    oneTimeService: {
      create: jest.fn(async () => ({ id: "service-1" })),
    },
    oneTimeServiceRevision: {
      create: jest.fn(async () => ({ id: "revision-1" })),
    },
    oneTimeServicePhase: {
      create: jest.fn(async () => ({ id: "phase-1", code: "PHASE-1" })),
    },
    oneTimeServiceDeliverable: {
      create: jest.fn(async () => ({ id: "deliverable-1" })),
    },
    oneTimeServiceTask: { createMany: jest.fn(async () => ({ count: 0 })) },
  };
  const database = {
    prisma: {
      oneTimeServiceCategory: {
        findMany: jest.fn(async () => [
          { id: "category-1", code: "OT-CATEGORY", status: "ACTIVE" },
        ]),
      },
      oneTimeService: {
        findMany: jest.fn(async () => existingCodes.map((code) => ({ code }))),
      },
      $transaction: jest.fn(async (work: (client: typeof transaction) => Promise<unknown>) =>
        work(transaction),
      ),
    },
  } as unknown as DatabaseService;
  const audit = { record: jest.fn(async () => undefined) } as unknown as AuthAuditService;
  const service = new OneTimeCatalogService(database, audit);
  jest.spyOn(service, "getSnapshot").mockResolvedValue({
    servicePaths: ["Build", "Digital"],
    categories: [],
    services: [],
  });
  return { audit, database, service, transaction };
}

describe("one-time catalog import", () => {
  it("normalizes and creates a complete service in one transaction", async () => {
    const { audit, database, service, transaction } = setup();

    await service.importCatalog(input(), "admin-1", { requestId: "request-1" });

    expect(database.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(transaction.oneTimeService.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ code: "OT-IMPORT" }) }),
    );
    expect(transaction.oneTimeServicePhase.create).toHaveBeenCalled();
    expect(transaction.oneTimeServiceDeliverable.create).toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventCode: "CATALOG_ONE_TIME_SERVICES_IMPORTED" }),
      { requestId: "request-1" },
    );
  });

  it("rejects existing service codes before opening a transaction", async () => {
    const { database, service } = setup(["OT-IMPORT"]);

    await expect(service.importCatalog(input(), "admin-1", {})).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(database.prisma.$transaction).not.toHaveBeenCalled();
  });
});
