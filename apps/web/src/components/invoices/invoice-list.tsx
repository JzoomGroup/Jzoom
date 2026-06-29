"use client";

import Link from "next/link";
import { useState } from "react";
import type { InvoiceSummary } from "../../lib/invoice-types";
import { EmptyState, MetricCard, PageHeader, SectionCard, StatusChip } from "../premium-os";
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
  const totalDue = items.reduce((sum, invoice) => sum + invoice.finalDueNoTax, 0);

  return (
    <>
      <PageHeader
        eyebrow="Commercial operations"
        title="Invoices"
        description="Invoices are created only from accepted quote snapshots and never recalculate live catalog, pricing-rule, or quote data."
        actions={[{ href: "/pricing/quotes", label: "Accepted quotes" }]}
      />

      <section className="os-bento-grid compact">
        <MetricCard accent label="Invoices" value={items.length} detail="Snapshot records" />
        <MetricCard label="Total due" value={sar(totalDue)} detail="Before tax" />
        <MetricCard
          label="Issued"
          value={items.filter((invoice) => invoice.status === "ISSUED").length}
          detail="Ready for downstream handling"
        />
      </section>

      <SectionCard eyebrow="Invoice library" title="Commercial snapshots">
        {items.length === 0 ? (
          <EmptyState title="No invoices yet">
            Accepted quote snapshots can be converted into invoices when the flow is ready.
          </EmptyState>
        ) : (
          <div className="quote-list-grid">
            {items.map((invoice) => (
              <article className="quote-list-card" key={invoice.id}>
                <Link className="quote-list-main" href={`/pricing/invoices/${invoice.id}`}>
                  <div>
                    <small>{invoice.invoiceNumber}</small>
                    <h2>{invoice.title}</h2>
                    <p>
                      {invoice.client.name} - Quote {invoice.quoteNumber}
                    </p>
                  </div>
                  <div className="quote-list-meta">
                    <StatusChip status={invoice.status} label={invoice.status} />
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
      </SectionCard>
    </>
  );
}
