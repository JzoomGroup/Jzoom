"use client";

import Link from "next/link";
import { useState } from "react";
import { quotePdfUrl } from "../../lib/quote-client";
import type { Quote } from "../../lib/quote-types";
import { CreateInvoiceAction } from "../invoices/create-invoice-action";
import { PageHeader, SectionCard, SmartTable, StatusChip } from "../premium-os";
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
      <PageHeader
        eyebrow="Commercial snapshot"
        title={quote.quoteNumber}
        description={`Created from ${quote.sourceDraft.title} at calculation version ${quote.sourceDraftVersion}. Snapshot hash: ${quote.snapshotHash?.slice(0, 16) ?? "not available"}.`}
        meta={<StatusChip status={quote.status} label={quote.status} />}
      >
        <div className="quote-header-actions">
          <a
            className="os-button os-button-primary"
            href={quotePdfUrl(quote.id)}
            target="_blank"
            rel="noreferrer"
          >
            View PDF
          </a>
          <CreateInvoiceAction quote={quote} />
          <Link className="os-button os-button-secondary" href={`/pricing/${quote.sourcePricingDraftId}`}>
            Source draft
          </Link>
          <Link className="os-button os-button-secondary" href="/pricing/quotes">
            All quotes
          </Link>
        </div>
      </PageHeader>

      {quote.status === "DRAFT" || quote.status === "ISSUED" ? (
        <SectionCard
          eyebrow="Governance"
          title="Lifecycle"
          description="Acceptance, rejection, expiration, and cancellation are audited and never rewrite quote content."
        >
          <QuoteLifecycleActions quoteId={quote.id} status={quote.status} onUpdated={setQuote} />
        </SectionCard>
      ) : null}

      <section className="quote-summary-grid">
        <SectionCard eyebrow="Client snapshot" title={quote.client.name}>
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
        </SectionCard>
        <SectionCard eyebrow="Terms snapshot" title="Commercial terms">
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
        </SectionCard>
      </section>

      <SectionCard
        eyebrow="Quote lines"
        title="Snapshotted services"
        description={`${quote.items.length} immutable quote lines.`}
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
      </SectionCard>
    </>
  );
}
