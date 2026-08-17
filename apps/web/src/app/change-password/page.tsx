import { redirect } from "next/navigation";
import { ChangePasswordForm } from "../../components/change-password-form";
import { LanguageSwitcher } from "../../components/language-switcher";
import { LocaleDocumentSync } from "../../components/locale-document-sync";
import { authPageCopy } from "../../i18n/pages";
import { getCurrentUser } from "../../lib/auth";
import { directionForLocale, htmlLangForLocale, normalizeLocale } from "../../lib/i18n";
import { getRequestLocale } from "../../lib/i18n-server";
import { postLoginRoute } from "../../lib/route-access";

export default async function ChangePasswordPage() {
  const [localeInput, user] = await Promise.all([getRequestLocale(), getCurrentUser()]);
  if (!user) {
    redirect("/login");
  }
  if (!user.mustChangePassword) {
    redirect(postLoginRoute(user.roles));
  }

  const locale = normalizeLocale(user.preferredLocale ?? localeInput);
  const copy = authPageCopy.changePassword[locale];

  return (
    <main className="auth-shell" dir={directionForLocale(locale)} lang={htmlLangForLocale(locale)}>
      <LocaleDocumentSync locale={locale} />
      <section className="auth-card" aria-labelledby="change-password-title">
        <div className="auth-language-actions">
          <LanguageSwitcher locale={locale} persist="cookie" />
        </div>
        <div className="brand-mark" aria-hidden="true">
          J
        </div>
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1 id="change-password-title">{copy.title}</h1>
        <p className="lead">{copy.lead}</p>
        <ChangePasswordForm locale={locale} />
      </section>
    </main>
  );
}
