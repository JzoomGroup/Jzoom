import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type {
  ClientInvoice,
  ClientInvoiceSummary,
  ClientPortalAccount,
  ClientQuote,
  ClientQuoteSummary,
} from "./client-portal-types";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

async function requireClientPortalResponse<T>(path: string): Promise<T> {
  const cookieStore = await cookies();
  const response = await fetch(`${apiBaseUrl}/client-portal/${path}`, {
    cache: "no-store",
    headers: { cookie: cookieStore.toString() },
  }).catch(() => null);

  if (!response) {
    throw new Error("The client portal API is unavailable.");
  }
  if (response.status === 401) {
    redirect("/login");
  }
  if (response.status === 403) {
    redirect("/403");
  }
  if (response.status === 404) {
    redirect("/client");
  }
  if (!response.ok) {
    throw new Error(`The client portal API returned ${response.status}.`);
  }
  return (await response.json()) as T;
}

export function requireClientPortalAccount(): Promise<ClientPortalAccount> {
  return requireClientPortalResponse<ClientPortalAccount>("me");
}

export function requireClientQuotes(): Promise<ClientQuoteSummary[]> {
  return requireClientPortalResponse<ClientQuoteSummary[]>("quotes");
}

export function requireClientQuote(id: string): Promise<ClientQuote> {
  return requireClientPortalResponse<ClientQuote>(`quotes/${id}`);
}

export function requireClientInvoices(): Promise<ClientInvoiceSummary[]> {
  return requireClientPortalResponse<ClientInvoiceSummary[]>("invoices");
}

export function requireClientInvoice(id: string): Promise<ClientInvoice> {
  return requireClientPortalResponse<ClientInvoice>(`invoices/${id}`);
}
