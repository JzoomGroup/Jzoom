import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "../../components/app-shell";
import { LogoutButton } from "../../components/logout-button";
import { PageHeader, SectionCard } from "../../components/premium-os";
import { settingsPageCopy } from "../../i18n/pages";
import { getCurrentUser, hasBackendAdminAccess } from "../../lib/auth";
import { normalizeLocale } from "../../lib/i18n";
import { protectedRouteRedirect } from "../../lib/route-access";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const destination = protectedRouteRedirect(user, true);
  if (destination) {
    redirect(destination);
  }
  if (!(await hasBackendAdminAccess())) {
    redirect("/403");
  }

  const locale = normalizeLocale(user!.preferredLocale);
  const copy = settingsPageCopy[locale];

  return (
    <AppShell
      activePath="/settings"
      displayName={user!.displayName}
      isAdmin
      locale={locale}
      mode="admin"
      permissions={user!.permissions}
      roles={user!.roles}
    >
      <PageHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.lead} />

      <SectionCard>
        <div className="row-actions">
          <Link className="os-button os-button-primary" href="/admin/platform-configuration">
            {copy.open}
          </Link>
          <LogoutButton label={copy.signOut} submittingLabel={copy.signingOut} />
        </div>
      </SectionCard>
    </AppShell>
  );
}
