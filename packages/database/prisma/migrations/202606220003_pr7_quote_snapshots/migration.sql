-- Add the PR 7 quote lifecycle states without removing legacy enum values.
ALTER TYPE "QuoteStatus" ADD VALUE IF NOT EXISTS 'ACCEPTED';
ALTER TYPE "QuoteStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

-- Link quotes to the saved pricing draft while copying all mutable content into immutable JSON.
ALTER TABLE "quotes"
ADD COLUMN "sourcePricingDraftId" UUID,
ADD COLUMN "createdById" UUID,
ADD COLUMN "sourceDraftVersion" INTEGER,
ADD COLUMN "pricingSnapshot" JSONB,
ADD COLUMN "pricingRulesSnapshot" JSONB,
ADD COLUMN "termsSnapshot" JSONB,
ADD COLUMN "sourceDraftSnapshot" JSONB,
ADD COLUMN "totalsSnapshot" JSONB,
ADD COLUMN "snapshotHash" TEXT,
ADD COLUMN "acceptedAt" TIMESTAMP(3),
ADD COLUMN "rejectedAt" TIMESTAMP(3),
ADD COLUMN "expiredAt" TIMESTAMP(3),
ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "statusReason" TEXT,
ADD COLUMN "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "quotes_sourcePricingDraftId_idx"
ON "quotes"("sourcePricingDraftId");

CREATE INDEX "quotes_createdById_status_idx"
ON "quotes"("createdById", "status");

CREATE UNIQUE INDEX "quotes_snapshotHash_key"
ON "quotes"("snapshotHash")
WHERE "snapshotHash" IS NOT NULL;

ALTER TABLE "quotes"
ADD CONSTRAINT "quotes_sourcePricingDraftId_fkey"
FOREIGN KEY ("sourcePricingDraftId") REFERENCES "pricing_drafts"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "quotes"
ADD CONSTRAINT "quotes_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Quote snapshots and line content are append-only. Lifecycle columns remain mutable.
CREATE OR REPLACE FUNCTION prevent_quote_snapshot_mutation()
RETURNS trigger AS $$
BEGIN
  IF OLD."quoteNumber" IS DISTINCT FROM NEW."quoteNumber"
    OR OLD."clientId" IS DISTINCT FROM NEW."clientId"
    OR OLD."sourcePricingDraftId" IS DISTINCT FROM NEW."sourcePricingDraftId"
    OR OLD."createdById" IS DISTINCT FROM NEW."createdById"
    OR OLD."sourceDraftVersion" IS DISTINCT FROM NEW."sourceDraftVersion"
    OR OLD."currency" IS DISTINCT FROM NEW."currency"
    OR OLD."clientSnapshot" IS DISTINCT FROM NEW."clientSnapshot"
    OR OLD."pricingSnapshot" IS DISTINCT FROM NEW."pricingSnapshot"
    OR OLD."pricingRulesSnapshot" IS DISTINCT FROM NEW."pricingRulesSnapshot"
    OR OLD."termsSnapshot" IS DISTINCT FROM NEW."termsSnapshot"
    OR OLD."sourceDraftSnapshot" IS DISTINCT FROM NEW."sourceDraftSnapshot"
    OR OLD."totalsSnapshot" IS DISTINCT FROM NEW."totalsSnapshot"
    OR OLD."snapshotHash" IS DISTINCT FROM NEW."snapshotHash"
    OR OLD."subtotalMonthly" IS DISTINCT FROM NEW."subtotalMonthly"
    OR OLD."subtotalSetup" IS DISTINCT FROM NEW."subtotalSetup"
    OR OLD."subtotalOneTime" IS DISTINCT FROM NEW."subtotalOneTime"
    OR OLD."discountTotal" IS DISTINCT FROM NEW."discountTotal"
    OR OLD."finalDueNoTax" IS DISTINCT FROM NEW."finalDueNoTax"
    OR OLD."internalCost" IS DISTINCT FROM NEW."internalCost"
    OR OLD."margin" IS DISTINCT FROM NEW."margin"
    OR OLD."createdAt" IS DISTINCT FROM NEW."createdAt"
  THEN
    RAISE EXCEPTION 'Quote snapshot fields are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "quotes_snapshot_immutable"
BEFORE UPDATE ON "quotes"
FOR EACH ROW EXECUTE FUNCTION prevent_quote_snapshot_mutation();

CREATE OR REPLACE FUNCTION prevent_quote_content_change()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Quote content is immutable after creation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "quote_items_immutable"
BEFORE UPDATE OR DELETE ON "quote_items"
FOR EACH ROW EXECUTE FUNCTION prevent_quote_content_change();

CREATE TRIGGER "quote_item_service_snapshots_immutable"
BEFORE UPDATE OR DELETE ON "quote_item_service_item_snapshots"
FOR EACH ROW EXECUTE FUNCTION prevent_quote_content_change();

CREATE OR REPLACE FUNCTION prevent_quote_delete()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Quotes cannot be deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "quotes_no_delete"
BEFORE DELETE ON "quotes"
FOR EACH ROW EXECUTE FUNCTION prevent_quote_delete();

-- Explicit commercial permission for quote creation and lifecycle management.
INSERT INTO "permissions" (
    "id", "code", "name", "module", "action", "description",
    "status", "sortOrder", "createdAt", "updatedAt"
)
VALUES (
    gen_random_uuid(),
    'PERM-MANAGE-QUOTES',
    'Manage Quotes',
    'Pricing',
    'manage_quotes',
    'Create immutable quotes from scoped pricing drafts and manage quote lifecycle.',
    'ACTIVE',
    700,
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
WHERE role."code" IN ('ROLE-ADMIN', 'ROLE-AM')
  AND permission."code" = 'PERM-MANAGE-QUOTES'
ON CONFLICT ("roleId", "permissionId") DO UPDATE SET "effect" = 'ALLOW';
