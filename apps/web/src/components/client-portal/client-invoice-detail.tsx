import { clientInvoiceDetailCopy as copy } from "../../i18n/dictionaries/client-portal";
import Link from "next/link";
import { clientInvoicePdfUrl } from "../../lib/client-portal-client";
import type { ClientInvoice } from "../../lib/client-portal-types";
import { PageHeader, SectionCard, SmartTable, StatusChip } from "../premium-os";
import {
  clientCurrency,
  clientDate,
  clientLocale,
  clientName,
  clientNumber,
  invoiceStatusLabel,
  localizedLineType,
} from "./client-format";

export function ClientInvoiceDetail({
  invoice,
  locale: localeInput = "en",
}: {
  invoice: ClientInvoice;
  locale?: string;
}) {
  const locale = clientLocale(localeInput);
  const t = copy[locale];

  return (
    <>
      <PageHeader
        eyebrow={t.invoiceSnapshot}
        title={invoice.invoiceNumber}
        description={t.description(invoice.quoteNumber)}
        meta={
          <StatusChip status={invoice.status} label={invoiceStatusLabel(invoice.status, locale)} />
        }
      >
        <div className="quote-header-actions">
          <a
            className="os-button os-button-primary"
            href={clientInvoicePdfUrl(invoice.id)}
            target="_blank"
            rel="noreferrer"
          >
            {t.viewPdf}
          </a>
          <Link className="os-button os-button-secondary" href="/client/invoices">
            {t.allInvoices}
          </Link>
        </div>
      </PageHeader>

      <section className="quote-summary-grid">
        <SectionCard
          eyebrow={t.clientDetails}
          title={invoice.client.legalName ?? invoice.client.name}
        >
          <dl className="quote-definition-list">
            <div>
              <dt>{t.clientCode}</dt>
              <dd>{invoice.client.code}</dd>
            </div>
            <div>
              <dt>{t.sourceQuote}</dt>
              <dd>{invoice.quoteNumber}</dd>
            </div>
            <div>
              <dt>{t.issued}</dt>
              <dd>{clientDate(invoice.issueDate, locale)}</dd>
            </div>
          </dl>
        </SectionCard>
        <SectionCard eyebrow={t.terms} title={t.invoiceTerms}>
          <dl className="quote-definition-list">
            <div>
              <dt>{t.payment}</dt>
              <dd>{invoice.terms.paymentTerms}</dd>
            </div>
            <div>
              <dt>{t.delivery}</dt>
              <dd>{invoice.terms.deliveryTerms ?? t.noValue}</dd>
            </div>
            <div>
              <dt>{t.additional}</dt>
              <dd>{invoice.terms.additionalTerms ?? t.none}</dd>
            </div>
          </dl>
        </SectionCard>
      </section>

      <SectionCard
        eyebrow={t.invoiceLines}
        title={t.invoiceLines}
        description={
          locale === "ar"
            ? `${clientNumber(invoice.items.length, locale)} بند فاتورة محفوظ في النسخة.`
            : `${invoice.items.length} snapshotted invoice lines.`
        }
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
                    <strong>{clientName(item.itemSnapshot.serviceSnapshot, locale)}</strong>
                    <small>{item.itemSnapshot.serviceSnapshot.serviceCode}</small>
                  </td>
                  <td>
                    {localizedLineType(item.itemSnapshot.lineType, locale)}
                    <small>{item.itemSnapshot.serviceSnapshot.serviceLevelLabel ?? "-"}</small>
                  </td>
                  <td>{clientNumber(item.quantity, locale)}</td>
                  <td>{clientCurrency(item.unitPrice, locale)}</td>
                  <td>{clientCurrency(item.discount, locale)}</td>
                  <td>{clientCurrency(item.lineTotal, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SmartTable>
      </SectionCard>

      <SectionCard
        eyebrow={locale === "ar" ? "الملخص المالي" : "Financial snapshot"}
        title={t.invoiceTotal}
      >
        <div className="pricing-total-grid">
          <div>
            <span>{t.discount}</span>
            <strong>- {clientCurrency(invoice.discountTotal, locale)}</strong>
          </div>
          <div className="primary">
            <span>{t.finalDue}</span>
            <strong>{clientCurrency(invoice.finalDueNoTax, locale)}</strong>
          </div>
        </div>
      </SectionCard>
    </>
  );
}
