import type { REQUEST_TEMPLATE_FIELD_TYPES } from "./request-templates.constants.js";

type FieldType = (typeof REQUEST_TEMPLATE_FIELD_TYPES)[number];

export type DefaultTemplateOption = {
  value: string;
  labelAr: string;
  labelEn: string;
  sortOrder: number;
};

export type DefaultTemplateSection = {
  code: string;
  titleAr: string;
  titleEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  sortOrder: number;
};

export type DefaultTemplateField = {
  code: string;
  sectionCode: string;
  fieldType: FieldType;
  labelAr: string;
  labelEn: string;
  helpTextAr?: string;
  helpTextEn?: string;
  required: boolean;
  clientVisible: boolean;
  sortOrder: number;
  systemKey?: string;
  validation?: unknown;
  options?: DefaultTemplateOption[];
};

export type DefaultTemplateDocument = {
  code: string;
  labelAr: string;
  labelEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  required: boolean;
  uploadRequired: boolean;
  acceptedFileTypes?: string[];
  sortOrder: number;
};

export type DefaultServiceItemRequestTemplate = {
  instructionsAr: string;
  instructionsEn: string;
  reason: string;
  sections: DefaultTemplateSection[];
  fields: DefaultTemplateField[];
  downloadableFiles: [];
  documentChecklist: DefaultTemplateDocument[];
  snapshot: {
    source: string;
    presetId: string;
    serviceItemCode: string;
    serviceItemNameAr: string;
    serviceItemNameEn: string;
    expectedOutput: string | null;
    editableByAdmin: true;
  };
};

type ServiceItemTemplateInput = {
  code: string;
  nameAr: string;
  nameEn: string;
  expectedOutput?: string | null;
  requiresFile?: boolean;
  requestType?: string | null;
  monthlyServiceCode?: string;
};

const uploadTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
];

const urgencyOptions: DefaultTemplateOption[] = [
  { value: "normal", labelAr: "عادي", labelEn: "Normal", sortOrder: 1 },
  { value: "high", labelAr: "مرتفع", labelEn: "High", sortOrder: 2 },
  { value: "urgent", labelAr: "عاجل", labelEn: "Urgent", sortOrder: 3 },
];

function haystack(input: ServiceItemTemplateInput): string {
  return [
    input.code,
    input.nameAr,
    input.nameEn,
    input.expectedOutput,
    input.requestType,
    input.monthlyServiceCode,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function includesAny(value: string, terms: string[]): boolean {
  return terms.some((term) => value.includes(term.toLowerCase()));
}

function commonSections(): DefaultTemplateSection[] {
  return [
    {
      code: "request_context",
      titleAr: "سياق الطلب",
      titleEn: "Request context",
      descriptionAr: "المعلومات الأساسية التي تساعد فريق جزوم على فهم المطلوب بسرعة.",
      descriptionEn: "Core context that helps Jzoom understand the request quickly.",
      sortOrder: 1,
    },
    {
      code: "execution_details",
      titleAr: "تفاصيل التنفيذ",
      titleEn: "Execution details",
      descriptionAr: "المدخلات التفصيلية، القيود، الموعد، والأولويات الخاصة بهذا البند.",
      descriptionEn: "Detailed inputs, constraints, deadline, and priorities for this item.",
      sortOrder: 2,
    },
  ];
}

function commonFields(): DefaultTemplateField[] {
  return [
    {
      code: "request_summary",
      sectionCode: "request_context",
      fieldType: "LONG_TEXT",
      labelAr: "ملخص المطلوب",
      labelEn: "Request summary",
      helpTextAr: "اكتب المطلوب والنتيجة المتوقعة بلغة واضحة.",
      helpTextEn: "Describe the needed work and expected result clearly.",
      required: true,
      clientVisible: true,
      sortOrder: 1,
      systemKey: "request_summary",
    },
    {
      code: "business_context",
      sectionCode: "request_context",
      fieldType: "LONG_TEXT",
      labelAr: "سياق العمل",
      labelEn: "Business context",
      helpTextAr: "اذكر القسم أو العملية أو الحالة التجارية المرتبطة بالطلب.",
      helpTextEn: "Mention the department, process, or business situation behind the request.",
      required: false,
      clientVisible: true,
      sortOrder: 2,
      systemKey: "business_context",
    },
    {
      code: "urgency",
      sectionCode: "execution_details",
      fieldType: "DROPDOWN",
      labelAr: "الأولوية",
      labelEn: "Urgency",
      required: true,
      clientVisible: true,
      sortOrder: 20,
      systemKey: "urgency",
      options: urgencyOptions,
    },
    {
      code: "preferred_deadline",
      sectionCode: "execution_details",
      fieldType: "DATE",
      labelAr: "الموعد المفضل للتسليم",
      labelEn: "Preferred deadline",
      required: false,
      clientVisible: true,
      sortOrder: 21,
      systemKey: "preferred_deadline",
    },
  ];
}

function supportingDocuments(required: boolean): DefaultTemplateDocument[] {
  return [
    {
      code: "supporting_documents",
      labelAr: "المستندات الداعمة",
      labelEn: "Supporting documents",
      descriptionAr: "أرفق أي ملفات أو صور أو جداول تساعد الفريق على تنفيذ الطلب.",
      descriptionEn:
        "Attach any files, screenshots, or sheets that help the team complete the work.",
      required,
      uploadRequired: required,
      acceptedFileTypes: uploadTypes,
      sortOrder: 1,
    },
  ];
}

function presetFields(presetId: string): DefaultTemplateField[] {
  switch (presetId) {
    case "hr_document":
      return [
        {
          code: "employee_name",
          sectionCode: "execution_details",
          fieldType: "SHORT_TEXT",
          labelAr: "اسم الموظف",
          labelEn: "Employee name",
          required: true,
          clientVisible: true,
          sortOrder: 3,
          systemKey: "employee_name",
        },
        {
          code: "employee_identifier",
          sectionCode: "execution_details",
          fieldType: "SHORT_TEXT",
          labelAr: "رقم الموظف أو الهوية",
          labelEn: "Employee ID",
          required: false,
          clientVisible: true,
          sortOrder: 4,
          systemKey: "employee_identifier",
        },
        {
          code: "document_purpose",
          sectionCode: "execution_details",
          fieldType: "DROPDOWN",
          labelAr: "الغرض من المستند",
          labelEn: "Document purpose",
          required: true,
          clientVisible: true,
          sortOrder: 5,
          options: [
            { value: "bank", labelAr: "بنك", labelEn: "Bank", sortOrder: 1 },
            { value: "embassy", labelAr: "سفارة", labelEn: "Embassy", sortOrder: 2 },
            { value: "government", labelAr: "جهة حكومية", labelEn: "Government", sortOrder: 3 },
            { value: "other", labelAr: "أخرى", labelEn: "Other", sortOrder: 4 },
          ],
        },
      ];
    case "policy":
      return [
        {
          code: "policy_scope",
          sectionCode: "execution_details",
          fieldType: "LONG_TEXT",
          labelAr: "نطاق السياسة أو الإجراء",
          labelEn: "Policy or procedure scope",
          required: true,
          clientVisible: true,
          sortOrder: 3,
        },
        {
          code: "current_process",
          sectionCode: "execution_details",
          fieldType: "LONG_TEXT",
          labelAr: "الوضع الحالي أو الإجراء الحالي",
          labelEn: "Current process",
          required: false,
          clientVisible: true,
          sortOrder: 4,
        },
        {
          code: "approval_owner",
          sectionCode: "execution_details",
          fieldType: "SHORT_TEXT",
          labelAr: "صاحب الاعتماد",
          labelEn: "Approval owner",
          required: false,
          clientVisible: true,
          sortOrder: 5,
        },
      ];
    case "finance":
      return [
        {
          code: "period",
          sectionCode: "execution_details",
          fieldType: "SHORT_TEXT",
          labelAr: "الفترة المالية",
          labelEn: "Financial period",
          required: true,
          clientVisible: true,
          sortOrder: 3,
        },
        {
          code: "amount",
          sectionCode: "execution_details",
          fieldType: "AMOUNT",
          labelAr: "المبلغ إن وجد",
          labelEn: "Amount if applicable",
          required: false,
          clientVisible: true,
          sortOrder: 4,
        },
        {
          code: "tax_related",
          sectionCode: "execution_details",
          fieldType: "CHECKBOX",
          labelAr: "مرتبط بالضريبة",
          labelEn: "Tax related",
          required: false,
          clientVisible: true,
          sortOrder: 5,
        },
      ];
    case "reporting":
      return [
        {
          code: "report_period",
          sectionCode: "execution_details",
          fieldType: "SHORT_TEXT",
          labelAr: "فترة التقرير",
          labelEn: "Report period",
          required: true,
          clientVisible: true,
          sortOrder: 3,
        },
        {
          code: "audience",
          sectionCode: "execution_details",
          fieldType: "DROPDOWN",
          labelAr: "الجمهور المستهدف",
          labelEn: "Target audience",
          required: true,
          clientVisible: true,
          sortOrder: 4,
          options: [
            { value: "management", labelAr: "الإدارة", labelEn: "Management", sortOrder: 1 },
            { value: "team", labelAr: "فريق العمل", labelEn: "Team", sortOrder: 2 },
            { value: "client", labelAr: "العميل", labelEn: "Client", sortOrder: 3 },
          ],
        },
        {
          code: "metrics_needed",
          sectionCode: "execution_details",
          fieldType: "LONG_TEXT",
          labelAr: "المؤشرات المطلوبة",
          labelEn: "Required metrics",
          required: true,
          clientVisible: true,
          sortOrder: 5,
        },
      ];
    case "digital":
      return [
        {
          code: "platform_or_system",
          sectionCode: "execution_details",
          fieldType: "SHORT_TEXT",
          labelAr: "النظام أو المنصة",
          labelEn: "Platform or system",
          required: true,
          clientVisible: true,
          sortOrder: 3,
        },
        {
          code: "access_context",
          sectionCode: "execution_details",
          fieldType: "LONG_TEXT",
          labelAr: "صلاحيات الدخول أو القيود",
          labelEn: "Access context or constraints",
          required: false,
          clientVisible: true,
          sortOrder: 4,
        },
        {
          code: "target_outcome",
          sectionCode: "execution_details",
          fieldType: "LONG_TEXT",
          labelAr: "النتيجة التقنية المطلوبة",
          labelEn: "Target technical outcome",
          required: true,
          clientVisible: true,
          sortOrder: 5,
        },
      ];
    case "legal":
      return [
        {
          code: "counterparty",
          sectionCode: "execution_details",
          fieldType: "SHORT_TEXT",
          labelAr: "الطرف الآخر",
          labelEn: "Counterparty",
          required: true,
          clientVisible: true,
          sortOrder: 3,
        },
        {
          code: "document_type",
          sectionCode: "execution_details",
          fieldType: "DROPDOWN",
          labelAr: "نوع المستند",
          labelEn: "Document type",
          required: true,
          clientVisible: true,
          sortOrder: 4,
          options: [
            { value: "contract", labelAr: "عقد", labelEn: "Contract", sortOrder: 1 },
            { value: "agreement", labelAr: "اتفاقية", labelEn: "Agreement", sortOrder: 2 },
            { value: "letter", labelAr: "خطاب", labelEn: "Letter", sortOrder: 3 },
            { value: "other", labelAr: "أخرى", labelEn: "Other", sortOrder: 4 },
          ],
        },
        {
          code: "risk_notes",
          sectionCode: "execution_details",
          fieldType: "LONG_TEXT",
          labelAr: "نقاط الخطر أو الملاحظات",
          labelEn: "Risk notes",
          required: false,
          clientVisible: true,
          sortOrder: 5,
        },
      ];
    default:
      return [
        {
          code: "stakeholders",
          sectionCode: "execution_details",
          fieldType: "SHORT_TEXT",
          labelAr: "الأطراف المعنية",
          labelEn: "Stakeholders",
          required: false,
          clientVisible: true,
          sortOrder: 3,
        },
        {
          code: "success_criteria",
          sectionCode: "execution_details",
          fieldType: "LONG_TEXT",
          labelAr: "معيار نجاح الطلب",
          labelEn: "Success criteria",
          required: false,
          clientVisible: true,
          sortOrder: 4,
        },
      ];
  }
}

export function classifyServiceItemTemplate(input: ServiceItemTemplateInput): string {
  const value = haystack(input);
  if (includesAny(value, ["employee", "letter", "hr", "موظف", "خطاب", "تعريف", "موارد", "راتب"])) {
    return "hr_document";
  }
  if (includesAny(value, ["policy", "procedure", "sop", "سياسة", "إجراء", "لائحة"])) {
    return "policy";
  }
  if (
    includesAny(value, ["finance", "account", "invoice", "vat", "tax", "مالية", "فاتورة", "ضريبة"])
  ) {
    return "finance";
  }
  if (includesAny(value, ["report", "dashboard", "analytics", "تقرير", "تحليل", "مؤشر", "لوحة"])) {
    return "reporting";
  }
  if (
    includesAny(value, [
      "digital",
      "system",
      "integration",
      "website",
      "app",
      "data",
      "منصة",
      "نظام",
      "تكامل",
      "بيانات",
    ])
  ) {
    return "digital";
  }
  if (includesAny(value, ["legal", "contract", "agreement", "عقد", "اتفاقية", "قانون"])) {
    return "legal";
  }
  return "general";
}

export function buildDefaultServiceItemRequestTemplate(
  input: ServiceItemTemplateInput,
): DefaultServiceItemRequestTemplate {
  const presetId = classifyServiceItemTemplate(input);
  const requiresFile = Boolean(input.requiresFile);
  return {
    instructionsAr:
      "أكمل الحقول المطلوبة وارفع المستندات الداعمة عند الحاجة. يمكنك تعديل هذا النموذج من لوحة الأدمن قبل تفعيله.",
    instructionsEn:
      "Complete the required fields and upload supporting documents when needed. Admin can edit this suggested template before activating it.",
    reason: "Suggested default created with the service item",
    sections: commonSections(),
    fields: [...commonFields(), ...presetFields(presetId)],
    downloadableFiles: [],
    documentChecklist: supportingDocuments(requiresFile),
    snapshot: {
      source: "service item smart default",
      presetId,
      serviceItemCode: input.code,
      serviceItemNameAr: input.nameAr,
      serviceItemNameEn: input.nameEn,
      expectedOutput: input.expectedOutput ?? null,
      editableByAdmin: true,
    },
  };
}
