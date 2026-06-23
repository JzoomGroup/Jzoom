import { redirect } from "next/navigation";
import Link from "next/link";
import { LogoutButton } from "../../components/logout-button";
import { getCurrentUser, hasBackendAdminAccess } from "../../lib/auth";
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

  return (
    <main className="auth-shell" dir="ltr">
      <section className="auth-card" aria-labelledby="settings-title">
        <p className="eyebrow">Admin only</p>
        <h1 id="settings-title">Platform settings</h1>
        <p className="lead">
          Access is enforced by the API. Platform configuration is managed from the Admin Console.
        </p>
        <Link className="button-link" href="/admin/platform-configuration">
          Open platform configuration
        </Link>
        <LogoutButton />
      </section>
    </main>
  );
}
