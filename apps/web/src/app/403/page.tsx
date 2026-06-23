import Link from "next/link";

export default function PermissionDeniedPage() {
  return (
    <main className="auth-shell" dir="ltr">
      <section className="auth-card" aria-labelledby="forbidden-title">
        <p className="eyebrow">403 · Permission denied</p>
        <h1 id="forbidden-title">You cannot open this page.</h1>
        <p className="lead">
          Your account is signed in, but it does not have the required permission.
        </p>
        <Link className="text-link" href="/profile">
          Return to profile
        </Link>
      </section>
    </main>
  );
}
