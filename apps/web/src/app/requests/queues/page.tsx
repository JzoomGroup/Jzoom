import { RequestQueue } from "../../../components/requests/request-queue";
import { QuoteShell } from "../../../components/quotes/quote-shell";
import { getCurrentUser } from "../../../lib/auth";
import { requireRequestQueue } from "../../../lib/request-server";
import { redirect } from "next/navigation";

function canUseQueues(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  return Boolean(
    user &&
    user.roles.some((role) =>
      ["ROLE-ADMIN", "ROLE-MGMT", "ROLE-AM", "ROLE-SPECIALIST", "ROLE-SUPERVISOR"].includes(role),
    ),
  );
}

export default async function RequestQueuesPage() {
  const [user, queue] = await Promise.all([getCurrentUser(), requireRequestQueue("all")]);
  if (!user) {
    redirect("/login");
  }
  if (!canUseQueues(user)) {
    redirect("/403");
  }

  return (
    <QuoteShell
      activePath="/requests/queues"
      displayName={user.displayName}
      isAdmin={user.roles.includes("ROLE-ADMIN")}
      locale={user.preferredLocale}
      permissions={user.permissions}
      roles={user.roles}
    >
      <RequestQueue initialQueue={queue} />
    </QuoteShell>
  );
}
