import "dotenv/config";

import { createDatabaseClient } from "@jzoom/database";
import { PasswordHasherService } from "../src/auth/password-hasher.service.js";

const allowedTargets = [
  {
    environmentName: "jzoom-staging",
    databaseResourceUuid: "rjehzc5oijp8ywtxcgjgupfi",
    databaseName: "jzoom_staging",
  },
  {
    environmentName: "jzoom-staging2",
    databaseResourceUuid: "g13jp0kb2y48j5luu196s3u2",
    databaseName: "jzoom_staging2",
  },
] as const;
const productionHostnames = new Set(["portal.jzoom.sa", "api.jzoom.sa"]);
const defaultEmails = [
  "info@jzoom.sa",
  "staging.qa.client@jzoom.sa",
  "demo.specialist@jzoom.sa",
  "demo.supervisor@jzoom.sa",
  "demo.account.manager@jzoom.sa",
  "demo.management@jzoom.sa",
];

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function databaseNameFromConnectionString(connectionString: string): string {
  const parsed = new URL(connectionString);
  const databaseName = decodeURIComponent(parsed.pathname.split("/").filter(Boolean)[0] ?? "");
  if (!databaseName) {
    throw new Error("DATABASE_URL must include a database name.");
  }
  return databaseName;
}

function assertNoProductionHostnames(): void {
  for (const name of ["WEB_ORIGIN", "NEXT_PUBLIC_API_BASE_URL", "JZOOM_PUBLIC_API_BASE_URL"]) {
    const value = process.env[name]?.trim();
    if (!value) {
      continue;
    }
    const hostname = new URL(value).hostname.toLowerCase();
    if (productionHostnames.has(hostname)) {
      throw new Error(`${name} points to a production hostname.`);
    }
  }
}

function assertAllowedStagingTarget(databaseUrl: string): void {
  assertNoProductionHostnames();

  const target = allowedTargets.find(
    (candidate) =>
      process.env.STAGING_ENVIRONMENT_NAME === candidate.environmentName &&
      process.env.STAGING_DATABASE_RESOURCE_UUID === candidate.databaseResourceUuid,
  );
  if (!target) {
    throw new Error("This script is only allowed for registered staging database targets.");
  }

  const databaseName = databaseNameFromConnectionString(databaseUrl);
  if (databaseName !== target.databaseName) {
    throw new Error("DATABASE_URL does not match the registered staging database target.");
  }
}

async function main(): Promise<void> {
  if (process.env.STAGING_QA_PASSWORD_RESET_ENABLED !== "true") {
    throw new Error("STAGING_QA_PASSWORD_RESET_ENABLED must be true.");
  }

  const databaseUrl = required("DATABASE_URL");
  assertAllowedStagingTarget(databaseUrl);

  const password = required("STAGING_QA_PASSWORD");
  const emails = (process.env.STAGING_QA_USER_EMAILS ?? defaultEmails.join(","))
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  const passwordHash = await new PasswordHasherService().hash(password);
  const database = createDatabaseClient(databaseUrl);
  const now = new Date();

  try {
    const result = await database.user.updateMany({
      where: {
        email: { in: emails },
        status: { not: "ARCHIVED" },
      },
      data: {
        passwordHash,
        passwordChangedAt: now,
        failedLoginCount: 0,
        lockedUntil: null,
        status: "ACTIVE",
        sessionVersion: { increment: 1 },
        updatedAt: now,
      },
    });

    await database.authSession.updateMany({
      where: {
        user: { email: { in: emails } },
        revokedAt: null,
      },
      data: {
        revokedAt: now,
        revokeReason: "staging_qa_password_reset",
        updatedAt: now,
      },
    });

    process.stdout.write(
      `${JSON.stringify({
        event: "staging_qa_passwords_reset",
        updatedUsers: result.count,
        expectedUsers: emails.length,
        emails,
      })}\n`,
    );
  } finally {
    await database.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Staging QA password reset failed: ${message}\n`);
  process.exitCode = 1;
});
