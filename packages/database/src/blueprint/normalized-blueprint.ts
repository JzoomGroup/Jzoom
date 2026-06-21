import type { WorkbookSnapshot } from "./xlsx-reader.js";

export type NormalizedRecordStatus = "ACTIVE" | "DISABLED" | "ARCHIVED";

export interface BlueprintManifest {
  blueprintCode: string;
  version: string;
  sourceFile: string;
  sha256: string;
  createdDate: string;
  requiredSheets: string[];
  additions: {
    routes: string;
    actions: string;
  };
}

export interface NormalizedIssue {
  severity: "INFO" | "WARNING" | "ERROR";
  code: string;
  sheetName: string | null;
  rowReference: string | null;
  entityCode: string | null;
  message: string;
  normalizedDefault: unknown | null;
}

export interface NormalizedBlueprint {
  manifest: BlueprintManifest;
  workbook: WorkbookSnapshot;
  effectiveFrom: string;
  issues: NormalizedIssue[];
  roles: Array<{
    code: string;
    name: string;
    userType: "INTERNAL" | "EXTERNAL";
    description: string;
    dataScope: string;
    capabilities: string;
    restrictions: string;
    sortOrder: number;
  }>;
  permissions: Array<{
    code: string;
    name: string;
    module: string;
    action: string;
    description: string;
    sortOrder: number;
    roleCodes: string[];
  }>;
  serviceLevels: Array<{
    code: string;
    labelAr: string;
    labelEn: string;
    purpose: string;
    hoursSource: string;
    slaRule: string;
    scopeRule: string;
    governanceRule: string;
    isCustom: boolean;
    sortOrder: number;
  }>;
  monthlyServices: Array<{
    code: string;
    externalId: string | null;
    status: NormalizedRecordStatus;
    sortOrder: number;
    nameAr: string;
    nameEn: string;
    paymentType: string;
    serviceLine: string;
    domain: string;
    description: string;
    visibleInPricing: boolean;
    sellingHourlyRateSar: number;
    internalHourlyCostSar: number;
    setupFeePct: number;
    defaultSlaHours: number;
    deductHours: boolean;
    requiresSupervisor: boolean;
    requiresManagement: boolean;
    clientApprovalRequired: boolean;
    cardConfiguration: Record<string, unknown>;
    levelConfigs: Array<{
      serviceLevelCode: string;
      hours: number;
      isEnabled: boolean;
      sortOrder: number;
    }>;
  }>;
  serviceItems: Array<{
    code: string;
    serviceCode: string;
    status: NormalizedRecordStatus;
    sortOrder: number;
    nameAr: string;
    nameEn: string;
    expectedOutput: string;
    visibleInQuote: boolean;
    requiresFile: boolean;
    deductHours: boolean;
    requestType: string;
    levelInclusions: Array<{
      serviceLevelCode: string;
      included: boolean;
      sortOrder: number;
    }>;
  }>;
  oneTimeServices: Array<{
    code: string;
    serviceLine: string;
    status: NormalizedRecordStatus;
    sortOrder: number;
    nameAr: string;
    nameEn: string;
    paymentType: string;
    basePriceSar: number;
    estimatedHours: number;
    durationDays: number;
    visibleInPricing: boolean;
    createsProject: boolean;
    description: string;
    phases: Array<{ code: string; nameEn: string; sortOrder: number }>;
    deliverables: Array<{ code: string; nameEn: string; sortOrder: number }>;
  }>;
  pricingRules: Array<{
    code: string;
    name: string;
    formulaOrRule: string;
    appliesTo: string;
    implementationOwner: string;
    visibility: string;
    sortOrder: number;
  }>;
  validationRules: Array<{
    code: string;
    entity: string;
    field: string;
    rule: string;
    errorMessageAr: string;
    errorMessageEn: string;
    enforcedIn: string;
    failureBehavior: string;
    sortOrder: number;
  }>;
  workflows: Array<{
    code: string;
    name: string;
    type: "REQUEST" | "PROJECT";
    sortOrder: number;
    states: Array<{
      code: string;
      labelEn: string;
      isInitial: boolean;
      isTerminal: boolean;
      sortOrder: number;
    }>;
    transitions: Array<{
      code: string;
      fromStateCode: string;
      toStateCode: string;
      actorRoles: string[];
      condition: string;
      sideEffect: string;
      sortOrder: number;
    }>;
  }>;
  pdfTemplates: Array<{
    code: string;
    name: string;
    documentType: string;
    audience: string;
    mustInclude: string[];
    mustExclude: string[];
    languageDirection: string;
    technicalRule: string;
    sortOrder: number;
    fieldMappings: Array<{
      section: string;
      field: string;
      source: string;
      showClient: boolean;
      showInternal: boolean;
      forbidden: boolean;
      documentScope: string;
      notes: string;
      sortOrder: number;
    }>;
  }>;
  notificationTemplates: Array<{
    code: string;
    event: string;
    recipients: string[];
    messageAr: string;
    messageEn: string;
    description: string;
    deepLink: string;
    channels: string[];
    cadence: string;
    reminderRule: string;
    sortOrder: number;
  }>;
  auditEvents: Array<{
    eventId: string;
    code: string;
    entity: string;
    actor: string;
    trigger: string;
    beforeAfterRequired: boolean;
    auditRequired: boolean;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    notification: string;
    retention: string;
    sortOrder: number;
  }>;
  routes: Array<{
    code: string;
    route: string;
    page: string;
    roles: string[];
    sidebar: string;
    mobileNavigation: string;
    accessType: string;
    redirectIfForbidden: string;
    module: string;
    source: string;
    sortOrder: number;
  }>;
  actions: Array<{
    code: string;
    screen: string;
    buttonLabel: string;
    roles: string[];
    visibleWhen: string;
    actionDescription: string;
    apiEffect: string;
    expectedResult: string;
    auditRequired: boolean;
    confirmationRequired: boolean;
    confirmationRule: string;
    reasonRequired: boolean;
    reasonRule: string;
    notification: string;
    errorState: string;
    priority: string;
    source: string;
    sortOrder: number;
  }>;
  screenStates: Array<{
    code: string;
    screen: string;
    state: string;
    whatUserSees: string;
    allowedActions: string[];
    forbiddenActions: string[];
    trigger: string;
    priority: string;
    sortOrder: number;
  }>;
  formFields: Array<{
    formCode: string;
    fieldCode: string;
    labelAr: string;
    labelEn: string;
    type: string;
    required: boolean;
    validation: string;
    defaultValue: string | null;
    source: string;
    editableBy: string[];
    visibilityNote: string;
    sortOrder: number;
  }>;
  definitionOfDone: Array<{
    code: string;
    feature: string;
    doneWhen: string;
    priority: string;
    module: string;
    sortOrder: number;
  }>;
  settings: Array<{
    key: string;
    category: string;
    valueType: "STRING" | "NUMBER" | "BOOLEAN" | "JSON" | "SECRET_REFERENCE";
    isSensitive: boolean;
    value: unknown;
    reason: string;
    sortOrder: number;
  }>;
  translations: Array<{
    key: string;
    namespace: string;
    description: string;
    sortOrder: number;
    values: { ar: string; en: string };
  }>;
}
