import { normalizeLocale, type SupportedLocale } from "../lib/i18n";

export const commercialCopy = {
  ar: {
    acceptedQuotes: "العروض المؤكدة خارج النظام",
    acceptQuote: "تأكيد الموافقة والدفع",
    activateClientServices: "تفعيل خدمات العميل",
    additional: "إضافية",
    allStatuses: "كل الحالات",
    allInvoices: "كل الفواتير",
    allQuotes: "كل عروض الأسعار",
    approver: "المعتمد",
    beforeTax: "قبل الضريبة",
    cancelInvoice: "إلغاء الفاتورة",
    cancelQuote: "إلغاء العرض",
    cancellationNote: "ملاحظة الإلغاء، إن وجدت:",
    clientSnapshot: "لقطة العميل",
    code: "الكود",
    commercialRecords: "السجلات التجارية",
    commercialSnapshots: "لقطات تجارية",
    commercialTerms: "الشروط التجارية",
    createInvoice: "إنشاء فاتورة",
    createInvoiceConfirm: (quoteNumber: string) =>
      `سيتم إنشاء فاتورة ثابتة بعد تأكيد موافقة العميل والدفع خارج النظام للعرض ${quoteNumber}. هل تريد المتابعة؟`,
    createInvoiceProgress: "جاري إنشاء الفاتورة...",
    delivery: "التسليم",
    discount: "الخصم",
    expireQuote: "إنهاء صلاحية العرض",
    finalDueBeforeTax: "المستحق النهائي قبل الضريبة",
    finalTotal: "الإجمالي النهائي",
    financialSnapshot: "اللقطة المالية",
    governance: "الحوكمة",
    internalCost: "التكلفة الداخلية",
    invoiceCreatedFrom: (quoteNumber: string, hash: string) =>
      `تم إنشاء الفاتورة من عرض سعر مؤكد خارج النظام ${quoteNumber}. بصمة اللقطة: ${hash}.`,
    invoiceDescription:
      "تُنشأ الفواتير فقط بعد تأكيد الموافقة والدفع خارج النظام، ولا تعيد حساب الكتالوج أو قواعد التسعير أو بيانات العرض.",
    invoiceLibrary: "مكتبة الفواتير",
    invoiceLineDescription: (count: number) => `${countText(count, "ar")} بنود فاتورة ثابتة.`,
    invoiceLines: "بنود الفاتورة",
    invoices: "الفواتير",
    invoiceSnapshot: "لقطة الفاتورة",
    invoiceStatusChanged: (status: string) =>
      `تم نقل الفاتورة إلى ${invoiceStatusLabel(status, "ar")}.`,
    invoiceStatusConfirm: (label: string, status: string) =>
      `${label} من الحالة الحالية ${invoiceStatusLabel(status, "ar")}؟`,
    invoiceTerminalState: "هذه الفاتورة في حالة نهائية.",
    invoiceTotal: "إجمالي الفاتورة",
    nextStep: "الخطوة التالية",
    issueDate: "تاريخ الإصدار",
    issued: "مصدرة",
    issueInvoice: "إصدار الفاتورة",
    issueQuote: "إصدار العرض",
    items: "بنود",
    legalName: "الاسم القانوني",
    lifecycle: "دورة الحالة",
    margin: "الهامش",
    monthly: "شهري",
    noInvoices:
      "يمكن تحويل عروض الأسعار المؤكدة خارج النظام إلى فواتير عندما تكون جاهزة في المسار.",
    noInvoicesTitle: "لا توجد فواتير بعد",
    noQuotes: "لم يتم إنشاء عروض أسعار بعد.",
    noQuotesTitle: "لا توجد عروض أسعار بعد",
    none: "لا يوجد",
    notAvailable: "غير متاح",
    notSpecified: "غير محدد",
    oneTime: "مرة واحدة",
    openPricingStudio: "فتح استوديو التسعير",
    payment: "الدفع",
    pricingRuleVersions: "إصدارات قواعد التسعير",
    quantity: "الكمية",
    quote: "عرض السعر",
    quoteCreatedFrom: (title: string, version: number | null, hash: string) =>
      `تم الإنشاء من ${title} بإصدار حساب ${version ? countText(version, "ar") : "غير متاح"}. بصمة اللقطة: ${hash}.`,
    quoteDescription:
      "تُنشأ عروض الأسعار من مسودات التسعير المحفوظة. لقطات العميل والخدمة وقواعد التسعير والشروط والإجماليات تبقى ثابتة.",
    quoteIssueConfirm: (label: string, status: string) =>
      `${label} من الحالة الحالية ${quoteStatusLabel(status, "ar")}؟ هذا الإجراء لا يعني أن العميل وافق داخل البوابة.`,
    quoteLineDescription: (count: number) => `${countText(count, "ar")} بنود عرض سعر ثابتة.`,
    quoteLines: "بنود عرض السعر",
    quoteLibrary: "مكتبة عروض الأسعار",
    quotes: "عروض الأسعار",
    quoteSnapshot: "لقطة عرض السعر",
    quoteStatusChanged: (status: string) =>
      `تم تغيير حالة العرض إلى ${quoteStatusLabel(status, "ar")}.`,
    readyForClient: "جاهز للموافقة والدفع خارج النظام",
    readyForHandling: "جاهزة للمعالجة الداخلية",
    readyForInvoice: "جاهز للفوترة بعد تأكيد الدفع",
    rejectQuote: "رفض العرض",
    rejectionNote: "ملاحظة الرفض، إن وجدت:",
    saving: "جاري الحفظ...",
    sector: "القطاع",
    service: "الخدمة",
    setup: "التأسيس",
    setupFees: "رسوم التأسيس",
    snapshotRecords: "سجلات ثابتة",
    terminalRecord: "سجل نهائي محفوظ",
    sourceDraft: "مسودة المصدر",
    sourceQuote: "عرض السعر المصدر",
    sourceQuoteHash: "بصمة عرض السعر",
    statusAtInvoiceCreation: "حالة العرض عند إنشاء الفاتورة",
    statusNote: "ملاحظة الحالة",
    taxSnapshot: "لقطة الضريبة",
    total: "الإجمالي",
    totalDue: "إجمالي المستحق",
    totalValue: "إجمالي القيمة",
    typePackage: "النوع / الباقة",
    unit: "الوحدة",
    validUntil: "صالح حتى",
    viewInvoice: (invoiceNumber: string) => `عرض الفاتورة ${invoiceNumber}`,
    viewPdf: "عرض PDF",
    voidInvoice: "إبطال الفاتورة",
  },
  en: {
    acceptedQuotes: "Externally confirmed quotes",
    acceptQuote: "Confirm approval & payment",
    activateClientServices: "Activate client services",
    additional: "Additional",
    allStatuses: "All statuses",
    allInvoices: "All invoices",
    allQuotes: "All quotes",
    approver: "Approver",
    beforeTax: "Before tax",
    cancelInvoice: "Cancel invoice",
    cancelQuote: "Cancel quote",
    cancellationNote: "Optional cancellation note:",
    clientSnapshot: "Client snapshot",
    code: "Code",
    commercialRecords: "Commercial records",
    commercialSnapshots: "Commercial snapshots",
    commercialTerms: "Commercial terms",
    createInvoice: "Create invoice",
    createInvoiceConfirm: (quoteNumber: string) =>
      `Create an immutable invoice after external approval and payment confirmation for quote ${quoteNumber}?`,
    createInvoiceProgress: "Creating invoice...",
    delivery: "Delivery",
    discount: "Discount",
    expireQuote: "Expire quote",
    finalDueBeforeTax: "Final due before tax",
    finalTotal: "Final total",
    financialSnapshot: "Financial snapshot",
    governance: "Governance",
    internalCost: "Internal cost",
    invoiceCreatedFrom: (quoteNumber: string, hash: string) =>
      `Created from externally confirmed quote ${quoteNumber}. Snapshot hash: ${hash}.`,
    invoiceDescription:
      "Invoices are created only after external approval and payment confirmation, and never recalculate live catalog, pricing-rule, or quote data.",
    invoiceLibrary: "Invoice library",
    invoiceLineDescription: (count: number) => `${count} immutable invoice lines.`,
    invoiceLines: "Invoice lines",
    invoices: "Invoices",
    invoiceSnapshot: "Invoice snapshot",
    invoiceStatusChanged: (status: string) => `Invoice moved to ${status}.`,
    invoiceStatusConfirm: (label: string, status: string) =>
      `${label} from current status ${status}?`,
    invoiceTerminalState: "This invoice is in a terminal state.",
    invoiceTotal: "Invoice total",
    nextStep: "Next step",
    issueDate: "Issue date",
    issued: "Issued",
    issueInvoice: "Issue invoice",
    issueQuote: "Issue quote",
    items: "items",
    legalName: "Legal name",
    lifecycle: "Lifecycle",
    margin: "Margin",
    monthly: "Monthly",
    noInvoices:
      "Externally confirmed quote snapshots can be converted into invoices when the flow is ready.",
    noInvoicesTitle: "No invoices yet",
    noQuotes: "No quotes have been created yet.",
    noQuotesTitle: "No quotes yet",
    none: "None",
    notAvailable: "not available",
    notSpecified: "Not specified",
    oneTime: "One-time",
    openPricingStudio: "Open Pricing Studio",
    payment: "Payment",
    pricingRuleVersions: "Pricing-rule versions",
    quantity: "Quantity",
    quote: "Quote",
    quoteCreatedFrom: (title: string, version: number | null, hash: string) =>
      `Created from ${title} at calculation version ${version ?? "not available"}. Snapshot hash: ${hash}.`,
    quoteDescription:
      "Quotes are created from saved pricing drafts. Client, service, pricing-rule, terms, and total snapshots remain immutable.",
    quoteIssueConfirm: (label: string, status: string) =>
      `${label} from current status ${quoteStatusLabel(status, "en")}? This records only external approval and payment confirmation.`,
    quoteLineDescription: (count: number) => `${count} immutable quote lines.`,
    quoteLines: "Quote lines",
    quoteLibrary: "Quote library",
    quotes: "Quotes",
    quoteSnapshot: "Commercial snapshot",
    quoteStatusChanged: (status: string) =>
      `Quote status changed to ${quoteStatusLabel(status, "en")}.`,
    readyForClient: "Ready for external approval/payment",
    readyForHandling: "Ready for internal handling",
    readyForInvoice: "Ready to invoice after payment confirmation",
    rejectQuote: "Reject quote",
    rejectionNote: "Optional rejection note:",
    saving: "Saving...",
    sector: "Sector",
    service: "Service",
    setup: "Setup",
    setupFees: "Setup fees",
    snapshotRecords: "Snapshot records",
    terminalRecord: "Final saved record",
    sourceDraft: "Source draft",
    sourceQuote: "Source quote",
    sourceQuoteHash: "Quote snapshot hash",
    statusAtInvoiceCreation: "Quote status at invoice creation",
    statusNote: "Status note",
    taxSnapshot: "Tax snapshot",
    total: "Total",
    totalDue: "Total due",
    totalValue: "Total value",
    typePackage: "Type / package",
    unit: "Unit",
    validUntil: "Valid until",
    viewInvoice: (invoiceNumber: string) => `View invoice ${invoiceNumber}`,
    viewPdf: "View PDF",
    voidInvoice: "Void invoice",
  },
} as const;

export function commercialLocale(locale: string | undefined): SupportedLocale {
  return normalizeLocale(locale);
}

export function money(value: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function countText(value: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    maximumFractionDigits: 2,
  }).format(value);
}

export function dateText(value: string | null | undefined, locale: SupportedLocale): string {
  if (!value) return commercialCopy[locale].notAvailable;
  return new Date(value).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-SA");
}

export function hashText(value: string | null | undefined, locale: SupportedLocale): string {
  return value?.slice(0, 16) ?? commercialCopy[locale].notAvailable;
}

export function lineTypeLabel(value: string, locale: SupportedLocale): string {
  return value === "MONTHLY" ? commercialCopy[locale].monthly : commercialCopy[locale].oneTime;
}

export function quoteStatusLabel(status: string, locale: SupportedLocale): string {
  if (locale === "en") {
    const labels: Record<string, string> = {
      ACCEPTED: "Externally confirmed",
      CANCELLED: "Cancelled",
      DRAFT: "Draft",
      EXPIRED: "Expired",
      ISSUED: "Issued",
      REJECTED: "Rejected",
    };
    return labels[status] ?? status;
  }
  const labels: Record<string, string> = {
    ACCEPTED: "مؤكد خارج النظام",
    CANCELLED: "ملغي",
    DRAFT: "مسودة",
    EXPIRED: "منتهي الصلاحية",
    ISSUED: "مصدر",
    REJECTED: "مرفوض",
  };
  return labels[status] ?? status;
}

export function invoiceStatusLabel(status: string, locale: SupportedLocale): string {
  if (locale === "en") return status;
  const labels: Record<string, string> = {
    CANCELLED: "ملغاة",
    DRAFT: "مسودة",
    ISSUED: "مصدرة",
    VOIDED: "مبطلة",
  };
  return labels[status] ?? status;
}

export function serviceName(
  value: { nameAr?: string | null; nameEn?: string | null },
  locale: SupportedLocale,
  fallback: string,
): string {
  if (locale === "en") return value.nameEn || value.nameAr || fallback;
  return value.nameAr || fallback;
}

export function levelLabel(value: string | null | undefined, locale: SupportedLocale): string {
  if (!value) return "-";
  if (locale === "en" || /[\u0600-\u06ff]/.test(value)) return value;
  const labels: Record<string, string> = {
    Basic: "أساسي",
    Enterprise: "مؤسسي",
    Growth: "نمو",
    Premium: "مميز",
    Scale: "توسع",
    Standard: "قياسي",
    Starter: "بداية",
  };
  return labels[value] ?? "مستوى خدمة";
}

export function businessText(
  value: string | null | undefined,
  locale: SupportedLocale,
  fallback: string,
): string {
  if (!value?.trim()) return fallback;
  if (locale === "ar" && /[A-Za-z]/.test(value) && !/[\u0600-\u06ff]/.test(value)) {
    return fallback;
  }
  return value;
}
