"use client";

import Link from "next/link";
import { useState } from "react";
import type { InvoiceSummary } from "../../lib/invoice-types";
import { InvoiceLifecycleActions } from "./invoice-lifecycle-actions";

function sar(value: number): string {
  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function InvoiceList({ invoices }: { invoices: InvoiceSummary[] }) {
  const [items, setItems] = useState(invoices);

  return (
    <>
      <header className="catalog-header">
        <div>
          <p className="eyebrow">Immutable commercial records</p>
          <h1>Invoices</h1>
          <p>
            Invoices are created only from accepted quote snapshots. They do not recalculate live
            catalog, pricing-rule, or quote data.
          </p>
        </div>
        <Link className="button-secondary" href="/pricing/quotes">
          Accepted quotes
        </Link>
      </header>
      <section className="catalog-panel">
        {items.length === 0 ? (
          <div className="catalog-empty">No invoices have been created yet.</div>
        ) : (
          <div className="quote-list-grid">
            {items.map((invoice) => (
              <article className="quote-list-card" key={invoice.id}>
                <Link className="quote-list-main" href={`/pricing/invoices/${invoice.id}`}>
                  <div>
                    <small>{invoice.invoiceNumber}</small>
                    <h2>{invoice.title}</h2>
                    <p>
                      {invoice.client.name} · Quote {invoice.quoteNumber}
                    </p>
                  </div>
                  <div className="quote-list-meta">
                    <span className={`status-badge status-${invoice.status.toLowerCase()}`}>
                      {invoice.status}
                    </span>
                    <strong>{sar(invoice.finalDueNoTax)}</strong>
                    <small>{invoice.itemCount} items</small>
                  </div>
                </Link>
                <InvoiceLifecycleActions
                  compact
                  invoiceId={invoice.id}
                  status={invoice.status}
                  onUpdated={(updated) =>
                    setItems((current) =>
                      current.map((item) =>
                        item.id === updated.id
                          ? {
                              ...item,
                              issuedAt: updated.issuedAt,
                              status: updated.status,
                              updatedAt: updated.updatedAt,
                            }
                          : item,
                      ),
                    )
                  }
                />
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
