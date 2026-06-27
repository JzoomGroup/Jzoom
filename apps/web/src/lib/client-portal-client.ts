const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

export function clientQuotePdfUrl(id: string): string {
  return `${apiBaseUrl}/client-portal/quotes/${encodeURIComponent(id)}/pdf`;
}

export function clientInvoicePdfUrl(id: string): string {
  return `${apiBaseUrl}/client-portal/invoices/${encodeURIComponent(id)}/pdf`;
}
