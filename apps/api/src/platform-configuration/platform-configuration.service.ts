import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@jzoom/database";
import { AuthAuditService } from "../auth/audit.service.js";
import type { RequestMetadata } from "../auth/auth.types.js";
import { DatabaseService } from "../database/database.service.js";
import {
  PLATFORM_CONFIGURATION_EVENT,
  SETTING_VALUE_TYPES,
} from "./platform-configuration.constants.js";
import type {
  CreatePlatformSettingDto,
  PublishTranslationsDto,
  ReviseNotificationTemplateDto,
  RevisePdfTemplateDto,
  RevisePlatformSettingDto,
  ReviseWorkflowTemplateDto,
} from "./platform-configuration.dto.js";

type SettingValueType = (typeof SETTING_VALUE_TYPES)[number];

const pdfInclude = {
  versions: {
    orderBy: { version: "desc" as const },
    include: { fieldMappings: { orderBy: { sortOrder: "asc" as const } } },
  },
} satisfies Prisma.PdfTemplateInclude;

const notificationInclude = {
  versions: { orderBy: { version: "desc" as const } },
} satisfies Prisma.NotificationTemplateInclude;

const settingInclude = {
  revisions: { orderBy: { version: "desc" as const } },
} satisfies Prisma.PlatformSettingInclude;

const workflowInclude = {
  versions: {
    orderBy: { version: "desc" as const },
    include: {
      states: { orderBy: { sortOrder: "asc" as const } },
      transitions: { orderBy: { sortOrder: "asc" as const } },
    },
  },
} satisfies Prisma.WorkflowDefinitionInclude;

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function nullableJson(value: unknown): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue {
  return value === null || value === undefined ? Prisma.JsonNull : json(value);
}

function currentRevision<T extends { status: string; version: number }>(revisions: T[]): T | null {
  return revisions.find((revision) => revision.status === "ACTIVE") ?? revisions[0] ?? null;
}

function nextVersion(revisions: Array<{ version: number }>): number {
  return Math.max(0, ...revisions.map((revision) => revision.version)) + 1;
}

function cleanText(value: string | undefined | null): string | null {
  const text = value?.trim();
  return text ? text : null;
}

@Injectable()
export class PlatformConfigurationService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AuthAuditService) private readonly audit: AuthAuditService,
  ) {}

  async snapshot(actorId: string, metadata: RequestMetadata) {
    const [settings, notificationTemplates, pdfTemplates, workflows, translations] =
      await Promise.all([
        this.database.prisma.platformSetting.findMany({
          include: settingInclude,
          orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { key: "asc" }],
        }),
        this.database.prisma.notificationTemplate.findMany({
          include: notificationInclude,
          orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
        }),
        this.database.prisma.pdfTemplate.findMany({
          include: pdfInclude,
          orderBy: [{ documentType: "asc" }, { sortOrder: "asc" }, { code: "asc" }],
        }),
        this.database.prisma.workflowDefinition.findMany({
          include: workflowInclude,
          orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { code: "asc" }],
        }),
        this.database.prisma.translationRevision.findMany({
          orderBy: { version: "desc" },
          take: 5,
          include: {
            values: {
              include: { translationKey: true },
              orderBy: [{ translationKey: { namespace: "asc" } }, { locale: "asc" }],
            },
          },
        }),
      ]);

    await this.audit.record(
      {
        actorId,
        eventCode: PLATFORM_CONFIGURATION_EVENT.snapshotViewed,
        entityType: "PlatformConfiguration",
        entityId: "snapshot",
        severity: "LOW",
        after: {
          settings: settings.length,
          notificationTemplates: notificationTemplates.length,
          pdfTemplates: pdfTemplates.length,
          workflows: workflows.length,
          translationRevisions: translations.length,
        },
      },
      metadata,
    );

    return {
      settingValueTypes: [...SETTING_VALUE_TYPES],
      revisionStatuses: ["DRAFT", "ACTIVE", "ARCHIVED"],
      translationStatuses: ["DRAFT", "PUBLISHED", "ARCHIVED"],
      settings: settings.map((setting) => this.settingView(setting)),
      notificationTemplates: notificationTemplates.map((template) =>
        this.notificationTemplateView(template),
      ),
      pdfTemplates: pdfTemplates.map((template) => this.pdfTemplateView(template)),
      workflows: workflows.map((workflow) => this.workflowView(workflow)),
      localization: {
        revisions: translations.map((revision) => ({
          id: revision.id,
          version: revision.version,
          status: revision.status,
          publishedAt: revision.publishedAt?.toISOString() ?? null,
          createdAt: revision.createdAt.toISOString(),
          values: revision.values.map((value) => ({
            key: value.translationKey.key,
            namespace: value.translationKey.namespace,
            description: value.translationKey.description,
            locale: value.locale,
            value: value.value,
          })),
        })),
      },
    };
  }

  async createSetting(input: CreatePlatformSettingDto, actorId: string, metadata: RequestMetadata) {
    const key = this.normalizeKey(input.key);
    const category = this.normalizeKey(input.category);
    const value = this.valueForType(input.valueType, input.value);
    const created = await this.database.prisma.platformSetting.create({
      data: {
        key,
        category,
        valueType: input.valueType,
        isSensitive: input.isSensitive ?? false,
        sortOrder: input.sortOrder ?? 0,
        revisions: {
          create: {
            version: 1,
            status: "ACTIVE",
            value: json(value),
            reason: cleanText(input.reason),
            effectiveFrom: new Date(),
          },
        },
      },
      include: settingInclude,
    });
    await this.audit.record(
      {
        actorId,
        eventCode: PLATFORM_CONFIGURATION_EVENT.settingCreated,
        entityType: "PlatformSetting",
        entityId: created.id,
        after: this.settingAuditSnapshot(created),
      },
      metadata,
    );
    return this.snapshot(actorId, metadata);
  }

  async reviseSetting(
    key: string,
    input: RevisePlatformSettingDto,
    actorId: string,
    metadata: RequestMetadata,
  ) {
    const setting = await this.database.prisma.platformSetting.findUnique({
      where: { key },
      include: settingInclude,
    });
    if (!setting) {
      throw new NotFoundException({
        code: "PLATFORM_SETTING_NOT_FOUND",
        message: "The platform setting could not be found",
      });
    }
    const before = this.settingAuditSnapshot(setting);
    const revisionStatus = input.revisionStatus ?? "ACTIVE";
    const value = this.valueForType(setting.valueType, input.value);
    const created = await this.database.prisma.$transaction(async (tx) => {
      if (revisionStatus === "ACTIVE") {
        await tx.platformSettingRevision.updateMany({
          where: { platformSettingId: setting.id, status: "ACTIVE" },
          data: { status: "ARCHIVED", effectiveTo: new Date() },
        });
      }
      return tx.platformSettingRevision.create({
        data: {
          platformSettingId: setting.id,
          version: nextVersion(setting.revisions),
          status: revisionStatus,
          value: json(value),
          reason: cleanText(input.reason),
          effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : new Date(),
        },
      });
    });
    await this.audit.record(
      {
        actorId,
        eventCode: PLATFORM_CONFIGURATION_EVENT.settingRevised,
        entityType: "PlatformSetting",
        entityId: setting.id,
        before,
        after: { key: setting.key, version: created.version, status: created.status },
        ...(input.reason ? { reason: input.reason } : {}),
      },
      metadata,
    );
    return this.snapshot(actorId, metadata);
  }

  async reviseNotificationTemplate(
    id: string,
    input: ReviseNotificationTemplateDto,
    actorId: string,
    metadata: RequestMetadata,
  ) {
    const template = await this.database.prisma.notificationTemplate.findUnique({
      where: { id },
      include: notificationInclude,
    });
    if (!template) {
      throw new NotFoundException({
        code: "NOTIFICATION_TEMPLATE_NOT_FOUND",
        message: "The notification template could not be found",
      });
    }
    const current = currentRevision(template.versions);
    if (!current) {
      throw new ConflictException({
        code: "NOTIFICATION_TEMPLATE_VERSION_REQUIRED",
        message: "The notification template has no version to revise",
      });
    }
    const revisionStatus = input.revisionStatus ?? "ACTIVE";
    const before = this.notificationTemplateAuditSnapshot(template);
    const created = await this.database.prisma.$transaction(async (tx) => {
      if (revisionStatus === "ACTIVE") {
        await tx.notificationTemplateVersion.updateMany({
          where: { notificationTemplateId: template.id, status: "ACTIVE" },
          data: { status: "ARCHIVED", effectiveTo: new Date() },
        });
      }
      return tx.notificationTemplateVersion.create({
        data: {
          notificationTemplateId: template.id,
          version: nextVersion(template.versions),
          status: revisionStatus,
          recipients: json(input.recipients ?? current.recipients),
          messageAr: input.messageAr ?? current.messageAr,
          messageEn: input.messageEn ?? current.messageEn,
          description: input.description ?? current.description,
          deepLink: input.deepLink ?? current.deepLink,
          channels: json(input.channels ?? current.channels),
          cadence: input.cadence ?? current.cadence,
          reminderRule: input.reminderRule ?? current.reminderRule,
          placeholders:
            input.placeholders === undefined
              ? nullableJson(current.placeholders)
              : nullableJson(input.placeholders),
          effectiveFrom: new Date(),
        },
      });
    });
    await this.audit.record(
      {
        actorId,
        eventCode: PLATFORM_CONFIGURATION_EVENT.notificationTemplateRevised,
        entityType: "NotificationTemplate",
        entityId: template.id,
        before,
        after: { code: template.code, event: template.event, version: created.version },
      },
      metadata,
    );
    return this.snapshot(actorId, metadata);
  }

  async revisePdfTemplate(
    id: string,
    input: RevisePdfTemplateDto,
    actorId: string,
    metadata: RequestMetadata,
  ) {
    const template = await this.database.prisma.pdfTemplate.findUnique({
      where: { id },
      include: pdfInclude,
    });
    if (!template) {
      throw new NotFoundException({
        code: "PDF_TEMPLATE_NOT_FOUND",
        message: "The PDF template could not be found",
      });
    }
    const current = currentRevision(template.versions);
    if (!current) {
      throw new ConflictException({
        code: "PDF_TEMPLATE_VERSION_REQUIRED",
        message: "The PDF template has no version to revise",
      });
    }
    const revisionStatus = input.revisionStatus ?? "ACTIVE";
    const before = this.pdfTemplateAuditSnapshot(template);
    const created = await this.database.prisma.$transaction(async (tx) => {
      if (input.name?.trim()) {
        await tx.pdfTemplate.update({
          where: { id: template.id },
          data: { name: input.name.trim() },
        });
      }
      if (revisionStatus === "ACTIVE") {
        await tx.pdfTemplateVersion.updateMany({
          where: { pdfTemplateId: template.id, status: "ACTIVE" },
          data: { status: "ARCHIVED", effectiveTo: new Date() },
        });
      }
      const version = await tx.pdfTemplateVersion.create({
        data: {
          pdfTemplateId: template.id,
          version: nextVersion(template.versions),
          status: revisionStatus,
          audience: input.audience ?? current.audience,
          mustInclude: json(input.mustInclude ?? current.mustInclude),
          mustExclude: json(input.mustExclude ?? current.mustExclude),
          languageDirection: input.languageDirection ?? current.languageDirection,
          technicalRule: input.technicalRule ?? current.technicalRule,
          contentSchema:
            input.contentSchema === undefined
              ? nullableJson(current.contentSchema)
              : nullableJson(input.contentSchema),
          effectiveFrom: new Date(),
        },
      });
      if (current.fieldMappings.length > 0) {
        await tx.pdfFieldMapping.createMany({
          data: current.fieldMappings.map((mapping) => ({
            pdfTemplateVersionId: version.id,
            section: mapping.section,
            field: mapping.field,
            source: mapping.source,
            showClient: mapping.showClient,
            showInternal: mapping.showInternal,
            forbidden: mapping.forbidden,
            documentScope: mapping.documentScope,
            notes: mapping.notes,
            sortOrder: mapping.sortOrder,
          })),
        });
      }
      return version;
    });
    await this.audit.record(
      {
        actorId,
        eventCode: PLATFORM_CONFIGURATION_EVENT.pdfTemplateRevised,
        entityType: "PdfTemplate",
        entityId: template.id,
        before,
        after: {
          code: template.code,
          documentType: template.documentType,
          version: created.version,
        },
      },
      metadata,
    );
    return this.snapshot(actorId, metadata);
  }

  async publishTranslations(
    input: PublishTranslationsDto,
    actorId: string,
    metadata: RequestMetadata,
  ) {
    if (input.values.length === 0) {
      throw new BadRequestException({
        code: "TRANSLATION_VALUES_REQUIRED",
        message: "At least one translation value is required",
      });
    }
    const latest = await this.database.prisma.translationRevision.findFirst({
      orderBy: { version: "desc" },
      include: { values: { include: { translationKey: true } } },
    });
    const created = await this.database.prisma.$transaction(async (tx) => {
      const keyIds = new Map<string, string>();
      for (const value of latest?.values ?? []) {
        keyIds.set(value.translationKey.key, value.translationKeyId);
      }
      for (const value of input.values) {
        const key = await tx.translationKey.upsert({
          where: { key: value.key.trim() },
          create: {
            key: value.key.trim(),
            namespace: value.namespace.trim(),
            description: cleanText(value.description),
          },
          update: {
            namespace: value.namespace.trim(),
            description: cleanText(value.description),
            status: "ACTIVE",
          },
        });
        keyIds.set(key.key, key.id);
      }

      const valueMap = new Map<string, { key: string; locale: string; value: string }>();
      for (const value of latest?.values ?? []) {
        valueMap.set(`${value.translationKey.key}|${value.locale}`, {
          key: value.translationKey.key,
          locale: value.locale,
          value: value.value,
        });
      }
      for (const value of input.values) {
        valueMap.set(`${value.key.trim()}|${value.locale.trim()}`, {
          key: value.key.trim(),
          locale: value.locale.trim(),
          value: value.value,
        });
      }

      await tx.translationRevision.updateMany({
        where: { status: "PUBLISHED" },
        data: { status: "ARCHIVED" },
      });
      return tx.translationRevision.create({
        data: {
          version: (latest?.version ?? 0) + 1,
          status: "PUBLISHED",
          publishedAt: new Date(),
          values: {
            createMany: {
              data: [...valueMap.values()].map((value) => ({
                translationKeyId: keyIds.get(value.key)!,
                locale: value.locale,
                value: value.value,
              })),
            },
          },
        },
      });
    });
    await this.audit.record(
      {
        actorId,
        eventCode: PLATFORM_CONFIGURATION_EVENT.translationsPublished,
        entityType: "TranslationRevision",
        entityId: created.id,
        ...(latest ? { before: { version: latest.version, status: latest.status } } : {}),
        after: { version: created.version, status: created.status, values: input.values.length },
        ...(input.reason ? { reason: input.reason } : {}),
      },
      metadata,
    );
    return this.snapshot(actorId, metadata);
  }

  async reviseWorkflowTemplate(
    id: string,
    input: ReviseWorkflowTemplateDto,
    actorId: string,
    metadata: RequestMetadata,
  ) {
    const workflow = await this.database.prisma.workflowDefinition.findUnique({
      where: { id },
      include: workflowInclude,
    });
    if (!workflow) {
      throw new NotFoundException({
        code: "WORKFLOW_TEMPLATE_NOT_FOUND",
        message: "The workflow template could not be found",
      });
    }
    const current = currentRevision(workflow.versions);
    if (!current) {
      throw new ConflictException({
        code: "WORKFLOW_VERSION_REQUIRED",
        message: "The workflow has no version to revise",
      });
    }
    const revisionStatus = input.revisionStatus ?? "DRAFT";
    const before = this.workflowAuditSnapshot(workflow);
    const created = await this.database.prisma.$transaction(async (tx) => {
      if (input.name?.trim()) {
        await tx.workflowDefinition.update({
          where: { id: workflow.id },
          data: { name: input.name.trim() },
        });
      }
      if (revisionStatus === "ACTIVE") {
        await tx.workflowVersion.updateMany({
          where: { workflowDefinitionId: workflow.id, status: "ACTIVE" },
          data: { status: "ARCHIVED", effectiveTo: new Date() },
        });
      }
      const version = await tx.workflowVersion.create({
        data: {
          workflowDefinitionId: workflow.id,
          version: nextVersion(workflow.versions),
          status: revisionStatus,
          configuration: json(input.configuration),
          effectiveFrom: new Date(),
        },
      });
      const stateIdMap = new Map<string, string>();
      for (const state of current.states) {
        const createdState = await tx.workflowState.create({
          data: {
            workflowVersionId: version.id,
            code: state.code,
            labelAr: state.labelAr,
            labelEn: state.labelEn,
            stateType: state.stateType,
            isInitial: state.isInitial,
            isTerminal: state.isTerminal,
            sortOrder: state.sortOrder,
            configuration: nullableJson(state.configuration),
          },
        });
        stateIdMap.set(state.id, createdState.id);
      }
      for (const transition of current.transitions) {
        const fromStateId = stateIdMap.get(transition.fromStateId);
        const toStateId = stateIdMap.get(transition.toStateId);
        if (!fromStateId || !toStateId) {
          continue;
        }
        await tx.workflowTransition.create({
          data: {
            workflowVersionId: version.id,
            code: transition.code,
            fromStateId,
            toStateId,
            actorRoles: json(transition.actorRoles),
            condition: transition.condition,
            sideEffect: transition.sideEffect,
            validations: nullableJson(transition.validations),
            reasonRequired: transition.reasonRequired,
            notificationEvent: transition.notificationEvent,
            sortOrder: transition.sortOrder,
          },
        });
      }
      return version;
    });
    await this.audit.record(
      {
        actorId,
        eventCode: PLATFORM_CONFIGURATION_EVENT.workflowTemplateRevised,
        entityType: "WorkflowDefinition",
        entityId: workflow.id,
        before,
        after: { code: workflow.code, version: created.version, status: created.status },
      },
      metadata,
    );
    return this.snapshot(actorId, metadata);
  }

  private normalizeKey(value: string): string {
    const key = value.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9_.-]*$/.test(key)) {
      throw new BadRequestException({
        code: "INVALID_CONFIGURATION_KEY",
        message:
          "Configuration keys may contain lowercase letters, numbers, dots, dashes, and underscores",
      });
    }
    return key;
  }

  private valueForType(type: SettingValueType, value: unknown) {
    if (type === "STRING" || type === "SECRET_REFERENCE") {
      if (typeof value !== "string") {
        throw new BadRequestException({
          code: "SETTING_VALUE_TYPE_MISMATCH",
          message: "This setting requires a string value",
        });
      }
      return value;
    }
    if (type === "NUMBER") {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new BadRequestException({
          code: "SETTING_VALUE_TYPE_MISMATCH",
          message: "This setting requires a finite number value",
        });
      }
      return value;
    }
    if (type === "BOOLEAN") {
      if (typeof value !== "boolean") {
        throw new BadRequestException({
          code: "SETTING_VALUE_TYPE_MISMATCH",
          message: "This setting requires a boolean value",
        });
      }
      return value;
    }
    return value;
  }

  private settingView(
    setting: Prisma.PlatformSettingGetPayload<{ include: typeof settingInclude }>,
  ) {
    const revision = currentRevision(setting.revisions);
    return {
      id: setting.id,
      key: setting.key,
      category: setting.category,
      valueType: setting.valueType,
      isSensitive: setting.isSensitive,
      status: setting.status,
      sortOrder: setting.sortOrder,
      current: revision
        ? {
            id: revision.id,
            version: revision.version,
            status: revision.status,
            value: setting.isSensitive ? null : revision.value,
            masked: setting.isSensitive,
            reason: revision.reason,
            effectiveFrom: revision.effectiveFrom?.toISOString() ?? null,
            effectiveTo: revision.effectiveTo?.toISOString() ?? null,
          }
        : null,
      revisionCount: setting.revisions.length,
      updatedAt: setting.updatedAt.toISOString(),
    };
  }

  private notificationTemplateView(
    template: Prisma.NotificationTemplateGetPayload<{ include: typeof notificationInclude }>,
  ) {
    const revision = currentRevision(template.versions);
    return {
      id: template.id,
      code: template.code,
      event: template.event,
      status: template.status,
      sortOrder: template.sortOrder,
      current: revision ? this.notificationRevisionView(revision) : null,
      revisionCount: template.versions.length,
      updatedAt: template.updatedAt.toISOString(),
    };
  }

  private notificationRevisionView(
    revision: Prisma.NotificationTemplateVersionGetPayload<Record<string, never>>,
  ) {
    return {
      id: revision.id,
      version: revision.version,
      status: revision.status,
      recipients: revision.recipients,
      messageAr: revision.messageAr,
      messageEn: revision.messageEn,
      description: revision.description,
      deepLink: revision.deepLink,
      channels: revision.channels,
      cadence: revision.cadence,
      reminderRule: revision.reminderRule,
      placeholders: revision.placeholders,
      effectiveFrom: revision.effectiveFrom?.toISOString() ?? null,
      effectiveTo: revision.effectiveTo?.toISOString() ?? null,
    };
  }

  private pdfTemplateView(template: Prisma.PdfTemplateGetPayload<{ include: typeof pdfInclude }>) {
    const revision = currentRevision(template.versions);
    return {
      id: template.id,
      code: template.code,
      name: template.name,
      documentType: template.documentType,
      status: template.status,
      sortOrder: template.sortOrder,
      current: revision
        ? {
            id: revision.id,
            version: revision.version,
            status: revision.status,
            audience: revision.audience,
            mustInclude: revision.mustInclude,
            mustExclude: revision.mustExclude,
            languageDirection: revision.languageDirection,
            technicalRule: revision.technicalRule,
            contentSchema: revision.contentSchema,
            fieldMappings: revision.fieldMappings.map((mapping) => ({
              section: mapping.section,
              field: mapping.field,
              source: mapping.source,
              showClient: mapping.showClient,
              showInternal: mapping.showInternal,
              forbidden: mapping.forbidden,
              documentScope: mapping.documentScope,
              notes: mapping.notes,
            })),
            effectiveFrom: revision.effectiveFrom?.toISOString() ?? null,
            effectiveTo: revision.effectiveTo?.toISOString() ?? null,
          }
        : null,
      revisionCount: template.versions.length,
      updatedAt: template.updatedAt.toISOString(),
    };
  }

  private workflowView(
    workflow: Prisma.WorkflowDefinitionGetPayload<{ include: typeof workflowInclude }>,
  ) {
    const revision = currentRevision(workflow.versions);
    return {
      id: workflow.id,
      code: workflow.code,
      name: workflow.name,
      type: workflow.type,
      status: workflow.status,
      sortOrder: workflow.sortOrder,
      current: revision
        ? {
            id: revision.id,
            version: revision.version,
            status: revision.status,
            configuration: revision.configuration,
            states: revision.states.map((state) => ({
              code: state.code,
              labelAr: state.labelAr,
              labelEn: state.labelEn,
              isInitial: state.isInitial,
              isTerminal: state.isTerminal,
            })),
            transitions: revision.transitions.map((transition) => ({
              code: transition.code,
              actorRoles: transition.actorRoles,
              condition: transition.condition,
              sideEffect: transition.sideEffect,
              reasonRequired: transition.reasonRequired,
              notificationEvent: transition.notificationEvent,
            })),
            effectiveFrom: revision.effectiveFrom?.toISOString() ?? null,
            effectiveTo: revision.effectiveTo?.toISOString() ?? null,
          }
        : null,
      revisionCount: workflow.versions.length,
      updatedAt: workflow.updatedAt.toISOString(),
    };
  }

  private settingAuditSnapshot(
    setting: Prisma.PlatformSettingGetPayload<{ include: typeof settingInclude }>,
  ) {
    const revision = currentRevision(setting.revisions);
    return {
      id: setting.id,
      key: setting.key,
      category: setting.category,
      valueType: setting.valueType,
      status: setting.status,
      revision: revision ? { version: revision.version, status: revision.status } : null,
    };
  }

  private notificationTemplateAuditSnapshot(
    template: Prisma.NotificationTemplateGetPayload<{ include: typeof notificationInclude }>,
  ) {
    const revision = currentRevision(template.versions);
    return {
      id: template.id,
      code: template.code,
      event: template.event,
      revision: revision ? { version: revision.version, status: revision.status } : null,
    };
  }

  private pdfTemplateAuditSnapshot(
    template: Prisma.PdfTemplateGetPayload<{ include: typeof pdfInclude }>,
  ) {
    const revision = currentRevision(template.versions);
    return {
      id: template.id,
      code: template.code,
      documentType: template.documentType,
      revision: revision ? { version: revision.version, status: revision.status } : null,
    };
  }

  private workflowAuditSnapshot(
    workflow: Prisma.WorkflowDefinitionGetPayload<{ include: typeof workflowInclude }>,
  ) {
    const revision = currentRevision(workflow.versions);
    return {
      id: workflow.id,
      code: workflow.code,
      type: workflow.type,
      revision: revision ? { version: revision.version, status: revision.status } : null,
    };
  }
}
