import { redirect } from "next/navigation";
import { AdminShell } from "../../../components/admin-shell";
import { ClientManager } from "../../../components/clients/client-manager";
import { getCurrentUser } from "../../../lib/auth";
import { requireClientsSnapshot } from "../../../lib/clients-server";

export default async function AdminClientsPage() {
  const [user, snapshot] = await Promise.all([getCurrentUser(), requireClientsSnapshot()]);

  if (!user) {
    redirect("/login");
  }
  if (!user.roles.includes("ROLE-ADMIN") || !user.permissions.includes("PERM-MANAGE-CLIENTS")) {
    redirect("/403");
  }

  return (
    <AdminShell
      activePath="/admin/clients"
      displayName={user.displayName}
      locale={user.preferredLocale}
    >
      <ClientManager initialSnapshot={snapshot} locale={user.preferredLocale} />
    </AdminShell>
  );
}
