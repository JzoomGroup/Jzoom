-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('DRAFT', 'ACTIVE', 'DISABLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RevisionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BlueprintImportStatus" AS ENUM ('PENDING', 'VALIDATED', 'APPLIED', 'APPLIED_WITH_WARNINGS', 'FAILED');

-- CreateEnum
CREATE TYPE "BlueprintIssueSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR');

-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('INTERNAL', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'DISABLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PermissionEffect" AS ENUM ('ALLOW', 'DENY');

-- CreateEnum
CREATE TYPE "DataScopeType" AS ENUM ('OWN_CLIENT', 'ASSIGNED_CLIENTS', 'ASSIGNED_WORK', 'TEAM_DOMAIN', 'GLOBAL');

-- CreateEnum
CREATE TYPE "WorkflowType" AS ENUM ('REQUEST', 'PROJECT');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'CALCULATED', 'NEEDS_APPROVAL', 'ISSUED', 'APPROVED', 'EXPIRED', 'CANCELLED', 'ACTIVATED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'VOID');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLIENT_REVIEW', 'COMPLETED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OutputStatus" AS ENUM ('DRAFT', 'INTERNAL_REVIEW', 'APPROVED_INTERNAL', 'SHARED', 'REVISION_REQUESTED', 'APPROVED', 'LOCKED');

-- CreateEnum
CREATE TYPE "TimeEntryStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'REVERSED');

-- CreateEnum
CREATE TYPE "LedgerTransactionType" AS ENUM ('CREDIT', 'DEBIT', 'REVERSAL', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'RETURNED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FileVisibility" AS ENUM ('INTERNAL', 'CLIENT_VISIBLE');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'VALIDATING', 'READY', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AuditSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "SettingValueType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'JSON', 'SECRET_REFERENCE');

-- CreateEnum
CREATE TYPE "TranslationRevisionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "blueprint_imports" (
    "id" UUID NOT NULL,
    "blueprintCode" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "sourceFileName" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "manifest" JSONB NOT NULL,
    "status" "BlueprintImportStatus" NOT NULL DEFAULT 'PENDING',
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blueprint_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blueprint_sheet_snapshots" (
    "id" UUID NOT NULL,
    "blueprintImportId" UUID NOT NULL,
    "sheetName" TEXT NOT NULL,
    "tableName" TEXT,
    "rowCount" INTEGER NOT NULL,
    "headers" JSONB NOT NULL,
    "rows" JSONB NOT NULL,
    "sha256" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blueprint_sheet_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blueprint_issues" (
    "id" UUID NOT NULL,
    "blueprintImportId" UUID NOT NULL,
    "severity" "BlueprintIssueSeverity" NOT NULL,
    "code" TEXT NOT NULL,
    "sheetName" TEXT,
    "rowReference" TEXT,
    "entityCode" TEXT,
    "message" TEXT NOT NULL,
    "normalizedDefault" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blueprint_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "nameEn" TEXT,
    "userType" "UserType" NOT NULL,
    "description" TEXT,
    "dataScope" TEXT,
    "capabilities" TEXT,
    "restrictions" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,
    "effect" "PermissionEffect" NOT NULL DEFAULT 'ALLOW',
    "scopeRule" TEXT,
    "constraints" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "displayName" TEXT NOT NULL,
    "preferredLocale" TEXT NOT NULL DEFAULT 'ar',
    "userType" "UserType" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'INVITED',
    "lastLoginAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "userId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "user_permission_overrides" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,
    "effect" "PermissionEffect" NOT NULL,
    "scopeRule" TEXT,
    "reason" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_permission_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_scopes" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "scopeType" "DataScopeType" NOT NULL,
    "clientId" UUID,
    "domain" TEXT,
    "teamCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_scopes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "commercialRegistration" TEXT,
    "sector" TEXT NOT NULL,
    "city" TEXT,
    "employeesCount" INTEGER NOT NULL DEFAULT 0,
    "branchesCount" INTEGER NOT NULL DEFAULT 0,
    "transactionVolume" TEXT,
    "operationalComplexity" TEXT,
    "dataReadiness" TEXT,
    "urgency" TEXT,
    "billingContact" TEXT,
    "authorizedApprover" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_contacts" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_assignments" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "roleCode" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_levels" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "labelAr" TEXT NOT NULL,
    "labelEn" TEXT,
    "purpose" TEXT,
    "hoursSource" TEXT,
    "slaRule" TEXT,
    "scopeRule" TEXT,
    "governanceRule" TEXT,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_services" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "externalId" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_service_revisions" (
    "id" UUID NOT NULL,
    "monthlyServiceId" UUID NOT NULL,
    "sourceBlueprintImportId" UUID,
    "version" INTEGER NOT NULL,
    "status" "RevisionStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "paymentType" TEXT NOT NULL DEFAULT 'Monthly',
    "serviceLine" TEXT NOT NULL DEFAULT 'Operate',
    "domain" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "visibleInPricing" BOOLEAN NOT NULL DEFAULT true,
    "sellingHourlyRateSar" DECIMAL(18,2) NOT NULL,
    "internalHourlyCostSar" DECIMAL(18,2) NOT NULL,
    "setupFeePct" DECIMAL(7,4) NOT NULL,
    "defaultSlaHours" INTEGER NOT NULL,
    "deductHours" BOOLEAN NOT NULL DEFAULT true,
    "requiresSupervisor" BOOLEAN NOT NULL DEFAULT false,
    "requiresManagement" BOOLEAN NOT NULL DEFAULT false,
    "clientApprovalRequired" BOOLEAN NOT NULL DEFAULT false,
    "cardConfiguration" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_service_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_service_level_configs" (
    "id" UUID NOT NULL,
    "monthlyServiceRevisionId" UUID NOT NULL,
    "serviceLevelId" UUID NOT NULL,
    "hours" DECIMAL(10,2) NOT NULL,
    "slaHours" INTEGER,
    "priorityRule" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_service_level_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_items" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "monthlyServiceId" UUID NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_item_revisions" (
    "id" UUID NOT NULL,
    "serviceItemId" UUID NOT NULL,
    "sourceBlueprintImportId" UUID,
    "version" INTEGER NOT NULL,
    "status" "RevisionStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "expectedOutput" TEXT,
    "visibleInQuote" BOOLEAN NOT NULL DEFAULT true,
    "requiresFile" BOOLEAN NOT NULL DEFAULT false,
    "deductHours" BOOLEAN NOT NULL DEFAULT true,
    "requestType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_item_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_item_level_inclusions" (
    "serviceItemRevisionId" UUID NOT NULL,
    "serviceLevelId" UUID NOT NULL,
    "included" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_item_level_inclusions_pkey" PRIMARY KEY ("serviceItemRevisionId","serviceLevelId")
);

-- CreateTable
CREATE TABLE "one_time_services" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "serviceLine" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "one_time_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "one_time_service_revisions" (
    "id" UUID NOT NULL,
    "oneTimeServiceId" UUID NOT NULL,
    "sourceBlueprintImportId" UUID,
    "version" INTEGER NOT NULL,
    "status" "RevisionStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "paymentType" TEXT NOT NULL DEFAULT 'One-Time',
    "basePriceSar" DECIMAL(18,2) NOT NULL,
    "estimatedHours" DECIMAL(10,2) NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "visibleInPricing" BOOLEAN NOT NULL DEFAULT true,
    "createsProject" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "one_time_service_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "one_time_service_phases" (
    "id" UUID NOT NULL,
    "oneTimeServiceRevisionId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "nameAr" TEXT,
    "nameEn" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "one_time_service_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "one_time_service_deliverables" (
    "id" UUID NOT NULL,
    "oneTimeServiceRevisionId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "nameAr" TEXT,
    "nameEn" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "requiresClientApproval" BOOLEAN NOT NULL DEFAULT true,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "one_time_service_deliverables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_rules" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_rule_revisions" (
    "id" UUID NOT NULL,
    "pricingRuleId" UUID NOT NULL,
    "sourceBlueprintImportId" UUID,
    "version" INTEGER NOT NULL,
    "status" "RevisionStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "formulaOrRule" TEXT NOT NULL,
    "appliesTo" TEXT NOT NULL,
    "implementationOwner" TEXT,
    "visibility" TEXT,
    "configuration" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_rule_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validation_rules" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "validation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validation_rule_revisions" (
    "id" UUID NOT NULL,
    "validationRuleId" UUID NOT NULL,
    "sourceBlueprintImportId" UUID,
    "version" INTEGER NOT NULL,
    "status" "RevisionStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "rule" TEXT NOT NULL,
    "errorMessageAr" TEXT,
    "errorMessageEn" TEXT,
    "enforcedIn" TEXT NOT NULL,
    "failureBehavior" TEXT NOT NULL,
    "configuration" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "validation_rule_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_definitions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "WorkflowType" NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_versions" (
    "id" UUID NOT NULL,
    "workflowDefinitionId" UUID NOT NULL,
    "sourceBlueprintImportId" UUID,
    "version" INTEGER NOT NULL,
    "status" "RevisionStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "configuration" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_states" (
    "id" UUID NOT NULL,
    "workflowVersionId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "labelAr" TEXT,
    "labelEn" TEXT NOT NULL,
    "stateType" TEXT,
    "isInitial" BOOLEAN NOT NULL DEFAULT false,
    "isTerminal" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "configuration" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_transitions" (
    "id" UUID NOT NULL,
    "workflowVersionId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "fromStateId" UUID NOT NULL,
    "toStateId" UUID NOT NULL,
    "actorRoles" JSONB NOT NULL,
    "condition" TEXT,
    "sideEffect" TEXT,
    "validations" JSONB,
    "reasonRequired" BOOLEAN NOT NULL DEFAULT false,
    "notificationEvent" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pdf_templates" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pdf_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pdf_template_versions" (
    "id" UUID NOT NULL,
    "pdfTemplateId" UUID NOT NULL,
    "sourceBlueprintImportId" UUID,
    "version" INTEGER NOT NULL,
    "status" "RevisionStatus" NOT NULL DEFAULT 'DRAFT',
    "audience" TEXT NOT NULL,
    "mustInclude" JSONB NOT NULL,
    "mustExclude" JSONB NOT NULL,
    "languageDirection" TEXT NOT NULL,
    "technicalRule" TEXT,
    "contentSchema" JSONB,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pdf_template_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pdf_field_mappings" (
    "id" UUID NOT NULL,
    "pdfTemplateVersionId" UUID NOT NULL,
    "section" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "showClient" BOOLEAN NOT NULL DEFAULT false,
    "showInternal" BOOLEAN NOT NULL DEFAULT false,
    "forbidden" BOOLEAN NOT NULL DEFAULT false,
    "documentScope" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pdf_field_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_template_versions" (
    "id" UUID NOT NULL,
    "notificationTemplateId" UUID NOT NULL,
    "sourceBlueprintImportId" UUID,
    "version" INTEGER NOT NULL,
    "status" "RevisionStatus" NOT NULL DEFAULT 'DRAFT',
    "recipients" JSONB NOT NULL,
    "messageAr" TEXT,
    "messageEn" TEXT,
    "description" TEXT,
    "deepLink" TEXT NOT NULL,
    "channels" JSONB NOT NULL,
    "cadence" TEXT,
    "reminderRule" TEXT,
    "placeholders" JSONB,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_template_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_event_definitions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "eventId" TEXT,
    "entity" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "beforeAfterRequired" BOOLEAN NOT NULL DEFAULT false,
    "auditRequired" BOOLEAN NOT NULL DEFAULT true,
    "severity" "AuditSeverity" NOT NULL,
    "notification" TEXT,
    "retention" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_event_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_definitions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "roles" JSONB NOT NULL,
    "sidebar" TEXT,
    "mobileNavigation" TEXT,
    "accessType" TEXT NOT NULL,
    "redirectIfForbidden" TEXT,
    "module" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "route_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_definitions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "screen" TEXT NOT NULL,
    "buttonLabel" TEXT NOT NULL,
    "roles" JSONB NOT NULL,
    "visibleWhen" TEXT NOT NULL,
    "actionDescription" TEXT NOT NULL,
    "apiEffect" TEXT NOT NULL,
    "expectedResult" TEXT NOT NULL,
    "auditRequired" BOOLEAN NOT NULL DEFAULT false,
    "confirmationRequired" BOOLEAN NOT NULL DEFAULT false,
    "confirmationRule" TEXT,
    "reasonRequired" BOOLEAN NOT NULL DEFAULT false,
    "reasonRule" TEXT,
    "notification" TEXT,
    "errorState" TEXT,
    "priority" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "action_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "screen_state_definitions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "screen" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "whatUserSees" TEXT NOT NULL,
    "allowedActions" JSONB NOT NULL,
    "forbiddenActions" JSONB NOT NULL,
    "trigger" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "screen_state_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_field_definitions" (
    "id" UUID NOT NULL,
    "formCode" TEXT NOT NULL,
    "fieldCode" TEXT NOT NULL,
    "labelAr" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "validation" TEXT,
    "defaultValue" TEXT,
    "source" TEXT,
    "editableBy" JSONB NOT NULL,
    "visibilityNote" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_field_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "definition_of_done" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "doneWhen" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "definition_of_done_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "valueType" "SettingValueType" NOT NULL,
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_setting_revisions" (
    "id" UUID NOT NULL,
    "platformSettingId" UUID NOT NULL,
    "sourceBlueprintImportId" UUID,
    "version" INTEGER NOT NULL,
    "status" "RevisionStatus" NOT NULL DEFAULT 'DRAFT',
    "value" JSONB NOT NULL,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_setting_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "translation_revisions" (
    "id" UUID NOT NULL,
    "sourceBlueprintImportId" UUID,
    "version" INTEGER NOT NULL,
    "status" "TranslationRevisionStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "translation_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "translation_keys" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "description" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "translation_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "translation_values" (
    "translationRevisionId" UUID NOT NULL,
    "translationKeyId" UUID NOT NULL,
    "locale" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "translation_values_pkey" PRIMARY KEY ("translationRevisionId","translationKeyId","locale")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'DRAFT',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_services" (
    "id" UUID NOT NULL,
    "subscriptionId" UUID NOT NULL,
    "monthlyServiceRevisionId" UUID NOT NULL,
    "serviceLevelId" UUID NOT NULL,
    "hoursAllocated" DECIMAL(10,2) NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "scopeSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_service_history" (
    "id" UUID NOT NULL,
    "subscriptionServiceId" UUID NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "changeType" TEXT NOT NULL,
    "beforeSnapshot" JSONB,
    "afterSnapshot" JSONB NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_service_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" UUID NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "clientId" UUID,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "issueDate" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "clientSnapshot" JSONB NOT NULL,
    "subtotalMonthly" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "subtotalSetup" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "subtotalOneTime" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "discountTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "finalDueNoTax" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "internalCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "margin" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "lockedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_items" (
    "id" UUID NOT NULL,
    "quoteId" UUID NOT NULL,
    "lineType" TEXT NOT NULL,
    "monthlyServiceRevisionId" UUID,
    "oneTimeServiceRevisionId" UUID,
    "serviceLevelCode" TEXT,
    "serviceSnapshot" JSONB NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "hours" DECIMAL(10,2),
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "setupFee" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(18,2) NOT NULL,
    "internalCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "overrideReason" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_item_service_item_snapshots" (
    "id" UUID NOT NULL,
    "quoteItemId" UUID NOT NULL,
    "serviceItemRevisionId" UUID,
    "itemCode" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "expectedOutput" TEXT,
    "requiresFile" BOOLEAN NOT NULL,
    "deductHours" BOOLEAN NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_item_service_item_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "quoteId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "issueDate" TIMESTAMP(3),
    "clientSnapshot" JSONB NOT NULL,
    "paymentSnapshot" JSONB,
    "discountTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "finalDueNoTax" DECIMAL(18,2) NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "quoteItemId" UUID,
    "itemSnapshot" JSONB NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "discount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(18,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requests" (
    "id" UUID NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "clientId" UUID NOT NULL,
    "subscriptionServiceId" UUID NOT NULL,
    "serviceItemRevisionId" UUID,
    "workflowVersionId" UUID NOT NULL,
    "currentStateId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "projectNumber" TEXT NOT NULL,
    "clientId" UUID NOT NULL,
    "quoteId" UUID,
    "quoteItemId" UUID,
    "oneTimeServiceRevisionId" UUID NOT NULL,
    "workflowVersionId" UUID NOT NULL,
    "currentStateId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "startsAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "serviceSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_outputs" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "OutputStatus" NOT NULL DEFAULT 'DRAFT',
    "dueAt" TIMESTAMP(3),
    "sharedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "revision" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_outputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "requestId" UUID,
    "projectId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "assigneeId" UUID,
    "dueAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "requestId" UUID,
    "projectId" UUID,
    "outputId" UUID,
    "body" TEXT NOT NULL,
    "isClientVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_notes" (
    "id" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "requestId" UUID,
    "projectId" UUID,
    "outputId" UUID,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "internal_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files_metadata" (
    "id" UUID NOT NULL,
    "requestId" UUID,
    "projectId" UUID,
    "outputId" UUID,
    "uploadedById" UUID NOT NULL,
    "storageProvider" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "sha256" TEXT NOT NULL,
    "visibility" "FileVisibility" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "files_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approvals" (
    "id" UUID NOT NULL,
    "requestId" UUID,
    "projectId" UUID,
    "outputId" UUID,
    "timeEntryId" UUID,
    "approvalType" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "actorRole" TEXT NOT NULL,
    "actorId" UUID,
    "reason" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_entries" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "requestId" UUID,
    "projectId" UUID,
    "outputId" UUID,
    "hours" DECIMAL(10,2) NOT NULL,
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "deductHours" BOOLEAN NOT NULL DEFAULT true,
    "status" "TimeEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "workDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "submittedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hour_ledger_transactions" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "timeEntryId" UUID,
    "type" "LedgerTransactionType" NOT NULL,
    "hours" DECIMAL(10,2) NOT NULL,
    "balanceBefore" DECIMAL(10,2) NOT NULL,
    "balanceAfter" DECIMAL(10,2) NOT NULL,
    "referenceCode" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hour_ledger_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_events" (
    "id" UUID NOT NULL,
    "workflowVersionId" UUID NOT NULL,
    "transitionId" UUID,
    "requestId" UUID,
    "projectId" UUID,
    "fromStateId" UUID,
    "toStateId" UUID NOT NULL,
    "actorId" UUID,
    "actorRole" TEXT NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "event" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "messageAr" TEXT,
    "messageEn" TEXT,
    "deepLink" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "readAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "eventCode" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "reason" TEXT,
    "requestId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "severity" "AuditSeverity" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_jobs" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "sourceFileName" TEXT NOT NULL,
    "sourceSha256" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "preview" JSONB,
    "errors" JSONB,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_jobs" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "scope" JSONB NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "storageKey" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "export_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blueprint_imports_sha256_key" ON "blueprint_imports"("sha256");

-- CreateIndex
CREATE UNIQUE INDEX "blueprint_imports_blueprintCode_version_sha256_key" ON "blueprint_imports"("blueprintCode", "version", "sha256");

-- CreateIndex
CREATE INDEX "blueprint_sheet_snapshots_sheetName_idx" ON "blueprint_sheet_snapshots"("sheetName");

-- CreateIndex
CREATE UNIQUE INDEX "blueprint_sheet_snapshots_blueprintImportId_sheetName_key" ON "blueprint_sheet_snapshots"("blueprintImportId", "sheetName");

-- CreateIndex
CREATE INDEX "blueprint_issues_blueprintImportId_severity_idx" ON "blueprint_issues"("blueprintImportId", "severity");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE INDEX "roles_status_sortOrder_idx" ON "roles"("status", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "permissions_module_action_idx" ON "permissions"("module", "action");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "user_permission_overrides_userId_permissionId_key" ON "user_permission_overrides"("userId", "permissionId");

-- CreateIndex
CREATE INDEX "user_scopes_userId_scopeType_idx" ON "user_scopes"("userId", "scopeType");

-- CreateIndex
CREATE INDEX "user_scopes_clientId_idx" ON "user_scopes"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "clients_code_key" ON "clients"("code");

-- CreateIndex
CREATE INDEX "clients_status_idx" ON "clients"("status");

-- CreateIndex
CREATE INDEX "clients_sector_idx" ON "clients"("sector");

-- CreateIndex
CREATE INDEX "client_contacts_clientId_status_idx" ON "client_contacts"("clientId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "client_contacts_clientId_email_key" ON "client_contacts"("clientId", "email");

-- CreateIndex
CREATE INDEX "client_assignments_userId_startsAt_endsAt_idx" ON "client_assignments"("userId", "startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "client_assignments_clientId_userId_roleCode_startsAt_key" ON "client_assignments"("clientId", "userId", "roleCode", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "service_levels_code_key" ON "service_levels"("code");

-- CreateIndex
CREATE INDEX "service_levels_status_sortOrder_idx" ON "service_levels"("status", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_services_code_key" ON "monthly_services"("code");

-- CreateIndex
CREATE INDEX "monthly_services_status_sortOrder_idx" ON "monthly_services"("status", "sortOrder");

-- CreateIndex
CREATE INDEX "monthly_service_revisions_monthlyServiceId_status_effective_idx" ON "monthly_service_revisions"("monthlyServiceId", "status", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_service_revisions_monthlyServiceId_version_key" ON "monthly_service_revisions"("monthlyServiceId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_service_level_configs_monthlyServiceRevisionId_serv_key" ON "monthly_service_level_configs"("monthlyServiceRevisionId", "serviceLevelId");

-- CreateIndex
CREATE UNIQUE INDEX "service_items_code_key" ON "service_items"("code");

-- CreateIndex
CREATE INDEX "service_items_monthlyServiceId_status_sortOrder_idx" ON "service_items"("monthlyServiceId", "status", "sortOrder");

-- CreateIndex
CREATE INDEX "service_item_revisions_serviceItemId_status_effectiveFrom_idx" ON "service_item_revisions"("serviceItemId", "status", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "service_item_revisions_serviceItemId_version_key" ON "service_item_revisions"("serviceItemId", "version");

-- CreateIndex
CREATE INDEX "service_item_level_inclusions_serviceLevelId_included_idx" ON "service_item_level_inclusions"("serviceLevelId", "included");

-- CreateIndex
CREATE UNIQUE INDEX "one_time_services_code_key" ON "one_time_services"("code");

-- CreateIndex
CREATE INDEX "one_time_services_serviceLine_status_sortOrder_idx" ON "one_time_services"("serviceLine", "status", "sortOrder");

-- CreateIndex
CREATE INDEX "one_time_service_revisions_oneTimeServiceId_status_effectiv_idx" ON "one_time_service_revisions"("oneTimeServiceId", "status", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "one_time_service_revisions_oneTimeServiceId_version_key" ON "one_time_service_revisions"("oneTimeServiceId", "version");

-- CreateIndex
CREATE INDEX "one_time_service_phases_oneTimeServiceRevisionId_sortOrder_idx" ON "one_time_service_phases"("oneTimeServiceRevisionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "one_time_service_phases_oneTimeServiceRevisionId_code_key" ON "one_time_service_phases"("oneTimeServiceRevisionId", "code");

-- CreateIndex
CREATE INDEX "one_time_service_deliverables_oneTimeServiceRevisionId_sort_idx" ON "one_time_service_deliverables"("oneTimeServiceRevisionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "one_time_service_deliverables_oneTimeServiceRevisionId_code_key" ON "one_time_service_deliverables"("oneTimeServiceRevisionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "pricing_rules_code_key" ON "pricing_rules"("code");

-- CreateIndex
CREATE INDEX "pricing_rules_status_sortOrder_idx" ON "pricing_rules"("status", "sortOrder");

-- CreateIndex
CREATE INDEX "pricing_rule_revisions_pricingRuleId_status_effectiveFrom_idx" ON "pricing_rule_revisions"("pricingRuleId", "status", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "pricing_rule_revisions_pricingRuleId_version_key" ON "pricing_rule_revisions"("pricingRuleId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "validation_rules_code_key" ON "validation_rules"("code");

-- CreateIndex
CREATE INDEX "validation_rules_entity_field_status_idx" ON "validation_rules"("entity", "field", "status");

-- CreateIndex
CREATE UNIQUE INDEX "validation_rule_revisions_validationRuleId_version_key" ON "validation_rule_revisions"("validationRuleId", "version");

-- CreateIndex
CREATE INDEX "validation_rule_revisions_validationRuleId_status_effectiveFrom_idx" ON "validation_rule_revisions"("validationRuleId", "status", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_definitions_code_key" ON "workflow_definitions"("code");

-- CreateIndex
CREATE INDEX "workflow_definitions_type_status_idx" ON "workflow_definitions"("type", "status");

-- CreateIndex
CREATE INDEX "workflow_versions_workflowDefinitionId_status_effectiveFrom_idx" ON "workflow_versions"("workflowDefinitionId", "status", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_versions_workflowDefinitionId_version_key" ON "workflow_versions"("workflowDefinitionId", "version");

-- CreateIndex
CREATE INDEX "workflow_states_workflowVersionId_sortOrder_idx" ON "workflow_states"("workflowVersionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_states_workflowVersionId_code_key" ON "workflow_states"("workflowVersionId", "code");

-- CreateIndex
CREATE INDEX "workflow_transitions_fromStateId_toStateId_idx" ON "workflow_transitions"("fromStateId", "toStateId");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_transitions_workflowVersionId_code_key" ON "workflow_transitions"("workflowVersionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "pdf_templates_code_key" ON "pdf_templates"("code");

-- CreateIndex
CREATE INDEX "pdf_templates_documentType_status_idx" ON "pdf_templates"("documentType", "status");

-- CreateIndex
CREATE INDEX "pdf_template_versions_pdfTemplateId_status_effectiveFrom_idx" ON "pdf_template_versions"("pdfTemplateId", "status", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "pdf_template_versions_pdfTemplateId_version_key" ON "pdf_template_versions"("pdfTemplateId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "pdf_field_mappings_pdfTemplateVersionId_section_field_key" ON "pdf_field_mappings"("pdfTemplateVersionId", "section", "field");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_code_key" ON "notification_templates"("code");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_event_key" ON "notification_templates"("event");

-- CreateIndex
CREATE INDEX "notification_templates_status_sortOrder_idx" ON "notification_templates"("status", "sortOrder");

-- CreateIndex
CREATE INDEX "notification_template_versions_notificationTemplateId_statu_idx" ON "notification_template_versions"("notificationTemplateId", "status", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "notification_template_versions_notificationTemplateId_versi_key" ON "notification_template_versions"("notificationTemplateId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "audit_event_definitions_code_key" ON "audit_event_definitions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "audit_event_definitions_eventId_key" ON "audit_event_definitions"("eventId");

-- CreateIndex
CREATE INDEX "audit_event_definitions_entity_status_idx" ON "audit_event_definitions"("entity", "status");

-- CreateIndex
CREATE UNIQUE INDEX "route_definitions_code_key" ON "route_definitions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "route_definitions_route_key" ON "route_definitions"("route");

-- CreateIndex
CREATE INDEX "route_definitions_module_status_sortOrder_idx" ON "route_definitions"("module", "status", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "action_definitions_code_key" ON "action_definitions"("code");

-- CreateIndex
CREATE INDEX "action_definitions_screen_status_sortOrder_idx" ON "action_definitions"("screen", "status", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "screen_state_definitions_code_key" ON "screen_state_definitions"("code");

-- CreateIndex
CREATE INDEX "screen_state_definitions_screen_status_sortOrder_idx" ON "screen_state_definitions"("screen", "status", "sortOrder");

-- CreateIndex
CREATE INDEX "form_field_definitions_formCode_status_sortOrder_idx" ON "form_field_definitions"("formCode", "status", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "form_field_definitions_formCode_fieldCode_key" ON "form_field_definitions"("formCode", "fieldCode");

-- CreateIndex
CREATE UNIQUE INDEX "definition_of_done_code_key" ON "definition_of_done"("code");

-- CreateIndex
CREATE INDEX "definition_of_done_module_status_idx" ON "definition_of_done"("module", "status");

-- CreateIndex
CREATE UNIQUE INDEX "platform_settings_key_key" ON "platform_settings"("key");

-- CreateIndex
CREATE INDEX "platform_settings_category_status_sortOrder_idx" ON "platform_settings"("category", "status", "sortOrder");

-- CreateIndex
CREATE INDEX "platform_setting_revisions_platformSettingId_status_effecti_idx" ON "platform_setting_revisions"("platformSettingId", "status", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "platform_setting_revisions_platformSettingId_version_key" ON "platform_setting_revisions"("platformSettingId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "translation_revisions_version_key" ON "translation_revisions"("version");

-- CreateIndex
CREATE UNIQUE INDEX "translation_keys_key_key" ON "translation_keys"("key");

-- CreateIndex
CREATE INDEX "translation_keys_namespace_status_idx" ON "translation_keys"("namespace", "status");

-- CreateIndex
CREATE INDEX "translation_values_locale_idx" ON "translation_values"("locale");

-- CreateIndex
CREATE INDEX "subscriptions_clientId_status_startsAt_idx" ON "subscriptions"("clientId", "status", "startsAt");

-- CreateIndex
CREATE INDEX "subscription_services_subscriptionId_status_idx" ON "subscription_services"("subscriptionId", "status");

-- CreateIndex
CREATE INDEX "subscription_services_monthlyServiceRevisionId_serviceLevel_idx" ON "subscription_services"("monthlyServiceRevisionId", "serviceLevelId");

-- CreateIndex
CREATE INDEX "subscription_service_history_subscriptionServiceId_effectiv_idx" ON "subscription_service_history"("subscriptionServiceId", "effectiveAt");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_quoteNumber_key" ON "quotes"("quoteNumber");

-- CreateIndex
CREATE INDEX "quotes_clientId_status_idx" ON "quotes"("clientId", "status");

-- CreateIndex
CREATE INDEX "quotes_status_validUntil_idx" ON "quotes"("status", "validUntil");

-- CreateIndex
CREATE INDEX "quote_items_quoteId_sortOrder_idx" ON "quote_items"("quoteId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "quote_item_service_item_snapshots_quoteItemId_itemCode_key" ON "quote_item_service_item_snapshots"("quoteItemId", "itemCode");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_clientId_status_idx" ON "invoices"("clientId", "status");

-- CreateIndex
CREATE INDEX "invoice_items_invoiceId_sortOrder_idx" ON "invoice_items"("invoiceId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "requests_requestNumber_key" ON "requests"("requestNumber");

-- CreateIndex
CREATE INDEX "requests_clientId_currentStateId_idx" ON "requests"("clientId", "currentStateId");

-- CreateIndex
CREATE INDEX "requests_subscriptionServiceId_idx" ON "requests"("subscriptionServiceId");

-- CreateIndex
CREATE INDEX "requests_dueAt_idx" ON "requests"("dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "projects_projectNumber_key" ON "projects"("projectNumber");

-- CreateIndex
CREATE INDEX "projects_clientId_status_idx" ON "projects"("clientId", "status");

-- CreateIndex
CREATE INDEX "projects_currentStateId_dueAt_idx" ON "projects"("currentStateId", "dueAt");

-- CreateIndex
CREATE INDEX "project_outputs_projectId_status_sortOrder_idx" ON "project_outputs"("projectId", "status", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "project_outputs_projectId_code_revision_key" ON "project_outputs"("projectId", "code", "revision");

-- CreateIndex
CREATE INDEX "tasks_requestId_status_idx" ON "tasks"("requestId", "status");

-- CreateIndex
CREATE INDEX "tasks_projectId_status_idx" ON "tasks"("projectId", "status");

-- CreateIndex
CREATE INDEX "tasks_assigneeId_status_idx" ON "tasks"("assigneeId", "status");

-- CreateIndex
CREATE INDEX "comments_requestId_createdAt_idx" ON "comments"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "comments_projectId_createdAt_idx" ON "comments"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "comments_outputId_createdAt_idx" ON "comments"("outputId", "createdAt");

-- CreateIndex
CREATE INDEX "internal_notes_requestId_createdAt_idx" ON "internal_notes"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "internal_notes_projectId_createdAt_idx" ON "internal_notes"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "internal_notes_outputId_createdAt_idx" ON "internal_notes"("outputId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "files_metadata_storageKey_key" ON "files_metadata"("storageKey");

-- CreateIndex
CREATE INDEX "files_metadata_requestId_visibility_idx" ON "files_metadata"("requestId", "visibility");

-- CreateIndex
CREATE INDEX "files_metadata_projectId_visibility_idx" ON "files_metadata"("projectId", "visibility");

-- CreateIndex
CREATE INDEX "files_metadata_outputId_visibility_idx" ON "files_metadata"("outputId", "visibility");

-- CreateIndex
CREATE INDEX "approvals_requestId_status_idx" ON "approvals"("requestId", "status");

-- CreateIndex
CREATE INDEX "approvals_projectId_status_idx" ON "approvals"("projectId", "status");

-- CreateIndex
CREATE INDEX "approvals_outputId_status_idx" ON "approvals"("outputId", "status");

-- CreateIndex
CREATE INDEX "approvals_timeEntryId_status_idx" ON "approvals"("timeEntryId", "status");

-- CreateIndex
CREATE INDEX "time_entries_userId_status_workDate_idx" ON "time_entries"("userId", "status", "workDate");

-- CreateIndex
CREATE INDEX "time_entries_requestId_idx" ON "time_entries"("requestId");

-- CreateIndex
CREATE INDEX "time_entries_projectId_idx" ON "time_entries"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "hour_ledger_transactions_referenceCode_key" ON "hour_ledger_transactions"("referenceCode");

-- CreateIndex
CREATE INDEX "hour_ledger_transactions_clientId_createdAt_idx" ON "hour_ledger_transactions"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "workflow_events_requestId_occurredAt_idx" ON "workflow_events"("requestId", "occurredAt");

-- CreateIndex
CREATE INDEX "workflow_events_projectId_occurredAt_idx" ON "workflow_events"("projectId", "occurredAt");

-- CreateIndex
CREATE INDEX "notifications_userId_readAt_createdAt_idx" ON "notifications"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_targetType_targetId_idx" ON "notifications"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_occurredAt_idx" ON "audit_logs"("entityType", "entityId", "occurredAt");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_occurredAt_idx" ON "audit_logs"("actorId", "occurredAt");

-- CreateIndex
CREATE INDEX "audit_logs_eventCode_occurredAt_idx" ON "audit_logs"("eventCode", "occurredAt");

-- CreateIndex
CREATE INDEX "import_jobs_status_createdAt_idx" ON "import_jobs"("status", "createdAt");

-- CreateIndex
CREATE INDEX "export_jobs_status_createdAt_idx" ON "export_jobs"("status", "createdAt");

-- CreateIndex
CREATE INDEX "outbox_events_processedAt_availableAt_idx" ON "outbox_events"("processedAt", "availableAt");

-- CreateIndex
CREATE INDEX "outbox_events_aggregateType_aggregateId_idx" ON "outbox_events"("aggregateType", "aggregateId");

-- AddForeignKey
ALTER TABLE "blueprint_sheet_snapshots" ADD CONSTRAINT "blueprint_sheet_snapshots_blueprintImportId_fkey" FOREIGN KEY ("blueprintImportId") REFERENCES "blueprint_imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blueprint_issues" ADD CONSTRAINT "blueprint_issues_blueprintImportId_fkey" FOREIGN KEY ("blueprintImportId") REFERENCES "blueprint_imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_scopes" ADD CONSTRAINT "user_scopes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_scopes" ADD CONSTRAINT "user_scopes_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_assignments" ADD CONSTRAINT "client_assignments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_assignments" ADD CONSTRAINT "client_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_service_revisions" ADD CONSTRAINT "monthly_service_revisions_monthlyServiceId_fkey" FOREIGN KEY ("monthlyServiceId") REFERENCES "monthly_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_service_revisions" ADD CONSTRAINT "monthly_service_revisions_sourceBlueprintImportId_fkey" FOREIGN KEY ("sourceBlueprintImportId") REFERENCES "blueprint_imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_service_level_configs" ADD CONSTRAINT "monthly_service_level_configs_monthlyServiceRevisionId_fkey" FOREIGN KEY ("monthlyServiceRevisionId") REFERENCES "monthly_service_revisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_service_level_configs" ADD CONSTRAINT "monthly_service_level_configs_serviceLevelId_fkey" FOREIGN KEY ("serviceLevelId") REFERENCES "service_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_items" ADD CONSTRAINT "service_items_monthlyServiceId_fkey" FOREIGN KEY ("monthlyServiceId") REFERENCES "monthly_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_item_revisions" ADD CONSTRAINT "service_item_revisions_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES "service_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_item_revisions" ADD CONSTRAINT "service_item_revisions_sourceBlueprintImportId_fkey" FOREIGN KEY ("sourceBlueprintImportId") REFERENCES "blueprint_imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_item_level_inclusions" ADD CONSTRAINT "service_item_level_inclusions_serviceItemRevisionId_fkey" FOREIGN KEY ("serviceItemRevisionId") REFERENCES "service_item_revisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_item_level_inclusions" ADD CONSTRAINT "service_item_level_inclusions_serviceLevelId_fkey" FOREIGN KEY ("serviceLevelId") REFERENCES "service_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "one_time_service_revisions" ADD CONSTRAINT "one_time_service_revisions_oneTimeServiceId_fkey" FOREIGN KEY ("oneTimeServiceId") REFERENCES "one_time_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "one_time_service_revisions" ADD CONSTRAINT "one_time_service_revisions_sourceBlueprintImportId_fkey" FOREIGN KEY ("sourceBlueprintImportId") REFERENCES "blueprint_imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "one_time_service_phases" ADD CONSTRAINT "one_time_service_phases_oneTimeServiceRevisionId_fkey" FOREIGN KEY ("oneTimeServiceRevisionId") REFERENCES "one_time_service_revisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "one_time_service_deliverables" ADD CONSTRAINT "one_time_service_deliverables_oneTimeServiceRevisionId_fkey" FOREIGN KEY ("oneTimeServiceRevisionId") REFERENCES "one_time_service_revisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_rule_revisions" ADD CONSTRAINT "pricing_rule_revisions_pricingRuleId_fkey" FOREIGN KEY ("pricingRuleId") REFERENCES "pricing_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_rule_revisions" ADD CONSTRAINT "pricing_rule_revisions_sourceBlueprintImportId_fkey" FOREIGN KEY ("sourceBlueprintImportId") REFERENCES "blueprint_imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_rule_revisions" ADD CONSTRAINT "validation_rule_revisions_validationRuleId_fkey" FOREIGN KEY ("validationRuleId") REFERENCES "validation_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_rule_revisions" ADD CONSTRAINT "validation_rule_revisions_sourceBlueprintImportId_fkey" FOREIGN KEY ("sourceBlueprintImportId") REFERENCES "blueprint_imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_versions" ADD CONSTRAINT "workflow_versions_workflowDefinitionId_fkey" FOREIGN KEY ("workflowDefinitionId") REFERENCES "workflow_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_versions" ADD CONSTRAINT "workflow_versions_sourceBlueprintImportId_fkey" FOREIGN KEY ("sourceBlueprintImportId") REFERENCES "blueprint_imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_states" ADD CONSTRAINT "workflow_states_workflowVersionId_fkey" FOREIGN KEY ("workflowVersionId") REFERENCES "workflow_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_transitions" ADD CONSTRAINT "workflow_transitions_workflowVersionId_fkey" FOREIGN KEY ("workflowVersionId") REFERENCES "workflow_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_transitions" ADD CONSTRAINT "workflow_transitions_fromStateId_fkey" FOREIGN KEY ("fromStateId") REFERENCES "workflow_states"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_transitions" ADD CONSTRAINT "workflow_transitions_toStateId_fkey" FOREIGN KEY ("toStateId") REFERENCES "workflow_states"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdf_template_versions" ADD CONSTRAINT "pdf_template_versions_pdfTemplateId_fkey" FOREIGN KEY ("pdfTemplateId") REFERENCES "pdf_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdf_template_versions" ADD CONSTRAINT "pdf_template_versions_sourceBlueprintImportId_fkey" FOREIGN KEY ("sourceBlueprintImportId") REFERENCES "blueprint_imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdf_field_mappings" ADD CONSTRAINT "pdf_field_mappings_pdfTemplateVersionId_fkey" FOREIGN KEY ("pdfTemplateVersionId") REFERENCES "pdf_template_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_template_versions" ADD CONSTRAINT "notification_template_versions_notificationTemplateId_fkey" FOREIGN KEY ("notificationTemplateId") REFERENCES "notification_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_template_versions" ADD CONSTRAINT "notification_template_versions_sourceBlueprintImportId_fkey" FOREIGN KEY ("sourceBlueprintImportId") REFERENCES "blueprint_imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_setting_revisions" ADD CONSTRAINT "platform_setting_revisions_platformSettingId_fkey" FOREIGN KEY ("platformSettingId") REFERENCES "platform_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_setting_revisions" ADD CONSTRAINT "platform_setting_revisions_sourceBlueprintImportId_fkey" FOREIGN KEY ("sourceBlueprintImportId") REFERENCES "blueprint_imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translation_revisions" ADD CONSTRAINT "translation_revisions_sourceBlueprintImportId_fkey" FOREIGN KEY ("sourceBlueprintImportId") REFERENCES "blueprint_imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translation_values" ADD CONSTRAINT "translation_values_translationRevisionId_fkey" FOREIGN KEY ("translationRevisionId") REFERENCES "translation_revisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translation_values" ADD CONSTRAINT "translation_values_translationKeyId_fkey" FOREIGN KEY ("translationKeyId") REFERENCES "translation_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_services" ADD CONSTRAINT "subscription_services_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_services" ADD CONSTRAINT "subscription_services_monthlyServiceRevisionId_fkey" FOREIGN KEY ("monthlyServiceRevisionId") REFERENCES "monthly_service_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_services" ADD CONSTRAINT "subscription_services_serviceLevelId_fkey" FOREIGN KEY ("serviceLevelId") REFERENCES "service_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_service_history" ADD CONSTRAINT "subscription_service_history_subscriptionServiceId_fkey" FOREIGN KEY ("subscriptionServiceId") REFERENCES "subscription_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_monthlyServiceRevisionId_fkey" FOREIGN KEY ("monthlyServiceRevisionId") REFERENCES "monthly_service_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_oneTimeServiceRevisionId_fkey" FOREIGN KEY ("oneTimeServiceRevisionId") REFERENCES "one_time_service_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_item_service_item_snapshots" ADD CONSTRAINT "quote_item_service_item_snapshots_quoteItemId_fkey" FOREIGN KEY ("quoteItemId") REFERENCES "quote_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_item_service_item_snapshots" ADD CONSTRAINT "quote_item_service_item_snapshots_serviceItemRevisionId_fkey" FOREIGN KEY ("serviceItemRevisionId") REFERENCES "service_item_revisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_quoteItemId_fkey" FOREIGN KEY ("quoteItemId") REFERENCES "quote_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_subscriptionServiceId_fkey" FOREIGN KEY ("subscriptionServiceId") REFERENCES "subscription_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_serviceItemRevisionId_fkey" FOREIGN KEY ("serviceItemRevisionId") REFERENCES "service_item_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_workflowVersionId_fkey" FOREIGN KEY ("workflowVersionId") REFERENCES "workflow_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_currentStateId_fkey" FOREIGN KEY ("currentStateId") REFERENCES "workflow_states"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_quoteItemId_fkey" FOREIGN KEY ("quoteItemId") REFERENCES "quote_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_oneTimeServiceRevisionId_fkey" FOREIGN KEY ("oneTimeServiceRevisionId") REFERENCES "one_time_service_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_workflowVersionId_fkey" FOREIGN KEY ("workflowVersionId") REFERENCES "workflow_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_currentStateId_fkey" FOREIGN KEY ("currentStateId") REFERENCES "workflow_states"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_outputs" ADD CONSTRAINT "project_outputs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_outputId_fkey" FOREIGN KEY ("outputId") REFERENCES "project_outputs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_notes" ADD CONSTRAINT "internal_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_notes" ADD CONSTRAINT "internal_notes_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_notes" ADD CONSTRAINT "internal_notes_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_notes" ADD CONSTRAINT "internal_notes_outputId_fkey" FOREIGN KEY ("outputId") REFERENCES "project_outputs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files_metadata" ADD CONSTRAINT "files_metadata_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files_metadata" ADD CONSTRAINT "files_metadata_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files_metadata" ADD CONSTRAINT "files_metadata_outputId_fkey" FOREIGN KEY ("outputId") REFERENCES "project_outputs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files_metadata" ADD CONSTRAINT "files_metadata_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_outputId_fkey" FOREIGN KEY ("outputId") REFERENCES "project_outputs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_timeEntryId_fkey" FOREIGN KEY ("timeEntryId") REFERENCES "time_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_outputId_fkey" FOREIGN KEY ("outputId") REFERENCES "project_outputs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hour_ledger_transactions" ADD CONSTRAINT "hour_ledger_transactions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hour_ledger_transactions" ADD CONSTRAINT "hour_ledger_transactions_timeEntryId_fkey" FOREIGN KEY ("timeEntryId") REFERENCES "time_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_events" ADD CONSTRAINT "workflow_events_workflowVersionId_fkey" FOREIGN KEY ("workflowVersionId") REFERENCES "workflow_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_events" ADD CONSTRAINT "workflow_events_transitionId_fkey" FOREIGN KEY ("transitionId") REFERENCES "workflow_transitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_events" ADD CONSTRAINT "workflow_events_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_events" ADD CONSTRAINT "workflow_events_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_events" ADD CONSTRAINT "workflow_events_fromStateId_fkey" FOREIGN KEY ("fromStateId") REFERENCES "workflow_states"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_events" ADD CONSTRAINT "workflow_events_toStateId_fkey" FOREIGN KEY ("toStateId") REFERENCES "workflow_states"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- One current active configuration revision per stable business record.
CREATE UNIQUE INDEX "monthly_service_revisions_one_active"
  ON "monthly_service_revisions" ("monthlyServiceId")
  WHERE "status" = 'ACTIVE' AND "effectiveTo" IS NULL;
CREATE UNIQUE INDEX "service_item_revisions_one_active"
  ON "service_item_revisions" ("serviceItemId")
  WHERE "status" = 'ACTIVE' AND "effectiveTo" IS NULL;
CREATE UNIQUE INDEX "one_time_service_revisions_one_active"
  ON "one_time_service_revisions" ("oneTimeServiceId")
  WHERE "status" = 'ACTIVE' AND "effectiveTo" IS NULL;
CREATE UNIQUE INDEX "pricing_rule_revisions_one_active"
  ON "pricing_rule_revisions" ("pricingRuleId")
  WHERE "status" = 'ACTIVE' AND "effectiveTo" IS NULL;
CREATE UNIQUE INDEX "validation_rule_revisions_one_active"
  ON "validation_rule_revisions" ("validationRuleId")
  WHERE "status" = 'ACTIVE' AND "effectiveTo" IS NULL;
CREATE UNIQUE INDEX "workflow_versions_one_active"
  ON "workflow_versions" ("workflowDefinitionId")
  WHERE "status" = 'ACTIVE' AND "effectiveTo" IS NULL;
CREATE UNIQUE INDEX "pdf_template_versions_one_active"
  ON "pdf_template_versions" ("pdfTemplateId")
  WHERE "status" = 'ACTIVE' AND "effectiveTo" IS NULL;
CREATE UNIQUE INDEX "notification_template_versions_one_active"
  ON "notification_template_versions" ("notificationTemplateId")
  WHERE "status" = 'ACTIVE' AND "effectiveTo" IS NULL;
CREATE UNIQUE INDEX "platform_setting_revisions_one_active"
  ON "platform_setting_revisions" ("platformSettingId")
  WHERE "status" = 'ACTIVE' AND "effectiveTo" IS NULL;
CREATE UNIQUE INDEX "translation_revisions_one_published"
  ON "translation_revisions" ("status")
  WHERE "status" = 'PUBLISHED';

-- Guard the polymorphic records that must belong to exactly one business target.
ALTER TABLE "quote_items"
  ADD CONSTRAINT "quote_items_exactly_one_service"
  CHECK (num_nonnulls("monthlyServiceRevisionId", "oneTimeServiceRevisionId") = 1);
ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_exactly_one_parent"
  CHECK (num_nonnulls("requestId", "projectId") = 1);
ALTER TABLE "comments"
  ADD CONSTRAINT "comments_exactly_one_parent"
  CHECK (num_nonnulls("requestId", "projectId", "outputId") = 1);
ALTER TABLE "internal_notes"
  ADD CONSTRAINT "internal_notes_exactly_one_parent"
  CHECK (num_nonnulls("requestId", "projectId", "outputId") = 1);
ALTER TABLE "files_metadata"
  ADD CONSTRAINT "files_metadata_exactly_one_parent"
  CHECK (num_nonnulls("requestId", "projectId", "outputId") = 1);
ALTER TABLE "approvals"
  ADD CONSTRAINT "approvals_exactly_one_parent"
  CHECK (num_nonnulls("requestId", "projectId", "outputId", "timeEntryId") = 1);
ALTER TABLE "time_entries"
  ADD CONSTRAINT "time_entries_exactly_one_parent"
  CHECK (num_nonnulls("requestId", "projectId", "outputId") = 1);
ALTER TABLE "workflow_events"
  ADD CONSTRAINT "workflow_events_exactly_one_parent"
  CHECK (num_nonnulls("requestId", "projectId") = 1);

-- Reject invalid commercial and effort values at the database boundary.
ALTER TABLE "monthly_service_revisions"
  ADD CONSTRAINT "monthly_service_revisions_nonnegative_values"
  CHECK (
    "sellingHourlyRateSar" >= 0
    AND "internalHourlyCostSar" >= 0
    AND "setupFeePct" >= 0
    AND "setupFeePct" <= 100
    AND "defaultSlaHours" >= 0
  );
ALTER TABLE "monthly_service_level_configs"
  ADD CONSTRAINT "monthly_service_level_configs_nonnegative_hours"
  CHECK ("hours" >= 0);
ALTER TABLE "one_time_service_revisions"
  ADD CONSTRAINT "one_time_service_revisions_nonnegative_values"
  CHECK ("basePriceSar" >= 0 AND "estimatedHours" >= 0 AND "durationDays" >= 0);
ALTER TABLE "quote_items"
  ADD CONSTRAINT "quote_items_nonnegative_values"
  CHECK (
    "quantity" >= 0
    AND ("hours" IS NULL OR "hours" >= 0)
    AND "unitPrice" >= 0
    AND "setupFee" >= 0
    AND "discount" >= 0
    AND "internalCost" >= 0
  );
ALTER TABLE "invoice_items"
  ADD CONSTRAINT "invoice_items_nonnegative_values"
  CHECK ("quantity" >= 0 AND "unitPrice" >= 0 AND "discount" >= 0);
ALTER TABLE "time_entries"
  ADD CONSTRAINT "time_entries_positive_hours"
  CHECK ("hours" > 0);
