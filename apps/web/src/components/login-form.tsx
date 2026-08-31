"use client";

import { loginFormCopy as copy } from "../i18n/dictionaries/administration";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { normalizeLocale } from "../lib/i18n";
import { postLoginRoute, safeReturnTo } from "../lib/route-access";
import { syncDocumentLocale } from "./locale-document-sync";

interface LoginResponse {
  user: {
    mustChangePassword?: boolean;
    preferredLocale?: string;
    roles: string[];
  };
}

export function LoginForm({ locale = "en", returnTo }: { locale?: string; returnTo?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const currentLocale = normalizeLocale(locale);
  const labels = copy[currentLocale];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(undefined);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (!/^\S+@\S+\.\S+$/.test(email) || !password) {
      setError(labels.required);
      setSubmitting(false);
      return;
    }
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1"}/auth/login`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
        }),
      },
    ).catch(() => null);

    if (!response?.ok) {
      setError(labels.invalid);
      setSubmitting(false);
      return;
    }

    const body = (await response.json()) as LoginResponse;
    syncDocumentLocale(body.user.preferredLocale ?? currentLocale);
    const destination = body.user.mustChangePassword
      ? "/change-password"
      : (safeReturnTo(returnTo) ?? postLoginRoute(body.user.roles));
    router.replace(destination);
    router.refresh();
  }

  return (
    <form className="auth-form" method="post" noValidate onSubmit={submit}>
      <label>
        {labels.email}
        <input
          aria-describedby={error ? "login-error" : undefined}
          aria-invalid={error ? "true" : undefined}
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </label>
      <label>
        {labels.password}
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          aria-describedby={error ? "login-error" : undefined}
          aria-invalid={error ? "true" : undefined}
          minLength={8}
          required
        />
      </label>
      {error ? (
        <p className="form-error" id="login-error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={submitting}>
        {submitting ? labels.submitting : labels.submit}
      </button>
    </form>
  );
}
