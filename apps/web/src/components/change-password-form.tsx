"use client";

import { changePasswordFormCopy as copy } from "../i18n/dictionaries/administration";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { changePassword, AuthApiError } from "../lib/auth-client";
import { normalizeLocale } from "../lib/i18n";
import { postLoginRoute } from "../lib/route-access";

export function ChangePasswordForm({ locale = "en" }: { locale?: string }) {
  const router = useRouter();
  const lang = normalizeLocale(locale);
  const t = copy[lang];
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(undefined);

    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPassword)) {
      setError(t.invalidPolicy);
      setSubmitting(false);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t.mismatch);
      setSubmitting(false);
      return;
    }

    try {
      const response = await changePassword(newPassword, confirmPassword);
      router.replace(postLoginRoute(response.user.roles));
      router.refresh();
    } catch (err) {
      if (err instanceof AuthApiError) {
        setError(lang === "ar" ? t.genericError : err.body.message || t.genericError);
      } else {
        setError(t.genericError);
      }
      setSubmitting(false);
    }
  }

  return (
    <form className="auth-form" method="post" noValidate onSubmit={submit}>
      <label>
        {t.newPassword}
        <input
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>
      <label>
        {t.confirmPassword}
        <input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>
      <p className="eyebrow">{t.policy}</p>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={submitting}>
        {submitting ? t.submitting : t.submit}
      </button>
    </form>
  );
}
