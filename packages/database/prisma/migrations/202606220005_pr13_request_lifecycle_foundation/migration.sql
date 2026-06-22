-- PR 13 request lifecycle foundation for onboarded clients.
-- Requests remain PostgreSQL-backed, scoped to existing clients/subscription services, and
-- connected to optional immutable commercial source records without mutating those records.

CREATE TYPE "RequestStatus" AS ENUM (
  'NEW',
  'TRIAGE',
  'ASSIGNED',
  'IN_PROGRESS',
  'WAITING_CLIENT',
  'WAITING_SUPERVISOR',
  'COMPLETED',
  'CLOSED',
  'RETURNED',
  'REJECTED'
);

ALTER TABLE "requests"
ADD COLUMN "sourceQuoteId" UUID,
ADD COLUMN "sourceInvoiceId" UUID,
ADD COLUMN "assignedSpecialistId" UUID,
ADD COLUMN "assignedSupervisorId" UUID,
ADD COLUMN "accountManagerId" UUID,
ADD COLUMN "status" "RequestStatus" NOT NULL DEFAULT 'NEW';

CREATE INDEX "requests_clientId_status_idx"
ON "requests"("clientId", "status");

CREATE INDEX "requests_sourceQuoteId_idx"
ON "requests"("sourceQuoteId");

CREATE INDEX "requests_sourceInvoiceId_idx"
ON "requests"("sourceInvoiceId");

CREATE INDEX "requests_assignedSpecialistId_status_idx"
ON "requests"("assignedSpecialistId", "status");

CREATE INDEX "requests_assignedSupervisorId_status_idx"
ON "requests"("assignedSupervisorId", "status");

CREATE INDEX "requests_accountManagerId_status_idx"
ON "requests"("accountManagerId", "status");

ALTER TABLE "requests"
ADD CONSTRAINT "requests_sourceQuoteId_fkey"
FOREIGN KEY ("sourceQuoteId") REFERENCES "quotes"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "requests"
ADD CONSTRAINT "requests_sourceInvoiceId_fkey"
FOREIGN KEY ("sourceInvoiceId") REFERENCES "invoices"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "requests"
ADD CONSTRAINT "requests_assignedSpecialistId_fkey"
FOREIGN KEY ("assignedSpecialistId") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "requests"
ADD CONSTRAINT "requests_assignedSupervisorId_fkey"
FOREIGN KEY ("assignedSupervisorId") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "requests"
ADD CONSTRAINT "requests_accountManagerId_fkey"
FOREIGN KEY ("accountManagerId") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
