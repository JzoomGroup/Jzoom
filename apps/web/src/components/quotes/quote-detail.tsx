"use client";

import Link from "next/link";
import { useState } from "react";
import { quotePdfUrl } from "../../lib/quote-client";
import type { Quote } from "../../lib/quote-types";
import { QuoteLifecycleActions } from "./quote-lifecycle-actions";

function sar(value: number): string {
  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function QuoteDetail({ initialQuote }: { initialQuote: Quote }) {
  const [quote, setQuote] = useState(initialQuote);

  return (
    <>
      <header className="catalog-header">
        <div>
          <p className="eyebrow">Immutable quote snapshot</p>
          <h1>{quote.quoteNumber}</h1>
          <p>
            Created from {quote.sourceDraft.title} at calculation version {quote.sourceDraftVersion}
            . Snapshot hash: {quote.snapshotHash?.slice(0, 16)}…
          </p>
        </div>
        <div className="quote-header-actions">
          <span className={`status-badge status-${quote.status.toLowerCase()}`}>
            {quote.status}
          </span>
          <a
            className="button-primary"
            href={quotePdfUrl(quote.id)}
            target="_blank"
            rel="noreferrer"
          >
            View PDF
          </a>
          <Link className="button-secondary" href={`/pricing/${quote.sourcePricingDraftId}`}>
            Source draft
          </Link>
          <Link className="button-secondary" href="/pricing/quotes">
            All quotes
          </Link>
        </div>
      </header>

      {quote.status === "DRAFT" || quote.status === "ISSUED" ? (
        <section className="catalog-panel quote-lifecycle">
          <div>
            <h2>Lifecycle</h2>
            <p>
              Acceptance, rejection, expiration, and cancellation are audited and never rewrite
              quote content.
            </p>
          </div>
          <QuoteLifecycleActions quoteId={quote.id} status={quote.status} onUpdated={setQuote} />
        </section>
      ) : null}

      <section className="quote-summary-grid">
        <article className="catalog-panel">
          <p className="eyebrow">Client snapshot</p>
          <h2>{quote.client.name}</h2>
          <dl className="quote-definition-list">
            <div>
              <dt>Code</dt>
              <dd>{quote.client.code}</dd>
            </div>
            <div>
              <dt>Legal name</dt>
              <dd>{quote.client.legalName ?? quote.client.name}</dd>
            </div>
            <div>
              <dt>Sector</dt>
              <dd>{quote.client.sector}</dd>
            </div>
            <div>
              <dt>Approver</dt>
              <dd>{quote.client.authorizedApprover}</dd>
            </div>
          </dl>
        </article>
        <article className="catalog-panel">
          <p className="eyebrow">Terms snapshot</p>
          <h2>Commercial terms</h2>
          <dl className="quote-definition-list">
            <div>
              <dt>Valid until</dt>
              <dd>{new Date(quote.terms.validUntil).toLocaleDateString("en-SA")}</dd>
            </div>
            <div>
              <dt>Payment</dt>
              <dd>{quote.terms.paymentTerms}</dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd>{quote.terms.deliveryTerms ?? "Not specified"}</dd>
            </div>
            <div>
              <dt>Additional</dt>
              <dd>{quote.terms.additionalTerms ?? "None"}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="catalog-panel">
        <div className="panel-heading">
          <div>
            <h2>Snapshotted services</h2>
            <p>{quote.items.length} immutable quote lines.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="catalog-table pricing-lines">
            <thead>
              <tr>
                <th>Service</th>
                <th>Type / package</th>
                <th>Quantity</th>
                <th>Base</th>
                <th>Setup</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {quote.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.serviceSnapshot.nameEn}</strong>
                    <small>{item.serviceSnapshot.serviceCode}</small>
                    {item.serviceItems.length > 0 && (
                      <ul className="quote-service-items">
                        {item.serviceItems.map((serviceItem) => (
                          <li key={serviceItem.itemCode}>{serviceItem.nameEn}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td>
                    {item.lineType === "MONTHLY" ? "Monthly" : "One-time"}
                    <small>{item.serviceSnapshot.serviceLevelLabel ?? "—"}</small>
                  </td>
                  <td>{item.quantity}</td>
                  <td>{sar(item.serviceSnapshot.baseAmount)}</td>
                  <td>{sar(item.setupFee)}</td>
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
            <span>Monthly</span>
            <strong>{sar(quote.totals.subtotalMonthly)}</strong>
          </div>
          <div>
            <span>Setup fees</span>
            <strong>{sar(quote.totals.subtotalSetup)}</strong>
          </div>
          <div>
            <span>One-time</span>
            <strong>{sar(quote.totals.subtotalOneTime)}</strong>
          </div>
          <div>
            <span>Discount</span>
            <strong>− {sar(quote.totals.discountTotal)}</strong>
          </div>
          <div>
            <span>Tax snapshot</span>
            <strong>{sar(quote.totals.taxTotal)}</strong>
          </div>
          <div className="primary">
            <span>Final total</span>
            <strong>{sar(quote.totals.finalTotal)}</strong>
          </div>
          <div>
            <span>Internal cost</span>
            <strong>{sar(quote.totals.internalCost)}</strong>
          </div>
          <div>
            <span>Margin</span>
            <strong>{quote.totals.marginPct}%</strong>
          </div>
        </div>
        {quote.pricingRules.length > 0 && (
          <p className="pricing-muted">
            Pricing-rule versions:{" "}
            {quote.pricingRules.map((rule) => `${rule.code} v${rule.version}`).join(", ")}
          </p>
        )}
      </section>
    </>
  );
}
