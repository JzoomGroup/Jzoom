"use client";

import Link from "next/link";
import { useState } from "react";
import { invoicePdfUrl } from "../../lib/invoice-client";
import type { Invoice } from "../../lib/invoice-types";
import {
  businessText,
  commercialCopy,
  commercialLocale,
  countText,
  dateText,
  hashText,
  invoiceStatusLabel,
  levelLabel,
  lineTypeLabel,
  money,
  quoteStatusLabel,
  serviceName,
} from "../commercial-i18n";
import { PageHeader, SectionCard, SmartTable, StatusChip } from "../premium-os";
import { InvoiceLifecycleActions } from "./invoice-lifecycle-actions";

export function InvoiceDetail({
  initialInvoice,
  locale: localeInput = "en",
}: {
  initialInvoice: Invoice;
  locale?: string;
}) {
  const locale = commercialLocale(localeInput);
  const t = commercialCopy[locale];
  const [invoice, setInvoice] = useState(initialInvoice);

  return (
    <>
      <PageHeader
        eyebrow={t.invoiceSnapshot}
        title={invoice.invoiceNumber}
        description={t.invoiceCreatedFrom(
          invoice.quoteNumber,
          hashText(invoice.snapshotHash, locale),
        )}
        meta={
          <StatusChip status={invoice.status} label={invoiceStatusLabel(invoice.status, locale)} />
        }
      >
        <div className="quote-header-actions">
          <a
            className="os-button os-button-primary"
            href={invoicePdfUrl(invoice.id)}
            target="_blank"
            rel="noreferrer"
          >
            {t.viewPdf}
          </a>
          <Link
            className="os-button os-button-secondary"
            href={`/pricing/quotes/${invoice.quoteId}`}
          >
            {t.sourceQuote}
          </Link>
          <Link className="os-button os-button-secondary" href="/pricing/invoices">
            {t.allInvoices}
          </Link>
        </div>
      </PageHeader>

      {invoice.status === "DRAFT" || invoice.status === "ISSUED" ? (
        <SectionCard
          eyebrow={t.governance}
          title={t.lifecycle}
          description={
            locale === "ar"
              ? "إصدار الفاتورة وإلغاؤها وإبطالها تُسجل ولا تعيد كتابة محتوى الفاتورة."
              : "Invoice issuance, cancellation, and voiding are audited and never rewrite invoice content."
          }
        >
          <InvoiceLifecycleActions
            invoiceId={invoice.id}
            locale={locale}
            status={invoice.status}
            onUpdated={setInvoice}
          />
        </SectionCard>
      ) : null}

      <section className="quote-summary-grid">
        <SectionCard eyebrow={t.clientSnapshot} title={invoice.client.name}>
          <dl className="quote-definition-list">
            <div>
              <dt>{t.code}</dt>
              <dd>{invoice.client.code}</dd>
            </div>
            <div>
              <dt>{t.legalName}</dt>
              <dd>{invoice.client.legalName ?? invoice.client.name}</dd>
            </div>
            <div>
              <dt>{t.sector}</dt>
              <dd>{invoice.client.sector}</dd>
            </div>
            <div>
              <dt>{t.approver}</dt>
              <dd>{invoice.client.authorizedApprover}</dd>
            </div>
          </dl>
        </SectionCard>
        <SectionCard eyebrow={t.sourceQuote} title={invoice.quoteNumber}>
          <dl className="quote-definition-list">
            <div>
              <dt>{t.statusAtInvoiceCreation}</dt>
              <dd>{quoteStatusLabel(invoice.quote.status, locale)}</dd>
            </div>
            <div>
              <dt>{t.sourceQuoteHash}</dt>
              <dd>{hashText(invoice.sourceQuoteSnapshotHash, locale)}</dd>
            </div>
            <div>
              <dt>{t.issueDate}</dt>
              <dd>{dateText(invoice.issueDate, locale)}</dd>
            </div>
            <div>
              <dt>{t.statusNote}</dt>
              <dd>{businessText(invoice.statusReason, locale, t.none)}</dd>
            </div>
          </dl>
        </SectionCard>
      </section>

      <SectionCard
        eyebrow={t.invoiceLines}
        title={locale === "ar" ? "بنود الفاتورة المحفوظة" : "Snapshotted invoice lines"}
        description={t.invoiceLineDescription(invoice.items.length)}
      >
        <SmartTable>
          <table className="catalog-table pricing-lines">
            <thead>
              <tr>
                <th>{t.service}</th>
                <th>{t.typePackage}</th>
                <th>{t.quantity}</th>
                <th>{t.unit}</th>
                <th>{t.discount}</th>
                <th>{t.total}</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>
                      {serviceName(
                        item.itemSnapshot.serviceSnapshot,
                        locale,
                        locale === "ar" ? "خدمة غير مترجمة" : "Untitled service",
                      )}
                    </strong>
                    <small>{item.itemSnapshot.serviceSnapshot.serviceCode}</small>
                  </td>
                  <td>
                    {lineTypeLabel(item.itemSnapshot.lineType, locale)}
                    <small>
                      {levelLabel(item.itemSnapshot.serviceSnapshot.serviceLevelLabel, locale)}
                    </small>
                  </td>
                  <td>{countText(item.quantity, locale)}</td>
                  <td>{money(item.unitPrice, locale)}</td>
                  <td>{money(item.discount, locale)}</td>
                  <td>{money(item.lineTotal, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SmartTable>
      </SectionCard>

      <SectionCard
        eyebrow={t.financialSnapshot}
        title={t.invoiceTotal}
        description={
          locale === "ar"
            ? "تم إنشاؤها من لقطة الفاتورة الثابتة. رموز QR الضريبية، متطلبات الفوترة الإلكترونية، بوابات الدفع، وحالة الدفع خارج هذا المسار الحالي."
            : "Generated from the immutable invoice snapshot. Tax QR codes, e-invoicing artifacts, payment gateways, and payment status remain outside this flow."
        }
      >
        <div className="pricing-total-grid">
          <div>
            <span>{t.discount}</span>
            <strong>- {money(invoice.discountTotal, locale)}</strong>
          </div>
          <div className="primary">
            <span>{t.finalDueBeforeTax}</span>
            <strong>{money(invoice.finalDueNoTax, locale)}</strong>
          </div>
        </div>
      </SectionCard>
    </>
  );
}
