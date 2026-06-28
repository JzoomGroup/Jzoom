import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/auth";
import { requirePricingRules } from "../../lib/pricing-server";
import { AdminShell } from "../admin-shell";
import { PricingRuleManager } from "./pricing-rule-manager";

export async function PricingRulesPage() {
  const [user, snapshot] = await Promise.all([getCurrentUser(), requirePricingRules()]);
  if (!user) {
    redirect("/login");
  }
  if (
    !user.roles.includes("ROLE-ADMIN") ||
    !user.permissions.includes("PERM-MANAGE-PRICING-RULES")
  ) {
    redirect("/403");
  }

  return (
    <AdminShell
      activePath="/admin/pricing-rules"
      displayName={user.displayName}
      locale={user.preferredLocale}
    >
      <PricingRuleManager initialSnapshot={snapshot} />
    </AdminShell>
  );
}
