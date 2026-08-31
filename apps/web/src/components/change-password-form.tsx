"use client";

import { changePasswordFormCopy as copy } from "../i18n/dictionaries/administration";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { changePassword, AuthApiError } from "../lib/auth-client";
import { normalizeLocale } from "../lib/i18n";
import { postLoginRoute } from "../lib/route-access";

export function ChangePasswordForm({
  locale = "en",
  redirectOnSuccess = true,
  requireCurrentPassword = false,
}: {
  locale?: string;
  redirectOnSuccess?: boolean;
  requireCurrentPassword?: boolean;
}) {
  const router = useRouter();
  const lang = normalizeLocale(locale);
  const t = copy[lang];
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(undefined);
    setSuccess(undefined);

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    if (requireCurrentPassword && !currentPassword) {
      setError(t.currentRequired);
      setSubmitting(false);
      return;
    }
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
      const response = await changePassword({
        ...(requireCurrentPassword ? { currentPassword } : {}),
        newPassword,
        confirmPassword,
      });
      if (redirectOnSuccess) {
        router.replace(postLoginRoute(response.user.roles));
        router.refresh();
      } else {
        formElement.reset();
        setSuccess(t.success);
      }
    } catch (err) {
      if (err instanceof AuthApiError) {
        if (err.body.code === "CURRENT_PASSWORD_INVALID") {
          setError(t.currentInvalid);
        } else if (err.body.code === "PASSWORD_UNCHANGED") {
          setError(t.unchanged);
        } else if (err.body.code === "PASSWORD_CANNOT_BE_DEFAULT") {
          setError(t.defaultPasswordRejected);
        } else {
          setError(lang === "ar" ? t.genericError : err.body.message || t.genericError);
        }
      } else {
        setError(t.genericError);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      className={`auth-form${redirectOnSuccess ? "" : " account-password-form"}`}
      method="post"
      noValidate
      onSubmit={submit}
    >
      {requireCurrentPassword ? (
        <label>
          {t.currentPassword}
          <input
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            maxLength={256}
            required
          />
        </label>
      ) : null}
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
      {success ? (
        <p className="catalog-feedback success" role="status">
          {success}
        </p>
      ) : null}
      <button type="submit" disabled={submitting}>
        {submitting ? t.submitting : t.submit}
      </button>
    </form>
  );
}
