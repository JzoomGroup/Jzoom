export type SettingValueType = "STRING" | "NUMBER" | "BOOLEAN" | "JSON" | "SECRET_REFERENCE";
export type RevisionStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export interface PlatformSetting {
  id: string;
  key: string;
  category: string;
  valueType: SettingValueType;
  isSensitive: boolean;
  status: string;
  sortOrder: number;
  current: {
    id: string;
    version: number;
    status: RevisionStatus;
    value: unknown;
    masked: boolean;
    reason: string | null;
    effectiveFrom: string | null;
    effectiveTo: string | null;
  } | null;
  revisionCount: number;
  updatedAt: string;
}

export interface NotificationTemplateConfig {
  id: string;
  code: string;
  event: string;
  status: string;
  sortOrder: number;
  current: {
    id: string;
    version: number;
    status: RevisionStatus;
    recipients: unknown;
    messageAr: string | null;
    messageEn: string | null;
    description: string | null;
    deepLink: string;
    channels: unknown;
    cadence: string | null;
    reminderRule: string | null;
    placeholders: unknown;
    effectiveFrom: string | null;
    effectiveTo: string | null;
  } | null;
  revisionCount: number;
  updatedAt: string;
}

export interface PdfTemplateConfig {
  id: string;
  code: string;
  name: string;
  documentType: string;
  status: string;
  sortOrder: number;
  current: {
    id: string;
    version: number;
    status: RevisionStatus;
    audience: string;
    mustInclude: unknown;
    mustExclude: unknown;
    languageDirection: string;
    technicalRule: string | null;
    contentSchema: unknown;
    fieldMappings: Array<{
      section: string;
      field: string;
      source: string;
      showClient: boolean;
      showInternal: boolean;
      forbidden: boolean;
      documentScope: string | null;
      notes: string | null;
    }>;
    effectiveFrom: string | null;
    effectiveTo: string | null;
  } | null;
  revisionCount: number;
  updatedAt: string;
}

export interface WorkflowTemplateConfig {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
  sortOrder: number;
  current: {
    id: string;
    version: number;
    status: RevisionStatus;
    configuration: unknown;
    states: Array<{
      code: string;
      labelAr: string | null;
      labelEn: string;
      isInitial: boolean;
      isTerminal: boolean;
    }>;
    transitions: Array<{
      code: string;
      actorRoles: unknown;
      condition: string | null;
      sideEffect: string | null;
      reasonRequired: boolean;
      notificationEvent: string | null;
    }>;
    effectiveFrom: string | null;
    effectiveTo: string | null;
  } | null;
  revisionCount: number;
  updatedAt: string;
}

export interface PlatformConfigurationSnapshot {
  settingValueTypes: SettingValueType[];
  revisionStatuses: RevisionStatus[];
  translationStatuses: string[];
  settings: PlatformSetting[];
  notificationTemplates: NotificationTemplateConfig[];
  pdfTemplates: PdfTemplateConfig[];
  workflows: WorkflowTemplateConfig[];
  localization: {
    revisions: Array<{
      id: string;
      version: number;
      status: string;
      publishedAt: string | null;
      createdAt: string;
      values: Array<{
        key: string;
        namespace: string;
        description: string | null;
        locale: string;
        value: string;
      }>;
    }>;
  };
}
