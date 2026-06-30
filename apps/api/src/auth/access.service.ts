import { Inject, Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service.js";
import type { AuthenticatedPrincipal } from "./auth.types.js";

interface SessionAccess {
  sessionId: string;
  sessionVersion: number;
  csrfTokenHash: string;
}

@Injectable()
export class AccessService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async resolveSession(tokenHash: string): Promise<AuthenticatedPrincipal | null> {
    const now = new Date();
    const session = await this.database.prisma.authSession.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        sessionVersion: true,
        csrfTokenHash: true,
        expiresAt: true,
        revokedAt: true,
        user: {
          select: {
            passwordChangedAt: true,
            status: true,
            sessionVersion: true,
          },
        },
      },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= now ||
      session.user.status !== "ACTIVE" ||
      session.sessionVersion !== session.user.sessionVersion
    ) {
      return null;
    }

    await this.database.prisma.authSession.update({
      where: { id: session.id },
      data: { lastSeenAt: now },
    });

    return this.resolveUser(session.userId, {
      sessionId: session.id,
      sessionVersion: session.sessionVersion,
      csrfTokenHash: session.csrfTokenHash,
    });
  }

  async resolveUser(
    userId: string,
    session: SessionAccess,
  ): Promise<AuthenticatedPrincipal | null> {
    const now = new Date();
    const user = await this.database.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        permissionOverrides: {
          include: {
            permission: true,
          },
        },
        scopes: true,
        clientAssignments: {
          where: {
            startsAt: { lte: now },
            OR: [{ endsAt: null }, { endsAt: { gt: now } }],
          },
          select: { clientId: true },
        },
      },
    });

    if (!user || user.status !== "ACTIVE") {
      return null;
    }

    const permissions = new Map<string, boolean>();
    const activeRoles = user.roles
      .filter(({ role }) => role.status === "ACTIVE")
      .map(({ role }) => role);

    for (const role of activeRoles) {
      for (const rolePermission of role.rolePermissions) {
        if (rolePermission.permission.status !== "ACTIVE") {
          continue;
        }

        const code = rolePermission.permission.code;
        if (rolePermission.effect === "DENY") {
          permissions.set(code, false);
        } else if (!permissions.has(code)) {
          permissions.set(code, true);
        }
      }
    }

    for (const override of user.permissionOverrides) {
      if (
        override.permission.status === "ACTIVE" &&
        (!override.expiresAt || override.expiresAt > now)
      ) {
        permissions.set(override.permission.code, override.effect === "ALLOW");
      }
    }

    return {
      userId: user.id,
      sessionId: session.sessionId,
      sessionVersion: session.sessionVersion,
      csrfTokenHash: session.csrfTokenHash,
      email: user.email,
      displayName: user.displayName,
      preferredLocale: user.preferredLocale,
      userType: user.userType,
      mustChangePassword: user.passwordChangedAt === null,
      roles: activeRoles.map((role) => role.code),
      permissions: [...permissions.entries()]
        .filter(([, allowed]) => allowed)
        .map(([code]) => code),
      scopes: user.scopes.map((scope) => ({
        type: scope.scopeType,
        ...(scope.clientId ? { clientId: scope.clientId } : {}),
        ...(scope.domain ? { domain: scope.domain } : {}),
        ...(scope.teamCode ? { teamCode: scope.teamCode } : {}),
      })),
      assignedClientIds: [...new Set(user.clientAssignments.map(({ clientId }) => clientId))],
    };
  }

  async hasAssignedWork(userId: string, requestId?: string, projectId?: string): Promise<boolean> {
    if (!requestId && !projectId) {
      return false;
    }

    const count = await this.database.prisma.task.count({
      where: {
        assigneeId: userId,
        ...(requestId ? { requestId } : {}),
        ...(projectId ? { projectId } : {}),
      },
    });

    return count > 0;
  }
}
