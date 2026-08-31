import type {
  RequestFieldLibraryItem,
  RequestTemplateFieldType,
  RequestTemplateServiceItem,
  RequestTemplateVersion,
} from "../../lib/request-template-types";

export type EditableTemplateStatus = "DRAFT" | "ACTIVE";

export type EditableSection = {
  active: boolean;
  code: string;
  descriptionAr: string;
  descriptionEn: string;
  sortOrder: number;
  titleAr: string;
  titleEn: string;
};

export type EditableOption = {
  active: boolean;
  labelAr: string;
  labelEn: string;
  sortOrder: number;
  value: string;
};

export type EditableField = {
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

export type EditableFile = {
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

export type EditableDocument = {
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

export type EditableTemplateConfig = {
  documentChecklist: EditableDocument[];
  downloadableFiles: EditableFile[];
  fields: EditableField[];
  instructionsAr: string;
  instructionsEn: string;
  reason: string;
  sections: EditableSection[];
  status: EditableTemplateStatus;
};

export type TemplatePayload = {
  documentChecklist: Array<Record<string, unknown>>;
  downloadableFiles: Array<Record<string, unknown>>;
  fields: Array<Record<string, unknown>>;
  instructionsAr?: string;
  instructionsEn?: string;
  reason: string;
  sections: Array<Record<string, unknown>>;
  status: EditableTemplateStatus;
};

export const optionFieldTypes: RequestTemplateFieldType[] = ["DROPDOWN", "MULTI_SELECT", "RADIO"];

function optionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizedCode(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function jsonText(value: unknown): string {
  if (value === null || value === undefined) return "";
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function parseOptionalJson(value: string, label: string): unknown | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    throw new Error(`تأكد من صحة الإعدادات المتقدمة للحقل: ${label}`);
  }
}

export function validationRecord(field: Pick<EditableField, "validation">) {
  try {
    const parsed = JSON.parse(field.validation || "{}") as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function withValidation(
  field: EditableField,
  patch: Record<string, unknown | undefined>,
): EditableField {
  const validation = { ...validationRecord(field) };
  Object.entries(patch).forEach(([key, value]) => {
    if (value === undefined || value === "" || value === false) delete validation[key];
    else validation[key] = value;
  });
  return {
    ...field,
    validation: Object.keys(validation).length > 0 ? JSON.stringify(validation) : "",
  };
}

export function defaultSection(index = 0): EditableSection {
  return {
    active: true,
    code: index === 0 ? "basic_request_information" : `section_${index + 1}`,
    descriptionAr: "",
    descriptionEn: "",
    sortOrder: index + 1,
    titleAr: index === 0 ? "بيانات الطلب الأساسية" : `قسم جديد ${index + 1}`,
    titleEn: index === 0 ? "Basic request information" : `New section ${index + 1}`,
  };
}

export function uniqueCode(prefix: string, existingCodes: string[]): string {
  let index = existingCodes.length + 1;
  let code = `${prefix}_${index}`;
  while (existingCodes.includes(code)) {
    index += 1;
    code = `${prefix}_${index}`;
  }
  return code;
}

export function defaultOption(index: number): EditableOption {
  return {
    active: true,
    labelAr: `خيار ${index + 1}`,
    labelEn: `Option ${index + 1}`,
    sortOrder: index + 1,
    value: `option_${index + 1}`,
  };
}

export function defaultField(
  sectionCode: string,
  fieldType: RequestTemplateFieldType,
  existingCodes: string[],
): EditableField {
  const typeDefaults: Partial<Record<RequestTemplateFieldType, [string, string, string]>> = {
    NOTE: ["ملاحظة مهمة", "Important note", "note"],
    FILE: ["المستند المطلوب", "Required document", "document"],
    NUMBER: ["الرقم المطلوب", "Required number", "number"],
    AMOUNT: ["المبلغ", "Amount", "amount"],
    DATE: ["التاريخ", "Date", "date"],
    DROPDOWN: ["اختر من القائمة", "Choose from the list", "selection"],
    MULTI_SELECT: ["اختر الخيارات المناسبة", "Choose applicable options", "selections"],
    CHECKBOX: ["تأكيد", "Confirmation", "confirmation"],
  };
  const [labelAr, labelEn, prefix] = typeDefaults[fieldType] ?? ["حقل جديد", "New field", "field"];
  let field: EditableField = {
    clientVisible: true,
    code: uniqueCode(prefix, existingCodes),
    defaultValue: "",
    fieldType,
    helpTextAr: fieldType === "NOTE" ? "اكتب هنا المعلومة التي يجب أن يقرأها العميل." : "",
    helpTextEn: fieldType === "NOTE" ? "Add the information the client should read here." : "",
    labelAr,
    labelEn,
    libraryFieldCode: "",
    options: optionFieldTypes.includes(fieldType) ? [defaultOption(0), defaultOption(1)] : [],
    required: false,
    sectionCode,
    sortOrder: existingCodes.length + 1,
    systemKey: "",
    validation: "",
  };
  if (fieldType === "NOTE") field = withValidation(field, { layoutWidth: "FULL" });
  if (fieldType === "FILE") {
    field = withValidation(field, {
      accept: ".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg",
      layoutWidth: "FULL",
    });
  }
  return field;
}

export function fieldFromLibrary(
  libraryField: RequestFieldLibraryItem,
  sectionCode: string,
  existingCodes: string[],
): EditableField {
  const code = existingCodes.includes(libraryField.code)
    ? uniqueCode(libraryField.code, existingCodes)
    : libraryField.code;
  let field: EditableField = {
    ...defaultField(sectionCode, libraryField.fieldType, existingCodes),
    code,
    fieldType: libraryField.fieldType,
    helpTextAr: libraryField.helpTextAr ?? "",
    helpTextEn: libraryField.helpTextEn ?? "",
    labelAr: libraryField.labelAr,
    labelEn: libraryField.labelEn,
    libraryFieldCode: libraryField.code,
    systemKey: libraryField.systemKey ?? "",
  };
  field = withValidation(field, {
    placeholderAr: libraryField.placeholderAr ?? undefined,
    placeholderEn: libraryField.placeholderEn ?? undefined,
  });
  return field;
}

function starterField(
  code: string,
  labelAr: string,
  labelEn: string,
  fieldType: RequestTemplateFieldType,
  required: boolean,
  sortOrder: number,
  sectionCode = "request_details",
): EditableField {
  let field: EditableField = {
    ...defaultField(sectionCode, fieldType, []),
    code,
    labelAr,
    labelEn,
    required,
    sortOrder,
    systemKey: code,
  };
  if (fieldType === "LONG_TEXT") field = withValidation(field, { layoutWidth: "FULL" });
  return field;
}

export function buildStarterConfig(
  item: RequestTemplateServiceItem | null,
): EditableTemplateConfig {
  const searchable = [
    item?.code,
    item?.latestRevision?.nameAr,
    item?.latestRevision?.nameEn,
    item?.monthlyService.code,
    item?.monthlyService.revisions?.[0]?.nameAr,
    item?.monthlyService.revisions?.[0]?.nameEn,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const fields = [
    starterField("request_summary", "ملخص المطلوب", "Request summary", "LONG_TEXT", true, 1),
    starterField("preferred_deadline", "الموعد المفضل", "Preferred deadline", "DATE", false, 2),
  ];
  if (/(hr|موارد|موظف|راتب|خطاب)/i.test(searchable)) {
    fields.splice(
      1,
      0,
      starterField("employee_name", "اسم الموظف", "Employee name", "SHORT_TEXT", true, 2),
      starterField(
        "employee_identifier",
        "رقم الموظف أو الهوية",
        "Employee ID",
        "SHORT_TEXT",
        false,
        3,
      ),
    );
  } else if (/(finance|account|tax|vat|مالية|ضريبة|فاتورة)/i.test(searchable)) {
    fields.splice(
      1,
      0,
      starterField("financial_period", "الفترة المالية", "Financial period", "SHORT_TEXT", true, 2),
      starterField("amount", "المبلغ إن وجد", "Amount if applicable", "AMOUNT", false, 3),
    );
  } else if (/(legal|contract|قانون|عقد|اتفاقية)/i.test(searchable)) {
    fields.splice(
      1,
      0,
      starterField("counterparty", "الطرف الآخر", "Counterparty", "SHORT_TEXT", true, 2),
    );
  }
  if (item?.latestRevision?.requiresFile) {
    fields.push(
      defaultField(
        "request_details",
        "FILE",
        fields.map((field) => field.code),
      ),
    );
  }
  return {
    documentChecklist: [],
    downloadableFiles: [],
    fields: fields.map((field, index) => ({ ...field, sortOrder: index + 1 })),
    instructionsAr: "أكمل البيانات المطلوبة حتى يتمكن فريق جزوم من تنفيذ طلبك بدقة.",
    instructionsEn: "Complete the required details so Jzoom can process your request accurately.",
    reason: "إنشاء نموذج مقترح من مصمم نماذج الطلبات",
    sections: [
      {
        ...defaultSection(),
        code: "request_details",
        titleAr: "تفاصيل الطلب",
        titleEn: "Request details",
      },
    ],
    status: "DRAFT",
  };
}

export function versionForEditing(item: RequestTemplateServiceItem | null) {
  return item?.template?.drafts[0] ?? item?.template?.active ?? item?.template?.suggested ?? null;
}

export function versionToEditableConfig(
  version: RequestTemplateVersion | null,
): EditableTemplateConfig {
  if (!version) {
    return {
      documentChecklist: [],
      downloadableFiles: [],
      fields: [],
      instructionsAr: "",
      instructionsEn: "",
      reason: "إنشاء من مصمم نماذج الطلبات",
      sections: [defaultSection()],
      status: "DRAFT",
    };
  }
  return {
    documentChecklist: version.documentChecklist.map((document) => ({
      acceptedFileTypes: jsonText(document.acceptedFileTypes),
      code: document.code,
      descriptionAr: document.descriptionAr ?? "",
      descriptionEn: document.descriptionEn ?? "",
      labelAr: document.labelAr,
      labelEn: document.labelEn,
      required: document.required,
      sortOrder: document.sortOrder,
      uploadRequired: document.uploadRequired,
    })),
    downloadableFiles: version.downloadableFiles.map((file) => ({
      clientVisible: file.clientVisible,
      code: file.code,
      descriptionAr: file.descriptionAr ?? "",
      descriptionEn: file.descriptionEn ?? "",
      fileName: file.fileName ?? "",
      fileType: file.fileType ?? "",
      mimeType: file.mimeType ?? "",
      required: file.required,
      returnUploadRequired: file.returnUploadRequired,
      sortOrder: file.sortOrder,
      storageKey: file.storageKey ?? "",
      titleAr: file.titleAr,
      titleEn: file.titleEn,
    })),
    fields: version.fields.map((field) => ({
      clientVisible: field.clientVisible,
      code: field.code,
      defaultValue: jsonText(field.defaultValue),
      fieldType: field.fieldType,
      helpTextAr: field.helpTextAr ?? "",
      helpTextEn: field.helpTextEn ?? "",
      labelAr: field.labelAr,
      labelEn: field.labelEn,
      libraryFieldCode: field.libraryFieldCode ?? "",
      options: field.options.map((option) => ({
        active: option.status === "ACTIVE",
        labelAr: option.labelAr,
        labelEn: option.labelEn,
        sortOrder: option.sortOrder,
        value: option.value,
      })),
      required: field.fieldType === "NOTE" ? false : field.required,
      sectionCode: field.sectionCode ?? "",
      sortOrder: field.sortOrder,
      systemKey: field.systemKey ?? "",
      validation: jsonText(field.validation),
    })),
    instructionsAr: version.instructionsAr ?? "",
    instructionsEn: version.instructionsEn ?? "",
    reason: "تعديل من مصمم نماذج الطلبات",
    sections: version.sections.map((section) => ({
      active: section.status === "ACTIVE",
      code: section.code,
      descriptionAr: section.descriptionAr ?? "",
      descriptionEn: section.descriptionEn ?? "",
      sortOrder: section.sortOrder,
      titleAr: section.titleAr,
      titleEn: section.titleEn,
    })),
    status: "DRAFT",
  };
}

export function editableConfigToPayload(
  config: EditableTemplateConfig,
  status: EditableTemplateStatus = config.status,
): TemplatePayload {
  const payload: TemplatePayload = {
    documentChecklist: config.documentChecklist.map((document) => {
      const acceptedFileTypes = parseOptionalJson(
        document.acceptedFileTypes,
        document.labelAr || document.code,
      );
      return {
        code: document.code,
        labelAr: document.labelAr,
        labelEn: document.labelEn || document.labelAr,
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
    downloadableFiles: config.downloadableFiles.map((file) => ({
      code: file.code,
      titleAr: file.titleAr,
      titleEn: file.titleEn || file.titleAr,
      ...(optionalText(file.descriptionAr) ? { descriptionAr: file.descriptionAr.trim() } : {}),
      ...(optionalText(file.descriptionEn) ? { descriptionEn: file.descriptionEn.trim() } : {}),
      ...(optionalText(file.fileName) ? { fileName: file.fileName.trim() } : {}),
      ...(optionalText(file.fileType) ? { fileType: file.fileType.trim() } : {}),
      ...(optionalText(file.mimeType) ? { mimeType: file.mimeType.trim() } : {}),
      ...(optionalText(file.storageKey) ? { storageKey: file.storageKey.trim() } : {}),
      required: file.required,
      returnUploadRequired: file.returnUploadRequired,
      clientVisible: file.clientVisible,
      sortOrder: file.sortOrder,
    })),
    fields: config.fields.map((field) => {
      const defaultValue = parseOptionalJson(field.defaultValue, field.labelAr || field.code);
      const validation = parseOptionalJson(field.validation, field.labelAr || field.code);
      return {
        code: field.code,
        ...(optionalText(field.sectionCode) ? { sectionCode: field.sectionCode.trim() } : {}),
        ...(optionalText(field.libraryFieldCode)
          ? { libraryFieldCode: field.libraryFieldCode.trim() }
          : {}),
        ...(optionalText(field.systemKey) ? { systemKey: field.systemKey.trim() } : {}),
        fieldType: field.fieldType,
        labelAr: field.labelAr,
        labelEn: field.labelEn || field.labelAr,
        ...(optionalText(field.helpTextAr) ? { helpTextAr: field.helpTextAr.trim() } : {}),
        ...(optionalText(field.helpTextEn) ? { helpTextEn: field.helpTextEn.trim() } : {}),
        required: field.fieldType === "NOTE" ? false : field.required,
        clientVisible: field.clientVisible,
        ...(defaultValue !== undefined ? { defaultValue } : {}),
        ...(validation !== undefined ? { validation } : {}),
        sortOrder: field.sortOrder,
        options: optionFieldTypes.includes(field.fieldType)
          ? field.options.map((option) => ({
              active: option.active,
              labelAr: option.labelAr,
              labelEn: option.labelEn || option.labelAr,
              sortOrder: option.sortOrder,
              value: option.value,
            }))
          : [],
      };
    }),
    reason: optionalText(config.reason) ?? "تم الحفظ من مصمم نماذج الطلبات",
    sections: config.sections.map((section) => ({
      active: section.active,
      code: section.code,
      titleAr: section.titleAr,
      titleEn: section.titleEn || section.titleAr,
      ...(optionalText(section.descriptionAr)
        ? { descriptionAr: section.descriptionAr.trim() }
        : {}),
      ...(optionalText(section.descriptionEn)
        ? { descriptionEn: section.descriptionEn.trim() }
        : {}),
      sortOrder: section.sortOrder,
    })),
    status,
  };
  if (optionalText(config.instructionsAr)) payload.instructionsAr = config.instructionsAr.trim();
  if (optionalText(config.instructionsEn)) payload.instructionsEn = config.instructionsEn.trim();
  return payload;
}

export function editableConfigToVersion(config: EditableTemplateConfig): RequestTemplateVersion {
  const payload = editableConfigToPayload(config, config.status);
  return {
    createdAt: new Date(0).toISOString(),
    documentChecklist: payload.documentChecklist.map((document, index) => ({
      acceptedFileTypes: document.acceptedFileTypes ?? null,
      code: String(document.code),
      descriptionAr: typeof document.descriptionAr === "string" ? document.descriptionAr : null,
      descriptionEn: typeof document.descriptionEn === "string" ? document.descriptionEn : null,
      id: `preview-document-${index}`,
      labelAr: String(document.labelAr),
      labelEn: String(document.labelEn),
      required: document.required === true,
      sortOrder: Number(document.sortOrder ?? index),
      status: "ACTIVE",
      uploadRequired: document.uploadRequired === true,
    })),
    downloadableFiles: payload.downloadableFiles.map((file, index) => ({
      clientVisible: file.clientVisible !== false,
      code: String(file.code),
      descriptionAr: typeof file.descriptionAr === "string" ? file.descriptionAr : null,
      descriptionEn: typeof file.descriptionEn === "string" ? file.descriptionEn : null,
      fileName: typeof file.fileName === "string" ? file.fileName : null,
      fileType: typeof file.fileType === "string" ? file.fileType : null,
      id: `preview-file-${index}`,
      mimeType: typeof file.mimeType === "string" ? file.mimeType : null,
      required: file.required === true,
      returnUploadRequired: file.returnUploadRequired === true,
      revision: 1,
      sortOrder: Number(file.sortOrder ?? index),
      status: "ACTIVE",
      storageKey: null,
      storageProvider: null,
      titleAr: String(file.titleAr),
      titleEn: String(file.titleEn),
    })),
    effectiveFrom: null,
    effectiveTo: null,
    fields: payload.fields.map((field, index) => ({
      clientVisible: field.clientVisible !== false,
      code: String(field.code),
      defaultValue: field.defaultValue ?? null,
      fieldType: field.fieldType as RequestTemplateFieldType,
      helpTextAr: typeof field.helpTextAr === "string" ? field.helpTextAr : null,
      helpTextEn: typeof field.helpTextEn === "string" ? field.helpTextEn : null,
      id: `preview-field-${index}`,
      labelAr: String(field.labelAr),
      labelEn: String(field.labelEn),
      libraryFieldCode: typeof field.libraryFieldCode === "string" ? field.libraryFieldCode : null,
      options: Array.isArray(field.options)
        ? field.options.map((option, optionIndex) => {
            const item = option as Record<string, unknown>;
            return {
              id: `preview-option-${index}-${optionIndex}`,
              labelAr: String(item.labelAr ?? ""),
              labelEn: String(item.labelEn ?? ""),
              sortOrder: Number(item.sortOrder ?? optionIndex),
              status: item.active === false ? "DISABLED" : "ACTIVE",
              value: String(item.value ?? ""),
            };
          })
        : [],
      required: field.required === true,
      sectionCode: typeof field.sectionCode === "string" ? field.sectionCode : null,
      sortOrder: Number(field.sortOrder ?? index),
      source: field.libraryFieldCode ? "LIBRARY" : "CUSTOM",
      status: "ACTIVE",
      systemKey: typeof field.systemKey === "string" ? field.systemKey : null,
      validation: field.validation ?? null,
    })),
    id: "preview-version",
    instructionsAr: payload.instructionsAr ?? null,
    instructionsEn: payload.instructionsEn ?? null,
    sections: payload.sections.map((section, index) => ({
      code: String(section.code),
      descriptionAr: typeof section.descriptionAr === "string" ? section.descriptionAr : null,
      descriptionEn: typeof section.descriptionEn === "string" ? section.descriptionEn : null,
      id: `preview-section-${index}`,
      sortOrder: Number(section.sortOrder ?? index),
      status: section.active === false ? "DISABLED" : "ACTIVE",
      titleAr: String(section.titleAr),
      titleEn: String(section.titleEn),
    })),
    serviceItemId: "preview-service-item",
    status: config.status,
    templateId: "preview-template",
    updatedAt: new Date(0).toISOString(),
    version: 0,
  };
}

export function validateEditableConfig(
  config: EditableTemplateConfig,
  status: EditableTemplateStatus,
): string | null {
  const normalizedSectionCodes = config.sections.map((section) => normalizedCode(section.code));
  if (normalizedSectionCodes.some((code) => !code)) return "يوجد قسم بلا رمز داخلي.";
  if (new Set(normalizedSectionCodes).size !== normalizedSectionCodes.length) {
    return "رموز الأقسام يجب أن تكون مختلفة.";
  }
  if (config.sections.some((section) => !section.titleAr.trim())) {
    return "اكتب اسمًا عربيًا لكل قسم.";
  }

  const sectionCodes = new Set(normalizedSectionCodes);
  const normalizedFieldCodes = config.fields.map((field) => normalizedCode(field.code));
  if (normalizedFieldCodes.some((code) => !code)) return "يوجد حقل بلا رمز داخلي.";
  if (new Set(normalizedFieldCodes).size !== normalizedFieldCodes.length) {
    return "رموز الحقول يجب أن تكون مختلفة.";
  }

  for (const field of config.fields) {
    if (!field.labelAr.trim()) return "اكتب اسمًا عربيًا لكل حقل.";
    if (status === "ACTIVE" && !sectionCodes.has(normalizedCode(field.sectionCode))) {
      return `حدد قسمًا صحيحًا للحقل: ${field.labelAr}.`;
    }
    if (status === "ACTIVE" && field.fieldType === "NOTE" && !field.helpTextAr.trim()) {
      return `اكتب نص الملاحظة: ${field.labelAr}.`;
    }
    if (optionFieldTypes.includes(field.fieldType)) {
      if (field.options.length === 0) return `أضف خيارًا واحدًا على الأقل إلى: ${field.labelAr}.`;
      if (field.options.some((option) => !option.labelAr.trim() || !option.value.trim())) {
        return `أكمل جميع خيارات الحقل: ${field.labelAr}.`;
      }
      const optionValues = field.options.map(
        (option) => normalizedCode(option.value) || option.value.trim().toLowerCase(),
      );
      if (new Set(optionValues).size !== optionValues.length) {
        return `قيم خيارات الحقل يجب أن تكون مختلفة: ${field.labelAr}.`;
      }
    }
  }

  if (status === "ACTIVE" && config.fields.length === 0) {
    return "أضف حقلًا واحدًا على الأقل قبل نشر النموذج.";
  }
  return null;
}
