import Link from "next/link";
import type { ReactNode } from "react";
import { LogoutButton } from "../logout-button";

export function QuoteShell({
  children,
  displayName,
  isAdmin,
}: {
  children: ReactNode;
  displayName: string;
  isAdmin: boolean;
}) {
  return (
    <div className="pricing-shell">
      <header className="pricing-topbar">
        <Link className="admin-brand" href="/pricing">
          <span className="brand-mark" aria-hidden="true">
            J
          </span>
          <span>
            <strong>Jzoom</strong>
            <small>Pricing Studio</small>
          </span>
        </Link>
        <nav aria-label="Quote account">
          <Link href="/pricing">Pricing drafts</Link>
          <Link href="/pricing/quotes">Quotes</Link>
          <Link href="/pricing/invoices">Invoices</Link>
          <Link href="/requests">Requests</Link>
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
