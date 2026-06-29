import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { AuthAuditService } from "../auth/audit.service.js";
import type { AuthenticatedPrincipal, RequestMetadata } from "../auth/auth.types.js";
import { DatabaseService } from "../database/database.service.js";
import { InvoicePdfService } from "../invoices/invoice-pdf.service.js";
import { QuotePdfService } from "../quotes/quote-pdf.service.js";
import { CLIENT_PORTAL_EVENT } from "./client-portal.constants.js";

type ClientPortalQuoteStatus = "ISSUED" | "ACCEPTED";
type ClientPortalInvoiceStatus = "ISSUED";

const clientQuoteStatuses: ClientPortalQuoteStatus[] = ["ISSUED", "ACCEPTED"];
const clientInvoiceStatuses: ClientPortalInvoiceStatus[] = ["ISSUED"];

function numberValue(value: unknown): number {
  return Number(value);
}

function objectValue(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" ? value : null;
}

function optionalNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function compactObject<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, nested]) => nested !== undefined),
  ) as T;
}

@Injectable()
export class ClientPortalService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AuthAuditService) private readonly audit: AuthAuditService,
    @Inject(QuotePdfService) private readonly quotePdf: QuotePdfService,
    @Inject(InvoicePdfService) private readonly invoicePdf: InvoicePdfService,
  ) {}

  async profile(principal: AuthenticatedPrincipal) {
    const clientIds = this.clientIdsFor(principal);
    const [clients, subscribedMonthly, availableMonthly, availableOneTime] = await Promise.all([
      this.database.prisma.client.findMany({
        where: { id: { in: clientIds } },
        orderBy: [{ name: "asc" }, { code: "asc" }],
        select: {
          id: true,
          code: true,
          name: true,
          legalName: true,
          sector: true,
          city: true,
          authorizedApprover: true,
        },
      }),
      this.subscribedMonthlyServices(clientIds),
      this.availableMonthlyServices(),
      this.availableOneTimeServices(),
    ]);
    return {
      user: {
        id: principal.userId,
        email: principal.email,
        displayName: principal.displayName,
        preferredLocale: principal.preferredLocale,
      },
      clients,
      services: {
        subscribedMonthly,
        availableMonthly,
        availableOneTime,
      },
    };
  }

  private async subscribedMonthlyServices(clientIds: string[]) {
    const now = new Date();
    const subscriptions = await this.database.prisma.subscription.findMany({
      where: {
        clientId: { in: clientIds },
        status: "ACTIVE",
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
      include: {
        client: { select: { id: true, code: true, name: true } },
        services: {
          where: {
            status: "ACTIVE",
            startsAt: { lte: now },
            OR: [{ endsAt: null }, { endsAt: { gt: now } }],
          },
          orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
          include: {
            serviceLevel: true,
            monthlyServiceRevision: {
              include: {
                monthlyService: {
                  include: {
                    category: true,
                    items: {
                      where: { status: "ACTIVE" },
                      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
                      include: {
                        revisions: {
                          where: {
                            status: "ACTIVE",
                            visibleInQuote: true,
                            AND: [
                              { OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }] },
                              { OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] },
                            ],
                          },
                          orderBy: { version: "desc" },
                          take: 1,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return subscriptions.flatMap((subscription) =>
      subscription.services.map((service) => {
        const revision = service.monthlyServiceRevision;
        return {
          id: service.id,
          subscriptionId: subscription.id,
          clientId: subscription.clientId,
          client: subscription.client,
          status: service.status,
          startsAt: service.startsAt.toISOString(),
          endsAt: service.endsAt?.toISOString() ?? null,
          hoursAllocated: numberValue(service.hoursAllocated),
          service: {
            id: revision.monthlyService.id,
            code: revision.monthlyService.code,
            revisionId: revision.id,
            nameAr: revision.nameAr,
            nameEn: revision.nameEn,
            serviceLine: revision.serviceLine,
            domain: revision.domain,
            description: revision.description,
            category: {
              id: revision.monthlyService.category.id,
              code: revision.monthlyService.category.code,
              nameAr: revision.monthlyService.category.nameAr,
              nameEn: revision.monthlyService.category.nameEn,
            },
          },
          serviceLevel: {
            id: service.serviceLevel.id,
            code: service.serviceLevel.code,
            labelAr: service.serviceLevel.labelAr,
            labelEn: service.serviceLevel.labelEn,
          },
          serviceItems: revision.monthlyService.items.flatMap((item) => {
            const itemRevision = item.revisions[0];
            return itemRevision
              ? [
                  {
                    id: itemRevision.id,
                    itemId: item.id,
                    code: item.code,
                    nameAr: itemRevision.nameAr,
                    nameEn: itemRevision.nameEn,
                    expectedOutput: itemRevision.expectedOutput,
                    requiresFile: itemRevision.requiresFile,
                  },
                ]
              : [];
          }),
        };
      }),
    );
  }

  private async availableMonthlyServices() {
    const now = new Date();
    const services = await this.database.prisma.monthlyService.findMany({
      where: {
        status: "ACTIVE",
        category: { status: "ACTIVE" },
        revisions: {
          some: {
            status: "ACTIVE",
            visibleInPricing: true,
            AND: [
              { OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }] },
              { OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] },
            ],
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      include: {
        category: true,
        revisions: {
          where: {
            status: "ACTIVE",
            visibleInPricing: true,
            AND: [
              { OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }] },
              { OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] },
            ],
          },
          orderBy: { version: "desc" },
          take: 1,
        },
      },
    });

    return services.flatMap((service) => {
      const revision = service.revisions[0];
      return revision
        ? [
            {
              id: service.id,
              code: service.code,
              category: {
                id: service.category.id,
                code: service.category.code,
                nameAr: service.category.nameAr,
                nameEn: service.category.nameEn,
              },
              revisionId: revision.id,
              nameAr: revision.nameAr,
              nameEn: revision.nameEn,
              description: revision.description,
              serviceLine: revision.serviceLine,
              domain: revision.domain,
            },
          ]
        : [];
    });
  }

  private async availableOneTimeServices() {
    const now = new Date();
    const services = await this.database.prisma.oneTimeService.findMany({
      where: {
        status: "ACTIVE",
        category: { status: "ACTIVE" },
        revisions: {
          some: {
            status: "ACTIVE",
            visibleInPricing: true,
            AND: [
              { OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }] },
              { OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] },
            ],
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      include: {
        category: true,
        revisions: {
          where: {
            status: "ACTIVE",
            visibleInPricing: true,
            AND: [
              { OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }] },
              { OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] },
            ],
          },
          orderBy: { version: "desc" },
          take: 1,
        },
      },
    });

    return services.flatMap((service) => {
      const revision = service.revisions[0];
      return revision
        ? [
            {
              id: service.id,
              code: service.code,
              category: {
                id: service.category.id,
                code: service.category.code,
                nameAr: service.category.nameAr,
                nameEn: service.category.nameEn,
              },
              revisionId: revision.id,
              nameAr: revision.nameAr,
              nameEn: revision.nameEn,
              description: revision.description,
              serviceLine: service.serviceLine,
            },
          ]
        : [];
    });
  }

  async listQuotes(principal: AuthenticatedPrincipal) {
    const quotes = await this.database.prisma.quote.findMany({
      where: {
        clientId: { in: this.clientIdsFor(principal) },
        status: { in: clientQuoteStatuses },
      },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { items: true } } },
    });
    return quotes.map((quote) => ({
      id: quote.id,
      quoteNumber: quote.quoteNumber,
      status: quote.status,
      currency: quote.currency,
      issueDate: quote.issueDate?.toISOString() ?? null,
      validUntil: quote.validUntil?.toISOString() ?? null,
      acceptedAt: quote.acceptedAt?.toISOString() ?? null,
      createdAt: quote.createdAt.toISOString(),
      updatedAt: quote.updatedAt.toISOString(),
      client: this.publicClient(quote.clientSnapshot),
      title: this.publicTitle(quote.sourceDraftSnapshot, "Quote"),
      itemCount: quote._count.items,
      totals: this.publicTotals(quote.totalsSnapshot),
    }));
  }

  async getQuote(id: string, principal: AuthenticatedPrincipal, metadata: RequestMetadata) {
    const quote = await this.requireClientQuote(id, principal);
    const view = this.publicQuoteView(quote);
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: CLIENT_PORTAL_EVENT.quoteViewed,
        entityType: "Quote",
        entityId: quote.id,
        after: {
          quoteNumber: quote.quoteNumber,
          snapshotHash: quote.snapshotHash,
          status: quote.status,
        },
      },
      metadata,
    );
    return view;
  }

  async generateQuotePdf(id: string, principal: AuthenticatedPrincipal, metadata: RequestMetadata) {
    const quote = await this.requireClientQuote(id, principal);
    const view = this.publicQuoteView(quote);
    const pdf = await this.quotePdf.render(view);
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: CLIENT_PORTAL_EVENT.quotePdfDownloaded,
        entityType: "Quote",
        entityId: quote.id,
        after: {
          byteLength: pdf.byteLength,
          contentSha256: pdf.sha256,
          filename: pdf.filename,
          quoteNumber: quote.quoteNumber,
          snapshotHash: quote.snapshotHash,
          status: quote.status,
        },
      },
      metadata,
    );
    return pdf;
  }

  async listInvoices(principal: AuthenticatedPrincipal) {
    const invoices = await this.database.prisma.invoice.findMany({
      where: {
        clientId: { in: this.clientIdsFor(principal) },
        status: { in: clientInvoiceStatuses },
      },
      orderBy: { createdAt: "desc" },
      include: {
        quote: { select: { quoteNumber: true, sourceDraftSnapshot: true } },
        _count: { select: { items: true } },
      },
    });
    return invoices.map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      quoteId: invoice.quoteId,
      quoteNumber: invoice.quote.quoteNumber,
      status: invoice.status,
      currency: invoice.currency,
      issueDate: invoice.issueDate?.toISOString() ?? null,
      issuedAt: invoice.issuedAt?.toISOString() ?? null,
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
      client: this.publicClient(invoice.clientSnapshot),
      title: this.publicTitle(invoice.quote.sourceDraftSnapshot, "Invoice"),
      itemCount: invoice._count.items,
      totals: this.publicTotals(invoice.totalsSnapshot),
      finalDueNoTax: numberValue(invoice.finalDueNoTax),
    }));
  }

  async getInvoice(id: string, principal: AuthenticatedPrincipal, metadata: RequestMetadata) {
    const invoice = await this.requireClientInvoice(id, principal);
    const view = this.publicInvoiceView(invoice);
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: CLIENT_PORTAL_EVENT.invoiceViewed,
        entityType: "Invoice",
        entityId: invoice.id,
        after: {
          invoiceNumber: invoice.invoiceNumber,
          snapshotHash: invoice.snapshotHash,
          sourceQuoteSnapshotHash: invoice.sourceQuoteSnapshotHash,
          status: invoice.status,
        },
      },
      metadata,
    );
    return view;
  }

  async generateInvoicePdf(
    id: string,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    const invoice = await this.requireClientInvoice(id, principal);
    const view = this.publicInvoiceView(invoice);
    const pdf = await this.invoicePdf.render(view);
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: CLIENT_PORTAL_EVENT.invoicePdfDownloaded,
        entityType: "Invoice",
        entityId: invoice.id,
        after: {
          byteLength: pdf.byteLength,
          contentSha256: pdf.sha256,
          filename: pdf.filename,
          invoiceNumber: invoice.invoiceNumber,
          snapshotHash: invoice.snapshotHash,
          sourceQuoteSnapshotHash: invoice.sourceQuoteSnapshotHash,
          status: invoice.status,
        },
      },
      metadata,
    );
    return pdf;
  }

  private clientIdsFor(principal: AuthenticatedPrincipal): string[] {
    const scopeClientIds = principal.scopes
      .filter(
        (scope) =>
          (scope.type === "OWN_CLIENT" || scope.type === "ASSIGNED_CLIENTS") && scope.clientId,
      )
      .map((scope) => scope.clientId!);
    const clientIds = [...new Set([...principal.assignedClientIds, ...scopeClientIds])];
    if (clientIds.length === 0) {
      throw new ForbiddenException({
        code: "CLIENT_PORTAL_SCOPE_REQUIRED",
        message: "A client portal account must be scoped to at least one client",
      });
    }
    return clientIds;
  }

  private async requireClientQuote(id: string, principal: AuthenticatedPrincipal) {
    const quote = await this.database.prisma.quote.findFirst({
      where: {
        id,
        clientId: { in: this.clientIdsFor(principal) },
        status: { in: clientQuoteStatuses },
      },
      include: {
        invoices: {
          where: { status: { in: clientInvoiceStatuses } },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        items: {
          orderBy: { sortOrder: "asc" },
          include: {
            serviceItemSnapshots: { orderBy: { sortOrder: "asc" } },
          },
        },
      },
    });
    if (!quote) {
      throw new NotFoundException({
        code: "CLIENT_QUOTE_NOT_FOUND",
        message: "The quote could not be found",
      });
    }
    return quote;
  }

  private async requireClientInvoice(id: string, principal: AuthenticatedPrincipal) {
    const invoice = await this.database.prisma.invoice.findFirst({
      where: {
        id,
        clientId: { in: this.clientIdsFor(principal) },
        status: { in: clientInvoiceStatuses },
      },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        quote: { select: { quoteNumber: true, sourceDraftSnapshot: true } },
      },
    });
    if (!invoice) {
      throw new NotFoundException({
        code: "CLIENT_INVOICE_NOT_FOUND",
        message: "The invoice could not be found",
      });
    }
    return invoice;
  }

  private publicQuoteView(quote: Awaited<ReturnType<ClientPortalService["requireClientQuote"]>>) {
    return {
      id: quote.id,
      quoteNumber: quote.quoteNumber,
      status: quote.status,
      currency: quote.currency,
      issueDate: quote.issueDate?.toISOString() ?? null,
      validUntil: quote.validUntil?.toISOString() ?? null,
      acceptedAt: quote.acceptedAt?.toISOString() ?? null,
      createdAt: quote.createdAt.toISOString(),
      updatedAt: quote.updatedAt.toISOString(),
      snapshotHash: quote.snapshotHash,
      client: this.publicClient(quote.clientSnapshot),
      terms: this.publicTerms(quote.termsSnapshot),
      totals: this.publicTotals(quote.totalsSnapshot),
      invoices: quote.invoices.map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        createdAt: invoice.createdAt.toISOString(),
        updatedAt: invoice.updatedAt.toISOString(),
      })),
      items: quote.items.map((item) => this.publicQuoteItem(item)),
    };
  }

  private publicInvoiceView(
    invoice: Awaited<ReturnType<ClientPortalService["requireClientInvoice"]>>,
  ) {
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      quoteId: invoice.quoteId,
      quoteNumber: invoice.quote.quoteNumber,
      status: invoice.status,
      currency: invoice.currency,
      issueDate: invoice.issueDate?.toISOString() ?? null,
      issuedAt: invoice.issuedAt?.toISOString() ?? null,
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
      sourceQuoteSnapshotHash: invoice.sourceQuoteSnapshotHash,
      snapshotHash: invoice.snapshotHash,
      client: this.publicClient(invoice.clientSnapshot),
      quote: this.publicInvoiceQuote(invoice.quoteSnapshot),
      terms: this.publicTerms(invoice.termsSnapshot),
      totals: this.publicTotals(invoice.totalsSnapshot),
      discountTotal: numberValue(invoice.discountTotal),
      finalDueNoTax: numberValue(invoice.finalDueNoTax),
      items: invoice.items.map((item) => this.publicInvoiceItem(item)),
    };
  }

  private publicQuoteItem(
    item: Awaited<ReturnType<ClientPortalService["requireClientQuote"]>>["items"][number],
  ) {
    return {
      id: item.id,
      lineType: item.lineType,
      serviceSnapshot: this.publicServiceSnapshot(item.serviceSnapshot),
      quantity: numberValue(item.quantity),
      hours: item.hours === null ? null : numberValue(item.hours),
      unitPrice: numberValue(item.unitPrice),
      setupFee: numberValue(item.setupFee),
      discount: numberValue(item.discount),
      lineTotal: numberValue(item.lineTotal),
      sortOrder: item.sortOrder,
      serviceItems: item.serviceItemSnapshots.map((serviceItem) => ({
        itemCode: serviceItem.itemCode,
        nameAr: serviceItem.nameAr,
        nameEn: serviceItem.nameEn,
        expectedOutput: serviceItem.expectedOutput,
        requiresFile: serviceItem.requiresFile,
        sortOrder: serviceItem.sortOrder,
      })),
    };
  }

  private publicInvoiceItem(
    item: Awaited<ReturnType<ClientPortalService["requireClientInvoice"]>>["items"][number],
  ) {
    const snapshot = objectValue(item.itemSnapshot);
    return {
      id: item.id,
      quoteItemId: item.quoteItemId,
      itemSnapshot: {
        lineType: stringValue(snapshot, "lineType"),
        serviceSnapshot: this.publicServiceSnapshot(snapshot.serviceSnapshot),
        serviceItems: this.publicServiceItems(snapshot.serviceItems),
      },
      quantity: numberValue(item.quantity),
      unitPrice: numberValue(item.unitPrice),
      discount: numberValue(item.discount),
      lineTotal: numberValue(item.lineTotal),
      sortOrder: item.sortOrder,
    };
  }

  private publicInvoiceQuote(value: unknown) {
    const quote = objectValue(value);
    return {
      id: stringValue(quote, "id"),
      quoteNumber: stringValue(quote, "quoteNumber"),
      status: stringValue(quote, "status"),
      snapshotHash: stringValue(quote, "snapshotHash"),
      terms: this.publicTerms(quote.terms),
      totals: this.publicTotals(quote.totals),
    };
  }

  private publicClient(value: unknown) {
    const client = objectValue(value);
    return {
      id: stringValue(client, "id"),
      code: stringValue(client, "code") ?? "",
      name: stringValue(client, "name") ?? "",
      legalName: stringValue(client, "legalName"),
      sector: stringValue(client, "sector"),
      city: stringValue(client, "city"),
      authorizedApprover: stringValue(client, "authorizedApprover"),
    };
  }

  private publicServiceSnapshot(value: unknown) {
    const service = objectValue(value);
    return compactObject({
      serviceCode: stringValue(service, "serviceCode") ?? "",
      nameAr: stringValue(service, "nameAr") ?? "",
      nameEn: stringValue(service, "nameEn") ?? "",
      serviceLevelCode: stringValue(service, "serviceLevelCode") ?? undefined,
      serviceLevelLabel: stringValue(service, "serviceLevelLabel") ?? undefined,
      serviceLine: stringValue(service, "serviceLine") ?? undefined,
      quantity: optionalNumber(service, "quantity"),
      hours: optionalNumber(service, "hours"),
      estimatedHours: optionalNumber(service, "estimatedHours"),
      unitRate: optionalNumber(service, "unitRate"),
      unitPrice: optionalNumber(service, "unitPrice"),
      baseAmount: optionalNumber(service, "baseAmount") ?? 0,
      setupFee: optionalNumber(service, "setupFee") ?? 0,
      lineTotal: optionalNumber(service, "lineTotal") ?? 0,
    });
  }

  private publicServiceItems(value: unknown) {
    return Array.isArray(value)
      ? value.map((rawItem) => {
          const item = objectValue(rawItem);
          return {
            itemCode: stringValue(item, "itemCode") ?? "",
            nameAr: stringValue(item, "nameAr") ?? "",
            nameEn: stringValue(item, "nameEn") ?? "",
            expectedOutput: stringValue(item, "expectedOutput"),
            requiresFile: Boolean(item.requiresFile),
            sortOrder: optionalNumber(item, "sortOrder") ?? 0,
          };
        })
      : [];
  }

  private publicTerms(value: unknown) {
    const terms = objectValue(value);
    return {
      paymentTerms: stringValue(terms, "paymentTerms") ?? "",
      deliveryTerms: stringValue(terms, "deliveryTerms"),
      additionalTerms: stringValue(terms, "additionalTerms"),
      clientNotes: stringValue(terms, "clientNotes"),
      validUntil: stringValue(terms, "validUntil"),
    };
  }

  private publicTotals(value: unknown) {
    const totals = objectValue(value);
    return {
      subtotalMonthly: optionalNumber(totals, "subtotalMonthly") ?? 0,
      subtotalSetup: optionalNumber(totals, "subtotalSetup") ?? 0,
      subtotalOneTime: optionalNumber(totals, "subtotalOneTime") ?? 0,
      subtotal: optionalNumber(totals, "subtotal") ?? 0,
      discountTotal: optionalNumber(totals, "discountTotal") ?? 0,
      finalBeforeTax: optionalNumber(totals, "finalBeforeTax") ?? 0,
      taxTotal: optionalNumber(totals, "taxTotal") ?? 0,
      finalTotal: optionalNumber(totals, "finalTotal") ?? 0,
    };
  }

  private publicTitle(value: unknown, fallback: string): string {
    const source = objectValue(value);
    return stringValue(source, "title") ?? fallback;
  }
}
