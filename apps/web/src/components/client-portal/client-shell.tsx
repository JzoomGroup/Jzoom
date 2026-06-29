import type { ReactNode } from "react";
import { AppShell } from "../app-shell";

export function ClientShell({
  activePath,
  children,
  displayName,
  locale = "en",
}: {
  activePath: string;
  children: ReactNode;
  displayName: string;
  locale?: string;
}) {
  return (
    <AppShell
      activePath={activePath}
      displayName={displayName}
      locale={locale}
      mode="client"
      roles={["ROLE-CLIENT"]}
    >
      {children}
    </AppShell>
  );
}
