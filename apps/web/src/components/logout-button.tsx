"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function readCookie(name: string): string | undefined {
  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export function LogoutButton({
  label = "Sign out",
  submittingLabel = "Signing out...",
}: {
  label?: string;
  submittingLabel?: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function logout() {
    setSubmitting(true);
    const csrfCookieName = process.env.NEXT_PUBLIC_AUTH_CSRF_COOKIE_NAME ?? "jzoom_csrf";
    const csrfToken = readCookie(csrfCookieName);
    await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1"}/auth/logout`,
      {
        method: "POST",
        credentials: "include",
        headers: csrfToken ? { "X-CSRF-Token": decodeURIComponent(csrfToken) } : {},
      },
    ).catch(() => null);
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      className="os-button os-button-secondary"
      onClick={logout}
      disabled={submitting}
    >
      {submitting ? submittingLabel : label}
    </button>
  );
}
