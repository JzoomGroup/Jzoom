"use client";

import { useEffect } from "react";
import {
  directionForLocale,
  htmlLangForLocale,
  LOCALE_COOKIE_NAME,
  normalizeLocale,
  type SupportedLocale,
} from "../lib/i18n";

function writeLocaleCookie(locale: SupportedLocale) {
  document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function syncDocumentLocale(locale: string | null | undefined) {
  const normalized = normalizeLocale(locale);
  document.documentElement.lang = htmlLangForLocale(normalized);
  document.documentElement.dir = directionForLocale(normalized);
  writeLocaleCookie(normalized);
}

export function LocaleDocumentSync({ locale }: { locale: string }) {
  useEffect(() => {
    syncDocumentLocale(locale);
  }, [locale]);

  return null;
}
