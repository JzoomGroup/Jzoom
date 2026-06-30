import { BadRequestException, ConflictException, Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "@jzoom/database";
import { DatabaseService } from "../database/database.service.js";
import {
  ADMIN_ROLE_CODE,
  CRITICAL_ADMIN_PERMISSIONS,
  DEFAULT_TEMPORARY_PASSWORD,
} from "./auth.constants.js";
import { AuthAuditService } from "./audit.service.js";
import { PasswordHasherService } from "./password-hasher.service.js";
import { TokenService } from "./token.service.js";
import type { RequestMetadata } from "./auth.types.js";
import type {
  CreateOperatingUserDto,
  InviteUserDto,
  OperatingUserScopeDto,
  UpdateOperatingUserScopeDto,
} from "./auth.dto.js";

const ACCOUNT_MANAGER_ROLE_CODE = "ROLE-AM";
const MANAGEMENT_ROLE_CODE = "ROLE-MGMT";
const SPECIALIST_ROLE_CODE = "ROLE-SPECIALIST";
const SUPERVISOR_ROLE_CODE = "ROLE-SUPERVISOR";
const operatingRoleCodes = [
  SPECIALIST_ROLE_CODE,
  SUPERVISOR_ROLE_CODE,
  ACCOUNT_MANAGER_ROLE_CODE,
  MANAGEMENT_ROLE_CODE,
  ADMIN_ROLE_CODE,
] as const;
const clientPortfolioRoleCodes = [ACCOUNT_MANAGER_ROLE_CODE] as const;

type OperatingRoleCode = (typeof operatingRoleCodes)[number];
type AdminAccessTransaction = Prisma.TransactionClient;

@Injectable()
export class AdminAccessService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(TokenService) private readonly tokens: TokenService,
    @Inject(PasswordHasherService) private readonly passwords: PasswordHasherService,
    @Inject(AuthAuditService) private readonly audit: AuthAuditService,
  ) {}

  async listUsers() {
    const [users, clients, roles, monthlyServices, serviceItems, oneTimeServices] =
      await Promise.all([
        this.database.prisma.user.findMany({
          orderBy: [{ status: "asc" }, { displayName: "asc" }],
          select: {
            id: true,
            email: true,
            displayName: true,
            preferredLocale: true,
            userType: true,
            status: true,
            lockedUntil: true,
            lastLoginAt: true,
            passwordChangedAt: true,
            sessionVersion: true,
            createdAt: true,
            updatedAt: true,
            roles: {
              select: {
                role: {
                  select: {
                    code: true,
                    name: true,
                    nameAr: true,
                    nameEn: true,
                    status: true,
                  },
                },
              },
              orderBy: { role: { sortOrder: "asc" } },
            },
            scopes: {
              select: {
                scopeType: true,
                client: { select: { id: true, code: true, name: true } },
                domain: true,
                teamCode: true,
              },
              orderBy: { scopeType: "asc" },
            },
            clientAssignments: {
              select: {
                roleCode: true,
                startsAt: true,
                endsAt: true,
                client: { select: { id: true, code: true, name: true } },
              },
              orderBy: { startsAt: "desc" },
            },
            specialistServiceScopes: {
              where: { status: "ACTIVE" },
              select: {
                id: true,
                isPrimary: true,
                status: true,
                startsAt: true,
                endsAt: true,
                client: { select: { id: true, code: true, name: true } },
                monthlyService: {
                  select: {
                    id: true,
                    code: true,
                    revisions: {
                      where: { status: "ACTIVE" },
                      orderBy: [{ effectiveFrom: "desc" }, { version: "desc" }],
                      take: 1,
                      select: { nameAr: true, nameEn: true },
                    },
                  },
                },
                serviceItem: {
                  select: {
                    id: true,
                    code: true,
                    monthlyServiceId: true,
                    revisions: {
                      where: { status: "ACTIVE" },
                      orderBy: [{ effectiveFrom: "desc" }, { version: "desc" }],
                      take: 1,
                      select: { nameAr: true, nameEn: true },
                    },
                  },
                },
                oneTimeService: {
                  select: {
                    id: true,
                    code: true,
                    serviceLine: true,
                    revisions: {
                      where: { status: "ACTIVE" },
                      orderBy: [{ effectiveFrom: "desc" }, { version: "desc" }],
                      take: 1,
                      select: { nameAr: true, nameEn: true },
                    },
                  },
                },
              },
              orderBy: [{ clientId: "asc" }, { startsAt: "desc" }],
            },
            assignedSupervisors: {
              where: { status: "ACTIVE" },
              select: {
                id: true,
                startsAt: true,
                endsAt: true,
                client: { select: { id: true, code: true, name: true } },
                supervisor: { select: { id: true, email: true, displayName: true } },
              },
              orderBy: [{ startsAt: "desc" }],
            },
            supervisedSpecialists: {
              where: { status: "ACTIVE" },
              select: {
                id: true,
                startsAt: true,
                endsAt: true,
                client: { select: { id: true, code: true, name: true } },
                specialist: { select: { id: true, email: true, displayName: true } },
              },
              orderBy: [{ startsAt: "desc" }],
            },
            permissionOverrides: {
              select: {
                effect: true,
                reason: true,
                expiresAt: true,
                permission: {
                  select: {
                    code: true,
                    name: true,
                    module: true,
                    action: true,
                  },
                },
              },
              orderBy: { createdAt: "desc" },
            },
          },
        }),
        this.database.prisma.client.findMany({
          where: { status: "ACTIVE", archivedAt: null },
          orderBy: [{ name: "asc" }],
          select: { id: true, code: true, name: true },
        }),
        this.database.prisma.role.findMany({
          where: { code: { in: [...operatingRoleCodes] }, status: "ACTIVE" },
          orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
          select: { id: true, code: true, name: true, nameAr: true, nameEn: true, status: true },
        }),
        this.database.prisma.monthlyService.findMany({
          where: { status: "ACTIVE", archivedAt: null },
          orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
          select: {
            id: true,
            code: true,
            revisions: {
              where: { status: "ACTIVE" },
              orderBy: [{ effectiveFrom: "desc" }, { version: "desc" }],
              take: 1,
              select: { nameAr: true, nameEn: true, domain: true, serviceLine: true },
            },
          },
        }),
        this.database.prisma.serviceItem.findMany({
          where: { status: "ACTIVE", archivedAt: null },
          orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
          select: {
            id: true,
            code: true,
            monthlyServiceId: true,
            monthlyService: { select: { id: true, code: true } },
            revisions: {
              where: { status: "ACTIVE" },
              orderBy: [{ effectiveFrom: "desc" }, { version: "desc" }],
              take: 1,
              select: { nameAr: true, nameEn: true, requestType: true },
            },
          },
        }),
        this.database.prisma.oneTimeService.findMany({
          where: { status: "ACTIVE", archivedAt: null },
          orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
          select: {
            id: true,
            code: true,
            serviceLine: true,
            revisions: {
              where: { status: "ACTIVE" },
              orderBy: [{ effectiveFrom: "desc" }, { version: "desc" }],
              take: 1,
              select: { nameAr: true, nameEn: true },
            },
          },
        }),
      ]);

    return {
      users: users.map((user) => ({
        ...user,
        mustChangePassword: user.passwordChangedAt === null,
        roles: user.roles.map(({ role }) => role),
        specialistServiceScopes: user.specialistServiceScopes.map((scope) => ({
          ...scope,
          monthlyService: scope.monthlyService
            ? {
                id: scope.monthlyService.id,
                code: scope.monthlyService.code,
                nameAr: scope.monthlyService.revisions[0]?.nameAr ?? scope.monthlyService.code,
                nameEn: scope.monthlyService.revisions[0]?.nameEn ?? scope.monthlyService.code,
              }
            : null,
          serviceItem: scope.serviceItem
            ? {
                id: scope.serviceItem.id,
                code: scope.serviceItem.code,
                monthlyServiceId: scope.serviceItem.monthlyServiceId,
                nameAr: scope.serviceItem.revisions[0]?.nameAr ?? scope.serviceItem.code,
                nameEn: scope.serviceItem.revisions[0]?.nameEn ?? scope.serviceItem.code,
              }
            : null,
          oneTimeService: scope.oneTimeService
            ? {
                id: scope.oneTimeService.id,
                code: scope.oneTimeService.code,
                serviceLine: scope.oneTimeService.serviceLine,
                nameAr: scope.oneTimeService.revisions[0]?.nameAr ?? scope.oneTimeService.code,
                nameEn: scope.oneTimeService.revisions[0]?.nameEn ?? scope.oneTimeService.code,
              }
            : null,
        })),
      })),
      setup: {
        clients,
        roles,
        monthlyServices: monthlyServices.map((service) => ({
          id: service.id,
          code: service.code,
          nameAr: service.revisions[0]?.nameAr ?? service.code,
          nameEn: service.revisions[0]?.nameEn ?? service.code,
          domain: service.revisions[0]?.domain ?? null,
          serviceLine: service.revisions[0]?.serviceLine ?? null,
        })),
        serviceItems: serviceItems.map((item) => ({
          id: item.id,
          code: item.code,
          monthlyServiceId: item.monthlyServiceId,
          monthlyServiceCode: item.monthlyService.code,
          nameAr: item.revisions[0]?.nameAr ?? item.code,
          nameEn: item.revisions[0]?.nameEn ?? item.code,
          requestType: item.revisions[0]?.requestType ?? null,
        })),
        oneTimeServices: oneTimeServices.map((service) => ({
          id: service.id,
          code: service.code,
          serviceLine: service.serviceLine,
          nameAr: service.revisions[0]?.nameAr ?? service.code,
          nameEn: service.revisions[0]?.nameEn ?? service.code,
        })),
      },
    };
  }

  async listRolesAndPermissions() {
    const [roles, permissions] = await Promise.all([
      this.database.prisma.role.findMany({
        orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
        select: {
          id: true,
          code: true,
          name: true,
          nameAr: true,
          nameEn: true,
          userType: true,
          description: true,
          dataScope: true,
          capabilities: true,
          restrictions: true,
          isSystem: true,
          status: true,
          sortOrder: true,
          rolePermissions: {
            select: {
              effect: true,
              scopeRule: true,
              permission: {
                select: {
                  code: true,
                  name: true,
                  module: true,
                  action: true,
                  description: true,
                  status: true,
                },
              },
            },
            orderBy: { permission: { sortOrder: "asc" } },
          },
          _count: { select: { userRoles: true } },
        },
      }),
      this.database.prisma.permission.findMany({
        orderBy: [{ module: "asc" }, { sortOrder: "asc" }, { code: "asc" }],
        select: {
          id: true,
          code: true,
          name: true,
          module: true,
          action: true,
          description: true,
          status: true,
          sortOrder: true,
        },
      }),
    ]);

    return {
      roles: roles.map((role) => ({
        ...role,
        permissions: role.rolePermissions.map((entry) => ({
          ...entry.permission,
          effect: entry.effect,
          scopeRule: entry.scopeRule,
        })),
        usersCount: role._count.userRoles,
        rolePermissions: undefined,
        _count: undefined,
      })),
      permissions,
    };
  }

  async listAuditLogs() {
    const logs = await this.database.prisma.auditLog.findMany({
      orderBy: { occurredAt: "desc" },
      take: 100,
      select: {
        id: true,
        eventCode: true,
        entityType: true,
        entityId: true,
        reason: true,
        requestId: true,
        severity: true,
        occurredAt: true,
        actor: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });

    return { logs };
  }

  async invite(
    input: InviteUserDto,
    actorId: string,
    exposeToken: boolean,
    metadata: RequestMetadata,
  ): Promise<string | undefined> {
    const email = input.email.trim().toLowerCase();
    const existing = await this.database.prisma.user.findUnique({ where: { email } });
    if (existing && existing.status !== "INVITED") {
      await this.audit.record(
        {
          actorId,
          eventCode: "AUTH_INVITATION_REQUESTED",
          entityType: "Authentication",
          entityId: this.audit.anonymizeEmail(email),
        },
        metadata,
      );
      return undefined;
    }

    const roles = await this.database.prisma.role.findMany({
      where: { code: { in: input.roleCodes }, status: "ACTIVE" },
      select: { id: true, code: true },
    });
    if (roles.length !== new Set(input.roleCodes).size) {
      throw new BadRequestException({
        code: "INVALID_ROLE_SELECTION",
        message: "One or more selected roles are unavailable",
      });
    }

    const rawToken = this.tokens.issue();
    const userId = await this.database.prisma.$transaction(async (transaction) => {
      const user = existing
        ? await transaction.user.update({
            where: { id: existing.id },
            data: {
              displayName: input.displayName,
              userType: input.userType,
            },
          })
        : await transaction.user.create({
            data: {
              email,
              displayName: input.displayName,
              userType: input.userType,
              status: "INVITED",
            },
          });
      await transaction.userRole.deleteMany({ where: { userId: user.id } });
      await transaction.userRole.createMany({
        data: roles.map((role) => ({ userId: user.id, roleId: role.id })),
      });
      await transaction.authToken.updateMany({
        where: { userId: user.id, type: "INVITATION", consumedAt: null },
        data: { consumedAt: new Date() },
      });
      await transaction.authToken.create({
        data: {
          userId: user.id,
          type: "INVITATION",
          tokenHash: this.tokens.hash(rawToken),
          expiresAt: new Date(Date.now() + 48 * 60 * 60_000),
          createdById: actorId,
        },
      });
      return user.id;
    });

    await this.audit.record(
      {
        actorId,
        eventCode: "AUTH_INVITATION_CREATED",
        entityType: "User",
        entityId: userId,
        after: { roleCodes: roles.map((role) => role.code) },
        severity: "HIGH",
      },
      metadata,
    );
    return exposeToken ? rawToken : undefined;
  }

  async createOperatingUser(
    input: CreateOperatingUserDto,
    actorId: string,
    metadata: RequestMetadata,
  ) {
    const email = input.email.trim().toLowerCase();
    const existing = await this.database.prisma.user.findUnique({ where: { email } });
    if (existing && existing.status !== "INVITED") {
      throw new ConflictException({
        code: "USER_EMAIL_ALREADY_EXISTS",
        message: "The email is already assigned to another user",
      });
    }

    const role = await this.database.prisma.role.findFirst({
      where: { code: input.roleCode, status: "ACTIVE" },
      select: { id: true, code: true },
    });
    if (!role || !this.isOperatingRoleCode(role.code)) {
      throw new BadRequestException({
        code: "INVALID_OPERATING_ROLE",
        message: "The selected operating role is unavailable",
      });
    }
    const roleCode = role.code;

    await this.assertScopeReferences(input, roleCode);
    const temporaryPasswordHash = await this.passwords.hash(DEFAULT_TEMPORARY_PASSWORD);
    const userId = await this.database.prisma.$transaction(async (transaction) => {
      const user = existing
        ? await transaction.user.update({
            where: { id: existing.id },
            data: {
              displayName: input.displayName.trim(),
              failedLoginCount: 0,
              lockedUntil: null,
              passwordChangedAt: null,
              passwordHash: temporaryPasswordHash,
              status: "ACTIVE",
              userType: "INTERNAL",
            },
          })
        : await transaction.user.create({
            data: {
              email,
              displayName: input.displayName.trim(),
              passwordChangedAt: null,
              passwordHash: temporaryPasswordHash,
              preferredLocale: "ar",
              userType: "INTERNAL",
              status: "ACTIVE",
            },
          });

      await transaction.userRole.deleteMany({ where: { userId: user.id } });
      await transaction.userRole.create({
        data: { userId: user.id, roleId: role.id },
      });
      await transaction.authToken.updateMany({
        where: { userId: user.id, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      await this.replaceOperatingScopeInTransaction(transaction, user.id, [roleCode], input);
      return user.id;
    });

    await this.audit.record(
      {
        actorId,
        eventCode: "AUTH_OPERATING_USER_CREATED",
        entityType: "User",
        entityId: userId,
        after: {
          roleCode,
          clientIds: this.uniqueIds(input.clientIds),
          monthlyServiceIds: this.uniqueIds(input.monthlyServiceIds),
          serviceItemIds: this.uniqueIds(input.serviceItemIds),
          oneTimeServiceIds: this.uniqueIds(input.oneTimeServiceIds),
          supervisorId: input.supervisorId ?? null,
          specialistIds: this.uniqueIds(input.specialistIds),
          temporaryPasswordAssigned: true,
        },
        severity: "HIGH",
      },
      metadata,
    );

    return {
      snapshot: await this.listUsers(),
      temporaryPasswordAssigned: true,
    };
  }

  async resetUserPasswordToDefault(
    userId: string,
    actorId: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    const user = await this.database.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true },
    });
    if (!user || user.status === "ARCHIVED") {
      throw new BadRequestException({
        code: "USER_NOT_FOUND",
        message: "The user could not be found",
      });
    }

    const now = new Date();
    const passwordHash = await this.passwords.hash(DEFAULT_TEMPORARY_PASSWORD);
    await this.database.prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: userId },
        data: {
          passwordHash,
          passwordChangedAt: null,
          failedLoginCount: 0,
          lockedUntil: null,
          status: "ACTIVE",
          sessionVersion: { increment: 1 },
        },
      });
      await transaction.authSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now, revokeReason: "admin_password_reset_to_default" },
      });
      await transaction.authToken.updateMany({
        where: { userId, consumedAt: null },
        data: { consumedAt: now },
      });
    });

    await this.audit.record(
      {
        actorId,
        eventCode: "AUTH_PASSWORD_RESET_TO_DEFAULT",
        entityType: "User",
        entityId: userId,
        after: { temporaryPasswordAssigned: true },
        severity: "HIGH",
      },
      metadata,
    );
  }

  async replaceOperatingScope(
    userId: string,
    input: UpdateOperatingUserScopeDto,
    actorId: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    const user = await this.database.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });
    if (!user) {
      throw new BadRequestException({
        code: "USER_NOT_FOUND",
        message: "The user could not be found",
      });
    }

    const roleCodes = user.roles
      .map(({ role }) => role.code)
      .filter((code): code is OperatingRoleCode => this.isOperatingRoleCode(code));
    if (roleCodes.length === 0) {
      throw new BadRequestException({
        code: "OPERATING_ROLE_REQUIRED",
        message: "Operating scopes can only be assigned to internal operating roles",
      });
    }

    await this.assertScopeReferences(input, roleCodes[0]!);
    await this.database.prisma.$transaction(async (transaction) => {
      await this.replaceOperatingScopeInTransaction(transaction, userId, roleCodes, input);
    });

    await this.audit.record(
      {
        actorId,
        eventCode: "AUTH_USER_OPERATING_SCOPE_CHANGED",
        entityType: "User",
        entityId: userId,
        after: {
          roleCodes,
          clientIds: this.uniqueIds(input.clientIds),
          monthlyServiceIds: this.uniqueIds(input.monthlyServiceIds),
          serviceItemIds: this.uniqueIds(input.serviceItemIds),
          oneTimeServiceIds: this.uniqueIds(input.oneTimeServiceIds),
          supervisorId: input.supervisorId ?? null,
          specialistIds: this.uniqueIds(input.specialistIds),
        },
        severity: "HIGH",
      },
      metadata,
    );
  }

  async setUserStatus(
    userId: string,
    status: "ACTIVE" | "DISABLED" | "ARCHIVED",
    actorId: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    const user = await this.database.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });
    if (!user) {
      throw new BadRequestException({
        code: "USER_NOT_FOUND",
        message: "The user could not be found",
      });
    }

    if (
      status !== "ACTIVE" &&
      user.status === "ACTIVE" &&
      user.roles.some(({ role }) => role.code === ADMIN_ROLE_CODE)
    ) {
      await this.assertAnotherActiveAdmin(userId);
    }

    const now = new Date();
    await this.database.prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: userId },
        data: {
          status,
          ...(status === "ARCHIVED" ? { archivedAt: now } : { archivedAt: null }),
          ...(status === "ACTIVE" ? {} : { sessionVersion: { increment: 1 } }),
        },
      });
      if (status !== "ACTIVE") {
        await transaction.authSession.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: now, revokeReason: "account_disabled" },
        });
      }
    });
    await this.audit.record(
      {
        actorId,
        eventCode: "AUTH_USER_STATUS_CHANGED",
        entityType: "User",
        entityId: userId,
        before: { status: user.status },
        after: { status },
        severity: "HIGH",
      },
      metadata,
    );
  }

  async replaceUserRoles(
    userId: string,
    roleCodes: string[],
    actorId: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    const [user, roles] = await Promise.all([
      this.database.prisma.user.findUnique({
        where: { id: userId },
        include: { roles: { include: { role: true } } },
      }),
      this.database.prisma.role.findMany({
        where: { code: { in: roleCodes }, status: "ACTIVE" },
      }),
    ]);
    if (!user) {
      throw new BadRequestException({
        code: "USER_NOT_FOUND",
        message: "The user could not be found",
      });
    }
    if (roles.length !== new Set(roleCodes).size) {
      throw new BadRequestException({
        code: "INVALID_ROLE_SELECTION",
        message: "One or more selected roles are unavailable",
      });
    }

    const oldRoleCodes = user.roles.map(({ role }) => role.code);
    if (
      user.status === "ACTIVE" &&
      oldRoleCodes.includes(ADMIN_ROLE_CODE) &&
      !roleCodes.includes(ADMIN_ROLE_CODE)
    ) {
      await this.assertAnotherActiveAdmin(userId);
    }

    await this.database.prisma.$transaction(async (transaction) => {
      await transaction.userRole.deleteMany({ where: { userId } });
      await transaction.userRole.createMany({
        data: roles.map((role) => ({ userId, roleId: role.id })),
      });
      await transaction.user.update({
        where: { id: userId },
        data: { sessionVersion: { increment: 1 } },
      });
      await transaction.authSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date(), revokeReason: "roles_changed" },
      });
    });
    await this.audit.record(
      {
        actorId,
        eventCode: "AUTH_USER_ROLES_CHANGED",
        entityType: "User",
        entityId: userId,
        before: { roleCodes: oldRoleCodes },
        after: { roleCodes },
        severity: "CRITICAL",
      },
      metadata,
    );
  }

  async replaceRolePermissions(
    roleCode: string,
    permissionCodes: string[],
    actorId: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    if (
      roleCode === ADMIN_ROLE_CODE &&
      CRITICAL_ADMIN_PERMISSIONS.some((permission) => !permissionCodes.includes(permission))
    ) {
      throw this.lastAdminConflict();
    }

    const [role, permissions] = await Promise.all([
      this.database.prisma.role.findUnique({
        where: { code: roleCode },
        include: { rolePermissions: { include: { permission: true } } },
      }),
      this.database.prisma.permission.findMany({
        where: { code: { in: permissionCodes }, status: "ACTIVE" },
      }),
    ]);
    if (!role || permissions.length !== new Set(permissionCodes).size) {
      throw new BadRequestException({
        code: "INVALID_PERMISSION_SELECTION",
        message: "The role or one or more permissions are unavailable",
      });
    }

    const before = role.rolePermissions.map(({ permission }) => permission.code);
    await this.database.prisma.$transaction(async (transaction) => {
      await transaction.rolePermission.deleteMany({ where: { roleId: role.id } });
      await transaction.rolePermission.createMany({
        data: permissions.map((permission) => ({
          roleId: role.id,
          permissionId: permission.id,
          effect: "ALLOW",
        })),
      });
      const affectedUsers = await transaction.userRole.findMany({
        where: { roleId: role.id },
        select: { userId: true },
      });
      const userIds = affectedUsers.map(({ userId }) => userId);
      if (userIds.length) {
        await transaction.user.updateMany({
          where: { id: { in: userIds } },
          data: { sessionVersion: { increment: 1 } },
        });
        await transaction.authSession.updateMany({
          where: { userId: { in: userIds }, revokedAt: null },
          data: { revokedAt: new Date(), revokeReason: "role_permissions_changed" },
        });
      }
    });
    await this.audit.record(
      {
        actorId,
        eventCode: "AUTH_ROLE_PERMISSIONS_CHANGED",
        entityType: "Role",
        entityId: role.id,
        before: { permissionCodes: before },
        after: { permissionCodes },
        severity: "CRITICAL",
      },
      metadata,
    );
  }

  private async assertScopeReferences(
    input: OperatingUserScopeDto,
    roleCode: OperatingRoleCode,
  ): Promise<void> {
    const clientIds = this.uniqueIds(input.clientIds);
    const monthlyServiceIds = this.uniqueIds(input.monthlyServiceIds);
    const serviceItemIds = this.uniqueIds(input.serviceItemIds);
    const oneTimeServiceIds = this.uniqueIds(input.oneTimeServiceIds);
    const specialistIds = this.uniqueIds(input.specialistIds);

    await Promise.all([
      this.assertActiveClients(clientIds),
      this.assertActiveMonthlyServices(monthlyServiceIds),
      this.assertActiveServiceItems(serviceItemIds),
      this.assertActiveOneTimeServices(oneTimeServiceIds),
      roleCode === SPECIALIST_ROLE_CODE && input.supervisorId
        ? this.assertInternalUsersWithRole([input.supervisorId], SUPERVISOR_ROLE_CODE)
        : Promise.resolve(),
      roleCode === SUPERVISOR_ROLE_CODE && specialistIds.length > 0
        ? this.assertInternalUsersWithRole(specialistIds, SPECIALIST_ROLE_CODE)
        : Promise.resolve(),
    ]);
  }

  private async replaceOperatingScopeInTransaction(
    transaction: AdminAccessTransaction,
    userId: string,
    roleCodes: OperatingRoleCode[],
    input: OperatingUserScopeDto,
  ): Promise<void> {
    const clientIds = this.uniqueIds(input.clientIds);
    const scopedClientIds: Array<string | null> = clientIds.length > 0 ? clientIds : [null];
    const monthlyServiceIds = this.uniqueIds(input.monthlyServiceIds);
    const serviceItemIds = this.uniqueIds(input.serviceItemIds);
    const oneTimeServiceIds = this.uniqueIds(input.oneTimeServiceIds);
    const specialistIds = this.uniqueIds(input.specialistIds);

    await transaction.clientAssignment.deleteMany({
      where: { userId, roleCode: { in: [...clientPortfolioRoleCodes] } },
    });
    await transaction.userScope.deleteMany({ where: { userId, scopeType: "GLOBAL" } });
    await transaction.specialistServiceScope.deleteMany({ where: { userId } });
    await transaction.supervisorSpecialistAssignment.deleteMany({
      where: { OR: [{ supervisorId: userId }, { specialistId: userId }] },
    });

    if (roleCodes.includes(MANAGEMENT_ROLE_CODE)) {
      await transaction.userScope.create({ data: { userId, scopeType: "GLOBAL" } });
    }

    if (roleCodes.includes(ACCOUNT_MANAGER_ROLE_CODE) && clientIds.length > 0) {
      await transaction.clientAssignment.createMany({
        data: clientIds.map((clientId) => ({
          clientId,
          userId,
          roleCode: ACCOUNT_MANAGER_ROLE_CODE,
        })),
      });
    }

    if (roleCodes.includes(SPECIALIST_ROLE_CODE)) {
      const scopeRows: Prisma.SpecialistServiceScopeCreateManyInput[] = [];
      for (const clientId of scopedClientIds) {
        for (const monthlyServiceId of monthlyServiceIds) {
          scopeRows.push({ userId, clientId, monthlyServiceId });
        }
        for (const serviceItemId of serviceItemIds) {
          scopeRows.push({ userId, clientId, serviceItemId });
        }
        for (const oneTimeServiceId of oneTimeServiceIds) {
          scopeRows.push({ userId, clientId, oneTimeServiceId });
        }
      }
      if (scopeRows.length > 0) {
        await transaction.specialistServiceScope.createMany({ data: scopeRows });
      }
      if (input.supervisorId) {
        await transaction.supervisorSpecialistAssignment.createMany({
          data: scopedClientIds.map((clientId) => ({
            supervisorId: input.supervisorId!,
            specialistId: userId,
            clientId,
          })),
        });
      }
    }

    if (roleCodes.includes(SUPERVISOR_ROLE_CODE) && specialistIds.length > 0) {
      const supervisorRows = specialistIds.flatMap((specialistId) =>
        scopedClientIds.map((clientId) => ({
          supervisorId: userId,
          specialistId,
          clientId,
        })),
      );
      await transaction.supervisorSpecialistAssignment.createMany({ data: supervisorRows });
    }
  }

  private async assertActiveClients(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    const records = await this.database.prisma.client.findMany({
      where: { id: { in: ids }, status: "ACTIVE", archivedAt: null },
      select: { id: true },
    });
    this.assertAllIdsFound(
      ids,
      records.map(({ id }) => id),
      "INVALID_CLIENT_SCOPE",
    );
  }

  private async assertActiveMonthlyServices(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    const records = await this.database.prisma.monthlyService.findMany({
      where: { id: { in: ids }, status: "ACTIVE", archivedAt: null },
      select: { id: true },
    });
    this.assertAllIdsFound(
      ids,
      records.map(({ id }) => id),
      "INVALID_MONTHLY_SERVICE_SCOPE",
    );
  }

  private async assertActiveServiceItems(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    const records = await this.database.prisma.serviceItem.findMany({
      where: { id: { in: ids }, status: "ACTIVE", archivedAt: null },
      select: { id: true },
    });
    this.assertAllIdsFound(
      ids,
      records.map(({ id }) => id),
      "INVALID_SERVICE_ITEM_SCOPE",
    );
  }

  private async assertActiveOneTimeServices(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    const records = await this.database.prisma.oneTimeService.findMany({
      where: { id: { in: ids }, status: "ACTIVE", archivedAt: null },
      select: { id: true },
    });
    this.assertAllIdsFound(
      ids,
      records.map(({ id }) => id),
      "INVALID_ONE_TIME_SERVICE_SCOPE",
    );
  }

  private async assertInternalUsersWithRole(ids: string[], roleCode: string): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    const records = await this.database.prisma.user.findMany({
      where: {
        id: { in: ids },
        status: { in: ["ACTIVE", "INVITED"] },
        userType: "INTERNAL",
        roles: { some: { role: { code: roleCode, status: "ACTIVE" } } },
      },
      select: { id: true },
    });
    this.assertAllIdsFound(
      ids,
      records.map(({ id }) => id),
      "INVALID_OPERATING_USER_SCOPE",
    );
  }

  private assertAllIdsFound(requestedIds: string[], foundIds: string[], code: string): void {
    const found = new Set(foundIds);
    const missing = requestedIds.filter((id) => !found.has(id));
    if (missing.length > 0) {
      throw new BadRequestException({
        code,
        message: "One or more selected scope records are unavailable",
        missingIds: missing,
      });
    }
  }

  private uniqueIds(values: string[] | undefined): string[] {
    return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
  }

  private isOperatingRoleCode(value: string): value is OperatingRoleCode {
    return operatingRoleCodes.includes(value as OperatingRoleCode);
  }

  private async assertAnotherActiveAdmin(excludedUserId: string): Promise<void> {
    const count = await this.database.prisma.user.count({
      where: {
        id: { not: excludedUserId },
        status: "ACTIVE",
        roles: {
          some: {
            role: {
              code: ADMIN_ROLE_CODE,
              status: "ACTIVE",
            },
          },
        },
      },
    });
    if (count === 0) {
      throw this.lastAdminConflict();
    }
  }

  private lastAdminConflict(): ConflictException {
    return new ConflictException({
      code: "LAST_ADMIN_PROTECTED",
      message: "This change would remove the final active Admin access path",
    });
  }
}
