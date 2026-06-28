import Link from "next/link";
import type { ReactNode } from "react";
import { directionForLocale, htmlLangForLocale, normalizeLocale } from "../../lib/i18n";
import { LanguageSwitcher } from "../language-switcher";
import { LocaleDocumentSync } from "../locale-document-sync";
import { LogoutButton } from "../logout-button";

export function QuoteShell({
  children,
  activePath,
  displayName,
  isAdmin,
  locale = "en",
  permissions = [],
  roles = [],
}: {
  children: ReactNode;
  activePath?: string;
  displayName: string;
  isAdmin: boolean;
  locale?: string;
  permissions?: string[];
  roles?: string[];
}) {
  const normalizedLocale = normalizeLocale(locale);
  const isArabic = normalizedLocale === "ar";
  const hasRole = (role: string) => roles.includes(role) || isAdmin;
  const hasAnyRole = (allowed: string[]) => allowed.some((role) => hasRole(role));
  const hasPermission = (permission: string) => permissions.includes(permission);
  const canUsePricing = hasAnyRole(["ROLE-AM"]) && hasPermission("PERM-USE-PRICING-STUDIO");
  const canManageQuotes = hasAnyRole(["ROLE-AM"]) && hasPermission("PERM-MANAGE-QUOTES");
  const canManageInvoices = hasAnyRole(["ROLE-AM"]) && hasPermission("PERM-MANAGE-INVOICES");
  const canViewReports = hasAnyRole(["ROLE-MGMT", "ROLE-AM"]);
  const copy = isArabic
    ? {
        brandSubtitle: "منصة التشغيل",
        navigationLabel: "تنقل منصة التشغيل",
        admin: "الأدمن",
        management: "الإدارة العليا",
        accountManager: "مدير الحساب",
        supervisor: "المشرف",
        specialist: "الأخصائي",
        pricingDrafts: "مسودات التسعير",
        quotes: "العروض",
        invoices: "الفواتير",
        requests: "الطلبات",
        workQueues: "قوائم العمل",
        hoursLedger: "سجل الساعات",
        reports: "التقارير",
        notifications: "الإشعارات",
        pricingRules: "قواعد التسعير",
        profile: "الملف الشخصي",
        signOut: "تسجيل الخروج",
        signingOut: "جاري الخروج...",
      }
    : {
        brandSubtitle: "Operating Platform",
        navigationLabel: "Operating platform navigation",
        admin: "Admin",
        management: "Management",
        accountManager: "Account Manager",
        supervisor: "Supervisor",
        specialist: "Specialist",
        pricingDrafts: "Pricing drafts",
        quotes: "Quotes",
        invoices: "Invoices",
        requests: "Requests",
        workQueues: "Work queues",
        hoursLedger: "Hours Ledger",
        reports: "Reports",
        notifications: "Notifications",
        pricingRules: "Pricing rules",
        profile: "Profile",
        signOut: "Sign out",
        signingOut: "Signing out...",
      };

  function linkClass(href: string) {
    return activePath === href ? "internal-nav-link active" : "internal-nav-link";
  }

  function current(href: string) {
    return activePath === href ? "page" : undefined;
  }

  return (
    <div
      className="pricing-shell internal-shell"
      dir={directionForLocale(normalizedLocale)}
      lang={htmlLangForLocale(normalizedLocale)}
    >
      <LocaleDocumentSync locale={normalizedLocale} />
      <header className="pricing-topbar internal-topbar">
        <Link className="admin-brand" href={isAdmin ? "/admin" : "/profile"}>
          <span className="brand-mark" aria-hidden="true">
            J
          </span>
          <span>
            <strong>Jzoom</strong>
            <small>{copy.brandSubtitle}</small>
          </span>
        </Link>
        <nav aria-label={copy.navigationLabel}>
          {isAdmin && (
            <Link className={linkClass("/admin")} href="/admin" aria-current={current("/admin")}>
              {copy.admin}
            </Link>
          )}
          {hasRole("ROLE-MGMT") && (
            <Link
              className={linkClass("/management")}
              href="/management"
              aria-current={current("/management")}
            >
              {copy.management}
            </Link>
          )}
          {hasRole("ROLE-AM") && (
            <Link
              className={linkClass("/account-manager")}
              href="/account-manager"
              aria-current={current("/account-manager")}
            >
              {copy.accountManager}
            </Link>
          )}
          {hasRole("ROLE-SUPERVISOR") && (
            <Link
              className={linkClass("/supervisor")}
              href="/supervisor"
              aria-current={current("/supervisor")}
            >
              {copy.supervisor}
            </Link>
          )}
          {hasRole("ROLE-SPECIALIST") && (
            <Link
              className={linkClass("/specialist")}
              href="/specialist"
              aria-current={current("/specialist")}
            >
              {copy.specialist}
            </Link>
          )}
          {canUsePricing && (
            <Link
              className={linkClass("/pricing")}
              href="/pricing"
              aria-current={current("/pricing")}
            >
              {copy.pricingDrafts}
            </Link>
          )}
          {canManageQuotes && (
            <Link
              className={linkClass("/pricing/quotes")}
              href="/pricing/quotes"
              aria-current={current("/pricing/quotes")}
            >
              {copy.quotes}
            </Link>
          )}
          {canManageInvoices && (
            <Link
              className={linkClass("/pricing/invoices")}
              href="/pricing/invoices"
              aria-current={current("/pricing/invoices")}
            >
              {copy.invoices}
            </Link>
          )}
          <Link
            className={linkClass("/requests")}
            href="/requests"
            aria-current={current("/requests")}
          >
            {copy.requests}
          </Link>
          <Link
            className={linkClass("/requests/queues")}
            href="/requests/queues"
            aria-current={current("/requests/queues")}
          >
            {copy.workQueues}
          </Link>
          <Link
            className={linkClass("/hours-ledger")}
            href="/hours-ledger"
            aria-current={current("/hours-ledger")}
          >
            {copy.hoursLedger}
          </Link>
          {canViewReports && (
            <Link
              className={linkClass("/reports")}
              href="/reports"
              aria-current={current("/reports")}
            >
              {copy.reports}
            </Link>
          )}
          <Link
            className={linkClass("/notifications")}
            href="/notifications"
            aria-current={current("/notifications")}
          >
            {copy.notifications}
          </Link>
          {isAdmin && (
            <Link
              className={linkClass("/admin/pricing-rules")}
              href="/admin/pricing-rules"
              aria-current={current("/admin/pricing-rules")}
            >
              {copy.pricingRules}
            </Link>
          )}
          <Link
            className={linkClass("/profile")}
            href="/profile"
            aria-current={current("/profile")}
          >
            {copy.profile}
          </Link>
          <LanguageSwitcher locale={normalizedLocale} />
          <span className="internal-user-chip">{displayName}</span>
          <LogoutButton label={copy.signOut} submittingLabel={copy.signingOut} />
        </nav>
      </header>
      <main className="quote-main">{children}</main>
    </div>
  );
}
