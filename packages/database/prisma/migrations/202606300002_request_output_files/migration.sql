-- Link uploaded files to monthly request outputs without exposing them as generic request attachments.

ALTER TABLE "files_metadata"
  ADD COLUMN "requestOutputId" UUID;

CREATE INDEX "files_metadata_requestOutputId_visibility_idx"
  ON "files_metadata"("requestOutputId", "visibility");

ALTER TABLE "files_metadata"
  ADD CONSTRAINT "files_metadata_requestOutputId_fkey"
  FOREIGN KEY ("requestOutputId") REFERENCES "request_outputs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
