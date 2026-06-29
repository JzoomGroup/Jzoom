"use client";

import Link from "next/link";
import { useState } from "react";
import type { QuoteSummary } from "../../lib/quote-types";
import { EmptyState, MetricCard, PageHeader, SectionCard, StatusChip } from "../premium-os";
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
  const totalValue = items.reduce((sum, quote) => sum + (quote.totals?.finalTotal ?? 0), 0);

  return (
    <>
      <PageHeader
        eyebrow="Commercial records"
        title="Quotes"
        description="Quotes are created from saved pricing drafts. Client, service, pricing-rule, terms, and total snapshots remain immutable."
        actions={[{ href: "/pricing", label: "Open Pricing Studio", variant: "primary" }]}
      />

      <section className="os-bento-grid compact">
        <MetricCard accent label="Quotes" value={items.length} detail="Snapshot records" />
        <MetricCard label="Total value" value={sar(totalValue)} detail="Across listed quotes" />
        <MetricCard
          label="Issued"
          value={items.filter((quote) => quote.status === "ISSUED").length}
          detail="Ready for client flow"
        />
      </section>

      <SectionCard eyebrow="Quote library" title="Commercial snapshots">
        {items.length === 0 ? (
          <EmptyState title="No quotes yet">No quotes have been created yet.</EmptyState>
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
                    <StatusChip status={quote.status} label={quote.status} />
                    <strong>{quote.totals ? sar(quote.totals.finalTotal) : "-"}</strong>
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
      </SectionCard>
    </>
  );
}
