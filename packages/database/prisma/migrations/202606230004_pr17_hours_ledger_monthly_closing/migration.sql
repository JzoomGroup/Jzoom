-- PR 17: Hours Ledger + Monthly Closing Foundation

CREATE TYPE "MonthlyClosingStatus" AS ENUM ('DRAFT', 'FINALIZED', 'ARCHIVED');

CREATE TABLE "client_monthly_closings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clientId" UUID NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "MonthlyClosingStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "summarySnapshot" JSONB NOT NULL,
    "preparedById" UUID,
    "finalizedById" UUID,
    "preparedAt" TIMESTAMP(3),
    "finalizedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_monthly_closings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "client_monthly_closings_clientId_periodStart_key"
    ON "client_monthly_closings"("clientId", "periodStart");

CREATE INDEX "client_monthly_closings_clientId_status_periodStart_idx"
    ON "client_monthly_closings"("clientId", "status", "periodStart");

CREATE INDEX "client_monthly_closings_preparedById_status_idx"
    ON "client_monthly_closings"("preparedById", "status");

CREATE INDEX "client_monthly_closings_finalizedById_status_idx"
    ON "client_monthly_closings"("finalizedById", "status");

ALTER TABLE "client_monthly_closings"
    ADD CONSTRAINT "client_monthly_closings_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "client_monthly_closings"
    ADD CONSTRAINT "client_monthly_closings_preparedById_fkey"
    FOREIGN KEY ("preparedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "client_monthly_closings"
    ADD CONSTRAINT "client_monthly_closings_finalizedById_fkey"
    FOREIGN KEY ("finalizedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION client_monthly_closings_no_delete()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Client monthly closings are immutable records and must be archived instead of deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER client_monthly_closings_no_delete
BEFORE DELETE ON "client_monthly_closings"
FOR EACH ROW EXECUTE FUNCTION client_monthly_closings_no_delete();

CREATE OR REPLACE FUNCTION client_monthly_closings_finalized_snapshot_immutable()
RETURNS trigger AS $$
BEGIN
  IF OLD."status" = 'FINALIZED'
    AND (
      NEW."clientId" IS DISTINCT FROM OLD."clientId"
      OR NEW."periodStart" IS DISTINCT FROM OLD."periodStart"
      OR NEW."periodEnd" IS DISTINCT FROM OLD."periodEnd"
      OR NEW."title" IS DISTINCT FROM OLD."title"
      OR NEW."summarySnapshot" IS DISTINCT FROM OLD."summarySnapshot"
      OR NEW."preparedById" IS DISTINCT FROM OLD."preparedById"
      OR NEW."preparedAt" IS DISTINCT FROM OLD."preparedAt"
      OR NEW."finalizedById" IS DISTINCT FROM OLD."finalizedById"
      OR NEW."finalizedAt" IS DISTINCT FROM OLD."finalizedAt"
    )
  THEN
    RAISE EXCEPTION 'Finalized client monthly closing snapshots are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER client_monthly_closings_finalized_snapshot_immutable
BEFORE UPDATE ON "client_monthly_closings"
FOR EACH ROW EXECUTE FUNCTION client_monthly_closings_finalized_snapshot_immutable();

CREATE OR REPLACE FUNCTION client_monthly_reports_published_snapshot_immutable()
RETURNS trigger AS $$
BEGIN
  IF OLD."status" = 'PUBLISHED'
    AND (
      NEW."clientId" IS DISTINCT FROM OLD."clientId"
      OR NEW."periodStart" IS DISTINCT FROM OLD."periodStart"
      OR NEW."periodEnd" IS DISTINCT FROM OLD."periodEnd"
      OR NEW."title" IS DISTINCT FROM OLD."title"
      OR NEW."summarySnapshot" IS DISTINCT FROM OLD."summarySnapshot"
      OR NEW."preparedById" IS DISTINCT FROM OLD."preparedById"
      OR NEW."preparedAt" IS DISTINCT FROM OLD."preparedAt"
      OR NEW."publishedAt" IS DISTINCT FROM OLD."publishedAt"
    )
  THEN
    RAISE EXCEPTION 'Published client monthly report snapshots are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER client_monthly_reports_published_snapshot_immutable
BEFORE UPDATE ON "client_monthly_reports"
FOR EACH ROW EXECUTE FUNCTION client_monthly_reports_published_snapshot_immutable();
