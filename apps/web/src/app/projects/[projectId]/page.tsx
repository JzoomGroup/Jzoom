import { redirect } from "next/navigation";
import { ProjectDetail } from "../../../components/projects/project-board";
import { QuoteShell } from "../../../components/quotes/quote-shell";
import { getCurrentUser } from "../../../lib/auth";
import { requireProject } from "../../../lib/project-server";

const projectRoles = [
  "ROLE-ADMIN",
  "ROLE-MGMT",
  "ROLE-AM",
  "ROLE-SUPERVISOR",
  "ROLE-SPECIALIST",
  "ROLE-PROJECT-SPECIALIST",
] as const;

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (user.mustChangePassword) {
    redirect("/change-password");
  }
  if (!user.roles.some((role) => projectRoles.includes(role as (typeof projectRoles)[number]))) {
    redirect("/403");
  }

  const project = await requireProject(projectId);

  return (
    <QuoteShell
      activePath="/projects"
      displayName={user.displayName}
      isAdmin={user.roles.includes("ROLE-ADMIN")}
      locale={user.preferredLocale}
      permissions={user.permissions}
      roles={user.roles}
    >
      <ProjectDetail locale={user.preferredLocale} project={project} />
    </QuoteShell>
  );
}
