import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@jzoom/database";
import { AuthAuditService } from "../auth/audit.service.js";
import type { AuthenticatedPrincipal, RequestMetadata } from "../auth/auth.types.js";
import { CLIENT_ROLE_CODE } from "../client-portal/client-portal.constants.js";
import { DatabaseService } from "../database/database.service.js";
import { REQUEST_TEMPLATE_EVENT } from "./request-templates.constants.js";
import type {
  REQUEST_FORM_COMPLETENESS_STATUSES,
  REQUEST_TEMPLATE_FIELD_TYPES,
} from "./request-templates.constants.js";
import type {
  CreateFieldLibraryItemDto,
  RequestTemplateAnswerInputDto,
  RequestTemplateVersionStatusDto,
  UpdateFieldLibraryItemDto,
  UpsertRequestTemplateVersionDto,
} from "./request-templates.dto.js";

const requestTemplateVersionInclude = {
  requestTemplate: {
    include: {
      serviceItem: {
        include: {
          monthlyService: { select: { id: true, code: true } },
          revisions: {
            orderBy: { version: "desc" as const },
            take: 1,
          },
        },
      },
    },
  },
  sections: { orderBy: [{ sortOrder: "asc" as const }, { code: "asc" as const }] },
  fields: {
    orderBy: [{ sortOrder: "asc" as const }, { code: "asc" as const }],
    include: {
      section: true,
      libraryField: true,
      options: { orderBy: [{ sortOrder: "asc" as const }, { value: "asc" as const }] },
    },
  },
  downloadableFiles: { orderBy: [{ sortOrder: "asc" as const }, { code: "asc" as const }] },
  documentChecklist: { orderBy: [{ sortOrder: "asc" as const }, { code: "asc" as const }] },
} satisfies Prisma.RequestTemplateVersionInclude;

const requestTemplateSnapshotInclude = {
  versions: {
    orderBy: { version: "desc" as const },
    include: requestTemplateVersionInclude,
  },
} satisfies Prisma.RequestTemplateInclude;

type RequestTemplateVersionRecord = Prisma.RequestTemplateVersionGetPayload<{
  include: typeof requestTemplateVersionInclude;
}>;

type RequestFieldLibraryRecord = Prisma.RequestFieldLibraryItemGetPayload<Record<string, never>>;

type RequestTemplateSubmission = {
  answersCreate: Array<{
    clientVisible: boolean;
    fieldCode: string;
    fieldType: (typeof REQUEST_TEMPLATE_FIELD_TYPES)[number];
    labelAr: string;
    labelEn: string;
    requestTemplateFieldId?: string;
    sortOrder: number;
    systemKey?: string;
    value: Prisma.InputJsonValue;
  }>;
  completenessStatus: (typeof REQUEST_FORM_COMPLETENESS_STATUSES)[number];
  fileSnapshot: Prisma.InputJsonValue;
  requestTemplateVersionId: string;
  templateSnapshot: Prisma.InputJsonValue;
};

type TemplateSectionConfig = {
  active?: boolean | undefined;
  code: string;
  descriptionAr?: string | null | undefined;
  descriptionEn?: string | null | undefined;
  sortOrder?: number | undefined;
  titleAr: string;
  titleEn: string;
};

type TemplateOptionConfig = {
  active?: boolean | undefined;
  id?: string | null | undefined;
  labelAr: string;
  labelEn: string;
  sortOrder?: number | undefined;
  status?: string | undefined;
  value: string;
};

type TemplateFieldConfig = {
  clientVisible?: boolean | undefined;
  code: string;
  defaultValue?: unknown;
  fieldType: (typeof REQUEST_TEMPLATE_FIELD_TYPES)[number];
  helpTextAr?: string | null | undefined;
  helpTextEn?: string | null | undefined;
  labelAr: string;
  labelEn: string;
  libraryFieldCode?: string | null | undefined;
  options?: TemplateOptionConfig[] | undefined;
  required?: boolean | undefined;
  sectionCode?: string | null | undefined;
  sortOrder?: number | undefined;
  systemKey?: string | null | undefined;
  validation?: unknown;
};

type TemplateFileConfig = {
  clientVisible?: boolean | undefined;
  code: string;
  descriptionAr?: string | null | undefined;
  descriptionEn?: string | null | undefined;
  fileName?: string | null | undefined;
  fileType?: string | null | undefined;
  id?: string | null | undefined;
  mimeType?: string | null | undefined;
  required?: boolean | undefined;
  returnUploadRequired?: boolean | undefined;
  revision?: number | undefined;
  sortOrder?: number | undefined;
  status?: string | undefined;
  storageKey?: string | null | undefined;
  storageProvider?: string | null | undefined;
  titleAr: string;
  titleEn: string;
};

type TemplateDocumentConfig = {
  acceptedFileTypes?: unknown;
  code: string;
  descriptionAr?: string | null | undefined;
  descriptionEn?: string | null | undefined;
  id?: string | null | undefined;
  labelAr: string;
  labelEn: string;
  required?: boolean | undefined;
  sortOrder?: number | undefined;
  status?: string | undefined;
  uploadRequired?: boolean | undefined;
};

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function nullableJson(value: unknown): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue {
  return value === null || value === undefined ? Prisma.JsonNull : json(value);
}

function cleanCode(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function cleanText(value: string | null | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}

function nextVersion(revisions: Array<{ version: number }>): number {
  return Math.max(0, ...revisions.map((revision) => revision.version)) + 1;
}

function isEmptyAnswer(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === "string") {
    return value.trim().length === 0;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  if (typeof value === "object") {
    return Object.keys(value).length === 0;
  }
  return false;
}

@Injectable()
export class RequestTemplatesService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AuthAuditService) private readonly audit: AuthAuditService,
  ) {}

  async snapshot(actorId: string, metadata: RequestMetadata) {
    const [fieldLibrary, serviceItems] = await Promise.all([
      this.database.prisma.requestFieldLibraryItem.findMany({
        orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      }),
      this.database.prisma.serviceItem.findMany({
        include: {
          monthlyService: { select: { id: true, code: true } },
          revisions: { orderBy: { version: "desc" }, take: 1 },
          requestTemplates: { include: requestTemplateSnapshotInclude },
        },
        orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      }),
    ]);

    await this.audit.record(
      {
        actorId,
        eventCode: REQUEST_TEMPLATE_EVENT.snapshotViewed,
        entityType: "RequestTemplate",
        entityId: "snapshot",
        severity: "LOW",
        after: { fieldLibrary: fieldLibrary.length, serviceItems: serviceItems.length },
      },
      metadata,
    );

    return {
      fieldLibrary: fieldLibrary.map((field) => this.fieldLibraryView(field)),
      serviceItems: serviceItems.map((item) => {
        const latestRevision = item.revisions[0] ?? null;
        const template = item.requestTemplates[0] ?? null;
        const versions = template?.versions ?? [];
        const suggested = versions.find((version) => version.status === "SUGGESTED") ?? null;
        const active = versions.find((version) => version.status === "ACTIVE") ?? null;
        return {
          id: item.id,
          code: item.code,
          status: item.status,
          sortOrder: item.sortOrder,
          monthlyService: item.monthlyService,
          latestRevision: latestRevision
            ? {
                id: latestRevision.id,
                version: latestRevision.version,
                nameAr: latestRevision.nameAr,
                nameEn: latestRevision.nameEn,
                expectedOutput: latestRevision.expectedOutput,
                requiresFile: latestRevision.requiresFile,
              }
            : null,
          template: template
            ? {
                id: template.id,
                status: template.status,
                active: active ? this.versionView(active, false) : null,
                suggested: suggested ? this.versionView(suggested, false) : null,
                drafts: versions
                  .filter((version) => version.status === "DRAFT")
                  .map((version) => this.versionView(version, false)),
                archivedCount: versions.filter((version) => version.status === "ARCHIVED").length,
              }
            : null,
        };
      }),
    };
  }

  async activeTemplateForServiceItemRevision(
    serviceItemRevisionId: string,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    const serviceItemRevision = await this.database.prisma.serviceItemRevision.findUnique({
      where: { id: serviceItemRevisionId },
      include: {
        serviceItem: {
          include: {
            monthlyService: { select: { id: true, code: true } },
            requestTemplates: { include: requestTemplateSnapshotInclude },
          },
        },
      },
    });
    if (!serviceItemRevision || serviceItemRevision.status !== "ACTIVE") {
      throw new NotFoundException({
        code: "ACTIVE_SERVICE_ITEM_REVISION_NOT_FOUND",
        message: "Active service item revision was not found",
      });
    }

    const template = serviceItemRevision.serviceItem.requestTemplates[0] ?? null;
    const active = template?.versions.find((version) => version.status === "ACTIVE") ?? null;
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: REQUEST_TEMPLATE_EVENT.activeTemplateViewed,
        entityType: "RequestTemplate",
        entityId: template?.id ?? serviceItemRevision.serviceItemId,
        severity: "LOW",
        after: {
          serviceItemRevisionId,
          hasActiveTemplate: Boolean(active),
          clientSafe: principal.roles.includes(CLIENT_ROLE_CODE),
        },
      },
      metadata,
    );

    return {
      serviceItemRevision: {
        id: serviceItemRevision.id,
        serviceItemId: serviceItemRevision.serviceItemId,
        nameAr: serviceItemRevision.nameAr,
        nameEn: serviceItemRevision.nameEn,
        expectedOutput: serviceItemRevision.expectedOutput,
        requiresFile: serviceItemRevision.requiresFile,
      },
      serviceItem: {
        id: serviceItemRevision.serviceItem.id,
        code: serviceItemRevision.serviceItem.code,
        monthlyService: serviceItemRevision.serviceItem.monthlyService,
      },
      template: active
        ? this.versionView(active, principal.roles.includes(CLIENT_ROLE_CODE))
        : null,
    };
  }

  async createFieldLibraryItem(
    input: CreateFieldLibraryItemDto,
    actorId: string,
    metadata: RequestMetadata,
  ) {
    const code = cleanCode(input.code);
    if (!code) {
      throw new BadRequestException({
        code: "REQUEST_FIELD_CODE_REQUIRED",
        message: "Field library code is required",
      });
    }

    const existing = await this.database.prisma.requestFieldLibraryItem.findUnique({
      where: { code },
    });
    if (existing) {
      throw new ConflictException({
        code: "REQUEST_FIELD_LIBRARY_CODE_EXISTS",
        message: "A request field library item with this code already exists",
      });
    }

    const field = await this.database.prisma.requestFieldLibraryItem.create({
      data: {
        code,
        fieldType: input.fieldType,
        labelAr: input.labelAr.trim(),
        labelEn: input.labelEn.trim(),
        helpTextAr: cleanText(input.helpTextAr),
        helpTextEn: cleanText(input.helpTextEn),
        systemKey: cleanText(input.systemKey),
        defaultConfig:
          input.defaultConfig === undefined ? Prisma.JsonNull : json(input.defaultConfig),
        sortOrder: input.sortOrder ?? 0,
      },
    });
    await this.audit.record(
      {
        actorId,
        eventCode: REQUEST_TEMPLATE_EVENT.fieldLibraryCreated,
        entityType: "RequestFieldLibraryItem",
        entityId: field.id,
        after: this.fieldLibraryView(field),
      },
      metadata,
    );
    return this.fieldLibraryView(field);
  }

  async updateFieldLibraryItem(
    id: string,
    input: UpdateFieldLibraryItemDto,
    actorId: string,
    metadata: RequestMetadata,
  ) {
    const before = await this.database.prisma.requestFieldLibraryItem.findUnique({ where: { id } });
    if (!before) {
      throw new NotFoundException({
        code: "REQUEST_FIELD_LIBRARY_NOT_FOUND",
        message: "Request field library item was not found",
      });
    }

    const field = await this.database.prisma.requestFieldLibraryItem.update({
      where: { id },
      data: {
        ...(input.fieldType ? { fieldType: input.fieldType } : {}),
        ...(input.labelAr !== undefined ? { labelAr: input.labelAr.trim() } : {}),
        ...(input.labelEn !== undefined ? { labelEn: input.labelEn.trim() } : {}),
        ...(input.helpTextAr !== undefined ? { helpTextAr: cleanText(input.helpTextAr) } : {}),
        ...(input.helpTextEn !== undefined ? { helpTextEn: cleanText(input.helpTextEn) } : {}),
        ...(input.systemKey !== undefined ? { systemKey: cleanText(input.systemKey) } : {}),
        ...(input.defaultConfig !== undefined
          ? { defaultConfig: nullableJson(input.defaultConfig) }
          : {}),
        ...(input.active !== undefined
          ? {
              status: input.active ? "ACTIVE" : "DISABLED",
              archivedAt: input.active ? null : new Date(),
            }
          : {}),
      },
    });
    await this.audit.record(
      {
        actorId,
        eventCode: REQUEST_TEMPLATE_EVENT.fieldLibraryUpdated,
        entityType: "RequestFieldLibraryItem",
        entityId: field.id,
        before: this.fieldLibraryView(before),
        after: this.fieldLibraryView(field),
      },
      metadata,
    );
    return this.fieldLibraryView(field);
  }

  async applySuggested(serviceItemId: string, actorId: string, metadata: RequestMetadata) {
    const template = await this.requireTemplateForServiceItem(serviceItemId);
    const suggested = template.versions.find((version) => version.status === "SUGGESTED");
    if (!suggested) {
      throw new NotFoundException({
        code: "REQUEST_TEMPLATE_SUGGESTION_NOT_FOUND",
        message: "No suggested request template version exists for this service item",
      });
    }

    const active = await this.database.prisma.$transaction(async (tx) => {
      await tx.requestTemplateVersion.updateMany({
        where: { requestTemplateId: template.id, status: "ACTIVE" },
        data: { status: "ARCHIVED", effectiveTo: new Date() },
      });
      return this.cloneVersion(tx, template.id, suggested, "ACTIVE");
    });

    await this.audit.record(
      {
        actorId,
        eventCode: REQUEST_TEMPLATE_EVENT.suggestedApplied,
        entityType: "RequestTemplate",
        entityId: template.id,
        after: { serviceItemId, activeVersionId: active.id, version: active.version },
      },
      metadata,
    );
    return this.snapshot(actorId, metadata);
  }

  async upsertTemplateVersion(
    serviceItemId: string,
    input: UpsertRequestTemplateVersionDto,
    actorId: string,
    metadata: RequestMetadata,
  ) {
    const template = await this.ensureTemplate(serviceItemId);
    const created = await this.database.prisma.$transaction(async (tx) => {
      const versions = await tx.requestTemplateVersion.findMany({
        where: { requestTemplateId: template.id },
        select: { version: true },
      });
      if (input.status === "ACTIVE") {
        await tx.requestTemplateVersion.updateMany({
          where: { requestTemplateId: template.id, status: "ACTIVE" },
          data: { status: "ARCHIVED", effectiveTo: new Date() },
        });
      }
      const version = await tx.requestTemplateVersion.create({
        data: {
          requestTemplateId: template.id,
          version: nextVersion(versions),
          status: input.status ?? "DRAFT",
          instructionsAr: cleanText(input.instructionsAr),
          instructionsEn: cleanText(input.instructionsEn),
          snapshot: json(input),
          effectiveFrom: input.status === "ACTIVE" ? new Date() : null,
        },
      });
      await this.createTemplateChildren(tx, version.id, input);
      return tx.requestTemplateVersion.findUniqueOrThrow({
        where: { id: version.id },
        include: requestTemplateVersionInclude,
      });
    });

    await this.audit.record(
      {
        actorId,
        eventCode: REQUEST_TEMPLATE_EVENT.templateRevised,
        entityType: "RequestTemplate",
        entityId: template.id,
        ...(input.reason ? { reason: input.reason } : {}),
        after: {
          serviceItemId,
          versionId: created.id,
          version: created.version,
          status: created.status,
        },
      },
      metadata,
    );
    return this.snapshot(actorId, metadata);
  }

  async changeVersionStatus(
    templateId: string,
    versionId: string,
    input: RequestTemplateVersionStatusDto,
    actorId: string,
    metadata: RequestMetadata,
  ) {
    const version = await this.database.prisma.requestTemplateVersion.findFirst({
      where: { id: versionId, requestTemplateId: templateId },
      include: requestTemplateVersionInclude,
    });
    if (!version) {
      throw new NotFoundException({
        code: "REQUEST_TEMPLATE_VERSION_NOT_FOUND",
        message: "Request template version was not found",
      });
    }
    const before = this.versionView(version, false);
    const updated = await this.database.prisma.$transaction(async (tx) => {
      if (input.status === "ACTIVE") {
        await tx.requestTemplateVersion.updateMany({
          where: { requestTemplateId: templateId, status: "ACTIVE", id: { not: versionId } },
          data: { status: "ARCHIVED", effectiveTo: new Date() },
        });
      }
      return tx.requestTemplateVersion.update({
        where: { id: versionId },
        data: {
          status: input.status,
          effectiveFrom: input.status === "ACTIVE" ? new Date() : version.effectiveFrom,
          effectiveTo: input.status === "ARCHIVED" ? new Date() : null,
        },
        include: requestTemplateVersionInclude,
      });
    });

    await this.audit.record(
      {
        actorId,
        eventCode: REQUEST_TEMPLATE_EVENT.versionStatusChanged,
        entityType: "RequestTemplateVersion",
        entityId: versionId,
        before,
        after: this.versionView(updated, false),
        ...(input.reason ? { reason: input.reason } : {}),
      },
      metadata,
    );
    return this.snapshot(actorId, metadata);
  }

  async buildSubmissionForRequest(
    input: {
      requestTemplateVersionId?: string;
      serviceItemRevisionId?: string;
      templateAnswers?: RequestTemplateAnswerInputDto[];
    },
    principal: AuthenticatedPrincipal,
  ): Promise<RequestTemplateSubmission | null> {
    const answers = input.templateAnswers ?? [];
    if (!input.requestTemplateVersionId && answers.length === 0) {
      return null;
    }
    if (!input.requestTemplateVersionId) {
      throw new BadRequestException({
        code: "REQUEST_TEMPLATE_VERSION_REQUIRED",
        message: "A request template version is required when template answers are submitted",
      });
    }
    if (!input.serviceItemRevisionId) {
      throw new BadRequestException({
        code: "SERVICE_ITEM_REQUIRED_FOR_TEMPLATE",
        message: "A service item is required when a request template is submitted",
      });
    }

    const version = await this.database.prisma.requestTemplateVersion.findFirst({
      where: {
        id: input.requestTemplateVersionId,
        status: "ACTIVE",
        requestTemplate: {
          serviceItem: {
            revisions: { some: { id: input.serviceItemRevisionId, status: "ACTIVE" } },
          },
        },
      },
      include: requestTemplateVersionInclude,
    });
    if (!version) {
      throw new BadRequestException({
        code: "ACTIVE_REQUEST_TEMPLATE_REQUIRED",
        message:
          "The submitted request template version must be active and match the selected service item",
      });
    }

    const isClient = principal.roles.includes(CLIENT_ROLE_CODE);
    const activeFields = version.fields.filter((field) => field.status === "ACTIVE");
    const fieldsByCode = new Map(activeFields.map((field) => [field.code, field]));
    const answersByCode = new Map<string, unknown>();
    for (const answer of answers) {
      const code = cleanCode(answer.fieldCode);
      const field = fieldsByCode.get(code);
      if (!field) {
        throw new BadRequestException({
          code: "REQUEST_TEMPLATE_FIELD_UNKNOWN",
          message: `Unknown request template field: ${answer.fieldCode}`,
        });
      }
      if (isClient && !field.clientVisible) {
        throw new ForbiddenException({
          code: "REQUEST_TEMPLATE_FIELD_INTERNAL_ONLY",
          message: "Client users cannot submit internal-only request template fields",
        });
      }
      answersByCode.set(code, answer.value);
    }

    const missingRequiredFields = activeFields.filter(
      (field) =>
        field.required &&
        field.clientVisible &&
        field.fieldType !== "FILE" &&
        isEmptyAnswer(answersByCode.get(field.code)),
    );
    const missingRequiredAttachments = activeFields.filter(
      (field) =>
        field.required &&
        field.clientVisible &&
        field.fieldType === "FILE" &&
        isEmptyAnswer(answersByCode.get(field.code)),
    );
    const missingRequiredDocuments = version.documentChecklist.filter(
      (document) =>
        document.status === "ACTIVE" &&
        document.uploadRequired &&
        isEmptyAnswer(answersByCode.get(document.code)),
    );
    const completenessStatus =
      missingRequiredAttachments.length > 0 || missingRequiredDocuments.length > 0
        ? "MISSING_REQUIRED_ATTACHMENTS"
        : missingRequiredFields.length > 0
          ? "MISSING_REQUIRED_FIELDS"
          : "COMPLETE";

    return {
      requestTemplateVersionId: version.id,
      completenessStatus,
      templateSnapshot: json(this.versionView(version, false)),
      fileSnapshot: json({
        downloadableFiles: version.downloadableFiles.map((file) => this.fileView(file, false)),
        documentChecklist: version.documentChecklist.map((document) => this.documentView(document)),
      }),
      answersCreate: [...answersByCode.entries()].map(([fieldCode, value]) => {
        const field = fieldsByCode.get(fieldCode)!;
        return {
          fieldCode,
          requestTemplateFieldId: field.id,
          ...(field.systemKey ? { systemKey: field.systemKey } : {}),
          fieldType: field.fieldType,
          labelAr: field.labelAr,
          labelEn: field.labelEn,
          value: json(value),
          clientVisible: field.clientVisible,
          sortOrder: field.sortOrder,
        };
      }),
    };
  }

  private async ensureTemplate(serviceItemId: string) {
    const serviceItem = await this.database.prisma.serviceItem.findUnique({
      where: { id: serviceItemId },
      include: { requestTemplates: true },
    });
    if (!serviceItem) {
      throw new NotFoundException({
        code: "SERVICE_ITEM_NOT_FOUND",
        message: "Service item was not found",
      });
    }
    return (
      serviceItem.requestTemplates[0] ??
      (await this.database.prisma.requestTemplate.create({
        data: { serviceItemId },
      }))
    );
  }

  private async requireTemplateForServiceItem(serviceItemId: string) {
    const template = await this.database.prisma.requestTemplate.findFirst({
      where: { serviceItemId },
      include: requestTemplateSnapshotInclude,
    });
    if (!template) {
      throw new NotFoundException({
        code: "REQUEST_TEMPLATE_NOT_FOUND",
        message: "Request template was not found for this service item",
      });
    }
    return template;
  }

  private async cloneVersion(
    tx: Prisma.TransactionClient,
    templateId: string,
    source: RequestTemplateVersionRecord,
    status: "ACTIVE" | "DRAFT",
  ) {
    const versions = await tx.requestTemplateVersion.findMany({
      where: { requestTemplateId: templateId },
      select: { version: true },
    });
    const created = await tx.requestTemplateVersion.create({
      data: {
        requestTemplateId: templateId,
        sourceBlueprintImportId: source.sourceBlueprintImportId,
        version: nextVersion(versions),
        status,
        instructionsAr: source.instructionsAr,
        instructionsEn: source.instructionsEn,
        snapshot: source.snapshot === null ? Prisma.JsonNull : json(source.snapshot),
        effectiveFrom: status === "ACTIVE" ? new Date() : null,
      },
    });
    await this.createTemplateChildren(tx, created.id, {
      sections: source.sections.map((section) => ({
        code: section.code,
        titleAr: section.titleAr,
        titleEn: section.titleEn,
        descriptionAr: section.descriptionAr ?? undefined,
        descriptionEn: section.descriptionEn ?? undefined,
        active: section.status === "ACTIVE",
        sortOrder: section.sortOrder,
      })),
      fields: source.fields.map((field) => ({
        code: field.code,
        sectionCode: field.section?.code,
        libraryFieldCode: field.libraryField?.code,
        systemKey: field.systemKey ?? undefined,
        fieldType: field.fieldType,
        labelAr: field.labelAr,
        labelEn: field.labelEn,
        helpTextAr: field.helpTextAr ?? undefined,
        helpTextEn: field.helpTextEn ?? undefined,
        required: field.required,
        clientVisible: field.clientVisible,
        defaultValue: field.defaultValue,
        validation: field.validation,
        sortOrder: field.sortOrder,
        options: field.options.map((option) => ({
          value: option.value,
          labelAr: option.labelAr,
          labelEn: option.labelEn,
          active: option.status === "ACTIVE",
          sortOrder: option.sortOrder,
        })),
      })),
      downloadableFiles: source.downloadableFiles.map((file) => ({
        code: file.code,
        titleAr: file.titleAr,
        titleEn: file.titleEn,
        descriptionAr: file.descriptionAr ?? undefined,
        descriptionEn: file.descriptionEn ?? undefined,
        fileName: file.fileName ?? undefined,
        fileType: file.fileType ?? undefined,
        mimeType: file.mimeType ?? undefined,
        storageKey: file.storageKey ?? undefined,
        required: file.required,
        returnUploadRequired: file.returnUploadRequired,
        clientVisible: file.clientVisible,
        sortOrder: file.sortOrder,
      })),
      documentChecklist: source.documentChecklist.map((document) => ({
        code: document.code,
        labelAr: document.labelAr,
        labelEn: document.labelEn,
        descriptionAr: document.descriptionAr ?? undefined,
        descriptionEn: document.descriptionEn ?? undefined,
        required: document.required,
        uploadRequired: document.uploadRequired,
        acceptedFileTypes: document.acceptedFileTypes,
        sortOrder: document.sortOrder,
      })),
    });
    return tx.requestTemplateVersion.findUniqueOrThrow({
      where: { id: created.id },
      include: requestTemplateVersionInclude,
    });
  }

  private async createTemplateChildren(
    tx: Prisma.TransactionClient,
    versionId: string,
    input: {
      sections: TemplateSectionConfig[];
      fields: TemplateFieldConfig[];
      downloadableFiles?: TemplateFileConfig[];
      documentChecklist?: TemplateDocumentConfig[];
    },
  ) {
    const sectionsByCode = new Map<string, string>();
    for (const section of input.sections) {
      const created = await tx.requestTemplateSection.create({
        data: {
          requestTemplateVersionId: versionId,
          code: cleanCode(section.code),
          titleAr: section.titleAr.trim(),
          titleEn: section.titleEn.trim(),
          descriptionAr: cleanText(section.descriptionAr),
          descriptionEn: cleanText(section.descriptionEn),
          status: section.active === false ? "DISABLED" : "ACTIVE",
          sortOrder: section.sortOrder ?? 0,
        },
      });
      sectionsByCode.set(created.code, created.id);
    }

    const libraryItems = await tx.requestFieldLibraryItem.findMany({
      where: { code: { in: input.fields.map((field) => cleanCode(field.libraryFieldCode ?? "")) } },
    });
    const libraryByCode = new Map(libraryItems.map((field) => [field.code, field]));

    for (const field of input.fields) {
      const sectionId = field.sectionCode
        ? sectionsByCode.get(cleanCode(field.sectionCode))
        : undefined;
      const libraryField = field.libraryFieldCode
        ? libraryByCode.get(cleanCode(field.libraryFieldCode))
        : null;
      const created = await tx.requestTemplateField.create({
        data: {
          requestTemplateVersionId: versionId,
          code: cleanCode(field.code),
          ...(sectionId ? { sectionId } : {}),
          ...(libraryField ? { libraryFieldId: libraryField.id } : {}),
          systemKey: cleanText(field.systemKey ?? libraryField?.systemKey),
          fieldType: field.fieldType,
          labelAr: field.labelAr.trim(),
          labelEn: field.labelEn.trim(),
          helpTextAr: cleanText(field.helpTextAr),
          helpTextEn: cleanText(field.helpTextEn),
          required: field.required ?? false,
          clientVisible: field.clientVisible ?? true,
          defaultValue:
            field.defaultValue === undefined ? Prisma.JsonNull : json(field.defaultValue),
          validation: field.validation === undefined ? Prisma.JsonNull : json(field.validation),
          source: libraryField ? "LIBRARY" : "CUSTOM",
          sortOrder: field.sortOrder ?? 0,
        },
      });
      for (const option of field.options ?? []) {
        await tx.requestTemplateOption.create({
          data: {
            requestTemplateFieldId: created.id,
            value: cleanCode(option.value) || option.value.trim(),
            labelAr: option.labelAr.trim(),
            labelEn: option.labelEn.trim(),
            status: option.active === false ? "DISABLED" : "ACTIVE",
            sortOrder: option.sortOrder ?? 0,
          },
        });
      }
    }

    for (const file of input.downloadableFiles ?? []) {
      await tx.requestTemplateFile.create({
        data: {
          requestTemplateVersionId: versionId,
          code: cleanCode(file.code),
          titleAr: file.titleAr.trim(),
          titleEn: file.titleEn.trim(),
          descriptionAr: cleanText(file.descriptionAr),
          descriptionEn: cleanText(file.descriptionEn),
          fileName: cleanText(file.fileName),
          fileType: cleanText(file.fileType),
          mimeType: cleanText(file.mimeType),
          storageProvider: file.storageKey ? "metadata-only" : null,
          storageKey: cleanText(file.storageKey),
          required: file.required ?? false,
          returnUploadRequired: file.returnUploadRequired ?? false,
          clientVisible: file.clientVisible ?? true,
          sortOrder: file.sortOrder ?? 0,
        },
      });
    }

    for (const document of input.documentChecklist ?? []) {
      await tx.requestTemplateDocument.create({
        data: {
          requestTemplateVersionId: versionId,
          code: cleanCode(document.code),
          labelAr: document.labelAr.trim(),
          labelEn: document.labelEn.trim(),
          descriptionAr: cleanText(document.descriptionAr),
          descriptionEn: cleanText(document.descriptionEn),
          required: document.required ?? false,
          uploadRequired: document.uploadRequired ?? false,
          acceptedFileTypes:
            document.acceptedFileTypes === undefined
              ? Prisma.JsonNull
              : json(document.acceptedFileTypes),
          sortOrder: document.sortOrder ?? 0,
        },
      });
    }
  }

  private fieldLibraryView(field: RequestFieldLibraryRecord) {
    return {
      id: field.id,
      code: field.code,
      fieldType: field.fieldType,
      labelAr: field.labelAr,
      labelEn: field.labelEn,
      helpTextAr: field.helpTextAr,
      helpTextEn: field.helpTextEn,
      placeholderAr: field.placeholderAr,
      placeholderEn: field.placeholderEn,
      systemKey: field.systemKey,
      defaultConfig: field.defaultConfig,
      status: field.status,
      sortOrder: field.sortOrder,
      archivedAt: field.archivedAt?.toISOString() ?? null,
      createdAt: field.createdAt.toISOString(),
      updatedAt: field.updatedAt.toISOString(),
    };
  }

  private versionView(version: RequestTemplateVersionRecord, clientSafe: boolean) {
    const fields = version.fields.filter(
      (field) => field.status === "ACTIVE" && (!clientSafe || field.clientVisible),
    );
    const visibleSectionIds = new Set(fields.map((field) => field.sectionId).filter(Boolean));
    return {
      id: version.id,
      templateId: version.requestTemplateId,
      serviceItemId: version.requestTemplate.serviceItemId,
      version: version.version,
      status: version.status,
      instructionsAr: version.instructionsAr,
      instructionsEn: version.instructionsEn,
      effectiveFrom: version.effectiveFrom?.toISOString() ?? null,
      effectiveTo: version.effectiveTo?.toISOString() ?? null,
      sections: version.sections
        .filter(
          (section) =>
            section.status === "ACTIVE" &&
            (!clientSafe || visibleSectionIds.has(section.id) || fields.length === 0),
        )
        .map((section) => ({
          id: section.id,
          code: section.code,
          titleAr: section.titleAr,
          titleEn: section.titleEn,
          descriptionAr: section.descriptionAr,
          descriptionEn: section.descriptionEn,
          status: section.status,
          sortOrder: section.sortOrder,
        })),
      fields: fields.map((field) => ({
        id: field.id,
        code: field.code,
        sectionCode: field.section?.code ?? null,
        libraryFieldCode: field.libraryField?.code ?? null,
        systemKey: field.systemKey,
        fieldType: field.fieldType,
        labelAr: field.labelAr,
        labelEn: field.labelEn,
        helpTextAr: field.helpTextAr,
        helpTextEn: field.helpTextEn,
        required: field.required,
        clientVisible: field.clientVisible,
        defaultValue: field.defaultValue,
        validation: field.validation,
        source: field.source,
        status: field.status,
        sortOrder: field.sortOrder,
        options: field.options
          .filter((option) => option.status === "ACTIVE")
          .map((option) => this.optionView(option)),
      })),
      downloadableFiles: version.downloadableFiles
        .filter((file) => file.status === "ACTIVE" && (!clientSafe || file.clientVisible))
        .map((file) => this.fileView(file, clientSafe)),
      documentChecklist: version.documentChecklist
        .filter((document) => document.status === "ACTIVE")
        .map((document) => this.documentView(document)),
      createdAt: version.createdAt.toISOString(),
      updatedAt: version.updatedAt.toISOString(),
    };
  }

  private optionView(option: TemplateOptionConfig) {
    return {
      id: option.id ?? null,
      value: option.value,
      labelAr: option.labelAr,
      labelEn: option.labelEn,
      status: option.status ?? (option.active === false ? "DISABLED" : "ACTIVE"),
      sortOrder: option.sortOrder ?? 0,
    };
  }

  private fileView(file: TemplateFileConfig, clientSafe: boolean) {
    return {
      id: file.id ?? null,
      code: file.code,
      titleAr: file.titleAr,
      titleEn: file.titleEn,
      descriptionAr: file.descriptionAr ?? null,
      descriptionEn: file.descriptionEn ?? null,
      fileName: file.fileName ?? null,
      fileType: file.fileType ?? null,
      mimeType: file.mimeType ?? null,
      storageProvider: clientSafe ? null : (file.storageProvider ?? null),
      storageKey: clientSafe ? null : (file.storageKey ?? null),
      required: file.required ?? false,
      returnUploadRequired: file.returnUploadRequired ?? false,
      clientVisible: file.clientVisible ?? true,
      status: file.status ?? "ACTIVE",
      revision: file.revision ?? 1,
      sortOrder: file.sortOrder ?? 0,
    };
  }

  private documentView(document: TemplateDocumentConfig) {
    return {
      id: document.id ?? null,
      code: document.code,
      labelAr: document.labelAr,
      labelEn: document.labelEn,
      descriptionAr: document.descriptionAr ?? null,
      descriptionEn: document.descriptionEn ?? null,
      required: document.required ?? false,
      uploadRequired: document.uploadRequired ?? false,
      acceptedFileTypes: document.acceptedFileTypes ?? null,
      status: document.status ?? "ACTIVE",
      sortOrder: document.sortOrder ?? 0,
    };
  }
}
