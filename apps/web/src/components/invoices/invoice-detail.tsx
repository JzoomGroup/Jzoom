"use client";

import Link from "next/link";
import { useState } from "react";
import { invoicePdfUrl } from "../../lib/invoice-client";
import type { Invoice } from "../../lib/invoice-types";
import { PageHeader, SectionCard, SmartTable, StatusChip } from "../premium-os";
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
      <PageHeader
        eyebrow="Invoice snapshot"
        title={invoice.invoiceNumber}
        description={`Created from accepted quote ${invoice.quoteNumber}. Snapshot hash: ${invoice.snapshotHash?.slice(0, 16) ?? "not available"}.`}
        meta={<StatusChip status={invoice.status} label={invoice.status} />}
      >
        <div className="quote-header-actions">
          <a
            className="os-button os-button-primary"
            href={invoicePdfUrl(invoice.id)}
            target="_blank"
            rel="noreferrer"
          >
            View PDF
          </a>
          <Link className="os-button os-button-secondary" href={`/pricing/quotes/${invoice.quoteId}`}>
            Source quote
          </Link>
          <Link className="os-button os-button-secondary" href="/pricing/invoices">
            All invoices
          </Link>
        </div>
      </PageHeader>

      {invoice.status === "DRAFT" || invoice.status === "ISSUED" ? (
        <SectionCard
          eyebrow="Governance"
          title="Lifecycle"
          description="Invoice issuance, cancellation, and voiding are audited and never rewrite invoice content."
        >
          <InvoiceLifecycleActions
            invoiceId={invoice.id}
            status={invoice.status}
            onUpdated={setInvoice}
          />
        </SectionCard>
      ) : null}

      <section className="quote-summary-grid">
        <SectionCard eyebrow="Client snapshot" title={invoice.client.name}>
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
        </SectionCard>
        <SectionCard eyebrow="Source quote" title={invoice.quoteNumber}>
          <dl className="quote-definition-list">
            <div>
              <dt>Quote status at invoice creation</dt>
              <dd>{invoice.quote.status}</dd>
            </div>
            <div>
              <dt>Quote snapshot hash</dt>
              <dd>{invoice.sourceQuoteSnapshotHash?.slice(0, 16) ?? "not available"}</dd>
            </div>
            <div>
              <dt>Issue date</dt>
              <dd>
                {invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString("en-SA") : "-"}
              </dd>
            </div>
            <div>
              <dt>Status note</dt>
              <dd>{invoice.statusReason ?? "None"}</dd>
            </div>
          </dl>
        </SectionCard>
      </section>

      <SectionCard
        eyebrow="Invoice lines"
        title="Snapshotted invoice lines"
        description={`${invoice.items.length} immutable invoice lines.`}
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

      <SectionCard
        eyebrow="Financial snapshot"
        title="Invoice total"
        description="Generated from the immutable invoice snapshot. Tax QR codes, e-invoicing artifacts, payment gateways, and payment status remain outside this flow."
      >
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
