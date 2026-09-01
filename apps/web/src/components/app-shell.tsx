"use client";

import { shellCopy } from "../i18n/dictionaries/administration";

import Link from "next/link";
import {
  Bell,
  Blocks,
  BriefcaseBusiness,
  Building2,
  Calculator,
  ChartNoAxesColumn,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  FileInput,
  FileText,
  FolderKanban,
  Gauge,
  KeyRound,
  LayoutDashboard,
  Library,
  ListChecks,
  ListTodo,
  Menu,
  ReceiptText,
  ScrollText,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  UserCircle,
  UserRoundCheck,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Fragment, useEffect, useState, type ReactNode } from "react";
import { directionForLocale, htmlLangForLocale, normalizeLocale } from "../lib/i18n";
import { LanguageSwitcher } from "./language-switcher";
import { LocaleDocumentSync } from "./locale-document-sync";
import { LogoutButton } from "./logout-button";

type ShellMode = "admin" | "client" | "internal";

type NavItem = {
  href: string;
  icon: LucideIcon;
  labelAr: string;
  labelEn: string;
  sectionAr?: string;
  sectionEn?: string;
  visible?: (context: ShellContext) => boolean;
};

type ShellContext = {
  isAdmin: boolean;
  permissions: string[];
  roles: string[];
};

const adminNavigation: NavItem[] = [
  {
    href: "/admin",
    icon: LayoutDashboard,
    labelAr: "لوحة التحكم",
    labelEn: "Dashboard",
    sectionAr: "نظرة عامة",
    sectionEn: "Overview",
  },
  {
    href: "/admin/clients",
    icon: Building2,
    labelAr: "العملاء",
    labelEn: "Clients",
    sectionAr: "العملاء والوصول",
    sectionEn: "Clients & access",
  },
  { href: "/admin/users", icon: Users, labelAr: "المستخدمون", labelEn: "Users" },
  {
    href: "/admin/roles",
    icon: UserRoundCheck,
    labelAr: "الأدوار",
    labelEn: "Roles",
  },
  {
    href: "/admin/permissions",
    icon: KeyRound,
    labelAr: "الصلاحيات",
    labelEn: "Permissions",
  },
  {
    href: "/admin/catalog",
    icon: Library,
    labelAr: "كتالوج الخدمات",
    labelEn: "Catalog",
    sectionAr: "الخدمات والباقات",
    sectionEn: "Services & packages",
  },
  {
    href: "/admin/catalog/categories",
    icon: Blocks,
    labelAr: "تصنيفات شهرية",
    labelEn: "Monthly categories",
  },
  {
    href: "/admin/catalog/monthly-services",
    icon: BriefcaseBusiness,
    labelAr: "الخدمات الشهرية",
    labelEn: "Monthly services",
  },
  {
    href: "/admin/catalog/service-items",
    icon: ListChecks,
    labelAr: "بنود الخدمات",
    labelEn: "Service items",
  },
  {
    href: "/admin/catalog/service-levels",
    icon: ClipboardCheck,
    labelAr: "الباقات",
    labelEn: "Packages",
  },
  {
    href: "/admin/catalog/one-time-categories",
    icon: Blocks,
    labelAr: "تصنيفات لمرة واحدة",
    labelEn: "One-time categories",
  },
  {
    href: "/admin/catalog/one-time-services",
    icon: FolderKanban,
    labelAr: "خدمات لمرة واحدة",
    labelEn: "One-time services",
  },
  {
    href: "/admin/request-templates",
    icon: FileInput,
    labelAr: "نماذج الطلبات",
    labelEn: "Request templates",
    sectionAr: "النماذج والتسعير",
    sectionEn: "Forms & pricing",
  },
  {
    href: "/admin/pricing-rules",
    icon: SlidersHorizontal,
    labelAr: "قواعد التسعير",
    labelEn: "Pricing rules",
  },
  {
    href: "/admin/audit-logs",
    icon: ScrollText,
    labelAr: "سجل التدقيق",
    labelEn: "Audit logs",
    sectionAr: "الحوكمة",
    sectionEn: "Governance",
  },
  {
    href: "/admin/platform-configuration",
    icon: Settings2,
    labelAr: "إعدادات المنصة",
    labelEn: "Platform configuration",
  },
  {
    href: "/pricing",
    icon: Calculator,
    labelAr: "استوديو التسعير",
    labelEn: "Pricing Studio",
    sectionAr: "التشغيل التجاري",
    sectionEn: "Commercial operations",
  },
  {
    href: "/pricing/quotes",
    icon: FileText,
    labelAr: "عروض الأسعار",
    labelEn: "Quotes",
  },
  {
    href: "/pricing/invoices",
    icon: ReceiptText,
    labelAr: "الفواتير",
    labelEn: "Invoices",
  },
];

const clientNavigation: NavItem[] = [
  {
    href: "/client",
    icon: Gauge,
    labelAr: "مركز الخدمة",
    labelEn: "Overview",
    sectionAr: "مساحة العميل",
    sectionEn: "Client workspace",
  },
  {
    href: "/client/requests",
    icon: ClipboardList,
    labelAr: "الطلبات",
    labelEn: "Requests",
    sectionAr: "مساحة العميل",
    sectionEn: "Client workspace",
  },
  {
    href: "/client/projects",
    icon: FolderKanban,
    labelAr: "المشاريع",
    labelEn: "Projects",
    sectionAr: "مساحة العميل",
    sectionEn: "Client workspace",
  },
  {
    href: "/client/quotes",
    icon: FileText,
    labelAr: "العروض",
    labelEn: "Quotes",
    sectionAr: "المالية والتقارير",
    sectionEn: "Finance & reports",
  },
  {
    href: "/client/invoices",
    icon: ReceiptText,
    labelAr: "الفواتير",
    labelEn: "Invoices",
    sectionAr: "المالية والتقارير",
    sectionEn: "Finance & reports",
  },
  {
    href: "/client/reports",
    icon: ChartNoAxesColumn,
    labelAr: "التقارير",
    labelEn: "Reports",
    sectionAr: "المالية والتقارير",
    sectionEn: "Finance & reports",
  },
  {
    href: "/notifications",
    icon: Bell,
    labelAr: "الإشعارات",
    labelEn: "Notifications",
    sectionAr: "الحساب",
    sectionEn: "Account",
  },
];

const internalNavigation: NavItem[] = [
  {
    href: "/admin",
    icon: ShieldCheck,
    labelAr: "الأدمن",
    labelEn: "Admin",
    sectionAr: "مساحة العمل",
    sectionEn: "Workspace",
    visible: ({ isAdmin }) => isAdmin,
  },
  {
    href: "/management",
    icon: Gauge,
    labelAr: "الإدارة",
    labelEn: "Management",
    sectionAr: "مساحة العمل",
    sectionEn: "Workspace",
    visible: ({ isAdmin, roles }) => isAdmin || roles.includes("ROLE-MGMT"),
  },
  {
    href: "/account-manager",
    icon: UserRoundCheck,
    labelAr: "مدير الحساب",
    labelEn: "Account Manager",
    sectionAr: "مساحة العمل",
    sectionEn: "Workspace",
    visible: ({ isAdmin, roles }) =>
      isAdmin || roles.includes("ROLE-MGMT") || roles.includes("ROLE-AM"),
  },
  {
    href: "/supervisor",
    icon: ClipboardCheck,
    labelAr: "المشرف",
    labelEn: "Supervisor",
    sectionAr: "مساحة العمل",
    sectionEn: "Workspace",
    visible: ({ isAdmin, roles }) =>
      isAdmin || roles.includes("ROLE-MGMT") || roles.includes("ROLE-SUPERVISOR"),
  },
  {
    href: "/specialist",
    icon: BriefcaseBusiness,
    labelAr: "المختص",
    labelEn: "Specialist",
    sectionAr: "مساحة العمل",
    sectionEn: "Workspace",
    visible: ({ isAdmin, roles }) => isAdmin || roles.includes("ROLE-SPECIALIST"),
  },
  {
    href: "/projects",
    icon: FolderKanban,
    labelAr: "المشاريع",
    labelEn: "Projects",
    sectionAr: "مساحة العمل",
    sectionEn: "Workspace",
    visible: ({ isAdmin, roles }) =>
      isAdmin ||
      roles.includes("ROLE-MGMT") ||
      roles.includes("ROLE-AM") ||
      roles.includes("ROLE-SUPERVISOR") ||
      roles.includes("ROLE-PROJECT-SPECIALIST"),
  },
  {
    href: "/pricing",
    icon: Calculator,
    labelAr: "مسودات التسعير",
    labelEn: "Pricing drafts",
    sectionAr: "التشغيل التجاري",
    sectionEn: "Commercial operations",
    visible: ({ isAdmin, permissions, roles }) =>
      (isAdmin || roles.includes("ROLE-AM")) && permissions.includes("PERM-USE-PRICING-STUDIO"),
  },
  {
    href: "/pricing/quotes",
    icon: FileText,
    labelAr: "العروض",
    labelEn: "Quotes",
    sectionAr: "التشغيل التجاري",
    sectionEn: "Commercial operations",
    visible: ({ isAdmin, permissions, roles }) =>
      (isAdmin || roles.includes("ROLE-AM")) && permissions.includes("PERM-MANAGE-QUOTES"),
  },
  {
    href: "/pricing/invoices",
    icon: ReceiptText,
    labelAr: "الفواتير",
    labelEn: "Invoices",
    sectionAr: "التشغيل التجاري",
    sectionEn: "Commercial operations",
    visible: ({ isAdmin, permissions, roles }) =>
      (isAdmin || roles.includes("ROLE-AM")) && permissions.includes("PERM-MANAGE-INVOICES"),
  },
  {
    href: "/requests",
    icon: ClipboardList,
    labelAr: "الطلبات",
    labelEn: "Requests",
    sectionAr: "التشغيل والمتابعة",
    sectionEn: "Operations & follow-up",
    visible: ({ isAdmin, roles }) =>
      isAdmin ||
      roles.includes("ROLE-MGMT") ||
      roles.includes("ROLE-AM") ||
      roles.includes("ROLE-SUPERVISOR") ||
      roles.includes("ROLE-SPECIALIST"),
  },
  {
    href: "/requests/queues",
    icon: ListTodo,
    labelAr: "قوائم العمل",
    labelEn: "Work queues",
    sectionAr: "التشغيل والمتابعة",
    sectionEn: "Operations & follow-up",
    visible: ({ isAdmin, roles }) =>
      isAdmin ||
      roles.includes("ROLE-MGMT") ||
      roles.includes("ROLE-AM") ||
      roles.includes("ROLE-SUPERVISOR") ||
      roles.includes("ROLE-SPECIALIST"),
  },
  {
    href: "/hours-ledger",
    icon: Clock3,
    labelAr: "سجل الساعات",
    labelEn: "Hours Ledger",
    sectionAr: "التشغيل والمتابعة",
    sectionEn: "Operations & follow-up",
  },
  {
    href: "/reports",
    icon: ChartNoAxesColumn,
    labelAr: "التقارير",
    labelEn: "Reports",
    sectionAr: "التشغيل والمتابعة",
    sectionEn: "Operations & follow-up",
    visible: ({ isAdmin, roles }) =>
      isAdmin || roles.includes("ROLE-MGMT") || roles.includes("ROLE-AM"),
  },
  {
    href: "/notifications",
    icon: Bell,
    labelAr: "الإشعارات",
    labelEn: "Notifications",
    sectionAr: "التشغيل والمتابعة",
    sectionEn: "Operations & follow-up",
  },
  {
    href: "/admin/pricing-rules",
    icon: SlidersHorizontal,
    labelAr: "قواعد التسعير",
    labelEn: "Pricing rules",
    visible: ({ isAdmin }) => isAdmin,
  },
  {
    href: "/profile",
    icon: UserCircle,
    labelAr: "حسابي",
    labelEn: "My account",
    sectionAr: "الحساب",
    sectionEn: "Account",
  },
];

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
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false);
  const navigationId = "premium-shell-navigation";
  const menuLabel = language === "ar" ? "القائمة" : "Menu";
  const closeMenuLabel = language === "ar" ? "إغلاق القائمة" : "Close menu";
  const closeMobileNavigation = () => setIsMobileNavigationOpen(false);

  useEffect(() => {
    if (!isMobileNavigationOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileNavigationOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileNavigationOpen]);

  return (
    <div
      className={`premium-shell premium-shell-${mode}`}
      dir={directionForLocale(normalizedLocale)}
      lang={htmlLangForLocale(normalizedLocale)}
    >
      <LocaleDocumentSync locale={normalizedLocale} />
      <div className="premium-mobile-header">
        <Link
          className="premium-brand premium-mobile-brand"
          href={mode === "client" ? "/client" : isAdmin ? "/admin" : "/profile"}
        >
          <span className="premium-brand-mark" aria-hidden="true">
            J
          </span>
          <span>
            <strong>Jzoom</strong>
          </span>
        </Link>
        <button
          type="button"
          className="premium-mobile-menu-button"
          aria-controls={navigationId}
          aria-expanded={isMobileNavigationOpen}
          onClick={() => setIsMobileNavigationOpen((current) => !current)}
        >
          <span>{menuLabel}</span>
          {isMobileNavigationOpen ? (
            <X aria-hidden="true" size={17} />
          ) : (
            <Menu aria-hidden="true" size={17} />
          )}
        </button>
      </div>

      {isMobileNavigationOpen ? (
        <button
          type="button"
          className="premium-mobile-menu-backdrop"
          aria-label={closeMenuLabel}
          onClick={closeMobileNavigation}
        />
      ) : null}

      <aside
        id={navigationId}
        className={`premium-sidebar${isMobileNavigationOpen ? " is-open" : ""}`}
      >
        <Link
          className="premium-brand"
          href={mode === "client" ? "/client" : isAdmin ? "/admin" : "/profile"}
          onClick={closeMobileNavigation}
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
          {items.map((item, index) => {
            const Icon = item.icon;
            const active = isActivePath(activePath, item.href);
            const sectionLabel = language === "ar" ? item.sectionAr : item.sectionEn;
            const previousItem = items[index - 1];
            const previousSectionLabel = previousItem
              ? language === "ar"
                ? previousItem.sectionAr
                : previousItem.sectionEn
              : undefined;
            const showSection = sectionLabel && sectionLabel !== previousSectionLabel;
            return (
              <Fragment key={item.href}>
                {showSection ? <span className="premium-nav-section">{sectionLabel}</span> : null}
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={active ? "active" : undefined}
                  onClick={closeMobileNavigation}
                >
                  <Icon aria-hidden="true" size={16} strokeWidth={1.8} />
                  <span className="premium-nav-label">
                    {language === "ar" ? item.labelAr : item.labelEn}
                  </span>
                </Link>
              </Fragment>
            );
          })}
        </nav>
      </aside>

      <div className="premium-workspace">
        <header className="premium-topbar">
          <div className="premium-topbar-identity">
            <strong>{`${copy.greeting} ${displayName}`}</strong>
          </div>
          <div className="premium-topbar-actions">
            <Link href="/profile">
              <UserCircle aria-hidden="true" size={15} />
              <span>{copy.profile}</span>
            </Link>
            {isAdmin && (
              <Link href="/settings">
                <Settings2 aria-hidden="true" size={15} />
                <span>{copy.settings}</span>
              </Link>
            )}
            <LanguageSwitcher locale={normalizedLocale} />
            <LogoutButton label={copy.signOut} submittingLabel={copy.signingOut} />
          </div>
        </header>
        <main className="premium-main">{children}</main>
      </div>
    </div>
  );
}
