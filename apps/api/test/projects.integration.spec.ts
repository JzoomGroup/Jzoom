import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { ApiEnvironment } from "@jzoom/config";
import { createDatabaseClient, type JzoomDatabaseClient, type Prisma } from "@jzoom/database";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
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

const password = "StrongPassword123";

function csrfFrom(response: request.Response): string {
  const header = response.headers["set-cookie"];
  const cookies = Array.isArray(header) ? header : header ? [header] : [];
  const csrfCookie = cookies.find((cookie) => cookie.startsWith("jzoom_csrf="));
  if (!csrfCookie) {
    throw new Error("CSRF cookie was not issued");
  }
  return decodeURIComponent(csrfCookie.split(";", 1)[0]!.slice("jzoom_csrf=".length));
}

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

describeWithDatabase("Project delivery access and client review flows", () => {
  let app: INestApplication;
  let database: JzoomDatabaseClient;
  let clientId: string;
  let otherClientId: string;
  let projectId: string;
  let otherProjectId: string;
  let taskId: string;
  let sharedOutputId: string;
  let draftOutputId: string;
  let hiddenDraftOutputId: string;
  let uploadedFileId: string;
  let uploadRoot: string;
  const previousUploadRoot = process.env.JZOOM_UPLOAD_ROOT;
  let oneTimeServiceId: string;
  let currentStateId: string;
  let workflowVersionId: string;
  const runId = randomUUID().slice(0, 8);

  async function login(email: string) {
    const agent = request.agent(app.getHttpServer());
    const response = await agent.post("/api/v1/auth/login").send({ email, password }).expect(200);
    return { agent, csrf: csrfFrom(response) };
  }

  async function role(code: string, name: string, userType: "INTERNAL" | "EXTERNAL" = "INTERNAL") {
    return database.role.upsert({
      where: { code },
      create: {
        code,
        name,
        nameAr: name,
        nameEn: name,
        userType,
        isSystem: true,
        status: "ACTIVE",
      },
      update: { status: "ACTIVE" },
    });
  }

  async function createWorkflow() {
    const definition = await database.workflowDefinition.create({
      data: {
        code: `PRJ-WF-${runId}`,
        name: "Project delivery test workflow",
        type: "PROJECT",
        status: "ACTIVE",
      },
    });
    const version = await database.workflowVersion.create({
      data: {
        workflowDefinitionId: definition.id,
        version: 1,
        status: "ACTIVE",
        effectiveFrom: new Date(Date.now() - 86_400_000),
        configuration: json({ source: "projects.integration.spec" }),
      },
    });
    const active = await database.workflowState.create({
      data: {
        workflowVersionId: version.id,
        code: "ACTIVE",
        labelAr: "نشط",
        labelEn: "Active",
        isInitial: true,
        sortOrder: 1,
      },
    });
    await database.workflowState.createMany({
      data: [
        {
          workflowVersionId: version.id,
          code: "CLIENT_REVIEW",
          labelAr: "بانتظار مراجعة العميل",
          labelEn: "Client review",
          sortOrder: 2,
        },
        {
          workflowVersionId: version.id,
          code: "COMPLETED",
          labelAr: "مكتمل",
          labelEn: "Completed",
          isTerminal: true,
          sortOrder: 3,
        },
      ],
    });
    workflowVersionId = version.id;
    currentStateId = active.id;
  }

  async function createOneTimeService() {
    const category = await database.oneTimeServiceCategory.create({
      data: {
        code: `PRJ-CAT-${runId}`,
        nameAr: "خدمات المشاريع",
        nameEn: "Project services",
        status: "ACTIVE",
      },
    });
    const service = await database.oneTimeService.create({
      data: {
        categoryId: category.id,
        code: `PRJ-OT-${runId}`,
        serviceLine: "Build",
        status: "ACTIVE",
      },
    });
    oneTimeServiceId = service.id;
    const revision = await database.oneTimeServiceRevision.create({
      data: {
        oneTimeServiceId: service.id,
        version: 1,
        status: "ACTIVE",
        effectiveFrom: new Date(Date.now() - 86_400_000),
        nameAr: "مشروع تجربة العميل",
        nameEn: "Client experience project",
        basePriceSar: 12000,
        estimatedHours: 24,
        internalHourlyCostSar: 150,
        durationDays: 14,
        visibleInPricing: true,
        createsProject: true,
        description: "Project delivery fixture for access and output decisions.",
      },
    });
    const phase = await database.oneTimeServicePhase.create({
      data: {
        oneTimeServiceRevisionId: revision.id,
        code: "DISCOVERY",
        nameAr: "الاكتشاف",
        nameEn: "Discovery",
        sortOrder: 1,
        status: "ACTIVE",
      },
    });
    const deliverable = await database.oneTimeServiceDeliverable.create({
      data: {
        oneTimeServiceRevisionId: revision.id,
        phaseId: phase.id,
        code: "DEL-STRATEGY",
        nameAr: "ملف الاستراتيجية",
        nameEn: "Strategy file",
        description: "Client-approved strategy output.",
        sortOrder: 1,
        requiresClientApproval: true,
        status: "ACTIVE",
      },
    });
    await database.oneTimeServiceTask.create({
      data: {
        deliverableId: deliverable.id,
        code: "TASK-DRAFT",
        nameAr: "إعداد المسودة",
        nameEn: "Prepare draft",
        estimatedHours: 6,
        sortOrder: 1,
        status: "ACTIVE",
      },
    });
    return revision.id;
  }

  async function createProject(
    code: string,
    scopedClientId: string,
    oneTimeServiceRevisionId: string,
    assigneeId: string,
  ) {
    const project = await database.project.create({
      data: {
        projectNumber: `PRJ-${runId}-${code}`,
        clientId: scopedClientId,
        oneTimeServiceRevisionId,
        workflowVersionId,
        currentStateId,
        name: `مشروع ${code}`,
        status: "ACTIVE",
        startsAt: new Date(Date.now() - 86_400_000),
        dueAt: new Date(Date.now() + 14 * 86_400_000),
        serviceSnapshot: json({ source: "projects.integration.spec", code }),
      },
    });
    const task = await database.task.create({
      data: {
        projectId: project.id,
        title: "إعداد المسودة",
        description: "Prepare the first client-facing draft.",
        status: "TODO",
        priority: "HIGH",
        assigneeId,
        sortOrder: 1,
      },
    });
    const [sharedOutput, draftOutput, hiddenDraftOutput] = await Promise.all([
      database.projectOutput.create({
        data: {
          projectId: project.id,
          code: "OUT-SHARED",
          title: "مخرج مشارك",
          description: "Visible to the client.",
          status: "SHARED_WITH_CLIENT",
          sharedAt: new Date(),
          sortOrder: 1,
        },
      }),
      database.projectOutput.create({
        data: {
          projectId: project.id,
          code: "OUT-DRAFT",
          title: "مخرج داخلي",
          description: "Internal draft only.",
          status: "DRAFT",
          sortOrder: 2,
        },
      }),
      database.projectOutput.create({
        data: {
          projectId: project.id,
          code: "OUT-HIDDEN-DRAFT",
          title: "Ù…Ø®Ø±Ø¬ Ø¯Ø§Ø®Ù„ÙŠ Ø«Ø§Ø¨Øª",
          description: "Draft fixture that must stay hidden from the client.",
          status: "DRAFT",
          sortOrder: 3,
        },
      }),
    ]);
    return { project, task, sharedOutput, draftOutput, hiddenDraftOutput };
  }

  beforeAll(async () => {
    uploadRoot = await mkdtemp(join(tmpdir(), "jzoom-project-integration-"));
    process.env.JZOOM_UPLOAD_ROOT = uploadRoot;
    database = createDatabaseClient(environment.databaseUrl);
    const passwordHash = await new PasswordHasherService().hash(password);
    const [clientRole, projectSpecialistRole, supervisorRole] = await Promise.all([
      role("ROLE-CLIENT", "Client", "EXTERNAL"),
      role("ROLE-PROJECT-SPECIALIST", "Project Specialist"),
      role("ROLE-SUPERVISOR", "Supervisor"),
    ]);
    await createWorkflow();
    const oneTimeServiceRevisionId = await createOneTimeService();
    const [client, otherClient] = await Promise.all([
      database.client.create({
        data: {
          code: `PRJ-A-${runId}`,
          name: "PRJ Client A",
          sector: "Technology",
          city: "Riyadh",
          authorizedApprover: "Approver A",
        },
      }),
      database.client.create({
        data: {
          code: `PRJ-B-${runId}`,
          name: "PRJ Client B",
          sector: "Retail",
          city: "Jeddah",
          authorizedApprover: "Approver B",
        },
      }),
    ]);
    clientId = client.id;
    otherClientId = otherClient.id;
    const [clientUser, otherClientUser, projectSpecialist, unscopedSpecialist, supervisor] =
      await Promise.all([
        database.user.create({
          data: {
            email: `client-${runId}@projects.test`,
            passwordHash,
            displayName: "Project Client",
            userType: "EXTERNAL",
            status: "ACTIVE",
            passwordChangedAt: new Date(),
            roles: { create: { roleId: clientRole.id } },
            clientAssignments: { create: { clientId, roleCode: "ROLE-CLIENT" } },
          },
        }),
        database.user.create({
          data: {
            email: `other-client-${runId}@projects.test`,
            passwordHash,
            displayName: "Other Project Client",
            userType: "EXTERNAL",
            status: "ACTIVE",
            passwordChangedAt: new Date(),
            roles: { create: { roleId: clientRole.id } },
            clientAssignments: { create: { clientId: otherClientId, roleCode: "ROLE-CLIENT" } },
          },
        }),
        database.user.create({
          data: {
            email: `project-specialist-${runId}@projects.test`,
            passwordHash,
            displayName: "Project Specialist",
            userType: "INTERNAL",
            status: "ACTIVE",
            passwordChangedAt: new Date(),
            roles: { create: { roleId: projectSpecialistRole.id } },
            specialistServiceScopes: {
              create: {
                clientId,
                oneTimeServiceId,
                status: "ACTIVE",
              },
            },
          },
        }),
        database.user.create({
          data: {
            email: `unscoped-${runId}@projects.test`,
            passwordHash,
            displayName: "Unscoped Specialist",
            userType: "INTERNAL",
            status: "ACTIVE",
            passwordChangedAt: new Date(),
            roles: { create: { roleId: projectSpecialistRole.id } },
          },
        }),
        database.user.create({
          data: {
            email: `supervisor-${runId}@projects.test`,
            passwordHash,
            displayName: "Project Supervisor",
            userType: "INTERNAL",
            status: "ACTIVE",
            passwordChangedAt: new Date(),
            roles: { create: { roleId: supervisorRole.id } },
          },
        }),
      ]);
    expect(clientUser.id).toBeDefined();
    expect(otherClientUser.id).toBeDefined();
    expect(unscopedSpecialist.id).toBeDefined();
    await database.supervisorSpecialistAssignment.create({
      data: {
        supervisorId: supervisor.id,
        specialistId: projectSpecialist.id,
        clientId,
        status: "ACTIVE",
      },
    });
    const main = await createProject(
      "MAIN",
      clientId,
      oneTimeServiceRevisionId,
      projectSpecialist.id,
    );
    const other = await createProject(
      "OTHER",
      otherClientId,
      oneTimeServiceRevisionId,
      unscopedSpecialist.id,
    );
    projectId = main.project.id;
    taskId = main.task.id;
    sharedOutputId = main.sharedOutput.id;
    draftOutputId = main.draftOutput.id;
    hiddenDraftOutputId = main.hiddenDraftOutput.id;
    otherProjectId = other.project.id;

    const testingModule = await Test.createTestingModule({
      imports: [AppModule.forRoot(environment)],
    }).compile();
    app = testingModule.createNestApplication();
    configureApiApplication(app, environment, { enableOpenApiUi: false });
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await database?.$disconnect();
    process.env.JZOOM_UPLOAD_ROOT = previousUploadRoot;
    await rm(uploadRoot, { force: true, recursive: true });
  });

  it("lists only scoped projects for a project specialist", async () => {
    const { agent } = await login(`project-specialist-${runId}@projects.test`);
    const response = await agent.get("/api/v1/projects").expect(200);

    expect(response.body.map((project: { id: string }) => project.id)).toContain(projectId);
    expect(response.body.map((project: { id: string }) => project.id)).not.toContain(
      otherProjectId,
    );
  });

  it("runs project output delivery through specialist and supervisor roles", async () => {
    const { agent, csrf } = await login(`project-specialist-${runId}@projects.test`);

    await agent
      .patch(`/api/v1/projects/${projectId}/tasks/${taskId}`)
      .set("X-CSRF-Token", csrf)
      .send({ status: "IN_PROGRESS", note: "Started delivery" })
      .expect(200)
      .expect(({ body }) => {
        expect(body.tasks.find((task: { id: string }) => task.id === taskId)).toMatchObject({
          status: "IN_PROGRESS",
        });
      });

    const upload = await agent
      .post(`/api/v1/projects/${projectId}/outputs/${draftOutputId}/files/upload`)
      .set("X-CSRF-Token", csrf)
      .attach("file", Buffer.from("project output"), {
        filename: "project-output.txt",
        contentType: "text/plain",
      })
      .expect(200);
    const uploadedFile = upload.body.outputs
      .find((output: { id: string }) => output.id === draftOutputId)
      ?.files.find((file: { originalName: string }) => file.originalName === "project-output.txt");
    expect(uploadedFile).toMatchObject({
      mimeType: "text/plain",
      originalName: "project-output.txt",
      sizeBytes: Buffer.byteLength("project output"),
    });
    uploadedFileId = uploadedFile.id;

    const internalDownload = await agent
      .get(`/api/v1/projects/${projectId}/files/${uploadedFileId}/download`)
      .expect(200)
      .expect("Content-Type", /text\/plain/);
    expect(internalDownload.text).toBe("project output");

    await agent
      .patch(`/api/v1/projects/${projectId}/outputs/${draftOutputId}/status`)
      .set("X-CSRF-Token", csrf)
      .send({ status: "INTERNAL_REVIEW", reason: "Ready for supervisor review" })
      .expect(200)
      .expect(({ body }) => {
        expect(
          body.outputs.find((output: { id: string }) => output.id === draftOutputId),
        ).toMatchObject({
          status: "INTERNAL_REVIEW",
        });
      });

    const supervisorSession = await login(`supervisor-${runId}@projects.test`);
    const supervisorProjects = await supervisorSession.agent.get("/api/v1/projects").expect(200);
    expect(supervisorProjects.body.map((project: { id: string }) => project.id)).toContain(
      projectId,
    );
    await supervisorSession.agent
      .patch(`/api/v1/projects/${projectId}/outputs/${draftOutputId}/status`)
      .set("X-CSRF-Token", supervisorSession.csrf)
      .send({ status: "APPROVED_INTERNAL", reason: "Approved by supervisor" })
      .expect(200);
    await supervisorSession.agent
      .patch(`/api/v1/projects/${projectId}/outputs/${draftOutputId}/status`)
      .set("X-CSRF-Token", supervisorSession.csrf)
      .send({ status: "SHARED_WITH_CLIENT" })
      .expect(200)
      .expect(({ body }) => {
        expect(
          body.outputs.find((output: { id: string }) => output.id === draftOutputId),
        ).toMatchObject({ status: "SHARED_WITH_CLIENT" });
      });
  });

  it("returns client-safe project data and blocks draft outputs", async () => {
    const { agent } = await login(`client-${runId}@projects.test`);
    const list = await agent.get("/api/v1/client-portal/projects").expect(200);

    expect(list.body.map((project: { id: string }) => project.id)).toContain(projectId);
    expect(list.body.map((project: { id: string }) => project.id)).not.toContain(otherProjectId);

    const detail = await agent.get(`/api/v1/client-portal/projects/${projectId}`).expect(200);
    expect(detail.body.outputs.map((output: { id: string }) => output.id)).toContain(
      sharedOutputId,
    );
    expect(detail.body.outputs.map((output: { id: string }) => output.id)).not.toContain(
      hiddenDraftOutputId,
    );
    expect(detail.body.outputs.map((output: { status: string }) => output.status)).not.toContain(
      "DRAFT",
    );
    expect(detail.body.progress.outputsTotal).toBe(detail.body.outputs.length);
    expect(detail.body.progress.outputsTotal).toBeGreaterThanOrEqual(1);
    expect(
      detail.body.outputs
        .find((output: { id: string }) => output.id === draftOutputId)
        ?.files.find((file: { id: string }) => file.id === uploadedFileId),
    ).toMatchObject({ originalName: "project-output.txt", sizeBytes: 14 });
    const clientDownload = await agent
      .get(`/api/v1/client-portal/projects/${projectId}/files/${uploadedFileId}/download`)
      .expect(200)
      .expect("Content-Type", /text\/plain/);
    expect(clientDownload.text).toBe("project output");
    expect(detail.body.activity).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actorRole: "ROLE-SPECIALIST",
          metadata: expect.objectContaining({
            outputId: sharedOutputId,
            status: "SHARED_WITH_CLIENT",
          }),
        }),
      ]),
    );
  });

  it("lets clients accept shared outputs but not reach other clients' projects", async () => {
    const { agent, csrf } = await login(`client-${runId}@projects.test`);

    await agent.get(`/api/v1/client-portal/projects/${otherProjectId}`).expect(404);
    await agent
      .patch(`/api/v1/client-portal/projects/${projectId}/outputs/${sharedOutputId}/status`)
      .set("X-CSRF-Token", csrf)
      .send({ status: "ACCEPTED_BY_CLIENT", reason: "Approved" })
      .expect(200)
      .expect(({ body }) => {
        expect(
          body.outputs.find((output: { id: string }) => output.id === sharedOutputId),
        ).toMatchObject({
          status: "ACCEPTED_BY_CLIENT",
        });
      });
  });

  it("denies unscoped specialists and clients from internal project APIs", async () => {
    const unscoped = await login(`unscoped-${runId}@projects.test`);
    await unscoped.agent.get(`/api/v1/projects/${projectId}`).expect(404);

    const client = await login(`client-${runId}@projects.test`);
    await client.agent.get("/api/v1/projects").expect(403);
  });
});
