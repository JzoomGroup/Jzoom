import "reflect-metadata";
import type { ExecutionContext } from "@nestjs/common";
import { ForbiddenException } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { parseApiEnvironment } from "@jzoom/config";
import { jest } from "@jest/globals";
import type { AccessService } from "../src/auth/access.service.js";
import type { AuthAuditService } from "../src/auth/audit.service.js";
import { AuthGuard } from "../src/auth/auth.guard.js";
import {
  ADMIN_ROLE_CODE,
  ALLOW_PASSWORD_CHANGE_REQUIRED_KEY,
  IS_PUBLIC_KEY,
  MANAGE_USERS_PERMISSION,
} from "../src/auth/auth.constants.js";
import type {
  AuthenticatedPrincipal,
  AuthRuntimeEnvironment,
  ScopeRequirement,
} from "../src/auth/auth.types.js";
import { PasswordHasherService } from "../src/auth/password-hasher.service.js";
import { ScopeGuard } from "../src/auth/scope.guard.js";
import { TokenService } from "../src/auth/token.service.js";

function principal(overrides: Partial<AuthenticatedPrincipal> = {}): AuthenticatedPrincipal {
  return {
    userId: "26473c00-5e47-49ec-92fd-583d11b2323f",
    sessionId: "8bebfd84-568f-4ca0-b0cf-06a7fd788e26",
    sessionVersion: 1,
    csrfTokenHash: "hash",
    email: "user@example.com",
    displayName: "User",
    preferredLocale: "en",
    userType: "INTERNAL",
    mustChangePassword: false,
    roles: [],
    permissions: [],
    scopes: [],
    assignedClientIds: [],
    ...overrides,
  };
}

function contextFor(auth: AuthenticatedPrincipal, params: Record<string, string>) {
  return {
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({
      getRequest: () => ({
        auth,
        params,
        originalUrl: "/api/v1/auth/access/test",
        requestId: "2c252c56-8b2a-4f1c-aea4-ae92791ec455",
        ip: "127.0.0.1",
        header: () => "jest",
      }),
    }),
  } as unknown as ExecutionContext;
}

function scopeGuard(requirement: ScopeRequirement, assignedWork = false) {
  const reflector = {
    getAllAndOverride: jest.fn(() => requirement),
  } as unknown as Reflector;
  const access = {
    hasAssignedWork: jest.fn(async () => assignedWork),
  } as unknown as AccessService;
  const audit = {
    record: jest.fn(async () => undefined),
  } as unknown as AuthAuditService;

  return new ScopeGuard(reflector, access, audit);
}

describe("PR 3 security primitives", () => {
  it("hashes passwords with salt and never stores plain text", async () => {
    const hasher = new PasswordHasherService();
    const first = await hasher.hash("StrongPassword123");
    const second = await hasher.hash("StrongPassword123");

    expect(first).not.toContain("StrongPassword123");
    expect(first).not.toBe(second);
    await expect(hasher.verify("StrongPassword123", first)).resolves.toBe(true);
    await expect(hasher.verify("wrong-password", first)).resolves.toBe(false);
  });

  it("prevents a client from accessing another client", async () => {
    const guard = scopeGuard({ type: "CLIENT" });
    const user = principal({
      userType: "EXTERNAL",
      roles: ["ROLE-CLIENT"],
      scopes: [{ type: "OWN_CLIENT", clientId: "client-a" }],
    });

    await expect(
      guard.canActivate(contextFor(user, { clientId: "client-b" })),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(guard.canActivate(contextFor(user, { clientId: "client-a" }))).resolves.toBe(true);
  });

  it("prevents a Specialist from accessing unassigned work", async () => {
    const guard = scopeGuard({ type: "ASSIGNED_WORK" }, false);
    const user = principal({
      roles: ["ROLE-SPECIALIST"],
      scopes: [{ type: "ASSIGNED_WORK" }],
    });

    await expect(
      guard.canActivate(contextFor(user, { requestId: "request-a" })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("prevents an Account Manager from accessing an unassigned client", async () => {
    const guard = scopeGuard({ type: "CLIENT" });
    const user = principal({
      roles: ["ROLE-AM"],
      scopes: [{ type: "ASSIGNED_CLIENTS" }],
      assignedClientIds: ["client-a"],
    });

    await expect(
      guard.canActivate(contextFor(user, { clientId: "client-b" })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows global Admin scope", async () => {
    const guard = scopeGuard({ type: "GLOBAL" });

    await expect(
      guard.canActivate(contextFor(principal({ roles: ["ROLE-ADMIN"] }), {})),
    ).resolves.toBe(true);
  });

  it("blocks every protected method until the temporary password is changed", async () => {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === IS_PUBLIC_KEY) return false;
        if (key === ALLOW_PASSWORD_CHANGE_REQUIRED_KEY) return false;
        return undefined;
      }),
    } as unknown as Reflector;
    const access = {
      resolveSession: jest.fn(async () => principal({ mustChangePassword: true })),
    } as unknown as AccessService;
    const environment = {
      auth: { cookieName: "jzoom_session" },
    } as AuthRuntimeEnvironment;
    const guard = new AuthGuard(reflector, access, new TokenService(), environment);
    const context = {
      getHandler: () => function handler() {},
      getClass: () => class Controller {},
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { cookie: "jzoom_session=session-token" },
          method: "GET",
        }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows explicitly approved authentication routes during password change", async () => {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === IS_PUBLIC_KEY) return false;
        if (key === ALLOW_PASSWORD_CHANGE_REQUIRED_KEY) return true;
        return undefined;
      }),
    } as unknown as Reflector;
    const access = {
      resolveSession: jest.fn(async () => principal({ mustChangePassword: true })),
    } as unknown as AccessService;
    const environment = {
      auth: { cookieName: "jzoom_session" },
    } as AuthRuntimeEnvironment;
    const guard = new AuthGuard(reflector, access, new TokenService(), environment);
    const context = {
      getHandler: () => function handler() {},
      getClass: () => class Controller {},
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { cookie: "jzoom_session=session-token" },
          method: "GET",
        }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it("refuses to enable UAT impersonation for a production deployment", () => {
    expect(() =>
      parseApiEnvironment({
        NODE_ENV: "production",
        DEPLOYMENT_ENVIRONMENT: "production",
        DATABASE_URL: "postgresql://user:password@localhost:5432/jzoom",
        WEB_ORIGIN: "https://portal.jzoom.sa",
        AUTH_UAT_IMPERSONATION_ENABLED: "true",
      } as NodeJS.ProcessEnv),
    ).toThrow(/AUTH_UAT_IMPERSONATION_ENABLED can only be enabled/);
  });

  it("accepts UAT impersonation only with the approved UAT deployment and origin", () => {
    const environment = parseApiEnvironment({
      NODE_ENV: "production",
      DEPLOYMENT_ENVIRONMENT: "uat",
      DATABASE_URL: "postgresql://user:password@localhost:5432/jzoom",
      WEB_ORIGIN: "https://uat-portal.jzoom.sa",
      AUTH_COOKIE_NAME: "jzoom_uat_session",
      AUTH_UAT_IMPERSONATION_ENABLED: "true",
    } as NodeJS.ProcessEnv);

    expect(environment.deploymentEnvironment).toBe("uat");
    expect(environment.auth.uatImpersonationEnabled).toBe(true);
    expect(environment.auth.uatImpersonationCookieName).toBe("jzoom_uat_session_uat_admin_return");
  });

  it("refuses UAT impersonation when the web origin is not the exact approved HTTPS origin", () => {
    expect(() =>
      parseApiEnvironment({
        NODE_ENV: "production",
        DEPLOYMENT_ENVIRONMENT: "uat",
        DATABASE_URL: "postgresql://user:password@localhost:5432/jzoom",
        WEB_ORIGIN: "http://uat-portal.jzoom.sa",
        AUTH_UAT_IMPERSONATION_ENABLED: "true",
      } as NodeJS.ProcessEnv),
    ).toThrow(/approved UAT web origin/);
  });

  it("bypasses temporary-password gating only with a valid UAT Admin return session", async () => {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === IS_PUBLIC_KEY) return false;
        if (key === ALLOW_PASSWORD_CHANGE_REQUIRED_KEY) return false;
        return undefined;
      }),
    } as unknown as Reflector;
    const access = {
      resolveSession: jest
        .fn<() => Promise<AuthenticatedPrincipal | null>>()
        .mockResolvedValueOnce(principal({ mustChangePassword: true }))
        .mockResolvedValueOnce(
          principal({
            userId: "5b41e625-8121-4b7e-85ab-51d6280489db",
            email: "admin@jzoom.sa",
            displayName: "UAT Admin",
            roles: [ADMIN_ROLE_CODE],
            permissions: [MANAGE_USERS_PERMISSION],
          }),
        ),
    } as unknown as AccessService;
    const environment = {
      deploymentEnvironment: "uat",
      auth: {
        cookieName: "jzoom_uat_session",
        uatImpersonationEnabled: true,
        uatImpersonationCookieName: "jzoom_uat_session_uat_admin_return",
      },
    } as AuthRuntimeEnvironment;
    const request = {
      headers: {
        cookie: "jzoom_uat_session=target-token; jzoom_uat_session_uat_admin_return=admin-token",
      },
      method: "GET",
    } as Record<string, unknown>;
    const guard = new AuthGuard(reflector, access, new TokenService(), environment);
    const context = {
      getHandler: () => function handler() {},
      getClass: () => class Controller {},
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.auth).toEqual(
      expect.objectContaining({
        mustChangePassword: false,
        impersonation: expect.objectContaining({ displayName: "UAT Admin" }),
      }),
    );
  });
});
