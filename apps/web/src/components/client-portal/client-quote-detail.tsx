import Link from "next/link";
import { clientQuotePdfUrl } from "../../lib/client-portal-client";
import type { ClientQuote } from "../../lib/client-portal-types";
import { dateLabel, sar } from "./client-format";

export function ClientQuoteDetail({ quote }: { quote: ClientQuote }) {
  return (
    <>
      <header className="catalog-header">
        <div>
          <p className="eyebrow">Immutable quote snapshot</p>
          <h1>{quote.quoteNumber}</h1>
          <p>
            This quote is displayed from its stored snapshot. Later catalog or pricing changes do
            not alter this record.
          </p>
        </div>
        <div className="quote-header-actions">
          <span className={`status-badge status-${quote.status.toLowerCase()}`}>
            {quote.status}
          </span>
          <a
            className="button-primary"
            href={clientQuotePdfUrl(quote.id)}
            target="_blank"
            rel="noreferrer"
          >
            View PDF
          </a>
          <Link className="button-secondary" href="/client/quotes">
            All quotes
          </Link>
        </div>
      </header>

      <section className="quote-summary-grid">
        <article className="catalog-panel">
          <p className="eyebrow">Client details</p>
          <h2>{quote.client.legalName ?? quote.client.name}</h2>
          <dl className="quote-definition-list">
            <div>
              <dt>Code</dt>
              <dd>{quote.client.code}</dd>
            </div>
            <div>
              <dt>Sector</dt>
              <dd>{quote.client.sector ?? "Not specified"}</dd>
            </div>
            <div>
              <dt>Approver</dt>
              <dd>{quote.client.authorizedApprover ?? "Not specified"}</dd>
            </div>
          </dl>
        </article>
        <article className="catalog-panel">
          <p className="eyebrow">Terms</p>
          <h2>Commercial terms</h2>
          <dl className="quote-definition-list">
            <div>
              <dt>Valid until</dt>
              <dd>{dateLabel(quote.terms.validUntil ?? quote.validUntil)}</dd>
            </div>
            <div>
              <dt>Payment</dt>
              <dd>{quote.terms.paymentTerms}</dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd>{quote.terms.deliveryTerms ?? "Not specified"}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="catalog-panel">
        <div className="panel-heading">
          <div>
            <h2>Selected services</h2>
            <p>{quote.items.length} snapshotted service lines.</p>
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
            <strong>- {sar(quote.totals.discountTotal)}</strong>
          </div>
          <div>
            <span>Estimated tax</span>
            <strong>{sar(quote.totals.taxTotal)}</strong>
          </div>
          <div className="primary">
            <span>Final total</span>
            <strong>{sar(quote.totals.finalTotal)}</strong>
          </div>
        </div>
      </section>
    </>
  );
}
