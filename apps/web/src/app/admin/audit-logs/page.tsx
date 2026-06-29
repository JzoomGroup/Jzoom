import { redirect } from "next/navigation";
import { AdminAuditLogsPageContent } from "../../../components/admin-access/admin-access-pages";
import { AdminShell } from "../../../components/admin-shell";
import { getCurrentUser } from "../../../lib/auth";
import { requireAdminAuditLogs } from "../../../lib/admin-access-server";

export default async function AdminAuditLogsPage() {
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
    >
      <AdminAuditLogsPageContent locale={user.preferredLocale} logs={snapshot.logs} />
    </AdminShell>
  );
}
