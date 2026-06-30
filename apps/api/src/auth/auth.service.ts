import { BadRequestException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service.js";
import { AccessService } from "./access.service.js";
import { AUTH_ENVIRONMENT, DEFAULT_TEMPORARY_PASSWORD } from "./auth.constants.js";
import { AuthAuditService } from "./audit.service.js";
import { PasswordHasherService } from "./password-hasher.service.js";
import { TokenService } from "./token.service.js";
import type { AuthRuntimeEnvironment, IssuedSession, RequestMetadata } from "./auth.types.js";

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

  async logout(sessionId: string, userId: string, metadata: RequestMetadata): Promise<void> {
    await this.database.prisma.authSession.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: "logout" },
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
    if (newPassword === DEFAULT_TEMPORARY_PASSWORD) {
      throw new BadRequestException({
        code: "PASSWORD_CANNOT_BE_DEFAULT",
        message: "Choose a password different from the temporary default password",
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
  ): Promise<IssuedSession> {
    const sessionToken = this.tokens.issue();
    const csrfToken = this.tokens.issue();
    const expiresAt = new Date(Date.now() + this.environment.auth.sessionTtlMinutes * 60_000);
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
}
