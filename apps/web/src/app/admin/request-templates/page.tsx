import { redirect } from "next/navigation";
import { AdminShell } from "../../../components/admin-shell";
import { RequestTemplateManager } from "../../../components/request-templates/request-template-manager";
import { getCurrentUser } from "../../../lib/auth";
import { requireRequestTemplates } from "../../../lib/request-templates-server";

export default async function AdminRequestTemplatesPage() {
  const [user, snapshot] = await Promise.all([getCurrentUser(), requireRequestTemplates()]);

  if (!user) {
    redirect("/login");
  }
  if (
    !user.roles.includes("ROLE-ADMIN") ||
    !user.permissions.includes("PERM-MANAGE-REQUEST-TEMPLATES")
  ) {
    redirect("/403");
  }

  return (
    <AdminShell
      activePath="/admin/request-templates"
      displayName={user.displayName}
      locale={user.preferredLocale}
    >
      <RequestTemplateManager initialSnapshot={snapshot} />
    </AdminShell>
  );
}
