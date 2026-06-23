import { redirect } from "next/navigation";
import { ClientShell } from "../../components/client-portal/client-shell";
import { NotificationInbox } from "../../components/operations/notification-inbox";
import { QuoteShell } from "../../components/quotes/quote-shell";
import { getCurrentUser } from "../../lib/auth";
import { requireNotifications } from "../../lib/operations-server";

export default async function NotificationsPage() {
  const [user, notifications] = await Promise.all([getCurrentUser(), requireNotifications()]);
  if (!user) {
    redirect("/login");
  }

  if (user.roles.includes("ROLE-CLIENT")) {
    return (
      <ClientShell activePath="/notifications" displayName={user.displayName}>
        <NotificationInbox initial={notifications} />
      </ClientShell>
    );
  }

  return (
    <QuoteShell displayName={user.displayName} isAdmin={user.roles.includes("ROLE-ADMIN")}>
      <NotificationInbox initial={notifications} />
    </QuoteShell>
  );
}
