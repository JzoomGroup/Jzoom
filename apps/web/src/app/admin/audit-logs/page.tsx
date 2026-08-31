import { redirect } from "next/navigation";
import { AdminAuditLogsPageContent } from "../../../components/admin-access/admin-access-pages";
import { AdminShell } from "../../../components/admin-shell";
import { getCurrentUser } from "../../../lib/auth";
import { requireAdminAuditLogs } from "../../../lib/admin-access-server";
import { firstQueryValue, type QueryValue } from "../../../lib/url-state";

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, QueryValue>>;
}) {
  const params = await searchParams;
  const initialFilters = {
    category: firstQueryValue(params.category) || "all",
    eventCode: firstQueryValue(params.event) || "all",
    query: firstQueryValue(params.q),
    severity: firstQueryValue(params.severity) || "all",
  };
  const [user, snapshot] = await Promise.all([getCurrentUser(), requireAdminAuditLogs()]);

  if (!user) {
    redirect("/login");
  }
  if (!user.roles.includes("ROLE-ADMIN") || !user.permissions.includes("PERM-MANAGE-USERS")) {
    redirect("/403");
  }

  return (
    <AdminShell
      activePath="/admin/audit-logs"
      displayName={user.displayName}
      locale={user.preferredLocale}
      permissions={user.permissions}
      roles={user.roles}
    >
      <AdminAuditLogsPageContent
        initialFilters={initialFilters}
        locale={user.preferredLocale}
        logs={snapshot.logs}
      />
    </AdminShell>
  );
}
