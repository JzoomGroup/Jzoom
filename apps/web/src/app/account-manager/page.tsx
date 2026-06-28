import { redirect } from "next/navigation";
import { AccountManagerPortfolio } from "../../components/operations/account-manager-portfolio";
import { QuoteShell } from "../../components/quotes/quote-shell";
import { getCurrentUser } from "../../lib/auth";
import { requireAccountManagerPortfolio } from "../../lib/operations-server";

const accountManagerRoles = ["ROLE-ADMIN", "ROLE-MGMT", "ROLE-AM"] as const;

export default async function AccountManagerPage() {
  const [user, portfolio] = await Promise.all([getCurrentUser(), requireAccountManagerPortfolio()]);
  if (!user) {
    redirect("/login");
  }
  if (
    !user.roles.some((role) =>
      accountManagerRoles.includes(role as (typeof accountManagerRoles)[number]),
    )
  ) {
    redirect("/403");
  }

  return (
    <QuoteShell
      displayName={user.displayName}
      isAdmin={user.roles.includes("ROLE-ADMIN")}
      permissions={user.permissions}
      roles={user.roles}
    >
      <AccountManagerPortfolio portfolio={portfolio} />
    </QuoteShell>
  );
}
