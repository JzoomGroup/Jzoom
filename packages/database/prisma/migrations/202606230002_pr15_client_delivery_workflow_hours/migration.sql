-- PR 15 client delivery, document request, workflow checklist, and hours foundation.
-- Extends PR 14 internal request execution without introducing advanced ledger/reporting modules.

ALTER TYPE "OutputStatus" ADD VALUE IF NOT EXISTS 'SHARED_WITH_CLIENT';
ALTER TYPE "OutputStatus" ADD VALUE IF NOT EXISTS 'ACCEPTED_BY_CLIENT';
ALTER TYPE "OutputStatus" ADD VALUE IF NOT EXISTS 'RETURNED_BY_CLIENT';
ALTER TYPE "OutputStatus" ADD VALUE IF NOT EXISTS 'CLOSED';

CREATE TYPE "ClientDocumentRequestStatus" AS ENUM (
    'REQUESTED',
    'UPLOADED',
    'CANCELLED',
    'CLOSED'
);

ALTER TABLE "request_outputs"
ADD COLUMN "sharedById" UUID,
ADD COLUMN "clientDecisionById" UUID,
ADD COLUMN "sharedAt" TIMESTAMP(3),
ADD COLUMN "clientDecidedAt" TIMESTAMP(3),
ADD COLUMN "closedAt" TIMESTAMP(3),
ADD COLUMN "clientReturnReason" TEXT;

CREATE INDEX "request_outputs_sharedById_status_idx"
ON "request_outputs"("sharedById", "status");

CREATE INDEX "request_outputs_clientDecisionById_status_idx"
ON "request_outputs"("clientDecisionById", "status");

ALTER TABLE "request_outputs"
ADD CONSTRAINT "request_outputs_sharedById_fkey"
FOREIGN KEY ("sharedById") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "request_outputs"
ADD CONSTRAINT "request_outputs_clientDecisionById_fkey"
FOREIGN KEY ("clientDecisionById") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "client_document_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requestId" UUID NOT NULL,
    "requestedById" UUID NOT NULL,
    "fulfilledById" UUID,
    "fileMetadataId" UUID,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "status" "ClientDocumentRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "dueAt" TIMESTAMP(3),
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fulfilledAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_document_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "client_document_requests_fileMetadataId_key"
ON "client_document_requests"("fileMetadataId");

CREATE INDEX "client_document_requests_requestId_status_dueAt_idx"
ON "client_document_requests"("requestId", "status", "dueAt");

CREATE INDEX "client_document_requests_requestedById_status_idx"
ON "client_document_requests"("requestedById", "status");

CREATE INDEX "client_document_requests_fulfilledById_status_idx"
ON "client_document_requests"("fulfilledById", "status");

ALTER TABLE "client_document_requests"
ADD CONSTRAINT "client_document_requests_requestId_fkey"
FOREIGN KEY ("requestId") REFERENCES "requests"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "client_document_requests"
ADD CONSTRAINT "client_document_requests_requestedById_fkey"
FOREIGN KEY ("requestedById") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "client_document_requests"
ADD CONSTRAINT "client_document_requests_fulfilledById_fkey"
FOREIGN KEY ("fulfilledById") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "client_document_requests"
ADD CONSTRAINT "client_document_requests_fileMetadataId_fkey"
FOREIGN KEY ("fileMetadataId") REFERENCES "files_metadata"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "time_entries"
ADD COLUMN "decisionReason" TEXT,
ADD COLUMN "decidedById" UUID;

CREATE INDEX "time_entries_decidedById_status_idx"
ON "time_entries"("decidedById", "status");

ALTER TABLE "time_entries"
ADD CONSTRAINT "time_entries_decidedById_fkey"
FOREIGN KEY ("decidedById") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
