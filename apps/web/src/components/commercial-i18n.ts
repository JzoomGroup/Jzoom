import { normalizeLocale, platformTimeZone, type SupportedLocale } from "../lib/i18n";

import { commercialCopy } from "../i18n/commercial";
export {
  commercialCopy,
  countText,
  invoiceStatusLabel,
  quoteStatusLabel,
} from "../i18n/commercial";

export function commercialLocale(locale: string | undefined): SupportedLocale {
  return normalizeLocale(locale);
}

export function money(value: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(
    locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-SA-u-ca-gregory-nu-latn",
    {
      style: "currency",
      currency: "SAR",
      maximumFractionDigits: 2,
    },
  ).format(value);
}

export function dateText(value: string | null | undefined, locale: SupportedLocale): string {
  if (!value) return commercialCopy[locale].notAvailable;
  return new Date(value).toLocaleDateString(
    locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-SA-u-ca-gregory-nu-latn",
    {
      timeZone: platformTimeZone,
    },
  );
}

export function hashText(value: string | null | undefined, locale: SupportedLocale): string {
  return value?.slice(0, 16) ?? commercialCopy[locale].notAvailable;
}

export function lineTypeLabel(value: string, locale: SupportedLocale): string {
  return value === "MONTHLY" ? commercialCopy[locale].monthly : commercialCopy[locale].oneTime;
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
