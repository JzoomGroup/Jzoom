import { redirect } from "next/navigation";
import { InternalRoleDashboard } from "../../components/internal-role-dashboard";
import { QuoteShell } from "../../components/quotes/quote-shell";
import { getCurrentUser } from "../../lib/auth";
import { requireMonthlyUsage } from "../../lib/operations-server";
import { requireRequestQueue } from "../../lib/request-server";

const supervisorRoles = ["ROLE-ADMIN", "ROLE-MGMT", "ROLE-SUPERVISOR"] as const;

export default async function SupervisorDashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (
    !user.roles.some((role) => supervisorRoles.includes(role as (typeof supervisorRoles)[number]))
  ) {
    redirect("/403");
  }
  const [queue, usage] = await Promise.all([
    requireRequestQueue("supervisor"),
    requireMonthlyUsage(),
  ]);

  return (
    <QuoteShell
      activePath="/supervisor"
      displayName={user.displayName}
      isAdmin={user.roles.includes("ROLE-ADMIN")}
      locale={user.preferredLocale}
      permissions={user.permissions}
      roles={user.roles}
    >
      <InternalRoleDashboard
        locale={user.preferredLocale}
        mode="supervisor"
        queue={queue}
        usage={usage}
      />
    </QuoteShell>
  );
}
