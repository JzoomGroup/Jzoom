-- PR 16: Notifications + Reports + Account Manager Foundation

CREATE TYPE "MonthlyReportStatus" AS ENUM ('DRAFT', 'PREPARED', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE "client_monthly_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clientId" UUID NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "MonthlyReportStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "summarySnapshot" JSONB NOT NULL,
    "preparedById" UUID,
    "preparedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_monthly_reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "client_monthly_reports_clientId_periodStart_key"
    ON "client_monthly_reports"("clientId", "periodStart");

CREATE INDEX "client_monthly_reports_clientId_status_periodStart_idx"
    ON "client_monthly_reports"("clientId", "status", "periodStart");

CREATE INDEX "client_monthly_reports_preparedById_status_idx"
    ON "client_monthly_reports"("preparedById", "status");

ALTER TABLE "client_monthly_reports"
    ADD CONSTRAINT "client_monthly_reports_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "client_monthly_reports"
    ADD CONSTRAINT "client_monthly_reports_preparedById_fkey"
    FOREIGN KEY ("preparedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION client_monthly_reports_no_delete()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Client monthly reports are immutable records and must be archived instead of deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER client_monthly_reports_no_delete
BEFORE DELETE ON "client_monthly_reports"
FOR EACH ROW EXECUTE FUNCTION client_monthly_reports_no_delete();
