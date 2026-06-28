import Link from "next/link";
import type { ReactNode } from "react";
import { directionForLocale, htmlLangForLocale, normalizeLocale } from "../../lib/i18n";
import { LanguageSwitcher } from "../language-switcher";
import { LocaleDocumentSync } from "../locale-document-sync";
import { LogoutButton } from "../logout-button";

const navigation = [
  { href: "/client", labelEn: "Overview", labelAr: "الرئيسية" },
  { href: "/client/quotes", labelEn: "Quotes", labelAr: "العروض" },
  { href: "/client/invoices", labelEn: "Invoices", labelAr: "الفواتير" },
  { href: "/client/requests", labelEn: "Requests", labelAr: "الطلبات" },
  { href: "/client/reports", labelEn: "Reports", labelAr: "التقارير" },
  { href: "/notifications", labelEn: "Notifications", labelAr: "الإشعارات" },
] as const;

export function ClientShell({
  activePath,
  children,
  displayName,
  locale = "en",
}: {
  activePath: string;
  children: ReactNode;
  displayName: string;
  locale?: string;
}) {
  const normalizedLocale = normalizeLocale(locale);
  const isArabic = normalizedLocale === "ar";
  const copy = isArabic
    ? {
        brandSubtitle: "بوابة العميل",
        navigationLabel: "تنقل بوابة العميل",
        profile: "الملف الشخصي",
        signOut: "تسجيل الخروج",
        signingOut: "جاري الخروج...",
      }
    : {
        brandSubtitle: "Client Portal",
        navigationLabel: "Client portal navigation",
        profile: "Profile",
        signOut: "Sign out",
        signingOut: "Signing out...",
      };

  return (
    <div
      className="pricing-shell client-shell"
      dir={directionForLocale(normalizedLocale)}
      lang={htmlLangForLocale(normalizedLocale)}
    >
      <LocaleDocumentSync locale={normalizedLocale} />
      <header className="pricing-topbar client-topbar">
        <Link className="admin-brand" href="/client">
          <span className="brand-mark" aria-hidden="true">
            J
          </span>
          <span>
            <strong>Jzoom</strong>
            <small>{copy.brandSubtitle}</small>
          </span>
        </Link>
        <nav aria-label={copy.navigationLabel}>
          {navigation.map((item) => (
            <Link
              key={item.href}
              className="client-nav-link"
              href={item.href}
              aria-current={activePath === item.href ? "page" : undefined}
            >
              {isArabic ? item.labelAr : item.labelEn}
            </Link>
          ))}
          <Link className="client-nav-link" href="/profile">
            {copy.profile}
          </Link>
          <LanguageSwitcher locale={normalizedLocale} />
          <span className="client-user-chip">{displayName}</span>
          <LogoutButton label={copy.signOut} submittingLabel={copy.signingOut} />
        </nav>
      </header>
      <main className="quote-main">{children}</main>
    </div>
  );
}
