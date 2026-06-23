import "reflect-metadata";
import { BadRequestException } from "@nestjs/common";
import { jest } from "@jest/globals";
import type { AuthAuditService } from "../src/auth/audit.service.js";
import type { DatabaseService } from "../src/database/database.service.js";
import { PLATFORM_CONFIGURATION_EVENT } from "../src/platform-configuration/platform-configuration.constants.js";
import { PlatformConfigurationService } from "../src/platform-configuration/platform-configuration.service.js";

function setting(overrides: Record<string, unknown> = {}) {
  return {
    id: "setting-1",
    key: "platform.name",
    category: "platform",
    valueType: "STRING",
    isSensitive: false,
    status: "ACTIVE",
    sortOrder: 0,
    createdAt: new Date("2026-06-23T00:00:00.000Z"),
    updatedAt: new Date("2026-06-23T00:00:00.000Z"),
    revisions: [
      {
        id: "setting-revision-1",
        version: 1,
        status: "ACTIVE",
        value: "Jzoom",
        reason: null,
        effectiveFrom: new Date("2026-06-23T00:00:00.000Z"),
        effectiveTo: null,
      },
    ],
    ...overrides,
  };
}

function databaseMock() {
  const createdSetting = setting();
  return {
    prisma: {
      platformSetting: {
        create: jest.fn(async () => createdSetting),
        findMany: jest.fn(async () => [createdSetting]),
      },
      notificationTemplate: { findMany: jest.fn(async () => []) },
      pdfTemplate: { findMany: jest.fn(async () => []) },
      workflowDefinition: { findMany: jest.fn(async () => []) },
      translationRevision: { findMany: jest.fn(async () => []) },
    },
  };
}

describe("PR 18 platform configuration foundation", () => {
  it("creates PostgreSQL-backed settings and records Admin audit events", async () => {
    const database = databaseMock() as unknown as DatabaseService;
    const audit = { record: jest.fn(async () => undefined) } as unknown as AuthAuditService;
    const service = new PlatformConfigurationService(database, audit);

    const result = await service.createSetting(
      {
        key: "Platform.Name",
        category: "Platform",
        valueType: "STRING",
        value: "Jzoom",
        reason: "test",
      },
      "actor-1",
      { requestId: "request-1" },
    );

    expect(result.settings).toHaveLength(1);
    expect(database.prisma.platformSetting.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          key: "platform.name",
          category: "platform",
          revisions: expect.objectContaining({
            create: expect.objectContaining({ status: "ACTIVE", value: "Jzoom" }),
          }),
        }),
      }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventCode: PLATFORM_CONFIGURATION_EVENT.settingCreated,
        entityType: "PlatformSetting",
        actorId: "actor-1",
      }),
      { requestId: "request-1" },
    );
  });

  it("rejects setting values that do not match the configured value type", async () => {
    const database = databaseMock() as unknown as DatabaseService;
    const audit = { record: jest.fn(async () => undefined) } as unknown as AuthAuditService;
    const service = new PlatformConfigurationService(database, audit);

    await expect(
      service.createSetting(
        {
          key: "platform.tax.enabled",
          category: "platform",
          valueType: "BOOLEAN",
          value: "yes",
        },
        "actor-1",
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
