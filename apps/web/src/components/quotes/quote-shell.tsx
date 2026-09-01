import type { ReactNode } from "react";
import { AdminShell } from "../admin-shell";
import { AppShell } from "../app-shell";

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
  if (isAdmin) {
    return (
      <AdminShell
        activePath={activePath ?? "/admin"}
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
    <AppShell
      displayName={displayName}
      isAdmin={false}
      locale={locale}
      mode="internal"
      permissions={permissions}
      roles={roles}
      {...(activePath ? { activePath } : {})}
    >
      {children}
    </AppShell>
  );
}
