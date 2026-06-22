import "reflect-metadata";
import { createHash, randomUUID } from "node:crypto";
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

function snapshotHash(label: string): string {
  return createHash("sha256").update(`${label}-${randomUUID()}`).digest("hex");
}

describeWithDatabase("PR 10 invoice foundation", () => {
  let app: INestApplication;
  let database: JzoomDatabaseClient;
  let clientId: string;
  let otherClientId: string;
  let accountManagerId: string;
  let accountManagerEmail: string;
  let clientEmail: string;
  let oneTimeServiceRevisionId: string;
  const runId = randomUUID().slice(0, 8);

  async function login(email: string) {
    const agent = request.agent(app.getHttpServer());
    const response = await agent
      .post("/api/v1/auth/login")
      .send({ email, password: "StrongPassword123" })
      .expect(200);
    return { agent, csrf: csrfFrom(response) };
  }

  async function createQuoteFixture(
    label: string,
    status: "DRAFT" | "ISSUED" | "ACCEPTED" = "ACCEPTED",
    scopedClientId = clientId,
  ) {
    const quoteHash = snapshotHash(label);
    return database.quote.create({
      data: {
        quoteNumber: `PR10-${label}-${randomUUID().slice(0, 8).toUpperCase()}`,
        clientId: scopedClientId,
        createdById: accountManagerId,
        status,
        currency: "SAR",
        issueDate: new Date(),
        validUntil: new Date(Date.now() + 86_400_000),
        acceptedAt: status === "ACCEPTED" ? new Date() : null,
        statusChangedAt: new Date(),
        clientSnapshot: {
          id: scopedClientId,
          code: scopedClientId === clientId ? `PR10-A-${runId}` : `PR10-B-${runId}`,
          name: scopedClientId === clientId ? "PR10 Client A" : "PR10 Client B",
          legalName: scopedClientId === clientId ? "PR10 Client A LLC" : "PR10 Client B LLC",
        },
        pricingSnapshot: { currency: "SAR", lines: [] },
        pricingRulesSnapshot: [{ code: "PR10-RATE", version: 1 }],
        termsSnapshot: {
          paymentTerms: "Due in 30 days",
          validUntil: new Date(Date.now() + 86_400_000).toISOString(),
        },
        sourceDraftSnapshot: { title: `PR10 ${label} quote snapshot` },
        totalsSnapshot: {
          subtotalMonthly: 0,
          subtotalSetup: 0,
          subtotalOneTime: 1_000,
          subtotal: 1_000,
          discountTotal: 100,
          finalBeforeTax: 900,
          taxTotal: 135,
          finalTotal: 1_035,
          internalCost: 450,
          marginAmount: 450,
          marginPct: 50,
          targetMarginPct: null,
          meetsTargetMargin: null,
        },
        snapshotHash: quoteHash,
        subtotalMonthly: 0,
        subtotalSetup: 0,
        subtotalOneTime: 1_000,
        discountTotal: 100,
        finalDueNoTax: 900,
        internalCost: 450,
        margin: 450,
        lockedAt: new Date(),
        items: {
          create: [
            {
              lineType: "ONE_TIME",
              oneTimeServiceRevisionId,
              serviceSnapshot: {
                serviceCode: "PR10-ONE-TIME",
                nameAr: "خدمة اختبار",
                nameEn: "PR10 One-time Service",
                quantity: 1,
                unitPrice: 1_000,
                baseAmount: 1_000,
                setupFee: 0,
                lineTotal: 900,
                internalCost: 450,
              },
              quantity: 1,
              unitPrice: 1_000,
              discount: 100,
              lineTotal: 900,
              internalCost: 450,
              sortOrder: 1,
            },
          ],
        },
      },
      include: { items: true },
    });
  }

  beforeAll(async () => {
    database = createDatabaseClient(environment.databaseUrl);
    const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
    const blueprint = await normalizeBlueprint(path.join(workspaceRoot, "data", "blueprints"));
    await seedBlueprint(database, blueprint);

    const [accountManagerRole, clientRole, invoicePermission] = await Promise.all([
      database.role.findUniqueOrThrow({ where: { code: "ROLE-AM" } }),
      database.role.findUniqueOrThrow({ where: { code: "ROLE-CLIENT" } }),
      database.permission.findUniqueOrThrow({ where: { code: "PERM-MANAGE-INVOICES" } }),
    ]);
    await database.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: accountManagerRole.id,
          permissionId: invoicePermission.id,
        },
      },
      create: {
        roleId: accountManagerRole.id,
        permissionId: invoicePermission.id,
        effect: "ALLOW",
      },
      update: { effect: "ALLOW" },
    });

    const revision = await database.oneTimeServiceRevision.findFirst({
      where: { status: "ACTIVE" },
      orderBy: [{ effectiveFrom: "desc" }, { version: "desc" }],
      select: { id: true },
    });
    if (!revision) {
      throw new Error("PR 10 invoice tests require at least one active one-time service revision");
    }
    oneTimeServiceRevisionId = revision.id;

    const passwordHash = await new PasswordHasherService().hash("StrongPassword123");
    const [client, otherClient] = await Promise.all([
      database.client.create({
        data: {
          code: `PR10-A-${runId}`,
          name: "PR10 Client A",
          legalName: "PR10 Client A LLC",
          sector: "Technology",
          city: "Riyadh",
          authorizedApprover: "Approver A",
        },
      }),
      database.client.create({
        data: {
          code: `PR10-B-${runId}`,
          name: "PR10 Client B",
          legalName: "PR10 Client B LLC",
          sector: "Retail",
          authorizedApprover: "Approver B",
        },
      }),
    ]);
    clientId = client.id;
    otherClientId = otherClient.id;
    accountManagerEmail = `am-${runId}@pr10.test`;
    clientEmail = `client-${runId}@pr10.test`;

    const [accountManager, clientUser] = await Promise.all([
      database.user.create({
        data: {
          email: accountManagerEmail,
          displayName: "PR10 Account Manager",
          userType: "INTERNAL",
          status: "ACTIVE",
          passwordHash,
          passwordChangedAt: new Date(),
        },
      }),
      database.user.create({
        data: {
          email: clientEmail,
          displayName: "PR10 Client User",
          userType: "EXTERNAL",
          status: "ACTIVE",
          passwordHash,
          passwordChangedAt: new Date(),
        },
      }),
    ]);
    accountManagerId = accountManager.id;
    await database.userRole.createMany({
      data: [
        { userId: accountManager.id, roleId: accountManagerRole.id },
        { userId: clientUser.id, roleId: clientRole.id },
      ],
    });
    await database.clientAssignment.create({
      data: { clientId, userId: accountManager.id, roleCode: "ROLE-AM" },
    });

    const module = await Test.createTestingModule({
      imports: [AppModule.forRoot(environment)],
    }).compile();
    app = module.createNestApplication();
    configureApiApplication(app, environment, { enableOpenApiUi: false });
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await database.$disconnect();
  });

  it("enforces authentication, role, permission, and assigned-client scope", async () => {
    await request(app.getHttpServer()).get("/api/v1/invoices").expect(401);
    const clientUser = await login(clientEmail);
    await clientUser.agent.get("/api/v1/invoices").expect(403);

    const otherQuote = await createQuoteFixture("OTHER", "ACCEPTED", otherClientId);
    const accountManager = await login(accountManagerEmail);
    await accountManager.agent
      .post("/api/v1/invoices")
      .set("X-CSRF-Token", accountManager.csrf)
      .send({ quoteId: otherQuote.id })
      .expect(404);
  });

  it("creates immutable invoices only from accepted quote snapshots", async () => {
    const accountManager = await login(accountManagerEmail);
    const acceptedQuote = await createQuoteFixture("ACCEPTED");
    const draftQuote = await createQuoteFixture("DRAFT", "DRAFT");

    const invalid = await accountManager.agent
      .post("/api/v1/invoices")
      .set("X-CSRF-Token", accountManager.csrf)
      .send({ quoteId: draftQuote.id })
      .expect(409);
    expect(invalid.body.code).toBe("ACCEPTED_QUOTE_REQUIRED_FOR_INVOICE");

    const invoice = await accountManager.agent
      .post("/api/v1/invoices")
      .set("X-CSRF-Token", accountManager.csrf)
      .send({ quoteId: acceptedQuote.id })
      .expect(201);

    expect(invoice.body).toMatchObject({
      quoteId: acceptedQuote.id,
      quoteNumber: acceptedQuote.quoteNumber,
      status: "DRAFT",
      sourceQuoteSnapshotHash: acceptedQuote.snapshotHash,
      finalDueNoTax: 900,
      client: { id: clientId, code: `PR10-A-${runId}` },
      quote: {
        id: acceptedQuote.id,
        quoteNumber: acceptedQuote.quoteNumber,
        status: "ACCEPTED",
        snapshotHash: acceptedQuote.snapshotHash,
      },
    });
    expect(invoice.body.invoiceNumber).toMatch(/^INV-\d{8}-[A-F0-9]{8}$/);
    expect(invoice.body.snapshotHash).toMatch(/^[a-f0-9]{64}$/);
    expect(invoice.body.items).toHaveLength(1);
    expect(invoice.body.items[0]).toMatchObject({
      quoteItemId: acceptedQuote.items[0]!.id,
      quantity: 1,
      unitPrice: 1000,
      discount: 100,
      lineTotal: 900,
    });

    const duplicate = await accountManager.agent
      .post("/api/v1/invoices")
      .set("X-CSRF-Token", accountManager.csrf)
      .send({ quoteId: acceptedQuote.id })
      .expect(409);
    expect(duplicate.body.code).toBe("INVOICE_ALREADY_EXISTS");

    const list = await accountManager.agent.get("/api/v1/invoices").expect(200);
    expect(list.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: invoice.body.id,
          invoiceNumber: invoice.body.invoiceNumber,
          quoteNumber: acceptedQuote.quoteNumber,
        }),
      ]),
    );

    await database.quote.update({
      where: { id: acceptedQuote.id },
      data: { statusReason: "Changed quote lifecycle note after invoice creation" },
    });
    const reloaded = await accountManager.agent
      .get(`/api/v1/invoices/${invoice.body.id}`)
      .expect(200);
    expect(reloaded.body.quote).toEqual(invoice.body.quote);
    expect(reloaded.body.items).toEqual(invoice.body.items);

    await expect(
      database.invoice.update({
        where: { id: invoice.body.id },
        data: { clientSnapshot: { changed: true } },
      }),
    ).rejects.toThrow();
    await expect(
      database.invoiceItem.update({
        where: { id: invoice.body.items[0].id },
        data: { lineTotal: 1 },
      }),
    ).rejects.toThrow();
  });

  it("advances invoice lifecycle without mutating snapshot content and audits events", async () => {
    const accountManager = await login(accountManagerEmail);
    const acceptedQuote = await createQuoteFixture("LIFECYCLE");
    const invoice = await accountManager.agent
      .post("/api/v1/invoices")
      .set("X-CSRF-Token", accountManager.csrf)
      .send({ quoteId: acceptedQuote.id })
      .expect(201);

    const originalSnapshot = {
      quote: invoice.body.quote,
      items: invoice.body.items,
      totals: invoice.body.totals,
      snapshotHash: invoice.body.snapshotHash,
    };
    const issued = await accountManager.agent
      .post(`/api/v1/invoices/${invoice.body.id}/issue`)
      .set("X-CSRF-Token", accountManager.csrf)
      .send({})
      .expect(200);
    expect(issued.body.status).toBe("ISSUED");
    expect(issued.body.issuedAt).toBeTruthy();
    expect({
      quote: issued.body.quote,
      items: issued.body.items,
      totals: issued.body.totals,
      snapshotHash: issued.body.snapshotHash,
    }).toEqual(originalSnapshot);

    const invalidCancel = await accountManager.agent
      .post(`/api/v1/invoices/${invoice.body.id}/cancel`)
      .set("X-CSRF-Token", accountManager.csrf)
      .send({})
      .expect(409);
    expect(invalidCancel.body.code).toBe("INVALID_INVOICE_STATUS_TRANSITION");

    const voided = await accountManager.agent
      .post(`/api/v1/invoices/${invoice.body.id}/void`)
      .set("X-CSRF-Token", accountManager.csrf)
      .send({ note: "Issued in error" })
      .expect(200);
    expect(voided.body).toMatchObject({
      status: "VOIDED",
      statusReason: "Issued in error",
    });
    expect(voided.body.voidedAt).toBeTruthy();

    const cancellableQuote = await createQuoteFixture("CANCEL-DRAFT");
    const cancellable = await accountManager.agent
      .post("/api/v1/invoices")
      .set("X-CSRF-Token", accountManager.csrf)
      .send({ quoteId: cancellableQuote.id })
      .expect(201);
    const cancelled = await accountManager.agent
      .post(`/api/v1/invoices/${cancellable.body.id}/cancel`)
      .set("X-CSRF-Token", accountManager.csrf)
      .send({})
      .expect(200);
    expect(cancelled.body.status).toBe("CANCELLED");
    expect(cancelled.body.cancelledAt).toBeTruthy();

    const auditEvents = await database.auditLog.findMany({
      where: {
        entityId: { in: [invoice.body.id, cancellable.body.id] },
        eventCode: {
          in: [
            "INVOICE_CANCELLED",
            "INVOICE_CREATED",
            "INVOICE_ISSUED",
            "INVOICE_STATUS_CHANGED",
            "INVOICE_VOIDED",
          ],
        },
      },
      select: { eventCode: true, requestId: true },
    });
    expect(auditEvents.map((event) => event.eventCode)).toEqual(
      expect.arrayContaining([
        "INVOICE_CANCELLED",
        "INVOICE_CREATED",
        "INVOICE_ISSUED",
        "INVOICE_STATUS_CHANGED",
        "INVOICE_VOIDED",
      ]),
    );
    expect(auditEvents.every((event) => Boolean(event.requestId))).toBe(true);
  });
});
