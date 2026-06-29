"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  localeSwitchAriaLabel,
  localeSwitchLabel,
  normalizeLocale,
  oppositeLocale,
  type SupportedLocale,
} from "../lib/i18n";
import { syncDocumentLocale } from "./locale-document-sync";

function readCookie(name: string): string | undefined {
  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export function LanguageSwitcher({
  className,
  locale,
  persist = "authenticated",
}: {
  className?: string;
  locale: string;
  persist?: "authenticated" | "cookie";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const currentLocale = normalizeLocale(locale);
  const targetLocale = oppositeLocale(currentLocale);

  async function switchLanguage(target: SupportedLocale) {
    setPending(true);
    setError(undefined);
    syncDocumentLocale(target);

    if (persist === "authenticated") {
      const csrfCookieName = process.env.NEXT_PUBLIC_AUTH_CSRF_COOKIE_NAME ?? "jzoom_csrf";
      const csrfToken = readCookie(csrfCookieName);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1"}/auth/me/preferences`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(csrfToken ? { "X-CSRF-Token": decodeURIComponent(csrfToken) } : {}),
          },
          body: JSON.stringify({ preferredLocale: target }),
        },
      ).catch(() => null);

      if (!response?.ok) {
        setError(
          currentLocale === "ar"
            ? "تعذر حفظ تفضيل اللغة."
            : "Language preference could not be saved.",
        );
        syncDocumentLocale(currentLocale);
        setPending(false);
        return;
      }
    }

    router.refresh();
    setPending(false);
  }

  return (
    <span className={className ? `language-switcher ${className}` : "language-switcher"}>
      <button
        type="button"
        className="language-switcher-button"
        onClick={() => void switchLanguage(targetLocale)}
        disabled={pending}
        aria-label={localeSwitchAriaLabel(currentLocale)}
      >
        {pending ? "..." : localeSwitchLabel(currentLocale)}
      </button>
      {error ? (
        <span className="language-switcher-error" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}
