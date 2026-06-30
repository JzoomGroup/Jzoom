import "reflect-metadata";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { ApiEnvironment } from "@jzoom/config";
import { createDatabaseClient, normalizeBlueprint, seedBlueprint } from "@jzoom/database";
import type { JzoomDatabaseClient, Prisma } from "@jzoom/database";
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

function snapshotHash(label: string): string {
  return createHash("sha256").update(`${label}-${randomUUID()}`).digest("hex");
}

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
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

describeWithDatabase("PR 12 client portal quote and invoice views", () => {
  let app: INestApplication;
  let database: JzoomDatabaseClient;
  let clientId: string;
  let otherClientId: string;
  let clientEmail: string;
  let otherClientEmail: string;
  let accountManagerEmail: string;
  let accountManagerId: string;
  let oneTimeServiceRevisionId: string;
  let subscribedMonthlyServiceCode: string;
  let subscriptionServiceId: string;
  let includedServiceItemRevisionId: string;
  let includedItemCode: string;
  let excludedItemCode: string;
  const runId = randomUUID().slice(0, 8);

  async function login(email: string) {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post("/api/v1/auth/login")
      .send({ email, password: "StrongPassword123" })
      .expect(200);
    return agent;
  }

  function csrfFrom(response: request.Response): string {
    const header = response.headers["set-cookie"];
    const cookies = Array.isArray(header) ? header : header ? [header] : [];
    const csrfCookie = cookies.find((cookie) => cookie.startsWith("jzoom_csrf="));
    if (!csrfCookie) {
      throw new Error("CSRF cookie was not issued");
    }
    return decodeURIComponent(csrfCookie.split(";", 1)[0]!.slice("jzoom_csrf=".length));
  }

  async function loginWithCsrf(email: string) {
    const agent = request.agent(app.getHttpServer());
    const response = await agent
      .post("/api/v1/auth/login")
      .send({ email, password: "StrongPassword123" })
      .expect(200);
    return { agent, csrf: csrfFrom(response) };
  }

  async function createQuoteFixture(
    label: string,
    status: "DRAFT" | "ISSUED" | "ACCEPTED" | "REJECTED" = "ISSUED",
    scopedClientId = clientId,
  ) {
    const hash = snapshotHash(label);
    return database.quote.create({
      data: {
        quoteNumber: `PR12-Q-${label}-${randomUUID().slice(0, 8).toUpperCase()}`,
        clientId: scopedClientId,
        createdById: accountManagerId,
        status,
        currency: "SAR",
        issueDate: status === "DRAFT" ? null : new Date(),
        validUntil: new Date(Date.now() + 86_400_000),
        acceptedAt: status === "ACCEPTED" ? new Date() : null,
        statusChangedAt: new Date(),
        clientSnapshot: {
          id: scopedClientId,
          code: scopedClientId === clientId ? `PR12-A-${runId}` : `PR12-B-${runId}`,
          name: scopedClientId === clientId ? "PR12 Client A" : "PR12 Client B",
          legalName: scopedClientId === clientId ? "PR12 Client A LLC" : "PR12 Client B LLC",
          sector: "Technology",
          city: "Riyadh",
          authorizedApprover: "Approver A",
        },
        pricingSnapshot: { currency: "SAR", lines: [] },
        pricingRulesSnapshot: [{ code: "INTERNAL-RATE-RULE", version: 3 }],
        termsSnapshot: {
          paymentTerms: "Due in 30 days",
          deliveryTerms: "According to the accepted scope",
          additionalTerms: "Scope changes require approval",
          clientNotes: "Client-facing note",
          validUntil: new Date(Date.now() + 86_400_000).toISOString(),
        },
        sourceDraftSnapshot: {
          title: `PR12 ${label} client portal fixture`,
          notes: "Internal admin note that must not be exposed",
        },
        totalsSnapshot: {
          subtotalMonthly: 100,
          subtotalSetup: 25,
          subtotalOneTime: 300,
          subtotal: 425,
          discountTotal: 25,
          finalBeforeTax: 400,
          taxTotal: 60,
          finalTotal: 460,
          internalCost: 120,
          marginAmount: 280,
          marginPct: 70,
          targetMarginPct: 55,
          meetsTargetMargin: true,
        },
        snapshotHash: hash,
        subtotalMonthly: 100,
        subtotalSetup: 25,
        subtotalOneTime: 300,
        discountTotal: 25,
        finalDueNoTax: 400,
        internalCost: 120,
        margin: 280,
        lockedAt: new Date(),
        items: {
          create: [
            {
              lineType: "ONE_TIME",
              oneTimeServiceRevisionId,
              serviceSnapshot: {
                serviceCode: "PR12-ONE-TIME",
                nameAr: "خدمة بوابة العميل",
                nameEn: "PR12 Client Portal Service",
                quantity: 1,
                unitPrice: 425,
                baseAmount: 425,
                setupFee: 25,
                lineTotal: 400,
                internalCost: 120,
              },
              quantity: 1,
              unitPrice: 425,
              setupFee: 25,
              discount: 25,
              lineTotal: 400,
              internalCost: 120,
              sortOrder: 1,
              serviceItemSnapshots: {
                create: [
                  {
                    itemCode: "PR12-OUTPUT",
                    nameAr: "مخرج",
                    nameEn: "Client portal output",
                    expectedOutput: "Visible client deliverable",
                    requiresFile: false,
                    deductHours: true,
                    sortOrder: 1,
                  },
                ],
              },
            },
          ],
        },
      },
      include: { items: true },
    });
  }

  async function createInvoiceFixture(
    label: string,
    status: "DRAFT" | "ISSUED" | "CANCELLED" | "VOIDED" = "ISSUED",
    scopedClientId = clientId,
  ) {
    const quote = await createQuoteFixture(`INV-${label}`, "ACCEPTED", scopedClientId);
    return database.invoice.create({
      data: {
        invoiceNumber: `PR12-I-${label}-${randomUUID().slice(0, 8).toUpperCase()}`,
        quoteId: quote.id,
        clientId: scopedClientId,
        createdById: accountManagerId,
        status,
        currency: "SAR",
        issueDate: status === "ISSUED" ? new Date() : null,
        issuedAt: status === "ISSUED" ? new Date() : null,
        statusChangedAt: new Date(),
        clientSnapshot: json(quote.clientSnapshot),
        quoteSnapshot: {
          id: quote.id,
          quoteNumber: quote.quoteNumber,
          status: quote.status,
          snapshotHash: quote.snapshotHash,
          client: quote.clientSnapshot,
          terms: quote.termsSnapshot,
          totals: quote.totalsSnapshot,
        },
        pricingRulesSnapshot: json(quote.pricingRulesSnapshot),
        termsSnapshot: json(quote.termsSnapshot),
        totalsSnapshot: json(quote.totalsSnapshot),
        sourceQuoteSnapshotHash: quote.snapshotHash,
        snapshotHash: snapshotHash(`invoice-${label}`),
        discountTotal: 25,
        finalDueNoTax: 400,
        items: {
          create: [
            {
              itemSnapshot: {
                lineType: "ONE_TIME",
                serviceSnapshot: {
                  serviceCode: "PR12-ONE-TIME",
                  nameAr: "خدمة بوابة العميل",
                  nameEn: "PR12 Client Portal Service",
                  baseAmount: 425,
                  setupFee: 25,
                  lineTotal: 400,
                  internalCost: 120,
                },
                serviceItems: [
                  {
                    itemCode: "PR12-OUTPUT",
                    nameAr: "مخرج",
                    nameEn: "Client portal output",
                    expectedOutput: "Visible client deliverable",
                    requiresFile: false,
                    deductHours: true,
                    sortOrder: 1,
                  },
                ],
              },
              quantity: 1,
              unitPrice: 425,
              discount: 25,
              lineTotal: 400,
              sortOrder: 1,
            },
          ],
        },
      },
    });
  }

  beforeAll(async () => {
    database = createDatabaseClient(environment.databaseUrl);
    const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
    const blueprint = await normalizeBlueprint(path.join(workspaceRoot, "data", "blueprints"));
    await seedBlueprint(database, blueprint);

    const [accountManagerRole, clientRole] = await Promise.all([
      database.role.findUniqueOrThrow({ where: { code: "ROLE-AM" } }),
      database.role.findUniqueOrThrow({ where: { code: "ROLE-CLIENT" } }),
    ]);
    const revision = await database.oneTimeServiceRevision.findFirst({
      where: { status: "ACTIVE" },
      orderBy: [{ effectiveFrom: "desc" }, { version: "desc" }],
      select: { id: true },
    });
    if (!revision) {
      throw new Error("PR 12 client portal tests require an active one-time service revision");
    }
    oneTimeServiceRevisionId = revision.id;

    const passwordHash = await new PasswordHasherService().hash("StrongPassword123");
    const [client, otherClient] = await Promise.all([
      database.client.create({
        data: {
          code: `PR12-A-${runId}`,
          name: "PR12 Client A",
          legalName: "PR12 Client A LLC",
          sector: "Technology",
          city: "Riyadh",
          authorizedApprover: "Approver A",
        },
      }),
      database.client.create({
        data: {
          code: `PR12-B-${runId}`,
          name: "PR12 Client B",
          legalName: "PR12 Client B LLC",
          sector: "Retail",
          city: "Jeddah",
          authorizedApprover: "Approver B",
        },
      }),
    ]);
    clientId = client.id;
    otherClientId = otherClient.id;
    clientEmail = `client-${runId}@pr12.test`;
    otherClientEmail = `other-client-${runId}@pr12.test`;
    accountManagerEmail = `am-${runId}@pr12.test`;

    const [clientUser, otherClientUser, accountManager] = await Promise.all([
      database.user.create({
        data: {
          email: clientEmail,
          displayName: "PR12 Client User",
          userType: "EXTERNAL",
          status: "ACTIVE",
          passwordHash,
          passwordChangedAt: new Date(),
        },
      }),
      database.user.create({
        data: {
          email: otherClientEmail,
          displayName: "PR12 Other Client User",
          userType: "EXTERNAL",
          status: "ACTIVE",
          passwordHash,
          passwordChangedAt: new Date(),
        },
      }),
      database.user.create({
        data: {
          email: accountManagerEmail,
          displayName: "PR12 Account Manager",
          userType: "INTERNAL",
          status: "ACTIVE",
          passwordHash,
          passwordChangedAt: new Date(),
        },
      }),
    ]);
    accountManagerId = accountManager.id;

    await database.userRole.createMany({
      data: [
        { userId: clientUser.id, roleId: clientRole.id },
        { userId: otherClientUser.id, roleId: clientRole.id },
        { userId: accountManager.id, roleId: accountManagerRole.id },
      ],
    });
    await database.userScope.createMany({
      data: [
        { userId: clientUser.id, scopeType: "OWN_CLIENT", clientId },
        { userId: otherClientUser.id, scopeType: "OWN_CLIENT", clientId: otherClientId },
      ],
    });
    await database.clientAssignment.createMany({
      data: [
        { clientId, userId: clientUser.id, roleCode: "ROLE-CLIENT" },
        { clientId: otherClientId, userId: otherClientUser.id, roleCode: "ROLE-CLIENT" },
      ],
    });

    subscribedMonthlyServiceCode = `PR12-MONTHLY-${runId}`;
    includedItemCode = `PR12-INCLUDED-${runId}`;
    excludedItemCode = `PR12-EXCLUDED-${runId}`;
    const category = await database.monthlyServiceCategory.create({
      data: {
        code: `PR12-CAT-${runId}`,
        nameAr: "تصنيف بوابة العميل",
        nameEn: "Client portal category",
      },
    });
    const monthlyService = await database.monthlyService.create({
      data: {
        categoryId: category.id,
        code: subscribedMonthlyServiceCode,
      },
    });
    const serviceLevel = await database.serviceLevel.create({
      data: {
        code: `PR12-LVL-${runId}`,
        labelAr: "باقة اختبار",
        labelEn: "Test package",
      },
    });
    const monthlyServiceRevision = await database.monthlyServiceRevision.create({
      data: {
        monthlyServiceId: monthlyService.id,
        version: 1,
        status: "ACTIVE",
        effectiveFrom: new Date(Date.now() - 86_400_000),
        nameAr: "خدمة شهرية لاختبار البنود",
        nameEn: "Monthly service item scope test",
        domain: "Operations",
        description: "Verifies package item inclusion in the client portal.",
        sellingHourlyRateSar: 300,
        internalHourlyCostSar: 120,
        setupFeePct: 0,
        defaultSlaHours: 48,
      },
    });
    await database.monthlyServiceLevelConfig.create({
      data: {
        monthlyServiceRevisionId: monthlyServiceRevision.id,
        serviceLevelId: serviceLevel.id,
        hours: 10,
        isEnabled: true,
      },
    });
    const [includedItem, excludedItem] = await Promise.all([
      database.serviceItem.create({
        data: { code: includedItemCode, monthlyServiceId: monthlyService.id },
      }),
      database.serviceItem.create({
        data: { code: excludedItemCode, monthlyServiceId: monthlyService.id },
      }),
    ]);
    const [includedRevision, excludedRevision] = await Promise.all([
      database.serviceItemRevision.create({
        data: {
          serviceItemId: includedItem.id,
          version: 1,
          status: "ACTIVE",
          effectiveFrom: new Date(Date.now() - 86_400_000),
          nameAr: "بند مشمول في الباقة",
          nameEn: "Included package item",
          expectedOutput: "Visible only when the selected package includes it.",
        },
      }),
      database.serviceItemRevision.create({
        data: {
          serviceItemId: excludedItem.id,
          version: 1,
          status: "ACTIVE",
          effectiveFrom: new Date(Date.now() - 86_400_000),
          nameAr: "بند غير مشمول في الباقة",
          nameEn: "Excluded package item",
          expectedOutput: "Must not be exposed for this selected package.",
        },
      }),
    ]);
    includedServiceItemRevisionId = includedRevision.id;
    await database.serviceItemLevelInclusion.createMany({
      data: [
        {
          serviceItemRevisionId: includedRevision.id,
          serviceLevelId: serviceLevel.id,
          included: true,
        },
        {
          serviceItemRevisionId: excludedRevision.id,
          serviceLevelId: serviceLevel.id,
          included: false,
        },
      ],
    });
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
        hoursAllocated: 10,
        startsAt: new Date(Date.now() - 86_400_000),
        scopeSnapshot: { source: "PR12 package inclusion test" },
      },
    });
    subscriptionServiceId = subscriptionService.id;

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

  it("enforces client-only role access and scoped account context", async () => {
    await request(app.getHttpServer()).get("/api/v1/client-portal/me").expect(401);

    const accountManager = await login(accountManagerEmail);
    await accountManager.get("/api/v1/client-portal/me").expect(403);

    const clientUser = await login(clientEmail);
    const context = await clientUser.get("/api/v1/client-portal/me").expect(200);
    expect(context.body.clients).toEqual([
      expect.objectContaining({ id: clientId, code: `PR12-A-${runId}` }),
    ]);
  });

  it("returns only monthly service items included in the selected client package", async () => {
    const clientUser = await login(clientEmail);
    const context = await clientUser.get("/api/v1/client-portal/me").expect(200);
    const subscribedService = context.body.services.subscribedMonthly.find(
      (service: { service: { code: string } }) => service.service.code === subscribedMonthlyServiceCode,
    );

    expect(subscribedService).toBeDefined();
    expect(subscribedService.serviceItems.map((item: { code: string }) => item.code)).toEqual([
      includedItemCode,
    ]);
    expect(JSON.stringify(subscribedService)).not.toContain(excludedItemCode);
  });

  it("does not expose catalog pricing or delivery estimates in the client account context", async () => {
    const clientUser = await login(clientEmail);
    const context = await clientUser.get("/api/v1/client-portal/me").expect(200);
    const clientCatalogText = JSON.stringify({
      availableMonthly: context.body.services.availableMonthly,
      availableOneTime: context.body.services.availableOneTime,
    });

    expect(clientCatalogText).not.toContain("sellingHourlyRateSar");
    expect(clientCatalogText).not.toContain("basePriceSar");
    expect(clientCatalogText).not.toContain("estimatedHours");
    expect(clientCatalogText).not.toContain("durationDays");
    expect(clientCatalogText).not.toContain("internalHourlyCostSar");
  });

  it("returns client-visible request counts in summaries and detail views", async () => {
    const { agent: clientUser, csrf } = await loginWithCsrf(clientEmail);
    const createResponse = await clientUser
      .post("/api/v1/client-portal/requests")
      .set("X-CSRF-Token", csrf)
      .send({
        clientId,
        subscriptionServiceId,
        serviceItemRevisionId: includedServiceItemRevisionId,
        title: "Client visible count request",
        description: "Verifies client-safe request counters.",
        priority: "NORMAL",
      })
      .expect(201);
    const requestId = createResponse.body.id as string;

    await database.comment.createMany({
      data: [
        {
          requestId,
          authorId: accountManagerId,
          body: "Visible client comment",
          isClientVisible: true,
        },
        {
          requestId,
          authorId: accountManagerId,
          body: "Internal-only comment",
          isClientVisible: false,
        },
      ],
    });
    await database.fileMetadata.createMany({
      data: [
        {
          requestId,
          uploadedById: accountManagerId,
          storageProvider: "metadata",
          storageKey: `pr12/${runId}/${requestId}/client-visible.txt`,
          originalName: "client-visible.txt",
          mimeType: "text/plain",
          sizeBytes: 10n,
          sha256: snapshotHash("client-visible-file"),
          visibility: "CLIENT_VISIBLE",
        },
        {
          requestId,
          uploadedById: accountManagerId,
          storageProvider: "metadata",
          storageKey: `pr12/${runId}/${requestId}/internal.txt`,
          originalName: "internal.txt",
          mimeType: "text/plain",
          sizeBytes: 10n,
          sha256: snapshotHash("internal-file"),
          visibility: "INTERNAL",
        },
      ],
    });
    await database.requestOutput.createMany({
      data: [
        {
          requestId,
          createdById: accountManagerId,
          sharedById: accountManagerId,
          code: `PR12-SHARED-${runId}`,
          title: "Shared output",
          status: "SHARED_WITH_CLIENT",
          sharedAt: new Date(),
        },
        {
          requestId,
          createdById: accountManagerId,
          code: `PR12-DRAFT-${runId}`,
          title: "Draft output",
          status: "DRAFT",
        },
      ],
    });
    await database.clientDocumentRequest.createMany({
      data: [
        {
          requestId,
          requestedById: accountManagerId,
          title: "Visible requested document",
          status: "REQUESTED",
        },
        {
          requestId,
          requestedById: accountManagerId,
          title: "Cancelled requested document",
          status: "CANCELLED",
          cancelledAt: new Date(),
        },
      ],
    });
    await database.internalNote.create({
      data: {
        requestId,
        authorId: accountManagerId,
        body: "Internal note must not be counted for clients",
      },
    });

    const detail = await clientUser
      .get(`/api/v1/client-portal/requests/${requestId}`)
      .expect(200);
    expect(detail.body.counts).toMatchObject({
      comments: 1,
      documentRequests: 1,
      files: 1,
      internalNotes: 0,
      outputs: 1,
      tasks: 0,
      timeEntries: 0,
      workflowEvents: 0,
    });

    const list = await clientUser.get("/api/v1/client-portal/requests").expect(200);
    const summary = list.body.find((item: { id: string }) => item.id === requestId);
    expect(summary.counts).toMatchObject(detail.body.counts);
  });

  it("lists only client-safe quote and invoice records", async () => {
    const issuedQuote = await createQuoteFixture("ISSUED", "ISSUED");
    const acceptedQuote = await createQuoteFixture("ACCEPTED", "ACCEPTED");
    const draftQuote = await createQuoteFixture("DRAFT", "DRAFT");
    const rejectedQuote = await createQuoteFixture("REJECTED", "REJECTED");
    const otherQuote = await createQuoteFixture("OTHER", "ISSUED", otherClientId);
    const issuedInvoice = await createInvoiceFixture("ISSUED", "ISSUED");
    const draftInvoice = await createInvoiceFixture("DRAFT", "DRAFT");
    const otherInvoice = await createInvoiceFixture("OTHER", "ISSUED", otherClientId);

    const clientUser = await login(clientEmail);
    const quotes = await clientUser.get("/api/v1/client-portal/quotes").expect(200);
    expect(quotes.body.map((quote: { id: string }) => quote.id)).toEqual(
      expect.arrayContaining([issuedQuote.id, acceptedQuote.id]),
    );
    expect(quotes.body.map((quote: { id: string }) => quote.id)).not.toEqual(
      expect.arrayContaining([draftQuote.id, rejectedQuote.id, otherQuote.id]),
    );

    const invoices = await clientUser.get("/api/v1/client-portal/invoices").expect(200);
    expect(invoices.body.map((invoice: { id: string }) => invoice.id)).toEqual(
      expect.arrayContaining([issuedInvoice.id]),
    );
    expect(invoices.body.map((invoice: { id: string }) => invoice.id)).not.toEqual(
      expect.arrayContaining([draftInvoice.id, otherInvoice.id]),
    );
  });

  it("returns sanitized immutable quote and invoice snapshots with PDF access audits", async () => {
    const quote = await createQuoteFixture("DETAIL", "ISSUED");
    const invoice = await createInvoiceFixture("DETAIL", "ISSUED");
    const clientUser = await login(clientEmail);

    const quoteDetail = await clientUser
      .get(`/api/v1/client-portal/quotes/${quote.id}`)
      .expect(200);
    expect(quoteDetail.body).toMatchObject({
      id: quote.id,
      status: "ISSUED",
      client: { id: clientId, code: `PR12-A-${runId}` },
      totals: { finalTotal: 460 },
    });
    const quoteText = JSON.stringify(quoteDetail.body);
    expect(quoteText).not.toContain("internalCost");
    expect(quoteText).not.toContain("margin");
    expect(quoteText).not.toContain("pricingRules");
    expect(quoteText).not.toContain("sourceDraft");
    expect(quoteText).not.toContain("Internal admin note");
    expect(quoteText).not.toContain("deductHours");

    const invoiceDetail = await clientUser
      .get(`/api/v1/client-portal/invoices/${invoice.id}`)
      .expect(200);
    expect(invoiceDetail.body).toMatchObject({
      id: invoice.id,
      status: "ISSUED",
      client: { id: clientId, code: `PR12-A-${runId}` },
      finalDueNoTax: 400,
    });
    const invoiceText = JSON.stringify(invoiceDetail.body);
    expect(invoiceText).not.toContain("internalCost");
    expect(invoiceText).not.toContain("margin");
    expect(invoiceText).not.toContain("pricingRules");
    expect(invoiceText).not.toContain("deductHours");

    const otherClientUser = await login(otherClientEmail);
    await otherClientUser.get(`/api/v1/client-portal/quotes/${quote.id}`).expect(404);
    await otherClientUser.get(`/api/v1/client-portal/invoices/${invoice.id}`).expect(404);

    const quotePdf = await clientUser
      .get(`/api/v1/client-portal/quotes/${quote.id}/pdf`)
      .buffer(true)
      .parse(pdfParser)
      .expect(200);
    expect(quotePdf.headers["content-type"]).toContain("application/pdf");
    expect((quotePdf.body as Buffer).subarray(0, 4).toString()).toBe("%PDF");

    const invoicePdf = await clientUser
      .get(`/api/v1/client-portal/invoices/${invoice.id}/pdf`)
      .buffer(true)
      .parse(pdfParser)
      .expect(200);
    expect(invoicePdf.headers["content-type"]).toContain("application/pdf");
    expect((invoicePdf.body as Buffer).subarray(0, 4).toString()).toBe("%PDF");

    const auditEvents = await database.auditLog.findMany({
      where: {
        actor: { email: clientEmail },
        entityId: { in: [quote.id, invoice.id] },
        eventCode: {
          in: [
            "CLIENT_QUOTE_VIEWED",
            "CLIENT_QUOTE_PDF_DOWNLOADED",
            "CLIENT_INVOICE_VIEWED",
            "CLIENT_INVOICE_PDF_DOWNLOADED",
          ],
        },
      },
      select: { eventCode: true, requestId: true },
    });
    expect(auditEvents.map((event) => event.eventCode)).toEqual(
      expect.arrayContaining([
        "CLIENT_QUOTE_VIEWED",
        "CLIENT_QUOTE_PDF_DOWNLOADED",
        "CLIENT_INVOICE_VIEWED",
        "CLIENT_INVOICE_PDF_DOWNLOADED",
      ]),
    );
    expect(auditEvents.every((event) => Boolean(event.requestId))).toBe(true);
  });
});
