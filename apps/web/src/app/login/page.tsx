import { LoginForm } from "../../components/login-form";

export default function LoginPage() {
  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="brand-mark" aria-hidden="true">
          J
        </div>
        <p className="eyebrow">Jzoom Operating Platform</p>
        <h1 id="login-title">Welcome back.</h1>
        <p className="lead">Sign in with your assigned platform account.</p>
        <LoginForm />
      </section>
    </main>
  );
}
