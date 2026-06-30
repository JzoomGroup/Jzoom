import { ProjectList } from "../../../components/projects/project-board";
import { ClientShell } from "../../../components/client-portal/client-shell";
import { requireClientPortalAccount } from "../../../lib/client-portal-server";
import { requireClientProjects } from "../../../lib/project-server";

export default async function ClientProjectsPage() {
  const [account, projects] = await Promise.all([
    requireClientPortalAccount(),
    requireClientProjects(),
  ]);

  return (
    <ClientShell
      activePath="/client/projects"
      displayName={account.user.displayName}
      locale={account.user.preferredLocale}
    >
      <ProjectList clientMode locale={account.user.preferredLocale} projects={projects} />
    </ClientShell>
  );
}
