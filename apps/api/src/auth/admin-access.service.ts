import { BadRequestException, ConflictException, Inject, Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service.js";
import { ADMIN_ROLE_CODE, CRITICAL_ADMIN_PERMISSIONS } from "./auth.constants.js";
import { AuthAuditService } from "./audit.service.js";
import { TokenService } from "./token.service.js";
import type { RequestMetadata } from "./auth.types.js";
import type { InviteUserDto } from "./auth.dto.js";

@Injectable()
export class AdminAccessService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(TokenService) private readonly tokens: TokenService,
    @Inject(AuthAuditService) private readonly audit: AuthAuditService,
  ) {}

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
