import { redirect } from "next/navigation";
import Link from "next/link";
import { LanguageSwitcher } from "../../components/language-switcher";
import { LocaleDocumentSync } from "../../components/locale-document-sync";
import { LogoutButton } from "../../components/logout-button";
import { getCurrentUser, hasBackendAdminAccess } from "../../lib/auth";
import { directionForLocale, htmlLangForLocale, normalizeLocale } from "../../lib/i18n";
import { protectedRouteRedirect } from "../../lib/route-access";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const destination = protectedRouteRedirect(user, true);
  if (destination) {
    redirect(destination);
  }
  if (!(await hasBackendAdminAccess())) {
    redirect("/403");
  }

  const locale = normalizeLocale(user!.preferredLocale);
  const copy =
    locale === "ar"
      ? {
          eyebrow: "إعدادات الأدمن",
          title: "إعدادات المنصة",
          lead: "الصلاحية محمية من الـ API. تتم إدارة إعدادات المنصة من لوحة التحكم.",
          open: "فتح إعدادات المنصة",
          signOut: "تسجيل الخروج",
          signingOut: "جاري الخروج...",
        }
      : {
          eyebrow: "Admin only",
          title: "Platform settings",
          lead: "Access is enforced by the API. Platform configuration is managed from the Admin Console.",
          open: "Open platform configuration",
          signOut: "Sign out",
          signingOut: "Signing out...",
        };

  return (
    <main className="auth-shell" dir={directionForLocale(locale)} lang={htmlLangForLocale(locale)}>
      <LocaleDocumentSync locale={locale} />
      <section className="auth-card" aria-labelledby="settings-title">
        <div className="auth-language-actions">
          <LanguageSwitcher locale={locale} />
        </div>
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1 id="settings-title">{copy.title}</h1>
        <p className="lead">{copy.lead}</p>
        <Link className="button-link" href="/admin/platform-configuration">
          {copy.open}
        </Link>
        <LogoutButton label={copy.signOut} submittingLabel={copy.signingOut} />
      </section>
    </main>
  );
}
