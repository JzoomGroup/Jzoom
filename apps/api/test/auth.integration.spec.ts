import "reflect-metadata";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { ApiEnvironment } from "@jzoom/config";
import { createDatabaseClient, type JzoomDatabaseClient } from "@jzoom/database";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { DEFAULT_TEMPORARY_PASSWORD } from "../src/auth/auth.constants.js";
import { PasswordHasherService } from "../src/auth/password-hasher.service.js";
import { configureApiApplication } from "../src/bootstrap.js";

const describeWithDatabase = process.env.DATABASE_INTEGRATION === "true" ? describe : describe.skip;

const environment: ApiEnvironment = {
  nodeEnvironment: "test",
  deploymentEnvironment: "test",
  port: 4000,
  databaseUrl: process.env.DATABASE_URL ?? "postgresql://user:password@localhost:5432/jzoom",
  openApiEnabled: false,
  webOrigin: "http://localhost:3000",
  auth: {
    sessionTtlMinutes: 60,
    cookieName: "jzoom_session",
    csrfCookieName: "jzoom_csrf",
    cookieSecure: false,
    exposeTestTokens: true,
    maxLoginAttempts: 5,
    lockoutMinutes: 15,
    uatImpersonationEnabled: false,
    uatImpersonationTtlMinutes: 60,
    uatImpersonationCookieName: "jzoom_session_uat_admin_return",
  },
};

function csrfFrom(response: request.Response): string {
  const header = response.headers["set-cookie"];
  const cookies = Array.isArray(header) ? header : header ? [header] : [];
  const csrfCookie = cookies.find((cookie) => cookie.startsWith("jzoom_csrf="));
  if (!csrfCookie) {
    throw new Error("CSRF cookie was not issued");
  }

  return decodeURIComponent(csrfCookie.split(";", 1)[0]!.slice("jzoom_csrf=".length));
}

describeWithDatabase("PR 3 PostgreSQL authentication and RBAC", () => {
  let app: INestApplication;
  let database: JzoomDatabaseClient;
  let adminId: string;
  let clientId: string;
  let adminRoleId: string;
  let clientRoleId: string;
  let passwordHash: string;

  async function login(email: string, password = "StrongPassword123") {
    const agent = request.agent(app.getHttpServer());
    const response = await agent.post("/api/v1/auth/login").send({ email, password }).expect(200);
    return { agent, csrf: csrfFrom(response) };
  }

  beforeAll(async () => {
    database = createDatabaseClient(environment.databaseUrl);
    const hasher = new PasswordHasherService();
    passwordHash = await hasher.hash("StrongPassword123");

    const adminRole = await database.role.upsert({
      where: { code: "ROLE-ADMIN" },
      create: {
        code: "ROLE-ADMIN",
        name: "Admin",
        userType: "INTERNAL",
        isSystem: true,
      },
      update: { status: "ACTIVE" },
    });
    const clientRole = await database.role.upsert({
      where: { code: "ROLE-CLIENT" },
      create: {
        code: "ROLE-CLIENT",
        name: "Client",
        userType: "EXTERNAL",
        isSystem: true,
      },
      update: { status: "ACTIVE" },
    });
    const manageUsers = await database.permission.upsert({
      where: { code: "PERM-MANAGE-USERS" },
      create: {
        code: "PERM-MANAGE-USERS",
        name: "Manage users",
        module: "Admin",
        action: "Manage",
      },
      update: { status: "ACTIVE" },
    });
    const modifyPermissions = await database.permission.upsert({
      where: { code: "PERM-MODIFY-USER-PERMISSIONS" },
      create: {
        code: "PERM-MODIFY-USER-PERMISSIONS",
        name: "Modify user permissions",
        module: "Admin",
        action: "Manage",
      },
      update: { status: "ACTIVE" },
    });
    for (const permission of [manageUsers, modifyPermissions]) {
      await database.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: permission.id,
          },
        },
        create: {
          roleId: adminRole.id,
          permissionId: permission.id,
          effect: "ALLOW",
        },
        update: { effect: "ALLOW" },
      });
    }
    adminRoleId = adminRole.id;
    clientRoleId = clientRole.id;

    const module = await Test.createTestingModule({
      imports: [AppModule.forRoot(environment)],
    }).compile();
    app = module.createNestApplication();
    configureApiApplication(app, environment, { enableOpenApiUi: false });
    await app.init();
  });

  beforeEach(async () => {
    await database.user.deleteMany({
      where: { email: { endsWith: "@pr3.test" } },
    });
    const admin = await database.user.create({
      data: {
        email: "admin@pr3.test",
        displayName: "PR3 Admin",
        userType: "INTERNAL",
        status: "ACTIVE",
        passwordHash,
        passwordChangedAt: new Date(),
      },
    });
    const client = await database.user.create({
      data: {
        email: "client@pr3.test",
        displayName: "PR3 Client",
        userType: "EXTERNAL",
        status: "ACTIVE",
        passwordHash,
        passwordChangedAt: new Date(),
      },
    });
    await database.userRole.createMany({
      data: [
        { userId: admin.id, roleId: adminRoleId },
        { userId: client.id, roleId: clientRoleId },
      ],
    });
    adminId = admin.id;
    clientId = client.id;
  });

  afterAll(async () => {
    await database.user.deleteMany({
      where: { email: { endsWith: "@pr3.test" } },
    });
    await app.close();
    await database.$disconnect();
  });

  it("logs in securely and returns the authenticated profile", async () => {
    const { agent } = await login("admin@pr3.test");
    const response = await agent.get("/api/v1/auth/me").expect(200);

    expect(response.body.user).toMatchObject({
      email: "admin@pr3.test",
      roles: ["ROLE-ADMIN"],
    });
    expect(response.body.user).not.toHaveProperty("passwordHash");
  });

  it("lets authenticated users update their interface language preference", async () => {
    const { agent, csrf } = await login("admin@pr3.test");

    const update = await agent
      .patch("/api/v1/auth/me/preferences")
      .set("X-CSRF-Token", csrf)
      .send({ preferredLocale: "en" })
      .expect(200);
    expect(update.body.user).toMatchObject({
      email: "admin@pr3.test",
      preferredLocale: "en",
    });

    const profile = await agent.get("/api/v1/auth/me").expect(200);
    expect(profile.body.user.preferredLocale).toBe("en");
  });

  it("returns safe failed-login errors with a request ID", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "client@pr3.test", password: "WrongPassword123" })
      .expect(401);

    expect(response.body).toMatchObject({
      code: "INVALID_CREDENTIALS",
      fieldErrors: [],
      path: "/api/v1/auth/login",
    });
    expect(response.body.requestId).toBe(response.headers["x-request-id"]);
    expect(JSON.stringify(response.body)).not.toContain("client@pr3.test");
  });

  it("rejects unauthenticated and forbidden backend access", async () => {
    await request(app.getHttpServer()).get("/api/v1/auth/me").expect(401);

    const { agent } = await login("client@pr3.test");
    const response = await agent.get("/api/v1/auth/access/admin").expect(403);
    expect(response.body.code).toBe("ROLE_DENIED");
  });

  it("requires CSRF and revokes the current session on logout", async () => {
    const first = await login("client@pr3.test");
    await first.agent.post("/api/v1/auth/logout").expect(403);
    await first.agent.post("/api/v1/auth/logout").set("X-CSRF-Token", first.csrf).expect(200);
    await first.agent.get("/api/v1/auth/me").expect(401);
  });

  it("supports non-enumerating password reset and invalidates old sessions", async () => {
    const oldSession = await login("client@pr3.test");
    const unknown = await request(app.getHttpServer())
      .post("/api/v1/auth/password-reset/request")
      .send({ email: "missing@pr3.test" })
      .expect(202);
    expect(unknown.body).toEqual(expect.objectContaining({ accepted: true }));
    expect(unknown.body).not.toHaveProperty("testToken");

    const reset = await request(app.getHttpServer())
      .post("/api/v1/auth/password-reset/request")
      .send({ email: "client@pr3.test" })
      .expect(202);
    await request(app.getHttpServer())
      .post("/api/v1/auth/password-reset/confirm")
      .send({ token: reset.body.testToken, password: "NewStrongPassword123" })
      .expect(200);

    await oldSession.agent.get("/api/v1/auth/me").expect(401);
    await login("client@pr3.test", "NewStrongPassword123");
  });

  it("creates and accepts an invitation without exposing existing accounts", async () => {
    const { agent, csrf } = await login("admin@pr3.test");
    const existing = await agent
      .post("/api/v1/auth/admin/invitations")
      .set("X-CSRF-Token", csrf)
      .send({
        email: "client@pr3.test",
        displayName: "Existing",
        userType: "EXTERNAL",
        roleCodes: ["ROLE-CLIENT"],
      })
      .expect(202);
    expect(existing.body).not.toHaveProperty("testToken");

    const invitation = await agent
      .post("/api/v1/auth/admin/invitations")
      .set("X-CSRF-Token", csrf)
      .send({
        email: "invited@pr3.test",
        displayName: "Invited User",
        userType: "EXTERNAL",
        roleCodes: ["ROLE-CLIENT"],
      })
      .expect(202);
    await request(app.getHttpServer())
      .post("/api/v1/auth/invitations/accept")
      .send({
        token: invitation.body.testToken,
        password: "InvitedPassword123",
      })
      .expect(200);
    await login("invited@pr3.test", "InvitedPassword123");
  });

  it("creates an operating user from the Admin users payload", async () => {
    const { agent, csrf } = await login("admin@pr3.test");

    const response = await agent
      .post("/api/v1/auth/admin/users")
      .set("X-CSRF-Token", csrf)
      .send({
        clientIds: [],
        displayName: "Operating Admin",
        email: "operator@pr3.test",
        monthlyServiceIds: [],
        oneTimeServiceIds: [],
        roleCode: "ROLE-ADMIN",
        serviceItemIds: [],
        specialistIds: [],
      })
      .expect(201);

    expect(response.body.temporaryPasswordAssigned).toBe(true);
    expect(response.body.snapshot.users).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          displayName: "Operating Admin",
          email: "operator@pr3.test",
          mustChangePassword: true,
          status: "ACTIVE",
        }),
      ]),
    );

    const operator = await login("operator@pr3.test", DEFAULT_TEMPORARY_PASSWORD);
    const profile = await operator.agent.get("/api/v1/auth/me").expect(200);
    expect(profile.body.user.mustChangePassword).toBe(true);

    const protectedRead = await operator.agent.get("/api/v1/auth/access/admin").expect(403);
    expect(protectedRead.body.code).toBe("PASSWORD_CHANGE_REQUIRED");

    await operator.agent
      .patch("/api/v1/auth/me/password")
      .set("X-CSRF-Token", operator.csrf)
      .send({ newPassword: "NewPass123", confirmPassword: "NewPass123" })
      .expect(200);

    const updatedProfile = await operator.agent.get("/api/v1/auth/me").expect(200);
    expect(updatedProfile.body.user.mustChangePassword).toBe(false);
  });

  it("requires the current password for a later self-service password change", async () => {
    const admin = await login("admin@pr3.test");
    await admin.agent
      .post("/api/v1/auth/admin/users")
      .set("X-CSRF-Token", admin.csrf)
      .send({
        clientIds: [],
        displayName: "Password Settings User",
        email: "password.settings@pr3.test",
        monthlyServiceIds: [],
        oneTimeServiceIds: [],
        roleCode: "ROLE-ADMIN",
        serviceItemIds: [],
        specialistIds: [],
      })
      .expect(201);

    const firstLogin = await login("password.settings@pr3.test", DEFAULT_TEMPORARY_PASSWORD);
    await firstLogin.agent
      .patch("/api/v1/auth/me/password")
      .set("X-CSRF-Token", firstLogin.csrf)
      .send({ newPassword: "FirstPass123", confirmPassword: "FirstPass123" })
      .expect(200);

    const established = await login("password.settings@pr3.test", "FirstPass123");
    const rejected = await established.agent
      .patch("/api/v1/auth/me/password")
      .set("X-CSRF-Token", established.csrf)
      .send({
        currentPassword: "WrongPass123",
        newPassword: "SecondPass456",
        confirmPassword: "SecondPass456",
      })
      .expect(400);
    expect(rejected.body.code).toBe("CURRENT_PASSWORD_INVALID");

    await established.agent
      .patch("/api/v1/auth/me/password")
      .set("X-CSRF-Token", established.csrf)
      .send({
        currentPassword: "FirstPass123",
        newPassword: "SecondPass456",
        confirmPassword: "SecondPass456",
      })
      .expect(200);
  });

  it("lets Admins reset a user password to the temporary default", async () => {
    const client = await login("client@pr3.test");
    const admin = await login("admin@pr3.test");

    await admin.agent
      .post(`/api/v1/auth/admin/users/${clientId}/reset-password`)
      .set("X-CSRF-Token", admin.csrf)
      .expect(200);

    await client.agent.get("/api/v1/auth/me").expect(401);
    const resetClient = await login("client@pr3.test", DEFAULT_TEMPORARY_PASSWORD);
    const profile = await resetClient.agent.get("/api/v1/auth/me").expect(200);
    expect(profile.body.user.mustChangePassword).toBe(true);
  });

  it("prevents disabling or de-roling the last active Admin", async () => {
    const otherActiveAdmins = await database.user.findMany({
      where: {
        id: { not: adminId },
        status: "ACTIVE",
        roles: { some: { roleId: adminRoleId } },
      },
      select: { id: true },
    });
    const otherActiveAdminIds = otherActiveAdmins.map((user) => user.id);
    if (otherActiveAdminIds.length > 0) {
      await database.user.updateMany({
        where: { id: { in: otherActiveAdminIds } },
        data: { status: "DISABLED" },
      });
    }

    try {
      const { agent, csrf } = await login("admin@pr3.test");
      const disable = await agent
        .patch(`/api/v1/auth/admin/users/${adminId}/status`)
        .set("X-CSRF-Token", csrf)
        .send({ status: "DISABLED" })
        .expect(409);
      expect(disable.body.code).toBe("LAST_ADMIN_PROTECTED");

      const roles = await agent
        .put(`/api/v1/auth/admin/users/${adminId}/roles`)
        .set("X-CSRF-Token", csrf)
        .send({ roleCodes: ["ROLE-CLIENT"] })
        .expect(409);
      expect(roles.body.code).toBe("LAST_ADMIN_PROTECTED");
    } finally {
      if (otherActiveAdminIds.length > 0) {
        await database.user.updateMany({
          where: { id: { in: otherActiveAdminIds } },
          data: { status: "ACTIVE" },
        });
      }
    }
  });

  it("allows Admin session invalidation and blocks the invalidated user", async () => {
    const client = await login("client@pr3.test");
    const admin = await login("admin@pr3.test");
    await admin.agent
      .post(`/api/v1/auth/admin/users/${clientId}/invalidate-sessions`)
      .set("X-CSRF-Token", admin.csrf)
      .expect(200);
    await client.agent.get("/api/v1/auth/me").expect(401);
  });

  it("lets Admins update a user profile and revokes sessions when the email changes", async () => {
    const client = await login("client@pr3.test");
    const admin = await login("admin@pr3.test");

    await admin.agent
      .patch(`/api/v1/auth/admin/users/${clientId}/profile`)
      .set("X-CSRF-Token", admin.csrf)
      .send({
        displayName: "Updated Client",
        email: "client.updated@pr3.test",
        preferredLocale: "ar",
      })
      .expect(200);

    await client.agent.get("/api/v1/auth/me").expect(401);
    const updated = await login("client.updated@pr3.test");
    const profile = await updated.agent.get("/api/v1/auth/me").expect(200);
    expect(profile.body.user).toMatchObject({
      displayName: "Updated Client",
      email: "client.updated@pr3.test",
      preferredLocale: "ar",
    });
  });

  it("keeps the acting Admin session while revoking other sessions after a self email change", async () => {
    const admin = await login("admin@pr3.test");

    await admin.agent
      .patch(`/api/v1/auth/admin/users/${adminId}/profile`)
      .set("X-CSRF-Token", admin.csrf)
      .send({
        displayName: "Updated Admin",
        email: "admin.updated@pr3.test",
        preferredLocale: "en",
      })
      .expect(200);

    const profile = await admin.agent.get("/api/v1/auth/me").expect(200);
    expect(profile.body.user).toMatchObject({
      displayName: "Updated Admin",
      email: "admin.updated@pr3.test",
    });
  });

  it("applies and clears explicit user permission exceptions", async () => {
    const admin = await login("admin@pr3.test");

    await admin.agent
      .put(`/api/v1/auth/admin/users/${clientId}/permission-overrides`)
      .set("X-CSRF-Token", admin.csrf)
      .send({
        overrides: [
          {
            permissionCode: "PERM-MANAGE-USERS",
            effect: "ALLOW",
            reason: "Integration coverage",
          },
        ],
      })
      .expect(200);

    const client = await login("client@pr3.test");
    const profile = await client.agent.get("/api/v1/auth/me").expect(200);
    expect(profile.body.user.permissions).toContain("PERM-MANAGE-USERS");

    await admin.agent
      .put(`/api/v1/auth/admin/users/${clientId}/permission-overrides`)
      .set("X-CSRF-Token", admin.csrf)
      .send({ overrides: [] })
      .expect(200);

    await client.agent.get("/api/v1/auth/me").expect(401);
    const refreshed = await login("client@pr3.test");
    const refreshedProfile = await refreshed.agent.get("/api/v1/auth/me").expect(200);
    expect(refreshedProfile.body.user.permissions).not.toContain("PERM-MANAGE-USERS");
  });
});
