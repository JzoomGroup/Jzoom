import Link from "next/link";
import type { ReactNode } from "react";
import { LogoutButton } from "./logout-button";

const navigation = [
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/catalog", label: "Catalog overview" },
  { href: "/admin/catalog/categories", label: "Categories" },
  { href: "/admin/catalog/monthly-services", label: "Monthly services" },
  { href: "/admin/catalog/service-items", label: "Service items" },
  { href: "/admin/catalog/service-levels", label: "Service levels" },
  { href: "/admin/catalog/one-time-categories", label: "One-time categories" },
  { href: "/admin/catalog/one-time-services", label: "One-time services" },
  { href: "/admin/request-templates", label: "Request templates" },
  { href: "/admin/pricing-rules", label: "Pricing rules" },
  { href: "/admin/platform-configuration", label: "Platform configuration" },
  { href: "/pricing", label: "Pricing Studio" },
] as const;

export function AdminShell({
  children,
  activePath,
  displayName,
}: {
  children: ReactNode;
  activePath: string;
  displayName: string;
}) {
  return (
    <div className="admin-shell admin-console-shell">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/admin/catalog">
          <span className="brand-mark" aria-hidden="true">
            J
          </span>
          <span>
            <strong>Jzoom</strong>
            <small>Admin Console</small>
          </span>
        </Link>

        <nav className="admin-nav" aria-label="Catalog administration">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={activePath === item.href ? "page" : undefined}
              className={activePath === item.href ? "active" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="admin-account">
          <span>Signed in as</span>
          <strong>{displayName}</strong>
          <div className="admin-account-links">
            <Link href="/profile">Profile</Link>
            <Link href="/settings">Settings</Link>
          </div>
          <LogoutButton />
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
