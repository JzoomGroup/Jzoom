CREATE TYPE "RequestTemplateRevisionStatus" AS ENUM ('SUGGESTED', 'DRAFT', 'ACTIVE', 'ARCHIVED');

CREATE TYPE "RequestTemplateFieldType" AS ENUM (
  'SHORT_TEXT',
  'LONG_TEXT',
  'NUMBER',
  'DATE',
  'DROPDOWN',
  'MULTI_SELECT',
  'CHECKBOX',
  'RADIO',
  'FILE',
  'EMAIL',
  'PHONE',
  'AMOUNT',
  'URL'
);

CREATE TYPE "RequestFormCompletenessStatus" AS ENUM (
  'COMPLETE',
  'MISSING_REQUIRED_FIELDS',
  'MISSING_REQUIRED_ATTACHMENTS',
  'PENDING_INTERNAL_REVIEW'
);

CREATE TABLE "request_field_library_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" TEXT NOT NULL,
  "fieldType" "RequestTemplateFieldType" NOT NULL,
  "labelAr" TEXT NOT NULL,
  "labelEn" TEXT NOT NULL,
  "helpTextAr" TEXT,
  "helpTextEn" TEXT,
  "placeholderAr" TEXT,
  "placeholderEn" TEXT,
  "systemKey" TEXT,
  "defaultConfig" JSONB,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "request_field_library_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "request_templates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "serviceItemId" UUID NOT NULL,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "request_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "request_template_versions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "requestTemplateId" UUID NOT NULL,
  "sourceBlueprintImportId" UUID,
  "version" INTEGER NOT NULL,
  "status" "RequestTemplateRevisionStatus" NOT NULL DEFAULT 'DRAFT',
  "instructionsAr" TEXT,
  "instructionsEn" TEXT,
  "snapshot" JSONB NOT NULL,
  "effectiveFrom" TIMESTAMP(3),
  "effectiveTo" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "request_template_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "request_template_sections" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "requestTemplateVersionId" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "titleAr" TEXT NOT NULL,
  "titleEn" TEXT NOT NULL,
  "descriptionAr" TEXT,
  "descriptionEn" TEXT,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "request_template_sections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "request_template_fields" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "requestTemplateVersionId" UUID NOT NULL,
  "sectionId" UUID,
  "libraryFieldId" UUID,
  "code" TEXT NOT NULL,
  "systemKey" TEXT,
  "fieldType" "RequestTemplateFieldType" NOT NULL,
  "labelAr" TEXT NOT NULL,
  "labelEn" TEXT NOT NULL,
  "helpTextAr" TEXT,
  "helpTextEn" TEXT,
  "placeholderAr" TEXT,
  "placeholderEn" TEXT,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "clientVisible" BOOLEAN NOT NULL DEFAULT true,
  "defaultValue" JSONB,
  "validation" JSONB,
  "source" TEXT NOT NULL DEFAULT 'CUSTOM',
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "request_template_fields_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "request_template_options" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "requestTemplateFieldId" UUID NOT NULL,
  "value" TEXT NOT NULL,
  "labelAr" TEXT NOT NULL,
  "labelEn" TEXT NOT NULL,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "request_template_options_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "request_template_files" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "requestTemplateVersionId" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "titleAr" TEXT NOT NULL,
  "titleEn" TEXT NOT NULL,
  "descriptionAr" TEXT,
  "descriptionEn" TEXT,
  "fileName" TEXT,
  "fileType" TEXT,
  "mimeType" TEXT,
  "storageProvider" TEXT,
  "storageKey" TEXT,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "returnUploadRequired" BOOLEAN NOT NULL DEFAULT false,
  "clientVisible" BOOLEAN NOT NULL DEFAULT true,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "revision" INTEGER NOT NULL DEFAULT 1,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "request_template_files_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "request_template_documents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "requestTemplateVersionId" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "labelAr" TEXT NOT NULL,
  "labelEn" TEXT NOT NULL,
  "descriptionAr" TEXT,
  "descriptionEn" TEXT,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "uploadRequired" BOOLEAN NOT NULL DEFAULT false,
  "acceptedFileTypes" JSONB,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "request_template_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "request_form_responses" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "requestId" UUID NOT NULL,
  "requestTemplateVersionId" UUID,
  "submittedById" UUID,
  "completenessStatus" "RequestFormCompletenessStatus" NOT NULL DEFAULT 'PENDING_INTERNAL_REVIEW',
  "templateSnapshot" JSONB NOT NULL,
  "fileSnapshot" JSONB,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "request_form_responses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "request_form_answers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "requestFormResponseId" UUID NOT NULL,
  "requestTemplateFieldId" UUID,
  "fieldCode" TEXT NOT NULL,
  "systemKey" TEXT,
  "labelAr" TEXT NOT NULL,
  "labelEn" TEXT NOT NULL,
  "fieldType" "RequestTemplateFieldType" NOT NULL,
  "value" JSONB NOT NULL,
  "clientVisible" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "request_form_answers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "request_field_library_items_code_key" ON "request_field_library_items"("code");
CREATE INDEX "request_field_library_items_status_sortOrder_idx" ON "request_field_library_items"("status", "sortOrder");
CREATE INDEX "request_field_library_items_systemKey_idx" ON "request_field_library_items"("systemKey");

CREATE UNIQUE INDEX "request_templates_serviceItemId_key" ON "request_templates"("serviceItemId");
CREATE INDEX "request_templates_status_sortOrder_idx" ON "request_templates"("status", "sortOrder");

CREATE UNIQUE INDEX "request_template_versions_requestTemplateId_version_key" ON "request_template_versions"("requestTemplateId", "version");
CREATE INDEX "request_template_versions_requestTemplateId_status_effectiveFrom_idx" ON "request_template_versions"("requestTemplateId", "status", "effectiveFrom");

CREATE UNIQUE INDEX "request_template_sections_requestTemplateVersionId_code_key" ON "request_template_sections"("requestTemplateVersionId", "code");
CREATE INDEX "request_template_sections_requestTemplateVersionId_status_sortOrder_idx" ON "request_template_sections"("requestTemplateVersionId", "status", "sortOrder");

CREATE UNIQUE INDEX "request_template_fields_requestTemplateVersionId_code_key" ON "request_template_fields"("requestTemplateVersionId", "code");
CREATE INDEX "request_template_fields_requestTemplateVersionId_status_sortOrder_idx" ON "request_template_fields"("requestTemplateVersionId", "status", "sortOrder");
CREATE INDEX "request_template_fields_sectionId_sortOrder_idx" ON "request_template_fields"("sectionId", "sortOrder");
CREATE INDEX "request_template_fields_systemKey_idx" ON "request_template_fields"("systemKey");

CREATE UNIQUE INDEX "request_template_options_requestTemplateFieldId_value_key" ON "request_template_options"("requestTemplateFieldId", "value");
CREATE INDEX "request_template_options_requestTemplateFieldId_status_sortOrder_idx" ON "request_template_options"("requestTemplateFieldId", "status", "sortOrder");

CREATE UNIQUE INDEX "request_template_files_requestTemplateVersionId_code_revision_key" ON "request_template_files"("requestTemplateVersionId", "code", "revision");
CREATE INDEX "request_template_files_requestTemplateVersionId_status_sortOrder_idx" ON "request_template_files"("requestTemplateVersionId", "status", "sortOrder");

CREATE UNIQUE INDEX "request_template_documents_requestTemplateVersionId_code_key" ON "request_template_documents"("requestTemplateVersionId", "code");
CREATE INDEX "request_template_documents_requestTemplateVersionId_status_sortOrder_idx" ON "request_template_documents"("requestTemplateVersionId", "status", "sortOrder");

CREATE UNIQUE INDEX "request_form_responses_requestId_key" ON "request_form_responses"("requestId");
CREATE INDEX "request_form_responses_requestTemplateVersionId_idx" ON "request_form_responses"("requestTemplateVersionId");
CREATE INDEX "request_form_responses_completenessStatus_idx" ON "request_form_responses"("completenessStatus");

CREATE UNIQUE INDEX "request_form_answers_requestFormResponseId_fieldCode_key" ON "request_form_answers"("requestFormResponseId", "fieldCode");
CREATE INDEX "request_form_answers_requestTemplateFieldId_idx" ON "request_form_answers"("requestTemplateFieldId");
CREATE INDEX "request_form_answers_systemKey_idx" ON "request_form_answers"("systemKey");

ALTER TABLE "request_templates" ADD CONSTRAINT "request_templates_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES "service_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "request_template_versions" ADD CONSTRAINT "request_template_versions_requestTemplateId_fkey" FOREIGN KEY ("requestTemplateId") REFERENCES "request_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "request_template_versions" ADD CONSTRAINT "request_template_versions_sourceBlueprintImportId_fkey" FOREIGN KEY ("sourceBlueprintImportId") REFERENCES "blueprint_imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "request_template_sections" ADD CONSTRAINT "request_template_sections_requestTemplateVersionId_fkey" FOREIGN KEY ("requestTemplateVersionId") REFERENCES "request_template_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "request_template_fields" ADD CONSTRAINT "request_template_fields_requestTemplateVersionId_fkey" FOREIGN KEY ("requestTemplateVersionId") REFERENCES "request_template_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "request_template_fields" ADD CONSTRAINT "request_template_fields_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "request_template_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "request_template_fields" ADD CONSTRAINT "request_template_fields_libraryFieldId_fkey" FOREIGN KEY ("libraryFieldId") REFERENCES "request_field_library_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "request_template_options" ADD CONSTRAINT "request_template_options_requestTemplateFieldId_fkey" FOREIGN KEY ("requestTemplateFieldId") REFERENCES "request_template_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "request_template_files" ADD CONSTRAINT "request_template_files_requestTemplateVersionId_fkey" FOREIGN KEY ("requestTemplateVersionId") REFERENCES "request_template_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "request_template_documents" ADD CONSTRAINT "request_template_documents_requestTemplateVersionId_fkey" FOREIGN KEY ("requestTemplateVersionId") REFERENCES "request_template_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "request_form_responses" ADD CONSTRAINT "request_form_responses_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "request_form_responses" ADD CONSTRAINT "request_form_responses_requestTemplateVersionId_fkey" FOREIGN KEY ("requestTemplateVersionId") REFERENCES "request_template_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "request_form_responses" ADD CONSTRAINT "request_form_responses_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "request_form_answers" ADD CONSTRAINT "request_form_answers_requestFormResponseId_fkey" FOREIGN KEY ("requestFormResponseId") REFERENCES "request_form_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "request_form_answers" ADD CONSTRAINT "request_form_answers_requestTemplateFieldId_fkey" FOREIGN KEY ("requestTemplateFieldId") REFERENCES "request_template_fields"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "request_field_library_items" (
  "id",
  "code",
  "fieldType",
  "labelAr",
  "labelEn",
  "systemKey",
  "defaultConfig",
  "sortOrder"
)
VALUES
  (gen_random_uuid(), 'employee_name', 'SHORT_TEXT', 'اسم الموظف', 'Employee name', 'employeeName', '{}'::jsonb, 1),
  (gen_random_uuid(), 'job_title', 'SHORT_TEXT', 'المسمى الوظيفي', 'Job title', NULL, '{}'::jsonb, 2),
  (gen_random_uuid(), 'department', 'SHORT_TEXT', 'القسم', 'Department', 'department', '{}'::jsonb, 3),
  (gen_random_uuid(), 'branch', 'SHORT_TEXT', 'الفرع', 'Branch', 'branch', '{}'::jsonb, 4),
  (gen_random_uuid(), 'start_date', 'DATE', 'تاريخ البداية', 'Start date', NULL, '{}'::jsonb, 5),
  (gen_random_uuid(), 'end_date', 'DATE', 'تاريخ النهاية', 'End date', NULL, '{}'::jsonb, 6),
  (gen_random_uuid(), 'amount', 'AMOUNT', 'المبلغ', 'Amount', 'amount', '{}'::jsonb, 7),
  (gen_random_uuid(), 'period_month', 'SHORT_TEXT', 'الفترة / الشهر', 'Period/month', 'period', '{}'::jsonb, 8),
  (gen_random_uuid(), 'urgency', 'DROPDOWN', 'الأولوية', 'Urgency', 'urgency', '{"options":["LOW","NORMAL","HIGH","URGENT"]}'::jsonb, 9),
  (gen_random_uuid(), 'required_deadline', 'DATE', 'الموعد المطلوب', 'Required deadline', 'dueDate', '{}'::jsonb, 10),
  (gen_random_uuid(), 'request_description', 'LONG_TEXT', 'وصف الطلب', 'Request description', 'requestDescription', '{}'::jsonb, 11),
  (gen_random_uuid(), 'notes', 'LONG_TEXT', 'ملاحظات', 'Notes', NULL, '{}'::jsonb, 12),
  (gen_random_uuid(), 'attachment', 'FILE', 'مرفق', 'Attachment', NULL, '{}'::jsonb, 13),
  (gen_random_uuid(), 'document_type', 'DROPDOWN', 'نوع المستند', 'Document type', NULL, '{}'::jsonb, 14),
  (gen_random_uuid(), 'approval_required', 'CHECKBOX', 'يتطلب موافقة', 'Approval required', NULL, '{}'::jsonb, 15),
  (gen_random_uuid(), 'contact_person', 'SHORT_TEXT', 'الشخص المسؤول', 'Contact person', 'contactPerson', '{}'::jsonb, 16),
  (gen_random_uuid(), 'email', 'EMAIL', 'البريد الإلكتروني', 'Email', NULL, '{}'::jsonb, 17),
  (gen_random_uuid(), 'phone', 'PHONE', 'رقم الهاتف', 'Phone number', NULL, '{}'::jsonb, 18),
  (gen_random_uuid(), 'company_branch_name', 'SHORT_TEXT', 'اسم الشركة / الفرع', 'Company/branch name', 'branch', '{}'::jsonb, 19),
  (gen_random_uuid(), 'related_policy', 'LONG_TEXT', 'السياسة / الإجراء المرتبط', 'Related policy/procedure', NULL, '{}'::jsonb, 20),
  (gen_random_uuid(), 'current_issue', 'LONG_TEXT', 'وصف المشكلة الحالية', 'Current issue/problem description', 'requestDescription', '{}'::jsonb, 21)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "request_templates" ("id", "serviceItemId", "status", "sortOrder")
SELECT gen_random_uuid(), si."id", 'ACTIVE', si."sortOrder"
FROM "service_items" si
WHERE NOT EXISTS (
  SELECT 1 FROM "request_templates" rt WHERE rt."serviceItemId" = si."id"
);

WITH active_items AS (
  SELECT DISTINCT ON (si."id")
    rt."id" AS "templateId",
    si."code" AS "serviceItemCode",
    sir."nameAr",
    sir."nameEn",
    sir."expectedOutput",
    sir."requiresFile"
  FROM "request_templates" rt
  JOIN "service_items" si ON si."id" = rt."serviceItemId"
  JOIN "service_item_revisions" sir ON sir."serviceItemId" = si."id"
  WHERE sir."status" = 'ACTIVE'
  ORDER BY si."id", sir."version" DESC
)
INSERT INTO "request_template_versions" (
  "id",
  "requestTemplateId",
  "version",
  "status",
  "instructionsAr",
  "instructionsEn",
  "snapshot",
  "effectiveFrom"
)
SELECT
  gen_random_uuid(),
  active_items."templateId",
  1,
  'SUGGESTED',
  'يرجى تعبئة الحقول المطلوبة وإرفاق المستندات الداعمة عند الحاجة.',
  'Please complete the required fields and attach supporting documents when needed.',
  jsonb_build_object(
    'source', 'PR19 migration suggested default',
    'serviceItemCode', active_items."serviceItemCode",
    'serviceItemNameAr', active_items."nameAr",
    'serviceItemNameEn', active_items."nameEn",
    'expectedOutput', active_items."expectedOutput"
  ),
  CURRENT_TIMESTAMP
FROM active_items
WHERE NOT EXISTS (
  SELECT 1
  FROM "request_template_versions" rtv
  WHERE rtv."requestTemplateId" = active_items."templateId"
    AND rtv."version" = 1
);

INSERT INTO "request_template_sections" (
  "id",
  "requestTemplateVersionId",
  "code",
  "titleAr",
  "titleEn",
  "sortOrder"
)
SELECT gen_random_uuid(), rtv."id", 'basic_request_information', 'معلومات الطلب الأساسية', 'Basic request information', 1
FROM "request_template_versions" rtv
WHERE rtv."version" = 1
ON CONFLICT ("requestTemplateVersionId", "code") DO NOTHING;

INSERT INTO "request_template_fields" (
  "id",
  "requestTemplateVersionId",
  "sectionId",
  "libraryFieldId",
  "code",
  "systemKey",
  "fieldType",
  "labelAr",
  "labelEn",
  "required",
  "clientVisible",
  "source",
  "sortOrder"
)
SELECT
  gen_random_uuid(),
  rtv."id",
  section."id",
  library."id",
  library."code",
  library."systemKey",
  library."fieldType",
  library."labelAr",
  library."labelEn",
  library."code" IN ('request_description', 'urgency'),
  true,
  'SUGGESTED_LIBRARY',
  library."sortOrder"
FROM "request_template_versions" rtv
JOIN "request_template_sections" section
  ON section."requestTemplateVersionId" = rtv."id"
  AND section."code" = 'basic_request_information'
JOIN "request_field_library_items" library
  ON library."code" IN ('request_description', 'urgency', 'required_deadline', 'notes', 'attachment')
WHERE rtv."version" = 1
ON CONFLICT ("requestTemplateVersionId", "code") DO NOTHING;

INSERT INTO "request_template_options" (
  "id",
  "requestTemplateFieldId",
  "value",
  "labelAr",
  "labelEn",
  "sortOrder"
)
SELECT gen_random_uuid(), field."id", option."value", option."labelAr", option."labelEn", option."sortOrder"
FROM "request_template_fields" field
JOIN (
  VALUES
    ('LOW', 'منخفضة', 'Low', 1),
    ('NORMAL', 'عادية', 'Normal', 2),
    ('HIGH', 'عالية', 'High', 3),
    ('URGENT', 'عاجلة', 'Urgent', 4)
) AS option("value", "labelAr", "labelEn", "sortOrder") ON true
WHERE field."code" = 'urgency'
ON CONFLICT ("requestTemplateFieldId", "value") DO NOTHING;

INSERT INTO "request_template_documents" (
  "id",
  "requestTemplateVersionId",
  "code",
  "labelAr",
  "labelEn",
  "descriptionAr",
  "descriptionEn",
  "required",
  "uploadRequired",
  "acceptedFileTypes",
  "sortOrder"
)
SELECT
  gen_random_uuid(),
  rtv."id",
  'supporting_documents',
  'المستندات الداعمة',
  'Supporting documents',
  'أرفق أي مستندات تساعد فريق جازوم على تنفيذ الطلب.',
  'Attach any documents that help the Jzoom team complete this request.',
  false,
  false,
  '["pdf","doc","docx","xls","xlsx","png","jpg"]'::jsonb,
  1
FROM "request_template_versions" rtv
WHERE rtv."version" = 1
ON CONFLICT ("requestTemplateVersionId", "code") DO NOTHING;

INSERT INTO "permissions" (
  "id",
  "code",
  "name",
  "module",
  "action",
  "description",
  "sortOrder"
)
VALUES (
  gen_random_uuid(),
  'PERM-MANAGE-REQUEST-TEMPLATES',
  'Manage Request Templates',
  'Requests',
  'manage_request_templates',
  'Create and configure service item request templates, fields, documents, and suggested forms.',
  1900
)
ON CONFLICT ("code") DO UPDATE SET "status" = 'ACTIVE';

INSERT INTO "role_permissions" (
  "roleId",
  "permissionId",
  "effect"
)
SELECT role."id", permission."id", 'ALLOW'
FROM "roles" role
JOIN "permissions" permission ON permission."code" = 'PERM-MANAGE-REQUEST-TEMPLATES'
WHERE role."code" = 'ROLE-ADMIN'
ON CONFLICT ("roleId", "permissionId") DO UPDATE SET "effect" = 'ALLOW';
