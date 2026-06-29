import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/auth";
import { requireQuote, requireQuotes } from "../../lib/quote-server";
import { QuoteDetail } from "./quote-detail";
import { QuoteList } from "./quote-list";
import { QuoteShell } from "./quote-shell";

function canUseQuotes(
  user: Awaited<ReturnType<typeof getCurrentUser>>,
): user is NonNullable<typeof user> {
  return Boolean(
    user &&
    user.roles.some(
      (role) => role === "ROLE-ADMIN" || role === "ROLE-MGMT" || role === "ROLE-AM",
    ) &&
    user.permissions.includes("PERM-MANAGE-QUOTES"),
  );
}

export async function QuotesPage({ quoteId }: { quoteId?: string }) {
  const [user, content] = await Promise.all([
    getCurrentUser(),
    quoteId ? requireQuote(quoteId) : requireQuotes(),
  ]);
  if (!user) {
    redirect("/login");
  }
  if (!canUseQuotes(user)) {
    redirect("/403");
  }

  return (
    <QuoteShell
      activePath="/pricing/quotes"
      displayName={user.displayName}
      isAdmin={user.roles.includes("ROLE-ADMIN")}
      locale={user.preferredLocale}
      permissions={user.permissions}
      roles={user.roles}
    >
      {Array.isArray(content) ? (
        <QuoteList locale={user.preferredLocale} quotes={content} />
      ) : (
        <QuoteDetail initialQuote={content} locale={user.preferredLocale} />
      )}
    </QuoteShell>
  );
}
