"use client";

import type { ChangeEvent, InputHTMLAttributes } from "react";
import { CalendarDays } from "lucide-react";
import type { SupportedLocale } from "../lib/i18n";

type LocalizedDateInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "lang" | "onChange" | "type" | "value"
> & {
  locale: SupportedLocale;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  value: string;
};

function formattedDate(value: string, locale: SupportedLocale): string {
  if (!value) return "";
  const parsed = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory-nu-arab" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
    year: "numeric",
  }).format(parsed);
}

export function LocalizedDateInput({ locale, value, ...props }: LocalizedDateInputProps) {
  const preview = formattedDate(value, locale);

  return (
    <span className="localized-date-field">
      <span className="localized-date-input">
        <span className="localized-date-display" aria-hidden="true">
          <span>{preview || (locale === "ar" ? "يوم / شهر / سنة" : "DD / MM / YYYY")}</span>
          <CalendarDays size={16} />
        </span>
        <input
          {...props}
          dir={locale === "ar" ? "rtl" : "ltr"}
          lang={locale === "ar" ? "ar-SA" : "en-GB"}
          type="date"
          value={value}
        />
      </span>
    </span>
  );
}
