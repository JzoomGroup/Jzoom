import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import type { Prisma } from "@jzoom/database";
import { ADMIN_ROLE_CODE } from "../auth/auth.constants.js";
import { AuthAuditService } from "../auth/audit.service.js";
import type { AuthenticatedPrincipal, RequestMetadata } from "../auth/auth.types.js";
import { DatabaseService } from "../database/database.service.js";
import { INVOICE_EVENT } from "./invoices.constants.js";
import type { CreateInvoiceDto } from "./invoices.dto.js";

type PublicInvoiceStatus = "DRAFT" | "ISSUED" | "CANCELLED" | "VOIDED";

const transitions: Record<PublicInvoiceStatus, PublicInvoiceStatus[]> = {
  DRAFT: ["ISSUED", "CANCELLED"],
  ISSUED: ["VOIDED"],
  CANCELLED: [],
  VOIDED: [],
};

const lifecycleAuditEvents: Partial<Record<PublicInvoiceStatus, string>> = {
  CANCELLED: INVOICE_EVENT.cancelled,
  ISSUED: INVOICE_EVENT.issued,
  VOIDED: INVOICE_EVENT.voided,
};

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function numberValue(value: unknown): number {
  return Number(value);
}

function objectValue(value: unknown, code: string, message: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ConflictException({ code, message });
  }
  return value as Record<string, unknown>;
}

function stringValue(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function numericValue(record: Record<string, unknown>, key: string): number {
  const value = Number(record[key]);
  if (!Number.isFinite(value)) {
    throw new ConflictException({
      code: "INVALID_QUOTE_TOTALS_SNAPSHOT",
      message: `The accepted quote snapshot is missing numeric ${key}`,
    });
  }
  return value;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)]),
    );
  }
  return value;
}

@Injectable()
export class InvoicesService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AuthAuditService) private readonly audit: AuthAuditService,
  ) {}

  async list(principal: AuthenticatedPrincipal) {
    const invoices = await this.database.prisma.invoice.findMany({
      where: this.invoiceAccessWhere(principal),
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
      status: this.publicStatus(invoice.status),
      currency: invoice.currency,
      issueDate: invoice.issueDate?.toISOString() ?? null,
      issuedAt: invoice.issuedAt?.toISOString() ?? null,
      cancelledAt: invoice.cancelledAt?.toISOString() ?? null,
      voidedAt: invoice.voidedAt?.toISOString() ?? null,
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
      client: this.clientSummary(invoice.clientSnapshot),
      title: this.sourceDraftTitle(invoice.quote.sourceDraftSnapshot),
      itemCount: invoice._count.items,
      totals: invoice.totalsSnapshot,
      finalDueNoTax: numberValue(invoice.finalDueNoTax),
    }));
  }

  async get(id: string, principal: AuthenticatedPrincipal) {
    const invoice = await this.requireAccessibleInvoice(id, principal);
    return this.invoiceView(invoice);
  }

  async create(
    input: CreateInvoiceDto,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    const quote = await this.requireAcceptedQuote(input.quoteId, principal);
    if (!quote.clientId) {
      throw new ConflictException({
        code: "QUOTE_CLIENT_REQUIRED_FOR_INVOICE",
        message: "Accepted quotes must have a client before an invoice can be created",
      });
    }
    if (quote.items.length === 0) {
      throw new ConflictException({
        code: "QUOTE_ITEMS_REQUIRED_FOR_INVOICE",
        message: "Accepted quotes must include at least one snapshotted line item",
      });
    }

    const existing = await this.database.prisma.invoice.findFirst({
      where: { quoteId: quote.id },
      select: { id: true, invoiceNumber: true },
    });
    if (existing) {
      throw new ConflictException({
        code: "INVOICE_ALREADY_EXISTS",
        message: `Quote ${quote.quoteNumber} already created invoice ${existing.invoiceNumber}`,
      });
    }

    const totals = objectValue(
      quote.totalsSnapshot,
      "INVALID_QUOTE_TOTALS_SNAPSHOT",
      "The accepted quote totals snapshot is invalid",
    );
    const quoteSnapshot = this.quoteSnapshot(quote);
    const invoiceNumber = this.invoiceNumber();
    const finalDueNoTax = numericValue(totals, "finalBeforeTax");
    const discountTotal = numericValue(totals, "discountTotal");
    const snapshotMaterial = {
      invoice: {
        invoiceNumber,
        currency: quote.currency,
        discountTotal,
        finalDueNoTax,
      },
      quote: quoteSnapshot,
    };
    const snapshotHash = createHash("sha256")
      .update(JSON.stringify(canonicalize(snapshotMaterial)))
      .digest("hex");

    const created = await this.database.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          quoteId: quote.id,
          clientId: quote.clientId!,
          createdById: principal.userId,
          status: "DRAFT",
          currency: quote.currency,
          clientSnapshot: json(quote.clientSnapshot),
          quoteSnapshot: json(quoteSnapshot),
          ...(quote.pricingSnapshot ? { pricingSnapshot: json(quote.pricingSnapshot) } : {}),
          ...(quote.pricingRulesSnapshot
            ? { pricingRulesSnapshot: json(quote.pricingRulesSnapshot) }
            : {}),
          ...(quote.termsSnapshot ? { termsSnapshot: json(quote.termsSnapshot) } : {}),
          ...(quote.totalsSnapshot ? { totalsSnapshot: json(quote.totalsSnapshot) } : {}),
          sourceQuoteSnapshotHash: quote.snapshotHash,
          snapshotHash,
          discountTotal,
          finalDueNoTax,
          statusChangedAt: new Date(),
          items: {
            create: quote.items.map((item) => ({
              quoteItemId: item.id,
              itemSnapshot: json(this.invoiceItemSnapshot(item)),
              quantity: numberValue(item.quantity),
              unitPrice: numberValue(item.unitPrice),
              discount: numberValue(item.discount),
              lineTotal: numberValue(item.lineTotal),
              sortOrder: item.sortOrder,
            })),
          },
        },
      });
      return invoice;
    });

    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: INVOICE_EVENT.created,
        entityType: "Invoice",
        entityId: created.id,
        after: {
          invoiceNumber,
          quoteId: quote.id,
          quoteNumber: quote.quoteNumber,
          quoteSnapshotHash: quote.snapshotHash,
          snapshotHash,
          status: "DRAFT",
          totals: quote.totalsSnapshot,
        },
      },
      metadata,
    );
    return this.get(created.id, principal);
  }

  async changeStatus(
    id: string,
    target: PublicInvoiceStatus,
    note: string | undefined,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    const invoice = await this.requireAccessibleInvoice(id, principal);
    const current = this.publicStatus(invoice.status);
    if (!(current in transitions) || !transitions[current].includes(target)) {
      throw new ConflictException({
        code: "INVALID_INVOICE_STATUS_TRANSITION",
        message: `Invoice status cannot change from ${invoice.status} to ${target}`,
      });
    }
    const now = new Date();
    const trimmedNote = note?.trim() || undefined;
    await this.database.prisma.invoice.update({
      where: { id },
      data: {
        status: target,
        statusReason: trimmedNote ?? null,
        statusChangedAt: now,
        ...(target === "ISSUED" ? { issueDate: now, issuedAt: now } : {}),
        ...(target === "CANCELLED" ? { cancelledAt: now } : {}),
        ...(target === "VOIDED" ? { voidedAt: now } : {}),
      },
    });

    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: INVOICE_EVENT.statusChanged,
        entityType: "Invoice",
        entityId: id,
        before: { status: current },
        after: { note: trimmedNote ?? null, status: target, changedAt: now.toISOString() },
        ...(trimmedNote ? { reason: trimmedNote } : {}),
      },
      metadata,
    );
    const lifecycleEvent = lifecycleAuditEvents[target];
    if (lifecycleEvent) {
      await this.audit.record(
        {
          actorId: principal.userId,
          eventCode: lifecycleEvent,
          entityType: "Invoice",
          entityId: id,
          before: { status: current },
          after: {
            note: trimmedNote ?? null,
            invoiceNumber: invoice.invoiceNumber,
            quoteId: invoice.quoteId,
            snapshotHash: invoice.snapshotHash,
            status: target,
            changedAt: now.toISOString(),
          },
          ...(trimmedNote ? { reason: trimmedNote } : {}),
        },
        metadata,
      );
    }
    return this.get(id, principal);
  }

  issue(
    id: string,
    note: string | undefined,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    return this.changeStatus(id, "ISSUED", note, principal, metadata);
  }

  cancel(
    id: string,
    note: string | undefined,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    return this.changeStatus(id, "CANCELLED", note, principal, metadata);
  }

  voidInvoice(
    id: string,
    note: string | undefined,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    return this.changeStatus(id, "VOIDED", note, principal, metadata);
  }

  private async requireAcceptedQuote(id: string, principal: AuthenticatedPrincipal) {
    const quote = await this.database.prisma.quote.findFirst({
      where: { id, ...this.quoteAccessWhere(principal) },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
          include: { serviceItemSnapshots: { orderBy: { sortOrder: "asc" } } },
        },
      },
    });
    if (!quote) {
      throw new NotFoundException({
        code: "QUOTE_NOT_FOUND",
        message: "The quote could not be found",
      });
    }
    if (quote.status !== "ACCEPTED") {
      throw new ConflictException({
        code: "ACCEPTED_QUOTE_REQUIRED_FOR_INVOICE",
        message: "Invoices can only be created from accepted quotes",
      });
    }
    return quote;
  }

  private async requireAccessibleInvoice(id: string, principal: AuthenticatedPrincipal) {
    const invoice = await this.database.prisma.invoice.findFirst({
      where: { id, ...this.invoiceAccessWhere(principal) },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        quote: { select: { quoteNumber: true, sourceDraftSnapshot: true } },
      },
    });
    if (!invoice) {
      throw new NotFoundException({
        code: "INVOICE_NOT_FOUND",
        message: "The invoice could not be found",
      });
    }
    return invoice;
  }

  private quoteAccessWhere(principal: AuthenticatedPrincipal) {
    if (this.isGlobal(principal)) {
      return {};
    }
    return { clientId: { in: principal.assignedClientIds } };
  }

  private invoiceAccessWhere(principal: AuthenticatedPrincipal) {
    if (this.isGlobal(principal)) {
      return {};
    }
    return { clientId: { in: principal.assignedClientIds } };
  }

  private isGlobal(principal: AuthenticatedPrincipal): boolean {
    return (
      principal.roles.includes(ADMIN_ROLE_CODE) ||
      principal.scopes.some((scope) => scope.type === "GLOBAL")
    );
  }

  private publicStatus(status: string): PublicInvoiceStatus {
    if (status === "VOID") {
      return "VOIDED";
    }
    if (
      status === "DRAFT" ||
      status === "ISSUED" ||
      status === "CANCELLED" ||
      status === "VOIDED"
    ) {
      return status;
    }
    throw new BadRequestException({
      code: "UNSUPPORTED_INVOICE_STATUS",
      message: `Unsupported invoice status ${status}`,
    });
  }

  private invoiceView(invoice: Awaited<ReturnType<InvoicesService["requireAccessibleInvoice"]>>) {
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      quoteId: invoice.quoteId,
      quoteNumber: invoice.quote.quoteNumber,
      status: this.publicStatus(invoice.status),
      currency: invoice.currency,
      issueDate: invoice.issueDate?.toISOString() ?? null,
      issuedAt: invoice.issuedAt?.toISOString() ?? null,
      cancelledAt: invoice.cancelledAt?.toISOString() ?? null,
      voidedAt: invoice.voidedAt?.toISOString() ?? null,
      statusReason: invoice.statusReason,
      statusChangedAt: invoice.statusChangedAt.toISOString(),
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
      sourceQuoteSnapshotHash: invoice.sourceQuoteSnapshotHash,
      snapshotHash: invoice.snapshotHash,
      client: invoice.clientSnapshot,
      quote: invoice.quoteSnapshot,
      pricing: invoice.pricingSnapshot,
      pricingRules: invoice.pricingRulesSnapshot,
      terms: invoice.termsSnapshot,
      totals: invoice.totalsSnapshot,
      discountTotal: numberValue(invoice.discountTotal),
      finalDueNoTax: numberValue(invoice.finalDueNoTax),
      items: invoice.items.map((item) => ({
        id: item.id,
        quoteItemId: item.quoteItemId,
        itemSnapshot: item.itemSnapshot,
        quantity: numberValue(item.quantity),
        unitPrice: numberValue(item.unitPrice),
        discount: numberValue(item.discount),
        lineTotal: numberValue(item.lineTotal),
        sortOrder: item.sortOrder,
      })),
    };
  }

  private quoteSnapshot(quote: Awaited<ReturnType<InvoicesService["requireAcceptedQuote"]>>) {
    return {
      id: quote.id,
      quoteNumber: quote.quoteNumber,
      status: quote.status,
      currency: quote.currency,
      issueDate: quote.issueDate?.toISOString() ?? null,
      validUntil: quote.validUntil?.toISOString() ?? null,
      acceptedAt: quote.acceptedAt?.toISOString() ?? null,
      snapshotHash: quote.snapshotHash,
      client: quote.clientSnapshot,
      pricing: quote.pricingSnapshot,
      pricingRules: quote.pricingRulesSnapshot,
      terms: quote.termsSnapshot,
      sourceDraft: quote.sourceDraftSnapshot,
      totals: quote.totalsSnapshot,
      items: quote.items.map((item) => this.invoiceItemSnapshot(item)),
    };
  }

  private invoiceItemSnapshot(
    item: Awaited<ReturnType<InvoicesService["requireAcceptedQuote"]>>["items"][number],
  ) {
    return {
      quoteItemId: item.id,
      lineType: item.lineType,
      serviceSnapshot: item.serviceSnapshot,
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
        deductHours: serviceItem.deductHours,
        sortOrder: serviceItem.sortOrder,
      })),
    };
  }

  private clientSummary(snapshot: unknown) {
    const client = objectValue(
      snapshot,
      "INVALID_INVOICE_CLIENT_SNAPSHOT",
      "The invoice client snapshot is invalid",
    );
    return {
      id: stringValue(client, "id") ?? null,
      code: stringValue(client, "code") ?? "",
      name: stringValue(client, "name") ?? "",
      legalName: stringValue(client, "legalName") ?? null,
    };
  }

  private sourceDraftTitle(snapshot: unknown): string {
    if (typeof snapshot !== "object" || snapshot === null || Array.isArray(snapshot)) {
      return "Invoice";
    }
    return stringValue(snapshot as Record<string, unknown>, "title") ?? "Invoice";
  }

  private invoiceNumber(): string {
    const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    return `INV-${date}-${randomUUID().slice(0, 8).toUpperCase()}`;
  }
}
