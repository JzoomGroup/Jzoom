import "reflect-metadata";
import type { INestApplication } from "@nestjs/common";
import { ServiceUnavailableException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { jest } from "@jest/globals";
import type { ApiEnvironment } from "@jzoom/config";
import { REQUEST_ID_HEADER } from "@jzoom/contracts";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { configureApiApplication } from "../src/bootstrap.js";
import { DatabaseService } from "../src/database/database.service.js";
import { createApiErrorResponse } from "../src/errors/api-error.factory.js";
import { createOpenApiDocument } from "../src/swagger/openapi.js";

const environment: ApiEnvironment = {
  nodeEnvironment: "test",
  port: 4000,
  databaseUrl: "postgresql://user:password@localhost:5432/jzoom",
  openApiEnabled: false,
  webOrigin: "http://localhost:3000",
  auth: {
    sessionTtlMinutes: 480,
    cookieName: "jzoom_session",
    csrfCookieName: "jzoom_csrf",
    cookieSecure: false,
    exposeTestTokens: false,
    maxLoginAttempts: 5,
    lockoutMinutes: 15,
  },
};

describe("PR 1 API foundation", () => {
  let app: INestApplication;
  const database = {
    ping: jest.fn<() => Promise<void>>(),
  };

  beforeEach(async () => {
    database.ping.mockReset();
    database.ping.mockResolvedValue(undefined);

    const testingModule = await Test.createTestingModule({
      imports: [AppModule.forRoot(environment)],
    })
      .overrideProvider(DatabaseService)
      .useValue(database)
      .compile();

    app = testingModule.createNestApplication();
    configureApiApplication(app, environment, {
      enableOpenApiUi: false,
    });
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it("reports liveness without querying PostgreSQL", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/health/live").expect(200);

    expect(response.body).toMatchObject({
      status: "ok",
      service: "api",
    });
    expect(database.ping).not.toHaveBeenCalled();
  });

  it("reports readiness after a successful PostgreSQL query", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/health/ready").expect(200);

    expect(response.body).toMatchObject({
      status: "ready",
      service: "api",
      database: "up",
    });
    expect(database.ping).toHaveBeenCalledTimes(1);
  });

  it("returns a normalized 503 when PostgreSQL is unavailable", async () => {
    database.ping.mockRejectedValueOnce(new Error("connection refused"));

    const response = await request(app.getHttpServer()).get("/api/v1/health/ready").expect(503);

    expect(response.body).toMatchObject({
      statusCode: 503,
      code: "DATABASE_UNAVAILABLE",
      message: "Database readiness check failed",
      fieldErrors: [],
      path: "/api/v1/health/ready",
    });
    expect(response.headers["x-request-id"]).toBe(response.body.requestId);
  });

  it("preserves a valid incoming request ID", async () => {
    const requestId = "2c252c56-8b2a-4f1c-aea4-ae92791ec455";

    const response = await request(app.getHttpServer())
      .get("/api/v1/health/live")
      .set(REQUEST_ID_HEADER, requestId)
      .expect(200);

    expect(response.headers["x-request-id"]).toBe(requestId);
  });

  it("replaces an invalid request ID", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/health/live")
      .set(REQUEST_ID_HEADER, "not-a-valid-id")
      .expect(200);

    expect(response.headers["x-request-id"]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("normalizes not-found errors and echoes the request ID", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/missing").expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      code: "NOT_FOUND",
      fieldErrors: [],
      path: "/api/v1/missing",
    });
    expect(response.headers["x-request-id"]).toBe(response.body.requestId);
  });

  it("documents health paths and the standard error schema", () => {
    const document = createOpenApiDocument(app);

    expect(document.paths["/api/v1/health/live"]).toBeDefined();
    expect(document.paths["/api/v1/health/ready"]).toBeDefined();
    expect(document.paths["/api/v1/admin/catalog/one-time"]).toBeDefined();
    expect(document.paths["/api/v1/services/one-time"]).toBeDefined();
    expect(document.paths["/api/v1/services/one-time/{id}/template"]).toBeDefined();
    expect(document.paths["/api/v1/admin/pricing-rules"]).toBeDefined();
    expect(document.paths["/api/v1/pricing/catalog"]).toBeDefined();
    expect(document.paths["/api/v1/pricing/preview"]).toBeDefined();
    expect(document.paths["/api/v1/pricing/drafts"]).toBeDefined();
    expect(document.paths["/api/v1/quotes"]).toBeDefined();
    expect(document.paths["/api/v1/quotes/{id}"]).toBeDefined();
    expect(document.paths["/api/v1/quotes/{id}/pdf"]).toBeDefined();
    expect(document.paths["/api/v1/quotes/{id}/accept"]).toBeDefined();
    expect(document.paths["/api/v1/quotes/{id}/reject"]).toBeDefined();
    expect(document.paths["/api/v1/quotes/{id}/expire"]).toBeDefined();
    expect(document.paths["/api/v1/quotes/{id}/cancel"]).toBeDefined();
    expect(document.paths["/api/v1/quotes/{id}/status"]).toBeDefined();
    expect(document.paths["/api/v1/invoices"]).toBeDefined();
    expect(document.paths["/api/v1/invoices/{id}"]).toBeDefined();
    expect(document.paths["/api/v1/invoices/{id}/pdf"]).toBeDefined();
    expect(document.paths["/api/v1/invoices/{id}/issue"]).toBeDefined();
    expect(document.paths["/api/v1/invoices/{id}/cancel"]).toBeDefined();
    expect(document.paths["/api/v1/invoices/{id}/void"]).toBeDefined();
    expect(document.paths["/api/v1/invoices/{id}/status"]).toBeDefined();
    expect(document.paths["/api/v1/client-portal/me"]).toBeDefined();
    expect(document.paths["/api/v1/client-portal/quotes"]).toBeDefined();
    expect(document.paths["/api/v1/client-portal/quotes/{id}"]).toBeDefined();
    expect(document.paths["/api/v1/client-portal/quotes/{id}/pdf"]).toBeDefined();
    expect(document.paths["/api/v1/client-portal/invoices"]).toBeDefined();
    expect(document.paths["/api/v1/client-portal/invoices/{id}"]).toBeDefined();
    expect(document.paths["/api/v1/client-portal/invoices/{id}/pdf"]).toBeDefined();
    expect(document.paths["/api/v1/requests"]).toBeDefined();
    expect(document.paths["/api/v1/requests/queues"]).toBeDefined();
    expect(document.paths["/api/v1/requests/queues/{queue}"]).toBeDefined();
    expect(document.paths["/api/v1/requests/{id}"]).toBeDefined();
    expect(document.paths["/api/v1/requests/{id}/assignment"]).toBeDefined();
    expect(document.paths["/api/v1/requests/{id}/start"]).toBeDefined();
    expect(document.paths["/api/v1/requests/{id}/supervisor-review"]).toBeDefined();
    expect(document.paths["/api/v1/requests/{id}/status"]).toBeDefined();
    expect(document.paths["/api/v1/requests/{id}/comments"]).toBeDefined();
    expect(document.paths["/api/v1/requests/{id}/internal-notes"]).toBeDefined();
    expect(document.paths["/api/v1/requests/{id}/attachments"]).toBeDefined();
    expect(document.paths["/api/v1/requests/{id}/tasks"]).toBeDefined();
    expect(document.paths["/api/v1/requests/{id}/tasks/{taskId}"]).toBeDefined();
    expect(document.paths["/api/v1/requests/{id}/outputs"]).toBeDefined();
    expect(document.paths["/api/v1/requests/{id}/outputs/{outputId}"]).toBeDefined();
    expect(document.paths["/api/v1/requests/{id}/outputs/{outputId}/submit"]).toBeDefined();
    expect(document.paths["/api/v1/requests/{id}/outputs/{outputId}/review"]).toBeDefined();
    expect(document.paths["/api/v1/requests/{id}/outputs/{outputId}/share"]).toBeDefined();
    expect(document.paths["/api/v1/requests/{id}/outputs/{outputId}/close"]).toBeDefined();
    expect(document.paths["/api/v1/requests/{id}/document-requests"]).toBeDefined();
    expect(
      document.paths["/api/v1/requests/{id}/document-requests/{documentRequestId}/status"],
    ).toBeDefined();
    expect(document.paths["/api/v1/requests/{id}/time-entries"]).toBeDefined();
    expect(document.paths["/api/v1/requests/{id}/time-entries/{timeEntryId}"]).toBeDefined();
    expect(document.paths["/api/v1/requests/{id}/time-entries/{timeEntryId}/submit"]).toBeDefined();
    expect(document.paths["/api/v1/requests/{id}/time-entries/{timeEntryId}/review"]).toBeDefined();
    expect(document.paths["/api/v1/client-portal/requests"]).toBeDefined();
    expect(document.paths["/api/v1/client-portal/requests"]?.post).toBeDefined();
    expect(document.paths["/api/v1/client-portal/requests/{id}"]).toBeDefined();
    expect(document.paths["/api/v1/client-portal/requests/{id}/comments"]).toBeDefined();
    expect(
      document.paths["/api/v1/client-portal/requests/{id}/outputs/{outputId}/accept"],
    ).toBeDefined();
    expect(
      document.paths["/api/v1/client-portal/requests/{id}/outputs/{outputId}/return"],
    ).toBeDefined();
    expect(
      document.paths[
        "/api/v1/client-portal/requests/{id}/document-requests/{documentRequestId}/upload"
      ],
    ).toBeDefined();
    expect(document.paths["/api/v1/notifications"]).toBeDefined();
    expect(document.paths["/api/v1/notifications/unread-count"]).toBeDefined();
    expect(document.paths["/api/v1/notifications/read-all"]).toBeDefined();
    expect(document.paths["/api/v1/notifications/{id}/read"]).toBeDefined();
    expect(document.paths["/api/v1/reports/monthly"]).toBeDefined();
    expect(document.paths["/api/v1/reports/monthly/prepare"]).toBeDefined();
    expect(document.paths["/api/v1/reports/monthly/{id}"]).toBeDefined();
    expect(document.paths["/api/v1/reports/monthly/{id}/publish"]).toBeDefined();
    expect(document.paths["/api/v1/client-portal/reports"]).toBeDefined();
    expect(document.paths["/api/v1/client-portal/reports/{id}"]).toBeDefined();
    expect(document.paths["/api/v1/account-manager/portfolio"]).toBeDefined();
    expect(document.paths["/api/v1/hours-ledger"]).toBeDefined();
    expect(document.paths["/api/v1/hours-ledger/usage"]).toBeDefined();
    expect(document.paths["/api/v1/hours-ledger/closings"]).toBeDefined();
    expect(document.paths["/api/v1/hours-ledger/closings/prepare"]).toBeDefined();
    expect(document.paths["/api/v1/hours-ledger/closings/{id}"]).toBeDefined();
    expect(document.paths["/api/v1/hours-ledger/closings/{id}/finalize"]).toBeDefined();
    expect(document.paths["/api/v1/admin/platform-configuration"]).toBeDefined();
    expect(document.paths["/api/v1/admin/platform-configuration/settings"]).toBeDefined();
    expect(document.paths["/api/v1/admin/platform-configuration/settings/{key}"]).toBeDefined();
    expect(document.paths["/api/v1/admin/platform-configuration/notifications/{id}"]).toBeDefined();
    expect(document.paths["/api/v1/admin/platform-configuration/pdfs/{id}"]).toBeDefined();
    expect(
      document.paths["/api/v1/admin/platform-configuration/localization/publish"],
    ).toBeDefined();
    expect(document.paths["/api/v1/admin/platform-configuration/workflows/{id}"]).toBeDefined();
    expect(document.paths["/api/v1/admin/request-templates"]).toBeDefined();
    expect(document.paths["/api/v1/admin/request-templates/field-library"]).toBeDefined();
    expect(document.paths["/api/v1/admin/request-templates/field-library/{id}"]).toBeDefined();
    expect(
      document.paths[
        "/api/v1/admin/request-templates/service-items/{serviceItemId}/apply-suggested"
      ],
    ).toBeDefined();
    expect(
      document.paths["/api/v1/admin/request-templates/service-items/{serviceItemId}/template"],
    ).toBeDefined();
    expect(
      document.paths[
        "/api/v1/admin/request-templates/templates/{templateId}/versions/{versionId}/status"
      ],
    ).toBeDefined();
    expect(
      document.paths[
        "/api/v1/request-templates/service-item-revisions/{serviceItemRevisionId}/active"
      ],
    ).toBeDefined();
    expect(document.components?.schemas?.ApiErrorResponseDto).toBeDefined();
  });

  it("sanitizes unexpected server failures", () => {
    const response = createApiErrorResponse(
      new Error("sensitive stack detail"),
      "2c252c56-8b2a-4f1c-aea4-ae92791ec455",
      "/api/v1/example",
    );

    expect(response).toMatchObject({
      statusCode: 500,
      code: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong",
    });
    expect(JSON.stringify(response)).not.toContain("sensitive stack detail");
  });

  it("keeps explicit service-unavailable codes", () => {
    const response = createApiErrorResponse(
      new ServiceUnavailableException({
        code: "DATABASE_UNAVAILABLE",
        message: "Database readiness check failed",
      }),
      "2c252c56-8b2a-4f1c-aea4-ae92791ec455",
      "/api/v1/health/ready",
    );

    expect(response.code).toBe("DATABASE_UNAVAILABLE");
  });
});
