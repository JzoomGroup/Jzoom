import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from "@nestjs/swagger";

export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const configuration = new DocumentBuilder()
    .setTitle("Jzoom Operating Platform API")
    .setDescription("REST API foundation for the Jzoom Operating Platform.")
    .setVersion("1.0")
    .addTag("health", "Process and dependency health checks")
    .build();

  return SwaggerModule.createDocument(app, configuration, {
    operationIdFactory: (controllerKey, methodKey) => `${controllerKey}_${methodKey}`,
  });
}

export function setupOpenApiUi(app: INestApplication): void {
  SwaggerModule.setup("docs", app, () => createOpenApiDocument(app), {
    customSiteTitle: "Jzoom API Documentation",
  });
}
