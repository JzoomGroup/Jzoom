import "reflect-metadata";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { ApiEnvironment } from "@jzoom/config";
import {
  createDatabaseClient,
  normalizeBlueprint,
  seedBlueprint,
  type JzoomDatabaseClient,
} from "@jzoom/database";
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

function servicePayload(categoryId: string) {
  return {
    code: "PR5-OT-SERVICE",
    categoryId,
    serviceLine: "Build",
    status: "DRAFT",
    sortOrder: 1,
    nameAr: "خدمة اختبار",
    nameEn: "PR5 Test Service",
    description: "A revision-safe one-time service.",
    basePriceSar: 5000,
    estimatedHours: 40,
    internalHourlyCostSar: 100,
    durationDays: 20,
    visibleInPricing: true,
    createsProject: true,
    phases: [
      {
        code: "PHASE-DISCOVERY",
        nameAr: "الاكتشاف",
        nameEn: "Discovery",
        sortOrder: 0,
        isRequired: true,
        status: "ACTIVE",
      },
    ],
    deliverables: [
      {
        code: "DEL-BRIEF",
        phaseCode: "PHASE-DISCOVERY",
        nameAr: "موجز المشروع",
        nameEn: "Project brief",
        sortOrder: 0,
        isRequired: true,
        requiresClientApproval: true,
        status: "ACTIVE",
        tasks: [
          {
            code: "TASK-INTERVIEW",
            nameAr: "مقابلة",
            nameEn: "Stakeholder interview",
            estimatedHours: 4,
            sortOrder: 0,
            isRequired: true,
            status: "ACTIVE",
          },
        ],
      },
    ],
  };
}

describeWithDatabase("PR 5 one-time catalog APIs", () => {
  let app: INestApplication;
  let database: JzoomDatabaseClient;
  let adminRoleId: string;
  let clientRoleId: string;
  let passwordHash: string;

  async function login(email: string) {
    const agent = request.agent(app.getHttpServer());
    const response = await agent
      .post("/api/v1/auth/login")
      .send({ email, password: "StrongPassword123" })
      .expect(200);
    return { agent, csrf: csrfFrom(response) };
  }

  async function cleanCatalogFixtures() {
    await database.oneTimeService.deleteMany({
      where: { code: { startsWith: "PR5-" } },
    });
    await database.oneTimeServiceCategory.deleteMany({
      where: { code: { startsWith: "PR5-" } },
    });
  }

  beforeAll(async () => {
    database = createDatabaseClient(environment.databaseUrl);
    const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
    const blueprint = await normalizeBlueprint(path.join(workspaceRoot, "data", "blueprints"));
    await seedBlueprint(database, blueprint);

    const hasher = new PasswordHasherService();
    passwordHash = await hasher.hash("StrongPassword123");
    const adminRole = await database.role.findUniqueOrThrow({
      where: { code: "ROLE-ADMIN" },
    });
    const clientRole = await database.role.findUniqueOrThrow({
      where: { code: "ROLE-CLIENT" },
    });
    const permission = await database.permission.findUniqueOrThrow({
      where: { code: "PERM-MANAGE-ONE-TIME-SERVICES" },
    });
    await database.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      create: {
        roleId: adminRole.id,
        permissionId: permission.id,
        effect: "ALLOW",
      },
      update: { effect: "ALLOW" },
    });
    adminRoleId = adminRole.id;
    clientRoleId = clientRole.id;

    const module = await Test.createTestingModule({
      imports: [AppModule.forRoot(environment)],
    }).compile();
    app = module.createNestApplication();
    configureApiApplication(app, environment, { enableOpenApiUi: false });
    await app.init();
  });

  beforeEach(async () => {
    await cleanCatalogFixtures();
    await database.user.deleteMany({
      where: { email: { endsWith: "@pr5.test" } },
    });
    const admin = await database.user.create({
      data: {
        email: "admin@pr5.test",
        displayName: "PR5 Admin",
        userType: "INTERNAL",
        status: "ACTIVE",
        passwordHash,
        passwordChangedAt: new Date(),
      },
    });
    const client = await database.user.create({
      data: {
        email: "client@pr5.test",
        displayName: "PR5 Client",
        userType: "EXTERNAL",
        status: "ACTIVE",
        passwordHash,
        passwordChangedAt: new Date(),
      },
    });
    await database.userRole.createMany({
      data: [
        { userId: admin.id, roleId: adminRoleId },
        { userId: client.id, roleId: clientRoleId },
      ],
    });
  });

  afterAll(async () => {
    await cleanCatalogFixtures();
    await database.user.deleteMany({
      where: { email: { endsWith: "@pr5.test" } },
    });
    if (app) {
      await app.close();
    }
    await database.$disconnect();
  });

  it("blocks anonymous and Client access while exposing seeded data to Admin", async () => {
    await request(app.getHttpServer()).get("/api/v1/admin/catalog/one-time").expect(401);

    const client = await login("client@pr5.test");
    const forbidden = await client.agent.get("/api/v1/admin/catalog/one-time").expect(403);
    expect(forbidden.body.code).toBe("ROLE_DENIED");

    const admin = await login("admin@pr5.test");
    const snapshot = await admin.agent.get("/api/v1/admin/catalog/one-time").expect(200);
    expect(snapshot.body.categories.length).toBeGreaterThan(0);
    expect(snapshot.body.services.length).toBeGreaterThan(0);
    expect(snapshot.body.servicePaths).toEqual(["Build", "Digital"]);
  });

  it("creates and revisions categories, services, phases, deliverables, and tasks", async () => {
    const admin = await login("admin@pr5.test");
    const category = await admin.agent
      .post("/api/v1/admin/catalog/one-time/categories")
      .set("X-CSRF-Token", admin.csrf)
      .send({
        code: "PR5-CAT-BUILD",
        nameAr: "بناء",
        nameEn: "PR5 Build",
        status: "ACTIVE",
        sortOrder: 20,
      })
      .expect(201);

    const created = await admin.agent
      .post("/api/v1/services/one-time")
      .set("X-CSRF-Token", admin.csrf)
      .send(servicePayload(category.body.id))
      .expect(201);
    expect(created.body.revision).toMatchObject({
      version: 1,
      basePriceSar: 5000,
      internalHourlyCostSar: 100,
    });
    expect(created.body.revision.deliverables[0].tasks).toHaveLength(1);

    const {
      code: _code,
      status: _status,
      sortOrder: _sortOrder,
      ...updatedPayload
    } = {
      ...servicePayload(category.body.id),
      basePriceSar: 6500,
      durationDays: 25,
      phases: [
        ...servicePayload(category.body.id).phases,
        {
          code: "PHASE-DELIVERY",
          nameAr: "التسليم",
          nameEn: "Delivery",
          sortOrder: 1,
          isRequired: true,
          status: "ACTIVE",
        },
      ],
    };
    void _code;
    void _status;
    void _sortOrder;

    const updated = await admin.agent
      .put(`/api/v1/services/one-time/${created.body.id}`)
      .set("X-CSRF-Token", admin.csrf)
      .send(updatedPayload)
      .expect(200);
    expect(updated.body.revision.version).toBe(2);
    expect(updated.body.revision.basePriceSar).toBe(6500);
    expect(updated.body.revision.phases).toHaveLength(2);

    const auditCodes = await database.auditLog.findMany({
      where: {
        entityId: created.body.id,
        eventCode: {
          in: [
            "CATALOG_ONE_TIME_SERVICE_CREATED",
            "CATALOG_ONE_TIME_PRICING_CHANGED",
            "CATALOG_ONE_TIME_DURATION_CHANGED",
            "CATALOG_ONE_TIME_PHASES_CHANGED",
          ],
        },
      },
      select: { eventCode: true, requestId: true },
    });
    expect(auditCodes.map((entry) => entry.eventCode)).toEqual(
      expect.arrayContaining([
        "CATALOG_ONE_TIME_SERVICE_CREATED",
        "CATALOG_ONE_TIME_PRICING_CHANGED",
        "CATALOG_ONE_TIME_DURATION_CHANGED",
        "CATALOG_ONE_TIME_PHASES_CHANGED",
      ]),
    );
    expect(auditCodes.every((entry) => Boolean(entry.requestId))).toBe(true);
  });

  it("validates paths, template ownership, lifecycle transitions, and safe delete", async () => {
    const admin = await login("admin@pr5.test");
    const category = await admin.agent
      .post("/api/v1/admin/catalog/one-time/categories")
      .set("X-CSRF-Token", admin.csrf)
      .send({
        code: "PR5-CAT-VALIDATION",
        nameAr: "اختبار",
        nameEn: "Validation",
        status: "ACTIVE",
      })
      .expect(201);

    await admin.agent
      .post("/api/v1/services/one-time")
      .set("X-CSRF-Token", admin.csrf)
      .send({ ...servicePayload(category.body.id), serviceLine: "Unknown" })
      .expect(400);

    await admin.agent
      .post("/api/v1/services/one-time")
      .set("X-CSRF-Token", admin.csrf)
      .send({
        ...servicePayload(category.body.id),
        deliverables: [
          {
            ...servicePayload(category.body.id).deliverables[0],
            phaseCode: "PHASE-MISSING",
          },
        ],
      })
      .expect(400);

    const created = await admin.agent
      .post("/api/v1/services/one-time")
      .set("X-CSRF-Token", admin.csrf)
      .send(servicePayload(category.body.id))
      .expect(201);
    await admin.agent
      .patch(`/api/v1/services/one-time/${created.body.id}/status`)
      .set("X-CSRF-Token", admin.csrf)
      .send({ status: "ACTIVE" })
      .expect(200);
    await admin.agent
      .patch(`/api/v1/services/one-time/${created.body.id}/status`)
      .set("X-CSRF-Token", admin.csrf)
      .send({ status: "INACTIVE" })
      .expect(400);
    await admin.agent
      .patch(`/api/v1/services/one-time/${created.body.id}/status`)
      .set("X-CSRF-Token", admin.csrf)
      .send({ status: "INACTIVE", reason: "Temporarily unavailable" })
      .expect(200);
    await admin.agent
      .delete(`/api/v1/services/one-time/${created.body.id}`)
      .set("X-CSRF-Token", admin.csrf)
      .expect(409);
    await admin.agent
      .patch(`/api/v1/services/one-time/${created.body.id}/status`)
      .set("X-CSRF-Token", admin.csrf)
      .send({ status: "ARCHIVED", reason: "Retired safely" })
      .expect(200);
  });

  it("reorders services without assigning duplicate positions", async () => {
    const admin = await login("admin@pr5.test");
    const category = await admin.agent
      .post("/api/v1/admin/catalog/one-time/categories")
      .set("X-CSRF-Token", admin.csrf)
      .send({
        code: "PR5-CAT-ORDER",
        nameAr: "ترتيب",
        nameEn: "Ordering",
        status: "ACTIVE",
      })
      .expect(201);
    const first = await admin.agent
      .post("/api/v1/services/one-time")
      .set("X-CSRF-Token", admin.csrf)
      .send({ ...servicePayload(category.body.id), code: "PR5-ORDER-A", sortOrder: 0 })
      .expect(201);
    await admin.agent
      .post("/api/v1/services/one-time")
      .set("X-CSRF-Token", admin.csrf)
      .send({ ...servicePayload(category.body.id), code: "PR5-ORDER-B", sortOrder: 1 })
      .expect(201);

    await admin.agent
      .patch(`/api/v1/services/one-time/${first.body.id}/order`)
      .set("X-CSRF-Token", admin.csrf)
      .send({ sortOrder: 1 })
      .expect(200);

    const records = await database.oneTimeService.findMany({
      where: { categoryId: category.body.id },
      orderBy: { sortOrder: "asc" },
      select: { code: true, sortOrder: true },
    });
    expect(records).toEqual([
      { code: "PR5-ORDER-B", sortOrder: 0 },
      { code: "PR5-ORDER-A", sortOrder: 1 },
    ]);
  });
});
