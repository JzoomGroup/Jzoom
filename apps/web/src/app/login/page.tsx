import { LanguageSwitcher } from "../../components/language-switcher";
import { LocaleDocumentSync } from "../../components/locale-document-sync";
import { LoginForm } from "../../components/login-form";
import { directionForLocale, htmlLangForLocale } from "../../lib/i18n";
import { getRequestLocale } from "../../lib/i18n-server";

export default async function LoginPage() {
  const locale = await getRequestLocale();
  const copy =
    locale === "ar"
      ? {
          eyebrow: "منصة جَزوم التشغيلية",
          title: "مرحباً بعودتك.",
          lead: "سجّل الدخول بحسابك المخصص للمنصة.",
        }
      : {
          eyebrow: "Jzoom Operating Platform",
          title: "Welcome back.",
          lead: "Sign in with your assigned platform account.",
        };

  return (
    <main className="auth-shell" dir={directionForLocale(locale)} lang={htmlLangForLocale(locale)}>
      <LocaleDocumentSync locale={locale} />
      <section className="auth-card" aria-labelledby="login-title">
        <div className="auth-language-actions">
          <LanguageSwitcher locale={locale} persist="cookie" />
        </div>
        <div className="brand-mark" aria-hidden="true">
          J
        </div>
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1 id="login-title">{copy.title}</h1>
        <p className="lead">{copy.lead}</p>
        <LoginForm locale={locale} />
      </section>
    </main>
  );
}
