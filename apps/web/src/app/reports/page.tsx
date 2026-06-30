import { redirect } from "next/navigation";
import { MonthlyReports } from "../../components/operations/monthly-reports";
import { QuoteShell } from "../../components/quotes/quote-shell";
import { getCurrentUser } from "../../lib/auth";
import { requireMonthlyReports } from "../../lib/operations-server";
import { requireRequestIntakeOptions } from "../../lib/request-server";

const internalReportRoles = ["ROLE-ADMIN", "ROLE-MGMT", "ROLE-AM"] as const;

export default async function ReportsPage() {
  const [user, reports, intakeOptions] = await Promise.all([
    getCurrentUser(),
    requireMonthlyReports(),
    requireRequestIntakeOptions(),
  ]);
  if (!user) {
    redirect("/login");
  }
  if (
    !user.roles.some((role) =>
      internalReportRoles.includes(role as (typeof internalReportRoles)[number]),
    )
  ) {
    redirect("/403");
  }

  return (
    <QuoteShell
      activePath="/reports"
      displayName={user.displayName}
      isAdmin={user.roles.includes("ROLE-ADMIN")}
      locale={user.preferredLocale}
      permissions={user.permissions}
      roles={user.roles}
    >
      <MonthlyReports
        clientOptions={intakeOptions.clients}
        initialReports={reports}
        locale={user.preferredLocale}
      />
    </QuoteShell>
  );
}
