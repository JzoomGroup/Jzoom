import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/auth";
import {
  requirePricingCatalog,
  requirePricingDraft,
  requirePricingDrafts,
} from "../../lib/pricing-server";
import { PricingStudio } from "./pricing-studio";

export async function PricingStudioPage({ draftId }: { draftId?: string }) {
  const [user, catalog, drafts, draft] = await Promise.all([
    getCurrentUser(),
    requirePricingCatalog(),
    requirePricingDrafts(),
    draftId ? requirePricingDraft(draftId) : Promise.resolve(null),
  ]);
  if (!user) {
    redirect("/login");
  }
  if (
    !user.roles.some((role) => role === "ROLE-ADMIN" || role === "ROLE-AM") ||
    !user.permissions.includes("PERM-USE-PRICING-STUDIO")
  ) {
    redirect("/403");
  }

  return (
    <PricingStudio
      displayName={user.displayName}
      isAdmin={user.roles.includes("ROLE-ADMIN")}
      initialCatalog={catalog}
      initialDrafts={drafts}
      initialDraft={draft}
    />
  );
}
