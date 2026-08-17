import type { SupportedLocale } from "../../lib/i18n";

const labels: Record<string, Record<SupportedLocale, string>> = {
  ATTENTION: { ar: "تحتاج متابعة", en: "Needs attention" },
  WATCH: { ar: "تحت المتابعة", en: "Watch" },
  HEALTHY: { ar: "مستقرة", en: "Healthy" },
};

const reasons: Record<string, Record<SupportedLocale, string>> = {
  ATTENTION: {
    ar: "توجد أعمال متأخرة أو مخرجات معادة وتحتاج إلى متابعة عاجلة.",
    en: "Overdue work or returned outputs require urgent follow-up.",
  },
  WATCH: {
    ar: "توجد طلبات مفتوحة أو إجراءات معلقة لدى العميل تستحق المتابعة.",
    en: "Open requests or client actions should be monitored.",
  },
  HEALTHY: {
    ar: "لا توجد مؤشرات تشغيلية تستدعي إجراءً عاجلًا.",
    en: "No immediate operating attention indicator is present.",
  },
};

export function healthStatusText(code: string, locale: SupportedLocale) {
  return labels[code]?.[locale] ?? (locale === "ar" ? "تحتاج مراجعة" : code);
}

export function healthReasonText(code: string, locale: SupportedLocale) {
  return reasons[code]?.[locale] ?? (locale === "ar" ? "راجع مؤشرات العميل." : code);
}
