import { redirect } from "next/navigation";
import { ProjectList } from "../../components/projects/project-board";
import { QuoteShell } from "../../components/quotes/quote-shell";
import { getCurrentUser } from "../../lib/auth";
import { requireProjects } from "../../lib/project-server";

const projectRoles = [
  "ROLE-ADMIN",
  "ROLE-MGMT",
  "ROLE-AM",
  "ROLE-SUPERVISOR",
  "ROLE-SPECIALIST",
  "ROLE-PROJECT-SPECIALIST",
] as const;

export default async function ProjectsPage() {
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

  const projects = await requireProjects();

  return (
    <QuoteShell
      activePath="/projects"
      displayName={user.displayName}
      isAdmin={user.roles.includes("ROLE-ADMIN")}
      locale={user.preferredLocale}
      permissions={user.permissions}
      roles={user.roles}
    >
      <ProjectList locale={user.preferredLocale} projects={projects} />
    </QuoteShell>
  );
}
