import "reflect-metadata";
import type { ExecutionContext } from "@nestjs/common";
import { ForbiddenException } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { jest } from "@jest/globals";
import type { AccessService } from "../src/auth/access.service.js";
import type { AuthAuditService } from "../src/auth/audit.service.js";
import type { AuthenticatedPrincipal, ScopeRequirement } from "../src/auth/auth.types.js";
import { PasswordHasherService } from "../src/auth/password-hasher.service.js";
import { ScopeGuard } from "../src/auth/scope.guard.js";

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
});
