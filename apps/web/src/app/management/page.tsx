import { redirect } from "next/navigation";
import { InternalRoleDashboard } from "../../components/internal-role-dashboard";
import { QuoteShell } from "../../components/quotes/quote-shell";
import { getCurrentUser } from "../../lib/auth";
import {
  requireAccountManagerPortfolio,
  requireMonthlyReports,
  requireMonthlyUsage,
} from "../../lib/operations-server";
import { requireRequestQueue } from "../../lib/request-server";

const managementRoles = ["ROLE-ADMIN", "ROLE-MGMT"] as const;

export default async function ManagementDashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (
    !user.roles.some((role) =>
      managementRoles.includes(role as (typeof managementRoles)[number]),
    )
  ) {
    redirect("/403");
  }
  const [queue, usage, reports, portfolio] = await Promise.all([
    requireRequestQueue("all"),
    requireMonthlyUsage(),
    requireMonthlyReports(),
    requireAccountManagerPortfolio(),
  ]);

  return (
    <QuoteShell
      displayName={user.displayName}
      isAdmin={user.roles.includes("ROLE-ADMIN")}
      permissions={user.permissions}
      roles={user.roles}
    >
      <InternalRoleDashboard
        mode="management"
        portfolio={portfolio}
        queue={queue}
        reports={reports}
        usage={usage}
      />
    </QuoteShell>
  );
}
