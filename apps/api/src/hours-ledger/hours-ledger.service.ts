import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@jzoom/database";
import { ADMIN_ROLE_CODE, MANAGEMENT_ROLE_CODE } from "../auth/auth.constants.js";
import { AuthAuditService } from "../auth/audit.service.js";
import type { AuthenticatedPrincipal, RequestMetadata } from "../auth/auth.types.js";
import { DatabaseService } from "../database/database.service.js";
import { ACCOUNT_MANAGER_ROLE_CODE } from "../reports/reports.constants.js";
import { SPECIALIST_ROLE_CODE, SUPERVISOR_ROLE_CODE } from "../requests/requests.constants.js";
import {
  HOURS_LEDGER_EVENT,
  LEDGER_TRACKED_TIME_ENTRY_STATUSES,
} from "./hours-ledger.constants.js";
import type {
  HoursLedgerQueryDto,
  MonthlyClosingQueryDto,
  MonthlyUsageQueryDto,
  PrepareMonthlyClosingDto,
} from "./hours-ledger.dto.js";

const userSummarySelect = {
  id: true,
  email: true,
  displayName: true,
} satisfies Prisma.UserSelect;

const timeEntryLedgerInclude = {
  user: { select: userSummarySelect },
  decidedBy: { select: userSummarySelect },
  request: {
    select: {
      id: true,
      requestNumber: true,
      title: true,
      status: true,
      priority: true,
      clientId: true,
      assignedSpecialistId: true,
      assignedSupervisorId: true,
      accountManagerId: true,
      client: { select: { id: true, code: true, name: true, sector: true, city: true } },
      subscriptionService: {
        select: {
          id: true,
          hoursAllocated: true,
          monthlyServiceRevision: {
            select: {
              id: true,
              nameAr: true,
              nameEn: true,
              monthlyService: { select: { id: true, code: true } },
            },
          },
          serviceLevel: { select: { id: true, code: true, labelAr: true, labelEn: true } },
        },
      },
      serviceItemRevision: {
        select: {
          id: true,
          nameAr: true,
          nameEn: true,
          serviceItem: { select: { id: true, code: true } },
        },
      },
    },
  },
} satisfies Prisma.TimeEntryInclude;

const monthlyClosingInclude = {
  client: { select: { id: true, code: true, name: true, sector: true, city: true } },
  preparedBy: { select: userSummarySelect },
  finalizedBy: { select: userSummarySelect },
} satisfies Prisma.ClientMonthlyClosingInclude;

type LedgerTimeEntry = Prisma.TimeEntryGetPayload<{ include: typeof timeEntryLedgerInclude }>;
type MonthlyClosingRecord = Prisma.ClientMonthlyClosingGetPayload<{
  include: typeof monthlyClosingInclude;
}>;

interface HoursBucket {
  approvedHours: number;
  billableHours: number;
  entries: number;
  hours: number;
  nonBillableHours: number;
  rejectedHours: number;
  submittedHours: number;
}

interface PeriodWindow {
  end: Date;
  key: string;
  start: Date;
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

function optionalClientIdsFor(principal: AuthenticatedPrincipal): string[] {
  const scopeClientIds = principal.scopes
    .filter(
      (scope) =>
        (scope.type === "OWN_CLIENT" || scope.type === "ASSIGNED_CLIENTS") && scope.clientId,
    )
    .map((scope) => scope.clientId!);
  return [...new Set([...principal.assignedClientIds, ...scopeClientIds])];
}

function emptyBucket(): HoursBucket {
  return {
    approvedHours: 0,
    billableHours: 0,
    entries: 0,
    hours: 0,
    nonBillableHours: 0,
    rejectedHours: 0,
    submittedHours: 0,
  };
}

function addHours(bucket: HoursBucket, entry: LedgerTimeEntry): HoursBucket {
  const hours = Number(entry.hours);
  bucket.entries += 1;
  bucket.hours += hours;
  if (entry.billable) {
    bucket.billableHours += hours;
  } else {
    bucket.nonBillableHours += hours;
  }
  if (entry.status === "APPROVED") {
    bucket.approvedHours += hours;
  }
  if (entry.status === "REJECTED") {
    bucket.rejectedHours += hours;
  }
  if (entry.status === "SUBMITTED") {
    bucket.submittedHours += hours;
  }
  return bucket;
}

function roundedBucket(bucket: HoursBucket): HoursBucket {
  return {
    approvedHours: Number(bucket.approvedHours.toFixed(2)),
    billableHours: Number(bucket.billableHours.toFixed(2)),
    entries: bucket.entries,
    hours: Number(bucket.hours.toFixed(2)),
    nonBillableHours: Number(bucket.nonBillableHours.toFixed(2)),
    rejectedHours: Number(bucket.rejectedHours.toFixed(2)),
    submittedHours: Number(bucket.submittedHours.toFixed(2)),
  };
}

@Injectable()
export class HoursLedgerService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AuthAuditService) private readonly audit: AuthAuditService,
  ) {}

  async list(
    query: HoursLedgerQueryDto,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    const period = this.periodFromQuery(query.period);
    const entries = await this.database.prisma.timeEntry.findMany({
      where: this.timeEntryWhere(query, principal, period),
      include: timeEntryLedgerInclude,
      orderBy: [{ workDate: "desc" }, { createdAt: "desc" }],
    });
    const summary = this.summarizeEntries(entries, period);
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: HOURS_LEDGER_EVENT.ledgerViewed,
        entityType: "HoursLedger",
        entityId: period.key,
        after: {
          period: period.key,
          filters: query,
          entries: entries.length,
          approvedHours: summary.totals.approvedHours,
        },
      },
      metadata,
    );
    return {
      ...summary,
      entries: this.entryViews(entries),
    };
  }

  async usage(
    query: MonthlyUsageQueryDto,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    const period = this.periodFromQuery(query.period);
    const entries = await this.database.prisma.timeEntry.findMany({
      where: this.timeEntryWhere(query, principal, period),
      include: timeEntryLedgerInclude,
      orderBy: [{ workDate: "desc" }, { createdAt: "desc" }],
    });
    const summary = this.summarizeEntries(entries, period);
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: HOURS_LEDGER_EVENT.usageSummaryViewed,
        entityType: "HoursLedgerUsage",
        entityId: period.key,
        after: {
          period: period.key,
          clientCount: summary.byClient.length,
          approvedHours: summary.totals.approvedHours,
        },
      },
      metadata,
    );
    return {
      generatedAt: new Date().toISOString(),
      period: summary.period,
      totals: summary.totals,
      clients: summary.byClient,
    };
  }

  async listClosings(query: MonthlyClosingQueryDto, principal: AuthenticatedPrincipal) {
    const access = this.closingClientAccess(principal);
    const period = query.period ? this.periodFromKey(query.period) : undefined;
    if (query.clientId) {
      this.assertClosingClientAccess(query.clientId, principal);
    }
    const closings = await this.database.prisma.clientMonthlyClosing.findMany({
      where: {
        ...(access ? { clientId: { in: access } } : {}),
        ...(query.clientId ? { clientId: query.clientId } : {}),
        ...(period ? { periodStart: period.start } : {}),
        ...(query.status ? { status: query.status } : { status: { not: "ARCHIVED" } }),
      },
      include: monthlyClosingInclude,
      orderBy: [{ periodStart: "desc" }, { createdAt: "desc" }],
    });
    return closings.map((closing) => this.closingView(closing));
  }

  async getClosing(id: string, principal: AuthenticatedPrincipal, metadata: RequestMetadata) {
    const closing = await this.requireClosing(id, principal);
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: HOURS_LEDGER_EVENT.closingViewed,
        entityType: "ClientMonthlyClosing",
        entityId: closing.id,
        after: this.closingAuditSnapshot(closing),
      },
      metadata,
    );
    return this.closingView(closing);
  }

  async prepareClosing(
    input: PrepareMonthlyClosingDto,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    this.assertClosingClientAccess(input.clientId, principal);
    const client = await this.requireActiveClient(input.clientId);
    const period = this.periodFromKey(input.period);
    const existing = await this.database.prisma.clientMonthlyClosing.findUnique({
      where: { clientId_periodStart: { clientId: input.clientId, periodStart: period.start } },
      include: monthlyClosingInclude,
    });
    if (existing?.status === "FINALIZED") {
      throw new ConflictException({
        code: "MONTHLY_CLOSING_FINALIZED",
        message: "Finalized monthly closings cannot be refreshed",
      });
    }
    if (existing?.status === "ARCHIVED") {
      throw new ConflictException({
        code: "MONTHLY_CLOSING_ARCHIVED",
        message: "Archived monthly closings cannot be refreshed",
      });
    }
    const summary = await this.buildClientHoursSummary(input.clientId, period);
    const title = input.title?.trim() || `Monthly closing ${period.key} - ${client.name}`;
    const closing = await this.database.prisma.clientMonthlyClosing.upsert({
      where: { clientId_periodStart: { clientId: input.clientId, periodStart: period.start } },
      create: {
        clientId: input.clientId,
        periodStart: period.start,
        periodEnd: period.end,
        status: "DRAFT",
        title,
        summarySnapshot: json(summary),
        preparedById: principal.userId,
        preparedAt: new Date(),
      },
      update: {
        periodEnd: period.end,
        status: "DRAFT",
        title,
        summarySnapshot: json(summary),
        preparedById: principal.userId,
        preparedAt: new Date(),
        finalizedById: null,
        finalizedAt: null,
        archivedAt: null,
      },
      include: monthlyClosingInclude,
    });
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: HOURS_LEDGER_EVENT.closingPrepared,
        entityType: "ClientMonthlyClosing",
        entityId: closing.id,
        ...(existing ? { before: this.closingAuditSnapshot(existing) } : {}),
        after: this.closingAuditSnapshot(closing),
      },
      metadata,
    );
    return this.closingView(closing);
  }

  async finalizeClosing(id: string, principal: AuthenticatedPrincipal, metadata: RequestMetadata) {
    const closing = await this.requireClosing(id, principal);
    if (closing.status !== "DRAFT") {
      throw new ConflictException({
        code: "MONTHLY_CLOSING_NOT_FINALIZABLE",
        message: "Only draft monthly closings can be finalized",
      });
    }
    const updated = await this.database.prisma.clientMonthlyClosing.update({
      where: { id },
      data: {
        status: "FINALIZED",
        finalizedById: principal.userId,
        finalizedAt: new Date(),
        archivedAt: null,
      },
      include: monthlyClosingInclude,
    });
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: HOURS_LEDGER_EVENT.closingFinalized,
        entityType: "ClientMonthlyClosing",
        entityId: updated.id,
        before: this.closingAuditSnapshot(closing),
        after: this.closingAuditSnapshot(updated),
      },
      metadata,
    );
    return this.closingView(updated);
  }

  private timeEntryWhere(
    query: HoursLedgerQueryDto | MonthlyUsageQueryDto,
    principal: AuthenticatedPrincipal,
    period: PeriodWindow,
  ): Prisma.TimeEntryWhereInput {
    const base: Prisma.TimeEntryWhereInput = {
      requestId: { not: null },
      status:
        "status" in query && query.status
          ? query.status
          : { in: [...LEDGER_TRACKED_TIME_ENTRY_STATUSES] },
      workDate: { gte: period.start, lt: period.end },
      ...(query.clientId ? { request: { clientId: query.clientId } } : {}),
      ...("requestId" in query && query.requestId ? { requestId: query.requestId } : {}),
      ...("userId" in query && query.userId ? { userId: query.userId } : {}),
      ...("billable" in query && query.billable ? { billable: query.billable === "true" } : {}),
    };
    return {
      AND: [base, this.entryScopeWhere(principal)],
    };
  }

  private entryScopeWhere(principal: AuthenticatedPrincipal): Prisma.TimeEntryWhereInput {
    if (hasGlobalAccess(principal)) {
      return {};
    }

    const scoped: Prisma.TimeEntryWhereInput[] = [];
    const clientIds = optionalClientIdsFor(principal);
    if (principal.roles.includes(ACCOUNT_MANAGER_ROLE_CODE) && clientIds.length > 0) {
      scoped.push({ request: { clientId: { in: clientIds } } });
    }
    if (principal.roles.includes(SUPERVISOR_ROLE_CODE)) {
      scoped.push({
        OR: [{ request: { assignedSupervisorId: principal.userId } }, { userId: principal.userId }],
      });
    }
    if (principal.roles.includes(SPECIALIST_ROLE_CODE)) {
      scoped.push({
        OR: [{ request: { assignedSpecialistId: principal.userId } }, { userId: principal.userId }],
      });
    }
    if (principal.scopes.some((scope) => scope.type === "ASSIGNED_WORK")) {
      scoped.push({
        OR: [
          { request: { assignedSpecialistId: principal.userId } },
          { request: { assignedSupervisorId: principal.userId } },
          { userId: principal.userId },
        ],
      });
    }
    if (scoped.length === 0) {
      throw new ForbiddenException({
        code: "HOURS_LEDGER_SCOPE_REQUIRED",
        message: "This hours ledger view requires assigned work or assigned client access",
      });
    }
    return { OR: scoped };
  }

  private closingClientAccess(principal: AuthenticatedPrincipal): string[] | undefined {
    if (hasGlobalAccess(principal)) {
      return undefined;
    }
    const clientIds = optionalClientIdsFor(principal);
    if (!principal.roles.includes(ACCOUNT_MANAGER_ROLE_CODE) || clientIds.length === 0) {
      throw new ForbiddenException({
        code: "MONTHLY_CLOSING_SCOPE_REQUIRED",
        message:
          "Monthly closing actions require a global role or assigned account-manager client access",
      });
    }
    return clientIds;
  }

  private assertClosingClientAccess(clientId: string, principal: AuthenticatedPrincipal): void {
    const access = this.closingClientAccess(principal);
    if (!access || access.includes(clientId)) {
      return;
    }
    throw new ForbiddenException({
      code: "MONTHLY_CLOSING_CLIENT_SCOPE_DENIED",
      message: "You do not have access to this client's monthly closing",
    });
  }

  private async requireClosing(id: string, principal: AuthenticatedPrincipal) {
    const access = this.closingClientAccess(principal);
    const closing = await this.database.prisma.clientMonthlyClosing.findFirst({
      where: {
        id,
        ...(access ? { clientId: { in: access } } : {}),
      },
      include: monthlyClosingInclude,
    });
    if (!closing) {
      throw new NotFoundException({
        code: "MONTHLY_CLOSING_NOT_FOUND",
        message: "The monthly closing could not be found",
      });
    }
    return closing;
  }

  private async requireActiveClient(clientId: string) {
    const client = await this.database.prisma.client.findFirst({
      where: { id: clientId, status: "ACTIVE", archivedAt: null },
    });
    if (!client) {
      throw new BadRequestException({
        code: "ACTIVE_CLIENT_REQUIRED",
        message: "Monthly closings can only be prepared for active clients",
      });
    }
    return client;
  }

  private async buildClientHoursSummary(clientId: string, period: PeriodWindow) {
    const entries = await this.database.prisma.timeEntry.findMany({
      where: {
        request: { clientId },
        requestId: { not: null },
        status: { in: [...LEDGER_TRACKED_TIME_ENTRY_STATUSES] },
        workDate: { gte: period.start, lt: period.end },
      },
      include: timeEntryLedgerInclude,
      orderBy: [{ workDate: "asc" }, { createdAt: "asc" }],
    });
    const summary = this.summarizeEntries(entries, period);
    return {
      generatedAt: new Date().toISOString(),
      period: summary.period,
      totals: summary.totals,
      byStatus: summary.byStatus,
      byBillable: summary.byBillable,
      byClient: summary.byClient,
      byRequest: summary.byRequest,
      byService: summary.byService,
      byUser: summary.byUser,
      byMonth: summary.byMonth,
      entries: this.entryViews(entries),
    };
  }

  private summarizeEntries(entries: LedgerTimeEntry[], period: PeriodWindow) {
    const totals = emptyBucket();
    const byStatus: Record<string, HoursBucket> = {};
    const byBillable: Record<string, HoursBucket> = {};
    const byClient: Record<
      string,
      HoursBucket & { city: string | null; code: string; id: string; name: string; sector: string }
    > = {};
    const byRequest: Record<
      string,
      HoursBucket & {
        clientId: string;
        id: string;
        requestNumber: string;
        status: string;
        title: string;
      }
    > = {};
    const byService: Record<
      string,
      HoursBucket & {
        code: string;
        id: string;
        label: string;
        serviceLevelCode: string;
      }
    > = {};
    const byUser: Record<string, HoursBucket & { displayName: string; email: string; id: string }> =
      {};
    const byMonth: Record<string, HoursBucket & { month: string }> = {};

    for (const entry of entries) {
      if (!entry.request) {
        continue;
      }
      addHours(totals, entry);

      const statusBucket = (byStatus[entry.status] ??= emptyBucket());
      addHours(statusBucket, entry);

      const billableKey = entry.billable ? "billable" : "nonBillable";
      const billableBucket = (byBillable[billableKey] ??= emptyBucket());
      addHours(billableBucket, entry);

      const client = entry.request.client;
      const clientBucket = (byClient[client.id] ??= {
        ...emptyBucket(),
        city: client.city,
        code: client.code,
        id: client.id,
        name: client.name,
        sector: client.sector,
      });
      addHours(clientBucket, entry);

      const requestBucket = (byRequest[entry.request.id] ??= {
        ...emptyBucket(),
        clientId: entry.request.clientId,
        id: entry.request.id,
        requestNumber: entry.request.requestNumber,
        status: entry.request.status,
        title: entry.request.title,
      });
      addHours(requestBucket, entry);

      const service = entry.request.subscriptionService.monthlyServiceRevision;
      const serviceKey = service.monthlyService.id;
      const serviceBucket = (byService[serviceKey] ??= {
        ...emptyBucket(),
        code: service.monthlyService.code,
        id: service.monthlyService.id,
        label: service.nameEn,
        serviceLevelCode: entry.request.subscriptionService.serviceLevel.code,
      });
      addHours(serviceBucket, entry);

      const userBucket = (byUser[entry.user.id] ??= {
        ...emptyBucket(),
        displayName: entry.user.displayName,
        email: entry.user.email,
        id: entry.user.id,
      });
      addHours(userBucket, entry);

      const month = this.periodKey(entry.workDate);
      const monthBucket = (byMonth[month] ??= { ...emptyBucket(), month });
      addHours(monthBucket, entry);
    }

    return {
      generatedAt: new Date().toISOString(),
      period: {
        start: period.start.toISOString(),
        end: period.end.toISOString(),
        key: period.key,
      },
      totals: roundedBucket(totals),
      byStatus: Object.fromEntries(
        Object.entries(byStatus).map(([key, value]) => [key, roundedBucket(value)]),
      ),
      byBillable: Object.fromEntries(
        Object.entries(byBillable).map(([key, value]) => [key, roundedBucket(value)]),
      ),
      byClient: Object.values(byClient).map((item) => ({ ...item, ...roundedBucket(item) })),
      byRequest: Object.values(byRequest).map((item) => ({ ...item, ...roundedBucket(item) })),
      byService: Object.values(byService).map((item) => ({ ...item, ...roundedBucket(item) })),
      byUser: Object.values(byUser).map((item) => ({ ...item, ...roundedBucket(item) })),
      byMonth: Object.values(byMonth).map((item) => ({ ...item, ...roundedBucket(item) })),
    };
  }

  private entryViews(entries: LedgerTimeEntry[]) {
    return entries
      .map((entry) => this.entryView(entry))
      .filter((entry): entry is NonNullable<ReturnType<HoursLedgerService["entryView"]>> =>
        Boolean(entry),
      );
  }

  private entryView(entry: LedgerTimeEntry) {
    if (!entry.request) {
      return null;
    }
    return {
      id: entry.id,
      workDate: entry.workDate.toISOString(),
      hours: Number(entry.hours),
      billable: entry.billable,
      deductHours: entry.deductHours,
      status: entry.status,
      notes: entry.notes,
      submittedAt: entry.submittedAt?.toISOString() ?? null,
      decidedAt: entry.decidedAt?.toISOString() ?? null,
      decisionReason: entry.decisionReason,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      user: entry.user,
      decidedBy: entry.decidedBy,
      client: entry.request.client,
      request: {
        id: entry.request.id,
        requestNumber: entry.request.requestNumber,
        title: entry.request.title,
        status: entry.request.status,
        priority: entry.request.priority,
      },
      service: {
        subscriptionServiceId: entry.request.subscriptionService.id,
        hoursAllocated: Number(entry.request.subscriptionService.hoursAllocated),
        monthlyService: {
          id: entry.request.subscriptionService.monthlyServiceRevision.monthlyService.id,
          code: entry.request.subscriptionService.monthlyServiceRevision.monthlyService.code,
          revisionId: entry.request.subscriptionService.monthlyServiceRevision.id,
          nameAr: entry.request.subscriptionService.monthlyServiceRevision.nameAr,
          nameEn: entry.request.subscriptionService.monthlyServiceRevision.nameEn,
        },
        serviceLevel: entry.request.subscriptionService.serviceLevel,
        serviceItem: entry.request.serviceItemRevision
          ? {
              id: entry.request.serviceItemRevision.serviceItem.id,
              code: entry.request.serviceItemRevision.serviceItem.code,
              revisionId: entry.request.serviceItemRevision.id,
              nameAr: entry.request.serviceItemRevision.nameAr,
              nameEn: entry.request.serviceItemRevision.nameEn,
            }
          : null,
      },
    };
  }

  private closingView(closing: MonthlyClosingRecord) {
    return {
      id: closing.id,
      client: closing.client,
      periodStart: closing.periodStart.toISOString(),
      periodEnd: closing.periodEnd.toISOString(),
      period: this.periodKey(closing.periodStart),
      status: closing.status,
      title: closing.title,
      summary: closing.summarySnapshot,
      preparedBy: closing.preparedBy,
      finalizedBy: closing.finalizedBy,
      preparedAt: closing.preparedAt?.toISOString() ?? null,
      finalizedAt: closing.finalizedAt?.toISOString() ?? null,
      archivedAt: closing.archivedAt?.toISOString() ?? null,
      createdAt: closing.createdAt.toISOString(),
      updatedAt: closing.updatedAt.toISOString(),
    };
  }

  private closingAuditSnapshot(closing: {
    clientId: string;
    finalizedAt: Date | null;
    id: string;
    periodEnd: Date;
    periodStart: Date;
    preparedAt: Date | null;
    status: string;
    title: string;
  }) {
    return {
      id: closing.id,
      clientId: closing.clientId,
      periodStart: closing.periodStart.toISOString(),
      periodEnd: closing.periodEnd.toISOString(),
      status: closing.status,
      title: closing.title,
      preparedAt: closing.preparedAt?.toISOString() ?? null,
      finalizedAt: closing.finalizedAt?.toISOString() ?? null,
    };
  }

  private periodFromQuery(value: string | undefined): PeriodWindow {
    if (!value) {
      const now = new Date();
      return this.periodFromKey(
        `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`,
      );
    }
    return this.periodFromKey(value);
  }

  private periodFromKey(value: string): PeriodWindow {
    const [yearText, monthText] = value.split("-");
    const year = Number(yearText);
    const month = Number(monthText);
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      throw new BadRequestException({
        code: "INVALID_LEDGER_PERIOD",
        message: "Ledger period must use YYYY-MM format",
      });
    }
    return {
      key: value,
      start: new Date(Date.UTC(year, month - 1, 1)),
      end: new Date(Date.UTC(year, month, 1)),
    };
  }

  private periodKey(date: Date): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  }
}
