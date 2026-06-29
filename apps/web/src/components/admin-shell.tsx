import type { ReactNode } from "react";
import { AppShell } from "./app-shell";

export function AdminShell({
  children,
  activePath,
  displayName,
  locale = "en",
}: {
  children: ReactNode;
  activePath: string;
  displayName: string;
  locale?: string;
}) {
  return (
    <AppShell
      activePath={activePath}
      displayName={displayName}
      isAdmin
      locale={locale}
      mode="admin"
      roles={["ROLE-ADMIN"]}
    >
      {children}
    </AppShell>
  );
}
