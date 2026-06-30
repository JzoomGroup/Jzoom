import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@jzoom/database";
import { ADMIN_ROLE_CODE, MANAGEMENT_ROLE_CODE } from "../auth/auth.constants.js";
import { AuthAuditService } from "../auth/audit.service.js";
import type { AuthenticatedPrincipal, RequestMetadata } from "../auth/auth.types.js";
import { DatabaseService } from "../database/database.service.js";
import type {
  ClientProjectOutputDecisionDto,
  CreateProjectOutputDto,
  ProjectOutputStatusDto,
  ProjectStatusDto,
  UpdateProjectTaskDto,
} from "./projects.dto.js";
import {
  PROJECT_CLIENT_VISIBLE_OUTPUT_STATUSES,
  PROJECT_EVENT,
  PROJECT_SPECIALIST_ROLE_CODES,
  PROJECT_STATUSES,
  type ProjectLifecycleStatus,
} from "./projects.constants.js";

type ProjectTransaction = Prisma.TransactionClient;

export interface ProjectOnboardingTarget {
  quoteItemId: string;
  lineType: "MONTHLY" | "ONE_TIME";
  serviceCode: string;
  nameAr: string;
  nameEn: string;
  hoursAllocated: number | null;
  oneTimeServiceId: string | null;
  oneTimeServiceRevisionId: string | null;
  existingSpecialistIds: string[];
}

export interface QuoteProjectSource {
  id: string;
  quoteNumber: string;
  clientId: string | null;
}

const projectWorkflowCode = "WF-PROJECT-DELIVERY";
const projectStatusLabels: Record<
  ProjectLifecycleStatus,
  { ar: string; en: string; terminal?: boolean }
> = {
  ACTIVE: { ar: "نشط", en: "Active" },
  ARCHIVED: { ar: "مؤرشف", en: "Archived", terminal: true },
  CLIENT_REVIEW: { ar: "بانتظار مراجعة العميل", en: "Client review" },
  CLOSED: { ar: "مغلق", en: "Closed", terminal: true },
  COMPLETED: { ar: "مكتمل", en: "Completed", terminal: true },
  DRAFT: { ar: "مسودة", en: "Draft" },
};

const projectInclude = {
  client: { select: { id: true, code: true, name: true } },
  quote: { select: { id: true, quoteNumber: true, status: true } },
  quoteItem: { select: { id: true, lineType: true, sortOrder: true } },
  oneTimeServiceRevision: {
    include: {
      oneTimeService: {
        include: {
          category: true,
        },
      },
      phases: { where: { status: "ACTIVE" }, orderBy: { sortOrder: "asc" } },
      deliverables: {
        where: { status: "ACTIVE" },
        orderBy: { sortOrder: "asc" },
        include: {
          phase: true,
          tasks: { where: { status: "ACTIVE" }, orderBy: { sortOrder: "asc" } },
        },
      },
    },
  },
  tasks: {
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      assignee: {
        select: {
          id: true,
          email: true,
          displayName: true,
          roles: { select: { role: { select: { code: true, nameAr: true, nameEn: true } } } },
        },
      },
    },
  },
  outputs: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
  workflowEvents: {
    orderBy: { occurredAt: "desc" },
    take: 20,
  },
} satisfies Prisma.ProjectInclude;

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function numeric(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

@Injectable()
export class ProjectsService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AuthAuditService) private readonly audit: AuthAuditService,
  ) {}

  async list(principal: AuthenticatedPrincipal) {
    const where = await this.projectAccessWhere(principal);
    const projects = await this.database.prisma.project.findMany({
      where,
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      include: projectInclude,
    });
    return projects.map((project) => this.projectView(project, false));
  }

  async listClientProjects(principal: AuthenticatedPrincipal) {
    const projects = await this.database.prisma.project.findMany({
      where: {
        clientId: { in: principal.assignedClientIds },
        archivedAt: null,
        status: { not: "ARCHIVED" },
      },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      include: projectInclude,
    });
    return projects.map((project) => this.projectView(project, true));
  }

  async get(id: string, principal: AuthenticatedPrincipal) {
    const project = await this.requireAccessibleProject(id, principal);
    return this.projectView(project, false);
  }

  async getClientProject(id: string, principal: AuthenticatedPrincipal, metadata: RequestMetadata) {
    const project = await this.database.prisma.project.findFirst({
      where: {
        id,
        clientId: { in: principal.assignedClientIds },
        archivedAt: null,
        status: { not: "ARCHIVED" },
      },
      include: projectInclude,
    });
    if (!project) {
      throw new NotFoundException({
        code: "PROJECT_NOT_FOUND",
        message: "The project could not be found",
      });
    }
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: "CLIENT_PROJECT_VIEWED",
        entityType: "Project",
        entityId: id,
        severity: "LOW",
      },
      metadata,
    );
    return this.projectView(project, true);
  }

  async changeStatus(
    id: string,
    input: ProjectStatusDto,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    const project = await this.requireAccessibleProject(id, principal);
    const workflow = await this.ensureProjectWorkflow();
    const now = new Date();
    const updated = await this.database.prisma.project.update({
      where: { id },
      data: {
        status: input.status,
        currentStateId: workflow.states[input.status],
        ...(input.status === "COMPLETED" ? { completedAt: now } : {}),
        ...(input.status === "CLOSED" ? { closedAt: now } : {}),
        ...(input.status === "ARCHIVED" ? { archivedAt: now } : { archivedAt: null }),
      },
      include: projectInclude,
    });
    await this.database.prisma.workflowEvent.create({
      data: {
        workflowVersionId: workflow.versionId,
        projectId: id,
        fromStateId: project.currentStateId,
        toStateId: workflow.states[input.status],
        actorId: principal.userId,
        actorRole: this.primaryRole(principal),
        reason: input.reason ?? "Project status changed",
        metadata: json({ fromStatus: project.status, toStatus: input.status }),
      },
    });
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: PROJECT_EVENT.statusChanged,
        entityType: "Project",
        entityId: id,
        before: { status: project.status },
        after: { status: updated.status },
        ...(input.reason ? { reason: input.reason } : {}),
        severity: input.status === "ARCHIVED" ? "HIGH" : "MEDIUM",
      },
      metadata,
    );
    return this.projectView(updated, false);
  }

  async updateTask(
    id: string,
    taskId: string,
    input: UpdateProjectTaskDto,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    await this.requireAccessibleProject(id, principal);
    const task = await this.database.prisma.task.findFirst({
      where: { id: taskId, projectId: id },
    });
    if (!task) {
      throw new NotFoundException({
        code: "PROJECT_TASK_NOT_FOUND",
        message: "The project task could not be found",
      });
    }
    const updatedTask = await this.database.prisma.task.update({
      where: { id: taskId },
      data: { status: input.status },
    });
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: PROJECT_EVENT.taskUpdated,
        entityType: "Task",
        entityId: taskId,
        before: { status: task.status },
        after: { status: updatedTask.status },
        ...(input.note ? { reason: input.note } : {}),
        severity: "LOW",
      },
      metadata,
    );
    return this.get(id, principal);
  }

  async createOutput(
    id: string,
    input: CreateProjectOutputDto,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    const project = await this.requireAccessibleProject(id, principal);
    const code = input.code?.trim() || `OUT-${String(project.outputs.length + 1).padStart(2, "0")}`;
    const output = await this.database.prisma.projectOutput.create({
      data: {
        projectId: id,
        code,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        status: "DRAFT",
        sortOrder: project.outputs.length,
      },
    });
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: PROJECT_EVENT.outputCreated,
        entityType: "ProjectOutput",
        entityId: output.id,
        after: { projectId: id, code, title: output.title },
        severity: "MEDIUM",
      },
      metadata,
    );
    return this.get(id, principal);
  }

  async changeOutputStatus(
    id: string,
    outputId: string,
    input: ProjectOutputStatusDto,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    await this.requireAccessibleProject(id, principal);
    const output = await this.database.prisma.projectOutput.findFirst({
      where: { id: outputId, projectId: id },
    });
    if (!output) {
      throw new NotFoundException({
        code: "PROJECT_OUTPUT_NOT_FOUND",
        message: "The project output could not be found",
      });
    }
    const now = new Date();
    const updated = await this.database.prisma.projectOutput.update({
      where: { id: outputId },
      data: {
        status: input.status,
        ...(input.status === "SHARED_WITH_CLIENT" ? { sharedAt: now } : {}),
        ...(input.status === "ACCEPTED_BY_CLIENT" ? { approvedAt: now } : {}),
        ...(input.status === "CLOSED" ? { lockedAt: now } : {}),
      },
    });
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: PROJECT_EVENT.outputStatusChanged,
        entityType: "ProjectOutput",
        entityId: outputId,
        before: { status: output.status },
        after: { status: updated.status },
        ...(input.reason ? { reason: input.reason } : {}),
        severity: "MEDIUM",
      },
      metadata,
    );
    return this.get(id, principal);
  }

  async changeClientOutputStatus(
    id: string,
    outputId: string,
    input: ClientProjectOutputDecisionDto,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    const project = await this.database.prisma.project.findFirst({
      where: {
        id,
        clientId: { in: principal.assignedClientIds },
        archivedAt: null,
        status: { not: "ARCHIVED" },
      },
      include: projectInclude,
    });
    if (!project) {
      throw new NotFoundException({
        code: "PROJECT_NOT_FOUND",
        message: "The project could not be found",
      });
    }
    const output = project.outputs.find((entry) => entry.id === outputId);
    if (
      !output ||
      !PROJECT_CLIENT_VISIBLE_OUTPUT_STATUSES.includes(
        output.status as (typeof PROJECT_CLIENT_VISIBLE_OUTPUT_STATUSES)[number],
      )
    ) {
      throw new NotFoundException({
        code: "PROJECT_OUTPUT_NOT_FOUND",
        message: "The project output could not be found",
      });
    }
    const now = new Date();
    const updated = await this.database.prisma.projectOutput.update({
      where: { id: outputId },
      data: {
        status: input.status,
        ...(input.status === "ACCEPTED_BY_CLIENT" ? { approvedAt: now } : {}),
      },
    });
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: PROJECT_EVENT.outputStatusChanged,
        entityType: "ProjectOutput",
        entityId: outputId,
        before: { status: output.status },
        after: { status: updated.status },
        ...(input.reason ? { reason: input.reason } : {}),
        severity: "MEDIUM",
      },
      metadata,
    );
    const refreshed = await this.database.prisma.project.findUniqueOrThrow({
      where: { id },
      include: projectInclude,
    });
    return this.projectView(refreshed, true);
  }

  async ensureQuoteProjectsInTransaction(
    transaction: ProjectTransaction,
    quote: QuoteProjectSource,
    services: ProjectOnboardingTarget[],
    assignmentMap: Map<string, string[]>,
    now: Date,
  ) {
    if (!quote.clientId) {
      return { createdProjectIds: [], reusedProjectIds: [] };
    }
    const workflow = await this.ensureProjectWorkflowInTransaction(transaction);
    const createdProjectIds: string[] = [];
    const reusedProjectIds: string[] = [];
    for (const service of services) {
      if (
        service.lineType !== "ONE_TIME" ||
        !service.oneTimeServiceRevisionId ||
        !service.oneTimeServiceId
      ) {
        continue;
      }
      const revision = await transaction.oneTimeServiceRevision.findUnique({
        where: { id: service.oneTimeServiceRevisionId },
        include: {
          oneTimeService: { include: { category: true } },
          phases: { where: { status: "ACTIVE" }, orderBy: { sortOrder: "asc" } },
          deliverables: {
            where: { status: "ACTIVE" },
            orderBy: { sortOrder: "asc" },
            include: {
              phase: true,
              tasks: { where: { status: "ACTIVE" }, orderBy: { sortOrder: "asc" } },
            },
          },
        },
      });
      if (!revision || !revision.createsProject) {
        continue;
      }
      const existing = await transaction.project.findFirst({
        where: { quoteItemId: service.quoteItemId },
        select: { id: true },
      });
      if (existing) {
        reusedProjectIds.push(existing.id);
        continue;
      }
      const selectedSpecialistIds =
        assignmentMap.get(service.quoteItemId) ?? service.existingSpecialistIds;
      const primarySpecialistId = selectedSpecialistIds[0];
      const projectNumber = await this.nextProjectNumberInTransaction(transaction, now);
      const snapshot = this.projectServiceSnapshot(quote, service, revision);
      const project = await transaction.project.create({
        data: {
          projectNumber,
          clientId: quote.clientId,
          quoteId: quote.id,
          quoteItemId: service.quoteItemId,
          oneTimeServiceRevisionId: revision.id,
          workflowVersionId: workflow.versionId,
          currentStateId: workflow.states.ACTIVE,
          name: service.nameAr || revision.nameAr,
          status: "ACTIVE",
          startsAt: now,
          dueAt: addDays(now, revision.durationDays),
          serviceSnapshot: json(snapshot),
        },
      });
      await this.createProjectOutputsInTransaction(transaction, project.id, revision);
      await this.createProjectTasksInTransaction(
        transaction,
        project.id,
        revision,
        primarySpecialistId,
      );
      await transaction.workflowEvent.create({
        data: {
          workflowVersionId: workflow.versionId,
          projectId: project.id,
          toStateId: workflow.states.ACTIVE,
          actorRole: "SYSTEM",
          reason: "Project created from accepted one-time quote item",
          metadata: json({
            quoteId: quote.id,
            quoteNumber: quote.quoteNumber,
            quoteItemId: service.quoteItemId,
            oneTimeServiceId: service.oneTimeServiceId,
            specialistIds: selectedSpecialistIds,
          }),
        },
      });
      createdProjectIds.push(project.id);
    }
    return { createdProjectIds, reusedProjectIds };
  }

  private async requireAccessibleProject(id: string, principal: AuthenticatedPrincipal) {
    const where = await this.projectAccessWhere(principal);
    const project = await this.database.prisma.project.findFirst({
      where: { AND: [{ id }, where] },
      include: projectInclude,
    });
    if (!project) {
      throw new NotFoundException({
        code: "PROJECT_NOT_FOUND",
        message: "The project could not be found",
      });
    }
    return project;
  }

  private async projectAccessWhere(
    principal: AuthenticatedPrincipal,
  ): Promise<Prisma.ProjectWhereInput> {
    if (this.hasGlobalAccess(principal)) {
      return { archivedAt: null };
    }
    const access: Prisma.ProjectWhereInput[] = [
      { clientId: { in: principal.assignedClientIds } },
      { tasks: { some: { assigneeId: principal.userId } } },
    ];
    const scopes = await this.database.prisma.specialistServiceScope.findMany({
      where: {
        userId: principal.userId,
        status: "ACTIVE",
        oneTimeServiceId: { not: null },
        startsAt: { lte: new Date() },
        OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
      },
      select: { clientId: true, oneTimeServiceId: true },
    });
    for (const scope of scopes) {
      if (!scope.oneTimeServiceId) continue;
      access.push({
        ...(scope.clientId ? { clientId: scope.clientId } : {}),
        oneTimeServiceRevision: { oneTimeServiceId: scope.oneTimeServiceId },
      });
    }
    return {
      archivedAt: null,
      status: { not: "ARCHIVED" },
      OR: access,
    };
  }

  private hasGlobalAccess(principal: AuthenticatedPrincipal): boolean {
    return (
      principal.roles.includes(ADMIN_ROLE_CODE) ||
      principal.roles.includes(MANAGEMENT_ROLE_CODE) ||
      principal.scopes.some((scope) => scope.type === "GLOBAL")
    );
  }

  private projectView(
    project: Prisma.ProjectGetPayload<{ include: typeof projectInclude }>,
    clientSafe: boolean,
  ) {
    const tasks = project.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueAt: task.dueAt?.toISOString() ?? null,
      sortOrder: task.sortOrder,
      assignee: task.assignee
        ? {
            id: task.assignee.id,
            email: task.assignee.email,
            displayName: task.assignee.displayName,
            roles: task.assignee.roles,
          }
        : null,
    }));
    const outputs = project.outputs
      .filter(
        (output) =>
          !clientSafe ||
          PROJECT_CLIENT_VISIBLE_OUTPUT_STATUSES.includes(
            output.status as (typeof PROJECT_CLIENT_VISIBLE_OUTPUT_STATUSES)[number],
          ),
      )
      .map((output) => ({
        id: output.id,
        code: output.code,
        title: output.title,
        description: output.description,
        status: output.status,
        dueAt: output.dueAt?.toISOString() ?? null,
        sharedAt: output.sharedAt?.toISOString() ?? null,
        approvedAt: output.approvedAt?.toISOString() ?? null,
        lockedAt: output.lockedAt?.toISOString() ?? null,
        revision: output.revision,
        sortOrder: output.sortOrder,
        createdAt: output.createdAt.toISOString(),
        updatedAt: output.updatedAt.toISOString(),
      }));
    return {
      id: project.id,
      projectNumber: project.projectNumber,
      name: project.name,
      status: project.status,
      startsAt: project.startsAt?.toISOString() ?? null,
      dueAt: project.dueAt?.toISOString() ?? null,
      completedAt: project.completedAt?.toISOString() ?? null,
      closedAt: project.closedAt?.toISOString() ?? null,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      client: project.client,
      quote: project.quote,
      service: {
        id: project.oneTimeServiceRevision.oneTimeService.id,
        code: project.oneTimeServiceRevision.oneTimeService.code,
        serviceLine: project.oneTimeServiceRevision.oneTimeService.serviceLine,
        category: {
          id: project.oneTimeServiceRevision.oneTimeService.category.id,
          code: project.oneTimeServiceRevision.oneTimeService.category.code,
          nameAr: project.oneTimeServiceRevision.oneTimeService.category.nameAr,
          nameEn: project.oneTimeServiceRevision.oneTimeService.category.nameEn,
        },
        revisionId: project.oneTimeServiceRevision.id,
        nameAr: project.oneTimeServiceRevision.nameAr,
        nameEn: project.oneTimeServiceRevision.nameEn,
        description: project.oneTimeServiceRevision.description,
        durationDays: project.oneTimeServiceRevision.durationDays,
        estimatedHours: Number(project.oneTimeServiceRevision.estimatedHours),
      },
      phases: project.oneTimeServiceRevision.phases.map((phase) => ({
        id: phase.id,
        code: phase.code,
        nameAr: phase.nameAr,
        nameEn: phase.nameEn,
        description: phase.description,
        sortOrder: phase.sortOrder,
        isRequired: phase.isRequired,
      })),
      deliverables: project.oneTimeServiceRevision.deliverables.map((deliverable) => ({
        id: deliverable.id,
        code: deliverable.code,
        nameAr: deliverable.nameAr,
        nameEn: deliverable.nameEn,
        description: deliverable.description,
        sortOrder: deliverable.sortOrder,
        isRequired: deliverable.isRequired,
        requiresClientApproval: deliverable.requiresClientApproval,
        phaseCode: deliverable.phase?.code ?? null,
        taskCount: deliverable.tasks.length,
      })),
      progress: {
        tasksDone: tasks.filter((task) => task.status === "DONE").length,
        tasksTotal: tasks.length,
        outputsShared: outputs.filter((output) =>
          PROJECT_CLIENT_VISIBLE_OUTPUT_STATUSES.includes(
            output.status as (typeof PROJECT_CLIENT_VISIBLE_OUTPUT_STATUSES)[number],
          ),
        ).length,
        outputsTotal: project.outputs.length,
      },
      tasks: clientSafe ? tasks.filter((task) => task.status !== "CANCELLED") : tasks,
      outputs,
      activity: clientSafe
        ? []
        : project.workflowEvents.map((event) => ({
            id: event.id,
            actorRole: event.actorRole,
            reason: event.reason,
            occurredAt: event.occurredAt.toISOString(),
            metadata: event.metadata,
          })),
      serviceSnapshot: project.serviceSnapshot,
    };
  }

  private async ensureProjectWorkflow() {
    return this.ensureProjectWorkflowInTransaction(this.database.prisma);
  }

  private async ensureProjectWorkflowInTransaction(transaction: ProjectTransaction) {
    const definition = await transaction.workflowDefinition.upsert({
      where: { code: projectWorkflowCode },
      create: {
        code: projectWorkflowCode,
        name: "One-Time Project Delivery",
        type: "PROJECT",
        status: "ACTIVE",
      },
      update: { status: "ACTIVE" },
    });
    let version = await transaction.workflowVersion.findFirst({
      where: { workflowDefinitionId: definition.id, version: 1 },
      include: { states: true },
    });
    if (!version) {
      version = await transaction.workflowVersion.create({
        data: {
          workflowDefinitionId: definition.id,
          version: 1,
          status: "ACTIVE",
          effectiveFrom: new Date("2026-06-30T00:00:00.000Z"),
          configuration: json({ source: "PROJECTS_ONE_TIME_DELIVERY", statuses: PROJECT_STATUSES }),
        },
        include: { states: true },
      });
    } else if (version.status !== "ACTIVE") {
      version = await transaction.workflowVersion.update({
        where: { id: version.id },
        data: { status: "ACTIVE" },
        include: { states: true },
      });
    }
    const states = new Map(version.states.map((state) => [state.code, state.id]));
    for (const [index, status] of PROJECT_STATUSES.entries()) {
      if (states.has(status)) continue;
      const label = projectStatusLabels[status];
      const state = await transaction.workflowState.create({
        data: {
          workflowVersionId: version.id,
          code: status,
          labelAr: label.ar,
          labelEn: label.en,
          isInitial: status === "DRAFT",
          isTerminal: label.terminal ?? false,
          sortOrder: index,
          configuration: json({ managedBy: "PROJECTS_ONE_TIME_DELIVERY" }),
        },
      });
      states.set(status, state.id);
    }
    return {
      versionId: version.id,
      states: Object.fromEntries(
        PROJECT_STATUSES.map((status) => [status, states.get(status)!]),
      ) as Record<ProjectLifecycleStatus, string>,
    };
  }

  private async nextProjectNumberInTransaction(transaction: ProjectTransaction, now: Date) {
    const date = now.toISOString().slice(0, 10).replaceAll("-", "");
    const count = await transaction.project.count({
      where: {
        createdAt: {
          gte: new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`),
        },
      },
    });
    return `PRJ-${date}-${String(count + 1).padStart(5, "0")}`;
  }

  private projectServiceSnapshot(
    quote: QuoteProjectSource,
    service: ProjectOnboardingTarget,
    revision: Prisma.OneTimeServiceRevisionGetPayload<{
      include: {
        oneTimeService: { include: { category: true } };
        phases: true;
        deliverables: { include: { phase: true; tasks: true } };
      };
    }>,
  ) {
    return {
      source: "QUOTE_ONBOARDING",
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber,
      quoteItemId: service.quoteItemId,
      oneTimeServiceId: revision.oneTimeServiceId,
      oneTimeServiceRevisionId: revision.id,
      serviceCode: revision.oneTimeService.code,
      nameAr: service.nameAr || revision.nameAr,
      nameEn: service.nameEn || revision.nameEn,
      description: revision.description,
      durationDays: revision.durationDays,
      estimatedHours: numeric(revision.estimatedHours),
      category: {
        code: revision.oneTimeService.category.code,
        nameAr: revision.oneTimeService.category.nameAr,
        nameEn: revision.oneTimeService.category.nameEn,
      },
      phases: revision.phases.map((phase) => ({
        code: phase.code,
        nameAr: phase.nameAr,
        nameEn: phase.nameEn,
        sortOrder: phase.sortOrder,
      })),
      deliverables: revision.deliverables.map((deliverable) => ({
        code: deliverable.code,
        nameAr: deliverable.nameAr,
        nameEn: deliverable.nameEn,
        phaseCode: deliverable.phase?.code ?? null,
        requiresClientApproval: deliverable.requiresClientApproval,
        tasks: deliverable.tasks.map((task) => ({
          code: task.code,
          nameAr: task.nameAr,
          nameEn: task.nameEn,
          estimatedHours: numeric(task.estimatedHours),
        })),
      })),
    };
  }

  private async createProjectOutputsInTransaction(
    transaction: ProjectTransaction,
    projectId: string,
    revision: Prisma.OneTimeServiceRevisionGetPayload<{
      include: { deliverables: { include: { phase: true; tasks: true } } };
    }>,
  ) {
    const rows = revision.deliverables
      .filter((deliverable) => deliverable.requiresClientApproval)
      .map((deliverable, index) => ({
        projectId,
        code: deliverable.code,
        title: deliverable.nameAr || deliverable.nameEn,
        description: deliverable.description,
        status: "DRAFT" as const,
        sortOrder: index,
      }));
    if (rows.length > 0) {
      await transaction.projectOutput.createMany({ data: rows });
    }
  }

  private async createProjectTasksInTransaction(
    transaction: ProjectTransaction,
    projectId: string,
    revision: Prisma.OneTimeServiceRevisionGetPayload<{
      include: { deliverables: { include: { tasks: true } } };
    }>,
    assigneeId: string | undefined,
  ) {
    const rows = revision.deliverables.flatMap((deliverable) =>
      deliverable.tasks.map((task) => ({
        projectId,
        title: task.nameAr || task.nameEn,
        description: optionalString(task.description) ?? deliverable.nameAr ?? deliverable.nameEn,
        status: "TODO",
        priority: task.isRequired ? "HIGH" : "NORMAL",
        assigneeId: assigneeId ?? null,
        sortOrder: deliverable.sortOrder * 100 + task.sortOrder,
      })),
    );
    if (rows.length === 0) {
      await transaction.task.create({
        data: {
          projectId,
          title: revision.nameAr,
          description: "Kickoff one-time project delivery.",
          status: "TODO",
          priority: "NORMAL",
          assigneeId: assigneeId ?? null,
          sortOrder: 0,
        },
      });
      return;
    }
    await transaction.task.createMany({ data: rows });
  }

  private primaryRole(principal: AuthenticatedPrincipal): string {
    return (
      principal.roles.find((role) => role === "ROLE-ADMIN") ??
      principal.roles.find((role) => role === "ROLE-MGMT") ??
      principal.roles.find((role) =>
        PROJECT_SPECIALIST_ROLE_CODES.includes(
          role as (typeof PROJECT_SPECIALIST_ROLE_CODES)[number],
        ),
      ) ??
      principal.roles[0] ??
      "UNKNOWN"
    );
  }
}
