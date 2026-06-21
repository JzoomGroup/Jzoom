"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { postLoginRoute } from "../lib/route-access";

interface LoginResponse {
  user: {
    roles: string[];
  };
}

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

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
      setError("The email or password is incorrect.");
      setSubmitting(false);
      return;
    }

    const body = (await response.json()) as LoginResponse;
    router.replace(postLoginRoute(body.user.roles));
    router.refresh();
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label>
        Email
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          minLength={12}
          required
        />
      </label>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={submitting}>
        {submitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
