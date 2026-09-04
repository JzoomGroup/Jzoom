import { createWorkerApplication } from "../src/bootstrap.js";

describe("worker application", () => {
  it("starts with no registered business jobs and closes cleanly", async () => {
    const app = await createWorkerApplication({
      databaseUrl: "postgresql://jzoom:test@localhost:5432/jzoom",
      nodeEnvironment: "test",
      workerName: "jzoom-worker-test",
      outboxEnabled: false,
      outboxPollIntervalMs: 5_000,
      outboxBatchSize: 20,
      outboxMaxAttempts: 10,
      outboxLeaseMs: 30_000,
    });

    expect(app).toBeDefined();
    await expect(app.close()).resolves.toBeUndefined();
  });
});
