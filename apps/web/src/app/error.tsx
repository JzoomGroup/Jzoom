"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { systemStateCopy } from "../i18n/pages";
import type { SupportedLocale } from "../lib/i18n";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [locale, setLocale] = useState<SupportedLocale>("ar");

  useEffect(() => {
    setLocale(document.documentElement.lang.toLowerCase().startsWith("en") ? "en" : "ar");
  }, []);

  const copy = systemStateCopy[locale];

  return (
    <main className="system-state-shell" dir={locale === "ar" ? "rtl" : "ltr"}>
      <section className="system-state-card" role="alert" aria-labelledby="system-error-title">
        <p className="eyebrow">{copy.errorEyebrow}</p>
        <h1 id="system-error-title">{copy.errorTitle}</h1>
        <p>{copy.errorLead}</p>
        <div className="system-state-actions">
          <button className="os-button os-button-primary" type="button" onClick={reset}>
            {copy.retry}
          </button>
          <Link className="os-button os-button-secondary" href="/">
            {copy.home}
          </Link>
        </div>
      </section>
    </main>
  );
}
