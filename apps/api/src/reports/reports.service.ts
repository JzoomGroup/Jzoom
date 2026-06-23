import {
  BadRequestException,
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
import { NotificationsService } from "../notifications/notifications.service.js";
import { ACCOUNT_MANAGER_ROLE_CODE, CLIENT_ROLE_CODE, REPORT_EVENT } from "./reports.constants.js";
import type { MonthlyReportQueryDto, PrepareMonthlyReportDto } from "./reports.dto.js";

const terminalRequestStatuses = ["CLOSED", "REJECTED"] as const;

interface MonthlyReportRecord {
  client: { city: string | null; code: string; id: string; name: string; sector: string };
  clientId: string;
  createdAt: Date;
  id: string;
  periodEnd: Date;
  periodStart: Date;
  preparedAt: Date | null;
  preparedBy: { displayName: string; email: string; id: string } | null;
  publishedAt: Date | null;
  status: string;
  summarySnapshot: unknown;
  title: string;
  updatedAt: Date;
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

@Injectable()
export class ReportsService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AuthAuditService) private readonly audit: AuthAuditService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  async listMonthlyReports(query: MonthlyReportQueryDto, principal: AuthenticatedPrincipal) {
    const access = this.internalClientAccess(principal);
    const period = query.period ? this.periodFromKey(query.period) : undefined;
    if (query.clientId) {
      this.assertInternalClientAccess(query.clientId, principal);
    }
    const reports = await this.database.prisma.clientMonthlyReport.findMany({
      where: {
        ...(access ? { clientId: { in: access } } : {}),
        ...(query.clientId ? { clientId: query.clientId } : {}),
        ...(period ? { periodStart: period.start } : {}),
        status: { not: "ARCHIVED" },
      },
      include: {
        client: { select: { id: true, code: true, name: true, sector: true, city: true } },
        preparedBy: { select: { id: true, email: true, displayName: true } },
      },
      orderBy: [{ periodStart: "desc" }, { createdAt: "desc" }],
    });
    return reports.map((report) => this.reportView(report, false));
  }

  async getMonthlyReport(id: string, principal: AuthenticatedPrincipal, metadata: RequestMetadata) {
    const report = await this.requireInternalReport(id, principal);
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: REPORT_EVENT.monthlyReportViewed,
        entityType: "ClientMonthlyReport",
        entityId: report.id,
        after: { clientId: report.clientId, periodStart: report.periodStart.toISOString() },
      },
      metadata,
    );
    return this.reportView(report, false);
  }

  async prepareMonthlyReport(
    input: PrepareMonthlyReportDto,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    this.assertInternalClientAccess(input.clientId, principal);
    const client = await this.requireActiveClient(input.clientId);
    const period = this.periodFromKey(input.period);
    const existing = await this.database.prisma.clientMonthlyReport.findUnique({
      where: { clientId_periodStart: { clientId: input.clientId, periodStart: period.start } },
      select: { id: true, status: true },
    });
    if (existing?.status === "PUBLISHED") {
      throw new BadRequestException({
        code: "MONTHLY_REPORT_ALREADY_PUBLISHED",
        message: "Published monthly report snapshots cannot be refreshed",
      });
    }
    const summary = await this.buildMonthlySummary(input.clientId, period.start, period.end);
    const title = input.title?.trim() || `Monthly report ${period.key} - ${client.name}`;
    const report = await this.database.prisma.clientMonthlyReport.upsert({
      where: { clientId_periodStart: { clientId: input.clientId, periodStart: period.start } },
      create: {
        clientId: input.clientId,
        periodStart: period.start,
        periodEnd: period.end,
        status: "PREPARED",
        title,
        summarySnapshot: json(summary),
        preparedById: principal.userId,
        preparedAt: new Date(),
      },
      update: {
        periodEnd: period.end,
        status: "PREPARED",
        title,
        summarySnapshot: json(summary),
        preparedById: principal.userId,
        preparedAt: new Date(),
        publishedAt: null,
        archivedAt: null,
      },
      include: {
        client: { select: { id: true, code: true, name: true, sector: true, city: true } },
        preparedBy: { select: { id: true, email: true, displayName: true } },
      },
    });
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: REPORT_EVENT.monthlyReportPrepared,
        entityType: "ClientMonthlyReport",
        entityId: report.id,
        after: this.reportAuditSnapshot(report),
      },
      metadata,
    );
    return this.reportView(report, false);
  }

  async publishMonthlyReport(
    id: string,
    principal: AuthenticatedPrincipal,
    metadata: RequestMetadata,
  ) {
    const report = await this.requireInternalReport(id, principal);
    if (!["DRAFT", "PREPARED"].includes(report.status)) {
      throw new BadRequestException({
        code: "MONTHLY_REPORT_NOT_PUBLISHABLE",
        message: "Only draft or prepared monthly reports can be published",
      });
    }
    const updated = await this.database.prisma.clientMonthlyReport.update({
      where: { id },
      data: { status: "PUBLISHED", publishedAt: new Date(), archivedAt: null },
      include: {
        client: { select: { id: true, code: true, name: true, sector: true, city: true } },
        preparedBy: { select: { id: true, email: true, displayName: true } },
      },
    });
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: REPORT_EVENT.monthlyReportPublished,
        entityType: "ClientMonthlyReport",
        entityId: updated.id,
        before: this.reportAuditSnapshot(report),
        after: this.reportAuditSnapshot(updated),
      },
      metadata,
    );
    await this.notifications.notifyUsers({
      aggregateType: "ClientMonthlyReport",
      aggregateId: updated.id,
      event: REPORT_EVENT.monthlyReportPublished,
      targetType: "ClientMonthlyReport",
      targetId: updated.id,
      messageEn: `Monthly report ${this.periodKey(updated.periodStart)} is ready.`,
      messageAr: `تقرير شهر ${this.periodKey(updated.periodStart)} جاهز.`,
      deepLink: `/client/reports/${updated.id}`,
      recipientUserIds: await this.clientUserIds(updated.clientId),
      payload: {
        clientId: updated.clientId,
        periodStart: updated.periodStart.toISOString(),
        periodEnd: updated.periodEnd.toISOString(),
      },
    });
    return this.reportView(updated, false);
  }

  async listClientReports(principal: AuthenticatedPrincipal) {
    const reports = await this.database.prisma.clientMonthlyReport.findMany({
      where: {
        clientId: { in: this.clientIdsFor(principal) },
        status: "PUBLISHED",
      },
      include: {
        client: { select: { id: true, code: true, name: true, sector: true, city: true } },
        preparedBy: { select: { id: true, email: true, displayName: true } },
      },
      orderBy: [{ periodStart: "desc" }, { createdAt: "desc" }],
    });
    return reports.map((report) => this.reportView(report, true));
  }

  async getClientReport(id: string, principal: AuthenticatedPrincipal, metadata: RequestMetadata) {
    const report = await this.database.prisma.clientMonthlyReport.findFirst({
      where: {
        id,
        clientId: { in: this.clientIdsFor(principal) },
        status: "PUBLISHED",
      },
      include: {
        client: { select: { id: true, code: true, name: true, sector: true, city: true } },
        preparedBy: { select: { id: true, email: true, displayName: true } },
      },
    });
    if (!report) {
      throw new NotFoundException({
        code: "CLIENT_MONTHLY_REPORT_NOT_FOUND",
        message: "The monthly report could not be found",
      });
    }
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: REPORT_EVENT.clientMonthlyReportViewed,
        entityType: "ClientMonthlyReport",
        entityId: report.id,
        after: { clientId: report.clientId, periodStart: report.periodStart.toISOString() },
      },
      metadata,
    );
    return this.reportView(report, true);
  }

  async accountManagerPortfolio(principal: AuthenticatedPrincipal, metadata: RequestMetadata) {
    const access = this.internalClientAccess(principal);
    const now = new Date();
    const month = this.currentPeriod();
    const clients = await this.database.prisma.client.findMany({
      where: {
        ...(access ? { id: { in: access } } : {}),
        status: "ACTIVE",
        archivedAt: null,
      },
      orderBy: { name: "asc" },
      include: {
        assignments: {
          where: {
            roleCode: ACCOUNT_MANAGER_ROLE_CODE,
            startsAt: { lte: now },
            OR: [{ endsAt: null }, { endsAt: { gt: now } }],
          },
          include: { user: { select: { id: true, email: true, displayName: true } } },
        },
      },
    });
    const portfolio = await Promise.all(
      clients.map(async (client) => {
        const [
          openRequests,
          overdueRequests,
          waitingClientRequests,
          returnedOutputs,
          overdueDocumentRequests,
          approvedHours,
          recentActivity,
        ] = await Promise.all([
          this.database.prisma.request.count({
            where: { clientId: client.id, status: { notIn: [...terminalRequestStatuses] } },
          }),
          this.database.prisma.request.count({
            where: {
              clientId: client.id,
              status: { notIn: [...terminalRequestStatuses] },
              dueAt: { lt: now },
            },
          }),
          this.database.prisma.request.count({
            where: { clientId: client.id, status: "WAITING_CLIENT" },
          }),
          this.database.prisma.requestOutput.count({
            where: { request: { clientId: client.id }, status: "RETURNED_BY_CLIENT" },
          }),
          this.database.prisma.clientDocumentRequest.count({
            where: {
              request: { clientId: client.id },
              status: "REQUESTED",
              dueAt: { lt: now },
            },
          }),
          this.database.prisma.timeEntry.aggregate({
            where: {
              request: { clientId: client.id },
              status: "APPROVED",
              workDate: { gte: month.start, lt: month.end },
            },
            _sum: { hours: true },
          }),
          this.database.prisma.workflowEvent.findMany({
            where: { request: { clientId: client.id } },
            orderBy: { occurredAt: "desc" },
            take: 5,
            select: {
              id: true,
              actorRole: true,
              reason: true,
              metadata: true,
              occurredAt: true,
              request: { select: { id: true, requestNumber: true, title: true, status: true } },
            },
          }),
        ]);
        return {
          client: {
            id: client.id,
            code: client.code,
            name: client.name,
            sector: client.sector,
            city: client.city,
          },
          accountManagers: client.assignments.map((assignment) => assignment.user),
          indicators: {
            openRequests,
            overdueRequests,
            waitingClientRequests,
            returnedOutputs,
            overdueDocumentRequests,
            approvedHoursThisMonth: Number(approvedHours._sum.hours ?? 0),
          },
          health: this.healthIndicator({
            openRequests,
            overdueRequests,
            overdueDocumentRequests,
            returnedOutputs,
            waitingClientRequests,
          }),
          recentActivity: recentActivity.map((event) => ({
            id: event.id,
            actorRole: event.actorRole,
            reason: event.reason,
            metadata: event.metadata,
            occurredAt: event.occurredAt.toISOString(),
            request: event.request,
          })),
        };
      }),
    );
    await this.audit.record(
      {
        actorId: principal.userId,
        eventCode: REPORT_EVENT.accountManagerPortfolioViewed,
        entityType: "AccountManagerPortfolio",
        entityId: principal.userId,
        after: { clientCount: portfolio.length },
      },
      metadata,
    );
    return {
      generatedAt: new Date().toISOString(),
      portfolio,
    };
  }

  private async buildMonthlySummary(clientId: string, start: Date, end: Date) {
    const client = await this.database.prisma.client.findUniqueOrThrow({
      where: { id: clientId },
      select: { id: true, code: true, name: true, sector: true, city: true },
    });
    const [
      requestGroups,
      outputGroups,
      documentGroups,
      timeGroups,
      finalizedClosing,
      recentActivity,
      requestTotal,
      outputTotal,
      documentTotal,
    ] = await Promise.all([
      this.database.prisma.request.groupBy({
        by: ["status"],
        where: { clientId, createdAt: { gte: start, lt: end } },
        _count: { _all: true },
      }),
      this.database.prisma.requestOutput.groupBy({
        by: ["status"],
        where: { request: { clientId }, createdAt: { gte: start, lt: end } },
        _count: { _all: true },
      }),
      this.database.prisma.clientDocumentRequest.groupBy({
        by: ["status"],
        where: { request: { clientId }, createdAt: { gte: start, lt: end } },
        _count: { _all: true },
      }),
      this.database.prisma.timeEntry.groupBy({
        by: ["status"],
        where: { request: { clientId }, workDate: { gte: start, lt: end } },
        _sum: { hours: true },
        _count: { _all: true },
      }),
      this.database.prisma.clientMonthlyClosing.findFirst({
        where: { clientId, periodStart: start, status: "FINALIZED" },
        select: {
          id: true,
          title: true,
          status: true,
          summarySnapshot: true,
          preparedAt: true,
          finalizedAt: true,
        },
      }),
      this.database.prisma.workflowEvent.findMany({
        where: {
          request: { clientId },
          occurredAt: { gte: start, lt: end },
          OR: [
            { metadata: { path: ["eventCode"], equals: "REQUEST_OUTPUT_SHARED_WITH_CLIENT" } },
            { metadata: { path: ["eventCode"], equals: "REQUEST_OUTPUT_CLIENT_ACCEPTED" } },
            { metadata: { path: ["eventCode"], equals: "REQUEST_OUTPUT_CLIENT_RETURNED" } },
            { metadata: { path: ["eventCode"], equals: "REQUEST_CLIENT_DOCUMENT_UPLOADED" } },
          ],
        },
        orderBy: { occurredAt: "desc" },
        take: 8,
        select: {
          id: true,
          reason: true,
          metadata: true,
          occurredAt: true,
          request: { select: { id: true, requestNumber: true, title: true, status: true } },
        },
      }),
      this.database.prisma.request.count({
        where: { clientId, createdAt: { gte: start, lt: end } },
      }),
      this.database.prisma.requestOutput.count({
        where: { request: { clientId }, createdAt: { gte: start, lt: end } },
      }),
      this.database.prisma.clientDocumentRequest.count({
        where: { request: { clientId }, createdAt: { gte: start, lt: end } },
      }),
    ]);
    const liveHoursSummary = this.liveHoursSummary(timeGroups);
    const closingHoursSummary = finalizedClosing
      ? this.hoursSummaryFromClosing(finalizedClosing.summarySnapshot)
      : null;
    return {
      client,
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
        key: this.periodKey(start),
      },
      requests: {
        total: requestTotal,
        byStatus: Object.fromEntries(requestGroups.map((row) => [row.status, row._count._all])),
      },
      outputs: {
        total: outputTotal,
        byStatus: Object.fromEntries(outputGroups.map((row) => [row.status, row._count._all])),
      },
      documentRequests: {
        total: documentTotal,
        byStatus: Object.fromEntries(documentGroups.map((row) => [row.status, row._count._all])),
      },
      hours: closingHoursSummary ?? liveHoursSummary,
      monthlyClosing: finalizedClosing
        ? {
            id: finalizedClosing.id,
            title: finalizedClosing.title,
            status: finalizedClosing.status,
            source: "FINALIZED_CLOSING",
            preparedAt: finalizedClosing.preparedAt?.toISOString() ?? null,
            finalizedAt: finalizedClosing.finalizedAt?.toISOString() ?? null,
          }
        : null,
      recentClientSafeActivity: recentActivity.map((event) => ({
        id: event.id,
        reason: event.reason,
        metadata: event.metadata,
        occurredAt: event.occurredAt.toISOString(),
        request: event.request,
      })),
    };
  }

  private liveHoursSummary(
    timeGroups: Array<{
      _count: { _all: number };
      _sum: { hours: { toString(): string } | null };
      status: string;
    }>,
  ) {
    const byStatus = Object.fromEntries(
      timeGroups.map((row) => [
        row.status,
        {
          count: row._count._all,
          hours: Number(row._sum.hours ?? 0),
        },
      ]),
    ) as Record<string, { count: number; hours: number }>;
    return {
      entries: timeGroups.reduce((total, row) => total + row._count._all, 0),
      byStatus,
      total: timeGroups.reduce((total, row) => total + Number(row._sum.hours ?? 0), 0),
      approvedTotal: byStatus.APPROVED?.hours ?? 0,
      source: "LIVE_TIME_ENTRIES",
    };
  }

  private hoursSummaryFromClosing(value: unknown) {
    if (!value || typeof value !== "object") {
      return null;
    }
    const summary = value as {
      byStatus?: Record<string, { entries?: unknown; hours?: unknown }>;
      totals?: {
        approvedHours?: unknown;
        billableHours?: unknown;
        entries?: unknown;
        hours?: unknown;
        nonBillableHours?: unknown;
      };
    };
    if (!summary.totals) {
      return null;
    }
    const byStatus = Object.fromEntries(
      Object.entries(summary.byStatus ?? {}).map(([status, bucket]) => [
        status,
        {
          count: this.numberFrom(bucket.entries),
          hours: this.numberFrom(bucket.hours),
        },
      ]),
    );
    return {
      entries: this.numberFrom(summary.totals.entries),
      byStatus,
      total: this.numberFrom(summary.totals.hours),
      approvedTotal: this.numberFrom(summary.totals.approvedHours),
      billableHours: this.numberFrom(summary.totals.billableHours),
      nonBillableHours: this.numberFrom(summary.totals.nonBillableHours),
      source: "FINALIZED_CLOSING",
    };
  }

  private numberFrom(value: unknown): number {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  }

  private internalClientAccess(principal: AuthenticatedPrincipal): string[] | undefined {
    if (hasGlobalAccess(principal)) {
      return undefined;
    }
    const clientIds = optionalClientIdsFor(principal);
    if (!principal.roles.includes(ACCOUNT_MANAGER_ROLE_CODE) || clientIds.length === 0) {
      throw new ForbiddenException({
        code: "ACCOUNT_MANAGER_SCOPE_REQUIRED",
        message: "This view requires an assigned account-manager client portfolio",
      });
    }
    return clientIds;
  }

  private assertInternalClientAccess(clientId: string, principal: AuthenticatedPrincipal): void {
    const access = this.internalClientAccess(principal);
    if (!access || access.includes(clientId)) {
      return;
    }
    throw new ForbiddenException({
      code: "REPORT_CLIENT_SCOPE_DENIED",
      message: "You do not have access to this client report",
    });
  }

  private async requireInternalReport(id: string, principal: AuthenticatedPrincipal) {
    const access = this.internalClientAccess(principal);
    const report = await this.database.prisma.clientMonthlyReport.findFirst({
      where: {
        id,
        ...(access ? { clientId: { in: access } } : {}),
      },
      include: {
        client: { select: { id: true, code: true, name: true, sector: true, city: true } },
        preparedBy: { select: { id: true, email: true, displayName: true } },
      },
    });
    if (!report) {
      throw new NotFoundException({
        code: "MONTHLY_REPORT_NOT_FOUND",
        message: "The monthly report could not be found",
      });
    }
    return report;
  }

  private async requireActiveClient(clientId: string) {
    const client = await this.database.prisma.client.findFirst({
      where: { id: clientId, status: "ACTIVE", archivedAt: null },
    });
    if (!client) {
      throw new BadRequestException({
        code: "ACTIVE_CLIENT_REQUIRED",
        message: "Monthly reports can only be prepared for active clients",
      });
    }
    return client;
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

  private clientIdsFor(principal: AuthenticatedPrincipal): string[] {
    const clientIds = optionalClientIdsFor(principal);
    if (clientIds.length === 0) {
      throw new ForbiddenException({
        code: "CLIENT_PORTAL_SCOPE_REQUIRED",
        message: "A client portal account must be scoped to at least one client",
      });
    }
    return clientIds;
  }

  private periodFromKey(value: string): { end: Date; key: string; start: Date } {
    const [yearText, monthText] = value.split("-");
    const year = Number(yearText);
    const month = Number(monthText);
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      throw new BadRequestException({
        code: "INVALID_REPORT_PERIOD",
        message: "Report period must use YYYY-MM format",
      });
    }
    return {
      key: value,
      start: new Date(Date.UTC(year, month - 1, 1)),
      end: new Date(Date.UTC(year, month, 1)),
    };
  }

  private currentPeriod(): { end: Date; key: string; start: Date } {
    const now = new Date();
    return this.periodFromKey(
      `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`,
    );
  }

  private periodKey(date: Date): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  private reportView(report: MonthlyReportRecord, clientSafe: boolean) {
    return {
      id: report.id,
      client: report.client,
      periodStart: report.periodStart.toISOString(),
      periodEnd: report.periodEnd.toISOString(),
      period: this.periodKey(report.periodStart),
      status: report.status,
      title: report.title,
      summary: report.summarySnapshot,
      preparedBy: clientSafe ? null : report.preparedBy,
      preparedAt: report.preparedAt?.toISOString() ?? null,
      publishedAt: report.publishedAt?.toISOString() ?? null,
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
    };
  }

  private reportAuditSnapshot(report: {
    clientId: string;
    id: string;
    periodEnd: Date;
    periodStart: Date;
    status: string;
    title: string;
  }) {
    return {
      id: report.id,
      clientId: report.clientId,
      periodStart: report.periodStart.toISOString(),
      periodEnd: report.periodEnd.toISOString(),
      status: report.status,
      title: report.title,
    };
  }

  private healthIndicator(input: {
    openRequests: number;
    overdueDocumentRequests: number;
    overdueRequests: number;
    returnedOutputs: number;
    waitingClientRequests: number;
  }) {
    if (
      input.overdueRequests > 0 ||
      input.overdueDocumentRequests > 0 ||
      input.returnedOutputs > 0
    ) {
      return {
        code: "ATTENTION",
        label: "Needs attention",
        reason: "Overdue work, overdue documents, or returned outputs exist.",
      };
    }
    if (input.waitingClientRequests > 0 || input.openRequests > 5) {
      return {
        code: "WATCH",
        label: "Watch",
        reason: "Open requests or client-waiting work should be monitored.",
      };
    }
    return {
      code: "HEALTHY",
      label: "Healthy",
      reason: "No immediate account attention indicator is present.",
    };
  }
}
