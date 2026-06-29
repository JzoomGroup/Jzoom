import { redirect } from "next/navigation";
import { AdminUsersPageContent } from "../../../components/admin-access/admin-access-pages";
import { AdminShell } from "../../../components/admin-shell";
import { getCurrentUser } from "../../../lib/auth";
import { requireAdminUsers } from "../../../lib/admin-access-server";

export default async function AdminUsersPage() {
  const [user, snapshot] = await Promise.all([getCurrentUser(), requireAdminUsers()]);

  if (!user) {
    redirect("/login");
  }
  if (!user.roles.includes("ROLE-ADMIN") || !user.permissions.includes("PERM-MANAGE-USERS")) {
    redirect("/403");
  }

  return (
    <AdminShell
      activePath="/admin/users"
      displayName={user.displayName}
      locale={user.preferredLocale}
    >
      <AdminUsersPageContent
        locale={user.preferredLocale}
        setup={snapshot.setup}
        users={snapshot.users}
      />
    </AdminShell>
  );
}
