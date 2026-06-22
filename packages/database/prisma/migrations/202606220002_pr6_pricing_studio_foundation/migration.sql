-- Extend the Excel V3 pricing-rule foundation with structured, versioned configuration.
ALTER TABLE "pricing_rule_revisions"
ADD COLUMN "ruleType" TEXT NOT NULL DEFAULT 'FORMULA',
ADD COLUMN "calculationMethod" TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN "value" DECIMAL(18,4),
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'SAR',
ADD COLUMN "targetType" TEXT NOT NULL DEFAULT 'ALL',
ADD COLUMN "targetCode" TEXT,
ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "isStackable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "isEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "conditions" JSONB;

UPDATE "pricing_rule_revisions"
SET
  "ruleType" = CASE
    WHEN "pricingRuleId" IN (SELECT "id" FROM "pricing_rules" WHERE "code" IN ('PR-001', 'PR-003')) THEN 'RATE_CARD'
    WHEN "pricingRuleId" IN (SELECT "id" FROM "pricing_rules" WHERE "code" = 'PR-002') THEN 'SETUP_FEE'
    WHEN "pricingRuleId" IN (SELECT "id" FROM "pricing_rules" WHERE "code" = 'PR-004') THEN 'DISCOUNT'
    WHEN "pricingRuleId" IN (SELECT "id" FROM "pricing_rules" WHERE "code" = 'PR-007') THEN 'MARGIN'
    ELSE 'FORMULA'
  END,
  "targetType" = CASE
    WHEN "pricingRuleId" IN (SELECT "id" FROM "pricing_rules" WHERE "code" IN ('PR-001', 'PR-002')) THEN 'MONTHLY'
    WHEN "pricingRuleId" IN (SELECT "id" FROM "pricing_rules" WHERE "code" = 'PR-003') THEN 'ONE_TIME'
    ELSE 'ALL'
  END,
  "priority" = COALESCE((
    SELECT "sortOrder" FROM "pricing_rules"
    WHERE "pricing_rules"."id" = "pricing_rule_revisions"."pricingRuleId"
  ), 0);

-- Persist Pricing Studio work independently from quote issuance.
CREATE TABLE "pricing_drafts" (
    "id" UUID NOT NULL,
    "draftNumber" TEXT NOT NULL,
    "clientId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "updatedById" UUID,
    "status" "RecordStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "pricingDate" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "clientSnapshot" JSONB NOT NULL,
    "calculationSnapshot" JSONB,
    "calculationVersion" INTEGER NOT NULL DEFAULT 0,
    "lastCalculatedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_drafts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pricing_draft_items" (
    "id" UUID NOT NULL,
    "pricingDraftId" UUID NOT NULL,
    "lineType" TEXT NOT NULL,
    "monthlyServiceRevisionId" UUID,
    "oneTimeServiceRevisionId" UUID,
    "serviceLevelId" UUID,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_draft_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pricing_rules_code_ci_key"
ON "pricing_rules"(LOWER("code"));

CREATE UNIQUE INDEX "pricing_drafts_draftNumber_key"
ON "pricing_drafts"("draftNumber");

CREATE INDEX "pricing_drafts_clientId_status_updatedAt_idx"
ON "pricing_drafts"("clientId", "status", "updatedAt");

CREATE INDEX "pricing_drafts_createdById_status_updatedAt_idx"
ON "pricing_drafts"("createdById", "status", "updatedAt");

CREATE UNIQUE INDEX "pricing_draft_items_selection_key"
ON "pricing_draft_items"(
  "pricingDraftId",
  "lineType",
  COALESCE("monthlyServiceRevisionId", '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE("oneTimeServiceRevisionId", '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE("serviceLevelId", '00000000-0000-0000-0000-000000000000'::uuid)
);

CREATE INDEX "pricing_draft_items_pricingDraftId_sortOrder_idx"
ON "pricing_draft_items"("pricingDraftId", "sortOrder");

CREATE INDEX "pricing_draft_items_monthlyServiceRevisionId_idx"
ON "pricing_draft_items"("monthlyServiceRevisionId");

CREATE INDEX "pricing_draft_items_oneTimeServiceRevisionId_idx"
ON "pricing_draft_items"("oneTimeServiceRevisionId");

ALTER TABLE "pricing_draft_items"
ADD CONSTRAINT "pricing_draft_items_exactly_one_service"
CHECK (
  (("monthlyServiceRevisionId" IS NOT NULL)::int + ("oneTimeServiceRevisionId" IS NOT NULL)::int) = 1
);

ALTER TABLE "pricing_draft_items"
ADD CONSTRAINT "pricing_draft_items_line_type"
CHECK (
  ("lineType" = 'MONTHLY' AND "monthlyServiceRevisionId" IS NOT NULL AND "serviceLevelId" IS NOT NULL)
  OR
  ("lineType" = 'ONE_TIME' AND "oneTimeServiceRevisionId" IS NOT NULL AND "serviceLevelId" IS NULL)
);

ALTER TABLE "pricing_draft_items"
ADD CONSTRAINT "pricing_draft_items_quantity_positive"
CHECK ("quantity" > 0);

ALTER TABLE "pricing_drafts"
ADD CONSTRAINT "pricing_drafts_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "clients"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "pricing_drafts"
ADD CONSTRAINT "pricing_drafts_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "pricing_drafts"
ADD CONSTRAINT "pricing_drafts_updatedById_fkey"
FOREIGN KEY ("updatedById") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "pricing_draft_items"
ADD CONSTRAINT "pricing_draft_items_pricingDraftId_fkey"
FOREIGN KEY ("pricingDraftId") REFERENCES "pricing_drafts"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pricing_draft_items"
ADD CONSTRAINT "pricing_draft_items_monthlyServiceRevisionId_fkey"
FOREIGN KEY ("monthlyServiceRevisionId") REFERENCES "monthly_service_revisions"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "pricing_draft_items"
ADD CONSTRAINT "pricing_draft_items_oneTimeServiceRevisionId_fkey"
FOREIGN KEY ("oneTimeServiceRevisionId") REFERENCES "one_time_service_revisions"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "pricing_draft_items"
ADD CONSTRAINT "pricing_draft_items_serviceLevelId_fkey"
FOREIGN KEY ("serviceLevelId") REFERENCES "service_levels"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Explicit permissions for the PR 6 route/action additions.
INSERT INTO "permissions" (
    "id", "code", "name", "module", "action", "description",
    "status", "sortOrder", "createdAt", "updatedAt"
)
VALUES
(
    gen_random_uuid(),
    'PERM-MANAGE-PRICING-RULES',
    'Manage Pricing Rules',
    'Pricing',
    'manage_pricing_rules',
    'Create and configure effective-dated pricing-rule revisions.',
    'ACTIVE',
    600,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    gen_random_uuid(),
    'PERM-USE-PRICING-STUDIO',
    'Use Pricing Studio',
    'Pricing',
    'use_pricing_studio',
    'Create, calculate, save, and reload scoped pricing drafts.',
    'ACTIVE',
    601,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "role_permissions" (
    "roleId", "permissionId", "effect", "createdAt", "updatedAt"
)
SELECT
    role."id",
    permission."id",
    'ALLOW',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "roles" AS role
CROSS JOIN "permissions" AS permission
WHERE
  (role."code" = 'ROLE-ADMIN' AND permission."code" IN (
    'PERM-MANAGE-PRICING-RULES',
    'PERM-USE-PRICING-STUDIO'
  ))
  OR
  (role."code" = 'ROLE-AM' AND permission."code" = 'PERM-USE-PRICING-STUDIO')
ON CONFLICT ("roleId", "permissionId") DO UPDATE SET "effect" = 'ALLOW';
