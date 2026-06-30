import { redirect } from "next/navigation";
import { AdminPermissionsPageContent } from "../../../components/admin-access/admin-access-pages";
import { AdminShell } from "../../../components/admin-shell";
import { getCurrentUser } from "../../../lib/auth";
import { requireAdminPermissions } from "../../../lib/admin-access-server";

export default async function AdminPermissionsPage() {
  const [user, snapshot] = await Promise.all([getCurrentUser(), requireAdminPermissions()]);

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
      activePath="/admin/permissions"
      displayName={user.displayName}
      locale={user.preferredLocale}
      permissions={user.permissions}
      roles={user.roles}
    >
      <AdminPermissionsPageContent
        locale={user.preferredLocale}
        permissions={snapshot.permissions}
      />
    </AdminShell>
  );
}
