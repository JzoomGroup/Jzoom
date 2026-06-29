import Link from "next/link";
import type { ReactNode } from "react";
import { directionForLocale, htmlLangForLocale, normalizeLocale } from "../lib/i18n";
import { LanguageSwitcher } from "./language-switcher";
import { LocaleDocumentSync } from "./locale-document-sync";
import { LogoutButton } from "./logout-button";

type ShellMode = "admin" | "client" | "internal";

type NavItem = {
  href: string;
  labelAr: string;
  labelEn: string;
  section?: string;
  visible?: (context: ShellContext) => boolean;
};

type ShellContext = {
  isAdmin: boolean;
  permissions: string[];
  roles: string[];
};

const adminNavigation: NavItem[] = [
  { href: "/admin", labelAr: "لوحة التحكم", labelEn: "Dashboard", section: "core" },
  { href: "/admin/clients", labelAr: "العملاء", labelEn: "Clients", section: "core" },
  { href: "/admin/catalog", labelAr: "كتالوج الخدمات", labelEn: "Catalog", section: "catalog" },
  { href: "/admin/catalog/categories", labelAr: "تصنيفات شهرية", labelEn: "Monthly categories", section: "catalog" },
  { href: "/admin/catalog/monthly-services", labelAr: "الخدمات الشهرية", labelEn: "Monthly services", section: "catalog" },
  { href: "/admin/catalog/service-items", labelAr: "بنود الخدمات", labelEn: "Service items", section: "catalog" },
  { href: "/admin/catalog/service-levels", labelAr: "الباقات", labelEn: "Packages", section: "catalog" },
  { href: "/admin/catalog/one-time-categories", labelAr: "تصنيفات لمرة واحدة", labelEn: "One-time categories", section: "catalog" },
  { href: "/admin/catalog/one-time-services", labelAr: "خدمات لمرة واحدة", labelEn: "One-time services", section: "catalog" },
  { href: "/admin/request-templates", labelAr: "نماذج الطلبات", labelEn: "Request templates", section: "configuration" },
  { href: "/admin/pricing-rules", labelAr: "قواعد التسعير", labelEn: "Pricing rules", section: "configuration" },
  { href: "/admin/platform-configuration", labelAr: "إعدادات المنصة", labelEn: "Platform configuration", section: "configuration" },
  { href: "/pricing", labelAr: "استوديو التسعير", labelEn: "Pricing Studio", section: "commercial" },
];

const clientNavigation: NavItem[] = [
  { href: "/client", labelAr: "الرئيسية", labelEn: "Overview" },
  { href: "/client/requests", labelAr: "الطلبات", labelEn: "Requests" },
  { href: "/client/quotes", labelAr: "العروض", labelEn: "Quotes" },
  { href: "/client/invoices", labelAr: "الفواتير", labelEn: "Invoices" },
  { href: "/client/reports", labelAr: "التقارير", labelEn: "Reports" },
  { href: "/notifications", labelAr: "الإشعارات", labelEn: "Notifications" },
];

const internalNavigation: NavItem[] = [
  {
    href: "/admin",
    labelAr: "الأدمن",
    labelEn: "Admin",
    visible: ({ isAdmin }) => isAdmin,
  },
  {
    href: "/management",
    labelAr: "الإدارة",
    labelEn: "Management",
    visible: ({ isAdmin, roles }) => isAdmin || roles.includes("ROLE-MGMT"),
  },
  {
    href: "/account-manager",
    labelAr: "مدير الحساب",
    labelEn: "Account Manager",
    visible: ({ isAdmin, roles }) => isAdmin || roles.includes("ROLE-MGMT") || roles.includes("ROLE-AM"),
  },
  {
    href: "/supervisor",
    labelAr: "المشرف",
    labelEn: "Supervisor",
    visible: ({ isAdmin, roles }) => isAdmin || roles.includes("ROLE-MGMT") || roles.includes("ROLE-SUPERVISOR"),
  },
  {
    href: "/specialist",
    labelAr: "الأخصائي",
    labelEn: "Specialist",
    visible: ({ isAdmin, roles }) => isAdmin || roles.includes("ROLE-SPECIALIST"),
  },
  {
    href: "/pricing",
    labelAr: "مسودات التسعير",
    labelEn: "Pricing drafts",
    visible: ({ isAdmin, permissions, roles }) =>
      (isAdmin || roles.includes("ROLE-AM")) && permissions.includes("PERM-USE-PRICING-STUDIO"),
  },
  {
    href: "/pricing/quotes",
    labelAr: "العروض",
    labelEn: "Quotes",
    visible: ({ isAdmin, permissions, roles }) =>
      (isAdmin || roles.includes("ROLE-AM")) && permissions.includes("PERM-MANAGE-QUOTES"),
  },
  {
    href: "/pricing/invoices",
    labelAr: "الفواتير",
    labelEn: "Invoices",
    visible: ({ isAdmin, permissions, roles }) =>
      (isAdmin || roles.includes("ROLE-AM")) && permissions.includes("PERM-MANAGE-INVOICES"),
  },
  { href: "/requests", labelAr: "الطلبات", labelEn: "Requests" },
  { href: "/requests/queues", labelAr: "قوائم العمل", labelEn: "Work queues" },
  { href: "/hours-ledger", labelAr: "سجل الساعات", labelEn: "Hours Ledger" },
  {
    href: "/reports",
    labelAr: "التقارير",
    labelEn: "Reports",
    visible: ({ isAdmin, roles }) => isAdmin || roles.includes("ROLE-MGMT") || roles.includes("ROLE-AM"),
  },
  { href: "/notifications", labelAr: "الإشعارات", labelEn: "Notifications" },
  {
    href: "/admin/pricing-rules",
    labelAr: "قواعد التسعير",
    labelEn: "Pricing rules",
    visible: ({ isAdmin }) => isAdmin,
  },
  { href: "/profile", labelAr: "الملف الشخصي", labelEn: "Profile" },
];

const shellCopy = {
  admin: {
    ar: {
      brandSubtitle: "لوحة التحكم",
      navigationLabel: "إدارة المنصة",
      workspace: "وحدة الإدارة",
      signedInAs: "مسجل باسم",
      profile: "الملف الشخصي",
      settings: "الإعدادات",
      signOut: "تسجيل الخروج",
      signingOut: "جاري الخروج...",
    },
    en: {
      brandSubtitle: "Admin Console",
      navigationLabel: "Platform administration",
      workspace: "Administration",
      signedInAs: "Signed in as",
      profile: "Profile",
      settings: "Settings",
      signOut: "Sign out",
      signingOut: "Signing out...",
    },
  },
  client: {
    ar: {
      brandSubtitle: "بوابة العميل",
      navigationLabel: "تنقل بوابة العميل",
      workspace: "مركز الخدمة",
      signedInAs: "حساب العميل",
      profile: "الملف الشخصي",
      settings: "الإعدادات",
      signOut: "تسجيل الخروج",
      signingOut: "جاري الخروج...",
    },
    en: {
      brandSubtitle: "Client Portal",
      navigationLabel: "Client portal navigation",
      workspace: "Service Center",
      signedInAs: "Client account",
      profile: "Profile",
      settings: "Settings",
      signOut: "Sign out",
      signingOut: "Signing out...",
    },
  },
  internal: {
    ar: {
      brandSubtitle: "منصة التشغيل",
      navigationLabel: "تنقل منصة التشغيل",
      workspace: "مركز العمليات",
      signedInAs: "مسجل باسم",
      profile: "الملف الشخصي",
      settings: "الإعدادات",
      signOut: "تسجيل الخروج",
      signingOut: "جاري الخروج...",
    },
    en: {
      brandSubtitle: "Operating Platform",
      navigationLabel: "Operating platform navigation",
      workspace: "Operations",
      signedInAs: "Signed in as",
      profile: "Profile",
      settings: "Settings",
      signOut: "Sign out",
      signingOut: "Signing out...",
    },
  },
} as const;

function isActivePath(activePath: string | undefined, href: string) {
  return activePath === href;
}

function visibleNavigation(items: NavItem[], context: ShellContext) {
  return items.filter((item) => (item.visible ? item.visible(context) : true));
}

export function AppShell({
  activePath,
  children,
  displayName,
  isAdmin = false,
  locale = "en",
  mode,
  permissions = [],
  roles = [],
}: {
  activePath?: string;
  children: ReactNode;
  displayName: string;
  isAdmin?: boolean;
  locale?: string;
  mode: ShellMode;
  permissions?: string[];
  roles?: string[];
}) {
  const normalizedLocale = normalizeLocale(locale);
  const language = normalizedLocale === "ar" ? "ar" : "en";
  const copy = shellCopy[mode][language];
  const nav =
    mode === "admin"
      ? adminNavigation
      : mode === "client"
        ? clientNavigation
        : internalNavigation;
  const context: ShellContext = {
    isAdmin,
    permissions,
    roles,
  };
  const items = visibleNavigation(nav, context);

  return (
    <div
      className={`premium-shell premium-shell-${mode}`}
      dir={directionForLocale(normalizedLocale)}
      lang={htmlLangForLocale(normalizedLocale)}
    >
      <LocaleDocumentSync locale={normalizedLocale} />
      <aside className="premium-sidebar">
        <Link className="premium-brand" href={mode === "client" ? "/client" : isAdmin ? "/admin" : "/profile"}>
          <span className="premium-brand-mark" aria-hidden="true">
            J
          </span>
          <span>
            <strong>Jzoom</strong>
            <small>{copy.brandSubtitle}</small>
          </span>
        </Link>

        <nav className="premium-nav" aria-label={copy.navigationLabel}>
          {items.map((item) => {
            const active = isActivePath(activePath, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={active ? "active" : undefined}
              >
                {language === "ar" ? item.labelAr : item.labelEn}
              </Link>
            );
          })}
        </nav>

        <div className="premium-sidebar-card" aria-label={copy.workspace}>
          <span>{copy.workspace}</span>
          <strong>{language === "ar" ? "نظام تشغيلي موحد" : "Premium Modular OS"}</strong>
          <p>{language === "ar" ? "تجربة موحدة لكل الأدوار." : "Unified experience for every role."}</p>
        </div>
      </aside>

      <div className="premium-workspace">
        <header className="premium-topbar">
          <div>
            <span>{copy.signedInAs}</span>
            <strong>{displayName}</strong>
          </div>
          <div className="premium-topbar-actions">
            <Link href="/profile">{copy.profile}</Link>
            {isAdmin && <Link href="/settings">{copy.settings}</Link>}
            <LanguageSwitcher locale={normalizedLocale} />
            <LogoutButton label={copy.signOut} submittingLabel={copy.signingOut} />
          </div>
        </header>
        <main className="premium-main">{children}</main>
      </div>
    </div>
  );
}
