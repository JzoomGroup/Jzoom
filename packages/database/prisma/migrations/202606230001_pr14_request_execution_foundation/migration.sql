-- PR 14 internal request execution foundation.
-- Adds internal-only request outputs and a task assignee FK for reliable work queues.

CREATE TABLE "request_outputs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requestId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "reviewedById" UUID,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "contentSnapshot" JSONB,
    "status" "OutputStatus" NOT NULL DEFAULT 'DRAFT',
    "dueAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewReason" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "request_outputs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "request_outputs_requestId_code_revision_key"
ON "request_outputs"("requestId", "code", "revision");

CREATE INDEX "request_outputs_requestId_status_sortOrder_idx"
ON "request_outputs"("requestId", "status", "sortOrder");

CREATE INDEX "request_outputs_createdById_status_idx"
ON "request_outputs"("createdById", "status");

CREATE INDEX "request_outputs_reviewedById_status_idx"
ON "request_outputs"("reviewedById", "status");

ALTER TABLE "request_outputs"
ADD CONSTRAINT "request_outputs_requestId_fkey"
FOREIGN KEY ("requestId") REFERENCES "requests"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "request_outputs"
ADD CONSTRAINT "request_outputs_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "request_outputs"
ADD CONSTRAINT "request_outputs_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tasks"
ADD CONSTRAINT "tasks_assigneeId_fkey"
FOREIGN KEY ("assigneeId") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
