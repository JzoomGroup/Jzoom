import { redirect } from "next/navigation";
import { AdminShell } from "../admin-shell";
import { getCurrentUser } from "../../lib/auth";
import { requireOneTimeCatalogSnapshot } from "../../lib/one-time-catalog-server";
import { OneTimeCategoryManager } from "./one-time-category-manager";
import { OneTimeServiceManager } from "./one-time-service-manager";

export async function OneTimeCatalogPage({
  section,
  activePath,
}: {
  section: "categories" | "services";
  activePath: string;
}) {
  const [user, snapshot] = await Promise.all([getCurrentUser(), requireOneTimeCatalogSnapshot()]);
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
      permissions={user.permissions}
      roles={user.roles}
    >
      {section === "categories" ? (
        <OneTimeCategoryManager initialSnapshot={snapshot} locale={user.preferredLocale} />
      ) : (
        <OneTimeServiceManager initialSnapshot={snapshot} locale={user.preferredLocale} />
      )}
    </AdminShell>
  );
}
