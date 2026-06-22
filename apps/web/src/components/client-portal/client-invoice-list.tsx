import Link from "next/link";
import type { ClientInvoiceSummary } from "../../lib/client-portal-types";
import { dateLabel, sar } from "./client-format";

export function ClientInvoiceList({ invoices }: { invoices: ClientInvoiceSummary[] }) {
  return (
    <>
      <header className="catalog-header">
        <div>
          <p className="eyebrow">Immutable commercial records</p>
          <h1>Your invoices</h1>
          <p>Only issued invoices for your client account are shown.</p>
        </div>
      </header>
      <section className="catalog-panel">
        {invoices.length === 0 ? (
          <div className="catalog-empty">No issued invoices are available yet.</div>
        ) : (
          <div className="quote-list-grid">
            {invoices.map((invoice) => (
              <article className="quote-list-card" key={invoice.id}>
                <Link className="quote-list-main" href={`/client/invoices/${invoice.id}`}>
                  <div>
                    <small>{invoice.invoiceNumber}</small>
                    <h2>{invoice.title}</h2>
                    <p>
                      Quote {invoice.quoteNumber} · Issued {dateLabel(invoice.issueDate)}
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
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
