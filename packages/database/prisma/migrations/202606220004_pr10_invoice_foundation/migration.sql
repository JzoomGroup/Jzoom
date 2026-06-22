-- PR 10 invoice foundation from accepted quote snapshots.
-- Preserve the legacy VOID enum value while adding the explicit lifecycle states used by PR 10.
ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'VOIDED';

ALTER TABLE "invoices"
ADD COLUMN "createdById" UUID,
ADD COLUMN "quoteSnapshot" JSONB,
ADD COLUMN "pricingSnapshot" JSONB,
ADD COLUMN "pricingRulesSnapshot" JSONB,
ADD COLUMN "termsSnapshot" JSONB,
ADD COLUMN "totalsSnapshot" JSONB,
ADD COLUMN "sourceQuoteSnapshotHash" TEXT,
ADD COLUMN "snapshotHash" TEXT,
ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "voidedAt" TIMESTAMP(3),
ADD COLUMN "statusReason" TEXT,
ADD COLUMN "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "invoices_quoteId_idx"
ON "invoices"("quoteId");

CREATE UNIQUE INDEX "invoices_snapshotHash_key"
ON "invoices"("snapshotHash")
WHERE "snapshotHash" IS NOT NULL;

CREATE INDEX "invoices_createdById_status_idx"
ON "invoices"("createdById", "status");

CREATE INDEX "invoices_status_issuedAt_idx"
ON "invoices"("status", "issuedAt");

ALTER TABLE "invoices"
ADD CONSTRAINT "invoices_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Invoice snapshots and lines are immutable after creation. Lifecycle columns remain mutable.
CREATE OR REPLACE FUNCTION prevent_invoice_snapshot_mutation()
RETURNS trigger AS $$
BEGIN
  IF OLD."invoiceNumber" IS DISTINCT FROM NEW."invoiceNumber"
    OR OLD."quoteId" IS DISTINCT FROM NEW."quoteId"
    OR OLD."clientId" IS DISTINCT FROM NEW."clientId"
    OR OLD."createdById" IS DISTINCT FROM NEW."createdById"
    OR OLD."currency" IS DISTINCT FROM NEW."currency"
    OR OLD."clientSnapshot" IS DISTINCT FROM NEW."clientSnapshot"
    OR OLD."quoteSnapshot" IS DISTINCT FROM NEW."quoteSnapshot"
    OR OLD."pricingSnapshot" IS DISTINCT FROM NEW."pricingSnapshot"
    OR OLD."pricingRulesSnapshot" IS DISTINCT FROM NEW."pricingRulesSnapshot"
    OR OLD."termsSnapshot" IS DISTINCT FROM NEW."termsSnapshot"
    OR OLD."totalsSnapshot" IS DISTINCT FROM NEW."totalsSnapshot"
    OR OLD."sourceQuoteSnapshotHash" IS DISTINCT FROM NEW."sourceQuoteSnapshotHash"
    OR OLD."snapshotHash" IS DISTINCT FROM NEW."snapshotHash"
    OR OLD."paymentSnapshot" IS DISTINCT FROM NEW."paymentSnapshot"
    OR OLD."discountTotal" IS DISTINCT FROM NEW."discountTotal"
    OR OLD."finalDueNoTax" IS DISTINCT FROM NEW."finalDueNoTax"
    OR OLD."createdAt" IS DISTINCT FROM NEW."createdAt"
  THEN
    RAISE EXCEPTION 'Invoice snapshot fields are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "invoices_snapshot_immutable"
BEFORE UPDATE ON "invoices"
FOR EACH ROW EXECUTE FUNCTION prevent_invoice_snapshot_mutation();

CREATE OR REPLACE FUNCTION prevent_invoice_content_change()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Invoice content is immutable after creation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "invoice_items_immutable"
BEFORE UPDATE OR DELETE ON "invoice_items"
FOR EACH ROW EXECUTE FUNCTION prevent_invoice_content_change();

CREATE OR REPLACE FUNCTION prevent_invoice_delete()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Invoices cannot be deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "invoices_no_delete"
BEFORE DELETE ON "invoices"
FOR EACH ROW EXECUTE FUNCTION prevent_invoice_delete();

-- Explicit commercial permission for invoice creation and lifecycle management.
INSERT INTO "permissions" (
    "id", "code", "name", "module", "action", "description",
    "status", "sortOrder", "createdAt", "updatedAt"
)
VALUES (
    gen_random_uuid(),
    'PERM-MANAGE-INVOICES',
    'Manage Invoices',
    'Pricing',
    'manage_invoices',
    'Create immutable invoices from accepted quote snapshots and manage invoice lifecycle.',
    'ACTIVE',
    710,
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
  AND permission."code" = 'PERM-MANAGE-INVOICES'
ON CONFLICT ("roleId", "permissionId") DO UPDATE SET "effect" = 'ALLOW';
