import "dotenv/config";
import { parseApiEnvironment } from "@jzoom/config";
import { createDatabaseClient } from "@jzoom/database";
import { ADMIN_ROLE_CODE } from "../src/auth/auth.constants.js";
import { PasswordHasherService } from "../src/auth/password-hasher.service.js";

async function bootstrapAdmin(): Promise<void> {
  const environment = parseApiEnvironment(process.env);
  if (!environment.bootstrapAdmin) {
    throw new Error(
      "BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD are required for this command.",
    );
  }

  const database = createDatabaseClient(environment.databaseUrl);
  try {
    const existingActiveAdmin = await database.user.findFirst({
      where: {
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
      select: { id: true },
    });
    if (existingActiveAdmin) {
      process.stdout.write("An active Admin already exists; bootstrap was skipped.\n");
      return;
    }

    const adminRole = await database.role.findUnique({
      where: { code: ADMIN_ROLE_CODE },
      select: { id: true },
    });
    if (!adminRole) {
      throw new Error("ROLE-ADMIN is missing. Apply migrations and the V3 seed first.");
    }

    const passwordHash = await new PasswordHasherService().hash(
      environment.bootstrapAdmin.password,
    );
    const email = environment.bootstrapAdmin.email;
    const user = await database.user.upsert({
      where: { email },
      create: {
        email,
        displayName: "Platform Admin",
        userType: "INTERNAL",
        status: "ACTIVE",
        passwordHash,
        passwordChangedAt: new Date(),
      },
      update: {
        status: "ACTIVE",
        archivedAt: null,
        passwordHash,
        passwordChangedAt: new Date(),
        failedLoginCount: 0,
        lockedUntil: null,
        sessionVersion: { increment: 1 },
      },
    });
    await database.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: adminRole.id,
        },
      },
      create: {
        userId: user.id,
        roleId: adminRole.id,
      },
      update: {},
    });
    await database.auditLog.create({
      data: {
        actorId: user.id,
        eventCode: "AUTH_BOOTSTRAP_ADMIN_CREATED",
        entityType: "User",
        entityId: user.id,
        severity: "CRITICAL",
      },
    });

    process.stdout.write("Bootstrap Admin created successfully.\n");
  } finally {
    await database.$disconnect();
  }
}

void bootstrapAdmin().catch((error: unknown) => {
  process.stderr.write(
    `Bootstrap Admin failed: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
