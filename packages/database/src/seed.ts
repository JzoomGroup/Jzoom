import "dotenv/config";

import path from "node:path";

import { normalizeBlueprint } from "./blueprint/normalizer.js";
import { createDatabaseClient } from "./index.js";
import { seedBlueprint } from "./seed/seed-blueprint.js";
import { findWorkspaceRoot } from "./workspace-root.js";

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to seed the database.");
  }

  const workspaceRoot = await findWorkspaceRoot(import.meta.dirname);
  const blueprint = await normalizeBlueprint(path.join(workspaceRoot, "data", "blueprints"));
  const database = createDatabaseClient(connectionString);

  try {
    const result = await seedBlueprint(database, blueprint);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } finally {
    await database.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Database seed failed: ${message}\n`);
  process.exitCode = 1;
});
