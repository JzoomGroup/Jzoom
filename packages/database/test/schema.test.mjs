import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const workspaceRoot = path.resolve(import.meta.dirname, "../../..");

test("schema contains revisioned Admin-configurable business entities", async () => {
  const schema = await readFile(
    path.join(workspaceRoot, "packages/database/prisma/schema.prisma"),
    "utf8",
  );

  for (const model of [
    "MonthlyServiceRevision",
    "ServiceItemRevision",
    "OneTimeServiceRevision",
    "PricingRuleRevision",
    "WorkflowVersion",
    "PdfTemplateVersion",
    "NotificationTemplateVersion",
    "ValidationRuleRevision",
    "PlatformSettingRevision",
    "TranslationRevision",
    "BlueprintSheetSnapshot",
  ]) {
    assert.match(schema, new RegExp(`model ${model} \\{`));
  }
  assert.match(schema, /cardConfiguration\s+Json\?/);
  assert.match(schema, /confirmationRule\s+String\?/);
  assert.match(schema, /reasonRule\s+String\?/);
});

test("migration enforces active revision and polymorphic integrity constraints", async () => {
  const migration = await readFile(
    path.join(
      workspaceRoot,
      "packages/database/prisma/migrations/202606210001_pr2_business_configuration/migration.sql",
    ),
    "utf8",
  );

  assert.match(migration, /monthly_service_revisions_one_active/);
  assert.match(migration, /service_item_revisions_one_active/);
  assert.match(migration, /workflow_versions_one_active/);
  assert.match(migration, /quote_items_exactly_one_service/);
  assert.match(migration, /workflow_events_exactly_one_parent/);
  assert.match(migration, /setupFeePct" <= 100/);
});
