import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Quote, QuoteSummary } from "./quote-types";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

async function requireQuoteResponse<T>(path: string): Promise<T> {
  const cookieStore = await cookies();
  const response = await fetch(`${apiBaseUrl}/${path}`, {
    cache: "no-store",
    headers: { cookie: cookieStore.toString() },
  }).catch(() => null);

  if (!response) {
    throw new Error("The quote API is unavailable.");
  }
  if (response.status === 401) {
    redirect("/login");
  }
  if (response.status === 403) {
    redirect("/403");
  }
  if (!response.ok) {
    throw new Error(`The quote API returned ${response.status}.`);
  }
  return (await response.json()) as T;
}

export function requireQuotes(): Promise<QuoteSummary[]> {
  return requireQuoteResponse<QuoteSummary[]>("quotes");
}

export function requireQuote(id: string): Promise<Quote> {
  return requireQuoteResponse<Quote>(`quotes/${id}`);
}
