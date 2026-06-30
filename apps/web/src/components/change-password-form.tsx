"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { changePassword, AuthApiError } from "../lib/auth-client";
import { normalizeLocale, type SupportedLocale } from "../lib/i18n";
import { postLoginRoute } from "../lib/route-access";

const copy: Record<
  SupportedLocale,
  {
    confirmPassword: string;
    mismatch: string;
    newPassword: string;
    policy: string;
    submit: string;
    submitting: string;
    genericError: string;
  }
> = {
  ar: {
    confirmPassword: "تأكيد كلمة المرور",
    mismatch: "تأكيد كلمة المرور غير مطابق.",
    newPassword: "كلمة المرور الجديدة",
    policy: "استخدم 8 أحرف على الأقل، مع حرف كبير وحرف صغير ورقم.",
    submit: "تغيير كلمة المرور",
    submitting: "جاري التغيير...",
    genericError: "تعذر تغيير كلمة المرور.",
  },
  en: {
    confirmPassword: "Confirm password",
    mismatch: "Password confirmation does not match.",
    newPassword: "New password",
    policy: "Use at least 8 characters with uppercase, lowercase, and a number.",
    submit: "Change password",
    submitting: "Changing...",
    genericError: "The password could not be changed.",
  },
};

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
        const fields = err.body.fieldErrors?.map((field) => field.message).join(" ");
        setError(fields || err.body.message || t.genericError);
      } else {
        setError(t.genericError);
      }
      setSubmitting(false);
    }
  }

  return (
    <form className="auth-form" method="post" onSubmit={submit}>
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
