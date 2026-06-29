export type SupportedLocale = "ar" | "en";
export type TextDirection = "rtl" | "ltr";

export const DEFAULT_LOCALE: SupportedLocale = "ar";
export const LOCALE_COOKIE_NAME = "jzoom_locale";

export function normalizeLocale(locale: string | null | undefined): SupportedLocale {
  return locale?.toLowerCase().startsWith("ar") ? "ar" : "en";
}

export function isArabicLocale(locale: string | null | undefined): boolean {
  return normalizeLocale(locale) === "ar";
}

export function directionForLocale(locale: string | null | undefined): TextDirection {
  return isArabicLocale(locale) ? "rtl" : "ltr";
}

export function htmlLangForLocale(locale: string | null | undefined): SupportedLocale {
  return normalizeLocale(locale);
}

export function oppositeLocale(locale: string | null | undefined): SupportedLocale {
  return isArabicLocale(locale) ? "en" : "ar";
}

export function localeDisplayName(locale: string | null | undefined): string {
  return isArabicLocale(locale) ? "العربية" : "English";
}

export function localeSwitchLabel(locale: string | null | undefined): string {
  return isArabicLocale(locale) ? "English" : "العربية";
}

export function localeSwitchAriaLabel(locale: string | null | undefined): string {
  return isArabicLocale(locale) ? "تغيير اللغة إلى الإنجليزية" : "Switch language to Arabic";
}
