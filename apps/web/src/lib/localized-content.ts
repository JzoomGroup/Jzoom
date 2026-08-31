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
  HR: "الموارد البشرية",
  FINANCE: "المالية والمحاسبة",
  LEGAL: "الشؤون القانونية",
  "ADMIN-SUPPORT": "الدعم الإداري",
  MEDIA: "الإعلام",
  SYSTEMS: "الأنظمة",
  REPORTS: "التقارير",
  OPERATIONS: "العمليات",
  "EXECUTIVE-SUPPORT": "الدعم التنفيذي",
  BUILD: "البناء والتطوير",
  DIGITAL: "الحلول الرقمية",
};

function normalizedCatalogKey(value: string | null | undefined): string | undefined {
  const normalized = value?.trim().toUpperCase().replace(/[\s_]+/g, "-");
  return normalized || undefined;
}

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
  value: {
    code?: string | null | undefined;
    nameAr?: string | null | undefined;
    nameEn?: string | null | undefined;
  },
  locale: SupportedLocale,
): string {
  if (locale === "en") {
    return value.nameEn?.trim() || value.nameAr?.trim() || value.code?.trim() || "-";
  }

  const arabicName = value.nameAr?.trim();
  if (arabicName && arabicTextPattern.test(arabicName)) {
    return arabicName;
  }

  const candidates = [value.code, value.nameAr, value.nameEn]
    .map(normalizedCatalogKey)
    .filter((candidate): candidate is string => Boolean(candidate));
  const translated = candidates
    .map((candidate) => arabicCatalogLabels[candidate])
    .find(Boolean);
  const code = normalizedCatalogKey(value.code);
  return translated || code || "غير مسمى";
}
