"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { normalizeLocale, type SupportedLocale } from "../lib/i18n";
import { postLoginRoute } from "../lib/route-access";
import { syncDocumentLocale } from "./locale-document-sync";

interface LoginResponse {
  user: {
    mustChangePassword?: boolean;
    preferredLocale?: string;
    roles: string[];
  };
}

const copy: Record<
  SupportedLocale,
  { email: string; password: string; invalid: string; submit: string; submitting: string }
> = {
  ar: {
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    invalid: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    submit: "تسجيل الدخول",
    submitting: "جاري تسجيل الدخول...",
  },
  en: {
    email: "Email",
    password: "Password",
    invalid: "The email or password is incorrect.",
    submit: "Sign in",
    submitting: "Signing in...",
  },
};

export function LoginForm({ locale = "en" }: { locale?: string }) {
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
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1"}/auth/login`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
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
    router.replace(
      body.user.mustChangePassword ? "/change-password" : postLoginRoute(body.user.roles),
    );
    router.refresh();
  }

  return (
    <form className="auth-form" method="post" onSubmit={submit}>
      <label>
        {labels.email}
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        {labels.password}
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          minLength={8}
          required
        />
      </label>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={submitting}>
        {submitting ? labels.submitting : labels.submit}
      </button>
    </form>
  );
}
