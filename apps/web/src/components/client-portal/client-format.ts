import { normalizeLocale, type SupportedLocale } from "../../lib/i18n";

export type ClientDisplayLocale = SupportedLocale;

const requestStatusLabels = {
  ASSIGNED: { ar: "مسند", en: "Assigned" },
  CLOSED: { ar: "مغلق", en: "Closed" },
  COMPLETED: { ar: "مكتمل", en: "Completed" },
  IN_PROGRESS: { ar: "قيد التنفيذ", en: "In progress" },
  NEW: { ar: "جديد", en: "New" },
  REJECTED: { ar: "مرفوض", en: "Rejected" },
  RETURNED: { ar: "معاد للتعديل", en: "Returned" },
  TRIAGE: { ar: "قيد المراجعة", en: "In review" },
  WAITING_CLIENT: { ar: "بانتظار العميل", en: "Waiting for client" },
  WAITING_SUPERVISOR: { ar: "بانتظار المشرف", en: "Waiting for supervisor" },
} as const;

const outputStatusLabels = {
  ACCEPTED_BY_CLIENT: { ar: "مقبول من العميل", en: "Accepted by you" },
  APPROVED_INTERNAL: { ar: "معتمد داخليًا", en: "Approved internally" },
  CLOSED: { ar: "مغلق", en: "Closed" },
  DRAFT: { ar: "مسودة", en: "Draft" },
  INTERNAL_REVIEW: { ar: "قيد مراجعة جزوم", en: "Under Jzoom review" },
  RETURNED_BY_CLIENT: { ar: "معاد للتعديل", en: "Returned for revision" },
  REVISION_REQUESTED: { ar: "مطلوب تعديل", en: "Revision requested" },
  SHARED_WITH_CLIENT: { ar: "بانتظار مراجعتك", en: "Waiting for your review" },
} as const;

const documentStatusLabels = {
  CANCELLED: { ar: "ملغي", en: "Cancelled" },
  CLOSED: { ar: "مقبول", en: "Accepted" },
  REQUESTED: { ar: "مطلوب الرفع", en: "Upload required" },
  UPLOADED: { ar: "تم الرفع", en: "Uploaded" },
} as const;

const priorityLabels = {
  HIGH: { ar: "عالية", en: "High" },
  LOW: { ar: "منخفضة", en: "Low" },
  NORMAL: { ar: "عادية", en: "Normal" },
  URGENT: { ar: "عاجلة", en: "Urgent" },
} as const;

const quoteStatusLabels = {
  ACCEPTED: { ar: "مقبول", en: "Accepted" },
  ISSUED: { ar: "صادر", en: "Issued" },
} as const;

const invoiceStatusLabels = {
  ISSUED: { ar: "صادرة", en: "Issued" },
} as const;

const hasArabic = /[\u0600-\u06ff]/;

const knownArabicFreeText: Record<string, string> = {
  "a client-visible service.": "خدمة ظاهرة للعميل.",
  "client-visible activity": "نشاط ظاهر للعميل",
  "client-visible deliverable.": "مخرج ظاهر للعميل.",
  "commercial flow invoice": "فاتورة تجارية",
  "commercial flow quote": "عرض تجاري",
  "employee letter": "خطاب موظف",
  "existing description": "وصف محفوظ",
  "june service report": "تقرير خدمات شهر يونيو",
  "monthly hr operating support.": "دعم تشغيلي شهري للموارد البشرية.",
  "monthly request": "طلب خدمة شهري",
  "output shared with client": "تمت مشاركة مخرج مع العميل",
  "please prepare an employee letter.": "يرجى تجهيز خطاب موظف.",
};

function normalizeFreeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function clientLocale(locale: string | null | undefined): ClientDisplayLocale {
  return normalizeLocale(locale);
}

export function clientNumber(value: number, locale: ClientDisplayLocale): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    maximumFractionDigits: 2,
  }).format(value);
}

export function clientCurrency(value: number, locale: ClientDisplayLocale = "en"): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    currency: "SAR",
    maximumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

export function sar(value: number): string {
  return clientCurrency(value, "en");
}

export function clientDate(value: string | null, locale: ClientDisplayLocale = "en"): string {
  if (!value) return locale === "ar" ? "غير محدد" : "Not set";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-SA").format(new Date(value));
}

export function dateLabel(value: string | null): string {
  return clientDate(value, "en");
}

export function clientDateTime(value: string | null, locale: ClientDisplayLocale = "en"): string {
  if (!value) return locale === "ar" ? "غير محدد" : "Not set";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function clientName(
  value: { nameAr?: string | null; nameEn?: string | null; name?: string | null },
  locale: ClientDisplayLocale,
): string {
  if (locale === "ar") return value.nameAr || value.nameEn || value.name || "";
  return value.nameEn || value.nameAr || value.name || "";
}

export function clientLabel(
  value: { labelAr?: string | null; labelEn?: string | null; code?: string | null },
  locale: ClientDisplayLocale,
): string {
  if (locale === "ar") return value.labelAr || value.labelEn || value.code || "";
  return value.labelEn || value.labelAr || value.code || "";
}

export function requestStatusLabel(status: string, locale: ClientDisplayLocale): string {
  return requestStatusLabels[status as keyof typeof requestStatusLabels]?.[locale] ?? status;
}

export function outputStatusLabel(status: string, locale: ClientDisplayLocale): string {
  return outputStatusLabels[status as keyof typeof outputStatusLabels]?.[locale] ?? status;
}

export function documentStatusLabel(status: string, locale: ClientDisplayLocale): string {
  return documentStatusLabels[status as keyof typeof documentStatusLabels]?.[locale] ?? status;
}

export function priorityLabel(status: string, locale: ClientDisplayLocale): string {
  return priorityLabels[status as keyof typeof priorityLabels]?.[locale] ?? status;
}

export function quoteStatusLabel(status: string, locale: ClientDisplayLocale): string {
  return quoteStatusLabels[status as keyof typeof quoteStatusLabels]?.[locale] ?? status;
}

export function invoiceStatusLabel(status: string, locale: ClientDisplayLocale): string {
  return invoiceStatusLabels[status as keyof typeof invoiceStatusLabels]?.[locale] ?? status;
}

export function localizedFreeText(
  value: string | null | undefined,
  locale: ClientDisplayLocale,
  fallback: string,
): string {
  if (locale === "en") return value?.trim() || fallback;
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  if (hasArabic.test(trimmed)) return trimmed;
  return knownArabicFreeText[normalizeFreeText(trimmed)] ?? fallback;
}

export function localizedLineType(lineType: string, locale: ClientDisplayLocale): string {
  if (lineType === "MONTHLY") return locale === "ar" ? "شهري" : "Monthly";
  if (lineType === "ONE_TIME") return locale === "ar" ? "مرة واحدة" : "One-time";
  return lineType;
}

export function localizedServiceDescription({
  description,
  domain,
  locale,
  name,
  serviceLine,
}: {
  description?: string | null;
  domain?: string | null;
  locale: ClientDisplayLocale;
  name: string;
  serviceLine?: string | null;
}): string {
  if (locale === "en") return description || "";
  if (description && hasArabic.test(description)) return description;
  const scope = domain || serviceLine;
  return scope
    ? `خدمة ${name} ضمن مجال ${scope}، مصممة لمعالجة الطلبات المرتبطة بهذا الاشتراك من خلال فريق جزوم.`
    : `خدمة ${name} مقدمة ضمن اشتراكك لمعالجة الطلبات المرتبطة بها من خلال فريق جزوم.`;
}

export function localizedExpectedOutput({
  fallbackName,
  locale,
  value,
}: {
  fallbackName: string;
  locale: ClientDisplayLocale;
  value?: string | null;
}): string {
  if (locale === "en") return value || fallbackName;
  if (value && hasArabic.test(value)) return value;
  return fallbackName;
}
