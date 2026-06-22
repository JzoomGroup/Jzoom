import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type {
  PricingDraft,
  PricingDraftSummary,
  PricingRulesSnapshot,
  PricingStudioCatalog,
} from "./pricing-types";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

async function requirePricingResponse<T>(path: string): Promise<T> {
  const cookieStore = await cookies();
  const response = await fetch(`${apiBaseUrl}/${path}`, {
    cache: "no-store",
    headers: { cookie: cookieStore.toString() },
  }).catch(() => null);

  if (!response) {
    throw new Error("The pricing API is unavailable.");
  }
  if (response.status === 401) {
    redirect("/login");
  }
  if (response.status === 403) {
    redirect("/403");
  }
  if (!response.ok) {
    throw new Error(`The pricing API returned ${response.status}.`);
  }
  return (await response.json()) as T;
}

export function requirePricingRules(): Promise<PricingRulesSnapshot> {
  return requirePricingResponse<PricingRulesSnapshot>("admin/pricing-rules");
}

export function requirePricingCatalog(): Promise<PricingStudioCatalog> {
  return requirePricingResponse<PricingStudioCatalog>("pricing/catalog");
}

export function requirePricingDrafts(): Promise<PricingDraftSummary[]> {
  return requirePricingResponse<PricingDraftSummary[]>("pricing/drafts");
}

export function requirePricingDraft(id: string): Promise<PricingDraft> {
  return requirePricingResponse<PricingDraft>(`pricing/drafts/${id}`);
}
