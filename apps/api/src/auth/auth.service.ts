import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service.js";
import { AccessService } from "./access.service.js";
import {
  ADMIN_ROLE_CODE,
  AUTH_ENVIRONMENT,
  MANAGE_USERS_PERMISSION,
  temporaryPassword,
} from "./auth.constants.js";
import { AuthAuditService } from "./audit.service.js";
import { PasswordHasherService } from "./password-hasher.service.js";
import { TokenService } from "./token.service.js";
import type {
  AuthenticatedPrincipal,
  AuthRuntimeEnvironment,
  IssuedSession,
  RequestMetadata,
  UatImpersonationUser,
} from "./auth.types.js";

const GENERIC_LOGIN_ERROR = {
  code: "INVALID_CREDENTIALS",
  message: "The email or password is incorrect",
};

@Injectable()
export class AuthService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AccessService) private readonly access: AccessService,
    @Inject(PasswordHasherService) private readonly passwords: PasswordHasherService,
    @Inject(TokenService) private readonly tokens: TokenService,
    @Inject(AuthAuditService) private readonly audit: AuthAuditService,
    @Inject(AUTH_ENVIRONMENT) private readonly environment: AuthRuntimeEnvironment,
  ) {}

  async login(
    emailInput: string,
    password: string,
    metadata: RequestMetadata,
  ): Promise<IssuedSession> {
    const email = emailInput.trim().toLowerCase();
    const user = await this.database.prisma.user.findUnique({ where: { email } });
    const now = new Date();
    const valid =
      user?.status === "ACTIVE" &&
      Boolean(user.passwordHash) &&
      (!user.lockedUntil || user.lockedUntil <= now) &&
      (await this.passwords.verify(password, user.passwordHash ?? ""));

    if (!user || !valid) {
      if (user) {
        const failedLoginCount = user.failedLoginCount + 1;
        const lockedUntil =
          failedLoginCount >= this.environment.auth.maxLoginAttempts
            ? new Date(now.getTime() + this.environment.auth.lockoutMinutes * 60_000)
            : user.lockedUntil;
        await this.database.prisma.user.update({
          where: { id: user.id },
          data: { failedLoginCount, lockedUntil },
        });
      }

      await this.audit.record(
        {
          ...(user ? { actorId: user.id } : {}),
          eventCode: "AUTH_LOGIN_FAILED",
          entityType: "Authentication",
          entityId: this.audit.anonymizeEmail(email),
          reason: "Invalid login attempt",
          severity: "HIGH",
        },
        metadata,
      );
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    const session = await this.issueSession(user.id, user.sessionVersion, metadata);
    await this.database.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: now,
      },
    });
    await this.audit.record(
      {
        actorId: user.id,
        eventCode: "AUTH_LOGIN_SUCCEEDED",
        entityType: "AuthSession",
        entityId: session.principal.sessionId,
        severity: "MEDIUM",
      },
      metadata,
    );

    return session;
  }

  async logout(
    sessionId: string,
    userId: string,
    metadata: RequestMetadata,
    impersonator?: { sessionToken: string; userId: string },
  ): Promise<void> {
    const now = new Date();
    await this.database.prisma.$transaction(async (transaction) => {
      await transaction.authSession.updateMany({
        where: { id: sessionId, userId, revokedAt: null },
        data: { revokedAt: now, revokeReason: "logout" },
      });
      if (impersonator) {
        await transaction.authSession.updateMany({
          where: {
            tokenHash: this.tokens.hash(impersonator.sessionToken),
            userId: impersonator.userId,
            revokedAt: null,
          },
          data: { revokedAt: now, revokeReason: "impersonation_logout" },
        });
      }
    });
    await this.audit.record(
      {
        actorId: userId,
        eventCode: "AUTH_LOGOUT",
        entityType: "AuthSession",
        entityId: sessionId,
      },
      metadata,
    );
  }

  async listUatImpersonationUsers(
    actor: AuthenticatedPrincipal,
  ): Promise<{ users: UatImpersonationUser[] }> {
    this.assertUatImpersonationAvailable();
    this.assertUatAdmin(actor);
    const now = new Date();
    const users = await this.database.prisma.user.findMany({
      where: {
        id: { not: actor.userId },
        status: "ACTIVE",
        OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }],
      },
      orderBy: [{ displayName: "asc" }, { email: "asc" }],
      select: {
        id: true,
        email: true,
        displayName: true,
        userType: true,
        lastLoginAt: true,
        roles: {
          where: { role: { status: "ACTIVE" } },
          orderBy: { role: { sortOrder: "asc" } },
          select: { role: { select: { code: true, name: true } } },
        },
        scopes: {
          where: { clientId: { not: null } },
          select: { client: { select: { id: true, code: true, name: true } } },
        },
        clientAssignments: {
          where: {
            startsAt: { lte: now },
            OR: [{ endsAt: null }, { endsAt: { gt: now } }],
          },
          select: { client: { select: { id: true, code: true, name: true } } },
        },
      },
    });

    return {
      users: users.map((user) => {
        const clients = new Map<string, { id: string; code: string; name: string }>();
        for (const relation of [...user.scopes, ...user.clientAssignments]) {
          if (relation.client) clients.set(relation.client.id, relation.client);
        }
        return {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          userType: user.userType,
          roles: user.roles.map(({ role }) => role),
          clients: [...clients.values()],
          lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        };
      }),
    };
  }

  async startUatImpersonation(
    actor: AuthenticatedPrincipal,
    targetUserId: string,
    metadata: RequestMetadata,
  ): Promise<IssuedSession> {
    this.assertUatImpersonationAvailable();
    this.assertUatAdmin(actor);
    if (targetUserId === actor.userId) {
      throw new BadRequestException({
        code: "IMPERSONATION_TARGET_UNCHANGED",
        message: "Choose a different user to start UAT impersonation",
      });
    }

    const target = await this.database.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, status: true, lockedUntil: true, sessionVersion: true },
    });
    if (
      !target ||
      target.status !== "ACTIVE" ||
      (target.lockedUntil && target.lockedUntil > new Date())
    ) {
      throw new BadRequestException({
        code: "IMPERSONATION_TARGET_UNAVAILABLE",
        message: "The selected UAT user is unavailable",
      });
    }

    const session = await this.issueSession(
      target.id,
      target.sessionVersion,
      metadata,
      Math.min(
        this.environment.auth.uatImpersonationTtlMinutes,
        this.environment.auth.sessionTtlMinutes,
      ),
    );
    await this.audit.record(
      {
        actorId: actor.userId,
        eventCode: "AUTH_UAT_IMPERSONATION_STARTED",
        entityType: "User",
        entityId: target.id,
        after: {
          effectiveUserId: target.id,
          effectiveRoles: session.principal.roles,
          impersonationSessionId: session.principal.sessionId,
        },
        reason: "UAT role workflow testing",
        severity: "HIGH",
      },
      metadata,
    );

    return {
      ...session,
      principal: {
        ...session.principal,
        mustChangePassword: false,
        impersonation: {
          userId: actor.userId,
          email: actor.email,
          displayName: actor.displayName,
        },
      },
    };
  }

  async stopUatImpersonation(
    actor: AuthenticatedPrincipal,
    impersonatorSessionToken: string | undefined,
    metadata: RequestMetadata,
  ): Promise<IssuedSession> {
    this.assertUatImpersonationAvailable();
    if (!actor.impersonation || !impersonatorSessionToken) {
      throw new UnauthorizedException({
        code: "IMPERSONATION_SESSION_INVALID",
        message: "The UAT impersonation session is no longer valid",
      });
    }

    const impersonator = await this.access.resolveSession(
      this.tokens.hash(impersonatorSessionToken),
    );
    if (
      !impersonator ||
      impersonator.userId !== actor.impersonation.userId ||
      !impersonator.roles.includes(ADMIN_ROLE_CODE) ||
      !impersonator.permissions.includes(MANAGE_USERS_PERMISSION)
    ) {
      throw new UnauthorizedException({
        code: "IMPERSONATION_SESSION_INVALID",
        message: "The UAT impersonation session is no longer valid",
      });
    }

    const restoredSession = await this.issueSession(
      impersonator.userId,
      impersonator.sessionVersion,
      metadata,
    );
    const now = new Date();
    await this.database.prisma.authSession.updateMany({
      where: { id: { in: [actor.sessionId, impersonator.sessionId] }, revokedAt: null },
      data: { revokedAt: now, revokeReason: "impersonation_completed" },
    });
    await this.audit.record(
      {
        actorId: impersonator.userId,
        eventCode: "AUTH_UAT_IMPERSONATION_STOPPED",
        entityType: "User",
        entityId: actor.userId,
        before: {
          effectiveUserId: actor.userId,
          impersonationSessionId: actor.sessionId,
        },
        after: { restoredAdminSessionId: restoredSession.principal.sessionId },
        reason: "Returned to the UAT Admin session",
        severity: "HIGH",
      },
      metadata,
    );
    return restoredSession;
  }

  async updatePreferredLocale(
    userId: string,
    preferredLocale: "ar" | "en",
    metadata: RequestMetadata,
  ): Promise<void> {
    const user = await this.database.prisma.user.findUnique({
      where: { id: userId },
      select: { preferredLocale: true },
    });
    if (!user || user.preferredLocale === preferredLocale) {
      return;
    }

    await this.database.prisma.user.update({
      where: { id: userId },
      data: { preferredLocale },
    });
    await this.audit.record(
      {
        actorId: userId,
        eventCode: "AUTH_PROFILE_PREFERENCES_UPDATED",
        entityType: "User",
        entityId: userId,
        before: { preferredLocale: user.preferredLocale },
        after: { preferredLocale },
        severity: "LOW",
      },
      metadata,
    );
  }

  async changePassword(
    userId: string,
    currentPassword: string | undefined,
    newPassword: string,
    confirmPassword: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    if (newPassword !== confirmPassword) {
      throw new BadRequestException({
        code: "PASSWORD_CONFIRMATION_MISMATCH",
        message: "The password confirmation does not match",
      });
    }
    if (newPassword === temporaryPassword()) {
      throw new BadRequestException({
        code: "PASSWORD_CANNOT_BE_DEFAULT",
        message: "Choose a password different from the temporary default password",
      });
    }

    const user = await this.database.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordChangedAt: true, passwordHash: true },
    });
    if (!user?.passwordHash) {
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    if (
      user.passwordChangedAt &&
      (!currentPassword || !(await this.passwords.verify(currentPassword, user.passwordHash)))
    ) {
      throw new BadRequestException({
        code: "CURRENT_PASSWORD_INVALID",
        message: "The current password is incorrect",
      });
    }

    if (await this.passwords.verify(newPassword, user.passwordHash)) {
      throw new BadRequestException({
        code: "PASSWORD_UNCHANGED",
        message: "Choose a password different from the current password",
      });
    }

    const passwordHash = await this.passwords.hash(newPassword);
    const now = new Date();
    await this.database.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        passwordChangedAt: now,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
    await this.audit.record(
      {
        actorId: userId,
        eventCode: "AUTH_PASSWORD_CHANGED",
        entityType: "User",
        entityId: userId,
        severity: "HIGH",
      },
      metadata,
    );
  }

  async requestPasswordReset(
    emailInput: string,
    metadata: RequestMetadata,
  ): Promise<string | undefined> {
    const email = emailInput.trim().toLowerCase();
    const user = await this.database.prisma.user.findUnique({ where: { email } });
    let rawToken: string | undefined;

    if (user && user.status === "ACTIVE") {
      rawToken = this.tokens.issue();
      await this.database.prisma.$transaction(async (transaction) => {
        await transaction.authToken.updateMany({
          where: {
            userId: user.id,
            type: "PASSWORD_RESET",
            consumedAt: null,
          },
          data: { consumedAt: new Date() },
        });
        await transaction.authToken.create({
          data: {
            userId: user.id,
            type: "PASSWORD_RESET",
            tokenHash: this.tokens.hash(rawToken!),
            expiresAt: new Date(Date.now() + 30 * 60_000),
          },
        });
      });
    }

    await this.audit.record(
      {
        eventCode: "AUTH_PASSWORD_RESET_REQUESTED",
        entityType: "Authentication",
        entityId: this.audit.anonymizeEmail(email),
        severity: "MEDIUM",
      },
      metadata,
    );

    return this.environment.auth.exposeTestTokens ? rawToken : undefined;
  }

  async confirmPasswordReset(
    rawToken: string,
    password: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    const token = await this.database.prisma.authToken.findUnique({
      where: { tokenHash: this.tokens.hash(rawToken) },
      include: { user: true },
    });
    if (
      !token ||
      token.type !== "PASSWORD_RESET" ||
      token.consumedAt ||
      token.expiresAt <= new Date() ||
      token.user.status !== "ACTIVE"
    ) {
      throw this.invalidToken();
    }

    const passwordHash = await this.passwords.hash(password);
    const now = new Date();
    await this.database.prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: token.userId },
        data: {
          passwordHash,
          passwordChangedAt: now,
          failedLoginCount: 0,
          lockedUntil: null,
          sessionVersion: { increment: 1 },
        },
      });
      await transaction.authToken.update({
        where: { id: token.id },
        data: { consumedAt: now },
      });
      await transaction.authSession.updateMany({
        where: { userId: token.userId, revokedAt: null },
        data: { revokedAt: now, revokeReason: "password_reset" },
      });
    });
    await this.audit.record(
      {
        actorId: token.userId,
        eventCode: "AUTH_PASSWORD_RESET_COMPLETED",
        entityType: "User",
        entityId: token.userId,
        severity: "HIGH",
      },
      metadata,
    );
  }

  async acceptInvitation(
    rawToken: string,
    password: string,
    displayName: string | undefined,
    metadata: RequestMetadata,
  ): Promise<void> {
    const token = await this.database.prisma.authToken.findUnique({
      where: { tokenHash: this.tokens.hash(rawToken) },
      include: { user: true },
    });
    if (
      !token ||
      token.type !== "INVITATION" ||
      token.consumedAt ||
      token.expiresAt <= new Date() ||
      token.user.status !== "INVITED"
    ) {
      throw this.invalidToken();
    }

    const passwordHash = await this.passwords.hash(password);
    const now = new Date();
    await this.database.prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: token.userId },
        data: {
          passwordHash,
          passwordChangedAt: now,
          status: "ACTIVE",
          ...(displayName ? { displayName } : {}),
        },
      });
      await transaction.authToken.update({
        where: { id: token.id },
        data: { consumedAt: now },
      });
    });
    await this.audit.record(
      {
        actorId: token.userId,
        eventCode: "AUTH_INVITATION_ACCEPTED",
        entityType: "User",
        entityId: token.userId,
        severity: "HIGH",
      },
      metadata,
    );
  }

  async invalidateSessions(
    userId: string,
    actorId: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    const now = new Date();
    await this.database.prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: userId },
        data: { sessionVersion: { increment: 1 } },
      });
      await transaction.authSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now, revokeReason: "admin_invalidation" },
      });
    });
    await this.audit.record(
      {
        actorId,
        eventCode: "AUTH_SESSIONS_INVALIDATED",
        entityType: "User",
        entityId: userId,
        severity: "HIGH",
      },
      metadata,
    );
  }

  private async issueSession(
    userId: string,
    sessionVersion: number,
    metadata: RequestMetadata,
    ttlMinutes = this.environment.auth.sessionTtlMinutes,
  ): Promise<IssuedSession> {
    const sessionToken = this.tokens.issue();
    const csrfToken = this.tokens.issue();
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);
    const session = await this.database.prisma.authSession.create({
      data: {
        userId,
        tokenHash: this.tokens.hash(sessionToken),
        csrfTokenHash: this.tokens.hash(csrfToken),
        sessionVersion,
        expiresAt,
        ...(metadata.ipAddress ? { ipAddress: metadata.ipAddress } : {}),
        ...(metadata.userAgent ? { userAgent: metadata.userAgent } : {}),
      },
    });
    const principal = await this.access.resolveUser(userId, {
      sessionId: session.id,
      sessionVersion,
      csrfTokenHash: session.csrfTokenHash,
    });
    if (!principal) {
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    return { sessionToken, csrfToken, expiresAt, principal };
  }

  private invalidToken(): BadRequestException {
    return new BadRequestException({
      code: "AUTH_TOKEN_INVALID",
      message: "The token is invalid or has expired",
    });
  }

  private assertUatImpersonationAvailable(): void {
    if (
      this.environment.deploymentEnvironment !== "uat" ||
      !this.environment.auth.uatImpersonationEnabled
    ) {
      throw new NotFoundException({
        code: "ROUTE_NOT_FOUND",
        message: "The requested route was not found",
      });
    }
  }

  private assertUatAdmin(actor: AuthenticatedPrincipal): void {
    if (
      actor.impersonation ||
      !actor.roles.includes(ADMIN_ROLE_CODE) ||
      !actor.permissions.includes(MANAGE_USERS_PERMISSION)
    ) {
      throw new UnauthorizedException({
        code: "UAT_IMPERSONATION_NOT_ALLOWED",
        message: "UAT impersonation is not available for this session",
      });
    }
  }
}
