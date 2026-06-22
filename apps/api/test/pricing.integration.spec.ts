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

describeWithDatabase("PR 6 pricing rules and Pricing Studio APIs", () => {
  let app: INestApplication;
  let database: JzoomDatabaseClient;
  let adminRoleId: string;
  let accountManagerRoleId: string;
  let clientRoleId: string;
  let clientAId: string;
  let clientBId: string;
  let passwordHash: string;

  async function login(email: string) {
    const agent = request.agent(app.getHttpServer());
    const response = await agent
      .post("/api/v1/auth/login")
      .send({ email, password: "StrongPassword123" })
      .expect(200);
    return { agent, csrf: csrfFrom(response) };
  }

  async function cleanFixtures() {
    await database.pricingDraft.deleteMany({
      where: { draftNumber: { startsWith: "PD-" }, client: { code: { startsWith: "PR6-" } } },
    });
    await database.pricingRule.deleteMany({
      where: { code: { startsWith: "PR6-" } },
    });
    await database.user.deleteMany({
      where: { email: { endsWith: "@pr6.test" } },
    });
    await database.client.deleteMany({
      where: { code: { startsWith: "PR6-" } },
    });
  }

  beforeAll(async () => {
    database = createDatabaseClient(environment.databaseUrl);
    const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
    const blueprint = await normalizeBlueprint(path.join(workspaceRoot, "data", "blueprints"));
    await seedBlueprint(database, blueprint);

    const [adminRole, accountManagerRole, clientRole] = await Promise.all([
      database.role.findUniqueOrThrow({ where: { code: "ROLE-ADMIN" } }),
      database.role.findUniqueOrThrow({ where: { code: "ROLE-AM" } }),
      database.role.findUniqueOrThrow({ where: { code: "ROLE-CLIENT" } }),
    ]);
    adminRoleId = adminRole.id;
    accountManagerRoleId = accountManagerRole.id;
    clientRoleId = clientRole.id;

    for (const [code, roles] of [
      ["PERM-MANAGE-PRICING-RULES", [adminRoleId]],
      ["PERM-USE-PRICING-STUDIO", [adminRoleId, accountManagerRoleId]],
    ] as const) {
      const permission = await database.permission.findUniqueOrThrow({ where: { code } });
      for (const roleId of roles) {
        await database.rolePermission.upsert({
          where: { roleId_permissionId: { roleId, permissionId: permission.id } },
          create: { roleId, permissionId: permission.id, effect: "ALLOW" },
          update: { effect: "ALLOW" },
        });
      }
    }

    passwordHash = await new PasswordHasherService().hash("StrongPassword123");
    const module = await Test.createTestingModule({
      imports: [AppModule.forRoot(environment)],
    }).compile();
    app = module.createNestApplication();
    configureApiApplication(app, environment, { enableOpenApiUi: false });
    await app.init();
  });

  beforeEach(async () => {
    await cleanFixtures();
    const [clientA, clientB] = await Promise.all([
      database.client.create({
        data: {
          code: "PR6-CLIENT-A",
          name: "PR6 Client A",
          sector: "Technology",
          authorizedApprover: "Approver A",
        },
      }),
      database.client.create({
        data: {
          code: "PR6-CLIENT-B",
          name: "PR6 Client B",
          sector: "Retail",
          authorizedApprover: "Approver B",
        },
      }),
    ]);
    clientAId = clientA.id;
    clientBId = clientB.id;

    const [admin, accountManager, clientUser] = await Promise.all([
      database.user.create({
        data: {
          email: "admin@pr6.test",
          displayName: "PR6 Admin",
          userType: "INTERNAL",
          status: "ACTIVE",
          passwordHash,
          passwordChangedAt: new Date(),
        },
      }),
      database.user.create({
        data: {
          email: "am@pr6.test",
          displayName: "PR6 Account Manager",
          userType: "INTERNAL",
          status: "ACTIVE",
          passwordHash,
          passwordChangedAt: new Date(),
        },
      }),
      database.user.create({
        data: {
          email: "client@pr6.test",
          displayName: "PR6 Client User",
          userType: "EXTERNAL",
          status: "ACTIVE",
          passwordHash,
          passwordChangedAt: new Date(),
        },
      }),
    ]);
    await database.userRole.createMany({
      data: [
        { userId: admin.id, roleId: adminRoleId },
        { userId: accountManager.id, roleId: accountManagerRoleId },
        { userId: clientUser.id, roleId: clientRoleId },
      ],
    });
    await database.clientAssignment.create({
      data: {
        clientId: clientA.id,
        userId: accountManager.id,
        roleCode: "ROLE-AM",
      },
    });
  });

  afterAll(async () => {
    await cleanFixtures();
    if (app) {
      await app.close();
    }
    await database.$disconnect();
  });

  it("protects pricing APIs and scopes Account Managers to assigned clients", async () => {
    await request(app.getHttpServer()).get("/api/v1/pricing/catalog").expect(401);

    const clientUser = await login("client@pr6.test");
    await clientUser.agent.get("/api/v1/pricing/catalog").expect(403);

    const accountManager = await login("am@pr6.test");
    const catalog = await accountManager.agent.get("/api/v1/pricing/catalog").expect(200);
    expect(catalog.body.clients).toEqual([
      expect.objectContaining({ id: clientAId, code: "PR6-CLIENT-A" }),
    ]);
    expect(catalog.body.clients).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: clientBId })]),
    );

    const forbiddenPreview = await accountManager.agent
      .post("/api/v1/pricing/preview")
      .set("X-CSRF-Token", accountManager.csrf)
      .send({
        clientId: clientBId,
        title: "Forbidden pricing",
        pricingDate: new Date().toISOString(),
        currency: "SAR",
        monthlySelections: [],
        oneTimeSelections: [],
      })
      .expect(403);
    expect(forbiddenPreview.body.code).toBe("PRICING_CLIENT_SCOPE_DENIED");
  });

  it("creates effective Admin tax rules and applies them to backend previews", async () => {
    const admin = await login("admin@pr6.test");
    const effectiveFrom = new Date(Date.now() - 60_000).toISOString();
    const createdRule = await admin.agent
      .post("/api/v1/admin/pricing-rules")
      .set("X-CSRF-Token", admin.csrf)
      .send({
        code: "PR6-TAX-STANDARD",
        name: "PR6 Standard Tax",
        status: "ACTIVE",
        sortOrder: 100,
        ruleType: "TAX",
        calculationMethod: "PERCENTAGE",
        value: 15,
        currency: "SAR",
        targetType: "ALL",
        priority: 100,
        isStackable: true,
        isEnabled: true,
        formulaOrRule: "final_before_tax * 15%",
        appliesTo: "All pricing drafts",
        implementationOwner: "Backend calculation",
        visibility: "Internal pricing preview",
        effectiveFrom,
        revisionStatus: "ACTIVE",
      })
      .expect(201);

    await admin.agent
      .put(`/api/v1/admin/pricing-rules/${createdRule.body.id}`)
      .set("X-CSRF-Token", admin.csrf)
      .send({
        name: "Conflicting Tax Revision",
        ruleType: "TAX",
        calculationMethod: "PERCENTAGE",
        value: 16,
        currency: "SAR",
        targetType: "ALL",
        priority: 101,
        isStackable: true,
        isEnabled: true,
        formulaOrRule: "final_before_tax * 16%",
        appliesTo: "All pricing drafts",
        effectiveFrom,
        revisionStatus: "ACTIVE",
      })
      .expect(400);

    await admin.agent
      .post("/api/v1/admin/pricing-rules")
      .set("X-CSRF-Token", admin.csrf)
      .send({
        code: "PR6-TAX-INVALID",
        name: "Invalid Tax",
        ruleType: "TAX",
        calculationMethod: "PERCENTAGE",
        value: 101,
        targetType: "ALL",
        formulaOrRule: "invalid",
        appliesTo: "All",
        effectiveFrom: new Date().toISOString(),
      })
      .expect(400);

    const catalog = await admin.agent.get("/api/v1/pricing/catalog").expect(200);
    const monthly = catalog.body.monthlyServices[0];
    expect(monthly?.revision?.levels?.length).toBeGreaterThan(0);
    const preview = await admin.agent
      .post("/api/v1/pricing/preview")
      .set("X-CSRF-Token", admin.csrf)
      .send({
        clientId: clientAId,
        title: "Taxed pricing",
        pricingDate: new Date().toISOString(),
        currency: "SAR",
        monthlySelections: [
          {
            monthlyServiceRevisionId: monthly.revision.id,
            serviceLevelId: monthly.revision.levels[0].id,
            quantity: 1,
          },
        ],
        oneTimeSelections: [],
      })
      .expect(201);
    expect(preview.body.calculation.totals.finalBeforeTax).toBeGreaterThan(0);
    expect(preview.body.calculation.totals.taxTotal).toBeGreaterThan(0);
    expect(preview.body.calculation.appliedRules).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "PR6-TAX-STANDARD" })]),
    );
  });

  it("saves, reloads, and recalculates drafts without creating quotes", async () => {
    const accountManager = await login("am@pr6.test");
    const catalog = await accountManager.agent.get("/api/v1/pricing/catalog").expect(200);
    const monthly = catalog.body.monthlyServices[0];
    const oneTime = catalog.body.oneTimeServices[0];
    expect(monthly?.revision?.levels?.length).toBeGreaterThan(0);
    expect(oneTime?.revision).toBeDefined();

    const quoteCountBefore = await database.quote.count();
    const payload = {
      clientId: clientAId,
      title: "PR6 saved pricing",
      notes: "Internal draft only",
      pricingDate: new Date().toISOString(),
      currency: "SAR",
      monthlySelections: [
        {
          monthlyServiceRevisionId: monthly.revision.id,
          serviceLevelId: monthly.revision.levels[0].id,
          quantity: 1,
        },
      ],
      oneTimeSelections: [
        {
          oneTimeServiceRevisionId: oneTime.revision.id,
          quantity: 1,
        },
      ],
    };
    const created = await accountManager.agent
      .post("/api/v1/pricing/drafts")
      .set("X-CSRF-Token", accountManager.csrf)
      .send(payload)
      .expect(201);
    expect(created.body.calculationVersion).toBe(1);
    expect(created.body.calculation.totals.finalTotal).toBeGreaterThan(0);

    const loaded = await accountManager.agent
      .get(`/api/v1/pricing/drafts/${created.body.id}`)
      .expect(200);
    expect(loaded.body.monthlySelections).toHaveLength(1);
    expect(loaded.body.oneTimeSelections).toHaveLength(1);

    const updated = await accountManager.agent
      .put(`/api/v1/pricing/drafts/${created.body.id}`)
      .set("X-CSRF-Token", accountManager.csrf)
      .send({ ...payload, title: "PR6 recalculated pricing" })
      .expect(200);
    expect(updated.body.calculationVersion).toBe(2);
    expect(await database.quote.count()).toBe(quoteCountBefore);

    const auditCodes = await database.auditLog.findMany({
      where: {
        entityId: created.body.id,
        eventCode: { in: ["PRICING_DRAFT_CREATED", "PRICING_DRAFT_UPDATED"] },
      },
      select: { eventCode: true, requestId: true },
    });
    expect(auditCodes.map((entry) => entry.eventCode)).toEqual(
      expect.arrayContaining(["PRICING_DRAFT_CREATED", "PRICING_DRAFT_UPDATED"]),
    );
    expect(auditCodes.every((entry) => Boolean(entry.requestId))).toBe(true);
  });
});
