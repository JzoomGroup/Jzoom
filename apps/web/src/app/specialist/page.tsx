import { redirect } from "next/navigation";
import { InternalRoleDashboard } from "../../components/internal-role-dashboard";
import { QuoteShell } from "../../components/quotes/quote-shell";
import { getCurrentUser } from "../../lib/auth";
import { requireMonthlyUsage } from "../../lib/operations-server";
import { requireRequestQueue } from "../../lib/request-server";

const specialistRoles = ["ROLE-ADMIN", "ROLE-SPECIALIST"] as const;

export default async function SpecialistDashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (
    !user.roles.some((role) => specialistRoles.includes(role as (typeof specialistRoles)[number]))
  ) {
    redirect("/403");
  }
  const [queue, usage] = await Promise.all([
    requireRequestQueue("specialist"),
    requireMonthlyUsage(),
  ]);

  return (
    <QuoteShell
      displayName={user.displayName}
      isAdmin={user.roles.includes("ROLE-ADMIN")}
      permissions={user.permissions}
      roles={user.roles}
    >
      <InternalRoleDashboard mode="specialist" queue={queue} usage={usage} />
    </QuoteShell>
  );
}
