"use client";

import { useEffect, useState, type ChangeEvent, type InputHTMLAttributes } from "react";
import { CalendarClock, CalendarDays } from "lucide-react";
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

type LocalizedDateTimeInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "lang" | "type"> & {
  locale: SupportedLocale;
};

function formattedDateTime(value: string, locale: SupportedLocale): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat(
    locale === "ar" ? "ar-SA-u-ca-gregory-nu-arab" : "en-GB",
    {
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      month: "long",
      year: "numeric",
    },
  ).format(parsed);
}

export function LocalizedDateTimeInput({
  defaultValue,
  locale,
  onChange,
  value,
  ...props
}: LocalizedDateTimeInputProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(String(defaultValue ?? ""));
  const currentValue = value === undefined ? uncontrolledValue : String(value);

  useEffect(() => {
    if (value === undefined) setUncontrolledValue(String(defaultValue ?? ""));
  }, [defaultValue, value]);

  return (
    <span className="localized-date-field">
      <span className="localized-date-input">
        <span className="localized-date-display" aria-hidden="true">
          <span>
            {formattedDateTime(currentValue, locale) ||
              (locale === "ar" ? "اختر التاريخ والوقت" : "Choose date and time")}
          </span>
          <CalendarClock size={16} />
        </span>
        <input
          {...props}
          defaultValue={value === undefined ? defaultValue : undefined}
          dir={locale === "ar" ? "rtl" : "ltr"}
          lang={locale === "ar" ? "ar-SA" : "en-GB"}
          type="datetime-local"
          value={value}
          onChange={(event) => {
            if (value === undefined) setUncontrolledValue(event.currentTarget.value);
            onChange?.(event);
          }}
        />
      </span>
    </span>
  );
}
