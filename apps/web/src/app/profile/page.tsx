import { redirect } from "next/navigation";
import { AppShell } from "../../components/app-shell";
import { LogoutButton } from "../../components/logout-button";
import { PageHeader, SectionCard } from "../../components/premium-os";
import { profilePageCopy, profileRoleLabel } from "../../i18n/pages";
import { getCurrentUser } from "../../lib/auth";
import { normalizeLocale } from "../../lib/i18n";
import { protectedRouteRedirect } from "../../lib/route-access";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  const destination = protectedRouteRedirect(user);
  if (destination) {
    redirect(destination);
  }

  const locale = normalizeLocale(user!.preferredLocale);
  const copy = profilePageCopy[locale];
  const mode = user!.userType === "EXTERNAL" ? "client" : "internal";

  return (
    <AppShell
      activePath="/profile"
      displayName={user!.displayName}
      isAdmin={user!.roles.includes("ROLE-ADMIN")}
      locale={locale}
      mode={mode}
      permissions={user!.permissions}
      roles={user!.roles}
    >
      <PageHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.lead} />

      <SectionCard title={user!.displayName} description={user!.email}>
        <dl className="profile-list os-definition-list">
          <div>
            <dt>{copy.email}</dt>
            <dd>{user!.email}</dd>
          </div>
          <div>
            <dt>{copy.accountType}</dt>
            <dd>{user!.userType === "EXTERNAL" ? copy.clientAccount : copy.internalAccount}</dd>
          </div>
          <div>
            <dt>{copy.roles}</dt>
            <dd>{user!.roles.map((role) => profileRoleLabel(role, locale)).join(", ")}</dd>
          </div>
          <div>
            <dt>{copy.language}</dt>
            <dd>{locale === "ar" ? copy.arabic : copy.english}</dd>
          </div>
        </dl>
        <LogoutButton label={copy.signOut} submittingLabel={copy.signingOut} />
      </SectionCard>
    </AppShell>
  );
}
