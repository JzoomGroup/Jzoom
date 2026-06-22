import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Invoice, InvoiceSummary } from "./invoice-types";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

async function requireInvoiceResponse<T>(path: string): Promise<T> {
  const cookieStore = await cookies();
  const response = await fetch(`${apiBaseUrl}/${path}`, {
    cache: "no-store",
    headers: { cookie: cookieStore.toString() },
  }).catch(() => null);

  if (!response) {
    throw new Error("The invoice API is unavailable.");
  }
  if (response.status === 401) {
    redirect("/login");
  }
  if (response.status === 403) {
    redirect("/403");
  }
  if (!response.ok) {
    throw new Error(`The invoice API returned ${response.status}.`);
  }
  return (await response.json()) as T;
}

export function requireInvoices(): Promise<InvoiceSummary[]> {
  return requireInvoiceResponse<InvoiceSummary[]>("invoices");
}

export function requireInvoice(id: string): Promise<Invoice> {
  return requireInvoiceResponse<Invoice>(`invoices/${id}`);
}
