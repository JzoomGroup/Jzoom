"use client";

import Link from "next/link";
import { useState } from "react";
import { invoicePdfUrl } from "../../lib/invoice-client";
import type { Invoice } from "../../lib/invoice-types";
import { InvoiceLifecycleActions } from "./invoice-lifecycle-actions";

function sar(value: number): string {
  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function InvoiceDetail({ initialInvoice }: { initialInvoice: Invoice }) {
  const [invoice, setInvoice] = useState(initialInvoice);

  return (
    <>
      <header className="catalog-header">
        <div>
          <p className="eyebrow">Immutable invoice snapshot</p>
          <h1>{invoice.invoiceNumber}</h1>
          <p>
            Created from accepted quote {invoice.quoteNumber}. Snapshot hash:{" "}
            {invoice.snapshotHash?.slice(0, 16)}…
          </p>
        </div>
        <div className="quote-header-actions">
          <span className={`status-badge status-${invoice.status.toLowerCase()}`}>
            {invoice.status}
          </span>
          <a
            className="button-primary"
            href={invoicePdfUrl(invoice.id)}
            target="_blank"
            rel="noreferrer"
          >
            View PDF
          </a>
          <Link className="button-secondary" href={`/pricing/quotes/${invoice.quoteId}`}>
            Source quote
          </Link>
          <Link className="button-secondary" href="/pricing/invoices">
            All invoices
          </Link>
        </div>
      </header>

      {invoice.status === "DRAFT" || invoice.status === "ISSUED" ? (
        <section className="catalog-panel quote-lifecycle">
          <div>
            <h2>Lifecycle</h2>
            <p>
              Invoice issuance, cancellation, and voiding are audited and never rewrite invoice
              content.
            </p>
          </div>
          <InvoiceLifecycleActions
            invoiceId={invoice.id}
            status={invoice.status}
            onUpdated={setInvoice}
          />
        </section>
      ) : null}

      <section className="quote-summary-grid">
        <article className="catalog-panel">
          <p className="eyebrow">Client snapshot</p>
          <h2>{invoice.client.name}</h2>
          <dl className="quote-definition-list">
            <div>
              <dt>Code</dt>
              <dd>{invoice.client.code}</dd>
            </div>
            <div>
              <dt>Legal name</dt>
              <dd>{invoice.client.legalName ?? invoice.client.name}</dd>
            </div>
            <div>
              <dt>Sector</dt>
              <dd>{invoice.client.sector}</dd>
            </div>
            <div>
              <dt>Approver</dt>
              <dd>{invoice.client.authorizedApprover}</dd>
            </div>
          </dl>
        </article>
        <article className="catalog-panel">
          <p className="eyebrow">Source quote snapshot</p>
          <h2>{invoice.quoteNumber}</h2>
          <dl className="quote-definition-list">
            <div>
              <dt>Quote status at invoice creation</dt>
              <dd>{invoice.quote.status}</dd>
            </div>
            <div>
              <dt>Quote snapshot hash</dt>
              <dd>{invoice.sourceQuoteSnapshotHash?.slice(0, 16)}…</dd>
            </div>
            <div>
              <dt>Issue date</dt>
              <dd>
                {invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString("en-SA") : "—"}
              </dd>
            </div>
            <div>
              <dt>Status note</dt>
              <dd>{invoice.statusReason ?? "None"}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="catalog-panel">
        <div className="panel-heading">
          <div>
            <h2>Snapshotted invoice lines</h2>
            <p>{invoice.items.length} immutable invoice lines.</p>
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
            <strong>− {sar(invoice.discountTotal)}</strong>
          </div>
          <div className="primary">
            <span>Final due before tax</span>
            <strong>{sar(invoice.finalDueNoTax)}</strong>
          </div>
        </div>
        <p className="pricing-muted">
          This invoice PDF is generated from the immutable invoice snapshot. Tax QR codes,
          e-invoicing artifacts, payment gateways, and payment status remain outside this PR.
        </p>
      </section>
    </>
  );
}
