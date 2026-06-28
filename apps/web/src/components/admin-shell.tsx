import Link from "next/link";
import type { ReactNode } from "react";
import { LogoutButton } from "./logout-button";

const navigation = [
  { href: "/admin", labelEn: "Dashboard", labelAr: "لوحة التحكم" },
  { href: "/admin/clients", labelEn: "Clients", labelAr: "العملاء" },
  { href: "/admin/catalog", labelEn: "Catalog overview", labelAr: "نظرة الخدمات" },
  { href: "/admin/catalog/categories", labelEn: "Categories", labelAr: "التصنيفات" },
  {
    href: "/admin/catalog/monthly-services",
    labelEn: "Monthly services",
    labelAr: "الخدمات الشهرية",
  },
  { href: "/admin/catalog/service-items", labelEn: "Service items", labelAr: "بنود الخدمات" },
  { href: "/admin/catalog/service-levels", labelEn: "Service levels", labelAr: "مستويات الخدمة" },
  {
    href: "/admin/catalog/one-time-categories",
    labelEn: "One-time categories",
    labelAr: "تصنيفات الخدمات لمرة واحدة",
  },
  {
    href: "/admin/catalog/one-time-services",
    labelEn: "One-time services",
    labelAr: "خدمات لمرة واحدة",
  },
  { href: "/admin/request-templates", labelEn: "Request templates", labelAr: "نماذج الطلبات" },
  { href: "/admin/pricing-rules", labelEn: "Pricing rules", labelAr: "قواعد التسعير" },
  {
    href: "/admin/platform-configuration",
    labelEn: "Platform configuration",
    labelAr: "إعدادات المنصة",
  },
  { href: "/pricing", labelEn: "Pricing Studio", labelAr: "استوديو التسعير" },
] as const;

export function AdminShell({
  children,
  activePath,
  displayName,
  locale = "en",
}: {
  children: ReactNode;
  activePath: string;
  displayName: string;
  locale?: string;
}) {
  const isArabic = locale.toLowerCase().startsWith("ar");
  const copy = isArabic
    ? {
        brandSubtitle: "لوحة التحكم",
        navigationLabel: "إدارة المنصة",
        signedInAs: "مسجل الدخول باسم",
        profile: "الملف الشخصي",
        settings: "الإعدادات",
        signOut: "تسجيل الخروج",
        signingOut: "جاري الخروج...",
      }
    : {
        brandSubtitle: "Admin Console",
        navigationLabel: "Platform administration",
        signedInAs: "Signed in as",
        profile: "Profile",
        settings: "Settings",
        signOut: "Sign out",
        signingOut: "Signing out...",
      };

  return (
    <div
      className="admin-shell admin-console-shell"
      dir={isArabic ? "rtl" : "ltr"}
      lang={isArabic ? "ar" : "en"}
    >
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/admin">
          <span className="brand-mark" aria-hidden="true">
            J
          </span>
          <span>
            <strong>Jzoom</strong>
            <small>{copy.brandSubtitle}</small>
          </span>
        </Link>

        <nav className="admin-nav" aria-label={copy.navigationLabel}>
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={activePath === item.href ? "page" : undefined}
              className={activePath === item.href ? "active" : undefined}
            >
              {isArabic ? item.labelAr : item.labelEn}
            </Link>
          ))}
        </nav>

        <div className="admin-account">
          <span>{copy.signedInAs}</span>
          <strong>{displayName}</strong>
          <div className="admin-account-links">
            <Link href="/profile">{copy.profile}</Link>
            <Link href="/settings">{copy.settings}</Link>
          </div>
          <LogoutButton label={copy.signOut} submittingLabel={copy.signingOut} />
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
