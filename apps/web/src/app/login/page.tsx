import { LanguageSwitcher } from "../../components/language-switcher";
import { LocaleDocumentSync } from "../../components/locale-document-sync";
import { LoginForm } from "../../components/login-form";
import { authPageCopy } from "../../i18n/pages";
import { directionForLocale, htmlLangForLocale } from "../../lib/i18n";
import { getRequestLocale } from "../../lib/i18n-server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ returnTo?: string | string[] }>;
} = {}) {
  const locale = await getRequestLocale();
  const params = searchParams ? await searchParams : undefined;
  const returnTo = Array.isArray(params?.returnTo) ? params.returnTo[0] : params?.returnTo;
  const copy = authPageCopy.login[locale];

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
        <LoginForm locale={locale} {...(returnTo ? { returnTo } : {})} />
      </section>
    </main>
  );
}
