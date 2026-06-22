import Link from "next/link";
import { clientInvoicePdfUrl } from "../../lib/client-portal-client";
import type { ClientInvoice } from "../../lib/client-portal-types";
import { dateLabel, sar } from "./client-format";

export function ClientInvoiceDetail({ invoice }: { invoice: ClientInvoice }) {
  return (
    <>
      <header className="catalog-header">
        <div>
          <p className="eyebrow">Immutable invoice snapshot</p>
          <h1>{invoice.invoiceNumber}</h1>
          <p>
            This invoice is displayed from the stored invoice snapshot created from accepted quote{" "}
            {invoice.quoteNumber}.
          </p>
        </div>
        <div className="quote-header-actions">
          <span className={`status-badge status-${invoice.status.toLowerCase()}`}>
            {invoice.status}
          </span>
          <a
            className="button-primary"
            href={clientInvoicePdfUrl(invoice.id)}
            target="_blank"
            rel="noreferrer"
          >
            View PDF
          </a>
          <Link className="button-secondary" href="/client/invoices">
            All invoices
          </Link>
        </div>
      </header>

      <section className="quote-summary-grid">
        <article className="catalog-panel">
          <p className="eyebrow">Client details</p>
          <h2>{invoice.client.legalName ?? invoice.client.name}</h2>
          <dl className="quote-definition-list">
            <div>
              <dt>Client code</dt>
              <dd>{invoice.client.code}</dd>
            </div>
            <div>
              <dt>Source quote</dt>
              <dd>{invoice.quoteNumber}</dd>
            </div>
            <div>
              <dt>Issued</dt>
              <dd>{dateLabel(invoice.issueDate)}</dd>
            </div>
          </dl>
        </article>
        <article className="catalog-panel">
          <p className="eyebrow">Terms</p>
          <h2>Invoice terms</h2>
          <dl className="quote-definition-list">
            <div>
              <dt>Payment</dt>
              <dd>{invoice.terms.paymentTerms}</dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd>{invoice.terms.deliveryTerms ?? "Not specified"}</dd>
            </div>
            <div>
              <dt>Additional</dt>
              <dd>{invoice.terms.additionalTerms ?? "None"}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="catalog-panel">
        <div className="panel-heading">
          <div>
            <h2>Invoice lines</h2>
            <p>{invoice.items.length} snapshotted invoice lines.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="catalog-table pricing-lines">
            <thead>
              <tr>
                <th>Service</th>
                <th>Type / package</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Discount</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.itemSnapshot.serviceSnapshot.nameEn}</strong>
                    <small>{item.itemSnapshot.serviceSnapshot.serviceCode}</small>
                  </td>
                  <td>
                    {item.itemSnapshot.lineType === "MONTHLY" ? "Monthly" : "One-time"}
                    <small>{item.itemSnapshot.serviceSnapshot.serviceLevelLabel ?? "—"}</small>
                  </td>
                  <td>{item.quantity}</td>
                  <td>{sar(item.unitPrice)}</td>
                  <td>{sar(item.discount)}</td>
                  <td>{sar(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="catalog-panel">
        <div className="pricing-total-grid">
          <div>
            <span>Discount</span>
            <strong>- {sar(invoice.discountTotal)}</strong>
          </div>
          <div className="primary">
            <span>Final due before tax</span>
            <strong>{sar(invoice.finalDueNoTax)}</strong>
          </div>
        </div>
      </section>
    </>
  );
}
