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
  visible?: (context: ShellContext) => boolean;
};

type ShellContext = {
  isAdmin: boolean;
  permissions: string[];
  roles: string[];
};

const adminNavigation: NavItem[] = [
  { href: "/admin", labelAr: "لوحة التحكم", labelEn: "Dashboard" },
  { href: "/admin/clients", labelAr: "العملاء", labelEn: "Clients" },
  { href: "/admin/users", labelAr: "المستخدمون", labelEn: "Users" },
  { href: "/admin/roles", labelAr: "الأدوار", labelEn: "Roles" },
  { href: "/admin/permissions", labelAr: "الصلاحيات", labelEn: "Permissions" },
  { href: "/admin/catalog", labelAr: "كتالوج الخدمات", labelEn: "Catalog" },
  { href: "/admin/catalog/categories", labelAr: "تصنيفات شهرية", labelEn: "Monthly categories" },
  {
    href: "/admin/catalog/monthly-services",
    labelAr: "الخدمات الشهرية",
    labelEn: "Monthly services",
  },
  { href: "/admin/catalog/service-items", labelAr: "بنود الخدمات", labelEn: "Service items" },
  { href: "/admin/catalog/service-levels", labelAr: "الباقات", labelEn: "Packages" },
  {
    href: "/admin/catalog/one-time-categories",
    labelAr: "تصنيفات لمرة واحدة",
    labelEn: "One-time categories",
  },
  {
    href: "/admin/catalog/one-time-services",
    labelAr: "خدمات لمرة واحدة",
    labelEn: "One-time services",
  },
  { href: "/admin/request-templates", labelAr: "نماذج الطلبات", labelEn: "Request templates" },
  { href: "/admin/pricing-rules", labelAr: "قواعد التسعير", labelEn: "Pricing rules" },
  { href: "/admin/audit-logs", labelAr: "سجل التدقيق", labelEn: "Audit logs" },
  {
    href: "/admin/platform-configuration",
    labelAr: "إعدادات المنصة",
    labelEn: "Platform configuration",
  },
  { href: "/pricing", labelAr: "استوديو التسعير", labelEn: "Pricing Studio" },
];

const clientNavigation: NavItem[] = [
  { href: "/client", labelAr: "مركز الخدمة", labelEn: "Overview" },
  { href: "/client/requests", labelAr: "الطلبات", labelEn: "Requests" },
  { href: "/client/projects", labelAr: "المشاريع", labelEn: "Projects" },
  { href: "/client/quotes", labelAr: "العروض", labelEn: "Quotes" },
  { href: "/client/invoices", labelAr: "الفواتير", labelEn: "Invoices" },
  { href: "/client/reports", labelAr: "التقارير", labelEn: "Reports" },
  { href: "/notifications", labelAr: "الإشعارات", labelEn: "Notifications" },
];

const internalNavigation: NavItem[] = [
  { href: "/admin", labelAr: "الأدمن", labelEn: "Admin", visible: ({ isAdmin }) => isAdmin },
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
    visible: ({ isAdmin, roles }) =>
      isAdmin || roles.includes("ROLE-MGMT") || roles.includes("ROLE-AM"),
  },
  {
    href: "/supervisor",
    labelAr: "المشرف",
    labelEn: "Supervisor",
    visible: ({ isAdmin, roles }) =>
      isAdmin || roles.includes("ROLE-MGMT") || roles.includes("ROLE-SUPERVISOR"),
  },
  {
    href: "/specialist",
    labelAr: "المختص",
    labelEn: "Specialist",
    visible: ({ isAdmin, roles }) => isAdmin || roles.includes("ROLE-SPECIALIST"),
  },
  {
    href: "/projects",
    labelAr: "المشاريع",
    labelEn: "Projects",
    visible: ({ isAdmin, roles }) =>
      isAdmin ||
      roles.includes("ROLE-MGMT") ||
      roles.includes("ROLE-AM") ||
      roles.includes("ROLE-SUPERVISOR") ||
      roles.includes("ROLE-SPECIALIST") ||
      roles.includes("ROLE-PROJECT-SPECIALIST"),
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
  {
    href: "/requests",
    labelAr: "الطلبات",
    labelEn: "Requests",
    visible: ({ isAdmin, roles }) =>
      isAdmin ||
      roles.includes("ROLE-MGMT") ||
      roles.includes("ROLE-AM") ||
      roles.includes("ROLE-SUPERVISOR") ||
      roles.includes("ROLE-SPECIALIST"),
  },
  {
    href: "/requests/queues",
    labelAr: "قوائم العمل",
    labelEn: "Work queues",
    visible: ({ isAdmin, roles }) =>
      isAdmin ||
      roles.includes("ROLE-MGMT") ||
      roles.includes("ROLE-AM") ||
      roles.includes("ROLE-SUPERVISOR") ||
      roles.includes("ROLE-SPECIALIST"),
  },
  { href: "/hours-ledger", labelAr: "سجل الساعات", labelEn: "Hours Ledger" },
  {
    href: "/reports",
    labelAr: "التقارير",
    labelEn: "Reports",
    visible: ({ isAdmin, roles }) =>
      isAdmin || roles.includes("ROLE-MGMT") || roles.includes("ROLE-AM"),
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
      workspaceTitle: "نظام تشغيلي موحد",
      workspaceLead: "تجربة موحدة لكل الأدوار.",
      signedInAs: "مسجل باسم",
      profile: "الملف الشخصي",
      settings: "الإعدادات",
      signOut: "تسجيل الخروج",
      signingOut: "جاري تسجيل الخروج...",
    },
    en: {
      brandSubtitle: "Admin Console",
      navigationLabel: "Platform administration",
      workspace: "Administration",
      workspaceTitle: "Premium Modular OS",
      workspaceLead: "Unified experience for every role.",
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
      workspaceTitle: "منصة خدمة موحدة",
      workspaceLead: "كل الطلبات والمخرجات في مكان واحد.",
      signedInAs: "حساب العميل",
      profile: "الملف الشخصي",
      settings: "الإعدادات",
      signOut: "تسجيل الخروج",
      signingOut: "جاري تسجيل الخروج...",
    },
    en: {
      brandSubtitle: "Client Portal",
      navigationLabel: "Client portal navigation",
      workspace: "Service Center",
      workspaceTitle: "Premium Modular OS",
      workspaceLead: "Unified experience for every role.",
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
      workspaceTitle: "نظام تشغيلي موحد",
      workspaceLead: "مسار واضح من الطلب إلى الاعتماد.",
      signedInAs: "مسجل باسم",
      profile: "الملف الشخصي",
      settings: "الإعدادات",
      signOut: "تسجيل الخروج",
      signingOut: "جاري تسجيل الخروج...",
    },
    en: {
      brandSubtitle: "Operating Platform",
      navigationLabel: "Operating platform navigation",
      workspace: "Operations",
      workspaceTitle: "Premium Modular OS",
      workspaceLead: "Unified experience for every role.",
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

const adminOnlyAdminPaths = new Set([
  "/admin",
  "/admin/users",
  "/admin/roles",
  "/admin/permissions",
  "/admin/catalog",
  "/admin/catalog/categories",
  "/admin/catalog/monthly-services",
  "/admin/catalog/service-items",
  "/admin/catalog/service-levels",
  "/admin/catalog/one-time-categories",
  "/admin/catalog/one-time-services",
  "/admin/request-templates",
  "/admin/pricing-rules",
  "/admin/audit-logs",
  "/admin/platform-configuration",
]);

function visibleNavigation(items: NavItem[], context: ShellContext) {
  return items.filter((item) => {
    if (adminOnlyAdminPaths.has(item.href) && !context.isAdmin) {
      return false;
    }
    if (item.href === "/admin/clients") {
      return (
        (context.isAdmin || context.roles.includes("ROLE-MGMT")) &&
        context.permissions.includes("PERM-MANAGE-CLIENTS")
      );
    }
    if (item.href === "/pricing") {
      return (
        (context.isAdmin ||
          context.roles.includes("ROLE-MGMT") ||
          context.roles.includes("ROLE-AM")) &&
        context.permissions.includes("PERM-USE-PRICING-STUDIO")
      );
    }
    if (item.href === "/pricing/quotes") {
      return (
        (context.isAdmin ||
          context.roles.includes("ROLE-MGMT") ||
          context.roles.includes("ROLE-AM")) &&
        context.permissions.includes("PERM-MANAGE-QUOTES")
      );
    }
    if (item.href === "/pricing/invoices") {
      return (
        (context.isAdmin ||
          context.roles.includes("ROLE-MGMT") ||
          context.roles.includes("ROLE-AM")) &&
        context.permissions.includes("PERM-MANAGE-INVOICES")
      );
    }
    return item.visible ? item.visible(context) : true;
  });
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
    mode === "admin" ? adminNavigation : mode === "client" ? clientNavigation : internalNavigation;
  const context: ShellContext = { isAdmin, permissions, roles };
  const items = visibleNavigation(nav, context);

  return (
    <div
      className={`premium-shell premium-shell-${mode}`}
      dir={directionForLocale(normalizedLocale)}
      lang={htmlLangForLocale(normalizedLocale)}
    >
      <LocaleDocumentSync locale={normalizedLocale} />
      <aside className="premium-sidebar">
        <Link
          className="premium-brand"
          href={mode === "client" ? "/client" : isAdmin ? "/admin" : "/profile"}
        >
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
          <strong>{copy.workspaceTitle}</strong>
          <p>{copy.workspaceLead}</p>
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
