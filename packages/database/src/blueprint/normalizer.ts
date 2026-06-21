import { readFile } from "node:fs/promises";
import path from "node:path";

import { parseCsv } from "./csv.js";
import type {
  BlueprintManifest,
  NormalizedBlueprint,
  NormalizedIssue,
  NormalizedRecordStatus,
} from "./normalized-blueprint.js";
import { readXlsxWorkbook, type WorkbookRow, type WorkbookSheet } from "./xlsx-reader.js";

function sheetMap(sheets: WorkbookSheet[]): Map<string, WorkbookSheet> {
  return new Map(sheets.map((sheet) => [sheet.name, sheet]));
}

function rows(sheets: Map<string, WorkbookSheet>, sheetName: string): WorkbookRow[] {
  return sheets.get(sheetName)?.rows ?? [];
}

function split(value: string, separator = /[,/]+/): string[] {
  return value
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);
}

function slug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^\w]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();
}

function sentence(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function compactCode(value: string, index: number): string {
  return slug(value) || `ROW-${index + 1}`;
}

function parseStatus(value: string, activeFallback = true): NormalizedRecordStatus {
  const normalized = value.trim().toLowerCase();
  if (["archived", "archive"].includes(normalized)) {
    return "ARCHIVED";
  }
  if (["disabled", "inactive", "false", "no", "0"].includes(normalized)) {
    return "DISABLED";
  }
  return activeFallback ? "ACTIVE" : "DISABLED";
}

function bool(
  value: string,
  fallback: boolean,
  issue: (issue: NormalizedIssue) => void,
  context: Omit<NormalizedIssue, "severity" | "code" | "message" | "normalizedDefault">,
): boolean {
  const normalized = value.trim().toLowerCase();
  if (["yes", "true", "1", "required", "active"].includes(normalized)) {
    return true;
  }
  if (["no", "false", "0", "none", "inactive", ""].includes(normalized)) {
    return normalized === "" ? fallback : false;
  }

  issue({
    severity: "WARNING",
    code: "UNRECOGNIZED_BOOLEAN",
    ...context,
    message: `Unrecognized boolean value "${value}" was normalized safely.`,
    normalizedDefault: fallback,
  });
  return fallback;
}

function conditionalBool(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return !["", "no", "false", "0", "none"].includes(normalized);
}

function numberValue(
  value: string,
  fallback: number,
  issue: (issue: NormalizedIssue) => void,
  context: Omit<NormalizedIssue, "severity" | "code" | "message" | "normalizedDefault">,
): number {
  const parsed = Number(value.replace(/,/g, "").trim());
  if (Number.isFinite(parsed)) {
    return parsed;
  }

  issue({
    severity: "WARNING",
    code: "INVALID_NUMBER",
    ...context,
    message: `Invalid numeric value "${value}" was normalized safely.`,
    normalizedDefault: fallback,
  });
  return fallback;
}

function mergeByCode<T>(primary: T[], additions: T[], code: (item: T) => string): T[] {
  const merged = new Map(primary.map((item) => [code(item), item]));
  for (const item of additions) {
    merged.set(code(item), item);
  }
  return [...merged.values()];
}

function translation(
  key: string,
  namespace: string,
  description: string,
  sortOrder: number,
  ar: string,
  en: string,
): NormalizedBlueprint["translations"][number] {
  return {
    key,
    namespace,
    description,
    sortOrder,
    values: { ar: ar || en, en: en || ar },
  };
}

export async function normalizeBlueprint(blueprintDirectory: string): Promise<NormalizedBlueprint> {
  const manifestPath = path.join(blueprintDirectory, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as BlueprintManifest;
  const workbook = await readXlsxWorkbook(path.join(blueprintDirectory, manifest.sourceFile));
  const sheets = sheetMap(workbook.sheets);
  const issues: NormalizedIssue[] = [];
  const issue = (value: NormalizedIssue): void => {
    issues.push(value);
  };

  if (workbook.sha256.toLowerCase() !== manifest.sha256.toLowerCase()) {
    issue({
      severity: "ERROR",
      code: "BLUEPRINT_SHA256_MISMATCH",
      sheetName: null,
      rowReference: null,
      entityCode: manifest.blueprintCode,
      message: "Workbook SHA-256 does not match the checked-in blueprint manifest.",
      normalizedDefault: null,
    });
  }

  for (const requiredSheet of manifest.requiredSheets) {
    if (!sheets.has(requiredSheet)) {
      issue({
        severity: "ERROR",
        code: "REQUIRED_SHEET_MISSING",
        sheetName: requiredSheet,
        rowReference: null,
        entityCode: null,
        message: `Required blueprint sheet ${requiredSheet} is missing.`,
        normalizedDefault: null,
      });
    }
  }

  const roleRows = rows(sheets, "07_User_Types");
  const roles: NormalizedBlueprint["roles"] = roleRows.map((row, index) => ({
    code: row.role_code || `ROLE-${compactCode(row.role_name ?? "", index)}`,
    name: row.role_name || row.role_code,
    userType: row.user_type.trim().toLowerCase() === "external" ? "EXTERNAL" : "INTERNAL",
    description: row.description,
    dataScope: row.data_scope,
    capabilities: row.main_capabilities,
    restrictions: row.restrictions,
    sortOrder: index,
  }));
  const roleCodeByName = new Map(roles.map((role) => [role.name.toLowerCase(), role.code]));

  const permissions: NormalizedBlueprint["permissions"] = rows(sheets, "09_Permission_Matrix").map(
    (row, index) => {
      const capability = row.capability || `Capability ${index + 1}`;
      return {
        code: `PERM-${compactCode(capability, index)}`,
        name: capability,
        module: "Blueprint",
        action: slug(capability).toLowerCase().replace(/-/g, "_"),
        description: capability,
        sortOrder: index,
        roleCodes: roles
          .filter((role) => row[role.name]?.trim().toLowerCase() === "yes")
          .map((role) => role.code),
      };
    },
  );

  const serviceLevels: NormalizedBlueprint["serviceLevels"] = rows(sheets, "15_Service_Levels").map(
    (row, index) => ({
      code: row.level_code || `Level-${index + 1}`,
      labelAr: row.label_ar || row.level_code,
      labelEn: row.level_code,
      purpose: row.purpose,
      hoursSource: row.hours_source,
      slaRule: row.sla_rule,
      scopeRule: row.scope_rule,
      governanceRule: row.governance_rule,
      isCustom: row.level_code.trim().toLowerCase() === "custom",
      sortOrder: index,
    }),
  );
  const levelCodes = serviceLevels.map((level) => level.code);

  const displayMap = new Map(
    rows(sheets, "54_Service_Card_Display_Map").map((row) => [row.service_code, row]),
  );
  const packageSummary = rows(sheets, "55_Package_Level_Summary");
  const summaryByService = new Map<string, WorkbookRow[]>();
  for (const row of packageSummary) {
    const current = summaryByService.get(row.service_code) ?? [];
    current.push(row);
    summaryByService.set(row.service_code, current);
  }

  const monthlyServices: NormalizedBlueprint["monthlyServices"] = rows(
    sheets,
    "12_Monthly_Services",
  ).map((row, index) => {
    const code = row.service_code || `MS-${index + 1}`;
    const cardRow = displayMap.get(code);
    return {
      code,
      externalId: row.service_id || null,
      status: parseStatus(row.active),
      sortOrder: index,
      nameAr: row.name_ar || row.name_en || code,
      nameEn: row.name_en || row.name_ar || code,
      paymentType: row.payment_type || "Monthly",
      serviceLine: row.service_line || "Operate",
      domain: row.domain || "General",
      description: row.description || row.name_en || code,
      visibleInPricing: bool(row.visible_in_pricing, true, issue, {
        sheetName: "12_Monthly_Services",
        rowReference: String(index + 1),
        entityCode: code,
      }),
      sellingHourlyRateSar: numberValue(row.selling_hourly_rate_sar, 0, issue, {
        sheetName: "12_Monthly_Services",
        rowReference: String(index + 1),
        entityCode: code,
      }),
      internalHourlyCostSar: numberValue(row.internal_hourly_cost_sar, 0, issue, {
        sheetName: "12_Monthly_Services",
        rowReference: String(index + 1),
        entityCode: code,
      }),
      setupFeePct: numberValue(row.setup_fee_pct, 0, issue, {
        sheetName: "12_Monthly_Services",
        rowReference: String(index + 1),
        entityCode: code,
      }),
      defaultSlaHours: numberValue(row.default_sla_hours, 48, issue, {
        sheetName: "12_Monthly_Services",
        rowReference: String(index + 1),
        entityCode: code,
      }),
      deductHours: bool(row.deduct_hours, true, issue, {
        sheetName: "12_Monthly_Services",
        rowReference: String(index + 1),
        entityCode: code,
      }),
      requiresSupervisor: bool(row.requires_supervisor, false, issue, {
        sheetName: "12_Monthly_Services",
        rowReference: String(index + 1),
        entityCode: code,
      }),
      requiresManagement: bool(row.requires_management, false, issue, {
        sheetName: "12_Monthly_Services",
        rowReference: String(index + 1),
        entityCode: code,
      }),
      clientApprovalRequired: bool(row.client_approval_required, false, issue, {
        sheetName: "12_Monthly_Services",
        rowReference: String(index + 1),
        entityCode: code,
      }),
      cardConfiguration: {
        usedIn: cardRow?.used_in ?? "",
        cardFields: split(cardRow?.card_fields ?? ""),
        levelControl: cardRow?.level_control ?? "",
        itemsRenderingLogic: cardRow?.items_rendering_logic ?? "",
        emptyStateRule: cardRow?.empty_state_rule ?? "",
        mobileRule: cardRow?.mobile_rule ?? "",
        packageSummary: summaryByService.get(code) ?? [],
      },
      levelConfigs: serviceLevels.map((level, levelIndex) => ({
        serviceLevelCode: level.code,
        hours: numberValue(row[`${level.code.toLowerCase()}_hours`] ?? "", 0, issue, {
          sheetName: "12_Monthly_Services",
          rowReference: String(index + 1),
          entityCode: code,
        }),
        isEnabled: level.code !== "Custom",
        sortOrder: levelIndex,
      })),
    };
  });

  const monthlyByCode = new Map(monthlyServices.map((service) => [service.code, service]));
  const compactItems = new Map(rows(sheets, "13_Service_Items").map((row) => [row.item_code, row]));
  const matrixRows = rows(sheets, "53_Service_Item_Level_Matrix");
  const allItemCodes = [
    ...new Set([...matrixRows.map((row) => row.item_code), ...compactItems.keys()]),
  ].filter(Boolean);
  const matrixByCode = new Map(matrixRows.map((row) => [row.item_code, row]));
  const serviceItems: NormalizedBlueprint["serviceItems"] = allItemCodes.map((code, index) => {
    const matrix = matrixByCode.get(code);
    const compact = compactItems.get(code);
    const serviceCode =
      matrix?.service_code || compact?.service_code || `MS-UNASSIGNED-${index + 1}`;

    if (!monthlyByCode.has(serviceCode)) {
      const placeholder: NormalizedBlueprint["monthlyServices"][number] = {
        code: serviceCode,
        externalId: null,
        status: "DISABLED",
        sortOrder: monthlyServices.length,
        nameAr: matrix?.service_name_ar || serviceCode,
        nameEn: matrix?.service_name_en || serviceCode,
        paymentType: "Monthly",
        serviceLine: "Operate",
        domain: "Unassigned",
        description: "Placeholder preserved from an unmatched service item.",
        visibleInPricing: false,
        sellingHourlyRateSar: 0,
        internalHourlyCostSar: 0,
        setupFeePct: 0,
        defaultSlaHours: 48,
        deductHours: true,
        requiresSupervisor: false,
        requiresManagement: false,
        clientApprovalRequired: false,
        cardConfiguration: {},
        levelConfigs: serviceLevels.map((level, levelIndex) => ({
          serviceLevelCode: level.code,
          hours: 0,
          isEnabled: false,
          sortOrder: levelIndex,
        })),
      };
      monthlyServices.push(placeholder);
      monthlyByCode.set(serviceCode, placeholder);
      issue({
        severity: "WARNING",
        code: "SERVICE_ITEM_PARENT_MISSING",
        sheetName: matrix ? "53_Service_Item_Level_Matrix" : "13_Service_Items",
        rowReference: String(index + 1),
        entityCode: code,
        message: `Service item ${code} referenced missing monthly service ${serviceCode}; a disabled editable placeholder was preserved.`,
        normalizedDefault: { serviceCode, status: "DISABLED" },
      });
    }

    const compactLevels = new Set(
      split(compact?.included_levels ?? "").map((level) => level.toLowerCase()),
    );
    return {
      code,
      serviceCode,
      status: parseStatus(matrix?.status ?? "Active"),
      sortOrder: index,
      nameAr:
        matrix?.item_name_ar ||
        compact?.item_name_ar ||
        matrix?.item_name_en ||
        compact?.item_name_en ||
        code,
      nameEn:
        matrix?.item_name_en ||
        compact?.item_name_en ||
        matrix?.item_name_ar ||
        compact?.item_name_ar ||
        code,
      expectedOutput: matrix?.expected_output || compact?.expected_output || "",
      visibleInQuote: bool(
        matrix?.visible_in_quote ?? compact?.visible_in_quote ?? "",
        true,
        issue,
        {
          sheetName: matrix ? "53_Service_Item_Level_Matrix" : "13_Service_Items",
          rowReference: String(index + 1),
          entityCode: code,
        },
      ),
      requiresFile: bool(matrix?.requires_file ?? compact?.requires_file ?? "", false, issue, {
        sheetName: matrix ? "53_Service_Item_Level_Matrix" : "13_Service_Items",
        rowReference: String(index + 1),
        entityCode: code,
      }),
      deductHours: bool(matrix?.deduct_hours ?? compact?.deduct_hours ?? "", true, issue, {
        sheetName: matrix ? "53_Service_Item_Level_Matrix" : "13_Service_Items",
        rowReference: String(index + 1),
        entityCode: code,
      }),
      requestType: matrix?.request_type || "General service request",
      levelInclusions: serviceLevels.map((level, levelIndex) => ({
        serviceLevelCode: level.code,
        included: matrix
          ? bool(matrix[level.code.toLowerCase()] ?? "", false, issue, {
              sheetName: "53_Service_Item_Level_Matrix",
              rowReference: String(index + 1),
              entityCode: code,
            })
          : compactLevels.has(level.code.toLowerCase()),
        sortOrder: levelIndex,
      })),
    };
  });

  for (const [index, summary] of packageSummary.entries()) {
    const expected = numberValue(summary.item_count, 0, issue, {
      sheetName: "55_Package_Level_Summary",
      rowReference: String(index + 1),
      entityCode: summary.service_code,
    });
    const actual = serviceItems.filter(
      (item) =>
        item.serviceCode === summary.service_code &&
        item.levelInclusions.some(
          (level) =>
            level.serviceLevelCode.toLowerCase() === summary.level.toLowerCase() && level.included,
        ),
    ).length;
    if (expected !== actual) {
      issue({
        severity: "WARNING",
        code: "PACKAGE_SUMMARY_COUNT_MISMATCH",
        sheetName: "55_Package_Level_Summary",
        rowReference: String(index + 1),
        entityCode: summary.service_code,
        message: `Package summary says ${expected} items for ${summary.level}; normalized matrix contains ${actual}. The item-level matrix remains canonical.`,
        normalizedDefault: actual,
      });
    }
  }

  const oneTimeServices: NormalizedBlueprint["oneTimeServices"] = rows(
    sheets,
    "14_One_Time_Services",
  ).map((row, index) => {
    const code = row.service_code || `OT-${index + 1}`;
    return {
      code,
      serviceLine: row.service_line || "Build",
      status: parseStatus(row.active),
      sortOrder: index,
      nameAr: row.name_ar || row.name_en || code,
      nameEn: row.name_en || row.name_ar || code,
      paymentType: row.payment_type || "One-Time",
      basePriceSar: numberValue(row.base_price_sar, 0, issue, {
        sheetName: "14_One_Time_Services",
        rowReference: String(index + 1),
        entityCode: code,
      }),
      estimatedHours: numberValue(row.estimated_hours, 0, issue, {
        sheetName: "14_One_Time_Services",
        rowReference: String(index + 1),
        entityCode: code,
      }),
      durationDays: numberValue(row.duration_days, 0, issue, {
        sheetName: "14_One_Time_Services",
        rowReference: String(index + 1),
        entityCode: code,
      }),
      visibleInPricing: bool(row.visible_in_pricing, true, issue, {
        sheetName: "14_One_Time_Services",
        rowReference: String(index + 1),
        entityCode: code,
      }),
      createsProject: bool(row.creates_project, true, issue, {
        sheetName: "14_One_Time_Services",
        rowReference: String(index + 1),
        entityCode: code,
      }),
      description: row.description || row.name_en || code,
      phases: split(row.default_phases, /\|/).map((name, phaseIndex) => ({
        code: `PHASE-${String(phaseIndex + 1).padStart(2, "0")}-${compactCode(name, phaseIndex)}`,
        nameEn: name,
        sortOrder: phaseIndex,
      })),
      deliverables: split(row.deliverables, /\|/).map((name, deliverableIndex) => ({
        code: `DEL-${String(deliverableIndex + 1).padStart(2, "0")}-${compactCode(name, deliverableIndex)}`,
        nameEn: name,
        sortOrder: deliverableIndex,
      })),
    };
  });

  const pricingRules: NormalizedBlueprint["pricingRules"] = rows(sheets, "16_Pricing_Rules").map(
    (row, index) => ({
      code: row.rule_code || `PR-${index + 1}`,
      name: row.rule_name || row.rule_code,
      formulaOrRule: row.formula_or_rule,
      appliesTo: row.applies_to,
      implementationOwner: row.implementation_owner,
      visibility: row.visibility,
      sortOrder: index,
    }),
  );

  const validationRules: NormalizedBlueprint["validationRules"] = rows(
    sheets,
    "41_Validation_Rules",
  ).map((row, index) => ({
    code: row.validation_id || `VAL-${index + 1}`,
    entity: row.entity || "Unknown",
    field: row.field || "unknown",
    rule: row.rule,
    errorMessageAr: row.error_message_ar || row.rule,
    errorMessageEn: `Validation failed: ${row.rule}`,
    enforcedIn: row.enforced_in || "Backend",
    failureBehavior: row.failure_behavior || "Block save",
    sortOrder: index,
  }));

  const workflowRows = rows(sheets, "18_Workflows");
  const workflowCodes = [...new Set(workflowRows.map((row) => row.workflow_id))];
  const workflows: NormalizedBlueprint["workflows"] = workflowCodes.map((code, workflowIndex) => {
    const sourceRows = workflowRows.filter((row) => row.workflow_id === code);
    const stateCodes = [
      ...new Set(sourceRows.flatMap((row) => [row.from_state, row.to_state]).filter(Boolean)),
    ];
    const outgoing = new Set(sourceRows.map((row) => row.from_state));
    const initialCode = sourceRows[0]?.from_state ?? stateCodes[0] ?? "NEW";
    return {
      code,
      name: sourceRows[0]?.workflow || code,
      type: sourceRows[0]?.workflow.trim().toLowerCase() === "project" ? "PROJECT" : "REQUEST",
      sortOrder: workflowIndex,
      states: stateCodes.map((stateCode, stateIndex) => ({
        code: stateCode,
        labelEn: sentence(stateCode),
        isInitial: stateCode === initialCode,
        isTerminal: !outgoing.has(stateCode),
        sortOrder: stateIndex,
      })),
      transitions: sourceRows.map((row, transitionIndex) => ({
        code: `${code}-TR-${String(transitionIndex + 1).padStart(2, "0")}`,
        fromStateCode: row.from_state,
        toStateCode: row.to_state,
        actorRoles: split(row.actor),
        condition: row.condition,
        sideEffect: row.side_effect,
        sortOrder: transitionIndex,
      })),
    };
  });

  for (const workflow of workflows) {
    const initial = workflow.states.find((state) => state.isInitial)?.code;
    const reachable = new Set(initial ? [initial] : []);
    let changed = true;
    while (changed) {
      changed = false;
      for (const transition of workflow.transitions) {
        if (reachable.has(transition.fromStateCode) && !reachable.has(transition.toStateCode)) {
          reachable.add(transition.toStateCode);
          changed = true;
        }
      }
    }
    for (const state of workflow.states) {
      if (!reachable.has(state.code)) {
        issue({
          severity: "WARNING",
          code: "WORKFLOW_STATE_DISCONNECTED",
          sheetName: "18_Workflows",
          rowReference: null,
          entityCode: `${workflow.code}:${state.code}`,
          message: "Workflow state is disconnected but was preserved for Admin review.",
          normalizedDefault: null,
        });
      }
    }
  }

  const pdfRows = rows(sheets, "19_Documents_PDF");
  const mappingRows = rows(sheets, "42_PDF_Field_Mapping");
  const pdfTemplates: NormalizedBlueprint["pdfTemplates"] = pdfRows.map((row, index) => {
    const code = row.doc_code || `DOC-${index + 1}`;
    const suffix = code.replace(/^DOC-/, "");
    return {
      code,
      name: row.document || code,
      documentType: suffix,
      audience: row.audience,
      mustInclude: split(row.must_include),
      mustExclude: split(row.must_exclude),
      languageDirection: row.language_direction,
      technicalRule: row.technical_rule,
      sortOrder: index,
      fieldMappings: mappingRows
        .filter((mapping) => mapping.pdf.replace(/^PDF-/, "") === suffix)
        .map((mapping, mappingIndex) => ({
          section: mapping.section,
          field: mapping.field,
          source: mapping.source,
          showClient: bool(mapping.show_client, false, issue, {
            sheetName: "42_PDF_Field_Mapping",
            rowReference: String(mappingIndex + 1),
            entityCode: code,
          }),
          showInternal: bool(mapping.show_internal, false, issue, {
            sheetName: "42_PDF_Field_Mapping",
            rowReference: String(mappingIndex + 1),
            entityCode: code,
          }),
          forbidden: bool(mapping.forbidden, false, issue, {
            sheetName: "42_PDF_Field_Mapping",
            rowReference: String(mappingIndex + 1),
            entityCode: code,
          }),
          documentScope: mapping.document_scope,
          notes: mapping.notes,
          sortOrder: mappingIndex,
        })),
    };
  });

  const notificationDefinitions = new Map(
    rows(sheets, "20_Notifications").map((row) => [row.event, row]),
  );
  const notificationMessages = new Map(
    rows(sheets, "44_Notification_Templates").map((row) => [row.event, row]),
  );
  const notificationEvents = [
    ...new Set([...notificationDefinitions.keys(), ...notificationMessages.keys()]),
  ];
  const notificationTemplates: NormalizedBlueprint["notificationTemplates"] =
    notificationEvents.map((event, index) => {
      const definition = notificationDefinitions.get(event);
      const template = notificationMessages.get(event);
      const description = definition?.description || sentence(event);
      return {
        code:
          template?.template_id ||
          definition?.notification_code ||
          `NTF-${String(index + 1).padStart(3, "0")}`,
        event,
        recipients: split(template?.recipient || definition?.recipients || ""),
        messageAr: template?.message_ar || description,
        messageEn: template?.message_en || description,
        description,
        deepLink: template?.deep_link || definition?.deep_link_target || "/notifications",
        channels: split(template?.channel || definition?.channel || "Platform", /\+/),
        cadence: template?.cadence || "Immediate",
        reminderRule: template?.reminder_rule || "No",
        sortOrder: index,
      };
    });

  const severityMap = {
    low: "LOW",
    medium: "MEDIUM",
    high: "HIGH",
    critical: "CRITICAL",
  } as const;
  const auditEvents: NormalizedBlueprint["auditEvents"] = rows(sheets, "43_Audit_Events").map(
    (row, index) => ({
      eventId: row.event_id || `AUD-${index + 1}`,
      code: row.event_code || `AUDIT_EVENT_${index + 1}`,
      entity: row.entity,
      actor: row.actor,
      trigger: row.trigger,
      beforeAfterRequired: bool(row.before_after_required, false, issue, {
        sheetName: "43_Audit_Events",
        rowReference: String(index + 1),
        entityCode: row.event_code,
      }),
      auditRequired: bool(row.audit_required, true, issue, {
        sheetName: "43_Audit_Events",
        rowReference: String(index + 1),
        entityCode: row.event_code,
      }),
      severity:
        severityMap[row.severity.trim().toLowerCase() as keyof typeof severityMap] ?? "MEDIUM",
      notification: row.notification,
      retention: row.retention,
      sortOrder: index,
    }),
  );

  const routeCsv = parseCsv(
    await readFile(path.join(blueprintDirectory, manifest.additions.routes), "utf8"),
  );
  const routeRows: Array<WorkbookRow & { source: string }> = [
    ...rows(sheets, "38_Navigation_Routing").map((row) => ({
      ...row,
      source: "EXCEL_V3",
    })),
    ...routeCsv.map(
      (row) =>
        ({ ...row, source: "PR2_CONTROL_UPDATE" }) as WorkbookRow & {
          source: string;
        },
    ),
  ];
  const routes: NormalizedBlueprint["routes"] = mergeByCode(
    [],
    routeRows.map((row, index) => ({
      code: row.route_id,
      route: row.route,
      page: row.page,
      roles: split(row.roles),
      sidebar: row.sidebar,
      mobileNavigation: row.mobile_nav,
      accessType: row.access_type,
      redirectIfForbidden: row.redirect_if_forbidden,
      module: row.module,
      source: row.source,
      sortOrder: index,
    })),
    (route) => route.code,
  );

  const actionCsv = parseCsv(
    await readFile(path.join(blueprintDirectory, manifest.additions.actions), "utf8"),
  );
  const actionRows: Array<WorkbookRow & { source: string }> = [
    ...rows(sheets, "36_Button_Action_Matrix").map((row) => ({
      ...row,
      source: "EXCEL_V3",
    })),
    ...actionCsv.map(
      (row) =>
        ({ ...row, source: "PR2_CONTROL_UPDATE" }) as WorkbookRow & {
          source: string;
        },
    ),
  ];
  const actions: NormalizedBlueprint["actions"] = mergeByCode(
    [],
    actionRows.map((row, index) => ({
      code: row.action_id,
      screen: row.screen,
      buttonLabel: row.button_label,
      roles: split(row.roles),
      visibleWhen: row.visible_when,
      actionDescription: row.action_description,
      apiEffect: row.api,
      expectedResult: row.expected_result,
      auditRequired: bool(row.audit_required, false, issue, {
        sheetName: "36_Button_Action_Matrix",
        rowReference: String(index + 1),
        entityCode: row.action_id,
      }),
      confirmationRequired: conditionalBool(row.confirmation_required),
      confirmationRule: row.confirmation_required,
      reasonRequired: conditionalBool(row.reason_required),
      reasonRule: row.reason_required,
      notification: row.notification,
      errorState: row.error_state,
      priority: row.priority,
      source: row.source,
      sortOrder: index,
    })),
    (action) => action.code,
  );

  const screenStates: NormalizedBlueprint["screenStates"] = rows(
    sheets,
    "37_Screen_State_Matrix",
  ).map((row, index) => ({
    code: row.state_id || `STATE-${index + 1}`,
    screen: row.screen,
    state: row.state,
    whatUserSees: row.what_user_sees,
    allowedActions: split(row.allowed_actions),
    forbiddenActions: split(row.forbidden_actions),
    trigger: row.trigger,
    priority: row.priority,
    sortOrder: index,
  }));

  const formFields: NormalizedBlueprint["formFields"] = rows(sheets, "40_Form_Fields").map(
    (row, index) => ({
      formCode: row.form,
      fieldCode: row.field,
      labelAr: row.label_ar || row.label_en || row.field,
      labelEn: row.label_en || row.label_ar || row.field,
      type: row.type,
      required: bool(row.required, false, issue, {
        sheetName: "40_Form_Fields",
        rowReference: String(index + 1),
        entityCode: `${row.form}:${row.field}`,
      }),
      validation: row.validation,
      defaultValue: row.default || null,
      source: row.source,
      editableBy: split(row.editable_by),
      visibilityNote: row.visibility_note,
      sortOrder: index,
    }),
  );

  const definitionOfDone: NormalizedBlueprint["definitionOfDone"] = rows(
    sheets,
    "48_Definition_of_Done",
  ).map((row, index) => ({
    code: row.dod_id || `DOD-${index + 1}`,
    feature: row.feature,
    doneWhen: row.done_when,
    priority: row.priority,
    module: row.module,
    sortOrder: index,
  }));

  const localizationPolicies = rows(sheets, "24_Localization");
  const settings: NormalizedBlueprint["settings"] = [
    {
      key: "localization.supported_locales",
      category: "localization",
      valueType: "JSON",
      isSensitive: false,
      value: ["ar", "en"],
      reason: "Excel V3 localization requirements",
      sortOrder: 0,
    },
    {
      key: "localization.default_locale",
      category: "localization",
      valueType: "STRING",
      isSensitive: false,
      value: "ar",
      reason: "Arabic-first bilingual platform baseline",
      sortOrder: 1,
    },
    {
      key: "pricing.currency",
      category: "pricing",
      valueType: "STRING",
      isSensitive: false,
      value: "SAR",
      reason: "Excel V3 pricing and localization requirements",
      sortOrder: 2,
    },
    {
      key: "tax.enabled",
      category: "tax",
      valueType: "BOOLEAN",
      isSensitive: false,
      value: false,
      reason: "Excel V3 no-VAT decision and PDF exclusions",
      sortOrder: 3,
    },
    {
      key: "payment.iban",
      category: "payment",
      valueType: "STRING",
      isSensitive: false,
      value: "",
      reason: "Editable placeholder referenced by the invoice PDF mapping",
      sortOrder: 4,
    },
    {
      key: "branding.primary_color",
      category: "branding",
      valueType: "STRING",
      isSensitive: false,
      value: "",
      reason: "Editable placeholder requested by Excel V3 seed requirements",
      sortOrder: 5,
    },
    {
      key: "company.commercial_registration",
      category: "company",
      valueType: "STRING",
      isSensitive: false,
      value: "",
      reason: "Editable non-secret company setting placeholder",
      sortOrder: 6,
    },
    {
      key: "blueprint.localization_policies",
      category: "blueprint",
      valueType: "JSON",
      isSensitive: false,
      value: localizationPolicies,
      reason: "Preserved Excel V3 localization policy rows",
      sortOrder: 7,
    },
    {
      key: "catalog.service_card_system",
      category: "catalog",
      valueType: "JSON",
      isSensitive: false,
      value: rows(sheets, "51_Service_Card_System"),
      reason: "Preserved Excel V3 service-card configuration rules",
      sortOrder: 8,
    },
    {
      key: "ui.anti_random_rules",
      category: "ui",
      valueType: "JSON",
      isSensitive: false,
      value: rows(sheets, "49_Anti_Random_UI_Rules"),
      reason: "Preserved Excel V3 UI governance rules",
      sortOrder: 9,
    },
  ];

  const translations: NormalizedBlueprint["translations"] = [];
  monthlyServices.forEach((service, index) => {
    translations.push(
      translation(
        `service.monthly.${service.code}.name`,
        "service.monthly",
        `Monthly service ${service.code}`,
        index,
        service.nameAr,
        service.nameEn,
      ),
    );
  });
  serviceItems.forEach((item, index) => {
    translations.push(
      translation(
        `service.item.${item.code}.name`,
        "service.item",
        `Service item ${item.code}`,
        index,
        item.nameAr,
        item.nameEn,
      ),
    );
  });
  oneTimeServices.forEach((service, index) => {
    translations.push(
      translation(
        `service.one_time.${service.code}.name`,
        "service.one_time",
        `One-time service ${service.code}`,
        index,
        service.nameAr,
        service.nameEn,
      ),
    );
  });
  serviceLevels.forEach((level, index) => {
    translations.push(
      translation(
        `service.level.${level.code}.label`,
        "service.level",
        `Service level ${level.code}`,
        index,
        level.labelAr,
        level.labelEn,
      ),
    );
  });
  formFields.forEach((field, index) => {
    translations.push(
      translation(
        `form.${field.formCode}.${field.fieldCode}.label`,
        "form",
        `Form field ${field.formCode}.${field.fieldCode}`,
        index,
        field.labelAr,
        field.labelEn,
      ),
    );
  });

  if (roleCodeByName.size !== roles.length) {
    issue({
      severity: "WARNING",
      code: "DUPLICATE_ROLE_NAME",
      sheetName: "07_User_Types",
      rowReference: null,
      entityCode: null,
      message: "Duplicate role names were found; role codes remain canonical.",
      normalizedDefault: null,
    });
  }
  if (levelCodes.length !== new Set(levelCodes).size) {
    issue({
      severity: "ERROR",
      code: "DUPLICATE_SERVICE_LEVEL_CODE",
      sheetName: "15_Service_Levels",
      rowReference: null,
      entityCode: null,
      message: "Service level codes must be unique.",
      normalizedDefault: null,
    });
  }

  return {
    manifest,
    workbook,
    effectiveFrom: `${manifest.createdDate}T00:00:00.000Z`,
    issues,
    roles,
    permissions,
    serviceLevels,
    monthlyServices,
    serviceItems,
    oneTimeServices,
    pricingRules,
    validationRules,
    workflows,
    pdfTemplates,
    notificationTemplates,
    auditEvents,
    routes,
    actions,
    screenStates,
    formFields,
    definitionOfDone,
    settings,
    translations,
  };
}
