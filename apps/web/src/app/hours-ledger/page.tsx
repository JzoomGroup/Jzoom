import { redirect } from "next/navigation";
import { HoursLedger } from "../../components/operations/hours-ledger";
import { QuoteShell } from "../../components/quotes/quote-shell";
import { getCurrentUser } from "../../lib/auth";
import {
  requireHoursLedger,
  requireMonthlyClosings,
  requireMonthlyUsage,
} from "../../lib/operations-server";
import { requireRequestIntakeOptions } from "../../lib/request-server";

const ledgerRoles = [
  "ROLE-ADMIN",
  "ROLE-MGMT",
  "ROLE-AM",
  "ROLE-SUPERVISOR",
  "ROLE-SPECIALIST",
] as const;

const closingRoles = ["ROLE-ADMIN", "ROLE-MGMT", "ROLE-AM"] as const;

export default async function HoursLedgerPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!user.roles.some((role) => ledgerRoles.includes(role as (typeof ledgerRoles)[number]))) {
    redirect("/403");
  }

  const canManageClosings = user.roles.some((role) =>
    closingRoles.includes(role as (typeof closingRoles)[number]),
  );
  const [ledger, usage, closings, intakeOptions] = await Promise.all([
    requireHoursLedger(),
    requireMonthlyUsage(),
    canManageClosings ? requireMonthlyClosings() : Promise.resolve([]),
    requireRequestIntakeOptions(),
  ]);

  return (
    <QuoteShell
      activePath="/hours-ledger"
      displayName={user.displayName}
      isAdmin={user.roles.includes("ROLE-ADMIN")}
      locale={user.preferredLocale}
      permissions={user.permissions}
      roles={user.roles}
    >
      <HoursLedger
        canManageClosings={canManageClosings}
        clientOptions={intakeOptions.clients}
        initialClosings={closings}
        initialLedger={ledger}
        initialUsage={usage}
        locale={user.preferredLocale}
      />
    </QuoteShell>
  );
}
