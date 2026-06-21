import "dotenv/config";
import "reflect-metadata";
import { ConsoleLogger } from "@nestjs/common";
import { parseApiEnvironment } from "@jzoom/config";
import { createApiApplication } from "./bootstrap.js";

const startupLogger = new ConsoleLogger("JzoomApiBootstrap", {
  json: true,
  timestamp: true,
});

async function bootstrap(): Promise<void> {
  const environment = parseApiEnvironment(process.env);
  const app = await createApiApplication(environment);

  await app.listen(environment.port, "0.0.0.0");
  startupLogger.log({
    event: "api_started",
    port: environment.port,
    environment: environment.nodeEnvironment,
    openApiUiEnabled: environment.openApiEnabled && environment.nodeEnvironment !== "production",
  });
}

void bootstrap().catch((error: unknown) => {
  startupLogger.error({
    event: "api_start_failed",
    error: error instanceof Error ? error.message : "Unknown startup failure",
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exitCode = 1;
});
