import "dotenv/config";

import { createDatabaseClient } from "@jzoom/database";
import { PasswordHasherService } from "../src/auth/password-hasher.service.js";

const expectedEnvironmentName = "jzoom-staging";
const expectedDatabaseResourceUuid = "rjehzc5oijp8ywtxcgjgupfi";
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

async function main(): Promise<void> {
  if (process.env.STAGING_QA_PASSWORD_RESET_ENABLED !== "true") {
    throw new Error("STAGING_QA_PASSWORD_RESET_ENABLED must be true.");
  }
  if (process.env.STAGING_ENVIRONMENT_NAME !== expectedEnvironmentName) {
    throw new Error("This script is only allowed in the jzoom-staging environment.");
  }
  if (process.env.STAGING_DATABASE_RESOURCE_UUID !== expectedDatabaseResourceUuid) {
    throw new Error("The configured database resource is not the staging database.");
  }

  const databaseUrl = required("DATABASE_URL");
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
