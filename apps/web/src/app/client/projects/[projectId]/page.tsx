import { ProjectDetail } from "../../../../components/projects/project-board";
import { ClientShell } from "../../../../components/client-portal/client-shell";
import { requireClientPortalAccount } from "../../../../lib/client-portal-server";
import { requireClientProject } from "../../../../lib/project-server";

export default async function ClientProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const [account, project] = await Promise.all([
    requireClientPortalAccount(),
    requireClientProject(projectId),
  ]);

  return (
    <ClientShell
      activePath="/client/projects"
      displayName={account.user.displayName}
      locale={account.user.preferredLocale}
    >
      <ProjectDetail clientMode locale={account.user.preferredLocale} project={project} />
    </ClientShell>
  );
}
