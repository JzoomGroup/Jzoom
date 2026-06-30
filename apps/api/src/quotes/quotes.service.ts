import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import type { Prisma } from "@jzoom/database";
import {
  ADMIN_ROLE_CODE,
  DEFAULT_TEMPORARY_PASSWORD,
  PROJECT_SPECIALIST_ROLE_CODE,
} from "../auth/auth.constants.js";
import { AuthAuditService } from "../auth/audit.service.js";
import type { AuthenticatedPrincipal, RequestMetadata } from "../auth/auth.types.js";
import { PasswordHasherService } from "../auth/password-hasher.service.js";
import { CLIENT_ROLE_CODE } from "../client-portal/client-portal.constants.js";
import { DatabaseService } from "../database/database.service.js";
import { ProjectsService } from "../projects/projects.service.js";
import { QuotePdfService } from "./quote-pdf.service.js";
import { QUOTE_EVENT } from "./quotes.constants.js";
import type { CreateQuoteDto, QuoteOnboardingDto } from "./quotes.dto.js";

const SPECIALIST_ROLE_CODE = "ROLE-SPECIALIST";
const specialistRoleCodes = [SPECIALIST_ROLE_CODE, PROJECT_SPECIALIST_ROLE_CODE] as const;

type PublicQuoteStatus = "DRAFT" | "ISSUED" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CANCELLED";

interface SnapshotLine {
  sortOrder: number;
  lineType: "MONTHLY" | "ONE_TIME";
  monthlyServiceRevisionId?: string;
  oneTimeServiceRevisionId?: string;
  serviceCode: string;
  nameAr: string;
  nameEn: string;
  serviceLevelCode?: string;
  serviceLevelLabel?: string;
  quantity: number;
  hours?: number;
  unitRate?: number;
  unitPrice?: number;
  baseAmount: number;
  setupFee: number;
  lineTotal: number;
  internalCost: number;
}

interface SnapshotTotals {
  subtotalMonthly: number;
  subtotalSetup: number;
  subtotalOneTime: number;
  subtotal: number;
  discountTotal: number;
  finalBeforeTax: number;
  taxTotal: number;
  finalTotal: number;
  internalCost: number;
  marginAmount: number;
  marginPct: number;
  targetMarginPct: number | null;
  meetsTargetMargin: boolean | null;
}

export interface OnboardingServiceTarget {
  quoteItemId: string;
  lineType: "MONTHLY" | "ONE_TIME";
  serviceCode: string;
  nameAr: string;
  nameEn: string;
  serviceLevelLabel: string | null;
  hoursAllocated: number | null;
  monthlyServiceId: string | null;
  monthlyServiceRevisionId: string | null;
  oneTimeServiceId: string | null;
  oneTimeServiceRevisionId: string | null;
  serviceLevelId: string | null;
  existingSpecialistIds: string[];
}

const transitions: Record<PublicQuoteStatus, PublicQuoteStatus[]> = {
  DRAFT: ["ISSUED", "CANCELLED"],
  ISSUED: ["ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"],
  ACCEPTED: [],
  REJECTED: [],
  EXPIRED: [],
  CANCELLED: [],
};

const lifecycleAuditEvents: Partial<Record<PublicQuoteStatus, string>> = {
  ACCEPTED: QUOTE_EVENT.accepted,
  REJECTED: QUOTE_EVENT.rejected,
  EXPIRED: QUOTE_EVENT.expired,
  CANCELLED: QUOTE_EVENT.cancelled,
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

function optionalNumericValue(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function recordOrNull(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function numericValue(record: Record<string, unknown>, key: string): number {
  const value = Number(record[key]);
  if (!Number.isFinite(value)) {
    throw new ConflictException({
      code: "INVALID_PRICING_DRAFT_SNAPSHOT",
      message: `The pricing draft snapshot is missing numeric ${key}`,
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
export class QuotesService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AuthAuditService) private readonly audit: AuthAuditService,
    @Inject(PasswordHasherService) private readonly passwords: PasswordHasherService,
    @Inject(ProjectsService) private readonly projects: ProjectsService,
    @Inject(QuotePdfService) private readonly quotePdf: QuotePdfService,
  ) {}

  async list(principal: AuthenticatedPrincipal) {
    const quotes = await this.database.prisma.quote.findMany({
      where: this.quoteAccessWhere(principal),
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
      createdAt: quote.createdAt.toISOString(),
      updatedAt: quote.updatedAt.toISOString(),
      client: this.clientSummary(quote.clientSnapshot),
      title: this.sourceDraftTitle(quote.sourceDraftSnapshot),
      itemCount: quote._count.items,
      totals: quote.totalsSnapshot,
    }));
  }

  async get(id: string, principal: AuthenticatedPrincipal) {
    const quote = await this.requireAccessibleQuote(id, principal);
    return this.quoteView(quote);
  }

  async onboardingOptions(id: string, principal: AuthenticatedPrincipal) {
    const quote = await this.requireAccessibleQuote(id, principal);
    this.assertQuoteReadyForOnboarding(quote);
    const clientId = quote.clientId!;
    const client = this.clientSummary(quote.clientSnapshot);
    const now = new Date();
    const [services, specialists, portalUsers] = await Promise.all([
      this.onboardingTargetsForQuote(quote),
      this.database.prisma.user.findMany({
        where: {
          status: "ACTIVE",
          userType: "INTERNAL",
          roles: {
            some: {
              role: { code: { in: [...specialistRoleCodes] }, status: "ACTIVE" },
            },
          },
        },
        orderBy: [{ displayName: "asc" }, { email: "asc" }],
        select: {
          id: true,
          email: true,
          displayName: true,
        },
      }),
      this.database.prisma.clientAssignment.findMany({
        where: {
          clientId,
          roleCode: CLIENT_ROLE_CODE,
          startsAt: { lte: now },
          OR: [{ endsAt: null }, { endsAt: { gt: now } }],
          user: { status: "ACTIVE", userType: "EXTERNAL" },
        },
        orderBy: { startsAt: "desc" },
        select: {
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
              preferredLocale: true,
              status: true,
            },
          },
        },
      }),
    ]);

    return {
      quote: {
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        status: quote.status,
      },
      client: {
        ...client,
        defaultPortalEmail: `${client.code.toLowerCase()}@client.jzoom.local`,
      },
      portalUsers: portalUsers.map(({ user }) => user),
      specialists,
      services,
    };
  }

  async completeOnboarding(
    id: string,
    input: QuoteOnboardingDto,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    const quote = await this.requireAccessibleQuote(id, principal);
    this.assertQuoteReadyForOnboarding(quote);
    const clientId = quote.clientId!;
    const now = new Date();
    const services = await this.onboardingTargetsForQuote(quote);
    const servicesByQuoteItemId = new Map(
      services.map((service) => [service.quoteItemId, service]),
    );
    const requestedAssignments = input.serviceAssignments ?? [];
    const unknownQuoteItemIds = requestedAssignments
      .map((assignment) => assignment.quoteItemId)
      .filter((quoteItemId) => !servicesByQuoteItemId.has(quoteItemId));
    if (unknownQuoteItemIds.length > 0) {
      throw new BadRequestException({
        code: "QUOTE_ONBOARDING_SERVICE_NOT_FOUND",
        message: "One or more selected services are not part of this quote",
        quoteItemIds: unknownQuoteItemIds,
      });
    }

    const specialistIds = this.uniqueIds(
      requestedAssignments.flatMap((assignment) => assignment.specialistIds ?? []),
    );
    await this.assertActiveSpecialists(specialistIds);

    const temporaryPasswordHash = input.portalUser
      ? await this.passwords.hash(DEFAULT_TEMPORARY_PASSWORD)
      : undefined;
    const result = await this.database.prisma.$transaction(async (transaction) => {
      const portalUser = input.portalUser
        ? await this.createOrLinkPortalUserInTransaction(
            transaction,
            clientId,
            input.portalUser,
            temporaryPasswordHash!,
            now,
          )
        : null;
      const subscription = await this.ensureQuoteSubscriptionInTransaction(
        transaction,
        quote,
        services,
        now,
      );
      const assignments = [];
      const projectAssignmentMap = new Map<string, string[]>();
      for (const assignment of requestedAssignments) {
        const service = servicesByQuoteItemId.get(assignment.quoteItemId)!;
        const selectedSpecialistIds = this.uniqueIds(assignment.specialistIds ?? []);
        await this.replaceSpecialistScopesForServiceInTransaction(
          transaction,
          clientId,
          service,
          selectedSpecialistIds,
          now,
        );
        projectAssignmentMap.set(service.quoteItemId, selectedSpecialistIds);
        assignments.push({
          quoteItemId: service.quoteItemId,
          lineType: service.lineType,
          serviceCode: service.serviceCode,
          specialistIds: selectedSpecialistIds,
        });
      }
      const projects = await this.projects.ensureQuoteProjectsInTransaction(
        transaction,
        quote,
        services,
        projectAssignmentMap,
        now,
      );
      return { assignments, portalUser, projects, subscription };
    });

    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: QUOTE_EVENT.clientOnboardingCompleted,
        entityType: "Quote",
        entityId: quote.id,
        after: {
          clientId,
          quoteNumber: quote.quoteNumber,
          portalUserId: result.portalUser?.id ?? null,
          portalUserCreated: result.portalUser?.created ?? false,
          subscriptionId: result.subscription.subscriptionId,
          subscriptionServicesCreated: result.subscription.createdServiceIds.length,
          subscriptionServicesReused: result.subscription.reusedServiceIds.length,
          projectsCreated: result.projects.createdProjectIds.length,
          projectsReused: result.projects.reusedProjectIds.length,
          assignments: result.assignments,
        },
        severity: "HIGH",
      },
      metadata,
    );

    return {
      completed: true,
      ...result,
    };
  }

  async generatePdf(id: string, principal: AuthenticatedPrincipal, metadata: RequestMetadata) {
    const quote = await this.requireAccessibleQuote(id, principal);
    const pdf = await this.quotePdf.render(this.quoteView(quote));
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: QUOTE_EVENT.pdfGenerated,
        entityType: "Quote",
        entityId: quote.id,
        after: {
          byteLength: pdf.byteLength,
          contentSha256: pdf.sha256,
          filename: pdf.filename,
          quoteNumber: quote.quoteNumber,
          snapshotHash: quote.snapshotHash,
        },
      },
      metadata,
    );
    return pdf;
  }

  async create(
    input: CreateQuoteDto,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    const draft = await this.requireAccessibleDraft(input.pricingDraftId, principal);
    if (draft.status === "ARCHIVED") {
      throw new ConflictException({
        code: "ARCHIVED_PRICING_DRAFT_CANNOT_CREATE_QUOTE",
        message: "Archived pricing drafts cannot create quotes",
      });
    }
    if (!draft.calculationSnapshot || draft.calculationVersion < 1 || draft.items.length === 0) {
      throw new ConflictException({
        code: "CALCULATED_PRICING_DRAFT_REQUIRED",
        message: "A saved pricing draft with a backend calculation is required",
      });
    }

    const calculation = objectValue(
      draft.calculationSnapshot,
      "INVALID_PRICING_DRAFT_SNAPSHOT",
      "The pricing draft calculation snapshot is invalid",
    );
    const totals = this.totalsSnapshot(calculation.totals);
    const rawLines = calculation.lines;
    if (!Array.isArray(rawLines) || rawLines.length === 0) {
      throw new ConflictException({
        code: "PRICING_DRAFT_LINES_REQUIRED",
        message: "The pricing draft has no calculated service lines",
      });
    }

    const validUntil = input.validUntil
      ? new Date(input.validUntil)
      : new Date(Date.now() + (input.validityDays ?? 30) * 86_400_000);
    if (validUntil <= new Date()) {
      throw new BadRequestException({
        code: "QUOTE_VALIDITY_MUST_BE_FUTURE",
        message: "Quote validity must end in the future",
      });
    }

    const draftItemsByRevision = new Map(
      draft.items.map((item) => [
        item.monthlyServiceRevisionId ?? item.oneTimeServiceRevisionId!,
        item,
      ]),
    );
    const pricingDate = draft.pricingDate;
    const lines = await Promise.all(
      rawLines.map((rawLine, index) =>
        this.snapshotLine(rawLine, index, draftItemsByRevision, pricingDate),
      ),
    );
    const termsSnapshot = {
      paymentTerms: input.terms.paymentTerms.trim(),
      deliveryTerms: input.terms.deliveryTerms?.trim() || null,
      additionalTerms: input.terms.additionalTerms?.trim() || null,
      clientNotes: input.terms.clientNotes?.trim() || null,
      validUntil: validUntil.toISOString(),
    };
    const clientSnapshot = objectValue(
      draft.clientSnapshot,
      "INVALID_CLIENT_SNAPSHOT",
      "The pricing draft client snapshot is invalid",
    );
    const pricingRulesSnapshot = Array.isArray(calculation.appliedRules)
      ? calculation.appliedRules
      : [];
    const sourceDraftSnapshot = {
      id: draft.id,
      draftNumber: draft.draftNumber,
      title: draft.title,
      notes: draft.notes,
      pricingDate: draft.pricingDate.toISOString(),
      calculationVersion: draft.calculationVersion,
      lastCalculatedAt: draft.lastCalculatedAt?.toISOString() ?? null,
      selections: draft.items.map((item) => ({
        lineType: item.lineType,
        monthlyServiceRevisionId: item.monthlyServiceRevisionId,
        oneTimeServiceRevisionId: item.oneTimeServiceRevisionId,
        serviceLevelId: item.serviceLevelId,
        quantity: numberValue(item.quantity),
        sortOrder: item.sortOrder,
      })),
    };
    const snapshotMaterial = {
      client: clientSnapshot,
      pricing: {
        calculatedAt: calculation.calculatedAt,
        pricingDate: calculation.pricingDate,
        currency: calculation.currency,
        lines,
      },
      pricingRules: pricingRulesSnapshot,
      terms: termsSnapshot,
      sourceDraft: sourceDraftSnapshot,
      totals,
    };
    const snapshotHash = createHash("sha256")
      .update(JSON.stringify(canonicalize(snapshotMaterial)))
      .digest("hex");
    const duplicate = await this.database.prisma.quote.findFirst({
      where: { snapshotHash },
      select: { id: true, quoteNumber: true },
    });
    if (duplicate) {
      throw new ConflictException({
        code: "QUOTE_SNAPSHOT_ALREADY_EXISTS",
        message: `This pricing snapshot already created quote ${duplicate.quoteNumber}`,
      });
    }

    const quoteNumber = this.quoteNumber();
    const created = await this.database.prisma.$transaction(async (tx) => {
      const quote = await tx.quote.create({
        data: {
          quoteNumber,
          clientId: draft.clientId,
          sourcePricingDraftId: draft.id,
          createdById: principal.userId,
          sourceDraftVersion: draft.calculationVersion,
          status: "DRAFT",
          currency: draft.currency,
          validUntil,
          clientSnapshot: json(clientSnapshot),
          pricingSnapshot: json(snapshotMaterial.pricing),
          pricingRulesSnapshot: json(pricingRulesSnapshot),
          termsSnapshot: json(termsSnapshot),
          sourceDraftSnapshot: json(sourceDraftSnapshot),
          totalsSnapshot: json(totals),
          snapshotHash,
          subtotalMonthly: totals.subtotalMonthly,
          subtotalSetup: totals.subtotalSetup,
          subtotalOneTime: totals.subtotalOneTime,
          discountTotal: totals.discountTotal,
          finalDueNoTax: totals.finalBeforeTax,
          internalCost: totals.internalCost,
          margin: totals.marginAmount,
          lockedAt: new Date(),
        },
      });
      for (const line of lines) {
        await tx.quoteItem.create({
          data: {
            quoteId: quote.id,
            lineType: line.lineType,
            monthlyServiceRevisionId: line.monthlyServiceRevisionId ?? null,
            oneTimeServiceRevisionId: line.oneTimeServiceRevisionId ?? null,
            serviceLevelCode: line.serviceLevelCode ?? null,
            serviceSnapshot: json(line),
            quantity: line.quantity,
            hours: line.hours ?? null,
            unitPrice: line.unitRate ?? line.unitPrice ?? 0,
            setupFee: line.setupFee,
            discount: 0,
            lineTotal: line.lineTotal,
            internalCost: line.internalCost,
            sortOrder: line.sortOrder,
            serviceItemSnapshots: {
              create: line.serviceItems.map((item) => ({
                serviceItemRevisionId: item.serviceItemRevisionId,
                itemCode: item.itemCode,
                nameAr: item.nameAr,
                nameEn: item.nameEn,
                expectedOutput: item.expectedOutput,
                requiresFile: item.requiresFile,
                deductHours: item.deductHours,
                sortOrder: item.sortOrder,
              })),
            },
          },
        });
      }
      return quote;
    });

    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: QUOTE_EVENT.created,
        entityType: "Quote",
        entityId: created.id,
        after: {
          quoteNumber,
          pricingDraftId: draft.id,
          sourceDraftVersion: draft.calculationVersion,
          snapshotHash,
          status: "DRAFT",
          totals,
        },
      },
      metadata,
    );
    return this.get(created.id, principal);
  }

  async changeStatus(
    id: string,
    target: PublicQuoteStatus,
    note: string | undefined,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    const quote = await this.requireAccessibleQuote(id, principal);
    const current = quote.status as PublicQuoteStatus;
    if (!(current in transitions) || !transitions[current].includes(target)) {
      throw new ConflictException({
        code: "INVALID_QUOTE_STATUS_TRANSITION",
        message: `Quote status cannot change from ${quote.status} to ${target}`,
      });
    }
    const now = new Date();
    const trimmedNote = note?.trim() || undefined;
    if (target === "ISSUED" && (!quote.validUntil || quote.validUntil <= now)) {
      throw new ConflictException({
        code: "QUOTE_VALIDITY_EXPIRED",
        message: "The quote validity date must be in the future before issue",
      });
    }
    if (target === "ACCEPTED" && quote.validUntil && quote.validUntil <= now) {
      throw new ConflictException({
        code: "EXPIRED_QUOTE_CANNOT_BE_ACCEPTED",
        message: "An expired quote cannot be externally confirmed",
      });
    }
    if (target === "EXPIRED" && (!quote.validUntil || quote.validUntil > now)) {
      throw new ConflictException({
        code: "QUOTE_NOT_YET_EXPIRED",
        message: "The quote validity period has not ended",
      });
    }

    await this.database.prisma.quote.update({
      where: { id },
      data: {
        status: target,
        statusReason: trimmedNote ?? null,
        statusChangedAt: now,
        ...(target === "ISSUED" ? { issueDate: now } : {}),
        ...(target === "ACCEPTED" ? { acceptedAt: now, approvedAt: now } : {}),
        ...(target === "REJECTED" ? { rejectedAt: now } : {}),
        ...(target === "EXPIRED" ? { expiredAt: now } : {}),
        ...(target === "CANCELLED" ? { cancelledAt: now } : {}),
      },
    });
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: QUOTE_EVENT.statusChanged,
        entityType: "Quote",
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
          entityType: "Quote",
          entityId: id,
          before: { status: current },
          after: {
            note: trimmedNote ?? null,
            quoteNumber: quote.quoteNumber,
            snapshotHash: quote.snapshotHash,
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

  accept(
    id: string,
    note: string | undefined,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    return this.changeStatus(id, "ACCEPTED", note, principal, metadata);
  }

  reject(
    id: string,
    note: string | undefined,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    return this.changeStatus(id, "REJECTED", note, principal, metadata);
  }

  expire(
    id: string,
    note: string | undefined,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    return this.changeStatus(id, "EXPIRED", note, principal, metadata);
  }

  cancel(
    id: string,
    note: string | undefined,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    return this.changeStatus(id, "CANCELLED", note, principal, metadata);
  }

  private assertQuoteReadyForOnboarding(
    quote: Awaited<ReturnType<QuotesService["requireAccessibleQuote"]>>,
  ): void {
    if (!quote.clientId) {
      throw new ConflictException({
        code: "QUOTE_CLIENT_REQUIRED_FOR_ONBOARDING",
        message: "The quote must be linked to a client before services can be activated",
      });
    }
    if (quote.status !== "ACCEPTED") {
      throw new ConflictException({
        code: "ACCEPTED_QUOTE_REQUIRED_FOR_ONBOARDING",
        message: "Client services can only be activated after payment confirmation",
      });
    }
  }

  private async onboardingTargetsForQuote(
    quote: Awaited<ReturnType<QuotesService["requireAccessibleQuote"]>>,
  ): Promise<OnboardingServiceTarget[]> {
    return Promise.all(quote.items.map((item) => this.onboardingTargetForQuoteItem(quote, item)));
  }

  private async onboardingTargetForQuoteItem(
    quote: Awaited<ReturnType<QuotesService["requireAccessibleQuote"]>>,
    item: Awaited<ReturnType<QuotesService["requireAccessibleQuote"]>>["items"][number],
  ): Promise<OnboardingServiceTarget> {
    const snapshot = objectValue(
      item.serviceSnapshot,
      "INVALID_QUOTE_SERVICE_SNAPSHOT",
      "A quote service snapshot is invalid",
    );
    const serviceCode = stringValue(snapshot, "serviceCode") ?? item.id;
    const nameAr = stringValue(snapshot, "nameAr") ?? serviceCode;
    const nameEn = stringValue(snapshot, "nameEn") ?? nameAr;
    const serviceLevelLabel =
      stringValue(snapshot, "serviceLevelLabel") ??
      stringValue(snapshot, "serviceLevelCode") ??
      null;
    const snapshotHours = optionalNumericValue(snapshot, "hours");

    if (item.lineType === "MONTHLY") {
      const monthlyServiceRevisionId = item.monthlyServiceRevisionId;
      if (!monthlyServiceRevisionId) {
        throw new ConflictException({
          code: "QUOTE_MONTHLY_REVISION_REQUIRED",
          message: "Monthly quote lines must include a monthly service revision",
        });
      }
      const revision = await this.database.prisma.monthlyServiceRevision.findUnique({
        where: { id: monthlyServiceRevisionId },
        select: {
          id: true,
          monthlyServiceId: true,
        },
      });
      if (!revision) {
        throw new ConflictException({
          code: "QUOTE_MONTHLY_REVISION_NOT_FOUND",
          message: "A quote monthly service revision is no longer available",
        });
      }
      const serviceLevelId = await this.serviceLevelIdForQuoteItem(quote, item, snapshot);
      const hoursAllocated =
        item.hours === null
          ? snapshotHours
          : Number.isFinite(Number(item.hours))
            ? Number(item.hours)
            : snapshotHours;
      const existingSpecialistIds = await this.existingSpecialistIdsForService({
        clientId: quote.clientId!,
        monthlyServiceId: revision.monthlyServiceId,
      });
      return {
        quoteItemId: item.id,
        lineType: "MONTHLY",
        serviceCode,
        nameAr,
        nameEn,
        serviceLevelLabel,
        hoursAllocated,
        monthlyServiceId: revision.monthlyServiceId,
        monthlyServiceRevisionId,
        oneTimeServiceId: null,
        oneTimeServiceRevisionId: null,
        serviceLevelId,
        existingSpecialistIds,
      };
    }

    const oneTimeServiceRevisionId = item.oneTimeServiceRevisionId;
    if (!oneTimeServiceRevisionId) {
      throw new ConflictException({
        code: "QUOTE_ONE_TIME_REVISION_REQUIRED",
        message: "One-time quote lines must include a one-time service revision",
      });
    }
    const revision = await this.database.prisma.oneTimeServiceRevision.findUnique({
      where: { id: oneTimeServiceRevisionId },
      select: {
        id: true,
        oneTimeServiceId: true,
      },
    });
    if (!revision) {
      throw new ConflictException({
        code: "QUOTE_ONE_TIME_REVISION_NOT_FOUND",
        message: "A quote one-time service revision is no longer available",
      });
    }
    const existingSpecialistIds = await this.existingSpecialistIdsForService({
      clientId: quote.clientId!,
      oneTimeServiceId: revision.oneTimeServiceId,
    });
    return {
      quoteItemId: item.id,
      lineType: "ONE_TIME",
      serviceCode,
      nameAr,
      nameEn,
      serviceLevelLabel,
      hoursAllocated: snapshotHours,
      monthlyServiceId: null,
      monthlyServiceRevisionId: null,
      oneTimeServiceId: revision.oneTimeServiceId,
      oneTimeServiceRevisionId,
      serviceLevelId: null,
      existingSpecialistIds,
    };
  }

  private async serviceLevelIdForQuoteItem(
    quote: Awaited<ReturnType<QuotesService["requireAccessibleQuote"]>>,
    item: Awaited<ReturnType<QuotesService["requireAccessibleQuote"]>>["items"][number],
    snapshot: Record<string, unknown>,
  ): Promise<string> {
    const sourceDraft = recordOrNull(quote.sourceDraftSnapshot);
    const selections = Array.isArray(sourceDraft?.selections) ? sourceDraft.selections : [];
    const selection = selections
      .map(recordOrNull)
      .find(
        (entry) =>
          entry?.monthlyServiceRevisionId === item.monthlyServiceRevisionId ||
          entry?.oneTimeServiceRevisionId === item.oneTimeServiceRevisionId,
      );
    const selectedLevelId = selection ? stringValue(selection, "serviceLevelId") : undefined;
    if (selectedLevelId) {
      const serviceLevel = await this.database.prisma.serviceLevel.findFirst({
        where: { id: selectedLevelId, status: "ACTIVE" },
        select: { id: true },
      });
      if (serviceLevel) {
        return serviceLevel.id;
      }
    }

    const serviceLevelCode = stringValue(snapshot, "serviceLevelCode");
    if (serviceLevelCode) {
      const serviceLevel = await this.database.prisma.serviceLevel.findFirst({
        where: { code: serviceLevelCode, status: "ACTIVE" },
        select: { id: true },
      });
      if (serviceLevel) {
        return serviceLevel.id;
      }
    }

    throw new ConflictException({
      code: "QUOTE_SERVICE_LEVEL_NOT_FOUND",
      message: "A monthly quote line does not reference an active service level",
    });
  }

  private async existingSpecialistIdsForService(input: {
    clientId: string;
    monthlyServiceId?: string;
    oneTimeServiceId?: string;
  }): Promise<string[]> {
    const scopes = await this.database.prisma.specialistServiceScope.findMany({
      where: {
        clientId: input.clientId,
        status: "ACTIVE",
        ...(input.monthlyServiceId ? { monthlyServiceId: input.monthlyServiceId } : {}),
        ...(input.oneTimeServiceId ? { oneTimeServiceId: input.oneTimeServiceId } : {}),
        user: {
          status: "ACTIVE",
          userType: "INTERNAL",
          roles: { some: { role: { code: { in: [...specialistRoleCodes] }, status: "ACTIVE" } } },
        },
      },
      orderBy: [{ isPrimary: "desc" }, { startsAt: "asc" }],
      select: { userId: true },
    });
    return scopes.map((scope) => scope.userId);
  }

  private async assertActiveSpecialists(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    const specialists = await this.database.prisma.user.findMany({
      where: {
        id: { in: ids },
        status: "ACTIVE",
        userType: "INTERNAL",
        roles: { some: { role: { code: { in: [...specialistRoleCodes] }, status: "ACTIVE" } } },
      },
      select: { id: true },
    });
    const found = new Set(specialists.map((specialist) => specialist.id));
    const missingIds = ids.filter((id) => !found.has(id));
    if (missingIds.length > 0) {
      throw new BadRequestException({
        code: "INVALID_SPECIALIST_ASSIGNMENT",
        message: "One or more selected specialists are unavailable",
        missingIds,
      });
    }
  }

  private async createOrLinkPortalUserInTransaction(
    transaction: Prisma.TransactionClient,
    clientId: string,
    input: NonNullable<QuoteOnboardingDto["portalUser"]>,
    temporaryPasswordHash: string,
    now: Date,
  ) {
    const email = input.email.trim().toLowerCase();
    const displayName = input.displayName.trim();
    const role = await transaction.role.findUnique({
      where: { code: CLIENT_ROLE_CODE },
      select: { id: true, status: true },
    });
    if (!role || role.status !== "ACTIVE") {
      throw new BadRequestException({
        code: "CLIENT_ROLE_NOT_CONFIGURED",
        message: "The client role is not configured",
      });
    }

    const existing = await transaction.user.findUnique({
      where: { email },
      include: {
        clientAssignments: {
          where: { clientId, roleCode: CLIENT_ROLE_CODE },
          select: { id: true },
        },
        roles: { include: { role: true } },
      },
    });
    if (existing && existing.userType !== "EXTERNAL") {
      throw new ConflictException({
        code: "PORTAL_USER_EMAIL_ALREADY_INTERNAL",
        message: "The email is already assigned to an internal user",
      });
    }

    if (existing) {
      if (
        !existing.roles.some(({ role: assignedRole }) => assignedRole.code === CLIENT_ROLE_CODE)
      ) {
        await transaction.userRole.create({
          data: { userId: existing.id, roleId: role.id },
        });
      }
      if (existing.clientAssignments.length === 0) {
        await transaction.clientAssignment.create({
          data: {
            clientId,
            userId: existing.id,
            roleCode: CLIENT_ROLE_CODE,
            startsAt: now,
          },
        });
      }
      await transaction.user.update({
        where: { id: existing.id },
        data: {
          displayName,
          preferredLocale: input.preferredLocale ?? existing.preferredLocale ?? "ar",
          status: "ACTIVE",
        },
      });
      return {
        id: existing.id,
        email,
        displayName,
        created: false,
        temporaryPasswordAssigned: false,
      };
    }

    const created = await transaction.user.create({
      data: {
        email,
        displayName,
        preferredLocale: input.preferredLocale ?? "ar",
        userType: "EXTERNAL",
        status: "ACTIVE",
        passwordHash: temporaryPasswordHash,
        passwordChangedAt: null,
        roles: {
          create: {
            roleId: role.id,
          },
        },
        clientAssignments: {
          create: {
            clientId,
            roleCode: CLIENT_ROLE_CODE,
            startsAt: now,
          },
        },
      },
      select: {
        id: true,
        email: true,
        displayName: true,
      },
    });

    return {
      ...created,
      created: true,
      temporaryPasswordAssigned: true,
    };
  }

  private async ensureQuoteSubscriptionInTransaction(
    transaction: Prisma.TransactionClient,
    quote: Awaited<ReturnType<QuotesService["requireAccessibleQuote"]>>,
    services: OnboardingServiceTarget[],
    now: Date,
  ) {
    const clientId = quote.clientId!;
    const monthlyServices = services.filter(
      (service) =>
        service.lineType === "MONTHLY" &&
        service.monthlyServiceRevisionId &&
        service.serviceLevelId,
    );
    let subscription = await transaction.subscription.findFirst({
      where: {
        clientId,
        status: "ACTIVE",
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
      select: { id: true },
    });
    if (!subscription && monthlyServices.length > 0) {
      subscription = await transaction.subscription.create({
        data: {
          clientId,
          status: "ACTIVE",
          startsAt: now,
        },
        select: { id: true },
      });
    }

    const createdServiceIds: string[] = [];
    const reusedServiceIds: string[] = [];
    if (!subscription) {
      return {
        subscriptionId: null,
        createdServiceIds,
        reusedServiceIds,
      };
    }

    for (const service of monthlyServices) {
      const existing = await transaction.subscriptionService.findFirst({
        where: {
          subscription: {
            clientId,
            status: "ACTIVE",
            startsAt: { lte: now },
            OR: [{ endsAt: null }, { endsAt: { gt: now } }],
          },
          monthlyServiceRevisionId: service.monthlyServiceRevisionId!,
          serviceLevelId: service.serviceLevelId!,
          status: "ACTIVE",
          startsAt: { lte: now },
          OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        },
        select: { id: true },
      });
      if (existing) {
        reusedServiceIds.push(existing.id);
        continue;
      }

      const scopeSnapshot = {
        source: "QUOTE_ONBOARDING",
        quoteId: quote.id,
        quoteNumber: quote.quoteNumber,
        quoteItemId: service.quoteItemId,
        serviceCode: service.serviceCode,
        serviceLevelLabel: service.serviceLevelLabel,
      };
      const created = await transaction.subscriptionService.create({
        data: {
          subscriptionId: subscription.id,
          monthlyServiceRevisionId: service.monthlyServiceRevisionId!,
          serviceLevelId: service.serviceLevelId!,
          hoursAllocated: service.hoursAllocated ?? 0,
          startsAt: now,
          status: "ACTIVE",
          scopeSnapshot: json(scopeSnapshot),
        },
        select: { id: true },
      });
      await transaction.subscriptionServiceHistory.create({
        data: {
          subscriptionServiceId: created.id,
          effectiveAt: now,
          changeType: "CREATED_FROM_ACCEPTED_QUOTE",
          afterSnapshot: json(scopeSnapshot),
          reason: "Quote onboarding after payment confirmation",
        },
      });
      createdServiceIds.push(created.id);
    }

    return {
      subscriptionId: subscription.id,
      createdServiceIds,
      reusedServiceIds,
    };
  }

  private async replaceSpecialistScopesForServiceInTransaction(
    transaction: Prisma.TransactionClient,
    clientId: string,
    service: OnboardingServiceTarget,
    specialistIds: string[],
    now: Date,
  ): Promise<void> {
    if (!service.monthlyServiceId && !service.oneTimeServiceId) {
      return;
    }
    const serviceWhere = service.monthlyServiceId
      ? { monthlyServiceId: service.monthlyServiceId }
      : { oneTimeServiceId: service.oneTimeServiceId! };
    const existingScopes = await transaction.specialistServiceScope.findMany({
      where: {
        clientId,
        status: "ACTIVE",
        ...serviceWhere,
      },
      select: { id: true, userId: true },
    });
    const selected = new Set(specialistIds);
    const scopesToDisable = existingScopes.filter((scope) => !selected.has(scope.userId));
    if (scopesToDisable.length > 0) {
      await transaction.specialistServiceScope.updateMany({
        where: { id: { in: scopesToDisable.map((scope) => scope.id) } },
        data: { status: "DISABLED", endsAt: now },
      });
    }

    for (const [index, specialistId] of specialistIds.entries()) {
      const existing = await transaction.specialistServiceScope.findFirst({
        where: {
          userId: specialistId,
          clientId,
          ...serviceWhere,
        },
        select: { id: true },
      });
      const data = {
        status: "ACTIVE" as const,
        endsAt: null,
        isPrimary: index === 0,
      };
      if (existing) {
        await transaction.specialistServiceScope.update({
          where: { id: existing.id },
          data,
        });
      } else {
        await transaction.specialistServiceScope.create({
          data: {
            userId: specialistId,
            clientId,
            ...serviceWhere,
            startsAt: now,
            ...data,
          },
        });
      }
    }
  }

  private async snapshotLine(
    rawLine: unknown,
    index: number,
    draftItemsByRevision: Map<
      string,
      {
        lineType: string;
        monthlyServiceRevisionId: string | null;
        oneTimeServiceRevisionId: string | null;
        serviceLevelId: string | null;
        quantity: unknown;
        sortOrder: number;
      }
    >,
    pricingDate: Date,
  ) {
    const line = objectValue(
      rawLine,
      "INVALID_PRICING_LINE_SNAPSHOT",
      "A pricing line snapshot is invalid",
    );
    const lineType = stringValue(line, "lineType");
    if (lineType !== "MONTHLY" && lineType !== "ONE_TIME") {
      throw new ConflictException({
        code: "INVALID_PRICING_LINE_TYPE",
        message: "A pricing line has an unsupported service type",
      });
    }
    const monthlyServiceRevisionId = stringValue(line, "monthlyServiceRevisionId");
    const oneTimeServiceRevisionId = stringValue(line, "oneTimeServiceRevisionId");
    const revisionId = monthlyServiceRevisionId ?? oneTimeServiceRevisionId;
    const draftItem = revisionId ? draftItemsByRevision.get(revisionId) : undefined;
    if (!revisionId || !draftItem || draftItem.lineType !== lineType) {
      throw new ConflictException({
        code: "PRICING_LINE_DRAFT_SELECTION_MISMATCH",
        message: "A calculated pricing line does not match the saved draft selections",
      });
    }

    const serviceItems =
      lineType === "MONTHLY" && monthlyServiceRevisionId && draftItem.serviceLevelId
        ? await this.monthlyServiceItemSnapshots(
            monthlyServiceRevisionId,
            draftItem.serviceLevelId,
            pricingDate,
          )
        : [];
    const serviceLevelCode = stringValue(line, "serviceLevelCode");
    const serviceLevelLabel = stringValue(line, "serviceLevelLabel");
    const snapshot: SnapshotLine & { serviceItems: typeof serviceItems } = {
      sortOrder: Number.isInteger(line.sortOrder) ? Number(line.sortOrder) : index,
      lineType,
      ...(monthlyServiceRevisionId ? { monthlyServiceRevisionId } : {}),
      ...(oneTimeServiceRevisionId ? { oneTimeServiceRevisionId } : {}),
      serviceCode: stringValue(line, "serviceCode") ?? revisionId,
      nameAr: stringValue(line, "nameAr") ?? "",
      nameEn: stringValue(line, "nameEn") ?? "",
      ...(serviceLevelCode ? { serviceLevelCode } : {}),
      ...(serviceLevelLabel ? { serviceLevelLabel } : {}),
      quantity: numericValue(line, "quantity"),
      ...(line.hours !== undefined ? { hours: numericValue(line, "hours") } : {}),
      ...(line.unitRate !== undefined ? { unitRate: numericValue(line, "unitRate") } : {}),
      ...(line.unitPrice !== undefined ? { unitPrice: numericValue(line, "unitPrice") } : {}),
      baseAmount: numericValue(line, "baseAmount"),
      setupFee: numericValue(line, "setupFee"),
      lineTotal: numericValue(line, "lineTotal"),
      internalCost: numericValue(line, "internalCost"),
      serviceItems,
    };
    return snapshot;
  }

  private async monthlyServiceItemSnapshots(
    monthlyServiceRevisionId: string,
    serviceLevelId: string,
    pricingDate: Date,
  ) {
    const revision = await this.database.prisma.monthlyServiceRevision.findUnique({
      where: { id: monthlyServiceRevisionId },
      select: { monthlyServiceId: true },
    });
    if (!revision) {
      throw new ConflictException({
        code: "MONTHLY_SERVICE_REVISION_NOT_FOUND",
        message: "A selected monthly service revision no longer exists",
      });
    }
    const items = await this.database.prisma.serviceItem.findMany({
      where: {
        monthlyServiceId: revision.monthlyServiceId,
        status: "ACTIVE",
        revisions: {
          some: {
            status: "ACTIVE",
            effectiveFrom: { lte: pricingDate },
            OR: [{ effectiveTo: null }, { effectiveTo: { gt: pricingDate } }],
            levelInclusions: {
              some: { serviceLevelId, included: true },
            },
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      include: {
        revisions: {
          where: {
            status: "ACTIVE",
            effectiveFrom: { lte: pricingDate },
            OR: [{ effectiveTo: null }, { effectiveTo: { gt: pricingDate } }],
            levelInclusions: {
              some: { serviceLevelId, included: true },
            },
          },
          orderBy: [{ effectiveFrom: "desc" }, { version: "desc" }],
          take: 1,
        },
      },
    });
    return items.flatMap((item) => {
      const itemRevision = item.revisions[0];
      if (!itemRevision) {
        return [];
      }
      return [
        {
          serviceItemRevisionId: itemRevision.id,
          itemCode: item.code,
          nameAr: itemRevision.nameAr,
          nameEn: itemRevision.nameEn,
          expectedOutput: itemRevision.expectedOutput,
          requiresFile: itemRevision.requiresFile,
          deductHours: itemRevision.deductHours,
          sortOrder: item.sortOrder,
        },
      ];
    });
  }

  private totalsSnapshot(value: unknown): SnapshotTotals {
    const totals = objectValue(
      value,
      "INVALID_PRICING_TOTALS_SNAPSHOT",
      "The pricing draft totals snapshot is invalid",
    );
    return {
      subtotalMonthly: numericValue(totals, "subtotalMonthly"),
      subtotalSetup: numericValue(totals, "subtotalSetup"),
      subtotalOneTime: numericValue(totals, "subtotalOneTime"),
      subtotal: numericValue(totals, "subtotal"),
      discountTotal: numericValue(totals, "discountTotal"),
      finalBeforeTax: numericValue(totals, "finalBeforeTax"),
      taxTotal: numericValue(totals, "taxTotal"),
      finalTotal: numericValue(totals, "finalTotal"),
      internalCost: numericValue(totals, "internalCost"),
      marginAmount: numericValue(totals, "marginAmount"),
      marginPct: numericValue(totals, "marginPct"),
      targetMarginPct:
        totals.targetMarginPct === null || totals.targetMarginPct === undefined
          ? null
          : numericValue(totals, "targetMarginPct"),
      meetsTargetMargin:
        typeof totals.meetsTargetMargin === "boolean" ? totals.meetsTargetMargin : null,
    };
  }

  private async requireAccessibleDraft(id: string, principal: AuthenticatedPrincipal) {
    const draft = await this.database.prisma.pricingDraft.findFirst({
      where: {
        id,
        ...(this.isGlobal(principal) ? {} : { clientId: { in: principal.assignedClientIds } }),
      },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!draft) {
      throw new NotFoundException({
        code: "PRICING_DRAFT_NOT_FOUND",
        message: "The pricing draft could not be found",
      });
    }
    return draft;
  }

  private async requireAccessibleQuote(id: string, principal: AuthenticatedPrincipal) {
    const quote = await this.database.prisma.quote.findFirst({
      where: { id, ...this.quoteAccessWhere(principal) },
      include: {
        invoices: {
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
        code: "QUOTE_NOT_FOUND",
        message: "The quote could not be found",
      });
    }
    return quote;
  }

  private quoteAccessWhere(principal: AuthenticatedPrincipal) {
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

  private quoteView(quote: Awaited<ReturnType<QuotesService["requireAccessibleQuote"]>>) {
    return {
      id: quote.id,
      quoteNumber: quote.quoteNumber,
      status: quote.status,
      currency: quote.currency,
      issueDate: quote.issueDate?.toISOString() ?? null,
      validUntil: quote.validUntil?.toISOString() ?? null,
      acceptedAt: quote.acceptedAt?.toISOString() ?? null,
      rejectedAt: quote.rejectedAt?.toISOString() ?? null,
      expiredAt: quote.expiredAt?.toISOString() ?? null,
      cancelledAt: quote.cancelledAt?.toISOString() ?? null,
      statusReason: quote.statusReason,
      statusChangedAt: quote.statusChangedAt.toISOString(),
      createdAt: quote.createdAt.toISOString(),
      updatedAt: quote.updatedAt.toISOString(),
      sourcePricingDraftId: quote.sourcePricingDraftId,
      sourceDraftVersion: quote.sourceDraftVersion,
      snapshotHash: quote.snapshotHash,
      client: quote.clientSnapshot,
      pricing: quote.pricingSnapshot,
      pricingRules: quote.pricingRulesSnapshot,
      terms: quote.termsSnapshot,
      sourceDraft: quote.sourceDraftSnapshot,
      totals: quote.totalsSnapshot,
      invoices: quote.invoices.map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status === "VOID" ? "VOIDED" : invoice.status,
        createdAt: invoice.createdAt.toISOString(),
        updatedAt: invoice.updatedAt.toISOString(),
      })),
      items: quote.items.map((item) => ({
        id: item.id,
        lineType: item.lineType,
        serviceSnapshot: item.serviceSnapshot,
        quantity: numberValue(item.quantity),
        hours: item.hours === null ? null : numberValue(item.hours),
        unitPrice: numberValue(item.unitPrice),
        setupFee: numberValue(item.setupFee),
        discount: numberValue(item.discount),
        lineTotal: numberValue(item.lineTotal),
        internalCost: numberValue(item.internalCost),
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
      })),
    };
  }

  private clientSummary(snapshot: unknown) {
    const client = objectValue(
      snapshot,
      "INVALID_QUOTE_CLIENT_SNAPSHOT",
      "The quote client snapshot is invalid",
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
      return "Quote";
    }
    return stringValue(snapshot as Record<string, unknown>, "title") ?? "Quote";
  }

  private quoteNumber(): string {
    const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    return `QT-${date}-${randomUUID().slice(0, 8).toUpperCase()}`;
  }

  private uniqueIds(values: string[]): string[] {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  }
}
