import type { SupportedLocale } from "./i18n";

const arabicTextPattern = /[\u0600-\u06ff]/;

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
