import "reflect-metadata";
import { jest } from "@jest/globals";
import type { DatabaseService } from "../src/database/database.service.js";
import { RuntimePlatformSettingsService } from "../src/platform-configuration/runtime-platform-settings.service.js";

function serviceWith(value: unknown) {
  const database = {
    prisma: {
      platformSetting: {
        findFirst: jest.fn(async () => ({ revisions: [{ value }] })),
      },
    },
  } as unknown as DatabaseService;
  return { database, service: new RuntimePlatformSettingsService(database) };
}

describe("RuntimePlatformSettingsService", () => {
  it("reads only the current effective active revision", async () => {
    const { database, service } = serviceWith(30);

    await expect(
      service.number("pricing.quote.validity_days", { fallback: 14, minimum: 1, maximum: 365 }),
    ).resolves.toBe(30);
    expect(database.prisma.platformSetting.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: "pricing.quote.validity_days", status: "ACTIVE" },
        select: expect.objectContaining({ revisions: expect.objectContaining({ take: 1 }) }),
      }),
    );
  });

  it("clamps numeric settings and falls back for invalid values", async () => {
    await expect(
      serviceWith(999).service.number("sla.default_days", {
        fallback: 0,
        minimum: 0,
        maximum: 365,
      }),
    ).resolves.toBe(365);
    await expect(
      serviceWith("invalid").service.number("sla.default_days", {
        fallback: 7,
        minimum: 0,
        maximum: 365,
      }),
    ).resolves.toBe(7);
  });

  it("normalizes MIME arrays and rejects empty configured arrays", async () => {
    await expect(
      serviceWith([" Application/PDF ", "image/*", "application/pdf", 7]).service.stringArray(
        "attachments.allowed_mime_types",
        ["text/plain"],
      ),
    ).resolves.toEqual(["application/pdf", "image/*"]);
    await expect(
      serviceWith([]).service.stringArray("attachments.allowed_mime_types", ["text/plain"]),
    ).resolves.toEqual(["text/plain"]);
  });
});
