import Link from "next/link";
import { LanguageSwitcher } from "../../components/language-switcher";
import { LocaleDocumentSync } from "../../components/locale-document-sync";
import { directionForLocale, htmlLangForLocale } from "../../lib/i18n";
import { getRequestLocale } from "../../lib/i18n-server";

export default async function PermissionDeniedPage() {
  const locale = await getRequestLocale();
  const copy =
    locale === "ar"
      ? {
          eyebrow: "403 - لا توجد صلاحية",
          title: "لا يمكنك فتح هذه الصفحة.",
          lead: "حسابك مسجل الدخول، لكنه لا يملك الصلاحية المطلوبة.",
          back: "العودة إلى الملف الشخصي",
        }
      : {
          eyebrow: "403 - Permission denied",
          title: "You cannot open this page.",
          lead: "Your account is signed in, but it does not have the required permission.",
          back: "Return to profile",
        };

  return (
    <main className="auth-shell" dir={directionForLocale(locale)} lang={htmlLangForLocale(locale)}>
      <LocaleDocumentSync locale={locale} />
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
    </main>
  );
}
