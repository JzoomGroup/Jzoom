import "reflect-metadata";
import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { ApiEnvironment } from "@jzoom/config";
import { createDatabaseClient, type JzoomDatabaseClient } from "@jzoom/database";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { PasswordHasherService } from "../src/auth/password-hasher.service.js";
import { configureApiApplication } from "../src/bootstrap.js";

const describeWithDatabase = process.env.DATABASE_INTEGRATION === "true" ? describe : describe.skip;

const environment: ApiEnvironment = {
  nodeEnvironment: "test",
  port: 4000,
  databaseUrl: process.env.DATABASE_URL ?? "postgresql://user:password@localhost:5432/jzoom",
  openApiEnabled: false,
  webOrigin: "http://localhost:3000",
  auth: {
    sessionTtlMinutes: 60,
    cookieName: "jzoom_session",
    csrfCookieName: "jzoom_csrf",
    cookieSecure: false,
    exposeTestTokens: true,
    maxLoginAttempts: 5,
    lockoutMinutes: 15,
  },
};

function csrfFrom(response: request.Response): string {
  const header = response.headers["set-cookie"];
  const cookies = Array.isArray(header) ? header : header ? [header] : [];
  const csrfCookie = cookies.find((cookie) => cookie.startsWith("jzoom_csrf="));
  if (!csrfCookie) {
    throw new Error("CSRF cookie was not issued");
  }
  return decodeURIComponent(csrfCookie.split(";", 1)[0]!.slice("jzoom_csrf=".length));
}

describeWithDatabase("PR 13 request lifecycle foundation", () => {
  let app: INestApplication;
  let database: JzoomDatabaseClient;
  let clientId: string;
  let otherClientId: string;
  let subscriptionServiceId: string;
  let serviceItemRevisionId: string;
  let specialistId: string;
  const runId = randomUUID().slice(0, 8);
  const password = "StrongPassword123";

  async function login(email: string) {
    const agent = request.agent(app.getHttpServer());
    const response = await agent.post("/api/v1/auth/login").send({ email, password }).expect(200);
    return { agent, csrf: csrfFrom(response) };
  }

  async function role(code: string, name: string, userType: "INTERNAL" | "EXTERNAL" = "INTERNAL") {
    return database.role.upsert({
      where: { code },
      create: {
        code,
        name,
        nameEn: name,
        userType,
        isSystem: true,
        status: "ACTIVE",
      },
      update: { status: "ACTIVE" },
    });
  }

  beforeAll(async () => {
    database = createDatabaseClient(environment.databaseUrl);
    const passwordHash = await new PasswordHasherService().hash(password);
    const [accountManagerRole, specialistRole, clientRole] = await Promise.all([
      role("ROLE-AM", "Account Manager"),
      role("ROLE-SPECIALIST", "Specialist"),
      role("ROLE-CLIENT", "Client", "EXTERNAL"),
      role("ROLE-SUPERVISOR", "Supervisor"),
    ]);

    const [client, otherClient] = await Promise.all([
      database.client.create({
        data: {
          code: `PR13-CLIENT-A-${runId}`,
          name: "PR13 Client A",
          legalName: "PR13 Client A LLC",
          sector: "Technology",
          city: "Riyadh",
          authorizedApprover: "Approver A",
        },
      }),
      database.client.create({
        data: {
          code: `PR13-CLIENT-B-${runId}`,
          name: "PR13 Client B",
          sector: "Retail",
          authorizedApprover: "Approver B",
        },
      }),
    ]);
    clientId = client.id;
    otherClientId = otherClient.id;

    const category = await database.monthlyServiceCategory.create({
      data: {
        code: `PR13-CAT-${runId}`,
        nameAr: "تصنيف طلبات",
        nameEn: "Request category",
      },
    });
    const monthlyService = await database.monthlyService.create({
      data: {
        categoryId: category.id,
        code: `PR13-SVC-${runId}`,
      },
    });
    const serviceLevel = await database.serviceLevel.create({
      data: {
        code: `PR13-LVL-${runId}`,
        labelAr: "أساسي",
        labelEn: "Basic",
      },
    });
    const monthlyServiceRevision = await database.monthlyServiceRevision.create({
      data: {
        monthlyServiceId: monthlyService.id,
        version: 1,
        status: "ACTIVE",
        effectiveFrom: new Date(),
        nameAr: "خدمة طلبات شهرية",
        nameEn: "Monthly request service",
        domain: "Operations",
        description: "PR13 monthly service fixture",
        sellingHourlyRateSar: 300,
        internalHourlyCostSar: 120,
        setupFeePct: 0,
        defaultSlaHours: 48,
      },
    });
    const serviceItem = await database.serviceItem.create({
      data: {
        code: `PR13-ITEM-${runId}`,
        monthlyServiceId: monthlyService.id,
      },
    });
    const serviceItemRevision = await database.serviceItemRevision.create({
      data: {
        serviceItemId: serviceItem.id,
        version: 1,
        status: "ACTIVE",
        effectiveFrom: new Date(),
        nameAr: "عنصر طلب",
        nameEn: "Request service item",
        expectedOutput: "Client-visible service item output",
      },
    });
    serviceItemRevisionId = serviceItemRevision.id;
    const subscription = await database.subscription.create({
      data: {
        clientId,
        status: "ACTIVE",
        startsAt: new Date(Date.now() - 86_400_000),
      },
    });
    const subscriptionService = await database.subscriptionService.create({
      data: {
        subscriptionId: subscription.id,
        monthlyServiceRevisionId: monthlyServiceRevision.id,
        serviceLevelId: serviceLevel.id,
        hoursAllocated: 20,
        startsAt: new Date(Date.now() - 86_400_000),
        scopeSnapshot: { source: "PR13 test" },
      },
    });
    subscriptionServiceId = subscriptionService.id;

    const [accountManager, specialist, clientUser, otherClientUser] = await Promise.all([
      database.user.create({
        data: {
          email: `am-${runId}@pr13.test`,
          passwordHash,
          displayName: "PR13 Account Manager",
          userType: "INTERNAL",
          status: "ACTIVE",
          roles: { create: { roleId: accountManagerRole.id } },
          clientAssignments: { create: { clientId, roleCode: "ROLE-AM" } },
        },
      }),
      database.user.create({
        data: {
          email: `specialist-${runId}@pr13.test`,
          passwordHash,
          displayName: "PR13 Specialist",
          userType: "INTERNAL",
          status: "ACTIVE",
          roles: { create: { roleId: specialistRole.id } },
        },
      }),
      database.user.create({
        data: {
          email: `client-${runId}@pr13.test`,
          passwordHash,
          displayName: "PR13 Client User",
          userType: "EXTERNAL",
          status: "ACTIVE",
          roles: { create: { roleId: clientRole.id } },
          clientAssignments: { create: { clientId, roleCode: "ROLE-CLIENT" } },
        },
      }),
      database.user.create({
        data: {
          email: `other-client-${runId}@pr13.test`,
          passwordHash,
          displayName: "PR13 Other Client User",
          userType: "EXTERNAL",
          status: "ACTIVE",
          roles: { create: { roleId: clientRole.id } },
          clientAssignments: { create: { clientId: otherClientId, roleCode: "ROLE-CLIENT" } },
        },
      }),
    ]);
    specialistId = specialist.id;
    expect(accountManager.id).toBeDefined();
    expect(clientUser.id).toBeDefined();
    expect(otherClientUser.id).toBeDefined();

    const testingModule = await Test.createTestingModule({
      imports: [AppModule.forRoot(environment)],
    }).compile();
    app = testingModule.createNestApplication();
    configureApiApplication(app, environment, { enableOpenApiUi: false });
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await database?.$disconnect();
  });

  it("creates, assigns, advances, and audits an internal request", async () => {
    const { agent, csrf } = await login(`am-${runId}@pr13.test`);
    const createResponse = await agent
      .post("/api/v1/requests")
      .set("X-CSRF-Token", csrf)
      .send({
        clientId,
        subscriptionServiceId,
        serviceItemRevisionId,
        title: "Launch monthly content request",
        description: "Prepare the monthly client content package.",
        priority: "HIGH",
      })
      .expect(201);

    expect(createResponse.body).toMatchObject({
      status: "NEW",
      title: "Launch monthly content request",
      client: { id: clientId },
      serviceItem: { id: serviceItemRevisionId },
    });
    const requestId = createResponse.body.id as string;

    await agent
      .patch(`/api/v1/requests/${requestId}/assignment`)
      .set("X-CSRF-Token", csrf)
      .send({ assignedSpecialistId: specialistId, reason: "Triage complete" })
      .expect(200)
      .expect(({ body }) => {
        expect(body.assignments.specialist.id).toBe(specialistId);
      });

    await agent
      .patch(`/api/v1/requests/${requestId}/status`)
      .set("X-CSRF-Token", csrf)
      .send({ status: "TRIAGE", reason: "Ready for triage" })
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe("TRIAGE");
      });

    const audits = await database.auditLog.findMany({
      where: { entityType: "Request", entityId: requestId },
    });
    expect(audits.map((audit) => audit.eventCode)).toEqual(
      expect.arrayContaining([
        "REQUEST_CREATED",
        "REQUEST_ASSIGNMENT_CHANGED",
        "REQUEST_STATUS_CHANGED",
      ]),
    );
  });

  it("keeps internal notes hidden from client users and blocks cross-client access", async () => {
    const { agent: amAgent, csrf } = await login(`am-${runId}@pr13.test`);
    const created = await amAgent
      .post("/api/v1/requests")
      .set("X-CSRF-Token", csrf)
      .send({
        clientId,
        subscriptionServiceId,
        title: "Client-visible tracking request",
        description: "Client can track visible comments only.",
      })
      .expect(201);
    const requestId = created.body.id as string;

    await amAgent
      .post(`/api/v1/requests/${requestId}/internal-notes`)
      .set("X-CSRF-Token", csrf)
      .send({ body: "Internal escalation note" })
      .expect(200);
    await amAgent
      .post(`/api/v1/requests/${requestId}/comments`)
      .set("X-CSRF-Token", csrf)
      .send({ body: "Client-visible update", isClientVisible: true })
      .expect(200);
    await amAgent
      .post(`/api/v1/requests/${requestId}/comments`)
      .set("X-CSRF-Token", csrf)
      .send({ body: "Hidden internal comment", isClientVisible: false })
      .expect(200);

    const { agent: clientAgent } = await login(`client-${runId}@pr13.test`);
    const clientView = await clientAgent
      .get(`/api/v1/client-portal/requests/${requestId}`)
      .expect(200);
    expect(clientView.body.internalNotes).toEqual([]);
    expect(clientView.body.comments.map((comment: { body: string }) => comment.body)).toEqual([
      "Client-visible update",
    ]);
    expect(JSON.stringify(clientView.body)).not.toContain("Internal escalation note");
    expect(JSON.stringify(clientView.body)).not.toContain("Hidden internal comment");

    const { agent: otherClientAgent } = await login(`other-client-${runId}@pr13.test`);
    await otherClientAgent.get(`/api/v1/client-portal/requests/${requestId}`).expect(404);
    await clientAgent.get("/api/v1/requests").expect(403);
  });
});
