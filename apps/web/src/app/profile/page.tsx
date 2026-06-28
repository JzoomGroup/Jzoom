import { redirect } from "next/navigation";
import { LanguageSwitcher } from "../../components/language-switcher";
import { LocaleDocumentSync } from "../../components/locale-document-sync";
import { LogoutButton } from "../../components/logout-button";
import { getCurrentUser } from "../../lib/auth";
import { directionForLocale, htmlLangForLocale, normalizeLocale } from "../../lib/i18n";
import { protectedRouteRedirect } from "../../lib/route-access";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  const destination = protectedRouteRedirect(user);
  if (destination) {
    redirect(destination);
  }

  const locale = normalizeLocale(user!.preferredLocale);
  const copy =
    locale === "ar"
      ? {
          eyebrow: "الملف الشخصي",
          email: "البريد الإلكتروني",
          accountType: "نوع الحساب",
          roles: "الأدوار",
          language: "اللغة",
          signOut: "تسجيل الخروج",
          signingOut: "جاري الخروج...",
        }
      : {
          eyebrow: "Authenticated profile",
          email: "Email",
          accountType: "Account type",
          roles: "Roles",
          language: "Language",
          signOut: "Sign out",
          signingOut: "Signing out...",
        };

  return (
    <main className="auth-shell" dir={directionForLocale(locale)} lang={htmlLangForLocale(locale)}>
      <LocaleDocumentSync locale={locale} />
      <section className="auth-card" aria-labelledby="profile-title">
        <div className="auth-language-actions">
          <LanguageSwitcher locale={locale} />
        </div>
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1 id="profile-title">{user!.displayName}</h1>
        <dl className="profile-list">
          <div>
            <dt>{copy.email}</dt>
            <dd>{user!.email}</dd>
          </div>
          <div>
            <dt>{copy.accountType}</dt>
            <dd>{user!.userType}</dd>
          </div>
          <div>
            <dt>{copy.roles}</dt>
            <dd>{user!.roles.join(", ")}</dd>
          </div>
          <div>
            <dt>{copy.language}</dt>
            <dd>{locale === "ar" ? "العربية" : "English"}</dd>
          </div>
        </dl>
        <LogoutButton label={copy.signOut} submittingLabel={copy.signingOut} />
      </section>
    </main>
  );
}
