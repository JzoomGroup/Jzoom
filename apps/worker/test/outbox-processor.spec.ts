import { jest } from "@jest/globals";
import type { WorkerEnvironment } from "@jzoom/config";
import { OutboxProcessorService } from "../src/outbox-processor.service.js";

const environment: WorkerEnvironment = {
  databaseUrl: "postgresql://jzoom:test@localhost:5432/jzoom",
  nodeEnvironment: "test",
  workerName: "jzoom-worker-test",
  outboxEnabled: true,
  outboxPollIntervalMs: 5_000,
  outboxBatchSize: 20,
  outboxMaxAttempts: 10,
  outboxLeaseMs: 30_000,
};

function databaseFor(payload: Record<string, unknown>) {
  const outboxEvent = {
    findMany: jest.fn(async () => [{ id: "event-1" }]),
    findUnique: jest.fn(async () => ({
      id: "event-1",
      eventType: "REQUEST_UPDATED",
      payload,
      attemptCount: 1,
    })),
    update: jest.fn(async () => ({})),
    updateMany: jest.fn(async () => ({ count: 1 })),
  };
  return {
    database: { prisma: { outboxEvent } },
    outboxEvent,
  };
}

describe("OutboxProcessorService", () => {
  it("claims and acknowledges in-app notification events", async () => {
    const { database, outboxEvent } = databaseFor({
      channelReadiness: { email: false, inApp: true, sms: false, whatsapp: false },
    });
    const service = new OutboxProcessorService(environment, database as never);

    await expect(service.processOnce()).resolves.toEqual({ claimed: 1, failed: 0, processed: 1 });
    expect(outboxEvent.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ attemptCount: { increment: 1 } }),
      }),
    );
    expect(outboxEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lastError: null, processedAt: expect.any(Date) }),
      }),
    );
  });

  it("releases failed events with a retry delay and bounded error", async () => {
    const { database, outboxEvent } = databaseFor({
      channelReadiness: { email: true, inApp: true, sms: false, whatsapp: false },
    });
    const service = new OutboxProcessorService(environment, database as never);

    await expect(service.processOnce()).resolves.toEqual({ claimed: 1, failed: 1, processed: 0 });
    expect(outboxEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          availableAt: expect.any(Date),
          lastError: expect.stringContaining("No external delivery adapter"),
        }),
      }),
    );
  });

  it("does not acknowledge an event without a supported channel", async () => {
    const { database, outboxEvent } = databaseFor({ channelReadiness: { inApp: false } });
    const service = new OutboxProcessorService(environment, database as never);

    await expect(service.processOnce()).resolves.toEqual({ claimed: 1, failed: 1, processed: 0 });
    expect(outboxEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lastError: expect.stringContaining("no supported") }),
      }),
    );
  });
});
