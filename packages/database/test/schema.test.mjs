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
  assert.match(migration, /validation_rule_revisions_one_active/);
  assert.match(
    migration,
    /CREATE TABLE "validation_rule_revisions"[\s\S]*"effectiveTo" TIMESTAMP\(3\)/,
  );
  assert.match(migration, /workflow_versions_one_active/);
  assert.match(migration, /quote_items_exactly_one_service/);
  assert.match(migration, /workflow_events_exactly_one_parent/);
  assert.match(migration, /setupFeePct" <= 100/);
});

test("PR 3 schema stores revocable sessions and one-time auth tokens", async () => {
  const schema = await readFile(
    path.join(workspaceRoot, "packages/database/prisma/schema.prisma"),
    "utf8",
  );
  const migration = await readFile(
    path.join(
      workspaceRoot,
      "packages/database/prisma/migrations/202606210002_pr3_auth_rbac/migration.sql",
    ),
    "utf8",
  );

  assert.match(schema, /model AuthSession \{/);
  assert.match(schema, /tokenHash\s+String\s+@unique/);
  assert.match(schema, /csrfTokenHash\s+String/);
  assert.match(schema, /model AuthToken \{/);
  assert.match(schema, /enum AuthTokenType \{/);
  assert.match(migration, /CREATE TABLE "auth_sessions"/);
  assert.match(migration, /CREATE TABLE "auth_tokens"/);
  assert.match(migration, /ON DELETE CASCADE/);
});

test("PR 4 schema adds editable monthly categories without destructive catalog deletes", async () => {
  const schema = await readFile(
    path.join(workspaceRoot, "packages/database/prisma/schema.prisma"),
    "utf8",
  );
  const migration = await readFile(
    path.join(
      workspaceRoot,
      "packages/database/prisma/migrations/202606210003_pr4_monthly_catalog/migration.sql",
    ),
    "utf8",
  );

  assert.match(schema, /model MonthlyServiceCategory \{/);
  assert.match(schema, /categoryId\s+String\s+@db\.Uuid/);
  assert.match(migration, /Backfill editable categories/);
  assert.match(migration, /ON DELETE RESTRICT/);
  assert.match(migration, /monthly_services_code_ci_key/);
  assert.doesNotMatch(migration, /ON DELETE CASCADE[\s\S]*monthly_service_categories/);
});

test("PR 5 schema keeps one-time services revisioned with editable templates", async () => {
  const schema = await readFile(
    path.join(workspaceRoot, "packages/database/prisma/schema.prisma"),
    "utf8",
  );
  const migration = await readFile(
    path.join(
      workspaceRoot,
      "packages/database/prisma/migrations/202606220001_pr5_one_time_catalog/migration.sql",
    ),
    "utf8",
  );

  assert.match(schema, /model OneTimeServiceCategory \{/);
  assert.match(schema, /model OneTimeServiceTask \{/);
  assert.match(schema, /internalHourlyCostSar\s+Decimal/);
  assert.match(schema, /phaseId\s+String\?\s+@db\.Uuid/);
  assert.match(migration, /Seed editable categories from the Excel V3 service path\/type/);
  assert.match(migration, /one_time_service_tasks/);
  assert.match(migration, /one_time_services_categoryId_fkey/);
  assert.match(migration, /ON DELETE RESTRICT/);
  assert.match(migration, /PERM-MANAGE-ONE-TIME-SERVICES/);
});

test("PR 6 schema stores effective pricing rules and drafts without creating quotes", async () => {
  const schema = await readFile(
    path.join(workspaceRoot, "packages/database/prisma/schema.prisma"),
    "utf8",
  );
  const migration = await readFile(
    path.join(
      workspaceRoot,
      "packages/database/prisma/migrations/202606220002_pr6_pricing_studio_foundation/migration.sql",
    ),
    "utf8",
  );

  assert.match(schema, /model PricingDraft \{/);
  assert.match(schema, /model PricingDraftItem \{/);
  assert.match(schema, /calculationSnapshot\s+Json\?/);
  assert.match(schema, /ruleType\s+String/);
  assert.match(schema, /calculationMethod\s+String/);
  assert.match(migration, /pricing_draft_items_exactly_one_service/);
  assert.match(migration, /ON DELETE RESTRICT/);
  assert.match(migration, /PERM-MANAGE-PRICING-RULES/);
  assert.match(migration, /PERM-USE-PRICING-STUDIO/);
  assert.doesNotMatch(migration, /INSERT INTO "quotes"/);
});

test("PR 7 schema links immutable quote snapshots to pricing drafts", async () => {
  const schema = await readFile(
    path.join(workspaceRoot, "packages/database/prisma/schema.prisma"),
    "utf8",
  );
  const migration = await readFile(
    path.join(
      workspaceRoot,
      "packages/database/prisma/migrations/202606220003_pr7_quote_snapshots/migration.sql",
    ),
    "utf8",
  );

  assert.match(schema, /sourcePricingDraftId\s+String\?\s+@db\.Uuid/);
  assert.match(schema, /pricingSnapshot\s+Json\?/);
  assert.match(schema, /pricingRulesSnapshot\s+Json\?/);
  assert.match(schema, /termsSnapshot\s+Json\?/);
  assert.match(schema, /snapshotHash\s+String\?/);
  assert.match(schema, /ACCEPTED/);
  assert.match(schema, /REJECTED/);
  assert.match(migration, /quotes_snapshot_immutable/);
  assert.match(migration, /quote_items_immutable/);
  assert.match(migration, /quotes_no_delete/);
  assert.match(migration, /PERM-MANAGE-QUOTES/);
  assert.doesNotMatch(migration, /CREATE TABLE "invoices"/);
  assert.doesNotMatch(migration, /pdf/i);
});

test("PR 10 schema creates immutable invoices from quote snapshots", async () => {
  const schema = await readFile(
    path.join(workspaceRoot, "packages/database/prisma/schema.prisma"),
    "utf8",
  );
  const migration = await readFile(
    path.join(
      workspaceRoot,
      "packages/database/prisma/migrations/202606220004_pr10_invoice_foundation/migration.sql",
    ),
    "utf8",
  );

  assert.match(schema, /model Invoice \{/);
  assert.match(schema, /createdById\s+String\?\s+@db\.Uuid/);
  assert.match(schema, /quoteSnapshot\s+Json\?/);
  assert.match(schema, /pricingRulesSnapshot\s+Json\?/);
  assert.match(schema, /sourceQuoteSnapshotHash\s+String\?/);
  assert.match(schema, /snapshotHash\s+String\?/);
  assert.match(schema, /CANCELLED/);
  assert.match(schema, /VOIDED/);
  assert.match(migration, /invoices_quoteId_idx/);
  assert.match(migration, /invoices_snapshot_immutable/);
  assert.match(migration, /invoice_items_immutable/);
  assert.match(migration, /invoices_no_delete/);
  assert.match(migration, /PERM-MANAGE-INVOICES/);
  assert.doesNotMatch(migration, /pdf/i);
  assert.doesNotMatch(migration, /PAID/);
});
