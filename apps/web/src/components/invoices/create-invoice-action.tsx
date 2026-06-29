"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createInvoice, invoiceErrorMessage } from "../../lib/invoice-client";
import type { Quote } from "../../lib/quote-types";

export function CreateInvoiceAction({ quote }: { quote: Quote }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const existing = quote.invoices[0];

  if (existing) {
    return (
      <Link className="os-button os-button-primary" href={`/pricing/invoices/${existing.id}`}>
        View invoice {existing.invoiceNumber}
      </Link>
    );
  }

  if (quote.status !== "ACCEPTED") {
    return null;
  }

  async function submit() {
    setCreating(true);
    setError(null);
    try {
      const invoice = await createInvoice({ quoteId: quote.id });
      router.push(`/pricing/invoices/${invoice.id}`);
    } catch (invoiceError) {
      setError(invoiceErrorMessage(invoiceError));
      setCreating(false);
    }
  }

  return (
    <div className="quote-action-stack">
      <button className="os-button os-button-primary" disabled={creating} type="button" onClick={submit}>
        {creating ? "Creating invoice…" : "Create invoice"}
      </button>
      {error && <small className="quote-action-feedback error">{error}</small>}
    </div>
  );
}
