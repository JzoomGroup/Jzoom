"use client";

import Link from "next/link";
import { useState } from "react";
import type { InvoiceStatus, InvoiceSummary } from "../../lib/invoice-types";
import {
  businessText,
  commercialCopy,
  commercialLocale,
  countText,
  dateText,
  invoiceStatusLabel,
  money,
} from "../commercial-i18n";
import { EmptyState, MetricCard, PageHeader, SectionCard, StatusChip } from "../premium-os";
import { InvoiceLifecycleActions } from "./invoice-lifecycle-actions";

export function InvoiceList({
  invoices,
  locale: localeInput = "en",
}: {
  invoices: InvoiceSummary[];
  locale?: string;
}) {
  const locale = commercialLocale(localeInput);
  const t = commercialCopy[locale];
  const [items, setItems] = useState(invoices);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "ALL">("ALL");
  const visibleItems =
    statusFilter === "ALL" ? items : items.filter((invoice) => invoice.status === statusFilter);
  const totalDue = items.reduce((sum, invoice) => sum + invoice.finalDueNoTax, 0);
  const statuses: Array<InvoiceStatus | "ALL"> = ["ALL", "DRAFT", "ISSUED", "CANCELLED", "VOIDED"];

  function nextStep(status: InvoiceStatus): string {
    if (status === "DRAFT") return t.issueInvoice;
    if (status === "ISSUED") return t.readyForHandling;
    return t.terminalRecord;
  }

  return (
    <>
      <PageHeader
        eyebrow={locale === "ar" ? "العمليات التجارية" : "Commercial operations"}
        title={t.invoices}
        description={t.invoiceDescription}
        actions={[{ href: "/pricing/quotes", label: t.acceptedQuotes }]}
      />

      <section className="os-bento-grid compact">
        <MetricCard
          accent
          label={t.invoices}
          value={countText(items.length, locale)}
          detail={t.snapshotRecords}
        />
        <MetricCard label={t.totalDue} value={money(totalDue, locale)} detail={t.beforeTax} />
        <MetricCard
          label={t.issued}
          value={countText(items.filter((invoice) => invoice.status === "ISSUED").length, locale)}
          detail={t.readyForHandling}
        />
      </section>

      <SectionCard eyebrow={t.invoiceLibrary} title={t.commercialSnapshots}>
        <div className="commercial-filter-bar" aria-label={t.allStatuses}>
          {statuses.map((status) => (
            <button
              className={statusFilter === status ? "active" : undefined}
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
            >
              {status === "ALL" ? t.allStatuses : invoiceStatusLabel(status, locale)}
            </button>
          ))}
        </div>
        {visibleItems.length === 0 ? (
          <EmptyState title={t.noInvoicesTitle}>{t.noInvoices}</EmptyState>
        ) : (
          <div className="quote-list-grid">
            {visibleItems.map((invoice) => (
              <article className="quote-list-card" key={invoice.id}>
                <Link className="quote-list-main" href={`/pricing/invoices/${invoice.id}`}>
                  <div>
                    <small>{invoice.invoiceNumber}</small>
                    <h2>{businessText(invoice.title, locale, t.invoices)}</h2>
                    <p>
                      {invoice.client.name} - {t.quote} {invoice.quoteNumber}
                    </p>
                    <dl className="commercial-card-meta">
                      <div>
                        <dt>{t.issueDate}</dt>
                        <dd>{dateText(invoice.issueDate, locale)}</dd>
                      </div>
                      <div>
                        <dt>{t.nextStep}</dt>
                        <dd>{nextStep(invoice.status)}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="quote-list-meta">
                    <StatusChip
                      status={invoice.status}
                      label={invoiceStatusLabel(invoice.status, locale)}
                    />
                    <strong>{money(invoice.finalDueNoTax, locale)}</strong>
                    <small>
                      {countText(invoice.itemCount, locale)} {t.items}
                    </small>
                  </div>
                </Link>
                <InvoiceLifecycleActions
                  compact
                  invoiceId={invoice.id}
                  locale={locale}
                  status={invoice.status}
                  onUpdated={(updated) =>
                    setItems((current) =>
                      current.map((item) =>
                        item.id === updated.id
                          ? {
                              ...item,
                              issuedAt: updated.issuedAt,
                              status: updated.status,
                              updatedAt: updated.updatedAt,
                            }
                          : item,
                      ),
                    )
                  }
                />
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}
