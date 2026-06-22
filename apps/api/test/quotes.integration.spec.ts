import "reflect-metadata";
import { randomUUID } from "node:crypto";
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

interface ParserResponse {
  on(event: "data", listener: (chunk: Buffer | string) => void): unknown;
  on(event: "end", listener: () => void): unknown;
}

function pdfParser(
  response: ParserResponse,
  callback: (error: Error | null, body: Buffer) => void,
): void {
  const chunks: Buffer[] = [];
  response.on("data", (chunk: Buffer | string) => {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  });
  response.on("end", () => callback(null, Buffer.concat(chunks)));
}

describeWithDatabase("PR 7 immutable quote snapshots", () => {
  let app: INestApplication;
  let database: JzoomDatabaseClient;
  let clientId: string;
  let otherClientId: string;
  let accountManagerId: string;

  async function login(email: string) {
    const agent = request.agent(app.getHttpServer());
    const response = await agent
      .post("/api/v1/auth/login")
      .send({ email, password: "StrongPassword123" })
      .expect(200);
    return { agent, csrf: csrfFrom(response) };
  }

  async function createIssuedQuoteFixture(
    label: string,
    validUntil = new Date(Date.now() + 86_400_000),
  ) {
    return database.quote.create({
      data: {
        quoteNumber: `PR9-${label}-${randomUUID().slice(0, 8).toUpperCase()}`,
        clientId,
        createdById: accountManagerId,
        status: "ISSUED",
        currency: "SAR",
        issueDate: new Date(),
        validUntil,
        clientSnapshot: {
          id: clientId,
          code: "PR7-CLIENT-A",
          name: "PR7 Client A",
          legalName: "PR7 Client A LLC",
        },
        pricingSnapshot: { currency: "SAR", lines: [] },
        pricingRulesSnapshot: [],
        termsSnapshot: {
          paymentTerms: "Due in 30 days",
          validUntil: validUntil.toISOString(),
        },
        sourceDraftSnapshot: { title: `PR9 ${label} lifecycle fixture` },
        totalsSnapshot: {
          subtotalMonthly: 0,
          subtotalSetup: 0,
          subtotalOneTime: 0,
          subtotal: 0,
          discountTotal: 0,
          finalBeforeTax: 0,
          taxTotal: 0,
          finalTotal: 0,
          internalCost: 0,
          marginAmount: 0,
          marginPct: 0,
          targetMarginPct: null,
          meetsTargetMargin: null,
        },
        snapshotHash: `${randomUUID().replaceAll("-", "")}${randomUUID().replaceAll("-", "")}`,
        subtotalMonthly: 0,
        subtotalSetup: 0,
        subtotalOneTime: 0,
        discountTotal: 0,
        finalDueNoTax: 0,
        internalCost: 0,
        margin: 0,
        lockedAt: new Date(),
      },
    });
  }

  beforeAll(async () => {
    database = createDatabaseClient(environment.databaseUrl);
    const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
    const blueprint = await normalizeBlueprint(path.join(workspaceRoot, "data", "blueprints"));
    await seedBlueprint(database, blueprint);

    const [accountManagerRole, clientRole, quotePermission] = await Promise.all([
      database.role.findUniqueOrThrow({ where: { code: "ROLE-AM" } }),
      database.role.findUniqueOrThrow({ where: { code: "ROLE-CLIENT" } }),
      database.permission.findUniqueOrThrow({ where: { code: "PERM-MANAGE-QUOTES" } }),
    ]);
    await database.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: accountManagerRole.id, permissionId: quotePermission.id },
      },
      create: { roleId: accountManagerRole.id, permissionId: quotePermission.id, effect: "ALLOW" },
      update: { effect: "ALLOW" },
    });

    const passwordHash = await new PasswordHasherService().hash("StrongPassword123");
    const [client, otherClient] = await Promise.all([
      database.client.create({
        data: {
          code: "PR7-CLIENT-A",
          name: "PR7 Client A",
          legalName: "PR7 Client A LLC",
          sector: "Technology",
          city: "Riyadh",
          authorizedApprover: "Approver A",
        },
      }),
      database.client.create({
        data: {
          code: "PR7-CLIENT-B",
          name: "PR7 Client B",
          sector: "Retail",
          authorizedApprover: "Approver B",
        },
      }),
    ]);
    clientId = client.id;
    otherClientId = otherClient.id;

    const [accountManager, clientUser] = await Promise.all([
      database.user.create({
        data: {
          email: "am@pr7.test",
          displayName: "PR7 Account Manager",
          userType: "INTERNAL",
          status: "ACTIVE",
          passwordHash,
          passwordChangedAt: new Date(),
        },
      }),
      database.user.create({
        data: {
          email: "client@pr7.test",
          displayName: "PR7 Client User",
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

  it("enforces authentication, role, and assigned-client scope", async () => {
    await request(app.getHttpServer()).get("/api/v1/quotes").expect(401);
    const clientUser = await login("client@pr7.test");
    await clientUser.agent.get("/api/v1/quotes").expect(403);

    const inaccessibleDraft = await database.pricingDraft.create({
      data: {
        draftNumber: "PR7-OTHER-DRAFT",
        clientId: otherClientId,
        createdById: accountManagerId,
        currency: "SAR",
        pricingDate: new Date(),
        title: "Other client draft",
        clientSnapshot: { id: otherClientId, code: "PR7-CLIENT-B", name: "PR7 Client B" },
        calculationSnapshot: {
          calculatedAt: new Date().toISOString(),
          pricingDate: new Date().toISOString(),
          currency: "SAR",
          lines: [],
          appliedRules: [],
          totals: {},
        },
        calculationVersion: 1,
        lastCalculatedAt: new Date(),
      },
    });
    const accountManager = await login("am@pr7.test");
    await accountManager.agent
      .post("/api/v1/quotes")
      .set("X-CSRF-Token", accountManager.csrf)
      .send({
        pricingDraftId: inaccessibleDraft.id,
        terms: { paymentTerms: "Due in 30 days" },
      })
      .expect(404);
  });

  it("creates a complete immutable snapshot and preserves it after source changes", async () => {
    const taxRule = await database.pricingRule.upsert({
      where: { code: "PR7-TAX-SNAPSHOT" },
      create: {
        code: "PR7-TAX-SNAPSHOT",
        name: "PR7 Snapshot Tax",
        status: "ACTIVE",
        sortOrder: 900,
      },
      update: {
        name: "PR7 Snapshot Tax",
        status: "ACTIVE",
        sortOrder: 900,
        archivedAt: null,
      },
    });
    await database.pricingRuleRevision.upsert({
      where: { pricingRuleId_version: { pricingRuleId: taxRule.id, version: 1 } },
      create: {
        pricingRuleId: taxRule.id,
        version: 1,
        status: "ACTIVE",
        effectiveFrom: new Date(Date.now() - 60_000),
        formulaOrRule: "final_before_tax * 1%",
        appliesTo: "PR7 quote snapshot test",
        ruleType: "TAX",
        calculationMethod: "PERCENTAGE",
        value: 1,
        currency: "SAR",
        targetType: "ALL",
        priority: 900,
        isStackable: true,
        isEnabled: true,
      },
      update: {
        status: "ACTIVE",
        effectiveFrom: new Date(Date.now() - 60_000),
        effectiveTo: null,
        formulaOrRule: "final_before_tax * 1%",
        appliesTo: "PR7 quote snapshot test",
        ruleType: "TAX",
        calculationMethod: "PERCENTAGE",
        value: 1,
        currency: "SAR",
        targetType: "ALL",
        priority: 900,
        isStackable: true,
        isEnabled: true,
      },
    });

    const accountManager = await login("am@pr7.test");
    const catalog = await accountManager.agent.get("/api/v1/pricing/catalog").expect(200);
    const monthly = catalog.body.monthlyServices[0];
    const oneTime = catalog.body.oneTimeServices[0];
    expect(monthly?.revision?.levels?.length).toBeGreaterThan(0);
    expect(oneTime?.revision).toBeDefined();

    const draftPayload = {
      clientId,
      title: "PR7 immutable quote source",
      notes: "Internal pricing note",
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
    const draft = await accountManager.agent
      .post("/api/v1/pricing/drafts")
      .set("X-CSRF-Token", accountManager.csrf)
      .send(draftPayload)
      .expect(201);

    const quote = await accountManager.agent
      .post("/api/v1/quotes")
      .set("X-CSRF-Token", accountManager.csrf)
      .send({
        pricingDraftId: draft.body.id,
        validityDays: 30,
        terms: {
          paymentTerms: "50% upfront, 50% on completion",
          deliveryTerms: "According to the snapshotted service plan",
          additionalTerms: "Scope changes require written approval",
          clientNotes: "Prepared for Approver A",
        },
      })
      .expect(201);

    expect(quote.body).toMatchObject({
      status: "DRAFT",
      sourcePricingDraftId: draft.body.id,
      sourceDraftVersion: 1,
      client: {
        id: clientId,
        code: "PR7-CLIENT-A",
        legalName: "PR7 Client A LLC",
      },
      terms: {
        paymentTerms: "50% upfront, 50% on completion",
      },
    });
    expect(quote.body.snapshotHash).toMatch(/^[a-f0-9]{64}$/);
    expect(quote.body.items).toHaveLength(2);
    expect(quote.body.pricingRules).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "PR7-TAX-SNAPSHOT", version: 1 })]),
    );
    expect(quote.body.totals.finalTotal).toBeGreaterThan(0);
    expect(quote.body.items[0].serviceSnapshot.nameEn).toBeTruthy();

    const originalSnapshot = {
      hash: quote.body.snapshotHash,
      client: quote.body.client,
      pricing: quote.body.pricing,
      rules: quote.body.pricingRules,
      terms: quote.body.terms,
      totals: quote.body.totals,
      items: quote.body.items,
    };
    await accountManager.agent
      .put(`/api/v1/pricing/drafts/${draft.body.id}`)
      .set("X-CSRF-Token", accountManager.csrf)
      .send({
        ...draftPayload,
        title: "Changed after quote",
        oneTimeSelections: [],
      })
      .expect(200);
    await database.pricingRule.update({
      where: { code: "PR7-TAX-SNAPSHOT" },
      data: { name: "Changed after quote creation" },
    });

    const reloaded = await accountManager.agent.get(`/api/v1/quotes/${quote.body.id}`).expect(200);
    expect({
      hash: reloaded.body.snapshotHash,
      client: reloaded.body.client,
      pricing: reloaded.body.pricing,
      rules: reloaded.body.pricingRules,
      terms: reloaded.body.terms,
      totals: reloaded.body.totals,
      items: reloaded.body.items,
    }).toEqual(originalSnapshot);

    await expect(
      database.quote.update({
        where: { id: quote.body.id },
        data: { clientSnapshot: { changed: true } },
      }),
    ).rejects.toThrow();
    await expect(
      database.quoteItem.update({
        where: { id: quote.body.items[0].id },
        data: { lineTotal: 1 },
      }),
    ).rejects.toThrow();
    expect(await database.invoice.count({ where: { quoteId: quote.body.id } })).toBe(0);

    const pdf = await accountManager.agent
      .get(`/api/v1/quotes/${quote.body.id}/pdf`)
      .buffer(true)
      .parse(pdfParser)
      .expect(200);
    expect(pdf.headers["content-type"]).toContain("application/pdf");
    expect(pdf.headers["content-disposition"]).toContain(`${quote.body.quoteNumber}.pdf`);
    expect((pdf.body as Buffer).subarray(0, 4).toString()).toBe("%PDF");

    const pdfAudit = await database.auditLog.findFirst({
      where: { entityId: quote.body.id, eventCode: "QUOTE_PDF_GENERATED" },
      select: { after: true, requestId: true },
    });
    expect(pdfAudit?.requestId).toBeTruthy();
    expect(pdfAudit?.after).toMatchObject({
      filename: `${quote.body.quoteNumber}.pdf`,
      quoteNumber: quote.body.quoteNumber,
      snapshotHash: quote.body.snapshotHash,
    });

    const invalidAccept = await accountManager.agent
      .post(`/api/v1/quotes/${quote.body.id}/accept`)
      .set("X-CSRF-Token", accountManager.csrf)
      .send({})
      .expect(409);
    expect(invalidAccept.body.code).toBe("INVALID_QUOTE_STATUS_TRANSITION");

    const rejectedFixture = await createIssuedQuoteFixture("REJECT");
    const rejected = await accountManager.agent
      .post(`/api/v1/quotes/${rejectedFixture.id}/reject`)
      .set("X-CSRF-Token", accountManager.csrf)
      .send({ note: "Client selected a different option" })
      .expect(200);
    expect(rejected.body).toMatchObject({
      status: "REJECTED",
      statusReason: "Client selected a different option",
    });
    expect(rejected.body.rejectedAt).toBeTruthy();

    const cancelledFixture = await createIssuedQuoteFixture("CANCEL");
    const cancelled = await accountManager.agent
      .post(`/api/v1/quotes/${cancelledFixture.id}/cancel`)
      .set("X-CSRF-Token", accountManager.csrf)
      .send({})
      .expect(200);
    expect(cancelled.body.status).toBe("CANCELLED");
    expect(cancelled.body.cancelledAt).toBeTruthy();
    expect(cancelled.body.statusReason).toBeNull();

    const expiredAcceptanceFixture = await createIssuedQuoteFixture(
      "PAST",
      new Date(Date.now() - 60_000),
    );
    const expiredAccept = await accountManager.agent
      .post(`/api/v1/quotes/${expiredAcceptanceFixture.id}/accept`)
      .set("X-CSRF-Token", accountManager.csrf)
      .send({})
      .expect(409);
    expect(expiredAccept.body.code).toBe("EXPIRED_QUOTE_CANNOT_BE_ACCEPTED");

    const expired = await accountManager.agent
      .post(`/api/v1/quotes/${expiredAcceptanceFixture.id}/expire`)
      .set("X-CSRF-Token", accountManager.csrf)
      .send({})
      .expect(200);
    expect(expired.body.status).toBe("EXPIRED");
    expect(expired.body.expiredAt).toBeTruthy();

    await accountManager.agent
      .patch(`/api/v1/quotes/${quote.body.id}/status`)
      .set("X-CSRF-Token", accountManager.csrf)
      .send({ status: "ISSUED" })
      .expect(200);
    const accepted = await accountManager.agent
      .post(`/api/v1/quotes/${quote.body.id}/accept`)
      .set("X-CSRF-Token", accountManager.csrf)
      .send({})
      .expect(200);
    expect(accepted.body.status).toBe("ACCEPTED");
    expect(accepted.body.acceptedAt).toBeTruthy();
    expect(accepted.body.snapshotHash).toBe(originalSnapshot.hash);
    await accountManager.agent
      .post(`/api/v1/quotes/${quote.body.id}/reject`)
      .set("X-CSRF-Token", accountManager.csrf)
      .send({})
      .expect(409);

    const auditEvents = await database.auditLog.findMany({
      where: {
        entityId: {
          in: [quote.body.id, rejectedFixture.id, cancelledFixture.id, expiredAcceptanceFixture.id],
        },
        eventCode: {
          in: [
            "QUOTE_ACCEPTED",
            "QUOTE_CANCELLED",
            "QUOTE_CREATED",
            "QUOTE_EXPIRED",
            "QUOTE_PDF_GENERATED",
            "QUOTE_REJECTED",
            "QUOTE_STATUS_CHANGED",
          ],
        },
      },
      select: { eventCode: true, requestId: true },
    });
    expect(auditEvents.map((event) => event.eventCode)).toEqual(
      expect.arrayContaining([
        "QUOTE_ACCEPTED",
        "QUOTE_CANCELLED",
        "QUOTE_CREATED",
        "QUOTE_EXPIRED",
        "QUOTE_PDF_GENERATED",
        "QUOTE_REJECTED",
        "QUOTE_STATUS_CHANGED",
      ]),
    );
    expect(auditEvents.every((event) => Boolean(event.requestId))).toBe(true);
  });
});
