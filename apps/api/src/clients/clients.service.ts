import { BadRequestException, ConflictException, Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "@jzoom/database";
import { AuthAuditService } from "../auth/audit.service.js";
import type { RequestMetadata } from "../auth/auth.types.js";
import { PasswordHasherService } from "../auth/password-hasher.service.js";
import { CLIENT_ROLE_CODE } from "../client-portal/client-portal.constants.js";
import { DatabaseService } from "../database/database.service.js";
import { CLIENT_EVENT } from "./clients.constants.js";
import type {
  ClientLifecycleStatus,
  CreateClientDto,
  CreateClientPortalUserDto,
  UpdateClientDto,
} from "./clients.dto.js";

type DatabaseClientStatus = "DRAFT" | "ACTIVE" | "DISABLED" | "ARCHIVED";

const validTransitions: Record<DatabaseClientStatus, DatabaseClientStatus[]> = {
  DRAFT: ["ACTIVE", "DISABLED", "ARCHIVED"],
  ACTIVE: ["DISABLED", "ARCHIVED"],
  DISABLED: ["ACTIVE", "ARCHIVED"],
  ARCHIVED: [],
};

function toDatabaseStatus(status: ClientLifecycleStatus): DatabaseClientStatus {
  return status === "INACTIVE" ? "DISABLED" : status;
}

function toLifecycleStatus(status: DatabaseClientStatus): ClientLifecycleStatus {
  return status === "DISABLED" ? "INACTIVE" : status;
}

function optionalText(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function requireReason(status: DatabaseClientStatus, reason: string | undefined): void {
  if ((status === "DISABLED" || status === "ARCHIVED") && !reason?.trim()) {
    throw new BadRequestException({
      code: "CLIENT_STATUS_REASON_REQUIRED",
      message: "A reason is required when disabling or archiving a client",
    });
  }
}

const clientViewInclude = {
  assignments: {
    where: { roleCode: CLIENT_ROLE_CODE },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      roleCode: true,
      startsAt: true,
      endsAt: true,
      user: {
        select: {
          id: true,
          email: true,
          displayName: true,
          status: true,
        },
      },
    },
  },
  _count: {
    select: {
      assignments: true,
      contacts: true,
      quotes: true,
      requests: true,
    },
  },
} satisfies Prisma.ClientInclude;

type ClientViewRecord = Prisma.ClientGetPayload<{ include: typeof clientViewInclude }>;

@Injectable()
export class ClientsService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AuthAuditService) private readonly audit: AuthAuditService,
    @Inject(PasswordHasherService) private readonly passwords: PasswordHasherService,
  ) {}

  async list() {
    const clients = await this.database.prisma.client.findMany({
      orderBy: [{ status: "asc" }, { name: "asc" }, { code: "asc" }],
      include: this.viewInclude(),
    });

    return { clients: clients.map((client) => this.view(client)) };
  }

  async create(input: CreateClientDto, actorId: string, metadata: RequestMetadata) {
    const code = input.code.trim().toUpperCase();
    const existing = await this.database.prisma.client.findFirst({
      where: { code: { equals: code, mode: "insensitive" } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException({
        code: "CLIENT_CODE_ALREADY_EXISTS",
        message: "The client code is already in use",
      });
    }

    const created = await this.database.prisma.client.create({
      data: {
        code,
        ...this.clientData(input),
        status: input.status ?? "ACTIVE",
      },
      include: this.viewInclude(),
    });
    await this.audit.record(
      {
        actorId,
        eventCode: CLIENT_EVENT.created,
        entityType: "Client",
        entityId: created.id,
        after: {
          code: created.code,
          name: created.name,
          status: toLifecycleStatus(created.status),
        },
      },
      metadata,
    );
    return this.view(created);
  }

  async update(id: string, input: UpdateClientDto, actorId: string, metadata: RequestMetadata) {
    const before = await this.requireClient(id);
    if (before.status === "ARCHIVED") {
      throw new ConflictException({
        code: "ARCHIVED_CLIENT_IMMUTABLE",
        message: "Archived clients cannot be changed",
      });
    }

    const updated = await this.database.prisma.client.update({
      where: { id },
      data: this.clientData(input),
      include: this.viewInclude(),
    });
    await this.audit.record(
      {
        actorId,
        eventCode: CLIENT_EVENT.updated,
        entityType: "Client",
        entityId: id,
        before: this.auditView(before),
        after: this.auditView(updated),
      },
      metadata,
    );
    return this.view(updated);
  }

  async changeStatus(
    id: string,
    status: ClientLifecycleStatus,
    reason: string | undefined,
    actorId: string,
    metadata: RequestMetadata,
  ) {
    const before = await this.requireClient(id);
    const target = toDatabaseStatus(status);
    requireReason(target, reason);
    if (before.status === target || !validTransitions[before.status].includes(target)) {
      throw new ConflictException({
        code: "INVALID_CLIENT_STATUS_TRANSITION",
        message: `Client status cannot change from ${toLifecycleStatus(before.status)} to ${status}`,
      });
    }

    const updated = await this.database.prisma.client.update({
      where: { id },
      data: {
        status: target,
        archivedAt: target === "ARCHIVED" ? new Date() : null,
      },
      include: this.viewInclude(),
    });
    await this.audit.record(
      {
        actorId,
        eventCode: CLIENT_EVENT.statusChanged,
        entityType: "Client",
        entityId: id,
        before: { status: toLifecycleStatus(before.status) },
        after: { status: toLifecycleStatus(updated.status) },
        ...(reason ? { reason } : {}),
        severity: target === "ARCHIVED" ? "HIGH" : "MEDIUM",
      },
      metadata,
    );
    return this.view(updated);
  }

  async createPortalUser(
    id: string,
    input: CreateClientPortalUserDto,
    actorId: string,
    metadata: RequestMetadata,
  ) {
    const client = await this.requireClient(id);
    if (client.status === "ARCHIVED") {
      throw new ConflictException({
        code: "ARCHIVED_CLIENT_IMMUTABLE",
        message: "Archived clients cannot receive portal users",
      });
    }

    const email = input.email.trim().toLowerCase();
    const displayName = input.displayName.trim();
    const existing = await this.database.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException({
        code: "CLIENT_PORTAL_USER_EMAIL_ALREADY_EXISTS",
        message: "The email is already assigned to another user",
      });
    }

    const role = await this.database.prisma.role.findUnique({
      where: { code: CLIENT_ROLE_CODE },
      select: { id: true, status: true },
    });
    if (!role || role.status !== "ACTIVE") {
      throw new BadRequestException({
        code: "CLIENT_ROLE_NOT_CONFIGURED",
        message: "The client role is not configured",
      });
    }

    const now = new Date();
    const passwordHash = await this.passwords.hash(input.password);
    const created = await this.database.prisma.user.create({
      data: {
        email,
        displayName,
        preferredLocale: input.preferredLocale ?? "ar",
        userType: "EXTERNAL",
        status: "ACTIVE",
        passwordHash,
        passwordChangedAt: now,
        roles: {
          create: {
            roleId: role.id,
          },
        },
        clientAssignments: {
          create: {
            clientId: id,
            roleCode: CLIENT_ROLE_CODE,
            startsAt: now,
          },
        },
      },
      select: {
        id: true,
        email: true,
        displayName: true,
      },
    });

    await this.audit.record(
      {
        actorId,
        eventCode: CLIENT_EVENT.portalUserCreated,
        entityType: "User",
        entityId: created.id,
        after: {
          clientId: id,
          clientCode: client.code,
          email: created.email,
          displayName: created.displayName,
          roleCode: CLIENT_ROLE_CODE,
        },
        severity: "HIGH",
      },
      metadata,
    );

    return this.view(await this.requireClient(id));
  }

  private clientData(input: CreateClientDto | UpdateClientDto) {
    return {
      name: input.name.trim(),
      legalName: optionalText(input.legalName),
      commercialRegistration: optionalText(input.commercialRegistration),
      sector: input.sector.trim(),
      city: optionalText(input.city),
      employeesCount: input.employeesCount ?? 0,
      branchesCount: input.branchesCount ?? 0,
      transactionVolume: optionalText(input.transactionVolume),
      operationalComplexity: optionalText(input.operationalComplexity),
      dataReadiness: optionalText(input.dataReadiness),
      urgency: optionalText(input.urgency),
      billingContact: optionalText(input.billingContact),
      authorizedApprover: input.authorizedApprover.trim(),
    };
  }

  private viewInclude() {
    return clientViewInclude;
  }

  private async requireClient(id: string) {
    const client = await this.database.prisma.client.findUnique({
      where: { id },
      include: this.viewInclude(),
    });
    if (!client) {
      throw new BadRequestException({
        code: "CLIENT_NOT_FOUND",
        message: "The client could not be found",
      });
    }
    return client;
  }

  private view(client: ClientViewRecord) {
    return {
      id: client.id,
      code: client.code,
      name: client.name,
      legalName: client.legalName,
      commercialRegistration: client.commercialRegistration,
      sector: client.sector,
      city: client.city,
      employeesCount: client.employeesCount,
      branchesCount: client.branchesCount,
      transactionVolume: client.transactionVolume,
      operationalComplexity: client.operationalComplexity,
      dataReadiness: client.dataReadiness,
      urgency: client.urgency,
      billingContact: client.billingContact,
      authorizedApprover: client.authorizedApprover,
      status: toLifecycleStatus(client.status),
      archivedAt: client.archivedAt?.toISOString() ?? null,
      createdAt: client.createdAt.toISOString(),
      updatedAt: client.updatedAt.toISOString(),
      counts: {
        assignments: client._count.assignments,
        contacts: client._count.contacts,
        quotes: client._count.quotes,
        requests: client._count.requests,
      },
      users: client.assignments.map((assignment) => ({
        id: assignment.user.id,
        email: assignment.user.email,
        displayName: assignment.user.displayName,
        status: assignment.user.status,
        roleCode: assignment.roleCode,
        startsAt: assignment.startsAt.toISOString(),
        endsAt: assignment.endsAt?.toISOString() ?? null,
      })),
    };
  }

  private auditView(client: ClientViewRecord) {
    return {
      code: client.code,
      name: client.name,
      sector: client.sector,
      city: client.city,
      authorizedApprover: client.authorizedApprover,
      billingContact: client.billingContact,
      status: toLifecycleStatus(client.status),
    };
  }
}
