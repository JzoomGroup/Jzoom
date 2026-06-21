import "reflect-metadata";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { ApiEnvironment } from "@jzoom/config";
import { createDatabaseClient, type JzoomDatabaseClient } from "@jzoom/database";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { PasswordHasherService } from "../src/auth/password-hasher.service.js";
import { configureApiApplication } from "../src/bootstrap.js";

const describeWithDatabase = process.env.DATABASE_INTEGRATION === "true" ? describe : describe.skip;

const environment: ApiEnvironment = {
  nodeEnvironment: "test",
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

  it("prevents disabling or de-roling the last active Admin", async () => {
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
});
