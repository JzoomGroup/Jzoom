import type { INestApplicationContext } from "@nestjs/common";
import { ConsoleLogger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { WorkerEnvironment } from "@jzoom/config";
import { WorkerModule } from "./worker.module.js";

export async function createWorkerApplication(
  environment: WorkerEnvironment,
): Promise<INestApplicationContext> {
  const logger = new ConsoleLogger(environment.workerName, {
    json: true,
    timestamp: true,
  });
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger,
  });

  app.enableShutdownHooks();
  logger.log({
    event: "worker_started",
    workerName: environment.workerName,
    environment: environment.nodeEnvironment,
    jobsRegistered: 0,
  });

  return app;
}
