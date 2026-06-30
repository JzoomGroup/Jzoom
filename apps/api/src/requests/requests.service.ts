import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { ReadStream } from "node:fs";
import { Prisma } from "@jzoom/database";
import { ADMIN_ROLE_CODE, MANAGEMENT_ROLE_CODE } from "../auth/auth.constants.js";
import { AuthAuditService } from "../auth/audit.service.js";
import type { AuthenticatedPrincipal, RequestMetadata } from "../auth/auth.types.js";
import { CLIENT_ROLE_CODE } from "../client-portal/client-portal.constants.js";
import { DatabaseService } from "../database/database.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { REQUEST_TEMPLATE_EVENT } from "../request-templates/request-templates.constants.js";
import { RequestTemplatesService } from "../request-templates/request-templates.service.js";
import {
  ACCOUNT_MANAGER_ROLE_CODE,
  CLIENT_VISIBLE_OUTPUT_STATUSES,
  REQUEST_EVENT,
  REQUEST_STATUSES,
  type RequestLifecycleStatus,
  SPECIALIST_ROLE_CODE,
  SUPERVISOR_ROLE_CODE,
} from "./requests.constants.js";
import { FileStorageService, type UploadedRequestFile } from "./file-storage.service.js";
import type {
  AddAttachmentMetadataDto,
  AddInternalNoteDto,
  AddRequestCommentDto,
  AssignRequestDto,
  ClientDocumentRequestStatusDto,
  CloseRequestOutputDto,
  CreateTimeEntryDto,
  RequestClientDocumentDto,
  CreateRequestOutputDto,
  CreateRequestTaskDto,
  CreateRequestDto,
  RequestQueueQueryDto,
  ReviewRequestOutputDto,
  ReviewTimeEntryDto,
  ReturnSharedOutputDto,
  ShareRequestOutputDto,
  SupervisorRequestReviewDto,
  UpdateTimeEntryDto,
  UpdateRequestOutputDto,
  UpdateRequestTaskDto,
  UploadClientDocumentMetadataDto,
} from "./requests.dto.js";

const workflowCode = "REQUEST_LIFECYCLE_FOUNDATION";

const lifecycleTransitions: Record<RequestLifecycleStatus, RequestLifecycleStatus[]> = {
  NEW: ["TRIAGE", "REJECTED"],
  TRIAGE: ["ASSIGNED", "RETURNED", "REJECTED"],
  ASSIGNED: ["IN_PROGRESS", "WAITING_SUPERVISOR", "RETURNED"],
  IN_PROGRESS: ["WAITING_CLIENT", "WAITING_SUPERVISOR", "COMPLETED", "RETURNED"],
  WAITING_CLIENT: ["IN_PROGRESS", "RETURNED", "REJECTED"],
  WAITING_SUPERVISOR: ["IN_PROGRESS", "COMPLETED", "RETURNED", "REJECTED"],
  COMPLETED: ["CLOSED", "RETURNED"],
  CLOSED: [],
  RETURNED: ["TRIAGE", "ASSIGNED", "IN_PROGRESS"],
  REJECTED: [],
};

const statusLabels: Record<RequestLifecycleStatus, { ar: string; en: string; terminal?: boolean }> =
  {
    NEW: { ar: "جديد", en: "New" },
    TRIAGE: { ar: "فرز", en: "Triage" },
    ASSIGNED: { ar: "معين", en: "Assigned" },
    IN_PROGRESS: { ar: "قيد التنفيذ", en: "In progress" },
    WAITING_CLIENT: { ar: "بانتظار العميل", en: "Waiting for client" },
    WAITING_SUPERVISOR: { ar: "بانتظار المشرف", en: "Waiting for supervisor" },
    COMPLETED: { ar: "مكتمل", en: "Completed" },
    CLOSED: { ar: "مغلق", en: "Closed", terminal: true },
    RETURNED: { ar: "معاد", en: "Returned" },
    REJECTED: { ar: "مرفوض", en: "Rejected", terminal: true },
  };

const openRequestStatuses = REQUEST_STATUSES.filter(
  (status) => status !== "CLOSED" && status !== "REJECTED",
);

const userSummarySelect = {
  id: true,
  email: true,
  displayName: true,
} satisfies Prisma.UserSelect;

const assignmentCandidateSelect = {
  id: true,
  email: true,
  displayName: true,
  roles: {
    select: {
      role: {
        select: {
          code: true,
        },
      },
    },
  },
} satisfies Prisma.UserSelect;

type AssignmentCandidateRecord = Prisma.UserGetPayload<{
  select: typeof assignmentCandidateSelect;
}>;

const requestSummaryInclude = {
  client: {
    select: {
      id: true,
      code: true,
      name: true,
      legalName: true,
      sector: true,
      city: true,
    },
  },
  subscriptionService: {
    include: {
      subscription: {
        select: {
          id: true,
          clientId: true,
          status: true,
          startsAt: true,
          endsAt: true,
        },
      },
      monthlyServiceRevision: {
        select: {
          id: true,
          monthlyServiceId: true,
          nameAr: true,
          nameEn: true,
          serviceLine: true,
          domain: true,
          monthlyService: { select: { id: true, code: true } },
        },
      },
      serviceLevel: {
        select: {
          id: true,
          code: true,
          labelAr: true,
          labelEn: true,
        },
      },
    },
  },
  serviceItemRevision: {
    include: {
      serviceItem: {
        select: {
          id: true,
          code: true,
          monthlyServiceId: true,
        },
      },
    },
  },
  sourceQuote: {
    select: {
      id: true,
      quoteNumber: true,
      status: true,
      snapshotHash: true,
    },
  },
  sourceInvoice: {
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
      snapshotHash: true,
    },
  },
  assignedSpecialist: { select: userSummarySelect },
  assignedSupervisor: { select: userSummarySelect },
  accountManager: { select: userSummarySelect },
  currentState: true,
  _count: {
    select: {
      comments: true,
      files: true,
      internalNotes: true,
      documentRequests: true,
      outputs: true,
      tasks: true,
      timeEntries: true,
      workflowEvents: true,
    },
  },
} satisfies Prisma.RequestInclude;

const requestDetailInclude = {
  ...requestSummaryInclude,
  comments: {
    orderBy: { createdAt: "asc" },
    include: { author: { select: userSummarySelect } },
  },
  internalNotes: {
    orderBy: { createdAt: "asc" },
    include: { author: { select: userSummarySelect } },
  },
  files: {
    orderBy: { createdAt: "asc" },
    include: { uploadedBy: { select: userSummarySelect } },
  },
  outputs: {
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      createdBy: { select: userSummarySelect },
      reviewedBy: { select: userSummarySelect },
      sharedBy: { select: userSummarySelect },
      clientDecisionBy: { select: userSummarySelect },
    },
  },
  documentRequests: {
    orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
    include: {
      requestedBy: { select: userSummarySelect },
      fulfilledBy: { select: userSummarySelect },
      fileMetadata: {
        include: { uploadedBy: { select: userSummarySelect } },
      },
    },
  },
  tasks: {
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { assignee: { select: userSummarySelect } },
  },
  timeEntries: {
    orderBy: [{ workDate: "desc" }, { createdAt: "desc" }],
    include: {
      user: { select: userSummarySelect },
      decidedBy: { select: userSummarySelect },
    },
  },
  workflowEvents: {
    orderBy: { occurredAt: "asc" },
    include: {
      fromState: { select: { code: true, labelEn: true, labelAr: true } },
      toState: { select: { code: true, labelEn: true, labelAr: true } },
    },
  },
  formResponse: {
    include: {
      requestTemplateVersion: {
        select: {
          id: true,
          version: true,
          status: true,
          requestTemplateId: true,
        },
      },
      answers: {
        orderBy: [{ sortOrder: "asc" }, { fieldCode: "asc" }],
        include: {
          requestTemplateField: {
            select: {
              id: true,
              code: true,
              systemKey: true,
            },
          },
        },
      },
      submittedBy: { select: userSummarySelect },
    },
  },
} satisfies Prisma.RequestInclude;

type RequestSummaryRecord = Prisma.RequestGetPayload<{ include: typeof requestSummaryInclude }>;
type RequestDetailRecord = Prisma.RequestGetPayload<{ include: typeof requestDetailInclude }>;

interface RequestWorkflow {
  versionId: string;
  states: Record<RequestLifecycleStatus, string>;
}

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function hasGlobalAccess(principal: AuthenticatedPrincipal): boolean {
  return (
    principal.roles.includes(ADMIN_ROLE_CODE) ||
    principal.roles.includes(MANAGEMENT_ROLE_CODE) ||
    principal.scopes.some((scope) => scope.type === "GLOBAL")
  );
}

function primaryRole(principal: AuthenticatedPrincipal): string {
  return principal.roles[0] ?? "UNKNOWN";
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

@Injectable()
export class RequestsService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AuthAuditService) private readonly audit: AuthAuditService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
    @Inject(RequestTemplatesService) private readonly requestTemplates: RequestTemplatesService,
    @Inject(FileStorageService) private readonly fileStorage: FileStorageService,
  ) {}

  async list(principal: AuthenticatedPrincipal) {
    const requests = await this.database.prisma.request.findMany({
      where: this.internalAccessWhere(principal),
      orderBy: [{ createdAt: "desc" }],
      include: requestSummaryInclude,
    });
    return requests.map((request) => this.summaryView(request));
  }

  async get(id: string, principal: AuthenticatedPrincipal) {
    const request = await this.requireAccessibleRequest(id, principal);
    return this.detailView(request, false);
  }

  async assignmentCandidates(principal: AuthenticatedPrincipal) {
    if (!hasGlobalAccess(principal) && !principal.roles.includes(SUPERVISOR_ROLE_CODE)) {
      throw new ForbiddenException({
        code: "REQUEST_ASSIGNMENT_CANDIDATES_FORBIDDEN",
        message: "Assignment candidates are available to supervisors, management, and admins",
      });
    }

    const roleCodes = [SPECIALIST_ROLE_CODE, SUPERVISOR_ROLE_CODE, ACCOUNT_MANAGER_ROLE_CODE];
    const users = await this.database.prisma.user.findMany({
      where: {
        status: "ACTIVE",
        userType: "INTERNAL",
        roles: {
          some: {
            role: {
              code: { in: roleCodes },
              status: "ACTIVE",
            },
          },
        },
      },
      orderBy: [{ displayName: "asc" }, { email: "asc" }],
      select: assignmentCandidateSelect,
    });
    const candidates = users.map((user) => this.assignmentCandidateView(user));
    const byRole = (roleCode: string) =>
      candidates.filter((candidate) => candidate.roleCodes.includes(roleCode));

    return {
      specialists: byRole(SPECIALIST_ROLE_CODE),
      supervisors: byRole(SUPERVISOR_ROLE_CODE),
      accountManagers: byRole(ACCOUNT_MANAGER_ROLE_CODE),
    };
  }

  async queue(input: RequestQueueQueryDto, principal: AuthenticatedPrincipal) {
    const queue = input.queue ?? "all";
    const where = this.queueAccessWhere(queue, input, principal);
    const requests = await this.database.prisma.request.findMany({
      where,
      orderBy: [{ dueAt: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
      include: requestSummaryInclude,
    });
    return {
      queue,
      filters: input,
      counters: await this.queueCounters(principal),
      requests: requests.map((request) => this.summaryView(request)),
    };
  }

  async create(
    input: CreateRequestDto,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    this.assertCanAccessClient(input.clientId, principal);

    const client = await this.requireActiveClient(input.clientId);
    const subscriptionService = await this.requireActiveSubscriptionService(
      input.subscriptionServiceId,
      input.clientId,
    );
    const serviceItemRevision = await this.requireServiceItem(
      input.serviceItemRevisionId,
      subscriptionService,
    );
    await this.requireSourceQuote(input.sourceQuoteId, input.clientId);
    await this.requireSourceInvoice(input.sourceInvoiceId, input.clientId);
    const templateSubmission = await this.requestTemplates.buildSubmissionForRequest(
      {
        ...(input.serviceItemRevisionId
          ? { serviceItemRevisionId: input.serviceItemRevisionId }
          : {}),
        ...(input.requestTemplateVersionId
          ? { requestTemplateVersionId: input.requestTemplateVersionId }
          : {}),
        ...(input.templateAnswers ? { templateAnswers: input.templateAnswers } : {}),
      },
      principal,
    );

    const manualAssignedSpecialistId = await this.assignmentUserId(input.assignedSpecialistId, [
      SPECIALIST_ROLE_CODE,
    ]);
    const assignedSpecialistId =
      manualAssignedSpecialistId ??
      (await this.suggestedSpecialistIdForRequest({
        clientId: client.id,
        monthlyServiceId: subscriptionService.monthlyServiceRevision.monthlyServiceId,
        ...(serviceItemRevision?.serviceItemId
          ? { serviceItemId: serviceItemRevision.serviceItemId }
          : {}),
      }));
    const manualAssignedSupervisorId = await this.assignmentUserId(input.assignedSupervisorId, [
      SUPERVISOR_ROLE_CODE,
    ]);
    const assignedSupervisorId =
      manualAssignedSupervisorId ??
      (assignedSpecialistId
        ? await this.suggestedSupervisorIdForSpecialist(assignedSpecialistId, client.id)
        : undefined);
    const suggestedAccountManagerId =
      input.accountManagerId ??
      (principal.roles.includes(ACCOUNT_MANAGER_ROLE_CODE)
        ? principal.userId
        : await this.suggestedAccountManagerIdForClient(client.id));
    const accountManagerId = await this.assignmentUserId(suggestedAccountManagerId, [
      ACCOUNT_MANAGER_ROLE_CODE,
    ]);
    const workflow = await this.ensureRequestWorkflow();
    const requestNumber = await this.nextRequestNumber();
    const requestData: Prisma.RequestUncheckedCreateInput = {
      requestNumber,
      clientId: client.id,
      subscriptionServiceId: subscriptionService.id,
      ...(input.serviceItemRevisionId
        ? { serviceItemRevisionId: input.serviceItemRevisionId }
        : {}),
      ...(input.sourceQuoteId ? { sourceQuoteId: input.sourceQuoteId } : {}),
      ...(input.sourceInvoiceId ? { sourceInvoiceId: input.sourceInvoiceId } : {}),
      ...(assignedSpecialistId ? { assignedSpecialistId } : {}),
      ...(assignedSupervisorId ? { assignedSupervisorId } : {}),
      ...(accountManagerId ? { accountManagerId } : {}),
      workflowVersionId: workflow.versionId,
      currentStateId: workflow.states.NEW,
      status: "NEW",
      title: input.title.trim(),
      description: input.description.trim(),
      priority: input.priority ?? "NORMAL",
    };
    if (input.dueAt) {
      requestData.dueAt = new Date(input.dueAt);
    }

    const request = await this.database.prisma.request.create({
      data: requestData,
      include: requestDetailInclude,
    });
    if (templateSubmission) {
      await this.database.prisma.requestFormResponse.create({
        data: {
          requestId: request.id,
          requestTemplateVersionId: templateSubmission.requestTemplateVersionId,
          submittedById: principal.userId,
          completenessStatus: templateSubmission.completenessStatus,
          templateSnapshot: templateSubmission.templateSnapshot,
          fileSnapshot: templateSubmission.fileSnapshot,
          answers: { create: templateSubmission.answersCreate },
        },
      });
    }

    await this.database.prisma.workflowEvent.create({
      data: {
        workflowVersionId: workflow.versionId,
        requestId: request.id,
        toStateId: workflow.states.NEW,
        actorId: principal.userId,
        actorRole: primaryRole(principal),
        reason: "Request created",
        metadata: json({ status: "NEW", requestNumber }),
      },
    });
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: REQUEST_EVENT.created,
        entityType: "Request",
        entityId: request.id,
        after: this.auditSnapshot(request),
      },
      metadata,
    );
    if (templateSubmission) {
      await this.audit.record(
        {
          actorId: principal.userId,
          eventCode: REQUEST_TEMPLATE_EVENT.formResponseSubmitted,
          entityType: "RequestFormResponse",
          entityId: request.id,
          after: {
            requestId: request.id,
            requestTemplateVersionId: templateSubmission.requestTemplateVersionId,
            completenessStatus: templateSubmission.completenessStatus,
            answerCount: templateSubmission.answersCreate.length,
          },
        },
        metadata,
      );
    }
    await this.notifyInternalRequestStakeholders(
      request,
      principal,
      REQUEST_EVENT.created,
      `New request ${request.requestNumber}: ${request.title}`,
      { status: request.status },
      [],
      `طلب جديد ${request.requestNumber}: ${request.title}`,
    );

    if (templateSubmission) {
      const refreshed = await this.requireAccessibleRequest(request.id, principal);
      return this.detailView(refreshed, false);
    }
    return this.detailView(request, false);
  }

  async assign(
    id: string,
    input: AssignRequestDto,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    const request = await this.requireAccessibleRequest(id, principal);
    const before = this.auditSnapshot(request);
    const assignedSpecialistId = await this.assignmentUserId(input.assignedSpecialistId, [
      SPECIALIST_ROLE_CODE,
    ]);
    const assignedSupervisorId = await this.assignmentUserId(input.assignedSupervisorId, [
      SUPERVISOR_ROLE_CODE,
    ]);
    const accountManagerId = await this.assignmentUserId(input.accountManagerId, [
      ACCOUNT_MANAGER_ROLE_CODE,
    ]);
    const data = {
      ...(assignedSpecialistId !== undefined ? { assignedSpecialistId } : {}),
      ...(assignedSupervisorId !== undefined ? { assignedSupervisorId } : {}),
      ...(accountManagerId !== undefined ? { accountManagerId } : {}),
    };

    const updated = await this.database.prisma.request.update({
      where: { id },
      data,
      include: requestDetailInclude,
    });
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: REQUEST_EVENT.assignmentChanged,
        entityType: "Request",
        entityId: updated.id,
        before,
        after: this.auditSnapshot(updated),
        ...(input.reason ? { reason: input.reason } : {}),
      },
      metadata,
    );
    await this.notifyInternalRequestStakeholders(
      updated,
      principal,
      REQUEST_EVENT.assignmentChanged,
      `Request ${updated.requestNumber} assignment changed.`,
      { status: updated.status },
      unique([assignedSpecialistId, assignedSupervisorId, accountManagerId]),
      `تم تغيير إسناد الطلب ${updated.requestNumber}.`,
    );
    return this.detailView(updated, false);
  }

  async changeStatus(
    id: string,
    status: RequestLifecycleStatus,
    reason: string | undefined,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    const request = await this.requireAccessibleRequest(id, principal);
    return this.transitionRequest(request, status, reason, principal, metadata);
  }

  async startWork(id: string, principal: AuthenticatedPrincipal, metadata: RequestMetadata) {
    const request = await this.requireAccessibleRequest(id, principal);
    this.assertAssignedWork(request, principal);
    return this.transitionRequest(request, "IN_PROGRESS", "Work started", principal, metadata);
  }

  async supervisorReview(
    id: string,
    input: SupervisorRequestReviewDto,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    const request = await this.requireAccessibleRequest(id, principal);
    this.assertSupervisorAccess(request, principal);
    const targetStatus: Record<SupervisorRequestReviewDto["action"], RequestLifecycleStatus> = {
      APPROVE: "COMPLETED",
      ESCALATE: "WAITING_SUPERVISOR",
      REJECT: "REJECTED",
      RETURN: "RETURNED",
    };
    return this.transitionRequest(
      request,
      targetStatus[input.action],
      input.reason ?? input.action.toLowerCase().replaceAll("_", " "),
      principal,
      metadata,
    );
  }

  async addComment(
    id: string,
    input: AddRequestCommentDto,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    await this.requireAccessibleRequest(id, principal);
    const comment = await this.database.prisma.comment.create({
      data: {
        requestId: id,
        authorId: principal.userId,
        body: input.body.trim(),
        isClientVisible: input.isClientVisible ?? true,
      },
    });
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: REQUEST_EVENT.commentAdded,
        entityType: "Request",
        entityId: id,
        after: {
          commentId: comment.id,
          isClientVisible: comment.isClientVisible,
        },
      },
      metadata,
    );
    return this.get(id, principal);
  }

  async addInternalNote(
    id: string,
    input: AddInternalNoteDto,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    await this.requireAccessibleRequest(id, principal);
    const note = await this.database.prisma.internalNote.create({
      data: {
        requestId: id,
        authorId: principal.userId,
        body: input.body.trim(),
      },
    });
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: REQUEST_EVENT.internalNoteAdded,
        entityType: "Request",
        entityId: id,
        after: { noteId: note.id },
      },
      metadata,
    );
    return this.get(id, principal);
  }

  async addAttachmentMetadata(
    id: string,
    input: AddAttachmentMetadataDto,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    await this.requireAccessibleRequest(id, principal);
    const file = await this.database.prisma.fileMetadata.create({
      data: {
        requestId: id,
        uploadedById: principal.userId,
        storageProvider: "metadata-only",
        storageKey: `requests/${id}/metadata/${randomUUID()}/${input.originalName}`,
        originalName: input.originalName,
        mimeType: input.mimeType,
        sizeBytes: BigInt(input.sizeBytes),
        sha256: input.sha256,
        visibility: input.visibility ?? "INTERNAL",
      },
    });
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: REQUEST_EVENT.attachmentAdded,
        entityType: "Request",
        entityId: id,
        after: {
          fileId: file.id,
          originalName: file.originalName,
          visibility: file.visibility,
        },
      },
      metadata,
    );
    return this.get(id, principal);
  }

  async addAttachmentFile(
    id: string,
    file: UploadedRequestFile | undefined,
    input: Pick<AddAttachmentMetadataDto, "visibility">,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    await this.requireAccessibleRequest(id, principal);
    if (!file) {
      throw new BadRequestException({
        code: "FILE_REQUIRED",
        message: "A file is required",
      });
    }

    const stored = await this.fileStorage.storeRequestFile(id, "attachments", file);
    const visibility = this.normalizeFileVisibility(input.visibility);
    const created = await this.database.prisma.fileMetadata.create({
      data: {
        requestId: id,
        uploadedById: principal.userId,
        storageProvider: stored.storageProvider,
        storageKey: stored.storageKey,
        originalName: stored.originalName,
        mimeType: stored.mimeType,
        sizeBytes: BigInt(stored.sizeBytes),
        sha256: stored.sha256,
        visibility,
      },
    });
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: REQUEST_EVENT.attachmentAdded,
        entityType: "Request",
        entityId: id,
        after: {
          fileId: created.id,
          originalName: created.originalName,
          visibility: created.visibility,
          storageProvider: created.storageProvider,
        },
      },
      metadata,
    );
    return this.get(id, principal);
  }

  async createTask(
    id: string,
    input: CreateRequestTaskDto,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    await this.requireAccessibleRequest(id, principal);
    const assigneeId = await this.assignmentUserId(input.assigneeId, [
      ACCOUNT_MANAGER_ROLE_CODE,
      SPECIALIST_ROLE_CODE,
      SUPERVISOR_ROLE_CODE,
    ]);
    const task = await this.database.prisma.task.create({
      data: {
        requestId: id,
        title: input.title.trim(),
        ...(input.description ? { description: input.description.trim() } : {}),
        status: input.status ?? "TODO",
        priority: input.priority ?? "NORMAL",
        ...(assigneeId ? { assigneeId } : {}),
        ...(input.dueAt ? { dueAt: new Date(input.dueAt) } : {}),
        sortOrder: input.sortOrder ?? 0,
      },
    });
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: REQUEST_EVENT.taskCreated,
        entityType: "RequestTask",
        entityId: task.id,
        after: {
          requestId: id,
          title: task.title,
          status: task.status,
          assigneeId: task.assigneeId,
        },
      },
      metadata,
    );
    return this.get(id, principal);
  }

  async updateTask(
    id: string,
    taskId: string,
    input: UpdateRequestTaskDto,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    await this.requireAccessibleRequest(id, principal);
    const task = await this.requireRequestTask(id, taskId);
    const assigneeId = await this.assignmentUserId(input.assigneeId, [
      ACCOUNT_MANAGER_ROLE_CODE,
      SPECIALIST_ROLE_CODE,
      SUPERVISOR_ROLE_CODE,
    ]);
    const data: Prisma.TaskUpdateInput = {};
    if (input.title !== undefined) data.title = input.title.trim();
    if (input.description !== undefined) data.description = input.description?.trim() ?? null;
    if (input.status !== undefined) data.status = input.status;
    if (input.priority !== undefined) data.priority = input.priority;
    if (assigneeId !== undefined)
      data.assignee = assigneeId ? { connect: { id: assigneeId } } : { disconnect: true };
    if (input.dueAt !== undefined) data.dueAt = input.dueAt ? new Date(input.dueAt) : null;
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;

    const updated = await this.database.prisma.task.update({
      where: { id: task.id },
      data,
    });
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: REQUEST_EVENT.taskUpdated,
        entityType: "RequestTask",
        entityId: updated.id,
        before: {
          title: task.title,
          status: task.status,
          priority: task.priority,
          assigneeId: task.assigneeId,
        },
        after: {
          title: updated.title,
          status: updated.status,
          priority: updated.priority,
          assigneeId: updated.assigneeId,
        },
      },
      metadata,
    );
    return this.get(id, principal);
  }

  async createOutput(
    id: string,
    input: CreateRequestOutputDto,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    const request = await this.requireAccessibleRequest(id, principal);
    this.assertAssignedWork(request, principal);
    const output = await this.database.prisma.requestOutput.create({
      data: {
        requestId: id,
        createdById: principal.userId,
        code: input.code.trim().toUpperCase(),
        title: input.title.trim(),
        ...(input.description ? { description: input.description.trim() } : {}),
        ...(input.contentSnapshot ? { contentSnapshot: json(input.contentSnapshot) } : {}),
        ...(input.dueAt ? { dueAt: new Date(input.dueAt) } : {}),
        sortOrder: input.sortOrder ?? 0,
      },
    });
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: REQUEST_EVENT.outputCreated,
        entityType: "RequestOutput",
        entityId: output.id,
        after: {
          requestId: id,
          code: output.code,
          title: output.title,
          status: output.status,
        },
      },
      metadata,
    );
    return this.get(id, principal);
  }

  async updateOutput(
    id: string,
    outputId: string,
    input: UpdateRequestOutputDto,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    const request = await this.requireAccessibleRequest(id, principal);
    this.assertAssignedWork(request, principal);
    const output = await this.requireRequestOutput(id, outputId);
    if (!["DRAFT", "REVISION_REQUESTED", "RETURNED_BY_CLIENT"].includes(output.status)) {
      throw new ConflictException({
        code: "REQUEST_OUTPUT_LOCKED_FOR_REVIEW",
        message: "Only draft, returned internal, or client-returned outputs can be edited",
      });
    }
    const data: Prisma.RequestOutputUpdateInput = {};
    if (input.title !== undefined) data.title = input.title.trim();
    if (input.description !== undefined) data.description = input.description?.trim() ?? null;
    if (input.contentSnapshot !== undefined) {
      data.contentSnapshot =
        input.contentSnapshot === null ? Prisma.DbNull : json(input.contentSnapshot);
    }
    if (input.dueAt !== undefined) data.dueAt = input.dueAt ? new Date(input.dueAt) : null;
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;

    const updated = await this.database.prisma.requestOutput.update({
      where: { id: output.id },
      data,
    });
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: REQUEST_EVENT.outputUpdated,
        entityType: "RequestOutput",
        entityId: updated.id,
        before: this.outputAuditSnapshot(output),
        after: this.outputAuditSnapshot(updated),
      },
      metadata,
    );
    return this.get(id, principal);
  }

  async submitOutput(
    id: string,
    outputId: string,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    const request = await this.requireAccessibleRequest(id, principal);
    this.assertAssignedWork(request, principal);
    const output = await this.requireRequestOutput(id, outputId);
    if (!["DRAFT", "REVISION_REQUESTED", "RETURNED_BY_CLIENT"].includes(output.status)) {
      throw new ConflictException({
        code: "REQUEST_OUTPUT_NOT_SUBMITTABLE",
        message:
          "Only draft, returned internal, or client-returned outputs can be submitted for review",
      });
    }
    const updated = await this.database.prisma.requestOutput.update({
      where: { id: output.id },
      data: {
        status: "INTERNAL_REVIEW",
        submittedAt: new Date(),
        reviewReason: null,
        clientReturnReason: null,
      },
    });
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: REQUEST_EVENT.outputSubmitted,
        entityType: "RequestOutput",
        entityId: updated.id,
        before: this.outputAuditSnapshot(output),
        after: this.outputAuditSnapshot(updated),
      },
      metadata,
    );
    await this.notifyInternalRequestStakeholders(
      request,
      principal,
      REQUEST_EVENT.outputSubmitted,
      `Output "${updated.title}" is ready for internal review.`,
      { outputId: updated.id, status: updated.status },
    );
    if (request.status === "IN_PROGRESS") {
      await this.transitionRequest(
        request,
        "WAITING_SUPERVISOR",
        "Internal output submitted for supervisor review",
        principal,
        metadata,
      );
    }
    return this.get(id, principal);
  }

  async reviewOutput(
    id: string,
    outputId: string,
    input: ReviewRequestOutputDto,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    const request = await this.requireAccessibleRequest(id, principal);
    this.assertSupervisorAccess(request, principal);
    const output = await this.requireRequestOutput(id, outputId);
    if (output.status !== "INTERNAL_REVIEW") {
      throw new ConflictException({
        code: "REQUEST_OUTPUT_NOT_IN_REVIEW",
        message: "Only outputs submitted for internal review can be reviewed",
      });
    }
    const approved = input.action === "APPROVE";
    const updated = await this.database.prisma.requestOutput.update({
      where: { id: output.id },
      data: {
        status: approved ? "APPROVED_INTERNAL" : "REVISION_REQUESTED",
        reviewedById: principal.userId,
        reviewedAt: new Date(),
        reviewReason: input.reason ?? input.action.toLowerCase(),
      },
    });
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: REQUEST_EVENT.outputReviewed,
        entityType: "RequestOutput",
        entityId: updated.id,
        before: this.outputAuditSnapshot(output),
        after: this.outputAuditSnapshot(updated),
        ...(input.reason ? { reason: input.reason } : {}),
      },
      metadata,
    );
    await this.notifyInternalRequestStakeholders(
      request,
      principal,
      REQUEST_EVENT.outputReviewed,
      `Output "${updated.title}" was ${updated.status.toLowerCase().replaceAll("_", " ")}.`,
      { outputId: updated.id, status: updated.status },
      [output.createdById],
    );
    return this.get(id, principal);
  }

  async shareOutput(
    id: string,
    outputId: string,
    input: ShareRequestOutputDto,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    const request = await this.requireAccessibleRequest(id, principal);
    this.assertSupervisorAccess(request, principal);
    const output = await this.requireRequestOutput(id, outputId);
    if (output.status !== "APPROVED_INTERNAL") {
      throw new ConflictException({
        code: "REQUEST_OUTPUT_NOT_APPROVED_INTERNAL",
        message: "Only internally approved outputs can be shared with the client",
      });
    }
    const updated = await this.database.prisma.requestOutput.update({
      where: { id: output.id },
      data: {
        status: "SHARED_WITH_CLIENT",
        sharedById: principal.userId,
        sharedAt: new Date(),
      },
    });
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: REQUEST_EVENT.outputShared,
        entityType: "RequestOutput",
        entityId: updated.id,
        before: this.outputAuditSnapshot(output),
        after: this.outputAuditSnapshot(updated),
        ...(input.reason ? { reason: input.reason } : {}),
      },
      metadata,
    );
    await this.recordRequestActivity(
      request,
      principal,
      REQUEST_EVENT.outputShared,
      input.reason ?? "Output shared with client",
      { outputId: updated.id, status: updated.status },
    );
    await this.notifyClientRequestUsers(
      request,
      principal,
      REQUEST_EVENT.outputShared,
      `A new output is ready for review on request ${request.requestNumber}.`,
      `تمت مشاركة مخرج جديد للمراجعة على الطلب ${request.requestNumber}.`,
      { outputId: updated.id, status: updated.status },
      `/client/requests/${request.id}`,
    );
    return this.get(id, principal);
  }

  async closeOutput(
    id: string,
    outputId: string,
    input: CloseRequestOutputDto,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    const request = await this.requireAccessibleRequest(id, principal);
    this.assertSupervisorAccess(request, principal);
    const output = await this.requireRequestOutput(id, outputId);
    if (
      !["ACCEPTED_BY_CLIENT", "RETURNED_BY_CLIENT", "SHARED_WITH_CLIENT"].includes(output.status)
    ) {
      throw new ConflictException({
        code: "REQUEST_OUTPUT_NOT_CLOSABLE",
        message: "Only shared, accepted, or returned client delivery outputs can be closed",
      });
    }
    const updated = await this.database.prisma.requestOutput.update({
      where: { id: output.id },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
      },
    });
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: REQUEST_EVENT.outputClosed,
        entityType: "RequestOutput",
        entityId: updated.id,
        before: this.outputAuditSnapshot(output),
        after: this.outputAuditSnapshot(updated),
        ...(input.reason ? { reason: input.reason } : {}),
      },
      metadata,
    );
    await this.recordRequestActivity(
      request,
      principal,
      REQUEST_EVENT.outputClosed,
      input.reason ?? "Output closed",
      { outputId: updated.id, status: updated.status },
    );
    await this.notifyInternalRequestStakeholders(
      request,
      principal,
      REQUEST_EVENT.outputClosed,
      `Output "${updated.title}" was closed.`,
      { outputId: updated.id, status: updated.status },
    );
    return this.get(id, principal);
  }

  async listClientRequests(principal: AuthenticatedPrincipal) {
    const requests = await this.database.prisma.request.findMany({
      where: {
        clientId: { in: this.clientIdsFor(principal) },
        archivedAt: null,
      },
      orderBy: [{ createdAt: "desc" }],
      include: requestSummaryInclude,
    });
    return requests.map((request) => this.summaryView(request, true));
  }

  async createClientRequest(
    input: CreateRequestDto,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    this.assertCanAccessClient(input.clientId, principal);
    return this.create(
      {
        clientId: input.clientId,
        subscriptionServiceId: input.subscriptionServiceId,
        ...(input.serviceItemRevisionId
          ? { serviceItemRevisionId: input.serviceItemRevisionId }
          : {}),
        ...(input.requestTemplateVersionId
          ? { requestTemplateVersionId: input.requestTemplateVersionId }
          : {}),
        ...(input.templateAnswers ? { templateAnswers: input.templateAnswers } : {}),
        ...(input.sourceQuoteId ? { sourceQuoteId: input.sourceQuoteId } : {}),
        ...(input.sourceInvoiceId ? { sourceInvoiceId: input.sourceInvoiceId } : {}),
        title: input.title,
        description: input.description,
        ...(input.priority ? { priority: input.priority } : {}),
        ...(input.dueAt ? { dueAt: input.dueAt } : {}),
      },
      principal,
      metadata,
    );
  }

  async getClientRequest(id: string, principal: AuthenticatedPrincipal, metadata: RequestMetadata) {
    const request = await this.requireClientRequest(id, principal);
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: REQUEST_EVENT.clientRequestViewed,
        entityType: "Request",
        entityId: request.id,
        after: {
          requestNumber: request.requestNumber,
          status: request.status,
        },
      },
      metadata,
    );
    return this.detailView(request, true);
  }

  async addClientComment(
    id: string,
    input: AddRequestCommentDto,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    await this.requireClientRequest(id, principal);
    const comment = await this.database.prisma.comment.create({
      data: {
        requestId: id,
        authorId: principal.userId,
        body: input.body.trim(),
        isClientVisible: true,
      },
    });
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: REQUEST_EVENT.clientCommentAdded,
        entityType: "Request",
        entityId: id,
        after: {
          commentId: comment.id,
          isClientVisible: true,
        },
      },
      metadata,
    );
    return this.getClientRequest(id, principal, metadata);
  }

  async acceptClientOutput(
    id: string,
    outputId: string,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    const request = await this.requireClientRequest(id, principal);
    const output = this.requireSharedOutputFromRequest(request, outputId);
    const updated = await this.database.prisma.requestOutput.update({
      where: { id: output.id },
      data: {
        status: "ACCEPTED_BY_CLIENT",
        clientDecisionById: principal.userId,
        clientDecidedAt: new Date(),
        clientReturnReason: null,
      },
    });
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: REQUEST_EVENT.outputClientAccepted,
        entityType: "RequestOutput",
        entityId: updated.id,
        before: this.outputAuditSnapshot(output),
        after: this.outputAuditSnapshot(updated),
      },
      metadata,
    );
    await this.recordRequestActivity(
      request,
      principal,
      REQUEST_EVENT.outputClientAccepted,
      "Client accepted shared output",
      { outputId: updated.id, status: updated.status },
    );
    await this.notifyInternalRequestStakeholders(
      request,
      principal,
      REQUEST_EVENT.outputClientAccepted,
      `Client accepted output "${updated.title}".`,
      { outputId: updated.id, status: updated.status },
    );
    const refreshed = await this.requireClientRequest(id, principal);
    return this.detailView(refreshed, true);
  }

  async returnClientOutput(
    id: string,
    outputId: string,
    input: ReturnSharedOutputDto,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    const request = await this.requireClientRequest(id, principal);
    const output = this.requireSharedOutputFromRequest(request, outputId);
    const updated = await this.database.prisma.requestOutput.update({
      where: { id: output.id },
      data: {
        status: "RETURNED_BY_CLIENT",
        clientDecisionById: principal.userId,
        clientDecidedAt: new Date(),
        clientReturnReason: input.reason.trim(),
      },
    });
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: REQUEST_EVENT.outputClientReturned,
        entityType: "RequestOutput",
        entityId: updated.id,
        before: this.outputAuditSnapshot(output),
        after: this.outputAuditSnapshot(updated),
        reason: input.reason.trim(),
      },
      metadata,
    );
    await this.recordRequestActivity(
      request,
      principal,
      REQUEST_EVENT.outputClientReturned,
      "Client returned shared output",
      { outputId: updated.id, status: updated.status },
    );
    await this.notifyInternalRequestStakeholders(
      request,
      principal,
      REQUEST_EVENT.outputClientReturned,
      `Client returned output "${updated.title}".`,
      { outputId: updated.id, status: updated.status },
    );
    const refreshed = await this.requireClientRequest(id, principal);
    return this.detailView(refreshed, true);
  }

  async requestClientDocument(
    id: string,
    input: RequestClientDocumentDto,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    const request = await this.requireAccessibleRequest(id, principal);
    const documentRequest = await this.database.prisma.clientDocumentRequest.create({
      data: {
        requestId: id,
        requestedById: principal.userId,
        title: input.title.trim(),
        ...(input.instructions ? { instructions: input.instructions.trim() } : {}),
        ...(input.dueAt ? { dueAt: new Date(input.dueAt) } : {}),
      },
    });
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: REQUEST_EVENT.documentRequested,
        entityType: "ClientDocumentRequest",
        entityId: documentRequest.id,
        after: this.documentRequestAuditSnapshot(documentRequest),
      },
      metadata,
    );
    await this.recordRequestActivity(
      request,
      principal,
      REQUEST_EVENT.documentRequested,
      "Client document requested",
      { documentRequestId: documentRequest.id, status: documentRequest.status },
    );
    await this.notifyClientRequestUsers(
      request,
      principal,
      REQUEST_EVENT.documentRequested,
      `Document requested for request ${request.requestNumber}: ${documentRequest.title}`,
      `مطلوب مستند للطلب ${request.requestNumber}: ${documentRequest.title}`,
      { documentRequestId: documentRequest.id, status: documentRequest.status },
      `/client/requests/${request.id}`,
    );
    return this.get(id, principal);
  }

  async changeDocumentRequestStatus(
    id: string,
    documentRequestId: string,
    input: ClientDocumentRequestStatusDto,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    const request = await this.requireAccessibleRequest(id, principal);
    const documentRequest = await this.requireClientDocumentRequest(id, documentRequestId);
    if (!["CANCELLED", "CLOSED"].includes(input.status)) {
      throw new BadRequestException({
        code: "DOCUMENT_REQUEST_STATUS_UNSUPPORTED",
        message: "Internal users may only cancel or close a client document request in this PR",
      });
    }
    if (documentRequest.status === "UPLOADED" && input.status === "CANCELLED") {
      throw new ConflictException({
        code: "DOCUMENT_REQUEST_ALREADY_UPLOADED",
        message: "Uploaded document requests cannot be cancelled",
      });
    }
    const updated = await this.database.prisma.clientDocumentRequest.update({
      where: { id: documentRequest.id },
      data: {
        status: input.status,
        ...(input.status === "CANCELLED" ? { cancelledAt: new Date() } : {}),
        ...(input.status === "CLOSED" ? { closedAt: new Date() } : {}),
      },
    });
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: REQUEST_EVENT.documentRequestCancelled,
        entityType: "ClientDocumentRequest",
        entityId: updated.id,
        before: this.documentRequestAuditSnapshot(documentRequest),
        after: this.documentRequestAuditSnapshot(updated),
        ...(input.reason ? { reason: input.reason } : {}),
      },
      metadata,
    );
    await this.recordRequestActivity(
      request,
      principal,
      REQUEST_EVENT.documentRequestCancelled,
      input.reason ?? `Document request ${input.status.toLowerCase()}`,
      { documentRequestId: updated.id, status: updated.status },
    );
    await this.notifyClientRequestUsers(
      request,
      principal,
      REQUEST_EVENT.documentRequestCancelled,
      `Document request "${updated.title}" is ${updated.status.toLowerCase()}.`,
      `طلب المستند "${updated.title}" أصبح ${updated.status.toLowerCase()}.`,
      { documentRequestId: updated.id, status: updated.status },
      `/client/requests/${request.id}`,
    );
    return this.get(id, principal);
  }

  async uploadClientDocument(
    id: string,
    documentRequestId: string,
    input: UploadClientDocumentMetadataDto,
    file: UploadedRequestFile | undefined,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    const request = await this.requireClientRequest(id, principal);
    const documentRequest = await this.requireClientDocumentRequest(id, documentRequestId);
    if (documentRequest.status !== "REQUESTED") {
      throw new ConflictException({
        code: "DOCUMENT_REQUEST_NOT_OPEN",
        message: "Only open document requests can receive a client upload",
      });
    }
    const stored = file
      ? await this.fileStorage.storeRequestFile(id, "client-documents", file)
      : this.metadataOnlyUpload(id, documentRequest.id, input);
    const fileMetadata = await this.database.prisma.fileMetadata.create({
      data: {
        requestId: id,
        uploadedById: principal.userId,
        storageProvider: stored.storageProvider,
        storageKey: stored.storageKey,
        originalName: stored.originalName,
        mimeType: stored.mimeType,
        sizeBytes: BigInt(stored.sizeBytes),
        sha256: stored.sha256,
        visibility: "CLIENT_VISIBLE",
      },
    });
    const updated = await this.database.prisma.clientDocumentRequest.update({
      where: { id: documentRequest.id },
      data: {
        status: "UPLOADED",
        fulfilledById: principal.userId,
        fulfilledAt: new Date(),
        fileMetadataId: fileMetadata.id,
      },
    });
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: REQUEST_EVENT.documentUploaded,
        entityType: "ClientDocumentRequest",
        entityId: updated.id,
        before: this.documentRequestAuditSnapshot(documentRequest),
        after: this.documentRequestAuditSnapshot(updated),
      },
      metadata,
    );
    await this.recordRequestActivity(
      request,
      principal,
      REQUEST_EVENT.documentUploaded,
      "رفع العميل المستند المطلوب",
      { documentRequestId: updated.id, fileId: fileMetadata.id, status: updated.status },
    );
    await this.notifyInternalRequestStakeholders(
      request,
      principal,
      REQUEST_EVENT.documentUploaded,
      `Client uploaded requested document "${updated.title}".`,
      { documentRequestId: updated.id, fileId: fileMetadata.id, status: updated.status },
      [],
      `رفع العميل المستند المطلوب "${updated.title}".`,
    );
    const refreshed = await this.requireClientRequest(id, principal);
    return this.detailView(refreshed, true);
  }

  async downloadFile(
    id: string,
    fileId: string,
    principal: AuthenticatedPrincipal,
    clientSafe: boolean,
  ): Promise<{
    originalName: string;
    mimeType: string;
    stream: ReadStream;
  }> {
    if (clientSafe) {
      await this.requireClientRequest(id, principal);
    } else {
      await this.requireAccessibleRequest(id, principal);
    }

    const file = await this.database.prisma.fileMetadata.findFirst({
      where: {
        id: fileId,
        requestId: id,
        archivedAt: null,
        ...(clientSafe ? { visibility: "CLIENT_VISIBLE" as const } : {}),
      },
    });
    if (!file) {
      throw new NotFoundException({
        code: "FILE_NOT_FOUND",
        message: "The file could not be found",
      });
    }
    if (file.storageProvider !== "local") {
      throw new NotFoundException({
        code: "FILE_CONTENT_UNAVAILABLE",
        message: "This file does not have downloadable stored content",
      });
    }

    return {
      originalName: file.originalName,
      mimeType: file.mimeType,
      stream: await this.fileStorage.readableFile(file.storageKey),
    };
  }

  async createTimeEntry(
    id: string,
    input: CreateTimeEntryDto,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    const request = await this.requireAccessibleRequest(id, principal);
    this.assertAssignedWork(request, principal);
    const entry = await this.database.prisma.timeEntry.create({
      data: {
        requestId: id,
        userId: principal.userId,
        workDate: new Date(input.workDate),
        hours: new Prisma.Decimal(input.hours),
        billable: input.billable ?? true,
        deductHours: input.billable ?? true,
        ...(input.notes ? { notes: input.notes.trim() } : {}),
      },
    });
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: REQUEST_EVENT.timeEntryCreated,
        entityType: "TimeEntry",
        entityId: entry.id,
        after: this.timeEntryAuditSnapshot(entry),
      },
      metadata,
    );
    await this.recordRequestActivity(
      request,
      principal,
      REQUEST_EVENT.timeEntryCreated,
      "Time entry created",
      { timeEntryId: entry.id, status: entry.status, hours: input.hours },
    );
    return this.get(id, principal);
  }

  async updateTimeEntry(
    id: string,
    timeEntryId: string,
    input: UpdateTimeEntryDto,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    await this.requireAccessibleRequest(id, principal);
    const entry = await this.requireRequestTimeEntry(id, timeEntryId);
    this.assertTimeEntryOwnerOrManager(entry, principal);
    if (!["DRAFT", "REJECTED"].includes(entry.status)) {
      throw new ConflictException({
        code: "TIME_ENTRY_LOCKED",
        message: "Only draft or rejected time entries can be edited",
      });
    }
    const data: Prisma.TimeEntryUpdateInput = {};
    if (input.workDate !== undefined) data.workDate = new Date(input.workDate);
    if (input.hours !== undefined) data.hours = new Prisma.Decimal(input.hours);
    if (input.billable !== undefined) {
      data.billable = input.billable;
      data.deductHours = input.billable;
    }
    if (input.notes !== undefined) data.notes = input.notes?.trim() ?? null;
    if (input.status !== undefined && input.status !== entry.status) {
      if (!["DRAFT", "SUBMITTED"].includes(input.status)) {
        throw new BadRequestException({
          code: "TIME_ENTRY_STATUS_UNSUPPORTED",
          message: "Use submit or review actions for approval status changes",
        });
      }
      data.status = input.status;
      if (input.status === "SUBMITTED") data.submittedAt = new Date();
    }
    const updated = await this.database.prisma.timeEntry.update({
      where: { id: entry.id },
      data,
    });
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: REQUEST_EVENT.timeEntryUpdated,
        entityType: "TimeEntry",
        entityId: updated.id,
        before: this.timeEntryAuditSnapshot(entry),
        after: this.timeEntryAuditSnapshot(updated),
      },
      metadata,
    );
    return this.get(id, principal);
  }

  async submitTimeEntry(
    id: string,
    timeEntryId: string,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    const request = await this.requireAccessibleRequest(id, principal);
    const entry = await this.requireRequestTimeEntry(id, timeEntryId);
    this.assertTimeEntryOwnerOrManager(entry, principal);
    if (!["DRAFT", "REJECTED"].includes(entry.status)) {
      throw new ConflictException({
        code: "TIME_ENTRY_NOT_SUBMITTABLE",
        message: "Only draft or rejected time entries can be submitted",
      });
    }
    const updated = await this.database.prisma.timeEntry.update({
      where: { id: entry.id },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        decisionReason: null,
        decidedAt: null,
        decidedById: null,
      },
    });
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: REQUEST_EVENT.timeEntrySubmitted,
        entityType: "TimeEntry",
        entityId: updated.id,
        before: this.timeEntryAuditSnapshot(entry),
        after: this.timeEntryAuditSnapshot(updated),
      },
      metadata,
    );
    await this.recordRequestActivity(
      request,
      principal,
      REQUEST_EVENT.timeEntrySubmitted,
      "Time entry submitted",
      { timeEntryId: updated.id, status: updated.status },
    );
    await this.notifyInternalRequestStakeholders(
      request,
      principal,
      REQUEST_EVENT.timeEntrySubmitted,
      `Time entry submitted for request ${request.requestNumber}.`,
      { timeEntryId: updated.id, status: updated.status },
    );
    return this.get(id, principal);
  }

  async reviewTimeEntry(
    id: string,
    timeEntryId: string,
    input: ReviewTimeEntryDto,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    const request = await this.requireAccessibleRequest(id, principal);
    this.assertSupervisorAccess(request, principal);
    const entry = await this.requireRequestTimeEntry(id, timeEntryId);
    if (entry.status !== "SUBMITTED") {
      throw new ConflictException({
        code: "TIME_ENTRY_NOT_SUBMITTED",
        message: "Only submitted time entries can be reviewed",
      });
    }
    const approved = input.action === "APPROVE";
    const updated = await this.database.prisma.timeEntry.update({
      where: { id: entry.id },
      data: {
        status: approved ? "APPROVED" : "REJECTED",
        decidedById: principal.userId,
        decidedAt: new Date(),
        decisionReason: input.reason ?? input.action.toLowerCase(),
      },
    });
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: REQUEST_EVENT.timeEntryReviewed,
        entityType: "TimeEntry",
        entityId: updated.id,
        before: this.timeEntryAuditSnapshot(entry),
        after: this.timeEntryAuditSnapshot(updated),
        ...(input.reason ? { reason: input.reason } : {}),
      },
      metadata,
    );
    await this.recordRequestActivity(
      request,
      principal,
      REQUEST_EVENT.timeEntryReviewed,
      input.reason ?? `Time entry ${updated.status.toLowerCase()}`,
      { timeEntryId: updated.id, status: updated.status },
    );
    await this.notifyInternalRequestStakeholders(
      request,
      principal,
      REQUEST_EVENT.timeEntryReviewed,
      `Time entry was ${updated.status.toLowerCase()}.`,
      { timeEntryId: updated.id, status: updated.status },
      [entry.userId],
    );
    return this.get(id, principal);
  }

  private queueAccessWhere(
    queue: NonNullable<RequestQueueQueryDto["queue"]>,
    input: RequestQueueQueryDto,
    principal: AuthenticatedPrincipal,
  ): Prisma.RequestWhereInput {
    const filters: Prisma.RequestWhereInput[] = [this.internalAccessWhere(principal)];
    const queueWhere = this.queueWhere(queue, input.assigneeId, principal);
    if (queueWhere) filters.push(queueWhere);
    if (input.status) filters.push({ status: input.status });
    if (input.clientId) filters.push({ clientId: input.clientId });
    if (input.priority) filters.push({ priority: input.priority });
    if (input.serviceId) {
      filters.push({
        OR: [
          { subscriptionService: { monthlyServiceRevisionId: input.serviceId } },
          {
            subscriptionService: {
              monthlyServiceRevision: { monthlyServiceId: input.serviceId },
            },
          },
        ],
      });
    }
    if (input.assigneeId) {
      filters.push({
        OR: [
          { assignedSpecialistId: input.assigneeId },
          { assignedSupervisorId: input.assigneeId },
          { accountManagerId: input.assigneeId },
          { tasks: { some: { assigneeId: input.assigneeId } } },
        ],
      });
    }
    if (input.dueFrom || input.dueTo) {
      filters.push({
        dueAt: {
          ...(input.dueFrom ? { gte: new Date(input.dueFrom) } : {}),
          ...(input.dueTo ? { lte: new Date(input.dueTo) } : {}),
        },
      });
    }
    return { AND: filters };
  }

  private queueWhere(
    queue: NonNullable<RequestQueueQueryDto["queue"]>,
    assigneeId: string | undefined,
    principal: AuthenticatedPrincipal,
  ): Prisma.RequestWhereInput | null {
    if (queue === "all") {
      return null;
    }
    const openStatusFilter = { status: { in: openRequestStatuses } };
    if (queue === "specialist") {
      const targetUserId =
        assigneeId ??
        (principal.roles.includes(SPECIALIST_ROLE_CODE) ? principal.userId : undefined);
      return {
        ...openStatusFilter,
        OR: targetUserId
          ? [
              { assignedSpecialistId: targetUserId },
              { tasks: { some: { assigneeId: targetUserId } } },
            ]
          : [
              { assignedSpecialistId: { not: null } },
              { tasks: { some: { assigneeId: { not: null } } } },
            ],
      };
    }
    if (queue === "supervisor") {
      const targetUserId =
        assigneeId ??
        (principal.roles.includes(SUPERVISOR_ROLE_CODE) ? principal.userId : undefined);
      return {
        ...openStatusFilter,
        OR: [
          ...(targetUserId
            ? [{ assignedSupervisorId: targetUserId }]
            : [{ assignedSupervisorId: { not: null } }]),
          { status: "WAITING_SUPERVISOR" },
          { outputs: { some: { status: "INTERNAL_REVIEW" } } },
        ],
      };
    }
    const targetUserId =
      assigneeId ??
      (principal.roles.includes(ACCOUNT_MANAGER_ROLE_CODE) ? principal.userId : undefined);
    return {
      ...openStatusFilter,
      ...(targetUserId ? { accountManagerId: targetUserId } : { accountManagerId: { not: null } }),
    };
  }

  private async queueCounters(principal: AuthenticatedPrincipal) {
    const accessWhere = this.internalAccessWhere(principal);
    const now = new Date();
    const [open, overdue, specialist, supervisor, accountManager] = await Promise.all([
      this.database.prisma.request.count({
        where: { AND: [accessWhere, { status: { in: openRequestStatuses } }] },
      }),
      this.database.prisma.request.count({
        where: {
          AND: [accessWhere, { status: { in: openRequestStatuses } }, { dueAt: { lt: now } }],
        },
      }),
      this.database.prisma.request.count({
        where: {
          AND: [
            accessWhere,
            {
              status: { in: openRequestStatuses },
              OR: [
                { assignedSpecialistId: principal.userId },
                { tasks: { some: { assigneeId: principal.userId } } },
              ],
            },
          ],
        },
      }),
      this.database.prisma.request.count({
        where: {
          AND: [
            accessWhere,
            {
              status: { in: openRequestStatuses },
              OR: [
                { assignedSupervisorId: principal.userId },
                { status: "WAITING_SUPERVISOR" },
                { outputs: { some: { status: "INTERNAL_REVIEW" } } },
              ],
            },
          ],
        },
      }),
      this.database.prisma.request.count({
        where: {
          AND: [
            accessWhere,
            {
              status: { in: openRequestStatuses },
              OR: [
                { accountManagerId: principal.userId },
                { clientId: { in: this.optionalClientIdsFor(principal) } },
              ],
            },
          ],
        },
      }),
    ]);
    return { accountManager, open, overdue, specialist, supervisor };
  }

  private async transitionRequest(
    request: RequestDetailRecord,
    status: RequestLifecycleStatus,
    reason: string | undefined,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    if (request.status === status) {
      return this.detailView(request, false);
    }
    const allowed = lifecycleTransitions[request.status];
    if (!allowed.includes(status)) {
      throw new ConflictException({
        code: "INVALID_REQUEST_STATUS_TRANSITION",
        message: `Requests cannot move from ${request.status} to ${status}`,
      });
    }

    const workflow = await this.ensureRequestWorkflow();
    const toStateId = workflow.states[status];
    const updated = await this.database.prisma.request.update({
      where: { id: request.id },
      data: {
        status,
        currentStateId: toStateId,
        ...(status === "CLOSED" ? { closedAt: new Date() } : {}),
      },
      include: requestDetailInclude,
    });
    await this.database.prisma.workflowEvent.create({
      data: {
        workflowVersionId: updated.workflowVersionId,
        requestId: request.id,
        fromStateId: request.currentStateId,
        toStateId,
        actorId: principal.userId,
        actorRole: primaryRole(principal),
        ...(reason ? { reason } : {}),
        metadata: json({ fromStatus: request.status, toStatus: status }),
      },
    });
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: REQUEST_EVENT.statusChanged,
        entityType: "Request",
        entityId: updated.id,
        before: this.auditSnapshot(request),
        after: this.auditSnapshot(updated),
        ...(reason ? { reason } : {}),
      },
      metadata,
    );
    await this.notifyInternalRequestStakeholders(
      updated,
      principal,
      REQUEST_EVENT.statusChanged,
      `Request ${updated.requestNumber} moved to ${status.toLowerCase().replaceAll("_", " ")}.`,
      { fromStatus: request.status, toStatus: status },
      [],
      `تم نقل الطلب ${updated.requestNumber} إلى ${statusLabels[status].ar}.`,
    );
    if (status === "WAITING_CLIENT") {
      await this.notifyClientRequestUsers(
        updated,
        principal,
        REQUEST_EVENT.statusChanged,
        `Request ${updated.requestNumber} is waiting for your input.`,
        `الطلب ${updated.requestNumber} بانتظار إجراء من طرفكم.`,
        { fromStatus: request.status, toStatus: status },
        `/client/requests/${updated.id}`,
      );
    }
    const refreshed = await this.requireAccessibleRequest(request.id, principal);
    return this.detailView(refreshed, false);
  }

  private assertAssignedWork(
    request: RequestDetailRecord,
    principal: AuthenticatedPrincipal,
  ): void {
    if (hasGlobalAccess(principal)) {
      return;
    }
    const taskAssigned = request.tasks.some((task) => task.assigneeId === principal.userId);
    if (
      request.assignedSpecialistId === principal.userId ||
      request.assignedSupervisorId === principal.userId ||
      request.accountManagerId === principal.userId ||
      taskAssigned
    ) {
      return;
    }
    throw new ForbiddenException({
      code: "REQUEST_ASSIGNMENT_REQUIRED",
      message: "This action requires assignment to the request",
    });
  }

  private assertSupervisorAccess(
    request: RequestDetailRecord,
    principal: AuthenticatedPrincipal,
  ): void {
    if (hasGlobalAccess(principal) || request.assignedSupervisorId === principal.userId) {
      return;
    }
    throw new ForbiddenException({
      code: "REQUEST_SUPERVISOR_REQUIRED",
      message: "This action requires the assigned supervisor or management access",
    });
  }

  private async requireRequestTask(requestId: string, taskId: string) {
    const task = await this.database.prisma.task.findFirst({
      where: { id: taskId, requestId },
    });
    if (!task) {
      throw new NotFoundException({
        code: "REQUEST_TASK_NOT_FOUND",
        message: "The request task could not be found",
      });
    }
    return task;
  }

  private async requireRequestOutput(requestId: string, outputId: string) {
    const output = await this.database.prisma.requestOutput.findFirst({
      where: { id: outputId, requestId },
    });
    if (!output) {
      throw new NotFoundException({
        code: "REQUEST_OUTPUT_NOT_FOUND",
        message: "The internal request output could not be found",
      });
    }
    return output;
  }

  private requireSharedOutputFromRequest(request: RequestDetailRecord, outputId: string) {
    const output = request.outputs.find(
      (item) =>
        item.id === outputId &&
        CLIENT_VISIBLE_OUTPUT_STATUSES.includes(
          item.status as (typeof CLIENT_VISIBLE_OUTPUT_STATUSES)[number],
        ),
    );
    if (!output) {
      throw new NotFoundException({
        code: "CLIENT_OUTPUT_NOT_FOUND",
        message: "The shared output could not be found",
      });
    }
    if (output.status !== "SHARED_WITH_CLIENT") {
      throw new ConflictException({
        code: "CLIENT_OUTPUT_NOT_OPEN_FOR_DECISION",
        message: "Only outputs currently shared with the client can be accepted or returned",
      });
    }
    return output;
  }

  private async requireClientDocumentRequest(requestId: string, documentRequestId: string) {
    const documentRequest = await this.database.prisma.clientDocumentRequest.findFirst({
      where: { id: documentRequestId, requestId },
    });
    if (!documentRequest) {
      throw new NotFoundException({
        code: "CLIENT_DOCUMENT_REQUEST_NOT_FOUND",
        message: "The client document request could not be found",
      });
    }
    return documentRequest;
  }

  private async requireRequestTimeEntry(requestId: string, timeEntryId: string) {
    const entry = await this.database.prisma.timeEntry.findFirst({
      where: { id: timeEntryId, requestId },
    });
    if (!entry) {
      throw new NotFoundException({
        code: "REQUEST_TIME_ENTRY_NOT_FOUND",
        message: "The request time entry could not be found",
      });
    }
    return entry;
  }

  private assertTimeEntryOwnerOrManager(
    entry: { userId: string },
    principal: AuthenticatedPrincipal,
  ): void {
    if (hasGlobalAccess(principal) || entry.userId === principal.userId) {
      return;
    }
    throw new ForbiddenException({
      code: "TIME_ENTRY_OWNER_REQUIRED",
      message: "Only the time entry owner or management can change this entry",
    });
  }

  private async recordRequestActivity(
    request: RequestDetailRecord,
    principal: AuthenticatedPrincipal,
    eventCode: string,
    reason: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.database.prisma.workflowEvent.create({
      data: {
        workflowVersionId: request.workflowVersionId,
        requestId: request.id,
        fromStateId: request.currentStateId,
        toStateId: request.currentStateId,
        actorId: principal.userId,
        actorRole: primaryRole(principal),
        reason,
        metadata: json({ eventCode, ...metadata }),
      },
    });
  }

  private async notifyInternalRequestStakeholders(
    request: RequestDetailRecord,
    principal: AuthenticatedPrincipal,
    event: string,
    messageEn: string,
    payload: Record<string, unknown>,
    extraRecipients: string[] = [],
    messageAr?: string,
  ): Promise<void> {
    const recipientUserIds = unique([
      request.assignedSpecialistId,
      request.assignedSupervisorId,
      request.accountManagerId,
      ...extraRecipients,
    ]).filter((userId) => userId !== principal.userId);
    await this.notifications.notifyUsers({
      aggregateType: "Request",
      aggregateId: request.id,
      event,
      targetType: "Request",
      targetId: request.id,
      messageEn,
      ...(messageAr ? { messageAr } : {}),
      deepLink: `/requests/${request.id}`,
      recipientUserIds,
      payload: {
        requestId: request.id,
        requestNumber: request.requestNumber,
        status: request.status,
        ...payload,
      },
    });
  }

  private async notifyClientRequestUsers(
    request: RequestDetailRecord,
    principal: AuthenticatedPrincipal,
    event: string,
    messageEn: string,
    messageAr: string,
    payload: Record<string, unknown>,
    deepLink: string,
  ): Promise<void> {
    const recipientUserIds = (await this.clientUserIds(request.clientId)).filter(
      (userId) => userId !== principal.userId,
    );
    await this.notifications.notifyUsers({
      aggregateType: "Request",
      aggregateId: request.id,
      event,
      targetType: "Request",
      targetId: request.id,
      messageEn,
      messageAr,
      deepLink,
      recipientUserIds,
      payload: {
        requestId: request.id,
        requestNumber: request.requestNumber,
        status: request.status,
        ...payload,
      },
    });
  }

  private async clientUserIds(clientId: string): Promise<string[]> {
    const now = new Date();
    const users = await this.database.prisma.user.findMany({
      where: {
        status: "ACTIVE",
        userType: "EXTERNAL",
        clientAssignments: {
          some: {
            clientId,
            roleCode: CLIENT_ROLE_CODE,
            startsAt: { lte: now },
            OR: [{ endsAt: null }, { endsAt: { gt: now } }],
          },
        },
      },
      select: { id: true },
    });
    return users.map((user) => user.id);
  }

  private internalAccessWhere(principal: AuthenticatedPrincipal): Prisma.RequestWhereInput {
    if (hasGlobalAccess(principal)) {
      return {};
    }

    const clauses: Prisma.RequestWhereInput[] = [];
    const clientIds = this.optionalClientIdsFor(principal);
    if (clientIds.length > 0) {
      clauses.push({ clientId: { in: clientIds } });
    }
    if (principal.roles.includes(ACCOUNT_MANAGER_ROLE_CODE)) {
      clauses.push({ accountManagerId: principal.userId });
    }
    if (principal.roles.includes(SPECIALIST_ROLE_CODE)) {
      clauses.push({
        OR: [
          { assignedSpecialistId: principal.userId },
          { tasks: { some: { assigneeId: principal.userId } } },
        ],
      });
    }
    if (principal.roles.includes(SUPERVISOR_ROLE_CODE)) {
      clauses.push({ assignedSupervisorId: principal.userId });
    }

    if (clauses.length === 0) {
      throw new ForbiddenException({
        code: "REQUEST_SCOPE_REQUIRED",
        message: "You do not have an assigned request or client scope",
      });
    }
    return { OR: clauses };
  }

  private async requireAccessibleRequest(id: string, principal: AuthenticatedPrincipal) {
    const request = await this.database.prisma.request.findFirst({
      where: {
        id,
        ...this.internalAccessWhere(principal),
      },
      include: requestDetailInclude,
    });
    if (!request) {
      throw new NotFoundException({
        code: "REQUEST_NOT_FOUND",
        message: "The request could not be found",
      });
    }
    return request;
  }

  private async requireClientRequest(id: string, principal: AuthenticatedPrincipal) {
    const request = await this.database.prisma.request.findFirst({
      where: {
        id,
        clientId: { in: this.clientIdsFor(principal) },
        archivedAt: null,
      },
      include: requestDetailInclude,
    });
    if (!request) {
      throw new NotFoundException({
        code: "CLIENT_REQUEST_NOT_FOUND",
        message: "The request could not be found",
      });
    }
    return request;
  }

  private assertCanAccessClient(clientId: string, principal: AuthenticatedPrincipal): void {
    if (hasGlobalAccess(principal)) {
      return;
    }
    if (this.optionalClientIdsFor(principal).includes(clientId)) {
      return;
    }
    throw new ForbiddenException({
      code: "CLIENT_SCOPE_DENIED",
      message: "You do not have access to this client",
    });
  }

  private async requireActiveClient(clientId: string) {
    const client = await this.database.prisma.client.findFirst({
      where: { id: clientId, status: "ACTIVE", archivedAt: null },
    });
    if (!client) {
      throw new BadRequestException({
        code: "ACTIVE_CLIENT_REQUIRED",
        message: "Requests can only be created for an active client",
      });
    }
    return client;
  }

  private async requireActiveSubscriptionService(subscriptionServiceId: string, clientId: string) {
    const now = new Date();
    const subscriptionService = await this.database.prisma.subscriptionService.findFirst({
      where: {
        id: subscriptionServiceId,
        status: "ACTIVE",
        subscription: {
          clientId,
          status: "ACTIVE",
          startsAt: { lte: now },
          OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        },
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      include: {
        subscription: true,
        monthlyServiceRevision: {
          include: { monthlyService: true },
        },
        serviceLevel: true,
      },
    });
    if (!subscriptionService) {
      throw new BadRequestException({
        code: "ACTIVE_SUBSCRIPTION_SERVICE_REQUIRED",
        message: "Requests require an active subscription service for the selected client",
      });
    }
    return subscriptionService;
  }

  private async requireServiceItem(
    serviceItemRevisionId: string | undefined,
    subscriptionService: Awaited<ReturnType<RequestsService["requireActiveSubscriptionService"]>>,
  ) {
    if (!serviceItemRevisionId) {
      return null;
    }
    const serviceItemRevision = await this.database.prisma.serviceItemRevision.findFirst({
      where: {
        id: serviceItemRevisionId,
        status: "ACTIVE",
        serviceItem: { status: "ACTIVE" },
      },
      include: { serviceItem: true },
    });
    if (!serviceItemRevision) {
      throw new BadRequestException({
        code: "ACTIVE_SERVICE_ITEM_REQUIRED",
        message: "The selected service item must be active",
      });
    }
    if (
      serviceItemRevision.serviceItem.monthlyServiceId !==
      subscriptionService.monthlyServiceRevision.monthlyServiceId
    ) {
      throw new BadRequestException({
        code: "SERVICE_ITEM_MISMATCH",
        message: "The selected service item must belong to the subscription service",
      });
    }
    return serviceItemRevision;
  }

  private async suggestedSpecialistIdForRequest(input: {
    clientId: string;
    monthlyServiceId: string;
    serviceItemId?: string;
  }): Promise<string | undefined> {
    const now = new Date();
    const serviceTargets: Prisma.SpecialistServiceScopeWhereInput[] = [
      { monthlyServiceId: input.monthlyServiceId },
    ];
    if (input.serviceItemId) {
      serviceTargets.unshift({ serviceItemId: input.serviceItemId });
    }

    const scopes = await this.database.prisma.specialistServiceScope.findMany({
      where: {
        status: "ACTIVE",
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        AND: [{ OR: [{ clientId: input.clientId }, { clientId: null }] }, { OR: serviceTargets }],
        user: {
          status: "ACTIVE",
          userType: "INTERNAL",
          roles: {
            some: {
              role: { code: SPECIALIST_ROLE_CODE, status: "ACTIVE" },
            },
          },
        },
      },
      select: {
        userId: true,
        clientId: true,
        monthlyServiceId: true,
        serviceItemId: true,
        isPrimary: true,
        createdAt: true,
      },
    });
    if (scopes.length === 0) {
      return undefined;
    }

    const score = (scope: (typeof scopes)[number]) =>
      (scope.clientId === input.clientId ? 100 : 0) +
      (input.serviceItemId && scope.serviceItemId === input.serviceItemId ? 60 : 0) +
      (scope.monthlyServiceId === input.monthlyServiceId ? 30 : 0) +
      (scope.isPrimary ? 5 : 0);

    return scopes.sort((left, right) => {
      const scoreDiff = score(right) - score(left);
      if (scoreDiff !== 0) return scoreDiff;
      return right.createdAt.getTime() - left.createdAt.getTime();
    })[0]?.userId;
  }

  private async suggestedSupervisorIdForSpecialist(
    specialistId: string,
    clientId: string,
  ): Promise<string | undefined> {
    const now = new Date();
    const assignments = await this.database.prisma.supervisorSpecialistAssignment.findMany({
      where: {
        specialistId,
        status: "ACTIVE",
        startsAt: { lte: now },
        AND: [
          { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
          { OR: [{ clientId }, { clientId: null }] },
        ],
        supervisor: {
          status: "ACTIVE",
          userType: "INTERNAL",
          roles: {
            some: {
              role: { code: SUPERVISOR_ROLE_CODE, status: "ACTIVE" },
            },
          },
        },
      },
      select: {
        supervisorId: true,
        clientId: true,
        startsAt: true,
      },
    });
    if (assignments.length === 0) {
      return undefined;
    }

    return assignments.sort((left, right) => {
      const clientDiff =
        (right.clientId === clientId ? 1 : 0) - (left.clientId === clientId ? 1 : 0);
      if (clientDiff !== 0) return clientDiff;
      return right.startsAt.getTime() - left.startsAt.getTime();
    })[0]?.supervisorId;
  }

  private async suggestedAccountManagerIdForClient(clientId: string): Promise<string | undefined> {
    const now = new Date();
    const assignment = await this.database.prisma.clientAssignment.findFirst({
      where: {
        clientId,
        roleCode: ACCOUNT_MANAGER_ROLE_CODE,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        user: {
          status: "ACTIVE",
          userType: "INTERNAL",
          roles: {
            some: {
              role: { code: ACCOUNT_MANAGER_ROLE_CODE, status: "ACTIVE" },
            },
          },
        },
      },
      orderBy: { startsAt: "desc" },
      select: { userId: true },
    });
    return assignment?.userId;
  }

  private async requireSourceQuote(sourceQuoteId: string | undefined, clientId: string) {
    if (!sourceQuoteId) {
      return;
    }
    const quote = await this.database.prisma.quote.findFirst({
      where: {
        id: sourceQuoteId,
        clientId,
        status: { in: ["ISSUED", "ACCEPTED"] },
      },
    });
    if (!quote) {
      throw new BadRequestException({
        code: "SOURCE_QUOTE_UNAVAILABLE",
        message: "The source quote must belong to the client and be issued or externally confirmed",
      });
    }
  }

  private async requireSourceInvoice(sourceInvoiceId: string | undefined, clientId: string) {
    if (!sourceInvoiceId) {
      return;
    }
    const invoice = await this.database.prisma.invoice.findFirst({
      where: {
        id: sourceInvoiceId,
        clientId,
        status: "ISSUED",
      },
    });
    if (!invoice) {
      throw new BadRequestException({
        code: "SOURCE_INVOICE_UNAVAILABLE",
        message: "The source invoice must belong to the client and be issued",
      });
    }
  }

  private async assignmentUserId(
    userId: string | null | undefined,
    roleCodes: string[],
  ): Promise<string | null | undefined> {
    if (userId === undefined) {
      return undefined;
    }
    if (userId === null) {
      return null;
    }
    const user = await this.database.prisma.user.findFirst({
      where: { id: userId, status: "ACTIVE", userType: "INTERNAL" },
      include: { roles: { include: { role: true } } },
    });
    if (!user) {
      throw new BadRequestException({
        code: "ACTIVE_INTERNAL_ASSIGNEE_REQUIRED",
        message: "Assignments require an active internal user",
      });
    }
    const assignedRoles = new Set(user.roles.map(({ role }) => role.code));
    if (!roleCodes.some((roleCode) => assignedRoles.has(roleCode))) {
      throw new BadRequestException({
        code: "ASSIGNEE_ROLE_MISMATCH",
        message: `The selected user must have one of these roles: ${roleCodes.join(", ")}`,
      });
    }
    return user.id;
  }

  private async ensureRequestWorkflow(): Promise<RequestWorkflow> {
    const definition = await this.database.prisma.workflowDefinition.upsert({
      where: { code: workflowCode },
      create: {
        code: workflowCode,
        name: "Request Lifecycle Foundation",
        type: "REQUEST",
        status: "ACTIVE",
      },
      update: { status: "ACTIVE" },
    });
    let version = await this.database.prisma.workflowVersion.findFirst({
      where: {
        workflowDefinitionId: definition.id,
        version: 1,
      },
      include: { states: true },
    });
    if (!version) {
      version = await this.database.prisma.workflowVersion.create({
        data: {
          workflowDefinitionId: definition.id,
          version: 1,
          status: "ACTIVE",
          effectiveFrom: new Date("2026-06-22T00:00:00.000Z"),
          configuration: json({ source: "PR13", statuses: REQUEST_STATUSES }),
        },
        include: { states: true },
      });
    } else if (version.status !== "ACTIVE") {
      version = await this.database.prisma.workflowVersion.update({
        where: { id: version.id },
        data: { status: "ACTIVE" },
        include: { states: true },
      });
    }

    const states = new Map(version.states.map((state) => [state.code, state.id]));
    for (const [index, status] of REQUEST_STATUSES.entries()) {
      if (states.has(status)) {
        continue;
      }
      const label = statusLabels[status];
      const state = await this.database.prisma.workflowState.create({
        data: {
          workflowVersionId: version.id,
          code: status,
          labelAr: label.ar,
          labelEn: label.en,
          isInitial: status === "NEW",
          isTerminal: label.terminal ?? false,
          sortOrder: index,
          configuration: json({ managedBy: "PR13_REQUEST_LIFECYCLE" }),
        },
      });
      states.set(status, state.id);
    }

    return {
      versionId: version.id,
      states: Object.fromEntries(
        REQUEST_STATUSES.map((status) => [status, states.get(status)!]),
      ) as Record<RequestLifecycleStatus, string>,
    };
  }

  private async nextRequestNumber(): Promise<string> {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replaceAll("-", "");
    const count = await this.database.prisma.request.count({
      where: {
        createdAt: {
          gte: new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`),
        },
      },
    });
    return `REQ-${date}-${String(count + 1).padStart(5, "0")}`;
  }

  private fileDownloadUrl(requestId: string, fileId: string, clientSafe: boolean): string {
    const prefix = clientSafe ? "client-portal/requests" : "requests";
    return `/api/v1/${prefix}/${requestId}/files/${fileId}/download`;
  }

  private metadataOnlyUpload(
    requestId: string,
    documentRequestId: string,
    input: UploadClientDocumentMetadataDto,
  ) {
    if (!input.originalName || !input.mimeType || !input.sizeBytes || !input.sha256) {
      throw new BadRequestException({
        code: "FILE_REQUIRED",
        message: "A file is required",
      });
    }
    return {
      originalName: input.originalName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      sha256: input.sha256,
      storageProvider: "client-upload-metadata",
      storageKey: `requests/${requestId}/client-documents/${documentRequestId}/${randomUUID()}/${input.originalName}`,
    };
  }

  private normalizeFileVisibility(value: unknown): "INTERNAL" | "CLIENT_VISIBLE" {
    if (value === undefined || value === null || value === "") {
      return "INTERNAL";
    }
    if (value === "INTERNAL" || value === "CLIENT_VISIBLE") {
      return value;
    }
    throw new BadRequestException({
      code: "INVALID_FILE_VISIBILITY",
      message: "File visibility must be INTERNAL or CLIENT_VISIBLE",
    });
  }

  private clientIdsFor(principal: AuthenticatedPrincipal): string[] {
    const clientIds = this.optionalClientIdsFor(principal);
    if (clientIds.length === 0) {
      throw new ForbiddenException({
        code: "CLIENT_PORTAL_SCOPE_REQUIRED",
        message: "A client portal account must be scoped to at least one client",
      });
    }
    return clientIds;
  }

  private optionalClientIdsFor(principal: AuthenticatedPrincipal): string[] {
    const scopeClientIds = principal.scopes
      .filter(
        (scope) =>
          (scope.type === "OWN_CLIENT" || scope.type === "ASSIGNED_CLIENTS") && scope.clientId,
      )
      .map((scope) => scope.clientId!);
    return [...new Set([...principal.assignedClientIds, ...scopeClientIds])];
  }

  private summaryView(request: RequestSummaryRecord, clientSafe = false) {
    return {
      id: request.id,
      requestNumber: request.requestNumber,
      status: request.status,
      title: request.title,
      description: request.description,
      priority: request.priority,
      dueAt: request.dueAt?.toISOString() ?? null,
      closedAt: request.closedAt?.toISOString() ?? null,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
      client: request.client,
      service: this.serviceSummary(request),
      serviceItem: request.serviceItemRevision
        ? {
            id: request.serviceItemRevision.id,
            code: request.serviceItemRevision.serviceItem.code,
            nameAr: request.serviceItemRevision.nameAr,
            nameEn: request.serviceItemRevision.nameEn,
            expectedOutput: request.serviceItemRevision.expectedOutput,
          }
        : null,
      sourceQuote: request.sourceQuote,
      sourceInvoice: request.sourceInvoice,
      assignments: this.assignmentSummary(request),
      counts: clientSafe
        ? {
            comments: 0,
            documentRequests: 0,
            files: 0,
            internalNotes: 0,
            outputs: 0,
            tasks: 0,
            timeEntries: 0,
            workflowEvents: 0,
          }
        : request._count,
    };
  }

  private detailView(request: RequestDetailRecord, clientSafe: boolean) {
    return {
      ...this.summaryView(request, clientSafe),
      comments: request.comments
        .filter((comment) => !clientSafe || comment.isClientVisible)
        .map((comment) => ({
          id: comment.id,
          author: comment.author,
          body: comment.body,
          isClientVisible: comment.isClientVisible,
          createdAt: comment.createdAt.toISOString(),
          updatedAt: comment.updatedAt.toISOString(),
        })),
      internalNotes: clientSafe
        ? []
        : request.internalNotes.map((note) => ({
            id: note.id,
            author: note.author,
            body: note.body,
            createdAt: note.createdAt.toISOString(),
            updatedAt: note.updatedAt.toISOString(),
          })),
      attachments: request.files
        .filter((file) => !clientSafe || file.visibility === "CLIENT_VISIBLE")
        .map((file) => ({
          id: file.id,
          uploadedBy: file.uploadedBy,
          originalName: file.originalName,
          mimeType: file.mimeType,
          sizeBytes: Number(file.sizeBytes),
          sha256: file.sha256,
          visibility: file.visibility,
          version: file.version,
          downloadUrl:
            file.storageProvider === "local"
              ? this.fileDownloadUrl(request.id, file.id, clientSafe)
              : null,
          createdAt: file.createdAt.toISOString(),
          updatedAt: file.updatedAt.toISOString(),
        })),
      outputs: request.outputs
        .filter(
          (output) =>
            !clientSafe ||
            CLIENT_VISIBLE_OUTPUT_STATUSES.includes(
              output.status as (typeof CLIENT_VISIBLE_OUTPUT_STATUSES)[number],
            ),
        )
        .map((output) => this.outputView(output, clientSafe)),
      documentRequests: request.documentRequests
        .filter((documentRequest) => !clientSafe || documentRequest.status !== "CANCELLED")
        .map((documentRequest) => this.documentRequestView(documentRequest, clientSafe)),
      tasks: clientSafe
        ? []
        : request.tasks.map((task) => ({
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            assignee: task.assignee,
            dueAt: task.dueAt?.toISOString() ?? null,
            sortOrder: task.sortOrder,
            createdAt: task.createdAt.toISOString(),
            updatedAt: task.updatedAt.toISOString(),
          })),
      timeEntries: clientSafe ? [] : request.timeEntries.map((entry) => this.timeEntryView(entry)),
      templateResponse: request.formResponse
        ? this.templateResponseView(request.formResponse, clientSafe)
        : null,
      activity: request.workflowEvents.map((event) => ({
        id: event.id,
        actorId: event.actorId,
        actorRole: event.actorRole,
        fromState: event.fromState,
        toState: event.toState,
        reason: event.reason,
        metadata: event.metadata,
        occurredAt: event.occurredAt.toISOString(),
      })),
    };
  }

  private templateResponseView(
    response: NonNullable<RequestDetailRecord["formResponse"]>,
    clientSafe: boolean,
  ) {
    return {
      id: response.id,
      requestTemplateVersionId: response.requestTemplateVersionId,
      requestTemplateVersion: response.requestTemplateVersion,
      completenessStatus: response.completenessStatus,
      templateSnapshot: clientSafe
        ? this.clientSafeTemplateSnapshot(response.templateSnapshot)
        : response.templateSnapshot,
      fileSnapshot: clientSafe
        ? this.clientSafeTemplateSnapshot(response.fileSnapshot)
        : response.fileSnapshot,
      submittedBy: clientSafe ? null : response.submittedBy,
      submittedAt: response.submittedAt.toISOString(),
      createdAt: response.createdAt.toISOString(),
      updatedAt: response.updatedAt.toISOString(),
      answers: response.answers
        .filter((answer) => !clientSafe || answer.clientVisible)
        .map((answer) => ({
          id: answer.id,
          fieldCode: answer.fieldCode,
          systemKey: answer.systemKey,
          labelAr: answer.labelAr,
          labelEn: answer.labelEn,
          fieldType: answer.fieldType,
          value: answer.value,
          clientVisible: answer.clientVisible,
          sortOrder: answer.sortOrder,
          requestTemplateField: clientSafe ? null : answer.requestTemplateField,
          createdAt: answer.createdAt.toISOString(),
          updatedAt: answer.updatedAt.toISOString(),
        })),
    };
  }

  private clientSafeTemplateSnapshot(value: unknown) {
    if (!value || typeof value !== "object") {
      return value ?? null;
    }
    const snapshot = JSON.parse(JSON.stringify(value)) as {
      fields?: Array<{ clientVisible?: boolean }>;
      downloadableFiles?: Array<{
        clientVisible?: boolean;
        storageKey?: unknown;
        storageProvider?: unknown;
      }>;
      [key: string]: unknown;
    };
    if (Array.isArray(snapshot.fields)) {
      snapshot.fields = snapshot.fields.filter((field) => field.clientVisible !== false);
    }
    if (Array.isArray(snapshot.downloadableFiles)) {
      snapshot.downloadableFiles = snapshot.downloadableFiles
        .filter((file) => file.clientVisible !== false)
        .map((file) => ({
          ...file,
          storageKey: null,
          storageProvider: null,
        }));
    }
    return snapshot;
  }

  private serviceSummary(request: RequestSummaryRecord) {
    const subscriptionService = request.subscriptionService;
    return {
      subscriptionServiceId: subscriptionService.id,
      subscriptionId: subscriptionService.subscriptionId,
      hoursAllocated: Number(subscriptionService.hoursAllocated),
      status: subscriptionService.status,
      monthlyService: {
        id: subscriptionService.monthlyServiceRevision.monthlyService.id,
        code: subscriptionService.monthlyServiceRevision.monthlyService.code,
        revisionId: subscriptionService.monthlyServiceRevision.id,
        nameAr: subscriptionService.monthlyServiceRevision.nameAr,
        nameEn: subscriptionService.monthlyServiceRevision.nameEn,
        serviceLine: subscriptionService.monthlyServiceRevision.serviceLine,
        domain: subscriptionService.monthlyServiceRevision.domain,
      },
      serviceLevel: subscriptionService.serviceLevel,
    };
  }

  private assignmentSummary(request: RequestSummaryRecord) {
    return {
      specialist: request.assignedSpecialist,
      supervisor: request.assignedSupervisor,
      accountManager: request.accountManager,
    };
  }

  private assignmentCandidateView(user: AssignmentCandidateRecord) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      roleCodes: user.roles.map(({ role }) => role.code),
    };
  }

  private outputView(output: RequestDetailRecord["outputs"][number], clientSafe = false) {
    return {
      id: output.id,
      code: output.code,
      title: output.title,
      description: output.description,
      contentSnapshot: output.contentSnapshot,
      status: output.status,
      dueAt: output.dueAt?.toISOString() ?? null,
      submittedAt: output.submittedAt?.toISOString() ?? null,
      reviewedAt: output.reviewedAt?.toISOString() ?? null,
      sharedAt: output.sharedAt?.toISOString() ?? null,
      clientDecidedAt: output.clientDecidedAt?.toISOString() ?? null,
      closedAt: output.closedAt?.toISOString() ?? null,
      reviewReason: clientSafe ? null : output.reviewReason,
      clientReturnReason: output.clientReturnReason,
      revision: output.revision,
      sortOrder: output.sortOrder,
      createdAt: output.createdAt.toISOString(),
      updatedAt: output.updatedAt.toISOString(),
      createdBy: clientSafe ? null : output.createdBy,
      reviewedBy: clientSafe ? null : output.reviewedBy,
      sharedBy: clientSafe ? null : output.sharedBy,
      clientDecisionBy: clientSafe ? null : output.clientDecisionBy,
    };
  }

  private documentRequestView(
    documentRequest: RequestDetailRecord["documentRequests"][number],
    clientSafe = false,
  ) {
    return {
      id: documentRequest.id,
      title: documentRequest.title,
      instructions: documentRequest.instructions,
      status: documentRequest.status,
      dueAt: documentRequest.dueAt?.toISOString() ?? null,
      requestedAt: documentRequest.requestedAt.toISOString(),
      fulfilledAt: documentRequest.fulfilledAt?.toISOString() ?? null,
      closedAt: documentRequest.closedAt?.toISOString() ?? null,
      cancelledAt: documentRequest.cancelledAt?.toISOString() ?? null,
      createdAt: documentRequest.createdAt.toISOString(),
      updatedAt: documentRequest.updatedAt.toISOString(),
      requestedBy: clientSafe ? null : documentRequest.requestedBy,
      fulfilledBy: clientSafe ? null : documentRequest.fulfilledBy,
      file: documentRequest.fileMetadata
        ? {
            id: documentRequest.fileMetadata.id,
            uploadedBy: clientSafe ? null : documentRequest.fileMetadata.uploadedBy,
            originalName: documentRequest.fileMetadata.originalName,
            mimeType: documentRequest.fileMetadata.mimeType,
            sizeBytes: Number(documentRequest.fileMetadata.sizeBytes),
            sha256: documentRequest.fileMetadata.sha256,
            visibility: documentRequest.fileMetadata.visibility,
            version: documentRequest.fileMetadata.version,
            downloadUrl:
              documentRequest.fileMetadata.storageProvider === "local"
                ? this.fileDownloadUrl(
                    documentRequest.requestId,
                    documentRequest.fileMetadata.id,
                    clientSafe,
                  )
                : null,
            createdAt: documentRequest.fileMetadata.createdAt.toISOString(),
            updatedAt: documentRequest.fileMetadata.updatedAt.toISOString(),
          }
        : null,
    };
  }

  private timeEntryView(entry: RequestDetailRecord["timeEntries"][number]) {
    return {
      id: entry.id,
      user: entry.user,
      workDate: entry.workDate.toISOString(),
      hours: Number(entry.hours),
      billable: entry.billable,
      status: entry.status,
      notes: entry.notes,
      decisionReason: entry.decisionReason,
      submittedAt: entry.submittedAt?.toISOString() ?? null,
      decidedAt: entry.decidedAt?.toISOString() ?? null,
      decidedBy: entry.decidedBy,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    };
  }

  private auditSnapshot(request: RequestSummaryRecord) {
    return {
      requestNumber: request.requestNumber,
      clientId: request.clientId,
      subscriptionServiceId: request.subscriptionServiceId,
      serviceItemRevisionId: request.serviceItemRevisionId,
      sourceQuoteId: request.sourceQuoteId,
      sourceInvoiceId: request.sourceInvoiceId,
      assignedSpecialistId: request.assignedSpecialistId,
      assignedSupervisorId: request.assignedSupervisorId,
      accountManagerId: request.accountManagerId,
      status: request.status,
      title: request.title,
      priority: request.priority,
      dueAt: request.dueAt?.toISOString() ?? null,
      closedAt: request.closedAt?.toISOString() ?? null,
    };
  }

  private outputAuditSnapshot(output: {
    clientDecidedAt: Date | null;
    clientDecisionById: string | null;
    clientReturnReason: string | null;
    closedAt: Date | null;
    code: string;
    contentSnapshot: unknown;
    description: string | null;
    dueAt: Date | null;
    id: string;
    reviewReason: string | null;
    reviewedAt: Date | null;
    reviewedById: string | null;
    sharedAt: Date | null;
    sharedById: string | null;
    status: string;
    submittedAt: Date | null;
    title: string;
  }) {
    return {
      id: output.id,
      code: output.code,
      title: output.title,
      description: output.description,
      contentSnapshot: output.contentSnapshot,
      status: output.status,
      dueAt: output.dueAt?.toISOString() ?? null,
      submittedAt: output.submittedAt?.toISOString() ?? null,
      reviewedAt: output.reviewedAt?.toISOString() ?? null,
      sharedAt: output.sharedAt?.toISOString() ?? null,
      clientDecidedAt: output.clientDecidedAt?.toISOString() ?? null,
      closedAt: output.closedAt?.toISOString() ?? null,
      reviewedById: output.reviewedById,
      sharedById: output.sharedById,
      clientDecisionById: output.clientDecisionById,
      reviewReason: output.reviewReason,
      clientReturnReason: output.clientReturnReason,
    };
  }

  private documentRequestAuditSnapshot(documentRequest: {
    cancelledAt: Date | null;
    closedAt: Date | null;
    dueAt: Date | null;
    fileMetadataId: string | null;
    fulfilledAt: Date | null;
    fulfilledById: string | null;
    id: string;
    instructions: string | null;
    requestedAt: Date;
    requestedById: string;
    requestId: string;
    status: string;
    title: string;
  }) {
    return {
      id: documentRequest.id,
      requestId: documentRequest.requestId,
      title: documentRequest.title,
      instructions: documentRequest.instructions,
      status: documentRequest.status,
      dueAt: documentRequest.dueAt?.toISOString() ?? null,
      requestedAt: documentRequest.requestedAt.toISOString(),
      fulfilledAt: documentRequest.fulfilledAt?.toISOString() ?? null,
      closedAt: documentRequest.closedAt?.toISOString() ?? null,
      cancelledAt: documentRequest.cancelledAt?.toISOString() ?? null,
      requestedById: documentRequest.requestedById,
      fulfilledById: documentRequest.fulfilledById,
      fileMetadataId: documentRequest.fileMetadataId,
    };
  }

  private timeEntryAuditSnapshot(entry: {
    billable: boolean;
    decidedAt: Date | null;
    decidedById: string | null;
    decisionReason: string | null;
    hours: { toString(): string };
    id: string;
    notes: string | null;
    requestId: string | null;
    status: string;
    submittedAt: Date | null;
    userId: string;
    workDate: Date;
  }) {
    return {
      id: entry.id,
      requestId: entry.requestId,
      userId: entry.userId,
      workDate: entry.workDate.toISOString(),
      hours: Number(entry.hours),
      billable: entry.billable,
      status: entry.status,
      notes: entry.notes,
      submittedAt: entry.submittedAt?.toISOString() ?? null,
      decidedAt: entry.decidedAt?.toISOString() ?? null,
      decidedById: entry.decidedById,
      decisionReason: entry.decisionReason,
    };
  }
}
