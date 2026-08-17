import type { SupportedLocale } from "./i18n";

const arabicTextPattern = /[\u0600-\u06ff]/;

const arabicCatalogLabels: Record<string, string> = {
  "CAT-HR": "الموارد البشرية",
  "CAT-FINANCE": "المالية والمحاسبة",
  "CAT-LEGAL": "الشؤون القانونية",
  "CAT-ADMIN-SUPPORT": "الدعم الإداري",
  "CAT-MEDIA": "الإعلام",
  "CAT-SYSTEMS": "الأنظمة",
  "CAT-REPORTS": "التقارير",
  "CAT-OPERATIONS": "العمليات",
  "CAT-EXECUTIVE-SUPPORT": "الدعم التنفيذي",
  "OT-CAT-BUILD": "البناء والتطوير",
  "OT-CAT-DIGITAL": "الحلول الرقمية",
};

export function localizedDescription(
  value: string | null | undefined,
  locale: SupportedLocale,
  fallback: string,
): string {
  const normalized = value?.trim();
  if (!normalized) return fallback;
  if (locale === "ar" && !arabicTextPattern.test(normalized)) return fallback;
  return normalized;
}

export function localizedCatalogLabel(
  value: { code?: string; nameAr?: string; nameEn?: string },
  locale: SupportedLocale,
): string {
  if (locale === "en") {
    return value.nameEn?.trim() || value.nameAr?.trim() || value.code?.trim() || "-";
  }

  const arabicName = value.nameAr?.trim();
  if (arabicName && arabicTextPattern.test(arabicName)) {
    return arabicName;
  }

  const code = value.code?.trim().toUpperCase();
  return (code && arabicCatalogLabels[code]) || code || "غير مسمى";
}
