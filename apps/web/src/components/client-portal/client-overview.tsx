import Link from "next/link";
import type {
  ClientInvoiceSummary,
  ClientPortalAccount,
  ClientPortalAvailableMonthlyService,
  ClientPortalAvailableOneTimeService,
  ClientPortalSubscribedMonthlyService,
  ClientQuoteSummary,
} from "../../lib/client-portal-types";
import type { RequestSummary } from "../../lib/request-types";
import { sar } from "./client-format";

function SubscribedServiceCard({ service }: { service: ClientPortalSubscribedMonthlyService }) {
  return (
    <article className="entity-card">
      <div className="entity-card-heading">
        <div>
          <small>{service.service.category.nameEn}</small>
          <h3>{service.service.nameEn}</h3>
        </div>
        <span>{service.service.code}</span>
      </div>
      <dl className="entity-meta four-up">
        <div>
          <dt>Level</dt>
          <dd>{service.serviceLevel.labelEn ?? service.serviceLevel.labelAr}</dd>
        </div>
        <div>
          <dt>Hours</dt>
          <dd>{service.hoursAllocated}</dd>
        </div>
        <div>
          <dt>Line</dt>
          <dd>{service.service.serviceLine}</dd>
        </div>
        <div>
          <dt>Client</dt>
          <dd>{service.client.code}</dd>
        </div>
      </dl>
      {service.serviceItems.length > 0 && (
        <div className="entity-meta">
          <div>
            <dt>Included items</dt>
            <dd>{service.serviceItems.map((item) => item.nameEn).join(", ")}</dd>
          </div>
        </div>
      )}
      <div className="row-actions">
        <Link className="button-secondary" href="/client/requests">
          Create request
        </Link>
      </div>
    </article>
  );
}

function AvailableMonthlyCard({ service }: { service: ClientPortalAvailableMonthlyService }) {
  return (
    <article className="entity-card">
      <div className="entity-card-heading">
        <div>
          <small>{service.category.nameEn}</small>
          <h3>{service.nameEn}</h3>
        </div>
        <span>{service.code}</span>
      </div>
      <dl className="entity-meta four-up">
        <div>
          <dt>Type</dt>
          <dd>Monthly</dd>
        </div>
        <div>
          <dt>Rate</dt>
          <dd>{sar(service.sellingHourlyRateSar)}</dd>
        </div>
        <div>
          <dt>SLA</dt>
          <dd>{service.defaultSlaHours}h</dd>
        </div>
        <div>
          <dt>Levels</dt>
          <dd>{service.levels.length}</dd>
        </div>
      </dl>
      <p>{service.description}</p>
    </article>
  );
}

function AvailableOneTimeCard({ service }: { service: ClientPortalAvailableOneTimeService }) {
  return (
    <article className="entity-card">
      <div className="entity-card-heading">
        <div>
          <small>{service.category.nameEn}</small>
          <h3>{service.nameEn}</h3>
        </div>
        <span>{service.code}</span>
      </div>
      <dl className="entity-meta four-up">
        <div>
          <dt>Type</dt>
          <dd>One-time</dd>
        </div>
        <div>
          <dt>Price</dt>
          <dd>{sar(service.basePriceSar)}</dd>
        </div>
        <div>
          <dt>Hours</dt>
          <dd>{service.estimatedHours}</dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd>{service.durationDays}d</dd>
        </div>
      </dl>
      <p>{service.description}</p>
    </article>
  );
}

export function ClientOverview({
  account,
  invoices,
  quotes,
  requests,
}: {
  account: ClientPortalAccount;
  invoices: ClientInvoiceSummary[];
  quotes: ClientQuoteSummary[];
  requests: RequestSummary[];
}) {
  const availableCount =
    account.services.availableMonthly.length + account.services.availableOneTime.length;
  const openRequests = requests.filter(
    (request) => !["CLOSED", "COMPLETED", "REJECTED"].includes(request.status),
  );
  const waitingClientRequests = requests.filter((request) => request.status === "WAITING_CLIENT");
  const completedRequests = requests.filter((request) =>
    ["COMPLETED", "CLOSED"].includes(request.status),
  );
  const subscribedHours = account.services.subscribedMonthly.reduce(
    (total, service) => total + service.hoursAllocated,
    0,
  );

  return (
    <>
      <header className="catalog-header">
        <div>
          <p className="eyebrow">Client portal</p>
          <h1>Welcome, {account.user.displayName}</h1>
          <p>View your services, issued quotes, accepted quotes, invoices, and request activity.</p>
        </div>
      </header>

      <section className="catalog-panel">
        <div className="entity-card-heading">
          <div>
            <p className="eyebrow">Action summary</p>
            <h2>Requests and subscription</h2>
          </div>
          <Link className="button-secondary" href="/client/requests">
            New request
          </Link>
        </div>
        <div className="pricing-total-grid">
          <div>
            <span>Open requests</span>
            <strong>{openRequests.length}</strong>
          </div>
          <div>
            <span>Waiting on you</span>
            <strong>{waitingClientRequests.length}</strong>
          </div>
          <div>
            <span>Completed</span>
            <strong>{completedRequests.length}</strong>
          </div>
          <div>
            <span>Active services</span>
            <strong>{account.services.subscribedMonthly.length}</strong>
          </div>
          <div className="primary">
            <span>Monthly hours</span>
            <strong>{subscribedHours}</strong>
          </div>
        </div>
      </section>

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
              <strong>{invoices[0] ? sar(invoices[0].finalDueNoTax) : "-"}</strong>
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

      <section className="catalog-panel">
        <div className="entity-card-heading">
          <div>
            <p className="eyebrow">My services</p>
            <h2>Active monthly services</h2>
          </div>
          <span>{account.services.subscribedMonthly.length}</span>
        </div>
        {account.services.subscribedMonthly.length === 0 ? (
          <div className="catalog-empty">No active subscription services are assigned yet.</div>
        ) : (
          <div className="entity-grid service-grid">
            {account.services.subscribedMonthly.map((service) => (
              <SubscribedServiceCard key={service.id} service={service} />
            ))}
          </div>
        )}
      </section>

      <section className="catalog-panel">
        <div className="entity-card-heading">
          <div>
            <p className="eyebrow">Available services</p>
            <h2>Service catalog</h2>
          </div>
          <span>{availableCount}</span>
        </div>
        {availableCount === 0 ? (
          <div className="catalog-empty">No active catalog services are available yet.</div>
        ) : (
          <div className="entity-grid service-grid">
            {account.services.availableMonthly.map((service) => (
              <AvailableMonthlyCard key={service.id} service={service} />
            ))}
            {account.services.availableOneTime.map((service) => (
              <AvailableOneTimeCard key={service.id} service={service} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
