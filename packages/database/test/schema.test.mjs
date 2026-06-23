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

test("PR 13 schema adds request lifecycle source links and assignments", async () => {
  const schema = await readFile(
    path.join(workspaceRoot, "packages/database/prisma/schema.prisma"),
    "utf8",
  );
  const migration = await readFile(
    path.join(
      workspaceRoot,
      "packages/database/prisma/migrations/202606220005_pr13_request_lifecycle_foundation/migration.sql",
    ),
    "utf8",
  );

  assert.match(schema, /enum RequestStatus \{/);
  assert.match(schema, /WAITING_CLIENT/);
  assert.match(schema, /WAITING_SUPERVISOR/);
  assert.match(schema, /sourceQuoteId\s+String\?\s+@db\.Uuid/);
  assert.match(schema, /sourceInvoiceId\s+String\?\s+@db\.Uuid/);
  assert.match(schema, /assignedSpecialistId\s+String\?\s+@db\.Uuid/);
  assert.match(schema, /assignedSupervisorId\s+String\?\s+@db\.Uuid/);
  assert.match(schema, /accountManagerId\s+String\?\s+@db\.Uuid/);
  assert.match(migration, /CREATE TYPE "RequestStatus"/);
  assert.match(migration, /requests_sourceQuoteId_fkey/);
  assert.match(migration, /requests_sourceInvoiceId_fkey/);
  assert.match(migration, /requests_assignedSpecialistId_fkey/);
  assert.match(migration, /ON DELETE SET NULL/);
  assert.doesNotMatch(migration, /DROP TABLE/);
});

test("PR 14 schema adds internal request outputs and task assignee integrity", async () => {
  const schema = await readFile(
    path.join(workspaceRoot, "packages/database/prisma/schema.prisma"),
    "utf8",
  );
  const migration = await readFile(
    path.join(
      workspaceRoot,
      "packages/database/prisma/migrations/202606230001_pr14_request_execution_foundation/migration.sql",
    ),
    "utf8",
  );

  assert.match(schema, /model RequestOutput \{/);
  assert.match(schema, /requestId\s+String\s+@db\.Uuid/);
  assert.match(schema, /contentSnapshot\s+Json\?/);
  assert.match(schema, /status\s+OutputStatus\s+@default\(DRAFT\)/);
  assert.match(schema, /assignedTasks\s+Task\[\]\s+@relation\("TaskAssignee"\)/);
  assert.match(schema, /assignee\s+User\?\s+@relation\("TaskAssignee"/);
  assert.match(migration, /CREATE TABLE "request_outputs"/);
  assert.match(migration, /request_outputs_requestId_fkey/);
  assert.match(migration, /tasks_assigneeId_fkey/);
  assert.match(migration, /ON DELETE SET NULL/);
  assert.doesNotMatch(migration, /client_visible/i);
  assert.doesNotMatch(migration, /DROP TABLE/);
});

test("PR 15 schema adds client delivery, document requests, and basic hours metadata", async () => {
  const schema = await readFile(
    path.join(workspaceRoot, "packages/database/prisma/schema.prisma"),
    "utf8",
  );
  const migration = await readFile(
    path.join(
      workspaceRoot,
      "packages/database/prisma/migrations/202606230002_pr15_client_delivery_workflow_hours/migration.sql",
    ),
    "utf8",
  );

  assert.match(schema, /SHARED_WITH_CLIENT/);
  assert.match(schema, /ACCEPTED_BY_CLIENT/);
  assert.match(schema, /RETURNED_BY_CLIENT/);
  assert.match(schema, /model ClientDocumentRequest \{/);
  assert.match(schema, /documentRequests\s+ClientDocumentRequest\[\]/);
  assert.match(schema, /decisionReason\s+String\?\s+@db\.Text/);
  assert.match(schema, /decidedBy\s+User\?\s+@relation\("TimeEntryDecider"/);
  assert.match(migration, /ALTER TYPE "OutputStatus" ADD VALUE IF NOT EXISTS 'SHARED_WITH_CLIENT'/);
  assert.match(migration, /CREATE TYPE "ClientDocumentRequestStatus"/);
  assert.match(migration, /CREATE TABLE "client_document_requests"/);
  assert.match(migration, /time_entries_decidedById_fkey/);
  assert.doesNotMatch(migration, /HourLedgerTransaction/i);
  assert.doesNotMatch(migration, /notifications/i);
});

test("PR 16 schema stores client monthly report snapshots without external sends", async () => {
  const schema = await readFile(
    path.join(workspaceRoot, "packages/database/prisma/schema.prisma"),
    "utf8",
  );
  const migration = await readFile(
    path.join(
      workspaceRoot,
      "packages/database/prisma/migrations/202606230003_pr16_notifications_reports_account_manager/migration.sql",
    ),
    "utf8",
  );

  assert.match(schema, /enum MonthlyReportStatus \{/);
  assert.match(schema, /model Notification \{/);
  assert.match(schema, /model OutboxEvent \{/);
  assert.match(schema, /model ClientMonthlyReport \{/);
  assert.match(schema, /summarySnapshot\s+Json/);
  assert.match(
    schema,
    /preparedMonthlyReports\s+ClientMonthlyReport\[\]\s+@relation\("MonthlyReportPreparer"\)/,
  );
  assert.match(migration, /CREATE TYPE "MonthlyReportStatus"/);
  assert.match(migration, /CREATE TABLE "client_monthly_reports"/);
  assert.match(migration, /client_monthly_reports_no_delete/);
  assert.doesNotMatch(migration, /email|sms|whatsapp/i);
  assert.doesNotMatch(migration, /monthly_closing/i);
});

test("PR 17 schema adds immutable client monthly closings for hours ledger closing", async () => {
  const schema = await readFile(
    path.join(workspaceRoot, "packages/database/prisma/schema.prisma"),
    "utf8",
  );
  const migration = await readFile(
    path.join(
      workspaceRoot,
      "packages/database/prisma/migrations/202606230004_pr17_hours_ledger_monthly_closing/migration.sql",
    ),
    "utf8",
  );

  assert.match(schema, /enum MonthlyClosingStatus \{/);
  assert.match(schema, /model ClientMonthlyClosing \{/);
  assert.match(schema, /summarySnapshot\s+Json/);
  assert.match(
    schema,
    /preparedMonthlyClosings\s+ClientMonthlyClosing\[\]\s+@relation\("MonthlyClosingPreparer"\)/,
  );
  assert.match(
    schema,
    /finalizedMonthlyClosings\s+ClientMonthlyClosing\[\]\s+@relation\("MonthlyClosingFinalizer"\)/,
  );
  assert.match(migration, /CREATE TYPE "MonthlyClosingStatus"/);
  assert.match(migration, /CREATE TABLE "client_monthly_closings"/);
  assert.match(migration, /client_monthly_closings_no_delete/);
  assert.match(migration, /client_monthly_closings_finalized_snapshot_immutable/);
  assert.match(migration, /client_monthly_reports_published_snapshot_immutable/);
  assert.doesNotMatch(migration, /payment|payroll|public_link/i);
});

test("PR 18 seed exposes Admin-configurable platform and template foundations", async () => {
  const normalizer = await readFile(
    path.join(workspaceRoot, "packages/database/src/blueprint/normalizer.ts"),
    "utf8",
  );
  const seed = await readFile(
    path.join(workspaceRoot, "packages/database/src/seed/seed-blueprint.ts"),
    "utf8",
  );

  assert.match(normalizer, /platform\.name/);
  assert.match(normalizer, /localization\.date_format/);
  assert.match(normalizer, /branding\.colors/);
  assert.match(normalizer, /branding\.pdf_display_name/);
  assert.match(normalizer, /business_text\.quote_terms/);
  assert.match(normalizer, /business_text\.invoice_terms/);
  assert.match(normalizer, /business_text\.request_instructions/);
  assert.match(normalizer, /business_text\.client_document_request/);
  assert.match(normalizer, /business_text\.output_delivery_note/);
  assert.match(seed, /PERM-MANAGE-PLATFORM-CONFIGURATION/);
  assert.doesNotMatch(normalizer, /payment_gateway|zatca|whatsapp_sender/i);
});
