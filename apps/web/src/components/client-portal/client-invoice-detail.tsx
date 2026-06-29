import Link from "next/link";
import { clientInvoicePdfUrl } from "../../lib/client-portal-client";
import type { ClientInvoice } from "../../lib/client-portal-types";
import { PageHeader, SectionCard, SmartTable, StatusChip } from "../premium-os";
import { dateLabel, sar } from "./client-format";

export function ClientInvoiceDetail({ invoice }: { invoice: ClientInvoice }) {
  return (
    <>
      <PageHeader
        eyebrow="Invoice snapshot"
        title={invoice.invoiceNumber}
        description={`This invoice is displayed from the stored snapshot created from accepted quote ${invoice.quoteNumber}.`}
        meta={<StatusChip status={invoice.status} label={invoice.status} />}
      >
        <div className="quote-header-actions">
          <a
            className="os-button os-button-primary"
            href={clientInvoicePdfUrl(invoice.id)}
            target="_blank"
            rel="noreferrer"
          >
            View PDF
          </a>
          <Link className="os-button os-button-secondary" href="/client/invoices">
            All invoices
          </Link>
        </div>
      </PageHeader>

      <section className="quote-summary-grid">
        <SectionCard eyebrow="Client details" title={invoice.client.legalName ?? invoice.client.name}>
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
        </SectionCard>
        <SectionCard eyebrow="Terms" title="Invoice terms">
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
        </SectionCard>
      </section>

      <SectionCard
        eyebrow="Invoice lines"
        title="Invoice lines"
        description={`${invoice.items.length} snapshotted invoice lines.`}
      >
        <SmartTable>
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
                    <small>{item.itemSnapshot.serviceSnapshot.serviceLevelLabel ?? "-"}</small>
                  </td>
                  <td>{item.quantity}</td>
                  <td>{sar(item.unitPrice)}</td>
                  <td>{sar(item.discount)}</td>
                  <td>{sar(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SmartTable>
      </SectionCard>

      <SectionCard eyebrow="Financial snapshot" title="Invoice total">
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
      </SectionCard>
    </>
  );
}
