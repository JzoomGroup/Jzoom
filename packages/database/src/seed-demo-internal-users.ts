import "dotenv/config";

import { randomBytes, scrypt } from "node:crypto";
import { Client } from "pg";

const keyLength = 64;
const cost = 16_384;
const blockSize = 8;
const parallelization = 1;
const maxMemory = 32 * 1024 * 1024;
const demoBatch = process.env.DEMO_INTERNAL_USERS_BATCH ?? "STAGING-DEMO-2026-06-27";
const demoClientCodes = ["DEMO-ACME-001", "DEMO-NOVA-002", "DEMO-ORBIT-003"] as const;
const stableAssignmentStart = "2026-06-27T00:00:00.000Z";

interface DemoUser {
  email: string;
  displayName: string;
  password: string;
  roleCode: "ROLE-MGMT" | "ROLE-AM" | "ROLE-SUPERVISOR" | "ROLE-SPECIALIST";
  preferredLocale: "ar" | "en";
}

interface RoleRow {
  id: string;
  code: DemoUser["roleCode"];
}

interface ClientRow {
  id: string;
  code: string;
}

const demoUsers: DemoUser[] = [
  {
    email: "demo.management@jzoom.sa",
    displayName: "Demo Management User",
    password: "DemoInternal2026!M",
    roleCode: "ROLE-MGMT",
    preferredLocale: "en",
  },
  {
    email: "demo.account.manager@jzoom.sa",
    displayName: "Demo Account Manager",
    password: "DemoInternal2026!A",
    roleCode: "ROLE-AM",
    preferredLocale: "en",
  },
  {
    email: "demo.supervisor@jzoom.sa",
    displayName: "Demo Supervisor",
    password: "DemoInternal2026!S",
    roleCode: "ROLE-SUPERVISOR",
    preferredLocale: "en",
  },
  {
    email: "demo.specialist@jzoom.sa",
    displayName: "Demo Specialist",
    password: "DemoInternal2026!P",
    roleCode: "ROLE-SPECIALIST",
    preferredLocale: "en",
  },
];

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to seed demo internal users.");
  }

  const database = new Client({ connectionString });
  await database.connect();

  try {
    await database.query("begin");
    const roles = await loadRoles(database);
    const clients = await loadDemoClients(database);
    const seeded = [];

    for (const user of demoUsers) {
      const userId = await upsertDemoUser(database, user);
      await replaceUserRole(database, userId, roles.get(user.roleCode)!.id);
      await replaceDemoScopes(database, userId, user.roleCode, clients);
      await revokeSessions(database, userId);

      seeded.push({
        email: user.email,
        displayName: user.displayName,
        roleCode: user.roleCode,
        userId,
      });
    }

    await database.query("commit");
    process.stdout.write(`${JSON.stringify({ demoBatch, users: seeded }, null, 2)}\n`);
  } catch (error) {
    await database.query("rollback");
    throw error;
  } finally {
    await database.end();
  }
}

async function loadRoles(database: Client): Promise<Map<DemoUser["roleCode"], RoleRow>> {
  const roleCodes = demoUsers.map((user) => user.roleCode);
  const result = await database.query<RoleRow>(
    `
      select id, code
      from roles
      where code = any($1::text[])
        and status = 'ACTIVE'
    `,
    [roleCodes],
  );
  const roles = new Map(result.rows.map((role) => [role.code, role]));
  const missing = roleCodes.filter((roleCode) => !roles.has(roleCode));
  if (missing.length > 0) {
    throw new Error(`Missing active demo roles: ${missing.join(", ")}`);
  }
  return roles;
}

async function loadDemoClients(database: Client): Promise<ClientRow[]> {
  const result = await database.query<ClientRow>(
    `
      select id, code
      from clients
      where code = any($1::text[])
      order by code
    `,
    [demoClientCodes],
  );
  if (result.rows.length !== demoClientCodes.length) {
    throw new Error(
      `Expected ${demoClientCodes.length} demo clients, found ${result.rows.length}.`,
    );
  }
  return result.rows;
}

async function upsertDemoUser(database: Client, user: DemoUser): Promise<string> {
  const passwordHash = await hashPassword(user.password);
  const result = await database.query<{ id: string }>(
    `
      insert into users (
        id,
        email,
        "passwordHash",
        "displayName",
        "preferredLocale",
        "userType",
        status,
        "failedLoginCount",
        "lockedUntil",
        "passwordChangedAt",
        "createdAt",
        "updatedAt"
      )
      values (
        gen_random_uuid(),
        $1,
        $2,
        $3,
        $4,
        'INTERNAL',
        'ACTIVE',
        0,
        null,
        now(),
        now(),
        now()
      )
      on conflict (email) do update
      set
        "passwordHash" = excluded."passwordHash",
        "displayName" = excluded."displayName",
        "preferredLocale" = excluded."preferredLocale",
        "userType" = 'INTERNAL',
        status = 'ACTIVE',
        "failedLoginCount" = 0,
        "lockedUntil" = null,
        "passwordChangedAt" = now(),
        "archivedAt" = null,
        "sessionVersion" = users."sessionVersion" + 1,
        "updatedAt" = now()
      returning id
    `,
    [user.email, passwordHash, user.displayName, user.preferredLocale],
  );
  return result.rows[0]!.id;
}

async function replaceUserRole(database: Client, userId: string, roleId: string): Promise<void> {
  await database.query(`delete from user_roles where "userId" = $1`, [userId]);
  await database.query(
    `
      insert into user_roles ("userId", "roleId", "createdAt")
      values ($1, $2, now())
      on conflict ("userId", "roleId") do nothing
    `,
    [userId, roleId],
  );
}

async function replaceDemoScopes(
  database: Client,
  userId: string,
  roleCode: DemoUser["roleCode"],
  clients: ClientRow[],
): Promise<void> {
  await database.query(
    `
      delete from user_scopes
      where "userId" = $1
        and "scopeType" in ('GLOBAL', 'ASSIGNED_CLIENTS')
    `,
    [userId],
  );

  await database.query(
    `
      delete from client_assignments
      where "userId" = $1
        and "clientId" = any($2::uuid[])
        and "roleCode" in ('ROLE-AM')
    `,
    [userId, clients.map((client) => client.id)],
  );

  if (roleCode === "ROLE-MGMT") {
    await database.query(
      `
        insert into user_scopes (id, "userId", "scopeType", "createdAt", "updatedAt")
        values (gen_random_uuid(), $1, 'GLOBAL', now(), now())
      `,
      [userId],
    );
  }

  if (roleCode === "ROLE-AM") {
    for (const client of clients) {
      await database.query(
        `
          insert into user_scopes (
            id,
            "userId",
            "scopeType",
            "clientId",
            "createdAt",
            "updatedAt"
          )
          values (gen_random_uuid(), $1, 'ASSIGNED_CLIENTS', $2, now(), now())
        `,
        [userId, client.id],
      );
      await database.query(
        `
          insert into client_assignments (
            id,
            "clientId",
            "userId",
            "roleCode",
            "startsAt",
            "createdAt",
            "updatedAt"
          )
          values (gen_random_uuid(), $1, $2, 'ROLE-AM', $3::timestamp, now(), now())
          on conflict ("clientId", "userId", "roleCode", "startsAt") do nothing
        `,
        [client.id, userId, stableAssignmentStart],
      );
    }
  }
}

async function revokeSessions(database: Client, userId: string): Promise<void> {
  await database.query(
    `
      update auth_sessions
      set "revokedAt" = coalesce("revokedAt", now()),
        "revokeReason" = coalesce("revokeReason", 'demo_user_reseeded'),
        "updatedAt" = now()
      where "userId" = $1
        and "revokedAt" is null
    `,
    [userId],
  );
}

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      keyLength,
      {
        N: cost,
        r: blockSize,
        p: parallelization,
        maxmem: maxMemory,
      },
      (error, key) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(key);
      },
    );
  });
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);
  return [
    "scrypt",
    cost,
    blockSize,
    parallelization,
    salt.toString("base64url"),
    key.toString("base64url"),
  ].join("$");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Demo internal user seed failed: ${message}\n`);
  process.exitCode = 1;
});
