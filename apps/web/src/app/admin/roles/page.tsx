import { redirect } from "next/navigation";
import { AdminRolesPageContent } from "../../../components/admin-access/admin-access-pages";
import { AdminShell } from "../../../components/admin-shell";
import { getCurrentUser } from "../../../lib/auth";
import { requireAdminRoles } from "../../../lib/admin-access-server";

export default async function AdminRolesPage() {
  const [user, snapshot] = await Promise.all([getCurrentUser(), requireAdminRoles()]);

  if (!user) {
    redirect("/login");
  }
  if (
    !user.roles.includes("ROLE-ADMIN") ||
    !user.permissions.includes("PERM-MODIFY-USER-PERMISSIONS")
  ) {
    redirect("/403");
  }

  return (
    <AdminShell
      activePath="/admin/roles"
      displayName={user.displayName}
      locale={user.preferredLocale}
    >
      <AdminRolesPageContent
        locale={user.preferredLocale}
        permissions={snapshot.permissions}
        roles={snapshot.roles}
      />
    </AdminShell>
  );
}
