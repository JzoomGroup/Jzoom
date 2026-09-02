import Link from "next/link";
import { LanguageSwitcher } from "../../components/language-switcher";
import { LocaleDocumentSync } from "../../components/locale-document-sync";
import {
  UatImpersonationBanner,
  UatImpersonationProvider,
} from "../../components/uat-user-switcher";
import { authPageCopy } from "../../i18n/pages";
import { directionForLocale, htmlLangForLocale } from "../../lib/i18n";
import { getRequestLocale } from "../../lib/i18n-server";

export default async function PermissionDeniedPage() {
  const locale = await getRequestLocale();
  const copy = authPageCopy.forbidden[locale];

  return (
    <UatImpersonationProvider locale={locale}>
      <main
        className="auth-shell"
        dir={directionForLocale(locale)}
        lang={htmlLangForLocale(locale)}
      >
        <LocaleDocumentSync locale={locale} />
        <div className="auth-denied-stack">
          <UatImpersonationBanner />
          <section className="auth-card" aria-labelledby="forbidden-title">
            <div className="auth-language-actions">
              <LanguageSwitcher locale={locale} persist="cookie" />
            </div>
            <p className="eyebrow">{copy.eyebrow}</p>
            <h1 id="forbidden-title">{copy.title}</h1>
            <p className="lead">{copy.lead}</p>
            <Link className="text-link" href="/profile">
              {copy.back}
            </Link>
          </section>
        </div>
      </main>
    </UatImpersonationProvider>
  );
}
