import { jest } from "@jest/globals";
import { OperationsHealthController } from "../src/health/operations-health.controller.js";

describe("OperationsHealthController", () => {
  it("reports ready, delayed, and recent outbox activity", async () => {
    const occurredAt = new Date("2026-09-05T09:00:00.000Z");
    const processedAt = new Date("2026-09-05T09:05:00.000Z");
    const outboxEvent = {
      count: jest
        .fn<() => Promise<number>>()
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(0),
      aggregate: jest.fn(async () => ({ _max: { attemptCount: 4 } })),
      findFirst: jest
        .fn<() => Promise<Record<string, Date | null> | null>>()
        .mockResolvedValueOnce({ occurredAt })
        .mockResolvedValueOnce({ processedAt }),
    };
    const controller = new OperationsHealthController({ prisma: { outboxEvent } } as never);

    await expect(controller.getStatus()).resolves.toMatchObject({
      status: "attention",
      outbox: {
        pending: 3,
        ready: 1,
        scheduledForRetry: 2,
        inFlight: 0,
        maxAttemptCount: 4,
        oldestPendingAt: occurredAt.toISOString(),
        lastProcessedAt: processedAt.toISOString(),
      },
    });
  });

  it("reports a healthy empty queue", async () => {
    const outboxEvent = {
      count: jest.fn(async () => 0),
      aggregate: jest.fn(async () => ({ _max: { attemptCount: null } })),
      findFirst: jest.fn(async () => null),
    };
    const controller = new OperationsHealthController({ prisma: { outboxEvent } } as never);

    await expect(controller.getStatus()).resolves.toMatchObject({
      status: "ok",
      outbox: {
        pending: 0,
        ready: 0,
        scheduledForRetry: 0,
        inFlight: 0,
        maxAttemptCount: 0,
        oldestPendingAt: null,
        lastProcessedAt: null,
      },
    });
  });
});
