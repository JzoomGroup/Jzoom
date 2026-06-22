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
import { ADMIN_ROLE_CODE, MANAGEMENT_ROLE_CODE } from "../auth/auth.constants.js";
import { AuthAuditService } from "../auth/audit.service.js";
import type { AuthenticatedPrincipal, RequestMetadata } from "../auth/auth.types.js";
import { DatabaseService } from "../database/database.service.js";
import {
  ACCOUNT_MANAGER_ROLE_CODE,
  REQUEST_EVENT,
  REQUEST_STATUSES,
  type RequestLifecycleStatus,
  SPECIALIST_ROLE_CODE,
  SUPERVISOR_ROLE_CODE,
} from "./requests.constants.js";
import type {
  AddAttachmentMetadataDto,
  AddInternalNoteDto,
  AddRequestCommentDto,
  AssignRequestDto,
  CreateRequestDto,
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

const userSummarySelect = {
  id: true,
  email: true,
  displayName: true,
} satisfies Prisma.UserSelect;

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
  workflowEvents: {
    orderBy: { occurredAt: "asc" },
    include: {
      fromState: { select: { code: true, labelEn: true, labelAr: true } },
      toState: { select: { code: true, labelEn: true, labelAr: true } },
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

@Injectable()
export class RequestsService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AuthAuditService) private readonly audit: AuthAuditService,
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
    await this.requireServiceItem(input.serviceItemRevisionId, subscriptionService);
    await this.requireSourceQuote(input.sourceQuoteId, input.clientId);
    await this.requireSourceInvoice(input.sourceInvoiceId, input.clientId);

    const assignedSpecialistId = await this.assignmentUserId(input.assignedSpecialistId, [
      SPECIALIST_ROLE_CODE,
    ]);
    const assignedSupervisorId = await this.assignmentUserId(input.assignedSupervisorId, [
      SUPERVISOR_ROLE_CODE,
    ]);
    const accountManagerId = await this.assignmentUserId(
      input.accountManagerId ??
        (principal.roles.includes(ACCOUNT_MANAGER_ROLE_CODE) ? principal.userId : undefined),
      [ACCOUNT_MANAGER_ROLE_CODE],
    );
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
    const now = new Date();
    const updated = await this.database.prisma.request.update({
      where: { id },
      data: {
        status,
        currentStateId: toStateId,
        ...(status === "CLOSED" ? { closedAt: now } : {}),
      },
      include: requestDetailInclude,
    });
    await this.database.prisma.workflowEvent.create({
      data: {
        workflowVersionId: updated.workflowVersionId,
        requestId: id,
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

    const refreshed = await this.requireAccessibleRequest(id, principal);
    return this.detailView(refreshed, false);
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

  async listClientRequests(principal: AuthenticatedPrincipal) {
    const requests = await this.database.prisma.request.findMany({
      where: {
        clientId: { in: this.clientIdsFor(principal) },
        archivedAt: null,
      },
      orderBy: [{ createdAt: "desc" }],
      include: requestSummaryInclude,
    });
    return requests.map((request) => this.summaryView(request));
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
      return;
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
        message: "The source quote must belong to the client and be issued or accepted",
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

  private summaryView(request: RequestSummaryRecord) {
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
      counts: request._count,
    };
  }

  private detailView(request: RequestDetailRecord, clientSafe: boolean) {
    return {
      ...this.summaryView(request),
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
          createdAt: file.createdAt.toISOString(),
          updatedAt: file.updatedAt.toISOString(),
        })),
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
}
