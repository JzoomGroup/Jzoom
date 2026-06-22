import type { NormalizedBlueprint } from "../blueprint/normalized-blueprint.js";
import { Prisma, type PrismaClient } from "../generated/prisma/client.js";

export interface BlueprintSeedResult {
  blueprintImportId: string;
  status: "APPLIED" | "APPLIED_WITH_WARNINGS";
  alreadyApplied: boolean;
  warningCount: number;
  errorCount: number;
  counts: {
    monthlyServices: number;
    monthlyServiceCategories: number;
    serviceItems: number;
    oneTimeServices: number;
    oneTimeServiceCategories: number;
    workflows: number;
    routes: number;
    actions: number;
  };
}

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function categoryCode(domain: string): string {
  const slug = domain
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `CAT-${slug || "GENERAL"}`;
}

function oneTimeCategoryCode(serviceLine: string): string {
  const slug = serviceLine
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `OT-CAT-${slug || "GENERAL"}`;
}

function pricingRuleDefaults(code: string, sortOrder: number) {
  if (code === "PR-001") {
    return { ruleType: "RATE_CARD", targetType: "MONTHLY", priority: sortOrder };
  }
  if (code === "PR-002") {
    return { ruleType: "SETUP_FEE", targetType: "MONTHLY", priority: sortOrder };
  }
  if (code === "PR-003") {
    return { ruleType: "RATE_CARD", targetType: "ONE_TIME", priority: sortOrder };
  }
  if (code === "PR-004") {
    return { ruleType: "DISCOUNT", targetType: "ALL", priority: sortOrder };
  }
  if (code === "PR-007") {
    return { ruleType: "MARGIN", targetType: "ALL", priority: sortOrder };
  }
  return { ruleType: "FORMULA", targetType: "ALL", priority: sortOrder };
}

export async function seedBlueprint(
  client: PrismaClient,
  blueprint: NormalizedBlueprint,
): Promise<BlueprintSeedResult> {
  const errorCount = blueprint.issues.filter((issue) => issue.severity === "ERROR").length;
  const warningCount = blueprint.issues.filter((issue) => issue.severity === "WARNING").length;
  const monthlyServiceCategoryCount = new Set(
    blueprint.monthlyServices.map((service) => service.domain),
  ).size;
  const oneTimeServiceCategoryCount = new Set(
    blueprint.oneTimeServices.map((service) => service.serviceLine),
  ).size;

  if (errorCount > 0) {
    throw new Error(
      `Blueprint normalization produced ${errorCount} blocking error(s); seed was not applied.`,
    );
  }

  const existing = await client.blueprintImport.findUnique({
    where: { sha256: blueprint.workbook.sha256 },
  });
  if (existing?.status === "APPLIED" || existing?.status === "APPLIED_WITH_WARNINGS") {
    return {
      blueprintImportId: existing.id,
      status: existing.status,
      alreadyApplied: true,
      warningCount: existing.warningCount,
      errorCount: existing.errorCount,
      counts: {
        monthlyServices: blueprint.monthlyServices.length,
        monthlyServiceCategories: monthlyServiceCategoryCount,
        serviceItems: blueprint.serviceItems.length,
        oneTimeServices: blueprint.oneTimeServices.length,
        oneTimeServiceCategories: oneTimeServiceCategoryCount,
        workflows: blueprint.workflows.length,
        routes: blueprint.routes.length,
        actions: blueprint.actions.length,
      },
    };
  }

  const result = await client.$transaction(
    async (tx) => {
      const blueprintImport = await tx.blueprintImport.upsert({
        where: { sha256: blueprint.workbook.sha256 },
        create: {
          blueprintCode: blueprint.manifest.blueprintCode,
          version: blueprint.manifest.version,
          sourceFileName: blueprint.workbook.sourceFileName,
          sha256: blueprint.workbook.sha256,
          manifest: json(blueprint.manifest),
          status: "VALIDATED",
          warningCount,
          errorCount,
        },
        update: {
          manifest: json(blueprint.manifest),
          status: "VALIDATED",
          warningCount,
          errorCount,
        },
      });

      for (const sheet of blueprint.workbook.sheets) {
        await tx.blueprintSheetSnapshot.upsert({
          where: {
            blueprintImportId_sheetName: {
              blueprintImportId: blueprintImport.id,
              sheetName: sheet.name,
            },
          },
          create: {
            blueprintImportId: blueprintImport.id,
            sheetName: sheet.name,
            tableName: sheet.tableName,
            rowCount: sheet.rows.length,
            headers: json(sheet.headers),
            rows: json(sheet.rows),
            sha256: sheet.sha256,
          },
          update: {
            tableName: sheet.tableName,
            rowCount: sheet.rows.length,
            headers: json(sheet.headers),
            rows: json(sheet.rows),
            sha256: sheet.sha256,
          },
        });
      }

      await tx.blueprintIssue.deleteMany({
        where: { blueprintImportId: blueprintImport.id },
      });
      if (blueprint.issues.length > 0) {
        await tx.blueprintIssue.createMany({
          data: blueprint.issues.map((issue) => ({
            blueprintImportId: blueprintImport.id,
            severity: issue.severity,
            code: issue.code,
            sheetName: issue.sheetName,
            rowReference: issue.rowReference,
            entityCode: issue.entityCode,
            message: issue.message,
            normalizedDefault:
              issue.normalizedDefault === null ? Prisma.JsonNull : json(issue.normalizedDefault),
          })),
        });
      }

      const roleIds = new Map<string, string>();
      for (const role of blueprint.roles) {
        const record = await tx.role.upsert({
          where: { code: role.code },
          create: {
            code: role.code,
            name: role.name,
            nameEn: role.name,
            userType: role.userType,
            description: role.description,
            dataScope: role.dataScope,
            capabilities: role.capabilities,
            restrictions: role.restrictions,
            isSystem: true,
            sortOrder: role.sortOrder,
          },
          update: {},
        });
        roleIds.set(role.code, record.id);
      }

      for (const permission of blueprint.permissions) {
        const record = await tx.permission.upsert({
          where: { code: permission.code },
          create: {
            code: permission.code,
            name: permission.name,
            module: permission.module,
            action: permission.action,
            description: permission.description,
            sortOrder: permission.sortOrder,
          },
          update: {},
        });
        for (const roleCode of permission.roleCodes) {
          const roleId = roleIds.get(roleCode);
          if (!roleId) {
            continue;
          }
          await tx.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId,
                permissionId: record.id,
              },
            },
            create: {
              roleId,
              permissionId: record.id,
              effect: "ALLOW",
            },
            update: {},
          });
        }
      }

      const oneTimePermission = await tx.permission.upsert({
        where: { code: "PERM-MANAGE-ONE-TIME-SERVICES" },
        create: {
          code: "PERM-MANAGE-ONE-TIME-SERVICES",
          name: "Manage One-Time Services",
          module: "Catalog",
          action: "manage_one_time_services",
          description: "Create and configure revision-safe one-time service catalog records.",
          sortOrder: blueprint.permissions.length + 500,
        },
        update: { status: "ACTIVE" },
      });
      const adminRoleId = roleIds.get("ROLE-ADMIN");
      if (adminRoleId) {
        await tx.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: adminRoleId,
              permissionId: oneTimePermission.id,
            },
          },
          create: {
            roleId: adminRoleId,
            permissionId: oneTimePermission.id,
            effect: "ALLOW",
          },
          update: { effect: "ALLOW" },
        });
      }

      const pricingPermissions = [
        {
          code: "PERM-MANAGE-PRICING-RULES",
          name: "Manage Pricing Rules",
          action: "manage_pricing_rules",
          description: "Create and configure effective-dated pricing-rule revisions.",
          roleCodes: ["ROLE-ADMIN"],
        },
        {
          code: "PERM-USE-PRICING-STUDIO",
          name: "Use Pricing Studio",
          action: "use_pricing_studio",
          description: "Create, calculate, save, and reload scoped pricing drafts.",
          roleCodes: ["ROLE-ADMIN", "ROLE-AM"],
        },
      ] as const;
      for (const [index, permission] of pricingPermissions.entries()) {
        const record = await tx.permission.upsert({
          where: { code: permission.code },
          create: {
            code: permission.code,
            name: permission.name,
            module: "Pricing",
            action: permission.action,
            description: permission.description,
            sortOrder: blueprint.permissions.length + 600 + index,
          },
          update: { status: "ACTIVE" },
        });
        for (const roleCode of permission.roleCodes) {
          const roleId = roleIds.get(roleCode);
          if (!roleId) {
            continue;
          }
          await tx.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId,
                permissionId: record.id,
              },
            },
            create: {
              roleId,
              permissionId: record.id,
              effect: "ALLOW",
            },
            update: { effect: "ALLOW" },
          });
        }
      }

      const levelIds = new Map<string, string>();
      for (const level of blueprint.serviceLevels) {
        const record = await tx.serviceLevel.upsert({
          where: { code: level.code },
          create: {
            code: level.code,
            labelAr: level.labelAr,
            labelEn: level.labelEn,
            purpose: level.purpose,
            hoursSource: level.hoursSource,
            slaRule: level.slaRule,
            scopeRule: level.scopeRule,
            governanceRule: level.governanceRule,
            isCustom: level.isCustom,
            sortOrder: level.sortOrder,
          },
          update: {},
        });
        levelIds.set(level.code, record.id);
      }

      const categoryIds = new Map<string, string>();
      for (const [sortOrder, domain] of [
        ...new Set(blueprint.monthlyServices.map((service) => service.domain)),
      ].entries()) {
        const record = await tx.monthlyServiceCategory.upsert({
          where: { code: categoryCode(domain) },
          create: {
            code: categoryCode(domain),
            nameAr: domain,
            nameEn: domain,
            sortOrder,
          },
          update: {},
        });
        categoryIds.set(domain, record.id);
      }

      const monthlyIds = new Map<string, string>();
      for (const service of blueprint.monthlyServices) {
        const categoryId = categoryIds.get(service.domain);
        if (!categoryId) {
          throw new Error(`Normalized monthly service ${service.code} has no category.`);
        }
        const stable = await tx.monthlyService.upsert({
          where: { code: service.code },
          create: {
            categoryId,
            code: service.code,
            externalId: service.externalId,
            status: service.status,
            sortOrder: service.sortOrder,
          },
          update: {},
        });
        monthlyIds.set(service.code, stable.id);
        const revision = await tx.monthlyServiceRevision.upsert({
          where: {
            monthlyServiceId_version: {
              monthlyServiceId: stable.id,
              version: 1,
            },
          },
          create: {
            monthlyServiceId: stable.id,
            sourceBlueprintImportId: blueprintImport.id,
            version: 1,
            status: "ACTIVE",
            effectiveFrom: new Date(blueprint.effectiveFrom),
            nameAr: service.nameAr,
            nameEn: service.nameEn,
            paymentType: service.paymentType,
            serviceLine: service.serviceLine,
            domain: service.domain,
            description: service.description,
            visibleInPricing: service.visibleInPricing,
            sellingHourlyRateSar: service.sellingHourlyRateSar,
            internalHourlyCostSar: service.internalHourlyCostSar,
            setupFeePct: service.setupFeePct,
            defaultSlaHours: service.defaultSlaHours,
            deductHours: service.deductHours,
            requiresSupervisor: service.requiresSupervisor,
            requiresManagement: service.requiresManagement,
            clientApprovalRequired: service.clientApprovalRequired,
            cardConfiguration: json(service.cardConfiguration),
          },
          update: {},
        });
        for (const config of service.levelConfigs) {
          const serviceLevelId = levelIds.get(config.serviceLevelCode);
          if (!serviceLevelId) {
            continue;
          }
          await tx.monthlyServiceLevelConfig.upsert({
            where: {
              monthlyServiceRevisionId_serviceLevelId: {
                monthlyServiceRevisionId: revision.id,
                serviceLevelId,
              },
            },
            create: {
              monthlyServiceRevisionId: revision.id,
              serviceLevelId,
              hours: config.hours,
              isEnabled: config.isEnabled,
              sortOrder: config.sortOrder,
            },
            update: {},
          });
        }
      }

      for (const item of blueprint.serviceItems) {
        const monthlyServiceId = monthlyIds.get(item.serviceCode);
        if (!monthlyServiceId) {
          throw new Error(
            `Normalized service item ${item.code} has no parent ${item.serviceCode}.`,
          );
        }
        const stable = await tx.serviceItem.upsert({
          where: { code: item.code },
          create: {
            code: item.code,
            monthlyServiceId,
            status: item.status,
            sortOrder: item.sortOrder,
          },
          update: {},
        });
        const revision = await tx.serviceItemRevision.upsert({
          where: {
            serviceItemId_version: {
              serviceItemId: stable.id,
              version: 1,
            },
          },
          create: {
            serviceItemId: stable.id,
            sourceBlueprintImportId: blueprintImport.id,
            version: 1,
            status: "ACTIVE",
            effectiveFrom: new Date(blueprint.effectiveFrom),
            nameAr: item.nameAr,
            nameEn: item.nameEn,
            expectedOutput: item.expectedOutput,
            visibleInQuote: item.visibleInQuote,
            requiresFile: item.requiresFile,
            deductHours: item.deductHours,
            requestType: item.requestType,
          },
          update: {},
        });
        for (const inclusion of item.levelInclusions) {
          const serviceLevelId = levelIds.get(inclusion.serviceLevelCode);
          if (!serviceLevelId) {
            continue;
          }
          await tx.serviceItemLevelInclusion.upsert({
            where: {
              serviceItemRevisionId_serviceLevelId: {
                serviceItemRevisionId: revision.id,
                serviceLevelId,
              },
            },
            create: {
              serviceItemRevisionId: revision.id,
              serviceLevelId,
              included: inclusion.included,
              sortOrder: inclusion.sortOrder,
            },
            update: {},
          });
        }
      }

      const oneTimeCategoryIds = new Map<string, string>();
      for (const [sortOrder, serviceLine] of [
        ...new Set(blueprint.oneTimeServices.map((service) => service.serviceLine)),
      ].entries()) {
        const record = await tx.oneTimeServiceCategory.upsert({
          where: { code: oneTimeCategoryCode(serviceLine) },
          create: {
            code: oneTimeCategoryCode(serviceLine),
            nameAr: serviceLine,
            nameEn: serviceLine,
            sortOrder,
          },
          update: {},
        });
        oneTimeCategoryIds.set(serviceLine, record.id);
      }

      for (const service of blueprint.oneTimeServices) {
        const categoryId = oneTimeCategoryIds.get(service.serviceLine);
        if (!categoryId) {
          throw new Error(`Normalized one-time service ${service.code} has no category.`);
        }
        const stable = await tx.oneTimeService.upsert({
          where: { code: service.code },
          create: {
            categoryId,
            code: service.code,
            serviceLine: service.serviceLine,
            status: service.status,
            sortOrder: service.sortOrder,
          },
          update: {},
        });
        const revision = await tx.oneTimeServiceRevision.upsert({
          where: {
            oneTimeServiceId_version: {
              oneTimeServiceId: stable.id,
              version: 1,
            },
          },
          create: {
            oneTimeServiceId: stable.id,
            sourceBlueprintImportId: blueprintImport.id,
            version: 1,
            status: "ACTIVE",
            effectiveFrom: new Date(blueprint.effectiveFrom),
            nameAr: service.nameAr,
            nameEn: service.nameEn,
            paymentType: service.paymentType,
            basePriceSar: service.basePriceSar,
            estimatedHours: service.estimatedHours,
            internalHourlyCostSar: 0,
            durationDays: service.durationDays,
            visibleInPricing: service.visibleInPricing,
            createsProject: service.createsProject,
            description: service.description,
          },
          update: {},
        });
        for (const phase of service.phases) {
          await tx.oneTimeServicePhase.upsert({
            where: {
              oneTimeServiceRevisionId_code: {
                oneTimeServiceRevisionId: revision.id,
                code: phase.code,
              },
            },
            create: {
              oneTimeServiceRevisionId: revision.id,
              code: phase.code,
              nameEn: phase.nameEn,
              sortOrder: phase.sortOrder,
            },
            update: {},
          });
        }
        for (const deliverable of service.deliverables) {
          await tx.oneTimeServiceDeliverable.upsert({
            where: {
              oneTimeServiceRevisionId_code: {
                oneTimeServiceRevisionId: revision.id,
                code: deliverable.code,
              },
            },
            create: {
              oneTimeServiceRevisionId: revision.id,
              code: deliverable.code,
              nameEn: deliverable.nameEn,
              sortOrder: deliverable.sortOrder,
            },
            update: {},
          });
        }
      }

      for (const rule of blueprint.pricingRules) {
        const stable = await tx.pricingRule.upsert({
          where: { code: rule.code },
          create: {
            code: rule.code,
            name: rule.name,
            sortOrder: rule.sortOrder,
          },
          update: {},
        });
        await tx.pricingRuleRevision.upsert({
          where: {
            pricingRuleId_version: {
              pricingRuleId: stable.id,
              version: 1,
            },
          },
          create: {
            pricingRuleId: stable.id,
            sourceBlueprintImportId: blueprintImport.id,
            version: 1,
            status: "ACTIVE",
            effectiveFrom: new Date(blueprint.effectiveFrom),
            formulaOrRule: rule.formulaOrRule,
            appliesTo: rule.appliesTo,
            implementationOwner: rule.implementationOwner,
            visibility: rule.visibility,
            ...pricingRuleDefaults(rule.code, rule.sortOrder),
          },
          update: {},
        });
      }

      for (const rule of blueprint.validationRules) {
        const stable = await tx.validationRule.upsert({
          where: { code: rule.code },
          create: {
            code: rule.code,
            entity: rule.entity,
            field: rule.field,
            sortOrder: rule.sortOrder,
          },
          update: {},
        });
        await tx.validationRuleRevision.upsert({
          where: {
            validationRuleId_version: {
              validationRuleId: stable.id,
              version: 1,
            },
          },
          create: {
            validationRuleId: stable.id,
            sourceBlueprintImportId: blueprintImport.id,
            version: 1,
            status: "ACTIVE",
            effectiveFrom: new Date(blueprint.effectiveFrom),
            rule: rule.rule,
            errorMessageAr: rule.errorMessageAr,
            errorMessageEn: rule.errorMessageEn,
            enforcedIn: rule.enforcedIn,
            failureBehavior: rule.failureBehavior,
          },
          update: {},
        });
      }

      for (const workflow of blueprint.workflows) {
        const stable = await tx.workflowDefinition.upsert({
          where: { code: workflow.code },
          create: {
            code: workflow.code,
            name: workflow.name,
            type: workflow.type,
            sortOrder: workflow.sortOrder,
          },
          update: {},
        });
        const version = await tx.workflowVersion.upsert({
          where: {
            workflowDefinitionId_version: {
              workflowDefinitionId: stable.id,
              version: 1,
            },
          },
          create: {
            workflowDefinitionId: stable.id,
            sourceBlueprintImportId: blueprintImport.id,
            version: 1,
            status: "ACTIVE",
            effectiveFrom: new Date(blueprint.effectiveFrom),
          },
          update: {},
        });
        const stateIds = new Map<string, string>();
        for (const state of workflow.states) {
          const record = await tx.workflowState.upsert({
            where: {
              workflowVersionId_code: {
                workflowVersionId: version.id,
                code: state.code,
              },
            },
            create: {
              workflowVersionId: version.id,
              code: state.code,
              labelEn: state.labelEn,
              isInitial: state.isInitial,
              isTerminal: state.isTerminal,
              sortOrder: state.sortOrder,
            },
            update: {},
          });
          stateIds.set(state.code, record.id);
        }
        for (const transition of workflow.transitions) {
          const fromStateId = stateIds.get(transition.fromStateCode);
          const toStateId = stateIds.get(transition.toStateCode);
          if (!fromStateId || !toStateId) {
            throw new Error(`Workflow transition ${transition.code} references an unknown state.`);
          }
          await tx.workflowTransition.upsert({
            where: {
              workflowVersionId_code: {
                workflowVersionId: version.id,
                code: transition.code,
              },
            },
            create: {
              workflowVersionId: version.id,
              code: transition.code,
              fromStateId,
              toStateId,
              actorRoles: json(transition.actorRoles),
              condition: transition.condition,
              sideEffect: transition.sideEffect,
              sortOrder: transition.sortOrder,
            },
            update: {},
          });
        }
      }

      for (const template of blueprint.pdfTemplates) {
        const stable = await tx.pdfTemplate.upsert({
          where: { code: template.code },
          create: {
            code: template.code,
            name: template.name,
            documentType: template.documentType,
            sortOrder: template.sortOrder,
          },
          update: {},
        });
        const version = await tx.pdfTemplateVersion.upsert({
          where: {
            pdfTemplateId_version: {
              pdfTemplateId: stable.id,
              version: 1,
            },
          },
          create: {
            pdfTemplateId: stable.id,
            sourceBlueprintImportId: blueprintImport.id,
            version: 1,
            status: "ACTIVE",
            audience: template.audience,
            mustInclude: json(template.mustInclude),
            mustExclude: json(template.mustExclude),
            languageDirection: template.languageDirection,
            technicalRule: template.technicalRule,
            effectiveFrom: new Date(blueprint.effectiveFrom),
          },
          update: {},
        });
        for (const mapping of template.fieldMappings) {
          await tx.pdfFieldMapping.upsert({
            where: {
              pdfTemplateVersionId_section_field: {
                pdfTemplateVersionId: version.id,
                section: mapping.section,
                field: mapping.field,
              },
            },
            create: {
              pdfTemplateVersionId: version.id,
              section: mapping.section,
              field: mapping.field,
              source: mapping.source,
              showClient: mapping.showClient,
              showInternal: mapping.showInternal,
              forbidden: mapping.forbidden,
              documentScope: mapping.documentScope,
              notes: mapping.notes,
              sortOrder: mapping.sortOrder,
            },
            update: {},
          });
        }
      }

      for (const template of blueprint.notificationTemplates) {
        const stable = await tx.notificationTemplate.upsert({
          where: { event: template.event },
          create: {
            code: template.code,
            event: template.event,
            sortOrder: template.sortOrder,
          },
          update: {},
        });
        await tx.notificationTemplateVersion.upsert({
          where: {
            notificationTemplateId_version: {
              notificationTemplateId: stable.id,
              version: 1,
            },
          },
          create: {
            notificationTemplateId: stable.id,
            sourceBlueprintImportId: blueprintImport.id,
            version: 1,
            status: "ACTIVE",
            recipients: json(template.recipients),
            messageAr: template.messageAr,
            messageEn: template.messageEn,
            description: template.description,
            deepLink: template.deepLink,
            channels: json(template.channels),
            cadence: template.cadence,
            reminderRule: template.reminderRule,
            effectiveFrom: new Date(blueprint.effectiveFrom),
          },
          update: {},
        });
      }

      for (const event of blueprint.auditEvents) {
        await tx.auditEventDefinition.upsert({
          where: { code: event.code },
          create: {
            code: event.code,
            eventId: event.eventId,
            entity: event.entity,
            actor: event.actor,
            trigger: event.trigger,
            beforeAfterRequired: event.beforeAfterRequired,
            auditRequired: event.auditRequired,
            severity: event.severity,
            notification: event.notification,
            retention: event.retention,
            sortOrder: event.sortOrder,
          },
          update: {},
        });
      }

      for (const route of blueprint.routes) {
        await tx.routeDefinition.upsert({
          where: { code: route.code },
          create: {
            code: route.code,
            route: route.route,
            page: route.page,
            roles: json(route.roles),
            sidebar: route.sidebar,
            mobileNavigation: route.mobileNavigation,
            accessType: route.accessType,
            redirectIfForbidden: route.redirectIfForbidden,
            module: route.module,
            source: route.source,
            sortOrder: route.sortOrder,
          },
          update: {},
        });
      }

      for (const action of blueprint.actions) {
        await tx.actionDefinition.upsert({
          where: { code: action.code },
          create: {
            code: action.code,
            screen: action.screen,
            buttonLabel: action.buttonLabel,
            roles: json(action.roles),
            visibleWhen: action.visibleWhen,
            actionDescription: action.actionDescription,
            apiEffect: action.apiEffect,
            expectedResult: action.expectedResult,
            auditRequired: action.auditRequired,
            confirmationRequired: action.confirmationRequired,
            confirmationRule: action.confirmationRule,
            reasonRequired: action.reasonRequired,
            reasonRule: action.reasonRule,
            notification: action.notification,
            errorState: action.errorState,
            priority: action.priority,
            source: action.source,
            sortOrder: action.sortOrder,
          },
          update: {},
        });
      }

      for (const state of blueprint.screenStates) {
        await tx.screenStateDefinition.upsert({
          where: { code: state.code },
          create: {
            code: state.code,
            screen: state.screen,
            state: state.state,
            whatUserSees: state.whatUserSees,
            allowedActions: json(state.allowedActions),
            forbiddenActions: json(state.forbiddenActions),
            trigger: state.trigger,
            priority: state.priority,
            sortOrder: state.sortOrder,
          },
          update: {},
        });
      }

      for (const field of blueprint.formFields) {
        await tx.formFieldDefinition.upsert({
          where: {
            formCode_fieldCode: {
              formCode: field.formCode,
              fieldCode: field.fieldCode,
            },
          },
          create: {
            formCode: field.formCode,
            fieldCode: field.fieldCode,
            labelAr: field.labelAr,
            labelEn: field.labelEn,
            type: field.type,
            required: field.required,
            validation: field.validation,
            defaultValue: field.defaultValue,
            source: field.source,
            editableBy: json(field.editableBy),
            visibilityNote: field.visibilityNote,
            sortOrder: field.sortOrder,
          },
          update: {},
        });
      }

      for (const definition of blueprint.definitionOfDone) {
        await tx.definitionOfDone.upsert({
          where: { code: definition.code },
          create: {
            code: definition.code,
            feature: definition.feature,
            doneWhen: definition.doneWhen,
            priority: definition.priority,
            module: definition.module,
            sortOrder: definition.sortOrder,
          },
          update: {},
        });
      }

      for (const setting of blueprint.settings) {
        const stable = await tx.platformSetting.upsert({
          where: { key: setting.key },
          create: {
            key: setting.key,
            category: setting.category,
            valueType: setting.valueType,
            isSensitive: setting.isSensitive,
            sortOrder: setting.sortOrder,
          },
          update: {},
        });
        await tx.platformSettingRevision.upsert({
          where: {
            platformSettingId_version: {
              platformSettingId: stable.id,
              version: 1,
            },
          },
          create: {
            platformSettingId: stable.id,
            sourceBlueprintImportId: blueprintImport.id,
            version: 1,
            status: "ACTIVE",
            value: json(setting.value),
            effectiveFrom: new Date(blueprint.effectiveFrom),
            reason: setting.reason,
          },
          update: {},
        });
      }

      const translationRevision = await tx.translationRevision.upsert({
        where: { version: 1 },
        create: {
          sourceBlueprintImportId: blueprintImport.id,
          version: 1,
          status: "PUBLISHED",
          publishedAt: new Date(blueprint.effectiveFrom),
        },
        update: {},
      });
      for (const translation of blueprint.translations) {
        const key = await tx.translationKey.upsert({
          where: { key: translation.key },
          create: {
            key: translation.key,
            namespace: translation.namespace,
            description: translation.description,
            sortOrder: translation.sortOrder,
          },
          update: {},
        });
        for (const [locale, value] of Object.entries(translation.values)) {
          await tx.translationValue.upsert({
            where: {
              translationRevisionId_translationKeyId_locale: {
                translationRevisionId: translationRevision.id,
                translationKeyId: key.id,
                locale,
              },
            },
            create: {
              translationRevisionId: translationRevision.id,
              translationKeyId: key.id,
              locale,
              value,
            },
            update: {},
          });
        }
      }

      const status = warningCount > 0 ? "APPLIED_WITH_WARNINGS" : "APPLIED";
      await tx.blueprintImport.update({
        where: { id: blueprintImport.id },
        data: {
          status,
          appliedAt: new Date(),
        },
      });

      return {
        blueprintImportId: blueprintImport.id,
        status,
      } as const;
    },
    {
      maxWait: 10_000,
      timeout: 120_000,
    },
  );

  return {
    ...result,
    alreadyApplied: false,
    warningCount,
    errorCount,
    counts: {
      monthlyServices: blueprint.monthlyServices.length,
      monthlyServiceCategories: monthlyServiceCategoryCount,
      serviceItems: blueprint.serviceItems.length,
      oneTimeServices: blueprint.oneTimeServices.length,
      oneTimeServiceCategories: oneTimeServiceCategoryCount,
      workflows: blueprint.workflows.length,
      routes: blueprint.routes.length,
      actions: blueprint.actions.length,
    },
  };
}
