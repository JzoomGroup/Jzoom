import { clientQuoteListCopy as copy } from "../../i18n/dictionaries/client-portal";
import Link from "next/link";
import type { ClientQuoteSummary } from "../../lib/client-portal-types";
import { EmptyState, MetricCard, PageHeader, SectionCard, StatusChip } from "../premium-os";
import {
  clientCurrency,
  clientDate,
  clientLocale,
  clientNumber,
  localizedFreeText,
  quoteStatusLabel,
} from "./client-format";

export function ClientQuoteList({
  locale: localeInput = "en",
  quotes,
}: {
  locale?: string;
  quotes: ClientQuoteSummary[];
}) {
  const locale = clientLocale(localeInput);
  const t = copy[locale];
  const totalValue = quotes.reduce((sum, quote) => sum + quote.totals.finalTotal, 0);

  return (
    <>
      <PageHeader eyebrow={t.commercialCenter} title={t.quotes} description={t.description} />

      <section className="os-bento-grid compact">
        <MetricCard
          accent
          label={t.visibleQuotes}
          value={clientNumber(quotes.length, locale)}
          detail={t.acceptedIssued}
        />
        <MetricCard
          label={t.totalValue}
          value={clientCurrency(totalValue, locale)}
          detail={locale === "ar" ? "على كل العروض الظاهرة" : "Across visible quotes"}
        />
        <MetricCard
          label={t.latestValidity}
          value={quotes[0] ? clientDate(quotes[0].validUntil, locale) : "-"}
          detail={t.basedOrder}
        />
      </section>

      <SectionCard
        eyebrow={locale === "ar" ? "سجل العروض" : "Quote library"}
        title={t.commercialSnapshots}
      >
        {quotes.length === 0 ? (
          <EmptyState title={t.noQuotes}>{t.noQuotesBody}</EmptyState>
        ) : (
          <div className="quote-list-grid">
            {quotes.map((quote) => (
              <article className="quote-list-card" key={quote.id}>
                <Link className="quote-list-main" href={`/client/quotes/${quote.id}`}>
                  <div>
                    <small>{quote.quoteNumber}</small>
                    <h2>{localizedFreeText(quote.title, locale, t.quotes)}</h2>
                    <p>
                      {t.validUntil} {clientDate(quote.validUntil, locale)} -{" "}
                      {clientNumber(quote.itemCount, locale)} {t.item}
                    </p>
                  </div>
                  <div className="quote-list-meta">
                    <StatusChip
                      status={quote.status}
                      label={quoteStatusLabel(quote.status, locale)}
                    />
                    <strong>{clientCurrency(quote.totals.finalTotal, locale)}</strong>
                    <small>{quote.client.name}</small>
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
