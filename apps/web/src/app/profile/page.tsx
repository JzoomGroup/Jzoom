import { redirect } from "next/navigation";
import { LogoutButton } from "../../components/logout-button";
import { getCurrentUser } from "../../lib/auth";
import { protectedRouteRedirect } from "../../lib/route-access";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  const destination = protectedRouteRedirect(user);
  if (destination) {
    redirect(destination);
  }

  return (
    <main className="auth-shell" dir="ltr">
      <section className="auth-card" aria-labelledby="profile-title">
        <p className="eyebrow">Authenticated profile</p>
        <h1 id="profile-title">{user!.displayName}</h1>
        <dl className="profile-list">
          <div>
            <dt>Email</dt>
            <dd>{user!.email}</dd>
          </div>
          <div>
            <dt>Account type</dt>
            <dd>{user!.userType}</dd>
          </div>
          <div>
            <dt>Roles</dt>
            <dd>{user!.roles.join(", ")}</dd>
          </div>
        </dl>
        <LogoutButton />
      </section>
    </main>
  );
}
