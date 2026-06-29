import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@jzoom/database";
import { DatabaseService } from "../database/database.service.js";
import { AuthAuditService } from "../auth/audit.service.js";
import type { RequestMetadata } from "../auth/auth.types.js";
import { buildDefaultServiceItemRequestTemplate } from "../request-templates/request-template-defaults.js";
import { CATALOG_EVENT } from "./catalog.constants.js";
import type {
  CatalogLifecycleStatus,
  CreateMonthlyCategoryDto,
  CreateMonthlyServiceDto,
  CreateServiceItemDto,
  CreateServiceLevelDto,
  ServiceItemInclusionDto,
  ServiceLevelConfigDto,
  UpdateMonthlyCategoryDto,
  UpdateMonthlyServiceDto,
  UpdateServiceItemDto,
  UpdateServiceLevelDto,
} from "./catalog.dto.js";

type DatabaseStatus = "DRAFT" | "ACTIVE" | "DISABLED" | "ARCHIVED";

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

export function isValidCatalogTransition(
  from: CatalogLifecycleStatus,
  to: CatalogLifecycleStatus,
): boolean {
  return validTransitions[toDatabaseStatus(from)].includes(toDatabaseStatus(to));
}

function numberValue(value: unknown): number {
  return Number(value);
}

function requireReason(status: DatabaseStatus, reason: string | undefined): void {
  if ((status === "DISABLED" || status === "ARCHIVED") && !reason?.trim()) {
    throw new BadRequestException({
      code: "CATALOG_STATUS_REASON_REQUIRED",
      message: "A reason is required when disabling or archiving catalog data",
    });
  }
}

function assertTransition(from: DatabaseStatus, to: DatabaseStatus): void {
  if (from === to || !validTransitions[from].includes(to)) {
    throw new ConflictException({
      code: "INVALID_CATALOG_STATUS_TRANSITION",
      message: `Catalog status cannot change from ${toLifecycleStatus(from)} to ${toLifecycleStatus(to)}`,
    });
  }
}

function duplicateCode(): ConflictException {
  return new ConflictException({
    code: "CATALOG_CODE_ALREADY_EXISTS",
    message: "The catalog code is already in use",
  });
}

function destructiveDeleteBlocked(): ConflictException {
  return new ConflictException({
    code: "DESTRUCTIVE_CATALOG_DELETE_NOT_ALLOWED",
    message: "Catalog records must be archived instead of deleted",
  });
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && Reflect.get(error, "code") === "P2002";
}

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

@Injectable()
export class CatalogService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AuthAuditService) private readonly audit: AuthAuditService,
  ) {}

  async getSnapshot() {
    const [categories, levels, services, items] = await Promise.all([
      this.database.prisma.monthlyServiceCategory.findMany({
        orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
        include: { _count: { select: { services: true } } },
      }),
      this.database.prisma.serviceLevel.findMany({
        orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      }),
      this.database.prisma.monthlyService.findMany({
        orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
        include: {
          category: true,
          revisions: {
            orderBy: { version: "desc" },
            take: 1,
            include: {
              levelConfigs: {
                orderBy: { sortOrder: "asc" },
                include: { serviceLevel: true },
              },
            },
          },
          _count: { select: { items: true } },
        },
      }),
      this.database.prisma.serviceItem.findMany({
        orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
        include: {
          monthlyService: {
            select: {
              id: true,
              code: true,
              status: true,
              revisions: {
                orderBy: { version: "desc" },
                take: 1,
                select: { nameAr: true, nameEn: true },
              },
            },
          },
          revisions: {
            orderBy: { version: "desc" },
            take: 1,
            include: {
              levelInclusions: {
                orderBy: { sortOrder: "asc" },
                include: { serviceLevel: true },
              },
            },
          },
        },
      }),
    ]);

    return {
      categories: categories.map((category) => ({
        id: category.id,
        code: category.code,
        nameAr: category.nameAr,
        nameEn: category.nameEn,
        description: category.description,
        status: toLifecycleStatus(category.status),
        sortOrder: category.sortOrder,
        serviceCount: category._count.services,
        archivedAt: category.archivedAt?.toISOString() ?? null,
      })),
      levels: levels.map((level) => ({
        id: level.id,
        code: level.code,
        labelAr: level.labelAr,
        labelEn: level.labelEn,
        purpose: level.purpose,
        slaRule: level.slaRule,
        scopeRule: level.scopeRule,
        governanceRule: level.governanceRule,
        isCustom: level.isCustom,
        status: toLifecycleStatus(level.status),
        sortOrder: level.sortOrder,
        archivedAt: level.archivedAt?.toISOString() ?? null,
      })),
      services: services.map((service) => {
        const revision = service.revisions[0];
        return {
          id: service.id,
          categoryId: service.categoryId,
          category: {
            id: service.category.id,
            code: service.category.code,
            nameAr: service.category.nameAr,
            nameEn: service.category.nameEn,
          },
          code: service.code,
          externalId: service.externalId,
          status: toLifecycleStatus(service.status),
          sortOrder: service.sortOrder,
          archivedAt: service.archivedAt?.toISOString() ?? null,
          itemCount: service._count.items,
          revision: revision
            ? {
                id: revision.id,
                version: revision.version,
                status: revision.status,
                nameAr: revision.nameAr,
                nameEn: revision.nameEn,
                description: revision.description,
                visibleInPricing: revision.visibleInPricing,
                sellingHourlyRateSar: numberValue(revision.sellingHourlyRateSar),
                internalHourlyCostSar: numberValue(revision.internalHourlyCostSar),
                setupFeePct: numberValue(revision.setupFeePct),
                defaultSlaHours: revision.defaultSlaHours,
                deductHours: revision.deductHours,
                requiresSupervisor: revision.requiresSupervisor,
                requiresManagement: revision.requiresManagement,
                clientApprovalRequired: revision.clientApprovalRequired,
                effectiveFrom: revision.effectiveFrom?.toISOString() ?? null,
                effectiveTo: revision.effectiveTo?.toISOString() ?? null,
                levelConfigs: revision.levelConfigs.map((config) => ({
                  serviceLevelId: config.serviceLevelId,
                  serviceLevelCode: config.serviceLevel.code,
                  serviceLevelLabelAr: config.serviceLevel.labelAr,
                  serviceLevelLabelEn: config.serviceLevel.labelEn,
                  hours: numberValue(config.hours),
                  slaHours: config.slaHours,
                  isEnabled: config.isEnabled,
                  sortOrder: config.sortOrder,
                })),
              }
            : null,
        };
      }),
      items: items.map((item) => {
        const revision = item.revisions[0];
        const parentRevision = item.monthlyService.revisions[0];
        return {
          id: item.id,
          code: item.code,
          monthlyServiceId: item.monthlyServiceId,
          monthlyService: {
            id: item.monthlyService.id,
            code: item.monthlyService.code,
            status: toLifecycleStatus(item.monthlyService.status),
            nameAr: parentRevision?.nameAr ?? item.monthlyService.code,
            nameEn: parentRevision?.nameEn ?? item.monthlyService.code,
          },
          status: toLifecycleStatus(item.status),
          sortOrder: item.sortOrder,
          archivedAt: item.archivedAt?.toISOString() ?? null,
          revision: revision
            ? {
                id: revision.id,
                version: revision.version,
                status: revision.status,
                nameAr: revision.nameAr,
                nameEn: revision.nameEn,
                expectedOutput: revision.expectedOutput,
                visibleInQuote: revision.visibleInQuote,
                requiresFile: revision.requiresFile,
                deductHours: revision.deductHours,
                requestType: revision.requestType,
                effectiveFrom: revision.effectiveFrom?.toISOString() ?? null,
                effectiveTo: revision.effectiveTo?.toISOString() ?? null,
                levelInclusions: revision.levelInclusions.map((inclusion) => ({
                  serviceLevelId: inclusion.serviceLevelId,
                  serviceLevelCode: inclusion.serviceLevel.code,
                  serviceLevelLabelAr: inclusion.serviceLevel.labelAr,
                  serviceLevelLabelEn: inclusion.serviceLevel.labelEn,
                  included: inclusion.included,
                  sortOrder: inclusion.sortOrder,
                })),
              }
            : null,
        };
      }),
    };
  }

  async createCategory(
    input: CreateMonthlyCategoryDto,
    actorId: string,
    metadata: RequestMetadata,
  ) {
    const code = input.code.trim().toUpperCase();
    await this.assertCodeAvailable("category", code);

    try {
      const category = await this.database.prisma.monthlyServiceCategory.create({
        data: {
          code,
          nameAr: input.nameAr.trim(),
          nameEn: input.nameEn.trim(),
          description: input.description?.trim() || null,
          status: input.status ?? "DRAFT",
          sortOrder: input.sortOrder ?? 0,
        },
      });
      const after = this.categoryAuditView(category);
      await this.audit.record(
        {
          actorId,
          eventCode: CATALOG_EVENT.categoryCreated,
          entityType: "MonthlyServiceCategory",
          entityId: category.id,
          after,
        },
        metadata,
      );
      return after;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw duplicateCode();
      }
      throw error;
    }
  }

  async updateCategory(
    id: string,
    input: UpdateMonthlyCategoryDto,
    actorId: string,
    metadata: RequestMetadata,
  ) {
    const existing = await this.requireCategory(id);
    this.assertNotArchived(existing.status);
    const before = this.categoryAuditView(existing);
    const category = await this.database.prisma.monthlyServiceCategory.update({
      where: { id },
      data: {
        nameAr: input.nameAr.trim(),
        nameEn: input.nameEn.trim(),
        description: input.description?.trim() || null,
      },
    });
    const after = this.categoryAuditView(category);
    await this.audit.record(
      {
        actorId,
        eventCode: CATALOG_EVENT.categoryUpdated,
        entityType: "MonthlyServiceCategory",
        entityId: id,
        before,
        after,
      },
      metadata,
    );
    return after;
  }

  async changeCategoryStatus(
    id: string,
    status: CatalogLifecycleStatus,
    reason: string | undefined,
    actorId: string,
    metadata: RequestMetadata,
  ) {
    const existing = await this.requireCategory(id);
    const target = toDatabaseStatus(status);
    assertTransition(existing.status, target);
    requireReason(target, reason);
    if (target !== "ACTIVE") {
      const activeServices = await this.database.prisma.monthlyService.count({
        where: { categoryId: id, status: "ACTIVE" },
      });
      if (activeServices > 0) {
        throw new ConflictException({
          code: "CATEGORY_HAS_ACTIVE_SERVICES",
          message: "Disable or archive active monthly services before changing this category",
        });
      }
    }

    const category = await this.database.prisma.monthlyServiceCategory.update({
      where: { id },
      data: {
        status: target,
        archivedAt: target === "ARCHIVED" ? new Date() : null,
      },
    });
    await this.audit.record(
      {
        actorId,
        eventCode: CATALOG_EVENT.categoryStatusChanged,
        entityType: "MonthlyServiceCategory",
        entityId: id,
        before: { status: toLifecycleStatus(existing.status) },
        after: { status: toLifecycleStatus(category.status) },
        ...(reason ? { reason } : {}),
      },
      metadata,
    );
    return this.categoryAuditView(category);
  }

  async reorderCategory(id: string, sortOrder: number, actorId: string, metadata: RequestMetadata) {
    const existing = await this.requireCategory(id);
    this.assertNotArchived(existing.status);
    const category = await this.database.prisma.monthlyServiceCategory.update({
      where: { id },
      data: { sortOrder },
    });
    await this.recordReorder(
      actorId,
      CATALOG_EVENT.categoryReordered,
      "MonthlyServiceCategory",
      id,
      existing.sortOrder,
      sortOrder,
      metadata,
    );
    return this.categoryAuditView(category);
  }

  async createMonthlyService(
    input: CreateMonthlyServiceDto,
    actorId: string,
    metadata: RequestMetadata,
  ) {
    const code = input.code.trim().toUpperCase();
    await this.assertCodeAvailable("service", code);
    const category = await this.requireCategory(input.categoryId);
    const stableStatus: DatabaseStatus = input.status ?? "DRAFT";
    if (stableStatus === "ACTIVE" && category.status !== "ACTIVE") {
      throw new ConflictException({
        code: "MONTHLY_CATEGORY_NOT_ACTIVE",
        message: "An active service requires an active category",
      });
    }
    await this.validateLevelConfigs(input.levelConfigs, stableStatus === "ACTIVE");

    try {
      const service = await this.database.prisma.$transaction(async (transaction) => {
        const stable = await transaction.monthlyService.create({
          data: {
            categoryId: category.id,
            code,
            status: stableStatus,
            sortOrder: input.sortOrder ?? 0,
          },
        });
        const revision = await transaction.monthlyServiceRevision.create({
          data: {
            monthlyServiceId: stable.id,
            version: 1,
            status: stableStatus === "DRAFT" ? "DRAFT" : "ACTIVE",
            effectiveFrom: stableStatus === "ACTIVE" ? new Date() : null,
            nameAr: input.nameAr.trim(),
            nameEn: input.nameEn.trim(),
            paymentType: "Monthly",
            serviceLine: "Operate",
            domain: category.nameEn,
            description: input.description.trim(),
            visibleInPricing: input.visibleInPricing ?? true,
            sellingHourlyRateSar: input.sellingHourlyRateSar,
            internalHourlyCostSar: input.internalHourlyCostSar,
            setupFeePct: input.setupFeePct,
            defaultSlaHours: input.defaultSlaHours,
            deductHours: input.deductHours ?? true,
            requiresSupervisor: input.requiresSupervisor ?? false,
            requiresManagement: input.requiresManagement ?? false,
            clientApprovalRequired: input.clientApprovalRequired ?? false,
            cardConfiguration: {},
          },
        });
        await transaction.monthlyServiceLevelConfig.createMany({
          data: input.levelConfigs.map((config, index) => ({
            monthlyServiceRevisionId: revision.id,
            serviceLevelId: config.serviceLevelId,
            hours: config.hours,
            ...(config.slaHours !== undefined ? { slaHours: config.slaHours } : {}),
            isEnabled: config.isEnabled,
            sortOrder: config.sortOrder ?? index,
          })),
        });
        return stable;
      });
      const after = await this.requireServiceView(service.id);
      await this.audit.record(
        {
          actorId,
          eventCode: CATALOG_EVENT.serviceCreated,
          entityType: "MonthlyService",
          entityId: service.id,
          after,
        },
        metadata,
      );
      return after;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw duplicateCode();
      }
      throw error;
    }
  }

  async updateMonthlyService(
    id: string,
    input: UpdateMonthlyServiceDto,
    actorId: string,
    metadata: RequestMetadata,
  ) {
    const existing = await this.requireServiceWithRevision(id);
    this.assertNotArchived(existing.status);
    const category = await this.requireCategory(input.categoryId);
    if (category.status === "ARCHIVED") {
      throw new ConflictException({
        code: "MONTHLY_CATEGORY_ARCHIVED",
        message: "An archived category cannot receive monthly services",
      });
    }
    await this.validateLevelConfigs(input.levelConfigs, existing.status === "ACTIVE");
    const before = await this.requireServiceView(id);
    const currentRevision = existing.revisions[0]!;
    const nextVersion = currentRevision.version + 1;
    const now = new Date();
    const nextRevisionStatus = existing.status === "DRAFT" ? "DRAFT" : "ACTIVE";

    await this.database.prisma.$transaction(async (transaction) => {
      await transaction.monthlyServiceRevision.updateMany({
        where: {
          monthlyServiceId: id,
          status: { in: ["ACTIVE", "DRAFT"] },
          effectiveTo: null,
        },
        data: { status: "ARCHIVED", effectiveTo: now },
      });
      const revision = await transaction.monthlyServiceRevision.create({
        data: {
          monthlyServiceId: id,
          version: nextVersion,
          status: nextRevisionStatus,
          effectiveFrom: nextRevisionStatus === "ACTIVE" ? now : null,
          nameAr: input.nameAr.trim(),
          nameEn: input.nameEn.trim(),
          paymentType: currentRevision.paymentType,
          serviceLine: currentRevision.serviceLine,
          domain: category.nameEn,
          description: input.description.trim(),
          visibleInPricing: input.visibleInPricing ?? currentRevision.visibleInPricing,
          sellingHourlyRateSar: input.sellingHourlyRateSar,
          internalHourlyCostSar: input.internalHourlyCostSar,
          setupFeePct: input.setupFeePct,
          defaultSlaHours: input.defaultSlaHours,
          deductHours: input.deductHours ?? currentRevision.deductHours,
          requiresSupervisor: input.requiresSupervisor ?? currentRevision.requiresSupervisor,
          requiresManagement: input.requiresManagement ?? currentRevision.requiresManagement,
          clientApprovalRequired:
            input.clientApprovalRequired ?? currentRevision.clientApprovalRequired,
          cardConfiguration: currentRevision.cardConfiguration ?? {},
        },
      });
      await transaction.monthlyServiceLevelConfig.createMany({
        data: input.levelConfigs.map((config, index) => ({
          monthlyServiceRevisionId: revision.id,
          serviceLevelId: config.serviceLevelId,
          hours: config.hours,
          ...(config.slaHours !== undefined ? { slaHours: config.slaHours } : {}),
          isEnabled: config.isEnabled,
          sortOrder: config.sortOrder ?? index,
        })),
      });
      await transaction.monthlyService.update({
        where: { id },
        data: { categoryId: category.id },
      });
    });

    const after = await this.requireServiceView(id);
    await this.audit.record(
      {
        actorId,
        eventCode: CATALOG_EVENT.serviceUpdated,
        entityType: "MonthlyService",
        entityId: id,
        before,
        after,
      },
      metadata,
    );
    if (
      before.revision.sellingHourlyRateSar !== after.revision.sellingHourlyRateSar ||
      before.revision.internalHourlyCostSar !== after.revision.internalHourlyCostSar ||
      before.revision.setupFeePct !== after.revision.setupFeePct
    ) {
      await this.audit.record(
        {
          actorId,
          eventCode: CATALOG_EVENT.serviceRatesChanged,
          entityType: "MonthlyService",
          entityId: id,
          before: {
            sellingHourlyRateSar: before.revision.sellingHourlyRateSar,
            internalHourlyCostSar: before.revision.internalHourlyCostSar,
            setupFeePct: before.revision.setupFeePct,
          },
          after: {
            sellingHourlyRateSar: after.revision.sellingHourlyRateSar,
            internalHourlyCostSar: after.revision.internalHourlyCostSar,
            setupFeePct: after.revision.setupFeePct,
          },
        },
        metadata,
      );
    }
    if (
      JSON.stringify(before.revision.levelConfigs) !== JSON.stringify(after.revision.levelConfigs)
    ) {
      await this.audit.record(
        {
          actorId,
          eventCode: CATALOG_EVENT.serviceHoursChanged,
          entityType: "MonthlyService",
          entityId: id,
          before: { levelConfigs: before.revision.levelConfigs },
          after: { levelConfigs: after.revision.levelConfigs },
        },
        metadata,
      );
    }
    return after;
  }

  async changeMonthlyServiceStatus(
    id: string,
    status: CatalogLifecycleStatus,
    reason: string | undefined,
    actorId: string,
    metadata: RequestMetadata,
  ) {
    const existing = await this.requireServiceWithRevision(id);
    const target = toDatabaseStatus(status);
    assertTransition(existing.status, target);
    requireReason(target, reason);
    if (target === "ACTIVE" && existing.category.status !== "ACTIVE") {
      throw new ConflictException({
        code: "MONTHLY_CATEGORY_NOT_ACTIVE",
        message: "Enable the monthly service category before enabling this service",
      });
    }
    if (target === "ARCHIVED") {
      const childCount = await this.database.prisma.serviceItem.count({
        where: { monthlyServiceId: id, status: { not: "ARCHIVED" } },
      });
      if (childCount > 0) {
        throw new ConflictException({
          code: "MONTHLY_SERVICE_HAS_ITEMS",
          message: "Archive all service items before archiving the monthly service",
        });
      }
    }

    const now = new Date();
    await this.database.prisma.$transaction(async (transaction) => {
      if (target === "ACTIVE") {
        const activeRevision = existing.revisions.find(
          (revision) => revision.status === "ACTIVE" && !revision.effectiveTo,
        );
        if (!activeRevision) {
          const draft = existing.revisions.find(
            (revision) => revision.status === "DRAFT" && !revision.effectiveTo,
          );
          if (!draft) {
            throw new ConflictException({
              code: "MONTHLY_SERVICE_HAS_NO_ACTIVATABLE_REVISION",
              message: "The service has no draft or active revision to enable",
            });
          }
          await transaction.monthlyServiceRevision.update({
            where: { id: draft.id },
            data: { status: "ACTIVE", effectiveFrom: now },
          });
        }
      }
      if (target === "ARCHIVED") {
        await transaction.monthlyServiceRevision.updateMany({
          where: {
            monthlyServiceId: id,
            status: { in: ["ACTIVE", "DRAFT"] },
            effectiveTo: null,
          },
          data: { status: "ARCHIVED", effectiveTo: now },
        });
      }
      await transaction.monthlyService.update({
        where: { id },
        data: {
          status: target,
          archivedAt: target === "ARCHIVED" ? now : null,
        },
      });
    });
    const after = await this.requireServiceView(id);
    await this.audit.record(
      {
        actorId,
        eventCode: CATALOG_EVENT.serviceStatusChanged,
        entityType: "MonthlyService",
        entityId: id,
        before: { status: toLifecycleStatus(existing.status) },
        after: { status },
        ...(reason ? { reason } : {}),
      },
      metadata,
    );
    return after;
  }

  async reorderMonthlyService(
    id: string,
    sortOrder: number,
    actorId: string,
    metadata: RequestMetadata,
  ) {
    const existing = await this.requireServiceWithRevision(id);
    this.assertNotArchived(existing.status);
    await this.database.prisma.monthlyService.update({
      where: { id },
      data: { sortOrder },
    });
    await this.recordReorder(
      actorId,
      CATALOG_EVENT.serviceReordered,
      "MonthlyService",
      id,
      existing.sortOrder,
      sortOrder,
      metadata,
    );
    return this.requireServiceView(id);
  }

  async createServiceItem(input: CreateServiceItemDto, actorId: string, metadata: RequestMetadata) {
    const code = input.code.trim().toUpperCase();
    await this.assertCodeAvailable("item", code);
    const parent = await this.requireServiceWithRevision(input.monthlyServiceId);
    const stableStatus: DatabaseStatus = input.status ?? "DRAFT";
    if (parent.status === "ARCHIVED" || parent.status === "DISABLED") {
      throw new ConflictException({
        code: "SERVICE_ITEM_PARENT_NOT_AVAILABLE",
        message: "A service item requires a draft or active monthly service",
      });
    }
    if (stableStatus === "ACTIVE" && parent.status !== "ACTIVE") {
      throw new ConflictException({
        code: "SERVICE_ITEM_PARENT_NOT_ACTIVE",
        message: "An active item requires an active monthly service",
      });
    }
    await this.validateInclusions(input.levelInclusions);

    try {
      const item = await this.database.prisma.$transaction(async (transaction) => {
        const stable = await transaction.serviceItem.create({
          data: {
            code,
            monthlyServiceId: parent.id,
            status: stableStatus,
            sortOrder: input.sortOrder ?? 0,
          },
        });
        const revision = await transaction.serviceItemRevision.create({
          data: {
            serviceItemId: stable.id,
            version: 1,
            status: stableStatus === "DRAFT" ? "DRAFT" : "ACTIVE",
            effectiveFrom: stableStatus === "ACTIVE" ? new Date() : null,
            nameAr: input.nameAr.trim(),
            nameEn: input.nameEn.trim(),
            expectedOutput: input.expectedOutput?.trim() || null,
            visibleInQuote: input.visibleInQuote ?? true,
            requiresFile: input.requiresFile ?? false,
            deductHours: input.deductHours ?? true,
            requestType: input.requestType?.trim() || null,
          },
        });
        await transaction.serviceItemLevelInclusion.createMany({
          data: input.levelInclusions.map((inclusion, index) => ({
            serviceItemRevisionId: revision.id,
            serviceLevelId: inclusion.serviceLevelId,
            included: inclusion.included,
            sortOrder: inclusion.sortOrder ?? index,
          })),
        });
        await this.createSuggestedRequestTemplateForItem(transaction, stable.id, {
          code,
          expectedOutput: input.expectedOutput?.trim() || null,
          monthlyServiceCode: parent.code,
          nameAr: input.nameAr.trim(),
          nameEn: input.nameEn.trim(),
          requestType: input.requestType?.trim() || null,
          requiresFile: input.requiresFile ?? false,
          sortOrder: input.sortOrder ?? 0,
        });
        return stable;
      });
      const after = await this.requireItemView(item.id);
      await this.audit.record(
        {
          actorId,
          eventCode: CATALOG_EVENT.itemCreated,
          entityType: "ServiceItem",
          entityId: item.id,
          after,
        },
        metadata,
      );
      return after;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw duplicateCode();
      }
      throw error;
    }
  }

  async updateServiceItem(
    id: string,
    input: UpdateServiceItemDto,
    actorId: string,
    metadata: RequestMetadata,
  ) {
    const existing = await this.requireItemWithRevision(id);
    this.assertNotArchived(existing.status);
    await this.validateInclusions(input.levelInclusions);
    const before = await this.requireItemView(id);
    await this.createNextItemRevision(existing, input, input.levelInclusions);
    const after = await this.requireItemView(id);
    await this.audit.record(
      {
        actorId,
        eventCode: CATALOG_EVENT.itemUpdated,
        entityType: "ServiceItem",
        entityId: id,
        before,
        after,
      },
      metadata,
    );
    if (
      JSON.stringify(before.revision.levelInclusions) !==
      JSON.stringify(after.revision.levelInclusions)
    ) {
      await this.audit.record(
        {
          actorId,
          eventCode: CATALOG_EVENT.itemLevelsChanged,
          entityType: "ServiceItem",
          entityId: id,
          before: { levelInclusions: before.revision.levelInclusions },
          after: { levelInclusions: after.revision.levelInclusions },
        },
        metadata,
      );
    }
    return after;
  }

  async replaceServiceItemInclusions(
    id: string,
    inclusions: ServiceItemInclusionDto[],
    actorId: string,
    metadata: RequestMetadata,
  ) {
    const existing = await this.requireItemWithRevision(id);
    if (existing.status === "DISABLED" || existing.status === "ARCHIVED") {
      throw new ConflictException({
        code: "SERVICE_ITEM_NOT_CONFIGURABLE",
        message: "Enable the item before changing its package inclusion matrix",
      });
    }
    await this.validateInclusions(inclusions);
    const current = existing.revisions[0]!;
    const before = await this.requireItemView(id);
    await this.createNextItemRevision(
      existing,
      {
        nameAr: current.nameAr,
        nameEn: current.nameEn,
        ...(current.expectedOutput ? { expectedOutput: current.expectedOutput } : {}),
        visibleInQuote: current.visibleInQuote,
        requiresFile: current.requiresFile,
        deductHours: current.deductHours,
        ...(current.requestType ? { requestType: current.requestType } : {}),
        levelInclusions: inclusions,
      },
      inclusions,
    );
    const after = await this.requireItemView(id);
    await this.audit.record(
      {
        actorId,
        eventCode: CATALOG_EVENT.itemLevelsChanged,
        entityType: "ServiceItem",
        entityId: id,
        before: { levelInclusions: before.revision.levelInclusions },
        after: { levelInclusions: after.revision.levelInclusions },
      },
      metadata,
    );
    return after;
  }

  async changeServiceItemStatus(
    id: string,
    status: CatalogLifecycleStatus,
    reason: string | undefined,
    actorId: string,
    metadata: RequestMetadata,
  ) {
    const existing = await this.requireItemWithRevision(id);
    const target = toDatabaseStatus(status);
    assertTransition(existing.status, target);
    requireReason(target, reason);
    if (target === "ACTIVE" && existing.monthlyService.status !== "ACTIVE") {
      throw new ConflictException({
        code: "SERVICE_ITEM_PARENT_NOT_ACTIVE",
        message: "Enable the parent monthly service before enabling this item",
      });
    }

    const now = new Date();
    await this.database.prisma.$transaction(async (transaction) => {
      if (target === "ACTIVE") {
        const activeRevision = existing.revisions.find(
          (revision) => revision.status === "ACTIVE" && !revision.effectiveTo,
        );
        if (!activeRevision) {
          const draft = existing.revisions.find(
            (revision) => revision.status === "DRAFT" && !revision.effectiveTo,
          );
          if (!draft) {
            throw new ConflictException({
              code: "SERVICE_ITEM_HAS_NO_ACTIVATABLE_REVISION",
              message: "The item has no draft or active revision to enable",
            });
          }
          await transaction.serviceItemRevision.update({
            where: { id: draft.id },
            data: { status: "ACTIVE", effectiveFrom: now },
          });
        }
      }
      if (target === "ARCHIVED") {
        await transaction.serviceItemRevision.updateMany({
          where: {
            serviceItemId: id,
            status: { in: ["ACTIVE", "DRAFT"] },
            effectiveTo: null,
          },
          data: { status: "ARCHIVED", effectiveTo: now },
        });
      }
      await transaction.serviceItem.update({
        where: { id },
        data: {
          status: target,
          archivedAt: target === "ARCHIVED" ? now : null,
        },
      });
    });
    const after = await this.requireItemView(id);
    await this.audit.record(
      {
        actorId,
        eventCode: CATALOG_EVENT.itemStatusChanged,
        entityType: "ServiceItem",
        entityId: id,
        before: { status: toLifecycleStatus(existing.status) },
        after: { status },
        ...(reason ? { reason } : {}),
      },
      metadata,
    );
    return after;
  }

  async reorderServiceItem(
    id: string,
    sortOrder: number,
    actorId: string,
    metadata: RequestMetadata,
  ) {
    const existing = await this.requireItemWithRevision(id);
    this.assertNotArchived(existing.status);
    await this.database.prisma.serviceItem.update({
      where: { id },
      data: { sortOrder },
    });
    await this.recordReorder(
      actorId,
      CATALOG_EVENT.itemReordered,
      "ServiceItem",
      id,
      existing.sortOrder,
      sortOrder,
      metadata,
    );
    return this.requireItemView(id);
  }

  async createServiceLevel(
    input: CreateServiceLevelDto,
    actorId: string,
    metadata: RequestMetadata,
  ) {
    await this.assertCodeAvailable("level", input.code);
    this.validateCustomLevel(input.isCustom ?? false, input.governanceRule);
    try {
      const level = await this.database.prisma.serviceLevel.create({
        data: {
          code: input.code.trim(),
          labelAr: input.labelAr.trim(),
          labelEn: input.labelEn.trim(),
          purpose: input.purpose?.trim() || null,
          slaRule: input.slaRule?.trim() || null,
          scopeRule: input.scopeRule?.trim() || null,
          governanceRule: input.governanceRule?.trim() || null,
          isCustom: input.isCustom ?? false,
          status: input.status ?? "DRAFT",
          sortOrder: input.sortOrder ?? 0,
        },
      });
      const after = this.levelAuditView(level);
      await this.audit.record(
        {
          actorId,
          eventCode: CATALOG_EVENT.levelCreated,
          entityType: "ServiceLevel",
          entityId: level.id,
          after,
        },
        metadata,
      );
      return after;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw duplicateCode();
      }
      throw error;
    }
  }

  async updateServiceLevel(
    id: string,
    input: UpdateServiceLevelDto,
    actorId: string,
    metadata: RequestMetadata,
  ) {
    const existing = await this.requireLevel(id);
    this.assertNotArchived(existing.status);
    this.validateCustomLevel(input.isCustom ?? existing.isCustom, input.governanceRule);
    const before = this.levelAuditView(existing);
    const level = await this.database.prisma.serviceLevel.update({
      where: { id },
      data: {
        labelAr: input.labelAr.trim(),
        labelEn: input.labelEn.trim(),
        purpose: input.purpose?.trim() || null,
        slaRule: input.slaRule?.trim() || null,
        scopeRule: input.scopeRule?.trim() || null,
        governanceRule: input.governanceRule?.trim() || null,
        isCustom: input.isCustom ?? existing.isCustom,
      },
    });
    const after = this.levelAuditView(level);
    await this.audit.record(
      {
        actorId,
        eventCode: CATALOG_EVENT.levelUpdated,
        entityType: "ServiceLevel",
        entityId: id,
        before,
        after,
      },
      metadata,
    );
    return after;
  }

  async changeServiceLevelStatus(
    id: string,
    status: CatalogLifecycleStatus,
    reason: string | undefined,
    actorId: string,
    metadata: RequestMetadata,
  ) {
    const existing = await this.requireLevel(id);
    const target = toDatabaseStatus(status);
    assertTransition(existing.status, target);
    requireReason(target, reason);
    if (target !== "ACTIVE") {
      await this.assertLevelHasNoActiveDependencies(id);
    }
    const level = await this.database.prisma.serviceLevel.update({
      where: { id },
      data: {
        status: target,
        archivedAt: target === "ARCHIVED" ? new Date() : null,
      },
    });
    await this.audit.record(
      {
        actorId,
        eventCode: CATALOG_EVENT.levelStatusChanged,
        entityType: "ServiceLevel",
        entityId: id,
        before: { status: toLifecycleStatus(existing.status) },
        after: { status },
        ...(reason ? { reason } : {}),
      },
      metadata,
    );
    return this.levelAuditView(level);
  }

  async reorderServiceLevel(
    id: string,
    sortOrder: number,
    actorId: string,
    metadata: RequestMetadata,
  ) {
    const existing = await this.requireLevel(id);
    this.assertNotArchived(existing.status);
    await this.database.prisma.serviceLevel.update({
      where: { id },
      data: { sortOrder },
    });
    await this.recordReorder(
      actorId,
      CATALOG_EVENT.levelReordered,
      "ServiceLevel",
      id,
      existing.sortOrder,
      sortOrder,
      metadata,
    );
    return this.levelAuditView(
      await this.database.prisma.serviceLevel.findUniqueOrThrow({ where: { id } }),
    );
  }

  rejectDelete(): never {
    throw destructiveDeleteBlocked();
  }

  private async createNextItemRevision(
    existing: Awaited<ReturnType<CatalogService["requireItemWithRevision"]>>,
    input: UpdateServiceItemDto,
    inclusions: ServiceItemInclusionDto[],
  ): Promise<void> {
    const current = existing.revisions[0]!;
    const now = new Date();
    const nextStatus = existing.status === "DRAFT" ? "DRAFT" : "ACTIVE";
    await this.database.prisma.$transaction(async (transaction) => {
      await transaction.serviceItemRevision.updateMany({
        where: {
          serviceItemId: existing.id,
          status: { in: ["ACTIVE", "DRAFT"] },
          effectiveTo: null,
        },
        data: { status: "ARCHIVED", effectiveTo: now },
      });
      const revision = await transaction.serviceItemRevision.create({
        data: {
          serviceItemId: existing.id,
          version: current.version + 1,
          status: nextStatus,
          effectiveFrom: nextStatus === "ACTIVE" ? now : null,
          nameAr: input.nameAr.trim(),
          nameEn: input.nameEn.trim(),
          expectedOutput: input.expectedOutput?.trim() || null,
          visibleInQuote: input.visibleInQuote ?? current.visibleInQuote,
          requiresFile: input.requiresFile ?? current.requiresFile,
          deductHours: input.deductHours ?? current.deductHours,
          requestType: input.requestType?.trim() || null,
        },
      });
      await transaction.serviceItemLevelInclusion.createMany({
        data: inclusions.map((inclusion, index) => ({
          serviceItemRevisionId: revision.id,
          serviceLevelId: inclusion.serviceLevelId,
          included: inclusion.included,
          sortOrder: inclusion.sortOrder ?? index,
        })),
      });
    });
  }

  private async createSuggestedRequestTemplateForItem(
    transaction: Prisma.TransactionClient,
    serviceItemId: string,
    input: {
      code: string;
      expectedOutput: string | null;
      monthlyServiceCode: string;
      nameAr: string;
      nameEn: string;
      requestType: string | null;
      requiresFile: boolean;
      sortOrder: number;
    },
  ): Promise<void> {
    const defaultTemplate = buildDefaultServiceItemRequestTemplate(input);
    const requestTemplate = await transaction.requestTemplate.create({
      data: {
        serviceItemId,
        status: "ACTIVE",
        sortOrder: input.sortOrder,
      },
    });
    const version = await transaction.requestTemplateVersion.create({
      data: {
        requestTemplateId: requestTemplate.id,
        version: 1,
        status: "SUGGESTED",
        instructionsAr: defaultTemplate.instructionsAr,
        instructionsEn: defaultTemplate.instructionsEn,
        snapshot: json(defaultTemplate.snapshot),
      },
    });

    const sectionIds = new Map<string, string>();
    for (const section of defaultTemplate.sections) {
      const created = await transaction.requestTemplateSection.create({
        data: {
          requestTemplateVersionId: version.id,
          code: section.code,
          titleAr: section.titleAr,
          titleEn: section.titleEn,
          descriptionAr: section.descriptionAr ?? null,
          descriptionEn: section.descriptionEn ?? null,
          sortOrder: section.sortOrder,
        },
      });
      sectionIds.set(section.code, created.id);
    }

    for (const field of defaultTemplate.fields) {
      const created = await transaction.requestTemplateField.create({
        data: {
          requestTemplateVersionId: version.id,
          sectionId: sectionIds.get(field.sectionCode) ?? null,
          code: field.code,
          systemKey: field.systemKey ?? null,
          fieldType: field.fieldType,
          labelAr: field.labelAr,
          labelEn: field.labelEn,
          helpTextAr: field.helpTextAr ?? null,
          helpTextEn: field.helpTextEn ?? null,
          required: field.required,
          clientVisible: field.clientVisible,
          validation: field.validation === undefined ? Prisma.JsonNull : json(field.validation),
          source: "SMART_DEFAULT",
          sortOrder: field.sortOrder,
        },
      });
      for (const option of field.options ?? []) {
        await transaction.requestTemplateOption.create({
          data: {
            requestTemplateFieldId: created.id,
            value: option.value,
            labelAr: option.labelAr,
            labelEn: option.labelEn,
            sortOrder: option.sortOrder,
          },
        });
      }
    }

    for (const document of defaultTemplate.documentChecklist) {
      await transaction.requestTemplateDocument.create({
        data: {
          requestTemplateVersionId: version.id,
          code: document.code,
          labelAr: document.labelAr,
          labelEn: document.labelEn,
          descriptionAr: document.descriptionAr ?? null,
          descriptionEn: document.descriptionEn ?? null,
          required: document.required,
          uploadRequired: document.uploadRequired,
          acceptedFileTypes:
            document.acceptedFileTypes === undefined
              ? Prisma.JsonNull
              : json(document.acceptedFileTypes),
          sortOrder: document.sortOrder,
        },
      });
    }
  }

  private async validateLevelConfigs(
    configs: ServiceLevelConfigDto[],
    activeService: boolean,
  ): Promise<void> {
    const ids = configs.map((config) => config.serviceLevelId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException({
        code: "DUPLICATE_SERVICE_LEVEL_CONFIG",
        message: "Each service level can appear only once",
      });
    }
    const levels = await this.database.prisma.serviceLevel.findMany({
      where: { id: { in: ids } },
      select: { id: true, status: true },
    });
    if (levels.length !== ids.length) {
      throw new BadRequestException({
        code: "INVALID_SERVICE_LEVEL_CONFIG",
        message: "One or more service levels do not exist",
      });
    }
    const statusById = new Map(levels.map((level) => [level.id, level.status]));
    if (
      configs.some(
        (config) => config.isEnabled && statusById.get(config.serviceLevelId) !== "ACTIVE",
      )
    ) {
      throw new ConflictException({
        code: "INACTIVE_SERVICE_LEVEL_CONFIG",
        message: "Enabled hours can reference active service levels only",
      });
    }
    if (activeService && !configs.some((config) => config.isEnabled)) {
      throw new BadRequestException({
        code: "ACTIVE_SERVICE_REQUIRES_ENABLED_LEVEL",
        message: "An active monthly service requires at least one enabled package level",
      });
    }
  }

  private async validateInclusions(inclusions: ServiceItemInclusionDto[]): Promise<void> {
    const ids = inclusions.map((inclusion) => inclusion.serviceLevelId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException({
        code: "DUPLICATE_SERVICE_ITEM_LEVEL",
        message: "Each service level can appear only once in the item matrix",
      });
    }
    const levels = await this.database.prisma.serviceLevel.findMany({
      where: { id: { in: ids } },
      select: { id: true, status: true },
    });
    if (levels.length !== ids.length) {
      throw new BadRequestException({
        code: "INVALID_SERVICE_ITEM_LEVEL",
        message: "One or more package levels do not exist",
      });
    }
    const statusById = new Map(levels.map((level) => [level.id, level.status]));
    if (
      inclusions.some(
        (inclusion) => inclusion.included && statusById.get(inclusion.serviceLevelId) !== "ACTIVE",
      )
    ) {
      throw new ConflictException({
        code: "INACTIVE_SERVICE_ITEM_LEVEL",
        message: "Included package mappings can reference active service levels only",
      });
    }
  }

  private async assertLevelHasNoActiveDependencies(id: string): Promise<void> {
    const now = new Date();
    const [serviceConfigs, itemInclusions, subscriptions] = await Promise.all([
      this.database.prisma.monthlyServiceLevelConfig.count({
        where: {
          serviceLevelId: id,
          isEnabled: true,
          monthlyServiceRevision: {
            status: "ACTIVE",
            effectiveTo: null,
            monthlyService: { status: "ACTIVE" },
          },
        },
      }),
      this.database.prisma.serviceItemLevelInclusion.count({
        where: {
          serviceLevelId: id,
          included: true,
          serviceItemRevision: {
            status: "ACTIVE",
            effectiveTo: null,
            serviceItem: { status: "ACTIVE" },
          },
        },
      }),
      this.database.prisma.subscriptionService.count({
        where: {
          serviceLevelId: id,
          status: "ACTIVE",
          startsAt: { lte: now },
          OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        },
      }),
    ]);
    if (serviceConfigs + itemInclusions + subscriptions > 0) {
      throw new ConflictException({
        code: "SERVICE_LEVEL_HAS_ACTIVE_DEPENDENCIES",
        message: "Remove active hours, inclusions, and subscriptions before changing this level",
      });
    }
  }

  private validateCustomLevel(isCustom: boolean, governanceRule: string | undefined): void {
    if (isCustom && !governanceRule?.trim()) {
      throw new BadRequestException({
        code: "CUSTOM_LEVEL_GOVERNANCE_REQUIRED",
        message: "A custom level requires a governance rule",
      });
    }
  }

  private async assertCodeAvailable(
    type: "category" | "service" | "item" | "level",
    codeInput: string,
  ): Promise<void> {
    const code = codeInput.trim();
    const where = { code: { equals: code, mode: "insensitive" as const } };
    const existing =
      type === "category"
        ? await this.database.prisma.monthlyServiceCategory.findFirst({ where })
        : type === "service"
          ? await this.database.prisma.monthlyService.findFirst({ where })
          : type === "item"
            ? await this.database.prisma.serviceItem.findFirst({ where })
            : await this.database.prisma.serviceLevel.findFirst({ where });
    if (existing) {
      throw duplicateCode();
    }
  }

  private async requireCategory(id: string) {
    const category = await this.database.prisma.monthlyServiceCategory.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException({
        code: "MONTHLY_CATEGORY_NOT_FOUND",
        message: "The monthly service category could not be found",
      });
    }
    return category;
  }

  private async requireLevel(id: string) {
    const level = await this.database.prisma.serviceLevel.findUnique({ where: { id } });
    if (!level) {
      throw new NotFoundException({
        code: "SERVICE_LEVEL_NOT_FOUND",
        message: "The service level could not be found",
      });
    }
    return level;
  }

  private async requireServiceWithRevision(id: string) {
    const service = await this.database.prisma.monthlyService.findUnique({
      where: { id },
      include: {
        category: true,
        revisions: {
          orderBy: { version: "desc" },
          include: { levelConfigs: true },
        },
      },
    });
    if (!service || service.revisions.length === 0) {
      throw new NotFoundException({
        code: "MONTHLY_SERVICE_NOT_FOUND",
        message: "The monthly service could not be found",
      });
    }
    return service;
  }

  private async requireItemWithRevision(id: string) {
    const item = await this.database.prisma.serviceItem.findUnique({
      where: { id },
      include: {
        monthlyService: true,
        revisions: {
          orderBy: { version: "desc" },
          include: { levelInclusions: true },
        },
      },
    });
    if (!item || item.revisions.length === 0) {
      throw new NotFoundException({
        code: "SERVICE_ITEM_NOT_FOUND",
        message: "The service item could not be found",
      });
    }
    return item;
  }

  private async requireServiceView(id: string) {
    const snapshot = await this.getSnapshot();
    const service = snapshot.services.find((candidate) => candidate.id === id);
    if (!service?.revision) {
      throw new NotFoundException({
        code: "MONTHLY_SERVICE_NOT_FOUND",
        message: "The monthly service could not be found",
      });
    }
    return { ...service, revision: service.revision };
  }

  private async requireItemView(id: string) {
    const snapshot = await this.getSnapshot();
    const item = snapshot.items.find((candidate) => candidate.id === id);
    if (!item?.revision) {
      throw new NotFoundException({
        code: "SERVICE_ITEM_NOT_FOUND",
        message: "The service item could not be found",
      });
    }
    return { ...item, revision: item.revision };
  }

  private assertNotArchived(status: DatabaseStatus): void {
    if (status === "ARCHIVED") {
      throw new ConflictException({
        code: "ARCHIVED_CATALOG_RECORD_IMMUTABLE",
        message: "Archived catalog records cannot be changed",
      });
    }
  }

  private categoryAuditView(category: {
    id: string;
    code: string;
    nameAr: string;
    nameEn: string;
    description: string | null;
    status: DatabaseStatus;
    sortOrder: number;
  }) {
    return {
      id: category.id,
      code: category.code,
      nameAr: category.nameAr,
      nameEn: category.nameEn,
      description: category.description,
      status: toLifecycleStatus(category.status),
      sortOrder: category.sortOrder,
    };
  }

  private levelAuditView(level: {
    id: string;
    code: string;
    labelAr: string;
    labelEn: string | null;
    purpose: string | null;
    slaRule: string | null;
    scopeRule: string | null;
    governanceRule: string | null;
    isCustom: boolean;
    status: DatabaseStatus;
    sortOrder: number;
  }) {
    return {
      id: level.id,
      code: level.code,
      labelAr: level.labelAr,
      labelEn: level.labelEn,
      purpose: level.purpose,
      slaRule: level.slaRule,
      scopeRule: level.scopeRule,
      governanceRule: level.governanceRule,
      isCustom: level.isCustom,
      status: toLifecycleStatus(level.status),
      sortOrder: level.sortOrder,
    };
  }

  private async recordReorder(
    actorId: string,
    eventCode: string,
    entityType: string,
    entityId: string,
    before: number,
    after: number,
    metadata: RequestMetadata,
  ): Promise<void> {
    await this.audit.record(
      {
        actorId,
        eventCode,
        entityType,
        entityId,
        before: { sortOrder: before },
        after: { sortOrder: after },
      },
      metadata,
    );
  }
}
