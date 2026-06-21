import "dotenv/config";
import "reflect-metadata";
import { ConsoleLogger } from "@nestjs/common";
import { parseWorkerEnvironment } from "@jzoom/config";
import { createWorkerApplication } from "./bootstrap.js";

const startupLogger = new ConsoleLogger("JzoomWorkerBootstrap", {
  json: true,
  timestamp: true,
});

async function waitForShutdownSignal(): Promise<NodeJS.Signals> {
  return new Promise((resolve) => {
    process.once("SIGINT", () => resolve("SIGINT"));
    process.once("SIGTERM", () => resolve("SIGTERM"));
  });
}

async function bootstrap(): Promise<void> {
  const environment = parseWorkerEnvironment(process.env);
  const app = await createWorkerApplication(environment);
  const signal = await waitForShutdownSignal();

  startupLogger.log({
    event: "worker_shutdown_requested",
    signal,
  });
  await app.close();
}

void bootstrap().catch((error: unknown) => {
  startupLogger.error({
    event: "worker_start_failed",
    error: error instanceof Error ? error.message : "Unknown startup failure",
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exitCode = 1;
});
