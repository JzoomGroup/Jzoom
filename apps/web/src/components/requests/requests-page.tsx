import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/auth";
import { requireRequest, requireRequests } from "../../lib/request-server";
import { QuoteShell } from "../quotes/quote-shell";
import { RequestDetail } from "./request-detail";
import { RequestList } from "./request-list";

function canUseRequests(
  user: Awaited<ReturnType<typeof getCurrentUser>>,
): user is NonNullable<typeof user> {
  return Boolean(
    user &&
    user.roles.some((role) =>
      ["ROLE-ADMIN", "ROLE-MGMT", "ROLE-AM", "ROLE-SPECIALIST", "ROLE-SUPERVISOR"].includes(role),
    ),
  );
}

export async function RequestsPage({ requestId }: { requestId?: string }) {
  const [user, content] = await Promise.all([
    getCurrentUser(),
    requestId ? requireRequest(requestId) : requireRequests(),
  ]);
  if (!user) {
    redirect("/login");
  }
  if (!canUseRequests(user)) {
    redirect("/403");
  }

  return (
    <QuoteShell displayName={user.displayName} isAdmin={user.roles.includes("ROLE-ADMIN")}>
      {Array.isArray(content) ? (
        <RequestList requests={content} />
      ) : (
        <RequestDetail initialRequest={content} />
      )}
    </QuoteShell>
  );
}
