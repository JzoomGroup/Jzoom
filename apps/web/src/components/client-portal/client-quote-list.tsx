import Link from "next/link";
import type { ClientQuoteSummary } from "../../lib/client-portal-types";
import { dateLabel, sar } from "./client-format";

export function ClientQuoteList({ quotes }: { quotes: ClientQuoteSummary[] }) {
  return (
    <>
      <header className="catalog-header">
        <div>
          <p className="eyebrow">Immutable commercial records</p>
          <h1>Your quotes</h1>
          <p>Only issued and accepted quote snapshots for your client account are shown.</p>
        </div>
      </header>
      <section className="catalog-panel">
        {quotes.length === 0 ? (
          <div className="catalog-empty">No issued or accepted quotes are available yet.</div>
        ) : (
          <div className="quote-list-grid">
            {quotes.map((quote) => (
              <article className="quote-list-card" key={quote.id}>
                <Link className="quote-list-main" href={`/client/quotes/${quote.id}`}>
                  <div>
                    <small>{quote.quoteNumber}</small>
                    <h2>{quote.title}</h2>
                    <p>
                      Valid until {dateLabel(quote.validUntil)} · {quote.itemCount} items
                    </p>
                  </div>
                  <div className="quote-list-meta">
                    <span className={`status-badge status-${quote.status.toLowerCase()}`}>
                      {quote.status}
                    </span>
                    <strong>{sar(quote.totals.finalTotal)}</strong>
                    <small>{quote.client.name}</small>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
