import type { ReactNode } from "react";
import { AppShell } from "./app-shell";

export function AdminShell({
  children,
  activePath,
  displayName,
  locale = "en",
  permissions,
  roles,
}: {
  children: ReactNode;
  activePath: string;
  displayName: string;
  locale?: string;
  permissions: string[];
  roles: string[];
}) {
  const isAdmin = roles.includes("ROLE-ADMIN");
  return (
    <AppShell
      activePath={activePath}
      displayName={displayName}
      isAdmin={isAdmin}
      locale={locale}
      mode="admin"
      permissions={permissions}
      roles={roles}
    >
      {children}
    </AppShell>
  );
}
