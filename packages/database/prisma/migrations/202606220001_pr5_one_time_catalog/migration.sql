-- CreateTable
CREATE TABLE "one_time_service_categories" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "description" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "one_time_service_categories_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "one_time_services" ADD COLUMN "categoryId" UUID;

-- Seed editable categories from the Excel V3 service path/type.
WITH normalized_lines AS (
    SELECT
        COALESCE(NULLIF(BTRIM("serviceLine"), ''), 'General') AS service_line,
        'OT-CAT-' || COALESCE(
            NULLIF(
                UPPER(TRIM(BOTH '-' FROM REGEXP_REPLACE(
                    COALESCE(NULLIF(BTRIM("serviceLine"), ''), 'General'),
                    '[^A-Za-z0-9]+',
                    '-',
                    'g'
                ))),
                ''
            ),
            'GENERAL'
        ) AS category_code
    FROM "one_time_services"
),
service_lines AS (
    SELECT category_code, MIN(service_line) AS service_line
    FROM normalized_lines
    GROUP BY category_code
)
INSERT INTO "one_time_service_categories" (
    "id",
    "code",
    "nameAr",
    "nameEn",
    "status",
    "sortOrder",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid(),
    category_code,
    service_line,
    service_line,
    'ACTIVE',
    ROW_NUMBER() OVER (ORDER BY service_line) - 1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM service_lines;

UPDATE "one_time_services" AS service
SET "categoryId" = category."id"
FROM "one_time_service_categories" AS category
WHERE category."code" = 'OT-CAT-' || COALESCE(
    NULLIF(
        UPPER(TRIM(BOTH '-' FROM REGEXP_REPLACE(
            COALESCE(NULLIF(BTRIM(service."serviceLine"), ''), 'General'),
            '[^A-Za-z0-9]+',
            '-',
            'g'
        ))),
        ''
    ),
    'GENERAL'
);

INSERT INTO "one_time_service_categories" (
    "id",
    "code",
    "nameAr",
    "nameEn",
    "status",
    "sortOrder",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid(),
    'OT-CAT-GENERAL',
    'عام',
    'General',
    'ACTIVE',
    9999,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE EXISTS (
    SELECT 1 FROM "one_time_services" WHERE "categoryId" IS NULL
)
AND NOT EXISTS (
    SELECT 1 FROM "one_time_service_categories" WHERE "code" = 'OT-CAT-GENERAL'
);

UPDATE "one_time_services"
SET "categoryId" = (
    SELECT "id" FROM "one_time_service_categories" WHERE "code" = 'OT-CAT-GENERAL'
)
WHERE "categoryId" IS NULL;

ALTER TABLE "one_time_services" ALTER COLUMN "categoryId" SET NOT NULL;

-- AlterTable
ALTER TABLE "one_time_service_revisions"
ADD COLUMN "internalHourlyCostSar" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "one_time_service_deliverables" ADD COLUMN "phaseId" UUID;

-- CreateTable
CREATE TABLE "one_time_service_tasks" (
    "id" UUID NOT NULL,
    "deliverableId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "description" TEXT,
    "estimatedHours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "one_time_service_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "one_time_service_categories_code_key"
ON "one_time_service_categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "one_time_service_categories_code_ci_key"
ON "one_time_service_categories"(LOWER("code"));

-- CreateIndex
CREATE UNIQUE INDEX "one_time_services_code_ci_key"
ON "one_time_services"(LOWER("code"));

-- CreateIndex
CREATE INDEX "one_time_service_categories_status_sortOrder_idx"
ON "one_time_service_categories"("status", "sortOrder");

-- CreateIndex
CREATE INDEX "one_time_services_categoryId_status_sortOrder_idx"
ON "one_time_services"("categoryId", "status", "sortOrder");

-- CreateIndex
CREATE INDEX "one_time_service_deliverables_phaseId_sortOrder_idx"
ON "one_time_service_deliverables"("phaseId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "one_time_service_tasks_deliverableId_code_key"
ON "one_time_service_tasks"("deliverableId", "code");

-- CreateIndex
CREATE INDEX "one_time_service_tasks_deliverableId_sortOrder_idx"
ON "one_time_service_tasks"("deliverableId", "sortOrder");

-- AddForeignKey
ALTER TABLE "one_time_services"
ADD CONSTRAINT "one_time_services_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "one_time_service_categories"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "one_time_service_deliverables"
ADD CONSTRAINT "one_time_service_deliverables_phaseId_fkey"
FOREIGN KEY ("phaseId") REFERENCES "one_time_service_phases"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "one_time_service_tasks"
ADD CONSTRAINT "one_time_service_tasks_deliverableId_fkey"
FOREIGN KEY ("deliverableId") REFERENCES "one_time_service_deliverables"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed the explicit Admin permission introduced by the formal PR 5 action additions.
INSERT INTO "permissions" (
    "id",
    "code",
    "name",
    "module",
    "action",
    "description",
    "status",
    "sortOrder",
    "createdAt",
    "updatedAt"
)
VALUES (
    gen_random_uuid(),
    'PERM-MANAGE-ONE-TIME-SERVICES',
    'Manage One-Time Services',
    'Catalog',
    'manage_one_time_services',
    'Create and configure revision-safe one-time service catalog records.',
    'ACTIVE',
    500,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "role_permissions" (
    "roleId",
    "permissionId",
    "effect",
    "createdAt",
    "updatedAt"
)
SELECT
    role."id",
    permission."id",
    'ALLOW',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "roles" AS role
CROSS JOIN "permissions" AS permission
WHERE role."code" = 'ROLE-ADMIN'
  AND permission."code" = 'PERM-MANAGE-ONE-TIME-SERVICES'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
