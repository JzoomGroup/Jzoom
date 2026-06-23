export type RequestTemplateFieldType =
  | "SHORT_TEXT"
  | "LONG_TEXT"
  | "NUMBER"
  | "DATE"
  | "DROPDOWN"
  | "MULTI_SELECT"
  | "CHECKBOX"
  | "RADIO"
  | "FILE"
  | "EMAIL"
  | "PHONE"
  | "AMOUNT"
  | "URL";

export type RequestTemplateVersionStatus = "SUGGESTED" | "DRAFT" | "ACTIVE" | "ARCHIVED";

export type RequestFormCompletenessStatus =
  | "COMPLETE"
  | "MISSING_REQUIRED_FIELDS"
  | "MISSING_REQUIRED_ATTACHMENTS"
  | "PENDING_INTERNAL_REVIEW";

export interface RequestTemplateOption {
  id: string | null;
  value: string;
  labelAr: string;
  labelEn: string;
  status: string;
  sortOrder: number;
}

export interface RequestTemplateSection {
  id: string;
  code: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  status: string;
  sortOrder: number;
}

export interface RequestTemplateField {
  id: string;
  code: string;
  sectionCode: string | null;
  libraryFieldCode: string | null;
  systemKey: string | null;
  fieldType: RequestTemplateFieldType;
  labelAr: string;
  labelEn: string;
  helpTextAr: string | null;
  helpTextEn: string | null;
  required: boolean;
  clientVisible: boolean;
  defaultValue: unknown;
  validation: unknown;
  source: string;
  status: string;
  sortOrder: number;
  options: RequestTemplateOption[];
}

export interface RequestTemplateFile {
  id: string | null;
  code: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  fileName: string | null;
  fileType: string | null;
  mimeType: string | null;
  storageProvider: string | null;
  storageKey: string | null;
  required: boolean;
  returnUploadRequired: boolean;
  clientVisible: boolean;
  status: string;
  revision: number;
  sortOrder: number;
}

export interface RequestTemplateDocument {
  id: string | null;
  code: string;
  labelAr: string;
  labelEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  required: boolean;
  uploadRequired: boolean;
  acceptedFileTypes: unknown;
  status: string;
  sortOrder: number;
}

export interface RequestTemplateVersion {
  id: string;
  templateId: string;
  serviceItemId: string;
  version: number;
  status: RequestTemplateVersionStatus;
  instructionsAr: string | null;
  instructionsEn: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  sections: RequestTemplateSection[];
  fields: RequestTemplateField[];
  downloadableFiles: RequestTemplateFile[];
  documentChecklist: RequestTemplateDocument[];
  createdAt: string;
  updatedAt: string;
}

export interface RequestFieldLibraryItem {
  id: string;
  code: string;
  fieldType: RequestTemplateFieldType;
  labelAr: string;
  labelEn: string;
  helpTextAr: string | null;
  helpTextEn: string | null;
  placeholderAr: string | null;
  placeholderEn: string | null;
  systemKey: string | null;
  defaultConfig: unknown;
  status: string;
  sortOrder: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RequestTemplateServiceItem {
  id: string;
  code: string;
  status: string;
  sortOrder: number;
  monthlyService: { id: string; code: string };
  latestRevision: {
    id: string;
    version: number;
    nameAr: string;
    nameEn: string;
    expectedOutput: string | null;
    requiresFile: boolean;
  } | null;
  template: {
    id: string;
    status: string;
    active: RequestTemplateVersion | null;
    suggested: RequestTemplateVersion | null;
    drafts: RequestTemplateVersion[];
    archivedCount: number;
  } | null;
}

export interface RequestTemplatesSnapshot {
  fieldLibrary: RequestFieldLibraryItem[];
  serviceItems: RequestTemplateServiceItem[];
}

export interface ActiveRequestTemplateResponse {
  serviceItemRevision: {
    id: string;
    serviceItemId: string;
    nameAr: string;
    nameEn: string;
    expectedOutput: string | null;
    requiresFile: boolean;
  };
  serviceItem: {
    id: string;
    code: string;
    monthlyService: { id: string; code: string };
  };
  template: RequestTemplateVersion | null;
}

export type TemplateAnswerValue = string | number | boolean | string[] | null;

export interface RequestTemplateAnswerInput {
  fieldCode: string;
  value: TemplateAnswerValue;
}
