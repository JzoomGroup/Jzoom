import Link from "next/link";
import type { ReactNode } from "react";
import { LogoutButton } from "../logout-button";

export function QuoteShell({
  children,
  displayName,
  isAdmin,
  permissions = [],
  roles = [],
}: {
  children: ReactNode;
  displayName: string;
  isAdmin: boolean;
  permissions?: string[];
  roles?: string[];
}) {
  const hasRole = (role: string) => roles.includes(role) || isAdmin;
  const hasAnyRole = (allowed: string[]) => allowed.some((role) => hasRole(role));
  const hasPermission = (permission: string) => permissions.includes(permission);
  const canUsePricing =
    hasAnyRole(["ROLE-AM"]) && hasPermission("PERM-USE-PRICING-STUDIO");
  const canManageQuotes =
    hasAnyRole(["ROLE-AM"]) && hasPermission("PERM-MANAGE-QUOTES");
  const canManageInvoices =
    hasAnyRole(["ROLE-AM"]) && hasPermission("PERM-MANAGE-INVOICES");
  const canViewReports = hasAnyRole(["ROLE-MGMT", "ROLE-AM"]);

  return (
    <div className="pricing-shell internal-shell">
      <header className="pricing-topbar internal-topbar">
        <Link className="admin-brand" href={isAdmin ? "/admin" : "/profile"}>
          <span className="brand-mark" aria-hidden="true">
            J
          </span>
          <span>
            <strong>Jzoom</strong>
            <small>Operating Platform</small>
          </span>
        </Link>
        <nav aria-label="Quote account">
          {isAdmin && <Link href="/admin">Admin</Link>}
          {hasRole("ROLE-MGMT") && <Link href="/management">Management</Link>}
          {hasRole("ROLE-AM") && <Link href="/account-manager">Account Manager</Link>}
          {hasRole("ROLE-SUPERVISOR") && <Link href="/supervisor">Supervisor</Link>}
          {hasRole("ROLE-SPECIALIST") && <Link href="/specialist">Specialist</Link>}
          {canUsePricing && <Link href="/pricing">Pricing drafts</Link>}
          {canManageQuotes && <Link href="/pricing/quotes">Quotes</Link>}
          {canManageInvoices && <Link href="/pricing/invoices">Invoices</Link>}
          <Link href="/requests">Requests</Link>
          <Link href="/requests/queues">Work queues</Link>
          <Link href="/hours-ledger">Hours Ledger</Link>
          {canViewReports && <Link href="/reports">Reports</Link>}
          <Link href="/notifications">Notifications</Link>
          {isAdmin && <Link href="/admin/pricing-rules">Pricing rules</Link>}
          <Link href="/profile">Profile</Link>
          <span>{displayName}</span>
          <LogoutButton />
        </nav>
      </header>
      <main className="quote-main">{children}</main>
    </div>
  );
}
