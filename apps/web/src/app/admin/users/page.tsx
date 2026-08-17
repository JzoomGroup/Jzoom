import { redirect } from "next/navigation";
import { AdminUsersPageContent } from "../../../components/admin-access/admin-access-pages";
import { AdminShell } from "../../../components/admin-shell";
import { getCurrentUser } from "../../../lib/auth";
import { requireAdminRoles, requireAdminUsers } from "../../../lib/admin-access-server";

export default async function AdminUsersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }
  if (!user.roles.includes("ROLE-ADMIN") || !user.permissions.includes("PERM-MANAGE-USERS")) {
    redirect("/403");
  }
  const canModifyPermissions = user.permissions.includes("PERM-MODIFY-USER-PERMISSIONS");
  const [snapshot, accessSnapshot] = await Promise.all([
    requireAdminUsers(),
    canModifyPermissions ? requireAdminRoles() : Promise.resolve({ permissions: [], roles: [] }),
  ]);

  return (
    <AdminShell
      activePath="/admin/users"
      displayName={user.displayName}
      locale={user.preferredLocale}
      permissions={user.permissions}
      roles={user.roles}
    >
      <AdminUsersPageContent
        canModifyPermissions={canModifyPermissions}
        currentUserId={user.id}
        locale={user.preferredLocale}
        permissions={accessSnapshot.permissions}
        roles={accessSnapshot.roles}
        setup={snapshot.setup}
        users={snapshot.users}
      />
    </AdminShell>
  );
}
