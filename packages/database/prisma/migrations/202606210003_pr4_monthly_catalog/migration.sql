-- CreateTable
CREATE TABLE "monthly_service_categories" (
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

    CONSTRAINT "monthly_service_categories_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "monthly_services" ADD COLUMN "categoryId" UUID;

-- Backfill editable categories from the latest available Excel-derived domain.
WITH latest_domains AS (
    SELECT DISTINCT ON ("monthlyServiceId")
        "monthlyServiceId",
        COALESCE(NULLIF(BTRIM("domain"), ''), 'General') AS domain
    FROM "monthly_service_revisions"
    ORDER BY
        "monthlyServiceId",
        CASE WHEN "status" = 'ACTIVE' AND "effectiveTo" IS NULL THEN 0 ELSE 1 END,
        "version" DESC
),
distinct_domains AS (
    SELECT DISTINCT domain
    FROM latest_domains
)
INSERT INTO "monthly_service_categories" (
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
    'CAT-' || COALESCE(
        NULLIF(
            UPPER(TRIM(BOTH '-' FROM REGEXP_REPLACE(domain, '[^A-Za-z0-9]+', '-', 'g'))),
            ''
        ),
        'GENERAL'
    ),
    domain,
    domain,
    'ACTIVE',
    ROW_NUMBER() OVER (ORDER BY domain) - 1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM distinct_domains;

WITH latest_domains AS (
    SELECT DISTINCT ON ("monthlyServiceId")
        "monthlyServiceId",
        COALESCE(NULLIF(BTRIM("domain"), ''), 'General') AS domain
    FROM "monthly_service_revisions"
    ORDER BY
        "monthlyServiceId",
        CASE WHEN "status" = 'ACTIVE' AND "effectiveTo" IS NULL THEN 0 ELSE 1 END,
        "version" DESC
)
UPDATE "monthly_services" AS service
SET "categoryId" = category."id"
FROM latest_domains AS latest
JOIN "monthly_service_categories" AS category
  ON category."nameEn" = latest.domain
WHERE service."id" = latest."monthlyServiceId";

INSERT INTO "monthly_service_categories" (
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
    'CAT-GENERAL',
    'عام',
    'General',
    'ACTIVE',
    9999,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE EXISTS (
    SELECT 1 FROM "monthly_services" WHERE "categoryId" IS NULL
)
AND NOT EXISTS (
    SELECT 1 FROM "monthly_service_categories" WHERE "code" = 'CAT-GENERAL'
);

UPDATE "monthly_services"
SET "categoryId" = (
    SELECT "id" FROM "monthly_service_categories" WHERE "code" = 'CAT-GENERAL'
)
WHERE "categoryId" IS NULL;

ALTER TABLE "monthly_services" ALTER COLUMN "categoryId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "monthly_service_categories_code_key" ON "monthly_service_categories"("code");

-- CreateIndex
CREATE INDEX "monthly_service_categories_status_sortOrder_idx" ON "monthly_service_categories"("status", "sortOrder");

-- CreateIndex
CREATE INDEX "monthly_services_categoryId_status_sortOrder_idx" ON "monthly_services"("categoryId", "status", "sortOrder");

-- Case-insensitive catalog code integrity.
CREATE UNIQUE INDEX "monthly_service_categories_code_ci_key" ON "monthly_service_categories"(LOWER("code"));
CREATE UNIQUE INDEX "monthly_services_code_ci_key" ON "monthly_services"(LOWER("code"));
CREATE UNIQUE INDEX "service_items_code_ci_key" ON "service_items"(LOWER("code"));
CREATE UNIQUE INDEX "service_levels_code_ci_key" ON "service_levels"(LOWER("code"));

-- AddForeignKey
ALTER TABLE "monthly_services" ADD CONSTRAINT "monthly_services_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "monthly_service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
