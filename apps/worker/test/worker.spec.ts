import { createWorkerApplication } from "../src/bootstrap.js";

describe("worker application", () => {
  it("starts with no registered business jobs and closes cleanly", async () => {
    const app = await createWorkerApplication({
      nodeEnvironment: "test",
      workerName: "jzoom-worker-test",
    });

    expect(app).toBeDefined();
    await expect(app.close()).resolves.toBeUndefined();
  });
});
