import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/auth";
import { requireCatalogSnapshot } from "../../lib/catalog-server";
import type { CatalogSection } from "../../lib/catalog-types";
import { AdminShell } from "../admin-shell";
import { CatalogWorkspace } from "./catalog-workspace";

export async function CatalogPage({
  section,
  activePath,
}: {
  section: CatalogSection;
  activePath: string;
}) {
  const [user, snapshot] = await Promise.all([getCurrentUser(), requireCatalogSnapshot()]);
  if (!user) {
    redirect("/login");
  }
  if (!user.roles.includes("ROLE-ADMIN")) {
    redirect("/403");
  }

  return (
    <AdminShell
      activePath={activePath}
      displayName={user.displayName}
      locale={user.preferredLocale}
    >
      <CatalogWorkspace
        initialSnapshot={snapshot}
        locale={user.preferredLocale}
        section={section}
      />
    </AdminShell>
  );
}
