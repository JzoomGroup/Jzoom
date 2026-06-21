import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";

export type JzoomDatabaseClient = PrismaClient;

export { normalizeBlueprint } from "./blueprint/normalizer.js";
export type {
  BlueprintManifest,
  NormalizedBlueprint,
  NormalizedIssue,
} from "./blueprint/normalized-blueprint.js";
export { seedBlueprint } from "./seed/seed-blueprint.js";
export type { BlueprintSeedResult } from "./seed/seed-blueprint.js";

export function createDatabaseClient(connectionString: string): JzoomDatabaseClient {
  const adapter = new PrismaPg({
    connectionString,
  });

  return new PrismaClient({
    adapter,
  });
}
