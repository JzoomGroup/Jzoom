"use client";

import Link from "next/link";
import { useState } from "react";
import type { QuoteSummary } from "../../lib/quote-types";
import { QuoteLifecycleActions } from "./quote-lifecycle-actions";

function sar(value: number): string {
  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function QuoteList({ quotes }: { quotes: QuoteSummary[] }) {
  const [items, setItems] = useState(quotes);

  return (
    <>
      <header className="catalog-header">
        <div>
          <p className="eyebrow">Immutable commercial records</p>
          <h1>Quotes</h1>
          <p>
            Quotes are created from saved pricing drafts. Their client, service, pricing-rule,
            terms, and total snapshots never change.
          </p>
        </div>
        <Link className="button-primary" href="/pricing">
          Open Pricing Studio
        </Link>
      </header>
      <section className="catalog-panel">
        {items.length === 0 ? (
          <div className="catalog-empty">No quotes have been created yet.</div>
        ) : (
          <div className="quote-list-grid">
            {items.map((quote) => (
              <article className="quote-list-card" key={quote.id}>
                <Link className="quote-list-main" href={`/pricing/quotes/${quote.id}`}>
                  <div>
                    <small>{quote.quoteNumber}</small>
                    <h2>{quote.title}</h2>
                    <p>{quote.client.name}</p>
                  </div>
                  <div className="quote-list-meta">
                    <span className={`status-badge status-${quote.status.toLowerCase()}`}>
                      {quote.status}
                    </span>
                    <strong>{quote.totals ? sar(quote.totals.finalTotal) : "—"}</strong>
                    <small>{quote.itemCount} items</small>
                  </div>
                </Link>
                <QuoteLifecycleActions
                  compact
                  quoteId={quote.id}
                  status={quote.status}
                  onUpdated={(updated) =>
                    setItems((current) =>
                      current.map((item) =>
                        item.id === updated.id
                          ? { ...item, status: updated.status, updatedAt: updated.updatedAt }
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
