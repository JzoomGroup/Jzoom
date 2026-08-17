import { clientInvoiceListCopy as copy } from "../../i18n/dictionaries/client-portal";
import Link from "next/link";
import type { ClientInvoiceSummary } from "../../lib/client-portal-types";
import { EmptyState, MetricCard, PageHeader, SectionCard, StatusChip } from "../premium-os";
import {
  clientCurrency,
  clientDate,
  clientLocale,
  clientNumber,
  invoiceStatusLabel,
  localizedFreeText,
} from "./client-format";

export function ClientInvoiceList({
  invoices,
  locale: localeInput = "en",
}: {
  invoices: ClientInvoiceSummary[];
  locale?: string;
}) {
  const locale = clientLocale(localeInput);
  const t = copy[locale];
  const totalDue = invoices.reduce((sum, invoice) => sum + invoice.finalDueNoTax, 0);

  return (
    <>
      <PageHeader eyebrow={t.commercialCenter} title={t.invoices} description={t.description} />

      <section className="os-bento-grid compact">
        <MetricCard
          accent
          label={t.issuedInvoices}
          value={clientNumber(invoices.length, locale)}
          detail={locale === "ar" ? "سجلات ظاهرة" : "Visible records"}
        />
        <MetricCard
          label={t.totalDue}
          value={clientCurrency(totalDue, locale)}
          detail={t.beforeTax}
        />
        <MetricCard
          label={t.latestIssue}
          value={invoices[0] ? clientDate(invoices[0].issueDate, locale) : "-"}
          detail={t.basedOrder}
        />
      </section>

      <SectionCard eyebrow={t.invoiceLibrary} title={t.commercialSnapshots}>
        {invoices.length === 0 ? (
          <EmptyState title={t.noInvoices}>{t.noInvoicesBody}</EmptyState>
        ) : (
          <div className="quote-list-grid">
            {invoices.map((invoice) => (
              <article className="quote-list-card" key={invoice.id}>
                <Link className="quote-list-main" href={`/client/invoices/${invoice.id}`}>
                  <div>
                    <small>{invoice.invoiceNumber}</small>
                    <h2>{localizedFreeText(invoice.title, locale, t.invoices)}</h2>
                    <p>
                      {t.quote} {invoice.quoteNumber} - {t.issued}{" "}
                      {clientDate(invoice.issueDate, locale)}
                    </p>
                  </div>
                  <div className="quote-list-meta">
                    <StatusChip
                      status={invoice.status}
                      label={invoiceStatusLabel(invoice.status, locale)}
                    />
                    <strong>{clientCurrency(invoice.finalDueNoTax, locale)}</strong>
                    <small>
                      {clientNumber(invoice.itemCount, locale)} {t.item}
                    </small>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}
