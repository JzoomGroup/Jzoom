import Link from "next/link";
import type {
  ClientInvoiceSummary,
  ClientPortalAccount,
  ClientQuoteSummary,
} from "../../lib/client-portal-types";
import { sar } from "./client-format";

export function ClientOverview({
  account,
  invoices,
  quotes,
}: {
  account: ClientPortalAccount;
  invoices: ClientInvoiceSummary[];
  quotes: ClientQuoteSummary[];
}) {
  return (
    <>
      <header className="catalog-header">
        <div>
          <p className="eyebrow">Client portal</p>
          <h1>Welcome, {account.user.displayName}</h1>
          <p>
            View your issued quotes, accepted quotes, and issued invoices from immutable commercial
            snapshots.
          </p>
        </div>
      </header>

      <section className="quote-summary-grid">
        <article className="catalog-panel">
          <p className="eyebrow">Account context</p>
          <h2>{account.clients[0]?.name ?? "Client account"}</h2>
          <dl className="quote-definition-list">
            <div>
              <dt>Email</dt>
              <dd>{account.user.email}</dd>
            </div>
            <div>
              <dt>Client code</dt>
              <dd>{account.clients.map((client) => client.code).join(", ")}</dd>
            </div>
            <div>
              <dt>Authorized approver</dt>
              <dd>{account.clients[0]?.authorizedApprover ?? "Not specified"}</dd>
            </div>
          </dl>
        </article>
        <article className="catalog-panel">
          <p className="eyebrow">Open records</p>
          <h2>Commercial snapshots</h2>
          <div className="pricing-total-grid">
            <div>
              <span>Quotes</span>
              <strong>{quotes.length}</strong>
            </div>
            <div>
              <span>Invoices</span>
              <strong>{invoices.length}</strong>
            </div>
            <div className="primary">
              <span>Latest invoice</span>
              <strong>{invoices[0] ? sar(invoices[0].finalDueNoTax) : "—"}</strong>
            </div>
          </div>
          <div className="row-actions">
            <Link className="button-secondary" href="/client/quotes">
              View quotes
            </Link>
            <Link className="button-secondary" href="/client/invoices">
              View invoices
            </Link>
          </div>
        </article>
      </section>
    </>
  );
}
