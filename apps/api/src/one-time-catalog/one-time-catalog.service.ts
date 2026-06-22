import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@jzoom/database";
import { AuthAuditService } from "../auth/audit.service.js";
import type { RequestMetadata } from "../auth/auth.types.js";
import { DatabaseService } from "../database/database.service.js";
import type { CatalogLifecycleStatus } from "../catalog-admin/catalog.dto.js";
import { ONE_TIME_CATALOG_EVENT, ONE_TIME_SERVICE_PATHS } from "./one-time-catalog.constants.js";
import type {
  CreateOneTimeCategoryDto,
  CreateOneTimeServiceDto,
  OneTimeTemplateDto,
  UpdateOneTimeCategoryDto,
  UpdateOneTimeServiceDto,
} from "./one-time-catalog.dto.js";

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

function assertTransition(from: DatabaseStatus, to: DatabaseStatus): void {
  if (from === to || !validTransitions[from].includes(to)) {
    throw new ConflictException({
      code: "INVALID_ONE_TIME_STATUS_TRANSITION",
      message: `One-time catalog status cannot change from ${toLifecycleStatus(from)} to ${toLifecycleStatus(to)}`,
    });
  }
}

function requireReason(status: DatabaseStatus, reason: string | undefined): void {
  if ((status === "DISABLED" || status === "ARCHIVED") && !reason?.trim()) {
    throw new BadRequestException({
      code: "ONE_TIME_STATUS_REASON_REQUIRED",
      message: "A reason is required when disabling or archiving one-time catalog data",
    });
  }
}

function numberValue(value: unknown): number {
  return Number(value);
}

function uniqueValues(values: Array<string | number>, code: string, message: string): void {
  if (new Set(values).size !== values.length) {
    throw new BadRequestException({ code, message });
  }
}

function duplicateCode(): ConflictException {
  return new ConflictException({
    code: "ONE_TIME_CATALOG_CODE_ALREADY_EXISTS",
    message: "The one-time catalog code is already in use",
  });
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && Reflect.get(error, "code") === "P2002";
}

@Injectable()
export class OneTimeCatalogService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AuthAuditService) private readonly audit: AuthAuditService,
  ) {}

  async getSnapshot() {
    const [categories, services] = await Promise.all([
      this.database.prisma.oneTimeServiceCategory.findMany({
        orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
        include: { _count: { select: { services: true } } },
      }),
      this.database.prisma.oneTimeService.findMany({
        orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
        include: {
          category: true,
          revisions: {
            orderBy: { version: "desc" },
            take: 1,
            include: {
              phases: { orderBy: [{ sortOrder: "asc" }, { code: "asc" }] },
              deliverables: {
                orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
                include: {
                  phase: { select: { id: true, code: true, nameAr: true, nameEn: true } },
                  tasks: { orderBy: [{ sortOrder: "asc" }, { code: "asc" }] },
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      servicePaths: [...ONE_TIME_SERVICE_PATHS],
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
          serviceLine: service.serviceLine,
          status: toLifecycleStatus(service.status),
          sortOrder: service.sortOrder,
          archivedAt: service.archivedAt?.toISOString() ?? null,
          revision: revision
            ? {
                id: revision.id,
                version: revision.version,
                status: revision.status,
                effectiveFrom: revision.effectiveFrom?.toISOString() ?? null,
                effectiveTo: revision.effectiveTo?.toISOString() ?? null,
                nameAr: revision.nameAr,
                nameEn: revision.nameEn,
                description: revision.description,
                basePriceSar: numberValue(revision.basePriceSar),
                estimatedHours: numberValue(revision.estimatedHours),
                internalHourlyCostSar: numberValue(revision.internalHourlyCostSar),
                durationDays: revision.durationDays,
                visibleInPricing: revision.visibleInPricing,
                createsProject: revision.createsProject,
                phases: revision.phases.map((phase) => ({
                  id: phase.id,
                  code: phase.code,
                  nameAr: phase.nameAr,
                  nameEn: phase.nameEn,
                  description: phase.description,
                  sortOrder: phase.sortOrder,
                  isRequired: phase.isRequired,
                  status: toLifecycleStatus(phase.status),
                })),
                deliverables: revision.deliverables.map((deliverable) => ({
                  id: deliverable.id,
                  phaseId: deliverable.phaseId,
                  phaseCode: deliverable.phase?.code ?? null,
                  code: deliverable.code,
                  nameAr: deliverable.nameAr,
                  nameEn: deliverable.nameEn,
                  description: deliverable.description,
                  sortOrder: deliverable.sortOrder,
                  isRequired: deliverable.isRequired,
                  requiresClientApproval: deliverable.requiresClientApproval,
                  status: toLifecycleStatus(deliverable.status),
                  tasks: deliverable.tasks.map((task) => ({
                    id: task.id,
                    code: task.code,
                    nameAr: task.nameAr,
                    nameEn: task.nameEn,
                    description: task.description,
                    estimatedHours: numberValue(task.estimatedHours),
                    sortOrder: task.sortOrder,
                    isRequired: task.isRequired,
                    status: toLifecycleStatus(task.status),
                  })),
                })),
              }
            : null,
        };
      }),
    };
  }

  async createCategory(
    input: CreateOneTimeCategoryDto,
    actorId: string,
    metadata: RequestMetadata,
  ) {
    const code = input.code.trim().toUpperCase();
    await this.assertCodeAvailable("category", code);
    try {
      const category = await this.database.prisma.$transaction(async (transaction) => {
        const sortOrder = input.sortOrder ?? 0;
        await transaction.oneTimeServiceCategory.updateMany({
          where: { sortOrder: { gte: sortOrder } },
          data: { sortOrder: { increment: 1 } },
        });
        return transaction.oneTimeServiceCategory.create({
          data: {
            code,
            nameAr: input.nameAr.trim(),
            nameEn: input.nameEn.trim(),
            description: input.description?.trim() || null,
            status: input.status ?? "DRAFT",
            sortOrder,
          },
        });
      });
      const after = this.categoryAuditView(category);
      await this.audit.record(
        {
          actorId,
          eventCode: ONE_TIME_CATALOG_EVENT.categoryCreated,
          entityType: "OneTimeServiceCategory",
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
    input: UpdateOneTimeCategoryDto,
    actorId: string,
    metadata: RequestMetadata,
  ) {
    const existing = await this.requireCategory(id);
    this.assertNotArchived(existing.status);
    const before = this.categoryAuditView(existing);
    const category = await this.database.prisma.oneTimeServiceCategory.update({
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
        eventCode: ONE_TIME_CATALOG_EVENT.categoryUpdated,
        entityType: "OneTimeServiceCategory",
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
      const activeServices = await this.database.prisma.oneTimeService.count({
        where: { categoryId: id, status: "ACTIVE" },
      });
      if (activeServices > 0) {
        throw new ConflictException({
          code: "ONE_TIME_CATEGORY_HAS_ACTIVE_SERVICES",
          message: "Disable or archive active one-time services before changing this category",
        });
      }
    }
    const category = await this.database.prisma.oneTimeServiceCategory.update({
      where: { id },
      data: {
        status: target,
        archivedAt: target === "ARCHIVED" ? new Date() : null,
      },
    });
    const after = this.categoryAuditView(category);
    await this.audit.record(
      {
        actorId,
        eventCode: ONE_TIME_CATALOG_EVENT.categoryStatusChanged,
        entityType: "OneTimeServiceCategory",
        entityId: id,
        before: { status: toLifecycleStatus(existing.status) },
        after: { status },
        ...(reason ? { reason } : {}),
      },
      metadata,
    );
    return after;
  }

  async reorderCategory(id: string, sortOrder: number, actorId: string, metadata: RequestMetadata) {
    const existing = await this.requireCategory(id);
    this.assertNotArchived(existing.status);
    await this.reorderCategories(existing.id, existing.sortOrder, sortOrder);
    await this.recordReorder(
      actorId,
      ONE_TIME_CATALOG_EVENT.categoryReordered,
      "OneTimeServiceCategory",
      id,
      existing.sortOrder,
      sortOrder,
      metadata,
    );
    return this.categoryAuditView(await this.requireCategory(id));
  }

  async createService(input: CreateOneTimeServiceDto, actorId: string, metadata: RequestMetadata) {
    const code = input.code.trim().toUpperCase();
    await this.assertCodeAvailable("service", code);
    const category = await this.requireCategory(input.categoryId);
    const stableStatus: DatabaseStatus = input.status ?? "DRAFT";
    this.assertCategoryAvailable(category.status, stableStatus === "ACTIVE");
    this.validateTemplate(input, stableStatus === "ACTIVE");

    try {
      const service = await this.database.prisma.$transaction(async (transaction) => {
        const sortOrder = input.sortOrder ?? 0;
        await transaction.oneTimeService.updateMany({
          where: {
            categoryId: category.id,
            sortOrder: { gte: sortOrder },
          },
          data: { sortOrder: { increment: 1 } },
        });
        const stable = await transaction.oneTimeService.create({
          data: {
            categoryId: category.id,
            code,
            serviceLine: input.serviceLine,
            status: stableStatus,
            sortOrder,
          },
        });
        const revision = await transaction.oneTimeServiceRevision.create({
          data: {
            oneTimeServiceId: stable.id,
            version: 1,
            status: stableStatus === "ACTIVE" ? "ACTIVE" : "DRAFT",
            effectiveFrom: stableStatus === "ACTIVE" ? new Date() : null,
            nameAr: input.nameAr.trim(),
            nameEn: input.nameEn.trim(),
            paymentType: "One-Time",
            basePriceSar: input.basePriceSar,
            estimatedHours: input.estimatedHours,
            internalHourlyCostSar: input.internalHourlyCostSar,
            durationDays: input.durationDays,
            visibleInPricing: input.visibleInPricing ?? true,
            createsProject: input.createsProject ?? true,
            description: input.description.trim(),
          },
        });
        await this.createTemplate(transaction, revision.id, input);
        return stable;
      });
      const after = await this.requireServiceView(service.id);
      await this.audit.record(
        {
          actorId,
          eventCode: ONE_TIME_CATALOG_EVENT.serviceCreated,
          entityType: "OneTimeService",
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

  async updateService(
    id: string,
    input: UpdateOneTimeServiceDto,
    actorId: string,
    metadata: RequestMetadata,
  ) {
    const existing = await this.requireServiceWithRevision(id);
    this.assertNotArchived(existing.status);
    const category = await this.requireCategory(input.categoryId);
    this.assertCategoryAvailable(category.status, existing.status === "ACTIVE");
    this.validateTemplate(input, existing.status === "ACTIVE");
    const before = await this.requireServiceView(id);
    const current = existing.revisions[0]!;
    const now = new Date();
    const nextRevisionStatus = existing.status === "DRAFT" ? "DRAFT" : "ACTIVE";
    const categoryChanged = existing.categoryId !== category.id;
    const targetOrder = categoryChanged
      ? ((
          await this.database.prisma.oneTimeService.aggregate({
            where: { categoryId: category.id },
            _max: { sortOrder: true },
          })
        )._max.sortOrder ?? -1) + 1
      : existing.sortOrder;

    await this.database.prisma.$transaction(async (transaction) => {
      await transaction.oneTimeServiceRevision.updateMany({
        where: {
          oneTimeServiceId: id,
          status: { in: ["ACTIVE", "DRAFT"] },
          effectiveTo: null,
        },
        data: { status: "ARCHIVED", effectiveTo: now },
      });
      const revision = await transaction.oneTimeServiceRevision.create({
        data: {
          oneTimeServiceId: id,
          version: current.version + 1,
          status: nextRevisionStatus,
          effectiveFrom: nextRevisionStatus === "ACTIVE" ? now : null,
          nameAr: input.nameAr.trim(),
          nameEn: input.nameEn.trim(),
          paymentType: current.paymentType,
          basePriceSar: input.basePriceSar,
          estimatedHours: input.estimatedHours,
          internalHourlyCostSar: input.internalHourlyCostSar,
          durationDays: input.durationDays,
          visibleInPricing: input.visibleInPricing ?? current.visibleInPricing,
          createsProject: input.createsProject ?? current.createsProject,
          description: input.description.trim(),
        },
      });
      await this.createTemplate(transaction, revision.id, input);
      if (categoryChanged) {
        await transaction.oneTimeService.updateMany({
          where: {
            categoryId: existing.categoryId,
            sortOrder: { gt: existing.sortOrder },
          },
          data: { sortOrder: { decrement: 1 } },
        });
      }
      await transaction.oneTimeService.update({
        where: { id },
        data: {
          categoryId: category.id,
          serviceLine: input.serviceLine,
          sortOrder: targetOrder,
        },
      });
    });

    const after = await this.requireServiceView(id);
    await this.recordServiceChanges(id, before, after, actorId, metadata);
    return after;
  }

  async updateTemplate(
    id: string,
    input: OneTimeTemplateDto,
    actorId: string,
    metadata: RequestMetadata,
  ) {
    const existing = await this.requireServiceView(id);
    const revision = existing.revision;
    if (
      !ONE_TIME_SERVICE_PATHS.includes(
        existing.serviceLine as (typeof ONE_TIME_SERVICE_PATHS)[number],
      )
    ) {
      throw new ConflictException({
        code: "INVALID_ONE_TIME_SERVICE_PATH",
        message: "The current service path must be corrected before editing its template",
      });
    }
    return this.updateService(
      id,
      {
        categoryId: existing.categoryId,
        serviceLine: existing.serviceLine as (typeof ONE_TIME_SERVICE_PATHS)[number],
        nameAr: revision.nameAr,
        nameEn: revision.nameEn,
        description: revision.description,
        basePriceSar: revision.basePriceSar,
        estimatedHours: revision.estimatedHours,
        internalHourlyCostSar: revision.internalHourlyCostSar,
        durationDays: revision.durationDays,
        visibleInPricing: revision.visibleInPricing,
        createsProject: revision.createsProject,
        phases: input.phases,
        deliverables: input.deliverables,
      },
      actorId,
      metadata,
    );
  }

  async changeServiceStatus(
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
    if (target === "ACTIVE") {
      this.assertCategoryAvailable(existing.category.status, true);
      const current = existing.revisions[0]!;
      this.validateStoredTemplate(current.phases, current.deliverables);
    }

    const now = new Date();
    await this.database.prisma.$transaction(async (transaction) => {
      if (target === "ACTIVE") {
        const active = existing.revisions.find(
          (revision) => revision.status === "ACTIVE" && !revision.effectiveTo,
        );
        if (!active) {
          const draft = existing.revisions.find(
            (revision) => revision.status === "DRAFT" && !revision.effectiveTo,
          );
          if (!draft) {
            throw new ConflictException({
              code: "ONE_TIME_SERVICE_HAS_NO_ACTIVATABLE_REVISION",
              message: "The service has no draft or active revision to enable",
            });
          }
          await transaction.oneTimeServiceRevision.update({
            where: { id: draft.id },
            data: { status: "ACTIVE", effectiveFrom: now },
          });
        }
      }
      if (target === "ARCHIVED") {
        await transaction.oneTimeServiceRevision.updateMany({
          where: {
            oneTimeServiceId: id,
            status: { in: ["ACTIVE", "DRAFT"] },
            effectiveTo: null,
          },
          data: { status: "ARCHIVED", effectiveTo: now },
        });
      }
      await transaction.oneTimeService.update({
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
        eventCode: ONE_TIME_CATALOG_EVENT.serviceStatusChanged,
        entityType: "OneTimeService",
        entityId: id,
        before: { status: toLifecycleStatus(existing.status) },
        after: { status },
        ...(reason ? { reason } : {}),
      },
      metadata,
    );
    return after;
  }

  async reorderService(id: string, sortOrder: number, actorId: string, metadata: RequestMetadata) {
    const existing = await this.requireServiceWithRevision(id);
    this.assertNotArchived(existing.status);
    await this.reorderServices(existing.id, existing.categoryId, existing.sortOrder, sortOrder);
    await this.recordReorder(
      actorId,
      ONE_TIME_CATALOG_EVENT.serviceReordered,
      "OneTimeService",
      id,
      existing.sortOrder,
      sortOrder,
      metadata,
    );
    return this.requireServiceView(id);
  }

  rejectDelete(): never {
    throw new ConflictException({
      code: "DESTRUCTIVE_ONE_TIME_DELETE_NOT_ALLOWED",
      message: "One-time catalog records must be archived instead of deleted",
    });
  }

  private validateTemplate(input: OneTimeTemplateDto, activeService: boolean): void {
    const phaseCodes = input.phases.map((phase) => phase.code.trim().toUpperCase());
    const deliverableCodes = input.deliverables.map((deliverable) =>
      deliverable.code.trim().toUpperCase(),
    );
    uniqueValues(
      phaseCodes,
      "DUPLICATE_ONE_TIME_PHASE_CODE",
      "Phase codes must be unique within a service revision",
    );
    uniqueValues(
      deliverableCodes,
      "DUPLICATE_ONE_TIME_DELIVERABLE_CODE",
      "Deliverable codes must be unique within a service revision",
    );
    uniqueValues(
      input.phases.map((phase, index) => phase.sortOrder ?? index),
      "DUPLICATE_ONE_TIME_PHASE_ORDER",
      "Phase display order must be unique",
    );
    uniqueValues(
      input.deliverables.map((deliverable, index) => deliverable.sortOrder ?? index),
      "DUPLICATE_ONE_TIME_DELIVERABLE_ORDER",
      "Deliverable display order must be unique",
    );
    uniqueValues(
      input.deliverables.flatMap((deliverable) =>
        deliverable.tasks.map((task) => task.code.trim().toUpperCase()),
      ),
      "DUPLICATE_ONE_TIME_TASK_CODE",
      "Task codes must be unique within a service revision",
    );
    const phaseSet = new Set(phaseCodes);
    for (const deliverable of input.deliverables) {
      if (deliverable.phaseCode && !phaseSet.has(deliverable.phaseCode.trim().toUpperCase())) {
        throw new BadRequestException({
          code: "ONE_TIME_DELIVERABLE_PHASE_NOT_FOUND",
          message: `Deliverable ${deliverable.code} references an unknown phase`,
        });
      }
      uniqueValues(
        deliverable.tasks.map((task, index) => task.sortOrder ?? index),
        "DUPLICATE_ONE_TIME_TASK_ORDER",
        `Task display order must be unique within deliverable ${deliverable.code}`,
      );
    }
    if (
      activeService &&
      !input.phases.some(
        (phase) => (phase.status ?? "ACTIVE") === "ACTIVE" && phase.isRequired !== false,
      )
    ) {
      throw new BadRequestException({
        code: "ACTIVE_ONE_TIME_SERVICE_REQUIRES_PHASE",
        message: "An active one-time service requires at least one active required phase",
      });
    }
    if (
      activeService &&
      !input.deliverables.some(
        (deliverable) =>
          (deliverable.status ?? "ACTIVE") === "ACTIVE" && deliverable.isRequired !== false,
      )
    ) {
      throw new BadRequestException({
        code: "ACTIVE_ONE_TIME_SERVICE_REQUIRES_DELIVERABLE",
        message: "An active one-time service requires at least one active required deliverable",
      });
    }
  }

  private validateStoredTemplate(
    phases: Array<{
      code: string;
      status: DatabaseStatus;
      isRequired: boolean;
    }>,
    deliverables: Array<{ status: DatabaseStatus; isRequired: boolean }>,
  ): void {
    if (
      !phases.some((item) => item.status === "ACTIVE" && item.isRequired) ||
      !deliverables.some((item) => item.status === "ACTIVE" && item.isRequired)
    ) {
      throw new ConflictException({
        code: "ONE_TIME_TEMPLATE_NOT_ACTIVATABLE",
        message: "Add a phase and an active required deliverable before enabling this service",
      });
    }
  }

  private async createTemplate(
    transaction: Prisma.TransactionClient,
    revisionId: string,
    input: OneTimeTemplateDto,
  ): Promise<void> {
    const phaseIds = new Map<string, string>();
    for (const [index, phase] of input.phases.entries()) {
      const record = await transaction.oneTimeServicePhase.create({
        data: {
          oneTimeServiceRevisionId: revisionId,
          code: phase.code.trim().toUpperCase(),
          nameAr: phase.nameAr.trim(),
          nameEn: phase.nameEn.trim(),
          description: phase.description?.trim() || null,
          sortOrder: phase.sortOrder ?? index,
          isRequired: phase.isRequired ?? true,
          status: toDatabaseStatus(phase.status ?? "ACTIVE"),
        },
      });
      phaseIds.set(record.code, record.id);
    }

    for (const [deliverableIndex, deliverable] of input.deliverables.entries()) {
      const phaseCode = deliverable.phaseCode?.trim().toUpperCase();
      const record = await transaction.oneTimeServiceDeliverable.create({
        data: {
          oneTimeServiceRevisionId: revisionId,
          ...(phaseCode ? { phaseId: phaseIds.get(phaseCode)! } : {}),
          code: deliverable.code.trim().toUpperCase(),
          nameAr: deliverable.nameAr.trim(),
          nameEn: deliverable.nameEn.trim(),
          description: deliverable.description?.trim() || null,
          sortOrder: deliverable.sortOrder ?? deliverableIndex,
          isRequired: deliverable.isRequired ?? true,
          requiresClientApproval: deliverable.requiresClientApproval ?? true,
          status: toDatabaseStatus(deliverable.status ?? "ACTIVE"),
        },
      });
      if (deliverable.tasks.length > 0) {
        await transaction.oneTimeServiceTask.createMany({
          data: deliverable.tasks.map((task, taskIndex) => ({
            deliverableId: record.id,
            code: task.code.trim().toUpperCase(),
            nameAr: task.nameAr.trim(),
            nameEn: task.nameEn.trim(),
            description: task.description?.trim() || null,
            estimatedHours: task.estimatedHours,
            sortOrder: task.sortOrder ?? taskIndex,
            isRequired: task.isRequired ?? true,
            status: toDatabaseStatus(task.status ?? "ACTIVE"),
          })),
        });
      }
    }
  }

  private async recordServiceChanges(
    id: string,
    before: Awaited<ReturnType<OneTimeCatalogService["requireServiceView"]>>,
    after: Awaited<ReturnType<OneTimeCatalogService["requireServiceView"]>>,
    actorId: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    await this.audit.record(
      {
        actorId,
        eventCode: ONE_TIME_CATALOG_EVENT.serviceUpdated,
        entityType: "OneTimeService",
        entityId: id,
        before,
        after,
      },
      metadata,
    );
    const focusedEvents = [
      {
        changed:
          before.revision.basePriceSar !== after.revision.basePriceSar ||
          before.revision.estimatedHours !== after.revision.estimatedHours ||
          before.revision.internalHourlyCostSar !== after.revision.internalHourlyCostSar,
        eventCode: ONE_TIME_CATALOG_EVENT.pricingChanged,
        before: {
          basePriceSar: before.revision.basePriceSar,
          estimatedHours: before.revision.estimatedHours,
          internalHourlyCostSar: before.revision.internalHourlyCostSar,
        },
        after: {
          basePriceSar: after.revision.basePriceSar,
          estimatedHours: after.revision.estimatedHours,
          internalHourlyCostSar: after.revision.internalHourlyCostSar,
        },
      },
      {
        changed: before.revision.durationDays !== after.revision.durationDays,
        eventCode: ONE_TIME_CATALOG_EVENT.durationChanged,
        before: { durationDays: before.revision.durationDays },
        after: { durationDays: after.revision.durationDays },
      },
      {
        changed: JSON.stringify(before.revision.phases) !== JSON.stringify(after.revision.phases),
        eventCode: ONE_TIME_CATALOG_EVENT.phasesChanged,
        before: { phases: before.revision.phases },
        after: { phases: after.revision.phases },
      },
      {
        changed:
          JSON.stringify(before.revision.deliverables, (key, value) =>
            key === "tasks" ? undefined : value,
          ) !==
          JSON.stringify(after.revision.deliverables, (key, value) =>
            key === "tasks" ? undefined : value,
          ),
        eventCode: ONE_TIME_CATALOG_EVENT.deliverablesChanged,
        before: { deliverables: before.revision.deliverables },
        after: { deliverables: after.revision.deliverables },
      },
      {
        changed:
          JSON.stringify(before.revision.deliverables.map((item) => item.tasks)) !==
          JSON.stringify(after.revision.deliverables.map((item) => item.tasks)),
        eventCode: ONE_TIME_CATALOG_EVENT.tasksChanged,
        before: { tasks: before.revision.deliverables.map((item) => item.tasks) },
        after: { tasks: after.revision.deliverables.map((item) => item.tasks) },
      },
    ];
    for (const event of focusedEvents) {
      if (event.changed) {
        await this.audit.record(
          {
            actorId,
            eventCode: event.eventCode,
            entityType: "OneTimeService",
            entityId: id,
            before: event.before,
            after: event.after,
          },
          metadata,
        );
      }
    }
  }

  private async assertCodeAvailable(type: "category" | "service", codeInput: string) {
    const where = { code: { equals: codeInput.trim(), mode: "insensitive" as const } };
    const existing =
      type === "category"
        ? await this.database.prisma.oneTimeServiceCategory.findFirst({ where })
        : await this.database.prisma.oneTimeService.findFirst({ where });
    if (existing) {
      throw duplicateCode();
    }
  }

  private async requireCategory(id: string) {
    const category = await this.database.prisma.oneTimeServiceCategory.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException({
        code: "ONE_TIME_CATEGORY_NOT_FOUND",
        message: "The one-time service category could not be found",
      });
    }
    return category;
  }

  private async requireServiceWithRevision(id: string) {
    const service = await this.database.prisma.oneTimeService.findUnique({
      where: { id },
      include: {
        category: true,
        revisions: {
          orderBy: { version: "desc" },
          include: {
            phases: true,
            deliverables: { include: { tasks: true } },
          },
        },
      },
    });
    if (!service || service.revisions.length === 0) {
      throw new NotFoundException({
        code: "ONE_TIME_SERVICE_NOT_FOUND",
        message: "The one-time service could not be found",
      });
    }
    return service;
  }

  private async requireServiceView(id: string) {
    const snapshot = await this.getSnapshot();
    const service = snapshot.services.find((candidate) => candidate.id === id);
    if (!service?.revision) {
      throw new NotFoundException({
        code: "ONE_TIME_SERVICE_NOT_FOUND",
        message: "The one-time service could not be found",
      });
    }
    return { ...service, revision: service.revision };
  }

  private assertNotArchived(status: DatabaseStatus): void {
    if (status === "ARCHIVED") {
      throw new ConflictException({
        code: "ARCHIVED_ONE_TIME_RECORD_IMMUTABLE",
        message: "Archived one-time catalog records cannot be changed",
      });
    }
  }

  private assertCategoryAvailable(status: DatabaseStatus, activeService: boolean): void {
    if (status === "ARCHIVED" || status === "DISABLED" || (activeService && status !== "ACTIVE")) {
      throw new ConflictException({
        code: "ONE_TIME_CATEGORY_NOT_AVAILABLE",
        message: "The selected category must be active for an active one-time service",
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

  private async reorderCategories(id: string, current: number, target: number): Promise<void> {
    if (current === target) {
      return;
    }
    await this.database.prisma.$transaction([
      this.database.prisma.oneTimeServiceCategory.updateMany({
        where:
          current < target
            ? { id: { not: id }, sortOrder: { gt: current, lte: target } }
            : { id: { not: id }, sortOrder: { gte: target, lt: current } },
        data: { sortOrder: { increment: current < target ? -1 : 1 } },
      }),
      this.database.prisma.oneTimeServiceCategory.update({
        where: { id },
        data: { sortOrder: target },
      }),
    ]);
  }

  private async reorderServices(
    id: string,
    categoryId: string,
    current: number,
    target: number,
  ): Promise<void> {
    if (current === target) {
      return;
    }
    await this.database.prisma.$transaction([
      this.database.prisma.oneTimeService.updateMany({
        where:
          current < target
            ? {
                id: { not: id },
                categoryId,
                sortOrder: { gt: current, lte: target },
              }
            : {
                id: { not: id },
                categoryId,
                sortOrder: { gte: target, lt: current },
              },
        data: { sortOrder: { increment: current < target ? -1 : 1 } },
      }),
      this.database.prisma.oneTimeService.update({
        where: { id },
        data: { sortOrder: target },
      }),
    ]);
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
