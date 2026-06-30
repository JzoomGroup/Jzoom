import { redirect } from "next/navigation";
import { AdminDashboard } from "../../components/admin-dashboard";
import { AdminShell } from "../../components/admin-shell";
import { getCurrentUser } from "../../lib/auth";
import { requireClientsSnapshot } from "../../lib/clients-server";
import {
  requireAccountManagerPortfolio,
  requireMonthlyReports,
  requireMonthlyUsage,
} from "../../lib/operations-server";
import { requireRequestQueue, requireRequests } from "../../lib/request-server";

export default async function AdminDashboardPage() {
  const [user, clientsSnapshot, requestQueue, requests, usage, reports, portfolio] =
    await Promise.all([
      getCurrentUser(),
      requireClientsSnapshot(),
      requireRequestQueue("all"),
      requireRequests(),
      requireMonthlyUsage(),
      requireMonthlyReports(),
      requireAccountManagerPortfolio(),
    ]);

  if (!user) {
    redirect("/login");
  }
  if (!user.roles.includes("ROLE-ADMIN")) {
    redirect("/403");
  }

  return (
    <AdminShell
      activePath="/admin"
      displayName={user.displayName}
      locale={user.preferredLocale}
      permissions={user.permissions}
      roles={user.roles}
    >
      <AdminDashboard
        clientsSnapshot={clientsSnapshot}
        locale={user.preferredLocale}
        portfolio={portfolio}
        reports={reports}
        requestQueue={requestQueue}
        requests={requests}
        usage={usage}
      />
    </AdminShell>
  );
}
