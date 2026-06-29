"use client";

import { type FormEvent, useMemo, useState } from "react";
import {
  applySuggestedRequestTemplate,
  changeRequestTemplateVersionStatus,
  createRequestFieldLibraryItem,
  requestTemplateErrorMessage,
  refreshRequestTemplates,
  reviseRequestTemplate,
} from "../../lib/request-templates-client";
import type {
  RequestFieldLibraryItem,
  RequestTemplateFieldType,
  RequestTemplateServiceItem,
  RequestTemplateVersion,
  RequestTemplatesSnapshot,
} from "../../lib/request-template-types";
import { CatalogFeedback, EmptyState, SectionHeader } from "../catalog/catalog-shared";
import { MetricCard, SectionCard } from "../premium-os";

const fieldTypes: RequestTemplateFieldType[] = [
  "SHORT_TEXT",
  "LONG_TEXT",
  "NUMBER",
  "DATE",
  "DROPDOWN",
  "MULTI_SELECT",
  "CHECKBOX",
  "RADIO",
  "FILE",
  "EMAIL",
  "PHONE",
  "AMOUNT",
  "URL",
];

const optionFieldTypes: RequestTemplateFieldType[] = ["DROPDOWN", "MULTI_SELECT", "RADIO"];

type EditableTemplateStatus = "DRAFT" | "ACTIVE";

type EditableSection = {
  active: boolean;
  code: string;
  descriptionAr: string;
  descriptionEn: string;
  sortOrder: number;
  titleAr: string;
  titleEn: string;
};

type EditableOption = {
  active: boolean;
  labelAr: string;
  labelEn: string;
  sortOrder: number;
  value: string;
};

type EditableField = {
  clientVisible: boolean;
  code: string;
  defaultValue: string;
  fieldType: RequestTemplateFieldType;
  helpTextAr: string;
  helpTextEn: string;
  labelAr: string;
  labelEn: string;
  libraryFieldCode: string;
  options: EditableOption[];
  required: boolean;
  sectionCode: string;
  sortOrder: number;
  systemKey: string;
  validation: string;
};

type EditableFile = {
  clientVisible: boolean;
  code: string;
  descriptionAr: string;
  descriptionEn: string;
  fileName: string;
  fileType: string;
  mimeType: string;
  required: boolean;
  returnUploadRequired: boolean;
  sortOrder: number;
  storageKey: string;
  titleAr: string;
  titleEn: string;
};

type EditableDocument = {
  acceptedFileTypes: string;
  code: string;
  descriptionAr: string;
  descriptionEn: string;
  labelAr: string;
  labelEn: string;
  required: boolean;
  sortOrder: number;
  uploadRequired: boolean;
};

type EditableTemplateConfig = {
  documentChecklist: EditableDocument[];
  downloadableFiles: EditableFile[];
  fields: EditableField[];
  instructionsAr: string;
  instructionsEn: string;
  reason: string;
  sections: EditableSection[];
  status: EditableTemplateStatus;
};

type TemplatePayload = {
  documentChecklist: Array<Record<string, unknown>>;
  downloadableFiles: Array<Record<string, unknown>>;
  fields: Array<Record<string, unknown>>;
  instructionsAr?: string;
  instructionsEn?: string;
  reason: string;
  sections: Array<Record<string, unknown>>;
  status: EditableTemplateStatus;
};

function optionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function jsonText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function parseOptionalJson(value: string, label: string): unknown | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }
}

function fieldUsesOptions(fieldType: RequestTemplateFieldType): boolean {
  return optionFieldTypes.includes(fieldType);
}

function defaultSection(): EditableSection {
  return {
    active: true,
    code: "basic_request_information",
    titleAr: "Basic request information",
    titleEn: "Basic request information",
    descriptionAr: "",
    descriptionEn: "",
    sortOrder: 1,
  };
}

function defaultField(sectionCode: string, index: number): EditableField {
  return {
    code: `field_${index + 1}`,
    sectionCode,
    libraryFieldCode: "",
    systemKey: "",
    fieldType: "SHORT_TEXT",
    labelAr: "",
    labelEn: "",
    helpTextAr: "",
    helpTextEn: "",
    required: false,
    clientVisible: true,
    defaultValue: "",
    validation: "",
    sortOrder: index + 1,
    options: [],
  };
}

function defaultOption(index: number): EditableOption {
  return {
    value: `option_${index + 1}`,
    labelAr: "",
    labelEn: "",
    active: true,
    sortOrder: index + 1,
  };
}

function defaultDocument(index: number): EditableDocument {
  return {
    code: `document_${index + 1}`,
    labelAr: "",
    labelEn: "",
    descriptionAr: "",
    descriptionEn: "",
    required: false,
    uploadRequired: true,
    acceptedFileTypes: "",
    sortOrder: index + 1,
  };
}

function defaultFile(index: number): EditableFile {
  return {
    code: `reference_file_${index + 1}`,
    titleAr: "",
    titleEn: "",
    descriptionAr: "",
    descriptionEn: "",
    fileName: "",
    fileType: "",
    mimeType: "",
    storageKey: "",
    required: false,
    returnUploadRequired: false,
    clientVisible: true,
    sortOrder: index + 1,
  };
}

type TemplatePresetId =
  | "general"
  | "hr_document"
  | "policy"
  | "finance"
  | "reporting"
  | "digital"
  | "legal";

type TemplatePresetDefinition = {
  description: string;
  id: TemplatePresetId;
  title: string;
};

const templatePresetDefinitions: TemplatePresetDefinition[] = [
  {
    id: "general",
    title: "نموذج عام مرن",
    description: "ملخص الطلب، السياق، الأولوية، الموعد، ومعيار النجاح.",
  },
  {
    id: "hr_document",
    title: "مستندات الموارد البشرية",
    description: "بيانات موظف، غرض المستند، جهة الاستخدام، ومرفقات داعمة.",
  },
  {
    id: "policy",
    title: "سياسات وإجراءات",
    description: "نطاق السياسة، الوضع الحالي، صاحب الاعتماد، وملاحظات التطبيق.",
  },
  {
    id: "finance",
    title: "مالية وضريبة",
    description: "الفترة المالية، المبلغ، علاقة الضريبة، ومستندات الإثبات.",
  },
  {
    id: "reporting",
    title: "تقارير وتحليلات",
    description: "فترة التقرير، الجمهور، المؤشرات المطلوبة، وصيغة العرض.",
  },
  {
    id: "digital",
    title: "تقني ومنصات",
    description: "النظام، صلاحيات الدخول، القيود، والنتيجة التقنية المستهدفة.",
  },
  {
    id: "legal",
    title: "عقود ومستندات قانونية",
    description: "الطرف الآخر، نوع المستند، نقاط الخطر، والمرفقات القانونية.",
  },
];

const defaultAcceptedFileTypes =
  '["application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.ms-excel","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","image/png","image/jpeg"]';

function presetOption(
  value: string,
  labelAr: string,
  labelEn: string,
  sortOrder: number,
): EditableOption {
  return { active: true, value, labelAr, labelEn, sortOrder };
}

function presetField(
  input: Partial<EditableField> & Pick<EditableField, "code" | "labelAr" | "labelEn">,
): EditableField {
  return {
    clientVisible: true,
    defaultValue: "",
    fieldType: "SHORT_TEXT",
    helpTextAr: "",
    helpTextEn: "",
    libraryFieldCode: "",
    options: [],
    required: false,
    sectionCode: "execution_details",
    sortOrder: 1,
    systemKey: "",
    validation: "",
    ...input,
  };
}

function presetDocument(input: Partial<EditableDocument> = {}): EditableDocument {
  return {
    acceptedFileTypes: defaultAcceptedFileTypes,
    code: "supporting_documents",
    descriptionAr: "أرفق أي ملفات أو صور أو جداول تساعد فريق جزوم على تنفيذ الطلب.",
    descriptionEn: "Attach any files, screenshots, or sheets that help Jzoom complete the work.",
    labelAr: "المستندات الداعمة",
    labelEn: "Supporting documents",
    required: false,
    sortOrder: 1,
    uploadRequired: false,
    ...input,
  };
}

function classifyPreset(item: RequestTemplateServiceItem | null): TemplatePresetId {
  const text = [
    item?.code,
    item?.latestRevision?.nameAr,
    item?.latestRevision?.nameEn,
    item?.latestRevision?.expectedOutput,
    item?.monthlyService.code,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (/(employee|letter|hr|موظف|خطاب|تعريف|موارد|راتب)/i.test(text)) return "hr_document";
  if (/(policy|procedure|sop|سياسة|إجراء|لائحة)/i.test(text)) return "policy";
  if (/(finance|account|invoice|vat|tax|مالية|فاتورة|ضريبة)/i.test(text)) return "finance";
  if (/(report|dashboard|analytics|تقرير|تحليل|مؤشر|لوحة)/i.test(text)) return "reporting";
  if (/(digital|system|integration|website|app|data|منصة|نظام|تكامل|بيانات)/i.test(text)) {
    return "digital";
  }
  if (/(legal|contract|agreement|عقد|اتفاقية|قانون)/i.test(text)) return "legal";
  return "general";
}

function buildPresetConfig(
  presetId: TemplatePresetId,
  item: RequestTemplateServiceItem | null,
): EditableTemplateConfig {
  const requiresFile = item?.latestRevision?.requiresFile ?? false;
  const commonFields: EditableField[] = [
    presetField({
      code: "request_summary",
      fieldType: "LONG_TEXT",
      labelAr: "ملخص المطلوب",
      labelEn: "Request summary",
      helpTextAr: "اكتب المطلوب والنتيجة المتوقعة بلغة واضحة.",
      helpTextEn: "Describe the needed work and expected result clearly.",
      required: true,
      sectionCode: "request_context",
      sortOrder: 1,
      systemKey: "request_summary",
    }),
    presetField({
      code: "business_context",
      fieldType: "LONG_TEXT",
      labelAr: "سياق العمل",
      labelEn: "Business context",
      helpTextAr: "اذكر القسم أو العملية أو الحالة التجارية المرتبطة بالطلب.",
      helpTextEn: "Mention the business situation, department, or process behind this request.",
      sectionCode: "request_context",
      sortOrder: 2,
      systemKey: "business_context",
    }),
    presetField({
      code: "urgency",
      fieldType: "DROPDOWN",
      labelAr: "الأولوية",
      labelEn: "Urgency",
      required: true,
      sectionCode: "execution_details",
      sortOrder: 20,
      systemKey: "urgency",
      options: [
        presetOption("normal", "عادي", "Normal", 1),
        presetOption("high", "مرتفع", "High", 2),
        presetOption("urgent", "عاجل", "Urgent", 3),
      ],
    }),
    presetField({
      code: "preferred_deadline",
      fieldType: "DATE",
      labelAr: "الموعد المفضل للتسليم",
      labelEn: "Preferred deadline",
      sectionCode: "execution_details",
      sortOrder: 21,
      systemKey: "preferred_deadline",
    }),
  ];
  const specificFields: Record<TemplatePresetId, EditableField[]> = {
    general: [
      presetField({
        code: "stakeholders",
        labelAr: "الأطراف المعنية",
        labelEn: "Stakeholders",
        sortOrder: 3,
      }),
      presetField({
        code: "success_criteria",
        fieldType: "LONG_TEXT",
        labelAr: "معيار نجاح الطلب",
        labelEn: "Success criteria",
        sortOrder: 4,
      }),
    ],
    hr_document: [
      presetField({
        code: "employee_name",
        labelAr: "اسم الموظف",
        labelEn: "Employee name",
        required: true,
        sortOrder: 3,
        systemKey: "employee_name",
      }),
      presetField({
        code: "employee_identifier",
        labelAr: "رقم الموظف أو الهوية",
        labelEn: "Employee ID",
        sortOrder: 4,
        systemKey: "employee_identifier",
      }),
      presetField({
        code: "document_purpose",
        fieldType: "DROPDOWN",
        labelAr: "الغرض من المستند",
        labelEn: "Document purpose",
        required: true,
        sortOrder: 5,
        options: [
          presetOption("bank", "بنك", "Bank", 1),
          presetOption("embassy", "سفارة", "Embassy", 2),
          presetOption("government", "جهة حكومية", "Government", 3),
          presetOption("other", "أخرى", "Other", 4),
        ],
      }),
    ],
    policy: [
      presetField({
        code: "policy_scope",
        fieldType: "LONG_TEXT",
        labelAr: "نطاق السياسة أو الإجراء",
        labelEn: "Policy or procedure scope",
        required: true,
        sortOrder: 3,
      }),
      presetField({
        code: "current_process",
        fieldType: "LONG_TEXT",
        labelAr: "الوضع الحالي أو الإجراء الحالي",
        labelEn: "Current process",
        sortOrder: 4,
      }),
      presetField({
        code: "approval_owner",
        labelAr: "صاحب الاعتماد",
        labelEn: "Approval owner",
        sortOrder: 5,
      }),
    ],
    finance: [
      presetField({
        code: "period",
        labelAr: "الفترة المالية",
        labelEn: "Financial period",
        required: true,
        sortOrder: 3,
      }),
      presetField({
        code: "amount",
        fieldType: "AMOUNT",
        labelAr: "المبلغ إن وجد",
        labelEn: "Amount if applicable",
        sortOrder: 4,
      }),
      presetField({
        code: "tax_related",
        fieldType: "CHECKBOX",
        labelAr: "مرتبط بالضريبة",
        labelEn: "Tax related",
        sortOrder: 5,
      }),
    ],
    reporting: [
      presetField({
        code: "report_period",
        labelAr: "فترة التقرير",
        labelEn: "Report period",
        required: true,
        sortOrder: 3,
      }),
      presetField({
        code: "audience",
        fieldType: "DROPDOWN",
        labelAr: "الجمهور المستهدف",
        labelEn: "Target audience",
        required: true,
        sortOrder: 4,
        options: [
          presetOption("management", "الإدارة", "Management", 1),
          presetOption("team", "فريق العمل", "Team", 2),
          presetOption("client", "العميل", "Client", 3),
        ],
      }),
      presetField({
        code: "metrics_needed",
        fieldType: "LONG_TEXT",
        labelAr: "المؤشرات المطلوبة",
        labelEn: "Required metrics",
        required: true,
        sortOrder: 5,
      }),
    ],
    digital: [
      presetField({
        code: "platform_or_system",
        labelAr: "النظام أو المنصة",
        labelEn: "Platform or system",
        required: true,
        sortOrder: 3,
      }),
      presetField({
        code: "access_context",
        fieldType: "LONG_TEXT",
        labelAr: "صلاحيات الدخول أو القيود",
        labelEn: "Access context or constraints",
        sortOrder: 4,
      }),
      presetField({
        code: "target_outcome",
        fieldType: "LONG_TEXT",
        labelAr: "النتيجة التقنية المطلوبة",
        labelEn: "Target technical outcome",
        required: true,
        sortOrder: 5,
      }),
    ],
    legal: [
      presetField({
        code: "counterparty",
        labelAr: "الطرف الآخر",
        labelEn: "Counterparty",
        required: true,
        sortOrder: 3,
      }),
      presetField({
        code: "document_type",
        fieldType: "DROPDOWN",
        labelAr: "نوع المستند",
        labelEn: "Document type",
        required: true,
        sortOrder: 4,
        options: [
          presetOption("contract", "عقد", "Contract", 1),
          presetOption("agreement", "اتفاقية", "Agreement", 2),
          presetOption("letter", "خطاب", "Letter", 3),
          presetOption("other", "أخرى", "Other", 4),
        ],
      }),
      presetField({
        code: "risk_notes",
        fieldType: "LONG_TEXT",
        labelAr: "نقاط الخطر أو الملاحظات",
        labelEn: "Risk notes",
        sortOrder: 5,
      }),
    ],
  };
  return {
    status: "DRAFT",
    instructionsAr:
      "أكمل الحقول المطلوبة وارفع المستندات الداعمة عند الحاجة حتى يتمكن فريق جزوم من تنفيذ الطلب بدقة.",
    instructionsEn:
      "Complete the required fields and upload supporting documents when needed so Jzoom can complete the request accurately.",
    sections: [
      {
        active: true,
        code: "request_context",
        descriptionAr: "المعلومات الأساسية التي تشرح المطلوب وسياق العمل.",
        descriptionEn: "Core information that explains the need and business context.",
        sortOrder: 1,
        titleAr: "سياق الطلب",
        titleEn: "Request context",
      },
      {
        active: true,
        code: "execution_details",
        descriptionAr: "تفاصيل التنفيذ والموعد والأولوية والمرفقات.",
        descriptionEn: "Execution details, deadline, urgency, and attachments.",
        sortOrder: 2,
        titleAr: "تفاصيل التنفيذ",
        titleEn: "Execution details",
      },
    ],
    fields: [...commonFields, ...specificFields[presetId]],
    downloadableFiles: [],
    documentChecklist: [
      presetDocument({
        required: requiresFile,
        uploadRequired: requiresFile,
      }),
    ],
    reason: `Applied ${presetId} preset from Admin form builder`,
  };
}

function versionToEditableConfig(version: RequestTemplateVersion | null): EditableTemplateConfig {
  if (!version) {
    return {
      status: "DRAFT",
      instructionsAr: "",
      instructionsEn: "",
      sections: [defaultSection()],
      fields: [],
      downloadableFiles: [],
      documentChecklist: [],
      reason: "Created from Admin form builder",
    };
  }

  return {
    status: "DRAFT",
    instructionsAr: version.instructionsAr ?? "",
    instructionsEn: version.instructionsEn ?? "",
    sections: version.sections.map((section) => ({
      code: section.code,
      titleAr: section.titleAr,
      titleEn: section.titleEn,
      descriptionAr: section.descriptionAr ?? "",
      descriptionEn: section.descriptionEn ?? "",
      active: section.status === "ACTIVE",
      sortOrder: section.sortOrder,
    })),
    fields: version.fields.map((field) => ({
      code: field.code,
      sectionCode: field.sectionCode ?? "",
      libraryFieldCode: field.libraryFieldCode ?? "",
      systemKey: field.systemKey ?? "",
      fieldType: field.fieldType,
      labelAr: field.labelAr,
      labelEn: field.labelEn,
      helpTextAr: field.helpTextAr ?? "",
      helpTextEn: field.helpTextEn ?? "",
      required: field.required,
      clientVisible: field.clientVisible,
      defaultValue: jsonText(field.defaultValue),
      validation: jsonText(field.validation),
      sortOrder: field.sortOrder,
      options: field.options.map((option) => ({
        value: option.value,
        labelAr: option.labelAr,
        labelEn: option.labelEn,
        active: option.status === "ACTIVE",
        sortOrder: option.sortOrder,
      })),
    })),
    downloadableFiles: version.downloadableFiles.map((file) => ({
      code: file.code,
      titleAr: file.titleAr,
      titleEn: file.titleEn,
      descriptionAr: file.descriptionAr ?? "",
      descriptionEn: file.descriptionEn ?? "",
      fileName: file.fileName ?? "",
      fileType: file.fileType ?? "",
      mimeType: file.mimeType ?? "",
      storageKey: file.storageKey ?? "",
      required: file.required,
      returnUploadRequired: file.returnUploadRequired,
      clientVisible: file.clientVisible,
      sortOrder: file.sortOrder,
    })),
    documentChecklist: version.documentChecklist.map((document) => ({
      code: document.code,
      labelAr: document.labelAr,
      labelEn: document.labelEn,
      descriptionAr: document.descriptionAr ?? "",
      descriptionEn: document.descriptionEn ?? "",
      required: document.required,
      uploadRequired: document.uploadRequired,
      acceptedFileTypes: jsonText(document.acceptedFileTypes),
      sortOrder: document.sortOrder,
    })),
    reason: "Revised from Admin form builder",
  };
}

function editableConfigToPayload(config: EditableTemplateConfig): TemplatePayload {
  const payload: TemplatePayload = {
    status: config.status,
    sections: config.sections.map((section) => ({
      code: section.code,
      titleAr: section.titleAr,
      titleEn: section.titleEn,
      ...(optionalText(section.descriptionAr)
        ? { descriptionAr: optionalText(section.descriptionAr) }
        : {}),
      ...(optionalText(section.descriptionEn)
        ? { descriptionEn: optionalText(section.descriptionEn) }
        : {}),
      active: section.active,
      sortOrder: section.sortOrder,
    })),
    fields: config.fields.map((field) => {
      const defaultValue = parseOptionalJson(field.defaultValue, `${field.code} default value`);
      const validation = parseOptionalJson(field.validation, `${field.code} validation`);
      return {
        code: field.code,
        ...(optionalText(field.sectionCode)
          ? { sectionCode: optionalText(field.sectionCode) }
          : {}),
        ...(optionalText(field.libraryFieldCode)
          ? { libraryFieldCode: optionalText(field.libraryFieldCode) }
          : {}),
        ...(optionalText(field.systemKey) ? { systemKey: optionalText(field.systemKey) } : {}),
        fieldType: field.fieldType,
        labelAr: field.labelAr,
        labelEn: field.labelEn,
        ...(optionalText(field.helpTextAr) ? { helpTextAr: optionalText(field.helpTextAr) } : {}),
        ...(optionalText(field.helpTextEn) ? { helpTextEn: optionalText(field.helpTextEn) } : {}),
        required: field.required,
        clientVisible: field.clientVisible,
        ...(defaultValue !== undefined ? { defaultValue } : {}),
        ...(validation !== undefined ? { validation } : {}),
        sortOrder: field.sortOrder,
        options: fieldUsesOptions(field.fieldType)
          ? field.options.map((option) => ({
              value: option.value,
              labelAr: option.labelAr,
              labelEn: option.labelEn,
              active: option.active,
              sortOrder: option.sortOrder,
            }))
          : [],
      };
    }),
    downloadableFiles: config.downloadableFiles.map((file) => ({
      code: file.code,
      titleAr: file.titleAr,
      titleEn: file.titleEn,
      ...(optionalText(file.descriptionAr)
        ? { descriptionAr: optionalText(file.descriptionAr) }
        : {}),
      ...(optionalText(file.descriptionEn)
        ? { descriptionEn: optionalText(file.descriptionEn) }
        : {}),
      ...(optionalText(file.fileName) ? { fileName: optionalText(file.fileName) } : {}),
      ...(optionalText(file.fileType) ? { fileType: optionalText(file.fileType) } : {}),
      ...(optionalText(file.mimeType) ? { mimeType: optionalText(file.mimeType) } : {}),
      ...(optionalText(file.storageKey) ? { storageKey: optionalText(file.storageKey) } : {}),
      required: file.required,
      returnUploadRequired: file.returnUploadRequired,
      clientVisible: file.clientVisible,
      sortOrder: file.sortOrder,
    })),
    documentChecklist: config.documentChecklist.map((document) => {
      const acceptedFileTypes = parseOptionalJson(
        document.acceptedFileTypes,
        `${document.code} accepted file types`,
      );
      return {
        code: document.code,
        labelAr: document.labelAr,
        labelEn: document.labelEn,
        ...(optionalText(document.descriptionAr)
          ? { descriptionAr: optionalText(document.descriptionAr) }
          : {}),
        ...(optionalText(document.descriptionEn)
          ? { descriptionEn: optionalText(document.descriptionEn) }
          : {}),
        required: document.required,
        uploadRequired: document.uploadRequired,
        ...(acceptedFileTypes !== undefined ? { acceptedFileTypes } : {}),
        sortOrder: document.sortOrder,
      };
    }),
    reason: optionalText(config.reason) ?? "Saved from Admin form builder",
  };
  const instructionsAr = optionalText(config.instructionsAr);
  const instructionsEn = optionalText(config.instructionsEn);
  if (instructionsAr) {
    payload.instructionsAr = instructionsAr;
  }
  if (instructionsEn) {
    payload.instructionsEn = instructionsEn;
  }
  return payload;
}

function versionForEditing(item: RequestTemplateServiceItem | null): RequestTemplateVersion | null {
  if (!item?.template) {
    return null;
  }
  return item.template.active ?? item.template.drafts[0] ?? item.template.suggested ?? null;
}

function TemplatePreview({ version }: { version: RequestTemplateVersion | null }) {
  if (!version) {
    return (
      <EmptyState>
        No active, draft, or suggested template is available for this service item.
      </EmptyState>
    );
  }
  return (
    <div className="activity-list">
      <article>
        <strong>
          v{version.version} - {version.status}
        </strong>
        <p>{version.instructionsEn || version.instructionsAr || "No instructions configured."}</p>
      </article>
      {version.sections.map((section) => (
        <article key={section.code}>
          <strong>{section.titleEn}</strong>
          {section.descriptionEn && <p>{section.descriptionEn}</p>}
          <small>{section.titleAr}</small>
          <ul>
            {version.fields
              .filter((field) => field.sectionCode === section.code)
              .map((field) => (
                <li key={field.code}>
                  {field.labelEn} - {field.fieldType} - {field.required ? "required" : "optional"} -{" "}
                  {field.clientVisible ? "client-visible" : "internal-only"}
                </li>
              ))}
          </ul>
        </article>
      ))}
      {version.downloadableFiles.length > 0 && (
        <article>
          <strong>Reference files</strong>
          <ul>
            {version.downloadableFiles.map((file) => (
              <li key={file.code}>
                {file.titleEn} -{" "}
                {file.returnUploadRequired ? "return upload required" : "reference"}
              </li>
            ))}
          </ul>
        </article>
      )}
      {version.documentChecklist.length > 0 && (
        <article>
          <strong>Required document checklist</strong>
          <ul>
            {version.documentChecklist.map((document) => (
              <li key={document.code}>
                {document.labelEn} -{" "}
                {document.uploadRequired ? "upload required" : "optional upload"}
              </li>
            ))}
          </ul>
        </article>
      )}
    </div>
  );
}

function FieldLibraryPanel({
  fields,
  onSaved,
  onError,
}: {
  fields: RequestFieldLibraryItem[];
  onError: (message: string) => void;
  onSaved: (snapshot: RequestTemplatesSnapshot, message: string) => void;
}) {
  const [form, setForm] = useState({
    code: "",
    fieldType: "SHORT_TEXT" as RequestTemplateFieldType,
    labelAr: "",
    labelEn: "",
    systemKey: "",
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await createRequestFieldLibraryItem({
        code: form.code,
        fieldType: form.fieldType,
        labelAr: form.labelAr,
        labelEn: form.labelEn,
        ...(form.systemKey ? { systemKey: form.systemKey } : {}),
      });
      const snapshot = await refreshRequestTemplates();
      setForm({
        code: "",
        fieldType: "SHORT_TEXT",
        labelAr: "",
        labelEn: "",
        systemKey: "",
      });
      onSaved(snapshot, "Field library item created.");
    } catch (error) {
      onError(requestTemplateErrorMessage(error));
    }
  }

  return (
    <article className="catalog-panel">
      <h2>Reusable field library</h2>
      <p>
        Create reusable field definitions once, then reference them from any service item request
        template.
      </p>
      <form className="catalog-form" onSubmit={submit}>
        <label>
          Code
          <input
            required
            value={form.code}
            onChange={(event) => setForm({ ...form, code: event.target.value })}
          />
        </label>
        <label>
          Field type
          <select
            value={form.fieldType}
            onChange={(event) =>
              setForm({ ...form, fieldType: event.target.value as RequestTemplateFieldType })
            }
          >
            {fieldTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label>
          Arabic label
          <input
            required
            value={form.labelAr}
            onChange={(event) => setForm({ ...form, labelAr: event.target.value })}
          />
        </label>
        <label>
          English label
          <input
            required
            value={form.labelEn}
            onChange={(event) => setForm({ ...form, labelEn: event.target.value })}
          />
        </label>
        <label>
          System key
          <input
            value={form.systemKey}
            onChange={(event) => setForm({ ...form, systemKey: event.target.value })}
          />
        </label>
        <button className="os-button os-button-primary" type="submit">
          Add library field
        </button>
      </form>
      <div className="activity-list">
        {fields.slice(0, 18).map((field) => (
          <article key={field.id}>
            <strong>{field.labelEn}</strong>
            <small>
              {field.code} - {field.fieldType} - {field.status}
            </small>
            {field.systemKey && <p>System key: {field.systemKey}</p>}
          </article>
        ))}
      </div>
    </article>
  );
}

function TemplateBuilder({
  config,
  fieldLibrary,
  onChange,
}: {
  config: EditableTemplateConfig;
  fieldLibrary: RequestFieldLibraryItem[];
  onChange: (config: EditableTemplateConfig) => void;
}) {
  const previewPayload = useMemo(() => {
    try {
      return JSON.stringify(editableConfigToPayload(config), null, 2);
    } catch {
      return JSON.stringify(config, null, 2);
    }
  }, [config]);

  function setConfig(patch: Partial<EditableTemplateConfig>) {
    onChange({ ...config, ...patch });
  }

  function updateSection(index: number, patch: Partial<EditableSection>) {
    const sections = config.sections.map((section, sectionIndex) =>
      sectionIndex === index ? { ...section, ...patch } : section,
    );
    onChange({ ...config, sections });
  }

  function removeSection(index: number) {
    const removed = config.sections[index];
    const sections = config.sections.filter((_, sectionIndex) => sectionIndex !== index);
    onChange({
      ...config,
      sections: sections.length > 0 ? sections : [defaultSection()],
      fields: config.fields.map((field) =>
        field.sectionCode === removed?.code ? { ...field, sectionCode: "" } : field,
      ),
    });
  }

  function updateField(index: number, patch: Partial<EditableField>) {
    const fields = config.fields.map((field, fieldIndex) =>
      fieldIndex === index ? { ...field, ...patch } : field,
    );
    onChange({ ...config, fields });
  }

  function removeField(index: number) {
    onChange({ ...config, fields: config.fields.filter((_, fieldIndex) => fieldIndex !== index) });
  }

  function updateOption(fieldIndex: number, optionIndex: number, patch: Partial<EditableOption>) {
    const fields = config.fields.map((field, currentFieldIndex) => {
      if (currentFieldIndex !== fieldIndex) {
        return field;
      }
      return {
        ...field,
        options: field.options.map((option, currentOptionIndex) =>
          currentOptionIndex === optionIndex ? { ...option, ...patch } : option,
        ),
      };
    });
    onChange({ ...config, fields });
  }

  function removeOption(fieldIndex: number, optionIndex: number) {
    const fields = config.fields.map((field, currentFieldIndex) =>
      currentFieldIndex === fieldIndex
        ? { ...field, options: field.options.filter((_, index) => index !== optionIndex) }
        : field,
    );
    onChange({ ...config, fields });
  }

  function addOption(fieldIndex: number) {
    const fields = config.fields.map((field, currentFieldIndex) =>
      currentFieldIndex === fieldIndex
        ? { ...field, options: [...field.options, defaultOption(field.options.length)] }
        : field,
    );
    onChange({ ...config, fields });
  }

  function updateDocument(index: number, patch: Partial<EditableDocument>) {
    onChange({
      ...config,
      documentChecklist: config.documentChecklist.map((document, documentIndex) =>
        documentIndex === index ? { ...document, ...patch } : document,
      ),
    });
  }

  function updateFile(index: number, patch: Partial<EditableFile>) {
    onChange({
      ...config,
      downloadableFiles: config.downloadableFiles.map((file, fileIndex) =>
        fileIndex === index ? { ...file, ...patch } : file,
      ),
    });
  }

  return (
    <div className="catalog-form wide-form template-builder">
      <section className="template-builder-section form-span">
        <div className="entity-card-heading">
          <div>
            <p className="eyebrow">Version settings</p>
            <h3>Template behavior</h3>
          </div>
        </div>
        <div className="catalog-form wide-form">
          <label>
            Save status
            <select
              value={config.status}
              onChange={(event) =>
                setConfig({ status: event.target.value as EditableTemplateStatus })
              }
            >
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
            </select>
          </label>
          <label>
            Change reason
            <input
              required
              value={config.reason}
              onChange={(event) => setConfig({ reason: event.target.value })}
            />
          </label>
          <label className="form-span">
            English client instructions
            <textarea
              rows={3}
              value={config.instructionsEn}
              onChange={(event) => setConfig({ instructionsEn: event.target.value })}
            />
          </label>
          <label className="form-span">
            Arabic client instructions
            <textarea
              rows={3}
              value={config.instructionsAr}
              onChange={(event) => setConfig({ instructionsAr: event.target.value })}
            />
          </label>
        </div>
      </section>

      <section className="template-builder-section form-span">
        <div className="entity-card-heading">
          <div>
            <p className="eyebrow">Sections</p>
            <h3>Group client-facing fields</h3>
          </div>
          <button
            className="os-button os-button-secondary"
            type="button"
            onClick={() =>
              setConfig({
                sections: [
                  ...config.sections,
                  {
                    ...defaultSection(),
                    code: `section_${config.sections.length + 1}`,
                    sortOrder: config.sections.length + 1,
                  },
                ],
              })
            }
          >
            Add section
          </button>
        </div>
        <div className="template-builder-stack">
          {config.sections.map((section, index) => (
            <fieldset className="template-fieldset" key={`${section.code}-${index}`}>
              <legend>Section {index + 1}</legend>
              <div className="catalog-form wide-form">
                <label>
                  Code
                  <input
                    required
                    value={section.code}
                    onChange={(event) => updateSection(index, { code: event.target.value })}
                  />
                </label>
                <label>
                  Order
                  <input
                    min="0"
                    type="number"
                    value={section.sortOrder}
                    onChange={(event) =>
                      updateSection(index, { sortOrder: Number(event.target.value) })
                    }
                  />
                </label>
                <label>
                  English title
                  <input
                    required
                    value={section.titleEn}
                    onChange={(event) => updateSection(index, { titleEn: event.target.value })}
                  />
                </label>
                <label>
                  Arabic title
                  <input
                    required
                    value={section.titleAr}
                    onChange={(event) => updateSection(index, { titleAr: event.target.value })}
                  />
                </label>
                <label className="form-span">
                  English description
                  <textarea
                    rows={2}
                    value={section.descriptionEn}
                    onChange={(event) =>
                      updateSection(index, { descriptionEn: event.target.value })
                    }
                  />
                </label>
                <label className="checkbox-label">
                  <input
                    checked={section.active}
                    type="checkbox"
                    onChange={(event) => updateSection(index, { active: event.target.checked })}
                  />
                  Active section
                </label>
                <button
                  className="os-button os-button-danger"
                  type="button"
                  onClick={() => removeSection(index)}
                >
                  Remove section
                </button>
              </div>
            </fieldset>
          ))}
        </div>
      </section>

      <section className="template-builder-section form-span">
        <div className="entity-card-heading">
          <div>
            <p className="eyebrow">Fields</p>
            <h3>Build the request form</h3>
          </div>
          <button
            className="os-button os-button-secondary"
            type="button"
            onClick={() =>
              setConfig({
                fields: [
                  ...config.fields,
                  defaultField(config.sections[0]?.code ?? "", config.fields.length),
                ],
              })
            }
          >
            Add field
          </button>
        </div>
        {config.fields.length === 0 ? (
          <EmptyState>No fields yet. Add the first field for this service item.</EmptyState>
        ) : (
          <div className="template-builder-stack">
            {config.fields.map((field, index) => (
              <fieldset className="template-fieldset" key={`${field.code}-${index}`}>
                <legend>Field {index + 1}</legend>
                <div className="catalog-form wide-form">
                  <label>
                    Code
                    <input
                      required
                      value={field.code}
                      onChange={(event) => updateField(index, { code: event.target.value })}
                    />
                  </label>
                  <label>
                    Type
                    <select
                      value={field.fieldType}
                      onChange={(event) =>
                        updateField(index, {
                          fieldType: event.target.value as RequestTemplateFieldType,
                        })
                      }
                    >
                      {fieldTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Section
                    <select
                      value={field.sectionCode}
                      onChange={(event) => updateField(index, { sectionCode: event.target.value })}
                    >
                      <option value="">No section</option>
                      {config.sections.map((section) => (
                        <option key={section.code} value={section.code}>
                          {section.titleEn} ({section.code})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Library field
                    <select
                      value={field.libraryFieldCode}
                      onChange={(event) =>
                        updateField(index, { libraryFieldCode: event.target.value })
                      }
                    >
                      <option value="">Custom field</option>
                      {fieldLibrary
                        .filter((libraryField) => libraryField.status === "ACTIVE")
                        .map((libraryField) => (
                          <option key={libraryField.code} value={libraryField.code}>
                            {libraryField.labelEn} ({libraryField.code})
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    English label
                    <input
                      required
                      value={field.labelEn}
                      onChange={(event) => updateField(index, { labelEn: event.target.value })}
                    />
                  </label>
                  <label>
                    Arabic label
                    <input
                      required
                      value={field.labelAr}
                      onChange={(event) => updateField(index, { labelAr: event.target.value })}
                    />
                  </label>
                  <label>
                    Order
                    <input
                      min="0"
                      type="number"
                      value={field.sortOrder}
                      onChange={(event) =>
                        updateField(index, { sortOrder: Number(event.target.value) })
                      }
                    />
                  </label>
                  <label>
                    System key
                    <input
                      value={field.systemKey}
                      onChange={(event) => updateField(index, { systemKey: event.target.value })}
                    />
                  </label>
                  <label className="form-span">
                    English help text
                    <textarea
                      rows={2}
                      value={field.helpTextEn}
                      onChange={(event) => updateField(index, { helpTextEn: event.target.value })}
                    />
                  </label>
                  <label className="form-span">
                    Arabic help text
                    <textarea
                      rows={2}
                      value={field.helpTextAr}
                      onChange={(event) => updateField(index, { helpTextAr: event.target.value })}
                    />
                  </label>
                  <label className="checkbox-label">
                    <input
                      checked={field.required}
                      type="checkbox"
                      onChange={(event) => updateField(index, { required: event.target.checked })}
                    />
                    Required
                  </label>
                  <label className="checkbox-label">
                    <input
                      checked={field.clientVisible}
                      type="checkbox"
                      onChange={(event) =>
                        updateField(index, { clientVisible: event.target.checked })
                      }
                    />
                    Client visible
                  </label>
                  <details className="form-span">
                    <summary>Advanced field settings</summary>
                    <div className="catalog-form wide-form">
                      <label>
                        Default value JSON
                        <input
                          value={field.defaultValue}
                          onChange={(event) =>
                            updateField(index, { defaultValue: event.target.value })
                          }
                        />
                      </label>
                      <label>
                        Validation JSON
                        <input
                          value={field.validation}
                          onChange={(event) =>
                            updateField(index, { validation: event.target.value })
                          }
                        />
                      </label>
                    </div>
                  </details>
                  <button
                    className="os-button os-button-danger"
                    type="button"
                    onClick={() => removeField(index)}
                  >
                    Remove field
                  </button>
                </div>
                {fieldUsesOptions(field.fieldType) && (
                  <div className="template-options">
                    <div className="entity-card-heading">
                      <div>
                        <p className="eyebrow">Options</p>
                        <h4>{field.labelEn || field.code}</h4>
                      </div>
                      <button
                        className="os-button os-button-quiet"
                        type="button"
                        onClick={() => addOption(index)}
                      >
                        Add option
                      </button>
                    </div>
                    {field.options.map((option, optionIndex) => (
                      <div className="catalog-form wide-form template-option-row" key={optionIndex}>
                        <label>
                          Value
                          <input
                            required
                            value={option.value}
                            onChange={(event) =>
                              updateOption(index, optionIndex, { value: event.target.value })
                            }
                          />
                        </label>
                        <label>
                          English label
                          <input
                            required
                            value={option.labelEn}
                            onChange={(event) =>
                              updateOption(index, optionIndex, { labelEn: event.target.value })
                            }
                          />
                        </label>
                        <label>
                          Arabic label
                          <input
                            required
                            value={option.labelAr}
                            onChange={(event) =>
                              updateOption(index, optionIndex, { labelAr: event.target.value })
                            }
                          />
                        </label>
                        <label>
                          Order
                          <input
                            min="0"
                            type="number"
                            value={option.sortOrder}
                            onChange={(event) =>
                              updateOption(index, optionIndex, {
                                sortOrder: Number(event.target.value),
                              })
                            }
                          />
                        </label>
                        <label className="checkbox-label">
                          <input
                            checked={option.active}
                            type="checkbox"
                            onChange={(event) =>
                              updateOption(index, optionIndex, { active: event.target.checked })
                            }
                          />
                          Active
                        </label>
                        <button
                          className="os-button os-button-danger"
                          type="button"
                          onClick={() => removeOption(index, optionIndex)}
                        >
                          Remove option
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </fieldset>
            ))}
          </div>
        )}
      </section>

      <section className="template-builder-section form-span">
        <div className="entity-card-heading">
          <div>
            <p className="eyebrow">Documents</p>
            <h3>Client upload checklist</h3>
          </div>
          <button
            className="os-button os-button-secondary"
            type="button"
            onClick={() =>
              setConfig({
                documentChecklist: [
                  ...config.documentChecklist,
                  defaultDocument(config.documentChecklist.length),
                ],
              })
            }
          >
            Add document
          </button>
        </div>
        {config.documentChecklist.length === 0 ? (
          <EmptyState>No requested documents configured.</EmptyState>
        ) : (
          <div className="template-builder-stack">
            {config.documentChecklist.map((document, index) => (
              <fieldset className="template-fieldset" key={`${document.code}-${index}`}>
                <legend>Document {index + 1}</legend>
                <div className="catalog-form wide-form">
                  <label>
                    Code
                    <input
                      required
                      value={document.code}
                      onChange={(event) => updateDocument(index, { code: event.target.value })}
                    />
                  </label>
                  <label>
                    Order
                    <input
                      min="0"
                      type="number"
                      value={document.sortOrder}
                      onChange={(event) =>
                        updateDocument(index, { sortOrder: Number(event.target.value) })
                      }
                    />
                  </label>
                  <label>
                    English label
                    <input
                      required
                      value={document.labelEn}
                      onChange={(event) => updateDocument(index, { labelEn: event.target.value })}
                    />
                  </label>
                  <label>
                    Arabic label
                    <input
                      required
                      value={document.labelAr}
                      onChange={(event) => updateDocument(index, { labelAr: event.target.value })}
                    />
                  </label>
                  <label className="form-span">
                    English description
                    <textarea
                      rows={2}
                      value={document.descriptionEn}
                      onChange={(event) =>
                        updateDocument(index, { descriptionEn: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Accepted file types JSON
                    <input
                      placeholder='["application/pdf"]'
                      value={document.acceptedFileTypes}
                      onChange={(event) =>
                        updateDocument(index, { acceptedFileTypes: event.target.value })
                      }
                    />
                  </label>
                  <label className="checkbox-label">
                    <input
                      checked={document.required}
                      type="checkbox"
                      onChange={(event) =>
                        updateDocument(index, { required: event.target.checked })
                      }
                    />
                    Required
                  </label>
                  <label className="checkbox-label">
                    <input
                      checked={document.uploadRequired}
                      type="checkbox"
                      onChange={(event) =>
                        updateDocument(index, { uploadRequired: event.target.checked })
                      }
                    />
                    Upload required
                  </label>
                  <button
                    className="os-button os-button-danger"
                    type="button"
                    onClick={() =>
                      setConfig({
                        documentChecklist: config.documentChecklist.filter(
                          (_, documentIndex) => documentIndex !== index,
                        ),
                      })
                    }
                  >
                    Remove document
                  </button>
                </div>
              </fieldset>
            ))}
          </div>
        )}
      </section>

      <details className="template-builder-section form-span">
        <summary>Reference files and technical payload</summary>
        <div className="entity-card-heading">
          <div>
            <p className="eyebrow">Files</p>
            <h3>Reference file metadata</h3>
          </div>
          <button
            className="os-button os-button-secondary"
            type="button"
            onClick={() =>
              setConfig({
                downloadableFiles: [
                  ...config.downloadableFiles,
                  defaultFile(config.downloadableFiles.length),
                ],
              })
            }
          >
            Add reference file
          </button>
        </div>
        {config.downloadableFiles.map((file, index) => (
          <fieldset className="template-fieldset" key={`${file.code}-${index}`}>
            <legend>Reference file {index + 1}</legend>
            <div className="catalog-form wide-form">
              <label>
                Code
                <input
                  required
                  value={file.code}
                  onChange={(event) => updateFile(index, { code: event.target.value })}
                />
              </label>
              <label>
                English title
                <input
                  required
                  value={file.titleEn}
                  onChange={(event) => updateFile(index, { titleEn: event.target.value })}
                />
              </label>
              <label>
                Arabic title
                <input
                  required
                  value={file.titleAr}
                  onChange={(event) => updateFile(index, { titleAr: event.target.value })}
                />
              </label>
              <label>
                File name
                <input
                  value={file.fileName}
                  onChange={(event) => updateFile(index, { fileName: event.target.value })}
                />
              </label>
              <label>
                Storage key
                <input
                  value={file.storageKey}
                  onChange={(event) => updateFile(index, { storageKey: event.target.value })}
                />
              </label>
              <label className="checkbox-label">
                <input
                  checked={file.clientVisible}
                  type="checkbox"
                  onChange={(event) => updateFile(index, { clientVisible: event.target.checked })}
                />
                Client visible
              </label>
              <label className="checkbox-label">
                <input
                  checked={file.returnUploadRequired}
                  type="checkbox"
                  onChange={(event) =>
                    updateFile(index, { returnUploadRequired: event.target.checked })
                  }
                />
                Return upload required
              </label>
              <button
                className="os-button os-button-danger"
                type="button"
                onClick={() =>
                  setConfig({
                    downloadableFiles: config.downloadableFiles.filter(
                      (_, fileIndex) => fileIndex !== index,
                    ),
                  })
                }
              >
                Remove file
              </button>
            </div>
          </fieldset>
        ))}
        <label className="form-span">
          Technical payload preview
          <textarea readOnly rows={18} value={previewPayload} />
        </label>
      </details>
    </div>
  );
}

export function RequestTemplateManager({
  initialSnapshot,
}: {
  initialSnapshot: RequestTemplatesSnapshot;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [selectedServiceItemId, setSelectedServiceItemId] = useState(
    initialSnapshot.serviceItems[0]?.id ?? "",
  );
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const selected = useMemo(
    () => snapshot.serviceItems.find((item) => item.id === selectedServiceItemId) ?? null,
    [selectedServiceItemId, snapshot.serviceItems],
  );
  const currentVersion = versionForEditing(selected);
  const [editor, setEditor] = useState(versionToEditableConfig(currentVersion));
  const templateCounts = useMemo(
    () => ({
      active: snapshot.serviceItems.filter((item) => item.template?.active).length,
      suggested: snapshot.serviceItems.filter((item) => item.template?.suggested).length,
      missing: snapshot.serviceItems.filter((item) => !item.template?.active).length,
    }),
    [snapshot.serviceItems],
  );

  function selectServiceItem(item: RequestTemplateServiceItem) {
    setSelectedServiceItemId(item.id);
    setEditor(versionToEditableConfig(versionForEditing(item)));
    setError(undefined);
    setSuccess(undefined);
  }

  function saved(nextSnapshot: RequestTemplatesSnapshot, message: string) {
    setSnapshot(nextSnapshot);
    const nextSelected =
      nextSnapshot.serviceItems.find((item) => item.id === selectedServiceItemId) ??
      nextSnapshot.serviceItems[0] ??
      null;
    if (nextSelected) {
      setSelectedServiceItemId(nextSelected.id);
      setEditor(versionToEditableConfig(versionForEditing(nextSelected)));
    }
    setSuccess(message);
    setError(undefined);
  }

  async function applySuggested() {
    if (!selected) return;
    try {
      saved(await applySuggestedRequestTemplate(selected.id), "Suggested template applied.");
    } catch (caught) {
      setError(requestTemplateErrorMessage(caught));
    }
  }

  async function submitRevision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    try {
      const payload = editableConfigToPayload(editor);
      saved(await reviseRequestTemplate(selected.id, payload), "Template version saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : requestTemplateErrorMessage(caught));
      setSuccess(undefined);
    }
  }

  async function archiveActive() {
    if (!selected?.template?.active) return;
    try {
      saved(
        await changeRequestTemplateVersionStatus(
          selected.template.active.templateId,
          selected.template.active.id,
          "ARCHIVED",
          "Archived from Admin request templates",
        ),
        "Active template archived.",
      );
    } catch (caught) {
      setError(requestTemplateErrorMessage(caught));
    }
  }

  function applyEditorPreset(presetId: TemplatePresetId) {
    setEditor(buildPresetConfig(presetId, selected));
    setSuccess(`Preset applied in the editor. Review it, then save as Draft or Active.`);
    setError(undefined);
  }

  const recommendedPreset = classifyPreset(selected);

  return (
    <>
      <SectionHeader
        eyebrow="Admin request templates"
        title="Service item form builder"
        description="Build client-facing request forms per service item without editing raw JSON. Saving creates a new template version and preserves old request answers."
      />
      <CatalogFeedback error={error} success={success} />

      <section className="metric-grid" aria-label="Request template summary">
        <MetricCard
          label="Service items"
          value={snapshot.serviceItems.length}
          detail="Template-capable items"
        />
        <MetricCard
          label="Active templates"
          value={templateCounts.active}
          detail="Client-facing forms"
          accent
        />
        <MetricCard
          label="Suggested templates"
          value={templateCounts.suggested}
          detail="Ready to apply"
        />
        <MetricCard
          label="Missing active"
          value={templateCounts.missing}
          detail="Needs configuration"
        />
      </section>

      <section className="quote-summary-grid">
        <SectionCard
          title="Service item template status"
          description="Select a service item to inspect, apply, archive, or revise its request form."
        >
          <div className="activity-list">
            {snapshot.serviceItems.map((item) => (
              <button
                className="os-button os-button-quiet"
                key={item.id}
                type="button"
                aria-pressed={item.id === selectedServiceItemId}
                onClick={() => selectServiceItem(item)}
              >
                <strong>{item.latestRevision?.nameEn ?? item.code}</strong>
                <small>
                  {item.code} - {item.template?.active ? "active" : "no active"} -{" "}
                  {item.template?.suggested ? "suggested available" : "no suggestion"} -{" "}
                  {item.template?.drafts.length ?? 0} drafts
                </small>
              </button>
            ))}
          </div>
        </SectionCard>

        <FieldLibraryPanel fields={snapshot.fieldLibrary} onSaved={saved} onError={setError} />
      </section>

      <section className="quote-summary-grid">
        <SectionCard
          title={selected?.latestRevision?.nameEn ?? "Select a service item"}
          description={
            selected?.latestRevision?.expectedOutput ??
            "Choose a service item to inspect, apply, or revise its request template."
          }
        >
          <dl className="quote-definition-list">
            <div>
              <dt>Service item</dt>
              <dd>{selected?.code ?? "-"}</dd>
            </div>
            <div>
              <dt>Monthly service</dt>
              <dd>{selected?.monthlyService.code ?? "-"}</dd>
            </div>
            <div>
              <dt>Active template</dt>
              <dd>{selected?.template?.active ? `v${selected.template.active.version}` : "No"}</dd>
            </div>
          </dl>
          <div className="row-actions">
            <button
              className="os-button os-button-secondary"
              type="button"
              disabled={!selected?.template?.suggested}
              onClick={() => void applySuggested()}
            >
              Apply suggested
            </button>
            <button
              className="os-button os-button-danger"
              type="button"
              disabled={!selected?.template?.active}
              onClick={() => void archiveActive()}
            >
              Archive active
            </button>
          </div>
          <TemplatePreview version={currentVersion} />
        </SectionCard>

        <SectionCard
          title="Build template version"
          description="Add sections, fields, options, and document requirements. Save as Draft for review or Active to publish it immediately for client request creation."
        >
          <form className="template-save-form" onSubmit={submitRevision}>
            <section className="template-preset-studio">
              <div className="entity-card-heading">
                <div>
                  <p className="eyebrow">Smart defaults</p>
                  <h3>Start from a practical service-item form</h3>
                </div>
                <span className="template-recommended-pill">
                  Recommended:{" "}
                  {templatePresetDefinitions.find((preset) => preset.id === recommendedPreset)
                    ?.title ?? "نموذج عام مرن"}
                </span>
              </div>
              <div className="template-preset-grid">
                {templatePresetDefinitions.map((preset) => (
                  <button
                    className={
                      preset.id === recommendedPreset
                        ? "template-preset-card recommended"
                        : "template-preset-card"
                    }
                    key={preset.id}
                    type="button"
                    onClick={() => applyEditorPreset(preset.id)}
                  >
                    <strong>{preset.title}</strong>
                    <small>{preset.description}</small>
                  </button>
                ))}
              </div>
            </section>
            <TemplateBuilder
              config={editor}
              fieldLibrary={snapshot.fieldLibrary}
              onChange={setEditor}
            />
            <div className="form-actions">
              <button
                className="os-button os-button-secondary"
                type="button"
                onClick={() => setEditor(versionToEditableConfig(currentVersion))}
              >
                Reset editor
              </button>
              <button className="os-button os-button-primary" type="submit" disabled={!selected}>
                Save new template version
              </button>
            </div>
          </form>
        </SectionCard>
      </section>
    </>
  );
}
