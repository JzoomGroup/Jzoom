import type { ReactNode } from "react";
import { AdminShell } from "./admin-shell";
import { QuoteShell } from "./quotes/quote-shell";

export function CommercialShell({
  activePath,
  children,
  displayName,
  locale = "en",
  permissions,
  roles,
}: {
  activePath: string;
  children: ReactNode;
  displayName: string;
  locale?: string;
  permissions: string[];
  roles: string[];
}) {
  if (roles.includes("ROLE-ADMIN")) {
    return (
      <AdminShell
        activePath={activePath}
        displayName={displayName}
        locale={locale}
        permissions={permissions}
        roles={roles}
      >
        {children}
      </AdminShell>
    );
  }

  return (
    <QuoteShell
      activePath={activePath}
      displayName={displayName}
      isAdmin={false}
      locale={locale}
      permissions={permissions}
      roles={roles}
    >
      {children}
    </QuoteShell>
  );
}
