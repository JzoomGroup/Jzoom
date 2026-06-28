import { redirect } from "next/navigation";
import { AdminShell } from "../../../components/admin-shell";
import { PlatformConfigurationManager } from "../../../components/platform-configuration/platform-configuration-manager";
import { getCurrentUser } from "../../../lib/auth";
import { requirePlatformConfiguration } from "../../../lib/platform-configuration-server";

export default async function AdminPlatformConfigurationPage() {
  const [user, snapshot] = await Promise.all([getCurrentUser(), requirePlatformConfiguration()]);

  if (!user) {
    redirect("/login");
  }
  if (
    !user.roles.includes("ROLE-ADMIN") ||
    !user.permissions.includes("PERM-MANAGE-PLATFORM-CONFIGURATION")
  ) {
    redirect("/403");
  }

  return (
    <AdminShell
      activePath="/admin/platform-configuration"
      displayName={user.displayName}
      locale={user.preferredLocale}
    >
      <PlatformConfigurationManager initialSnapshot={snapshot} />
    </AdminShell>
  );
}
