CREATE TABLE "specialist_service_scopes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "clientId" UUID,
  "monthlyServiceId" UUID,
  "serviceItemId" UUID,
  "oneTimeServiceId" UUID,
  "isPrimary" BOOLEAN NOT NULL DEFAULT true,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "specialist_service_scopes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "supervisor_specialist_assignments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "supervisorId" UUID NOT NULL,
  "specialistId" UUID NOT NULL,
  "clientId" UUID,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "supervisor_specialist_assignments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "specialist_service_scopes_userId_status_startsAt_endsAt_idx"
  ON "specialist_service_scopes"("userId", "status", "startsAt", "endsAt");
CREATE INDEX "specialist_service_scopes_clientId_status_idx"
  ON "specialist_service_scopes"("clientId", "status");
CREATE INDEX "specialist_service_scopes_monthlyServiceId_status_idx"
  ON "specialist_service_scopes"("monthlyServiceId", "status");
CREATE INDEX "specialist_service_scopes_serviceItemId_status_idx"
  ON "specialist_service_scopes"("serviceItemId", "status");
CREATE INDEX "specialist_service_scopes_oneTimeServiceId_status_idx"
  ON "specialist_service_scopes"("oneTimeServiceId", "status");

CREATE INDEX "supervisor_specialist_assignments_supervisorId_status_startsAt_endsAt_idx"
  ON "supervisor_specialist_assignments"("supervisorId", "status", "startsAt", "endsAt");
CREATE INDEX "supervisor_specialist_assignments_specialistId_status_startsAt_endsAt_idx"
  ON "supervisor_specialist_assignments"("specialistId", "status", "startsAt", "endsAt");
CREATE INDEX "supervisor_specialist_assignments_clientId_status_idx"
  ON "supervisor_specialist_assignments"("clientId", "status");

ALTER TABLE "specialist_service_scopes"
  ADD CONSTRAINT "specialist_service_scopes_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "specialist_service_scopes"
  ADD CONSTRAINT "specialist_service_scopes_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "specialist_service_scopes"
  ADD CONSTRAINT "specialist_service_scopes_monthlyServiceId_fkey"
  FOREIGN KEY ("monthlyServiceId") REFERENCES "monthly_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "specialist_service_scopes"
  ADD CONSTRAINT "specialist_service_scopes_serviceItemId_fkey"
  FOREIGN KEY ("serviceItemId") REFERENCES "service_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "specialist_service_scopes"
  ADD CONSTRAINT "specialist_service_scopes_oneTimeServiceId_fkey"
  FOREIGN KEY ("oneTimeServiceId") REFERENCES "one_time_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "supervisor_specialist_assignments"
  ADD CONSTRAINT "supervisor_specialist_assignments_supervisorId_fkey"
  FOREIGN KEY ("supervisorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "supervisor_specialist_assignments"
  ADD CONSTRAINT "supervisor_specialist_assignments_specialistId_fkey"
  FOREIGN KEY ("specialistId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "supervisor_specialist_assignments"
  ADD CONSTRAINT "supervisor_specialist_assignments_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
VALUES
  (
    gen_random_uuid(),
    'PERM-MANAGE-CLIENTS',
    'Manage Clients',
    'Clients',
    'manage_clients',
    'Create and maintain client master data and client portal users.',
    'ACTIVE',
    2450,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid(),
    'PERM-USE-PRICING-STUDIO',
    'Use Pricing Studio',
    'Pricing',
    'use_pricing_studio',
    'Create, calculate, save, and reload scoped pricing drafts.',
    'ACTIVE',
    2600,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid(),
    'PERM-MANAGE-QUOTES',
    'Manage Quotes',
    'Pricing',
    'manage_quotes',
    'Create immutable quotes from scoped pricing drafts and manage quote lifecycle.',
    'ACTIVE',
    2601,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid(),
    'PERM-MANAGE-INVOICES',
    'Manage Invoices',
    'Pricing',
    'manage_invoices',
    'Create immutable invoices from accepted quote snapshots and manage invoice lifecycle.',
    'ACTIVE',
    2602,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("code") DO UPDATE SET
  "status" = 'ACTIVE',
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "role_permissions" (
  "roleId",
  "permissionId",
  "effect",
  "createdAt",
  "updatedAt"
)
SELECT r."id", p."id", 'ALLOW', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "roles" r
JOIN "permissions" p ON p."code" IN (
  'PERM-MANAGE-CLIENTS',
  'PERM-USE-PRICING-STUDIO',
  'PERM-MANAGE-QUOTES',
  'PERM-MANAGE-INVOICES'
)
WHERE r."code" = 'ROLE-MGMT'
ON CONFLICT ("roleId", "permissionId") DO UPDATE SET
  "effect" = 'ALLOW',
  "updatedAt" = CURRENT_TIMESTAMP;
