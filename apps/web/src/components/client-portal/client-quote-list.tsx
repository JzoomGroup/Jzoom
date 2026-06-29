import Link from "next/link";
import type { ClientQuoteSummary } from "../../lib/client-portal-types";
import { EmptyState, MetricCard, PageHeader, SectionCard, StatusChip } from "../premium-os";
import { dateLabel, sar } from "./client-format";

export function ClientQuoteList({ quotes }: { quotes: ClientQuoteSummary[] }) {
  const totalValue = quotes.reduce((sum, quote) => sum + quote.totals.finalTotal, 0);

  return (
    <>
      <PageHeader
        eyebrow="Commercial center"
        title="Your quotes"
        description="Issued and accepted quote snapshots for your client account, presented as immutable commercial records."
      />

      <section className="os-bento-grid compact">
        <MetricCard accent label="Visible quotes" value={quotes.length} detail="Issued or accepted" />
        <MetricCard label="Total value" value={sar(totalValue)} detail="Across visible quotes" />
        <MetricCard
          label="Latest validity"
          value={quotes[0] ? dateLabel(quotes[0].validUntil) : "-"}
          detail="Based on current list order"
        />
      </section>

      <SectionCard eyebrow="Quote library" title="Commercial snapshots">
        {quotes.length === 0 ? (
          <EmptyState title="No quotes yet">
            Issued and accepted quote snapshots will appear here when they are available.
          </EmptyState>
        ) : (
          <div className="quote-list-grid">
            {quotes.map((quote) => (
              <article className="quote-list-card" key={quote.id}>
                <Link className="quote-list-main" href={`/client/quotes/${quote.id}`}>
                  <div>
                    <small>{quote.quoteNumber}</small>
                    <h2>{quote.title}</h2>
                    <p>
                      Valid until {dateLabel(quote.validUntil)} - {quote.itemCount} items
                    </p>
                  </div>
                  <div className="quote-list-meta">
                    <StatusChip status={quote.status} label={quote.status} />
                    <strong>{sar(quote.totals.finalTotal)}</strong>
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
