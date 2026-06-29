import Link from "next/link";
import { clientQuotePdfUrl } from "../../lib/client-portal-client";
import type { ClientQuote } from "../../lib/client-portal-types";
import { PageHeader, SectionCard, SmartTable, StatusChip } from "../premium-os";
import { dateLabel, sar } from "./client-format";

export function ClientQuoteDetail({ quote }: { quote: ClientQuote }) {
  return (
    <>
      <PageHeader
        eyebrow="Quote snapshot"
        title={quote.quoteNumber}
        description="This quote is displayed from its stored snapshot. Later catalog or pricing changes do not alter this record."
        meta={<StatusChip status={quote.status} label={quote.status} />}
      >
        <div className="quote-header-actions">
          <a
            className="os-button os-button-primary"
            href={clientQuotePdfUrl(quote.id)}
            target="_blank"
            rel="noreferrer"
          >
            View PDF
          </a>
          <Link className="os-button os-button-secondary" href="/client/quotes">
            All quotes
          </Link>
        </div>
      </PageHeader>

      <section className="quote-summary-grid">
        <SectionCard eyebrow="Client details" title={quote.client.legalName ?? quote.client.name}>
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
        </SectionCard>
        <SectionCard eyebrow="Terms" title="Commercial terms">
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
        </SectionCard>
      </section>

      <SectionCard
        eyebrow="Quote lines"
        title="Selected services"
        description={`${quote.items.length} snapshotted service lines.`}
      >
        <SmartTable>
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
                    <small>{item.serviceSnapshot.serviceLevelLabel ?? "-"}</small>
                  </td>
                  <td>{item.quantity}</td>
                  <td>{sar(item.serviceSnapshot.baseAmount)}</td>
                  <td>{sar(item.setupFee)}</td>
                  <td>{sar(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SmartTable>
      </SectionCard>

      <SectionCard eyebrow="Financial snapshot" title="Totals">
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
      </SectionCard>
    </>
  );
}
