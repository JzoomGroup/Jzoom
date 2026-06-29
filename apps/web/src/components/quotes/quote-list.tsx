"use client";

import Link from "next/link";
import { useState } from "react";
import type { QuoteStatus, QuoteSummary } from "../../lib/quote-types";
import {
  businessText,
  commercialCopy,
  commercialLocale,
  countText,
  dateText,
  money,
  quoteStatusLabel,
} from "../commercial-i18n";
import { EmptyState, MetricCard, PageHeader, SectionCard, StatusChip } from "../premium-os";
import { QuoteLifecycleActions } from "./quote-lifecycle-actions";

export function QuoteList({
  locale: localeInput = "en",
  quotes,
}: {
  locale?: string;
  quotes: QuoteSummary[];
}) {
  const locale = commercialLocale(localeInput);
  const t = commercialCopy[locale];
  const [items, setItems] = useState(quotes);
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | "ALL">("ALL");
  const visibleItems =
    statusFilter === "ALL" ? items : items.filter((quote) => quote.status === statusFilter);
  const totalValue = items.reduce((sum, quote) => sum + (quote.totals?.finalTotal ?? 0), 0);
  const statuses: Array<QuoteStatus | "ALL"> = [
    "ALL",
    "DRAFT",
    "ISSUED",
    "ACCEPTED",
    "REJECTED",
    "EXPIRED",
    "CANCELLED",
  ];

  function nextStep(status: QuoteStatus): string {
    if (status === "DRAFT") return t.issueQuote;
    if (status === "ISSUED") return t.acceptQuote;
    if (status === "ACCEPTED") return t.readyForInvoice;
    return t.terminalRecord;
  }

  return (
    <>
      <PageHeader
        eyebrow={t.commercialRecords}
        title={t.quotes}
        description={t.quoteDescription}
        actions={[{ href: "/pricing", label: t.openPricingStudio, variant: "primary" }]}
      />

      <section className="os-bento-grid compact">
        <MetricCard
          accent
          label={t.quotes}
          value={countText(items.length, locale)}
          detail={t.snapshotRecords}
        />
        <MetricCard
          label={t.totalValue}
          value={money(totalValue, locale)}
          detail={t.commercialSnapshots}
        />
        <MetricCard
          label={t.issued}
          value={countText(items.filter((quote) => quote.status === "ISSUED").length, locale)}
          detail={t.readyForClient}
        />
      </section>

      <SectionCard eyebrow={t.quoteLibrary} title={t.commercialSnapshots}>
        <div className="commercial-filter-bar" aria-label={t.allStatuses}>
          {statuses.map((status) => (
            <button
              className={statusFilter === status ? "active" : undefined}
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
            >
              {status === "ALL" ? t.allStatuses : quoteStatusLabel(status, locale)}
            </button>
          ))}
        </div>
        {visibleItems.length === 0 ? (
          <EmptyState title={t.noQuotesTitle}>{t.noQuotes}</EmptyState>
        ) : (
          <div className="quote-list-grid">
            {visibleItems.map((quote) => (
              <article className="quote-list-card" key={quote.id}>
                <Link className="quote-list-main" href={`/pricing/quotes/${quote.id}`}>
                  <div>
                    <small>{quote.quoteNumber}</small>
                    <h2>{businessText(quote.title, locale, t.quotes)}</h2>
                    <p>{quote.client.name}</p>
                    <dl className="commercial-card-meta">
                      <div>
                        <dt>{t.validUntil}</dt>
                        <dd>{dateText(quote.validUntil, locale)}</dd>
                      </div>
                      <div>
                        <dt>{t.nextStep}</dt>
                        <dd>{nextStep(quote.status)}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="quote-list-meta">
                    <StatusChip
                      status={quote.status}
                      label={quoteStatusLabel(quote.status, locale)}
                    />
                    <strong>{quote.totals ? money(quote.totals.finalTotal, locale) : "-"}</strong>
                    <small>
                      {countText(quote.itemCount, locale)} {t.items}
                    </small>
                  </div>
                </Link>
                <QuoteLifecycleActions
                  compact
                  locale={locale}
                  quoteId={quote.id}
                  status={quote.status}
                  onUpdated={(updated) =>
                    setItems((current) =>
                      current.map((item) =>
                        item.id === updated.id
                          ? { ...item, status: updated.status, updatedAt: updated.updatedAt }
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
