import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from "@nestjs/swagger";

export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const configuration = new DocumentBuilder()
    .setTitle("Jzoom Operating Platform API")
    .setDescription("REST API foundation for the Jzoom Operating Platform.")
    .setVersion("1.0")
    .addCookieAuth("jzoom_session")
    .addApiKey({ type: "apiKey", in: "header", name: "X-CSRF-Token" }, "csrf")
    .addTag("health", "Process and dependency health checks")
    .addTag("authentication", "Authentication, sessions, and authorization")
    .addTag(
      "admin-monthly-catalog",
      "Admin-only monthly services, items, categories, and package levels",
    )
    .addTag(
      "admin-one-time-catalog",
      "Admin-only one-time services, categories, phases, deliverables, and tasks",
    )
    .addTag("admin-pricing-rules", "Admin-only effective-dated pricing configuration")
    .addTag(
      "pricing-studio",
      "Scoped client pricing drafts and backend-trusted calculation previews",
    )
    .addTag("quotes", "Immutable quote snapshots and scoped quote lifecycle")
    .addTag("invoices", "Immutable invoices created from accepted quote snapshots")
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
