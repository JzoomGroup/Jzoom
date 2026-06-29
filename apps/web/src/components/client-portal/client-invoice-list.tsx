import Link from "next/link";
import type { ClientInvoiceSummary } from "../../lib/client-portal-types";
import { EmptyState, MetricCard, PageHeader, SectionCard, StatusChip } from "../premium-os";
import { dateLabel, sar } from "./client-format";

export function ClientInvoiceList({ invoices }: { invoices: ClientInvoiceSummary[] }) {
  const totalDue = invoices.reduce((sum, invoice) => sum + invoice.finalDueNoTax, 0);

  return (
    <>
      <PageHeader
        eyebrow="Commercial center"
        title="Your invoices"
        description="Issued invoice snapshots for your client account, kept separate from live catalog changes."
      />

      <section className="os-bento-grid compact">
        <MetricCard accent label="Issued invoices" value={invoices.length} detail="Visible records" />
        <MetricCard label="Total due" value={sar(totalDue)} detail="Before tax" />
        <MetricCard
          label="Latest issue"
          value={invoices[0] ? dateLabel(invoices[0].issueDate) : "-"}
          detail="Based on current list order"
        />
      </section>

      <SectionCard eyebrow="Invoice library" title="Commercial snapshots">
        {invoices.length === 0 ? (
          <EmptyState title="No invoices yet">No issued invoices are available yet.</EmptyState>
        ) : (
          <div className="quote-list-grid">
            {invoices.map((invoice) => (
              <article className="quote-list-card" key={invoice.id}>
                <Link className="quote-list-main" href={`/client/invoices/${invoice.id}`}>
                  <div>
                    <small>{invoice.invoiceNumber}</small>
                    <h2>{invoice.title}</h2>
                    <p>
                      Quote {invoice.quoteNumber} - Issued {dateLabel(invoice.issueDate)}
                    </p>
                  </div>
                  <div className="quote-list-meta">
                    <StatusChip status={invoice.status} label={invoice.status} />
                    <strong>{sar(invoice.finalDueNoTax)}</strong>
                    <small>{invoice.itemCount} items</small>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}
