import { redirect } from "next/navigation";
import { MonthlyReports } from "../../components/operations/monthly-reports";
import { QuoteShell } from "../../components/quotes/quote-shell";
import { getCurrentUser } from "../../lib/auth";
import { requireMonthlyReports } from "../../lib/operations-server";

const internalReportRoles = ["ROLE-ADMIN", "ROLE-MGMT", "ROLE-AM"] as const;

export default async function ReportsPage() {
  const [user, reports] = await Promise.all([getCurrentUser(), requireMonthlyReports()]);
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
    <QuoteShell displayName={user.displayName} isAdmin={user.roles.includes("ROLE-ADMIN")}>
      <MonthlyReports initialReports={reports} />
    </QuoteShell>
  );
}
