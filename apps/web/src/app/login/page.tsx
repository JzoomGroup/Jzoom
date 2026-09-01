import Image from "next/image";
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
      <div className="auth-stage">
        <div className="auth-page-brand">
          <Image
            alt="مجموعة جزوم لخدمات الأعمال - Jzoom Group Business Services"
            className="auth-page-logo"
            height={59}
            priority
            src="/branding/jzoom-wordmark.png"
            width={308}
          />
        </div>
        <section className="auth-card" aria-labelledby="login-title">
          <div className="auth-language-actions">
            <LanguageSwitcher locale={locale} persist="cookie" />
          </div>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1 id="login-title">{copy.title}</h1>
          <p className="lead">{copy.lead}</p>
          <LoginForm locale={locale} {...(returnTo ? { returnTo } : {})} />
        </section>
      </div>
    </main>
  );
}
