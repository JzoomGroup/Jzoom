import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@jzoom/database";
import { ADMIN_ROLE_CODE } from "../auth/auth.constants.js";
import { AuthAuditService } from "../auth/audit.service.js";
import type { AuthenticatedPrincipal, RequestMetadata } from "../auth/auth.types.js";
import type { CatalogLifecycleStatus } from "../catalog-admin/catalog.dto.js";
import { DatabaseService } from "../database/database.service.js";
import { PRICING_EVENT, PRICING_RULE_TYPES } from "./pricing.constants.js";
import type { CreatePricingRuleDto, PricingInputDto, UpdatePricingRuleDto } from "./pricing.dto.js";

type DatabaseStatus = "DRAFT" | "ACTIVE" | "DISABLED" | "ARCHIVED";
type RuleType = (typeof PRICING_RULE_TYPES)[number];

interface EffectiveRule {
  id: string;
  code: string;
  name: string;
  version: number;
  ruleType: string;
  calculationMethod: string;
  value: number | null;
  currency: string;
  targetType: string;
  targetCode: string | null;
  priority: number;
  isStackable: boolean;
}

const validTransitions: Record<DatabaseStatus, DatabaseStatus[]> = {
  DRAFT: ["ACTIVE", "DISABLED", "ARCHIVED"],
  ACTIVE: ["DISABLED", "ARCHIVED"],
  DISABLED: ["ACTIVE", "ARCHIVED"],
  ARCHIVED: [],
};

function toDatabaseStatus(status: CatalogLifecycleStatus): DatabaseStatus {
  return status === "INACTIVE" ? "DISABLED" : status;
}

function toLifecycleStatus(status: DatabaseStatus): CatalogLifecycleStatus {
  return status === "DISABLED" ? "INACTIVE" : status;
}

function numberValue(value: unknown): number {
  return Number(value);
}

function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function assertUnique(values: string[], code: string, message: string): void {
  if (new Set(values).size !== values.length) {
    throw new BadRequestException({ code, message });
  }
}

function requireReason(status: DatabaseStatus, reason: string | undefined): void {
  if ((status === "DISABLED" || status === "ARCHIVED") && !reason?.trim()) {
    throw new BadRequestException({
      code: "PRICING_STATUS_REASON_REQUIRED",
      message: "A reason is required when disabling or archiving pricing configuration",
    });
  }
}

@Injectable()
export class PricingService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AuthAuditService) private readonly audit: AuthAuditService,
  ) {}

  async getAdminRules() {
    const rules = await this.database.prisma.pricingRule.findMany({
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      include: {
        revisions: {
          orderBy: { version: "desc" },
        },
      },
    });

    return {
      ruleTypes: [...PRICING_RULE_TYPES],
      calculationMethods: ["NONE", "FIXED_AMOUNT", "PERCENTAGE"],
      targetTypes: ["ALL", "MONTHLY", "ONE_TIME"],
      rules: rules.map((rule) => ({
        id: rule.id,
        code: rule.code,
        name: rule.name,
        status: toLifecycleStatus(rule.status),
        sortOrder: rule.sortOrder,
        archivedAt: rule.archivedAt?.toISOString() ?? null,
        revisions: rule.revisions.map((revision) => this.ruleRevisionView(revision)),
        revision: rule.revisions[0] ? this.ruleRevisionView(rule.revisions[0]) : null,
      })),
    };
  }

  async createRule(input: CreatePricingRuleDto, actorId: string, metadata: RequestMetadata) {
    await this.validateRuleInput(input);
    const existing = await this.database.prisma.pricingRule.findFirst({
      where: { code: { equals: input.code.trim(), mode: "insensitive" } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException({
        code: "PRICING_RULE_CODE_ALREADY_EXISTS",
        message: "The pricing-rule code is already in use",
      });
    }

    const stableStatus = input.status ?? "DRAFT";
    const revisionStatus = input.revisionStatus ?? stableStatus;
    const created = await this.database.prisma.pricingRule.create({
      data: {
        code: input.code.trim(),
        name: input.name.trim(),
        status: stableStatus,
        sortOrder: input.sortOrder ?? 0,
        revisions: {
          create: {
            version: 1,
            status: revisionStatus,
            ...this.ruleRevisionData(input),
          },
        },
      },
      include: { revisions: true },
    });

    await this.audit.record(
      {
        actorId,
        eventCode: PRICING_EVENT.ruleCreated,
        entityType: "PricingRule",
        entityId: created.id,
        after: {
          code: created.code,
          name: created.name,
          status: created.status,
          revision: this.ruleRevisionView(created.revisions[0]!),
        },
      },
      metadata,
    );
    return this.requireRuleView(created.id);
  }

  async reviseRule(
    id: string,
    input: UpdatePricingRuleDto,
    actorId: string,
    metadata: RequestMetadata,
  ) {
    await this.validateRuleInput(input);
    const before = await this.requireRule(id);
    this.assertNotArchived(before.status);
    const latest = before.revisions[0];
    if (!latest) {
      throw new ConflictException({
        code: "PRICING_RULE_REVISION_MISSING",
        message: "The pricing rule has no revision to supersede",
      });
    }

    const revisionStatus = input.revisionStatus ?? "DRAFT";
    const effectiveFrom = new Date(input.effectiveFrom);
    await this.database.prisma.$transaction(async (tx) => {
      if (revisionStatus === "ACTIVE") {
        await tx.pricingRuleRevision.updateMany({
          where: {
            pricingRuleId: id,
            status: "ACTIVE",
            effectiveTo: null,
          },
          data: { effectiveTo: effectiveFrom },
        });
      }
      await tx.pricingRule.update({
        where: { id },
        data: {
          name: input.name.trim(),
          revisions: {
            create: {
              version: latest.version + 1,
              status: revisionStatus,
              ...this.ruleRevisionData(input),
            },
          },
        },
      });
    });

    const after = await this.requireRuleView(id);
    await this.audit.record(
      {
        actorId,
        eventCode: PRICING_EVENT.ruleRevised,
        entityType: "PricingRule",
        entityId: id,
        before: {
          name: before.name,
          revision: this.ruleRevisionView(latest),
        },
        after: {
          name: after.name,
          revision: after.revision,
        },
      },
      metadata,
    );
    return after;
  }

  async changeRuleStatus(
    id: string,
    status: CatalogLifecycleStatus,
    reason: string | undefined,
    actorId: string,
    metadata: RequestMetadata,
  ) {
    const rule = await this.requireRule(id);
    const target = toDatabaseStatus(status);
    requireReason(target, reason);
    if (rule.status === target || !validTransitions[rule.status].includes(target)) {
      throw new ConflictException({
        code: "INVALID_PRICING_RULE_STATUS_TRANSITION",
        message: `Pricing-rule status cannot change from ${toLifecycleStatus(rule.status)} to ${status}`,
      });
    }
    if (target === "ACTIVE" && !rule.revisions.some((revision) => revision.status === "ACTIVE")) {
      throw new ConflictException({
        code: "ACTIVE_PRICING_REVISION_REQUIRED",
        message: "An active pricing-rule revision is required before enabling the rule",
      });
    }

    const updated = await this.database.prisma.pricingRule.update({
      where: { id },
      data: {
        status: target,
        archivedAt: target === "ARCHIVED" ? new Date() : null,
      },
    });
    await this.audit.record(
      {
        actorId,
        eventCode: PRICING_EVENT.ruleStatusChanged,
        entityType: "PricingRule",
        entityId: id,
        before: { status: toLifecycleStatus(rule.status) },
        after: { status },
        ...(reason ? { reason } : {}),
      },
      metadata,
    );
    return { ...updated, status: toLifecycleStatus(updated.status) };
  }

  async reorderRule(id: string, sortOrder: number, actorId: string, metadata: RequestMetadata) {
    const rule = await this.requireRule(id);
    this.assertNotArchived(rule.status);
    if (rule.sortOrder !== sortOrder) {
      await this.database.prisma.$transaction([
        this.database.prisma.pricingRule.updateMany({
          where:
            rule.sortOrder < sortOrder
              ? { id: { not: id }, sortOrder: { gt: rule.sortOrder, lte: sortOrder } }
              : { id: { not: id }, sortOrder: { gte: sortOrder, lt: rule.sortOrder } },
          data: { sortOrder: { increment: rule.sortOrder < sortOrder ? -1 : 1 } },
        }),
        this.database.prisma.pricingRule.update({
          where: { id },
          data: { sortOrder },
        }),
      ]);
      await this.audit.record(
        {
          actorId,
          eventCode: PRICING_EVENT.ruleReordered,
          entityType: "PricingRule",
          entityId: id,
          before: { sortOrder: rule.sortOrder },
          after: { sortOrder },
        },
        metadata,
      );
    }
    return this.requireRuleView(id);
  }

  async getStudioCatalog(principal: AuthenticatedPrincipal) {
    const now = new Date();
    const clientWhere = this.isGlobal(principal)
      ? { status: "ACTIVE" as const }
      : {
          id: { in: principal.assignedClientIds },
          status: "ACTIVE" as const,
        };
    const [clients, monthlyServices, oneTimeServices] = await Promise.all([
      this.database.prisma.client.findMany({
        where: clientWhere,
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
      this.database.prisma.monthlyService.findMany({
        where: { status: "ACTIVE", category: { status: "ACTIVE" } },
        orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
        include: {
          category: true,
          revisions: {
            where: this.effectiveRevisionWhere(now),
            orderBy: [{ effectiveFrom: "desc" }, { version: "desc" }],
            take: 1,
            include: {
              levelConfigs: {
                where: { isEnabled: true, serviceLevel: { status: "ACTIVE" } },
                orderBy: { sortOrder: "asc" },
                include: { serviceLevel: true },
              },
            },
          },
        },
      }),
      this.database.prisma.oneTimeService.findMany({
        where: { status: "ACTIVE", category: { status: "ACTIVE" } },
        orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
        include: {
          category: true,
          revisions: {
            where: this.effectiveRevisionWhere(now),
            orderBy: [{ effectiveFrom: "desc" }, { version: "desc" }],
            take: 1,
          },
        },
      }),
    ]);

    return {
      clients,
      monthlyServices: monthlyServices.flatMap((service) => {
        const revision = service.revisions[0];
        if (!revision?.visibleInPricing || revision.levelConfigs.length === 0) {
          return [];
        }
        return [
          {
            id: service.id,
            code: service.code,
            categoryName: service.category.nameEn,
            revision: {
              id: revision.id,
              version: revision.version,
              nameAr: revision.nameAr,
              nameEn: revision.nameEn,
              description: revision.description,
              sellingHourlyRateSar: numberValue(revision.sellingHourlyRateSar),
              setupFeePct: numberValue(revision.setupFeePct),
              levels: revision.levelConfigs.map((config) => ({
                id: config.serviceLevel.id,
                code: config.serviceLevel.code,
                labelAr: config.serviceLevel.labelAr,
                labelEn: config.serviceLevel.labelEn,
                hours: numberValue(config.hours),
              })),
            },
          },
        ];
      }),
      oneTimeServices: oneTimeServices.flatMap((service) => {
        const revision = service.revisions[0];
        if (!revision?.visibleInPricing) {
          return [];
        }
        return [
          {
            id: service.id,
            code: service.code,
            serviceLine: service.serviceLine,
            categoryName: service.category.nameEn,
            revision: {
              id: revision.id,
              version: revision.version,
              nameAr: revision.nameAr,
              nameEn: revision.nameEn,
              description: revision.description,
              basePriceSar: numberValue(revision.basePriceSar),
              estimatedHours: numberValue(revision.estimatedHours),
              durationDays: revision.durationDays,
            },
          },
        ];
      }),
    };
  }

  async listDrafts(principal: AuthenticatedPrincipal) {
    const drafts = await this.database.prisma.pricingDraft.findMany({
      where: this.draftAccessWhere(principal),
      orderBy: { updatedAt: "desc" },
      include: {
        client: { select: { id: true, code: true, name: true } },
        _count: { select: { items: true } },
      },
    });
    return drafts.map((draft) => ({
      id: draft.id,
      draftNumber: draft.draftNumber,
      title: draft.title,
      status: toLifecycleStatus(draft.status),
      currency: draft.currency,
      pricingDate: draft.pricingDate.toISOString(),
      calculationVersion: draft.calculationVersion,
      lastCalculatedAt: draft.lastCalculatedAt?.toISOString() ?? null,
      updatedAt: draft.updatedAt.toISOString(),
      client: draft.client,
      itemCount: draft._count.items,
      totals: this.snapshotTotals(draft.calculationSnapshot),
    }));
  }

  async getDraft(id: string, principal: AuthenticatedPrincipal) {
    const draft = await this.requireAccessibleDraft(id, principal);
    return this.draftView(draft);
  }

  async preview(
    input: PricingInputDto,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    const result = await this.calculate(input, principal);
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: PRICING_EVENT.previewCalculated,
        entityType: "Client",
        entityId: input.clientId,
        after: {
          monthlySelections: input.monthlySelections.length,
          oneTimeSelections: input.oneTimeSelections.length,
          totals: result.calculation.totals,
        },
        severity: "LOW",
      },
      metadata,
    );
    return result;
  }

  async createDraft(
    input: PricingInputDto,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    const result = await this.calculate(input, principal);
    const draftNumber = this.draftNumber();
    const created = await this.database.prisma.$transaction(async (tx) => {
      const draft = await tx.pricingDraft.create({
        data: {
          draftNumber,
          clientId: input.clientId,
          createdById: principal.userId,
          updatedById: principal.userId,
          currency: input.currency ?? "SAR",
          pricingDate: new Date(input.pricingDate),
          title: input.title.trim(),
          notes: input.notes?.trim() || null,
          clientSnapshot: json(result.client),
          calculationSnapshot: json(result.calculation),
          calculationVersion: 1,
          lastCalculatedAt: new Date(),
        },
      });
      await this.replaceDraftItems(tx, draft.id, input);
      return draft;
    });
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: PRICING_EVENT.draftCreated,
        entityType: "PricingDraft",
        entityId: created.id,
        after: {
          draftNumber,
          clientId: input.clientId,
          totals: result.calculation.totals,
        },
      },
      metadata,
    );
    return this.getDraft(created.id, principal);
  }

  async updateDraft(
    id: string,
    input: PricingInputDto,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    const before = await this.requireAccessibleDraft(id, principal);
    if (before.status === "ARCHIVED") {
      throw new ConflictException({
        code: "ARCHIVED_PRICING_DRAFT_IMMUTABLE",
        message: "Archived pricing drafts cannot be changed",
      });
    }
    const result = await this.calculate(input, principal);
    await this.database.prisma.$transaction(async (tx) => {
      await tx.pricingDraft.update({
        where: { id },
        data: {
          clientId: input.clientId,
          updatedById: principal.userId,
          currency: input.currency ?? "SAR",
          pricingDate: new Date(input.pricingDate),
          title: input.title.trim(),
          notes: input.notes?.trim() || null,
          clientSnapshot: json(result.client),
          calculationSnapshot: json(result.calculation),
          calculationVersion: { increment: 1 },
          lastCalculatedAt: new Date(),
        },
      });
      await this.replaceDraftItems(tx, id, input);
    });
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: PRICING_EVENT.draftUpdated,
        entityType: "PricingDraft",
        entityId: id,
        before: {
          clientId: before.clientId,
          calculationVersion: before.calculationVersion,
          totals: this.snapshotTotals(before.calculationSnapshot),
        },
        after: {
          clientId: input.clientId,
          calculationVersion: before.calculationVersion + 1,
          totals: result.calculation.totals,
        },
      },
      metadata,
    );
    return this.getDraft(id, principal);
  }

  async archiveDraft(
    id: string,
    reason: string,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    if (!reason?.trim()) {
      throw new BadRequestException({
        code: "PRICING_DRAFT_ARCHIVE_REASON_REQUIRED",
        message: "A reason is required to archive a pricing draft",
      });
    }
    const draft = await this.requireAccessibleDraft(id, principal);
    if (draft.status === "ARCHIVED") {
      throw new ConflictException({
        code: "PRICING_DRAFT_ALREADY_ARCHIVED",
        message: "The pricing draft is already archived",
      });
    }
    await this.database.prisma.pricingDraft.update({
      where: { id },
      data: { status: "ARCHIVED", archivedAt: new Date(), updatedById: principal.userId },
    });
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: PRICING_EVENT.draftArchived,
        entityType: "PricingDraft",
        entityId: id,
        before: { status: toLifecycleStatus(draft.status) },
        after: { status: "ARCHIVED" },
        reason: reason.trim(),
      },
      metadata,
    );
    return this.getDraft(id, principal);
  }

  private async calculate(input: PricingInputDto, principal: AuthenticatedPrincipal) {
    if ((input.currency ?? "SAR") !== "SAR") {
      throw new BadRequestException({
        code: "UNSUPPORTED_PRICING_CURRENCY",
        message: "The current catalog is denominated in SAR",
      });
    }
    assertUnique(
      input.monthlySelections.map(
        (selection) => `${selection.monthlyServiceRevisionId}:${selection.serviceLevelId}`,
      ),
      "DUPLICATE_MONTHLY_SELECTION",
      "A monthly service and package level may only be selected once",
    );
    assertUnique(
      input.oneTimeSelections.map((selection) => selection.oneTimeServiceRevisionId),
      "DUPLICATE_ONE_TIME_SELECTION",
      "A one-time service may only be selected once",
    );

    const client = await this.requireAccessibleClient(input.clientId, principal);
    const pricingDate = new Date(input.pricingDate);
    const [monthlyRevisions, oneTimeRevisions, rules] = await Promise.all([
      this.database.prisma.monthlyServiceRevision.findMany({
        where: {
          id: {
            in: input.monthlySelections.map((selection) => selection.monthlyServiceRevisionId),
          },
        },
        include: {
          monthlyService: { include: { category: true } },
          levelConfigs: { include: { serviceLevel: true } },
        },
      }),
      this.database.prisma.oneTimeServiceRevision.findMany({
        where: {
          id: {
            in: input.oneTimeSelections.map((selection) => selection.oneTimeServiceRevisionId),
          },
        },
        include: { oneTimeService: { include: { category: true } } },
      }),
      this.effectiveRules(pricingDate),
    ]);

    if (monthlyRevisions.length !== input.monthlySelections.length) {
      throw new BadRequestException({
        code: "MONTHLY_PRICING_SELECTION_NOT_FOUND",
        message: "One or more selected monthly service revisions could not be found",
      });
    }
    if (oneTimeRevisions.length !== input.oneTimeSelections.length) {
      throw new BadRequestException({
        code: "ONE_TIME_PRICING_SELECTION_NOT_FOUND",
        message: "One or more selected one-time service revisions could not be found",
      });
    }

    const monthlyById = new Map(monthlyRevisions.map((revision) => [revision.id, revision]));
    const oneTimeById = new Map(oneTimeRevisions.map((revision) => [revision.id, revision]));
    const appliedRuleIds = new Set<string>();
    const monthlyLines = input.monthlySelections.map((selection, sortOrder) => {
      const revision = monthlyById.get(selection.monthlyServiceRevisionId)!;
      this.assertRevisionSelectable(
        revision.status,
        revision.effectiveFrom,
        revision.effectiveTo,
        revision.visibleInPricing,
        revision.monthlyService.status,
        revision.monthlyService.category.status,
        pricingDate,
      );
      const level = revision.levelConfigs.find(
        (config) =>
          config.serviceLevelId === selection.serviceLevelId &&
          config.isEnabled &&
          config.serviceLevel.status === "ACTIVE",
      );
      if (!level) {
        throw new BadRequestException({
          code: "MONTHLY_SERVICE_LEVEL_NOT_AVAILABLE",
          message: `The selected package level is not enabled for ${revision.nameEn}`,
        });
      }
      const quantity = selection.quantity ?? 1;
      const rateRules = this.matchingRules(
        rules,
        "RATE_CARD",
        "MONTHLY",
        revision.monthlyService.code,
      );
      const rate = this.applyRate(numberValue(revision.sellingHourlyRateSar), rateRules);
      rateRules.forEach((rule) => appliedRuleIds.add(rule.id));
      const hours = numberValue(level.hours);
      const base = money(hours * rate * quantity);
      const setupRules = this.matchingRules(
        rules,
        "SETUP_FEE",
        "MONTHLY",
        revision.monthlyService.code,
      );
      const setupFee =
        setupRules.length > 0
          ? this.applyAmountRules(base, setupRules, quantity)
          : money(base * (numberValue(revision.setupFeePct) / 100));
      setupRules.forEach((rule) => appliedRuleIds.add(rule.id));
      const internalCost = money(hours * numberValue(revision.internalHourlyCostSar) * quantity);
      return {
        sortOrder,
        lineType: "MONTHLY" as const,
        monthlyServiceRevisionId: revision.id,
        serviceLevelId: level.serviceLevelId,
        serviceCode: revision.monthlyService.code,
        nameAr: revision.nameAr,
        nameEn: revision.nameEn,
        serviceLevelCode: level.serviceLevel.code,
        serviceLevelLabel: level.serviceLevel.labelEn ?? level.serviceLevel.labelAr,
        quantity,
        hours,
        unitRate: money(rate),
        baseAmount: base,
        setupFee,
        lineTotal: money(base + setupFee),
        internalCost,
      };
    });

    const oneTimeLines = input.oneTimeSelections.map((selection, index) => {
      const revision = oneTimeById.get(selection.oneTimeServiceRevisionId)!;
      this.assertRevisionSelectable(
        revision.status,
        revision.effectiveFrom,
        revision.effectiveTo,
        revision.visibleInPricing,
        revision.oneTimeService.status,
        revision.oneTimeService.category.status,
        pricingDate,
      );
      const quantity = selection.quantity ?? 1;
      const rateRules = this.matchingRules(
        rules,
        "RATE_CARD",
        "ONE_TIME",
        revision.oneTimeService.code,
      );
      const unitPrice = this.applyRate(numberValue(revision.basePriceSar), rateRules);
      rateRules.forEach((rule) => appliedRuleIds.add(rule.id));
      const base = money(unitPrice * quantity);
      const internalCost = money(
        numberValue(revision.estimatedHours) *
          numberValue(revision.internalHourlyCostSar) *
          quantity,
      );
      return {
        sortOrder: monthlyLines.length + index,
        lineType: "ONE_TIME" as const,
        oneTimeServiceRevisionId: revision.id,
        serviceCode: revision.oneTimeService.code,
        nameAr: revision.nameAr,
        nameEn: revision.nameEn,
        serviceLine: revision.oneTimeService.serviceLine,
        quantity,
        estimatedHours: numberValue(revision.estimatedHours),
        unitPrice: money(unitPrice),
        baseAmount: base,
        setupFee: 0,
        lineTotal: base,
        internalCost,
      };
    });

    const subtotalMonthly = money(monthlyLines.reduce((total, line) => total + line.baseAmount, 0));
    const subtotalSetup = money(monthlyLines.reduce((total, line) => total + line.setupFee, 0));
    const subtotalOneTime = money(oneTimeLines.reduce((total, line) => total + line.baseAmount, 0));
    const subtotal = money(subtotalMonthly + subtotalSetup + subtotalOneTime);
    const discountRules = rules.filter((rule) => rule.ruleType === "DISCOUNT");
    const discountTotal = money(
      Math.min(
        subtotal,
        discountRules.reduce((total, rule) => {
          appliedRuleIds.add(rule.id);
          const base =
            rule.targetType === "MONTHLY"
              ? subtotalMonthly + subtotalSetup
              : rule.targetType === "ONE_TIME"
                ? subtotalOneTime
                : subtotal;
          return total + this.ruleAmount(base, rule, 1);
        }, 0),
      ),
    );
    const finalBeforeTax = money(subtotal - discountTotal);
    const taxRules = rules.filter((rule) => rule.ruleType === "TAX");
    const taxTotal = money(
      taxRules.reduce((total, rule) => {
        appliedRuleIds.add(rule.id);
        return total + this.ruleAmount(finalBeforeTax, rule, 1);
      }, 0),
    );
    const internalCost = money(
      [...monthlyLines, ...oneTimeLines].reduce((total, line) => total + line.internalCost, 0),
    );
    const marginAmount = money(finalBeforeTax - internalCost);
    const marginPct = finalBeforeTax > 0 ? money((marginAmount / finalBeforeTax) * 100) : 0;
    const marginRule = rules.find(
      (rule) =>
        rule.ruleType === "MARGIN" &&
        rule.calculationMethod === "PERCENTAGE" &&
        rule.value !== null,
    );
    if (marginRule) {
      appliedRuleIds.add(marginRule.id);
    }
    const targetMarginPct = marginRule?.value ?? null;

    return {
      client: {
        id: client.id,
        code: client.code,
        name: client.name,
        legalName: client.legalName,
        sector: client.sector,
        city: client.city,
        authorizedApprover: client.authorizedApprover,
      },
      calculation: {
        calculatedAt: new Date().toISOString(),
        pricingDate: pricingDate.toISOString(),
        currency: input.currency ?? "SAR",
        lines: [...monthlyLines, ...oneTimeLines],
        appliedRules: rules
          .filter((rule) => appliedRuleIds.has(rule.id))
          .map((rule) => ({
            code: rule.code,
            name: rule.name,
            version: rule.version,
            ruleType: rule.ruleType,
            calculationMethod: rule.calculationMethod,
            value: rule.value,
          })),
        totals: {
          subtotalMonthly,
          subtotalSetup,
          subtotalOneTime,
          subtotal,
          discountTotal,
          finalBeforeTax,
          taxTotal,
          finalTotal: money(finalBeforeTax + taxTotal),
          internalCost,
          marginAmount,
          marginPct,
          targetMarginPct,
          meetsTargetMargin: targetMarginPct === null ? null : marginPct >= targetMarginPct,
        },
      },
    };
  }

  private async effectiveRules(pricingDate: Date): Promise<EffectiveRule[]> {
    const records = await this.database.prisma.pricingRule.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      include: {
        revisions: {
          where: this.effectiveRevisionWhere(pricingDate),
          orderBy: [{ priority: "asc" }, { effectiveFrom: "desc" }, { version: "desc" }],
          take: 1,
        },
      },
    });
    return records.flatMap((record) => {
      const revision = record.revisions[0];
      if (!revision?.isEnabled) {
        return [];
      }
      return [
        {
          id: revision.id,
          code: record.code,
          name: record.name,
          version: revision.version,
          ruleType: revision.ruleType,
          calculationMethod: revision.calculationMethod,
          value: revision.value === null ? null : numberValue(revision.value),
          currency: revision.currency,
          targetType: revision.targetType,
          targetCode: revision.targetCode,
          priority: revision.priority,
          isStackable: revision.isStackable,
        },
      ];
    });
  }

  private matchingRules(
    rules: EffectiveRule[],
    ruleType: RuleType,
    targetType: "MONTHLY" | "ONE_TIME",
    targetCode: string,
  ): EffectiveRule[] {
    return rules.filter(
      (rule) =>
        rule.ruleType === ruleType &&
        (rule.targetType === "ALL" || rule.targetType === targetType) &&
        (!rule.targetCode || rule.targetCode === targetCode),
    );
  }

  private applyRate(start: number, rules: EffectiveRule[]): number {
    let result = start;
    for (const rule of rules) {
      if (rule.value === null) {
        continue;
      }
      if (rule.calculationMethod === "FIXED_AMOUNT") {
        result = rule.value;
      } else if (rule.calculationMethod === "PERCENTAGE") {
        result *= 1 + rule.value / 100;
      }
      if (!rule.isStackable) {
        break;
      }
    }
    return money(result);
  }

  private applyAmountRules(base: number, rules: EffectiveRule[], quantity: number): number {
    let result = 0;
    for (const rule of rules) {
      result += this.ruleAmount(base, rule, quantity);
      if (!rule.isStackable) {
        break;
      }
    }
    return money(result);
  }

  private ruleAmount(base: number, rule: EffectiveRule, quantity: number): number {
    if (rule.value === null) {
      return 0;
    }
    if (rule.calculationMethod === "PERCENTAGE") {
      return money(base * (rule.value / 100));
    }
    if (rule.calculationMethod === "FIXED_AMOUNT") {
      return money(rule.value * quantity);
    }
    return 0;
  }

  private async replaceDraftItems(
    tx: Prisma.TransactionClient,
    pricingDraftId: string,
    input: PricingInputDto,
  ): Promise<void> {
    await tx.pricingDraftItem.deleteMany({ where: { pricingDraftId } });
    const items = [
      ...input.monthlySelections.map((selection, sortOrder) => ({
        pricingDraftId,
        lineType: "MONTHLY",
        monthlyServiceRevisionId: selection.monthlyServiceRevisionId,
        serviceLevelId: selection.serviceLevelId,
        quantity: selection.quantity ?? 1,
        sortOrder,
      })),
      ...input.oneTimeSelections.map((selection, index) => ({
        pricingDraftId,
        lineType: "ONE_TIME",
        oneTimeServiceRevisionId: selection.oneTimeServiceRevisionId,
        quantity: selection.quantity ?? 1,
        sortOrder: input.monthlySelections.length + index,
      })),
    ];
    if (items.length > 0) {
      await tx.pricingDraftItem.createMany({ data: items });
    }
  }

  private async validateRuleInput(
    input: CreatePricingRuleDto | UpdatePricingRuleDto,
  ): Promise<void> {
    const from = new Date(input.effectiveFrom);
    const to = input.effectiveTo ? new Date(input.effectiveTo) : null;
    if (to && to <= from) {
      throw new BadRequestException({
        code: "INVALID_PRICING_EFFECTIVE_RANGE",
        message: "Pricing-rule effectiveTo must be later than effectiveFrom",
      });
    }
    if (input.calculationMethod !== "NONE" && input.value === undefined) {
      throw new BadRequestException({
        code: "PRICING_RULE_VALUE_REQUIRED",
        message: "A value is required for percentage and fixed-amount pricing rules",
      });
    }
    if (input.calculationMethod === "PERCENTAGE" && (input.value ?? 0) > 100) {
      throw new BadRequestException({
        code: "PRICING_PERCENTAGE_OUT_OF_RANGE",
        message: "Pricing percentages must be between 0 and 100",
      });
    }
    if (input.ruleType === "MARGIN" && input.calculationMethod !== "PERCENTAGE") {
      throw new BadRequestException({
        code: "MARGIN_RULE_REQUIRES_PERCENTAGE",
        message: "Margin rules must use a percentage calculation",
      });
    }
    if (input.targetType === "ALL" && input.targetCode) {
      throw new BadRequestException({
        code: "GLOBAL_PRICING_RULE_CANNOT_HAVE_TARGET_CODE",
        message: "A global pricing rule cannot target a service code",
      });
    }
    if (input.targetCode) {
      const found =
        input.targetType === "MONTHLY"
          ? await this.database.prisma.monthlyService.count({
              where: { code: input.targetCode },
            })
          : await this.database.prisma.oneTimeService.count({
              where: { code: input.targetCode },
            });
      if (found === 0) {
        throw new BadRequestException({
          code: "PRICING_RULE_TARGET_NOT_FOUND",
          message: "The pricing-rule target service code could not be found",
        });
      }
    }
  }

  private ruleRevisionData(input: CreatePricingRuleDto | UpdatePricingRuleDto) {
    return {
      effectiveFrom: new Date(input.effectiveFrom),
      effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
      formulaOrRule: input.formulaOrRule.trim(),
      appliesTo: input.appliesTo.trim(),
      implementationOwner: input.implementationOwner?.trim() || null,
      visibility: input.visibility?.trim() || null,
      ruleType: input.ruleType,
      calculationMethod: input.calculationMethod,
      value: input.value ?? null,
      currency: input.currency ?? "SAR",
      targetType: input.targetType,
      targetCode: input.targetCode?.trim() || null,
      priority: input.priority ?? 0,
      isStackable: input.isStackable ?? true,
      isEnabled: input.isEnabled ?? true,
      ...(input.conditions ? { conditions: json(input.conditions) } : {}),
    };
  }

  private ruleRevisionView(revision: {
    id: string;
    version: number;
    status: "DRAFT" | "ACTIVE" | "ARCHIVED";
    effectiveFrom: Date | null;
    effectiveTo: Date | null;
    formulaOrRule: string;
    appliesTo: string;
    implementationOwner: string | null;
    visibility: string | null;
    ruleType: string;
    calculationMethod: string;
    value: unknown;
    currency: string;
    targetType: string;
    targetCode: string | null;
    priority: number;
    isStackable: boolean;
    isEnabled: boolean;
    conditions: unknown;
  }) {
    return {
      id: revision.id,
      version: revision.version,
      status: revision.status,
      effectiveFrom: revision.effectiveFrom?.toISOString() ?? null,
      effectiveTo: revision.effectiveTo?.toISOString() ?? null,
      formulaOrRule: revision.formulaOrRule,
      appliesTo: revision.appliesTo,
      implementationOwner: revision.implementationOwner,
      visibility: revision.visibility,
      ruleType: revision.ruleType,
      calculationMethod: revision.calculationMethod,
      value: revision.value === null ? null : numberValue(revision.value),
      currency: revision.currency,
      targetType: revision.targetType,
      targetCode: revision.targetCode,
      priority: revision.priority,
      isStackable: revision.isStackable,
      isEnabled: revision.isEnabled,
      conditions: revision.conditions,
    };
  }

  private async requireRule(id: string) {
    const rule = await this.database.prisma.pricingRule.findUnique({
      where: { id },
      include: { revisions: { orderBy: { version: "desc" } } },
    });
    if (!rule) {
      throw new NotFoundException({
        code: "PRICING_RULE_NOT_FOUND",
        message: "The pricing rule could not be found",
      });
    }
    return rule;
  }

  private async requireRuleView(id: string) {
    const snapshot = await this.getAdminRules();
    const rule = snapshot.rules.find((candidate) => candidate.id === id);
    if (!rule) {
      throw new NotFoundException({
        code: "PRICING_RULE_NOT_FOUND",
        message: "The pricing rule could not be found",
      });
    }
    return rule;
  }

  private assertNotArchived(status: DatabaseStatus): void {
    if (status === "ARCHIVED") {
      throw new ConflictException({
        code: "ARCHIVED_PRICING_RULE_IMMUTABLE",
        message: "Archived pricing rules cannot be changed",
      });
    }
  }

  private effectiveRevisionWhere(at: Date) {
    return {
      status: "ACTIVE" as const,
      effectiveFrom: { lte: at },
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: at } }],
    };
  }

  private assertRevisionSelectable(
    revisionStatus: "DRAFT" | "ACTIVE" | "ARCHIVED",
    effectiveFrom: Date | null,
    effectiveTo: Date | null,
    visibleInPricing: boolean,
    serviceStatus: DatabaseStatus,
    categoryStatus: DatabaseStatus,
    pricingDate: Date,
  ): void {
    if (
      revisionStatus !== "ACTIVE" ||
      !visibleInPricing ||
      serviceStatus !== "ACTIVE" ||
      categoryStatus !== "ACTIVE" ||
      !effectiveFrom ||
      effectiveFrom > pricingDate ||
      (effectiveTo !== null && effectiveTo <= pricingDate)
    ) {
      throw new BadRequestException({
        code: "PRICING_SELECTION_NOT_AVAILABLE",
        message: "A selected catalog revision is not available on the pricing date",
      });
    }
  }

  private isGlobal(principal: AuthenticatedPrincipal): boolean {
    return (
      principal.roles.includes(ADMIN_ROLE_CODE) ||
      principal.scopes.some((scope) => scope.type === "GLOBAL")
    );
  }

  private async requireAccessibleClient(clientId: string, principal: AuthenticatedPrincipal) {
    if (!this.isGlobal(principal) && !principal.assignedClientIds.includes(clientId)) {
      throw new ForbiddenException({
        code: "PRICING_CLIENT_SCOPE_DENIED",
        message: "You cannot price services for this client",
      });
    }
    const client = await this.database.prisma.client.findUnique({
      where: { id: clientId },
    });
    if (!client || client.status !== "ACTIVE") {
      throw new NotFoundException({
        code: "PRICING_CLIENT_NOT_FOUND",
        message: "The active pricing client could not be found",
      });
    }
    return client;
  }

  private draftAccessWhere(principal: AuthenticatedPrincipal) {
    if (this.isGlobal(principal)) {
      return {};
    }
    return {
      createdById: principal.userId,
      clientId: { in: principal.assignedClientIds },
    };
  }

  private async requireAccessibleDraft(id: string, principal: AuthenticatedPrincipal) {
    const draft = await this.database.prisma.pricingDraft.findFirst({
      where: { id, ...this.draftAccessWhere(principal) },
      include: {
        client: { select: { id: true, code: true, name: true } },
        items: {
          orderBy: { sortOrder: "asc" },
        },
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

  private draftView(draft: Awaited<ReturnType<PricingService["requireAccessibleDraft"]>>) {
    return {
      id: draft.id,
      draftNumber: draft.draftNumber,
      clientId: draft.clientId,
      client: draft.client,
      title: draft.title,
      notes: draft.notes,
      status: toLifecycleStatus(draft.status),
      currency: draft.currency,
      pricingDate: draft.pricingDate.toISOString(),
      calculationVersion: draft.calculationVersion,
      lastCalculatedAt: draft.lastCalculatedAt?.toISOString() ?? null,
      createdAt: draft.createdAt.toISOString(),
      updatedAt: draft.updatedAt.toISOString(),
      monthlySelections: draft.items
        .filter((item) => item.lineType === "MONTHLY")
        .map((item) => ({
          monthlyServiceRevisionId: item.monthlyServiceRevisionId!,
          serviceLevelId: item.serviceLevelId!,
          quantity: numberValue(item.quantity),
        })),
      oneTimeSelections: draft.items
        .filter((item) => item.lineType === "ONE_TIME")
        .map((item) => ({
          oneTimeServiceRevisionId: item.oneTimeServiceRevisionId!,
          quantity: numberValue(item.quantity),
        })),
      calculation: draft.calculationSnapshot,
    };
  }

  private snapshotTotals(snapshot: unknown): unknown {
    if (typeof snapshot !== "object" || snapshot === null) {
      return null;
    }
    return Reflect.get(snapshot, "totals") ?? null;
  }

  private draftNumber(): string {
    const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    return `PD-${date}-${randomUUID().slice(0, 8).toUpperCase()}`;
  }
}
