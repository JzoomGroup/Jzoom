import "dotenv/config";
import "reflect-metadata";
import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseApiEnvironment } from "@jzoom/config";
import { createApiApplication } from "../src/bootstrap.js";
import { createOpenApiDocument } from "../src/swagger/openapi.js";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(scriptDirectory, "..", "openapi.json");

async function generateOpenApi(): Promise<void> {
  const environment = parseApiEnvironment(process.env);
  const app = await createApiApplication(environment, {
    enableOpenApiUi: false,
  });

  await app.init();
  const document = createOpenApiDocument(app);
  await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
  await app.close();
}

void generateOpenApi().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
