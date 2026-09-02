import { NotFoundException } from "@nestjs/common";
import { jest } from "@jest/globals";
import { AuthAuditService } from "../src/auth/audit.service.js";
import { AuthService } from "../src/auth/auth.service.js";
import { ADMIN_ROLE_CODE, MANAGE_USERS_PERMISSION } from "../src/auth/auth.constants.js";
import type { AuthenticatedPrincipal, AuthRuntimeEnvironment } from "../src/auth/auth.types.js";
import { RequestContextService } from "../src/request-context/request-context.service.js";

function principal(overrides: Partial<AuthenticatedPrincipal> = {}): AuthenticatedPrincipal {
  return {
    userId: "26473c00-5e47-49ec-92fd-583d11b2323f",
    sessionId: "8bebfd84-568f-4ca0-b0cf-06a7fd788e26",
    sessionVersion: 1,
    csrfTokenHash: "csrf-hash",
    email: "user@example.com",
    displayName: "User",
    preferredLocale: "ar",
    userType: "INTERNAL",
    mustChangePassword: false,
    roles: [],
    permissions: [],
    scopes: [],
    assignedClientIds: [],
    ...overrides,
  };
}

const metadata = { requestId: "request-1", ipAddress: "127.0.0.1", userAgent: "jest" };

function environment(enabled = true): AuthRuntimeEnvironment {
  return {
    nodeEnvironment: "production",
    deploymentEnvironment: enabled ? "uat" : "production",
    auth: {
      sessionTtlMinutes: 480,
      cookieName: "jzoom_uat_session",
      csrfCookieName: "jzoom_uat_csrf",
      cookieSecure: true,
      exposeTestTokens: false,
      maxLoginAttempts: 5,
      lockoutMinutes: 15,
      uatImpersonationEnabled: enabled,
      uatImpersonationTtlMinutes: 60,
      uatImpersonationCookieName: "jzoom_uat_session_uat_admin_return",
    },
  };
}

function setup(enabled = true) {
  const prisma = {
    user: {
      findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
      findUnique: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        id: "917f2731-29ab-48fe-aa9f-2914eb754dc8",
        status: "ACTIVE",
        lockedUntil: null,
        sessionVersion: 3,
      }),
    },
    authSession: {
      create: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        id: "f2d9c9d9-57ca-47dc-8084-e2a67d5234e6",
        csrfTokenHash: "issued-csrf-hash",
      }),
      updateMany: jest.fn<() => Promise<unknown>>().mockResolvedValue({ count: 2 }),
    },
  };
  const target = principal({
    userId: "917f2731-29ab-48fe-aa9f-2914eb754dc8",
    sessionId: "f2d9c9d9-57ca-47dc-8084-e2a67d5234e6",
    sessionVersion: 3,
    email: "demo.specialist@jzoom.sa",
    displayName: "Demo Specialist",
    mustChangePassword: true,
    roles: ["ROLE-SPECIALIST"],
  });
  const admin = principal({
    userId: "5b41e625-8121-4b7e-85ab-51d6280489db",
    sessionId: "099bca78-4a52-418b-8d03-e3875dc9710c",
    email: "info@jzoom.sa",
    displayName: "UAT Admin",
    roles: [ADMIN_ROLE_CODE],
    permissions: [MANAGE_USERS_PERMISSION],
  });
  const access = {
    resolveUser: jest.fn<() => Promise<AuthenticatedPrincipal | null>>().mockResolvedValue(target),
    resolveSession: jest
      .fn<() => Promise<AuthenticatedPrincipal | null>>()
      .mockResolvedValue(admin),
  };
  const tokens = {
    issue: jest
      .fn<() => string>()
      .mockReturnValueOnce("target-session-token")
      .mockReturnValueOnce("target-csrf-token")
      .mockReturnValueOnce("admin-session-token")
      .mockReturnValueOnce("admin-csrf-token"),
    hash: jest.fn((value: string) => `hash:${value}`),
  };
  const audit = { record: jest.fn<() => Promise<void>>().mockResolvedValue(undefined) };
  const service = new AuthService(
    { prisma } as never,
    access as never,
    {} as never,
    tokens as never,
    audit as never,
    environment(enabled),
  );
  return { access, admin, audit, prisma, service, target };
}

describe("UAT user impersonation", () => {
  it("is unavailable when the deployment is not explicitly UAT", async () => {
    const { admin, prisma, service } = setup(false);

    await expect(service.listUatImpersonationUsers(admin)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it("issues a short-lived effective-user session without changing the target password", async () => {
    const { admin, audit, prisma, service, target } = setup();

    const session = await service.startUatImpersonation(admin, target.userId, metadata);

    expect(session.principal).toEqual(
      expect.objectContaining({
        userId: target.userId,
        mustChangePassword: false,
        impersonation: expect.objectContaining({ userId: admin.userId }),
      }),
    );
    expect(prisma.authSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: target.userId, sessionVersion: 3 }),
      }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventCode: "AUTH_UAT_IMPERSONATION_STARTED" }),
      metadata,
    );
  });

  it("rotates back to a fresh Admin session and revokes both previous sessions", async () => {
    const { access, admin, audit, prisma, service, target } = setup();
    const impersonated = principal({
      ...target,
      impersonation: {
        userId: admin.userId,
        email: admin.email,
        displayName: admin.displayName,
      },
    });
    access.resolveUser.mockResolvedValueOnce(admin);

    const restored = await service.stopUatImpersonation(
      impersonated,
      "original-admin-token",
      metadata,
    );

    expect(restored.principal.userId).toBe(admin.userId);
    expect(prisma.authSession.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: [impersonated.sessionId, admin.sessionId] },
        revokedAt: null,
      },
      data: expect.objectContaining({ revokeReason: "impersonation_completed" }),
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventCode: "AUTH_UAT_IMPERSONATION_STOPPED" }),
      metadata,
    );
  });

  it("preserves the original Admin identity in audit records created while impersonating", async () => {
    const create = jest.fn<() => Promise<unknown>>().mockResolvedValue({});
    const requestContext = new RequestContextService();
    const audit = new AuthAuditService(
      { prisma: { auditLog: { create } } } as never,
      requestContext,
    );

    await requestContext.run("request-uat", async () => {
      requestContext.setUatImpersonation({
        impersonatorUserId: "5b41e625-8121-4b7e-85ab-51d6280489db",
        effectiveUserId: "917f2731-29ab-48fe-aa9f-2914eb754dc8",
        effectiveSessionId: "f2d9c9d9-57ca-47dc-8084-e2a67d5234e6",
      });
      await audit.record({
        actorId: "917f2731-29ab-48fe-aa9f-2914eb754dc8",
        eventCode: "REQUEST_CREATED",
        entityType: "Request",
        entityId: "request-1",
      });
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: "917f2731-29ab-48fe-aa9f-2914eb754dc8",
        after: {
          uatImpersonation: {
            impersonatorUserId: "5b41e625-8121-4b7e-85ab-51d6280489db",
            effectiveUserId: "917f2731-29ab-48fe-aa9f-2914eb754dc8",
            effectiveSessionId: "f2d9c9d9-57ca-47dc-8084-e2a67d5234e6",
          },
        },
      }),
    });
  });
});
