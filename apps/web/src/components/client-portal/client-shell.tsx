import Link from "next/link";
import type { ReactNode } from "react";
import { LogoutButton } from "../logout-button";

const navigation = [
  { href: "/client", label: "Overview" },
  { href: "/client/quotes", label: "Quotes" },
  { href: "/client/invoices", label: "Invoices" },
  { href: "/client/requests", label: "Requests" },
  { href: "/client/reports", label: "Reports" },
  { href: "/notifications", label: "Notifications" },
] as const;

export function ClientShell({
  activePath,
  children,
  displayName,
}: {
  activePath: string;
  children: ReactNode;
  displayName: string;
}) {
  return (
    <div className="pricing-shell client-shell">
      <header className="pricing-topbar client-topbar">
        <Link className="admin-brand" href="/client">
          <span className="brand-mark" aria-hidden="true">
            J
          </span>
          <span>
            <strong>Jzoom</strong>
            <small>Client Portal</small>
          </span>
        </Link>
        <nav aria-label="Client portal navigation">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={activePath === item.href ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
          <Link href="/profile">Profile</Link>
          <span>{displayName}</span>
          <LogoutButton />
        </nav>
      </header>
      <main className="quote-main">{children}</main>
    </div>
  );
}
