import type { ReactNode } from "react";
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
  return (
    <AppShell
      displayName={displayName}
      isAdmin={isAdmin}
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
