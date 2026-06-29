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
import {
  BentoGrid,
  EmptyState,
  MetricCard,
  PageHeader,
  SectionCard,
  StatusChip,
} from "../premium-os";
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
        <Link className="os-button os-button-secondary" href="/client/requests">
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
  const latestOpenRequests = openRequests.slice(0, 3);
  const subscribedHours = account.services.subscribedMonthly.reduce(
    (total, service) => total + service.hoursAllocated,
    0,
  );

  return (
    <>
      <PageHeader
        eyebrow="Client service center"
        title={`Welcome, ${account.user.displayName}`}
        description="A clear operating center for your services, requests, documents, outputs, quotes, invoices, and reports."
        actions={[{ href: "/client/requests", label: "Create new request", variant: "primary" }]}
      />

      <h2 className="sr-only">Requests and subscription</h2>
      <BentoGrid>
        <MetricCard label="Open requests" value={openRequests.length} detail="Currently active" accent />
        <MetricCard label="Waiting on you" value={waitingClientRequests.length} detail="Client action required" />
        <MetricCard label="Completed" value={completedRequests.length} detail="Closed or completed" />
        <MetricCard label="Active services" value={account.services.subscribedMonthly.length} detail="Subscribed monthly services" />
        <MetricCard label="Monthly hours" value={subscribedHours} detail="Allocated subscription hours" />
        <MetricCard label="Quotes" value={quotes.length} detail="Issued commercial records" />
        <MetricCard label="Invoices" value={invoices.length} detail="Billing records" />
        <MetricCard label="Available services" value={availableCount} detail="Catalog options" />
      </BentoGrid>

      <section className="quote-summary-grid">
        <SectionCard
          eyebrow="Needs attention"
          title="Client actions"
          action={<StatusChip status="WAITING_CLIENT" label={`${waitingClientRequests.length} pending`} />}
        >
          <div className="activity-list">
            {waitingClientRequests.length === 0 ? (
              <EmptyState title="No client action is pending.">
                Jzoom will update you when a request needs a response or document.
              </EmptyState>
            ) : (
              waitingClientRequests.slice(0, 4).map((request) => (
                <article key={request.id}>
                  <strong>{request.title}</strong>
                  <small>
                    {request.requestNumber} · {request.service.monthlyService.nameEn}
                  </small>
                  <div className="row-actions">
                    <Link className="os-button os-button-secondary" href={`/client/requests/${request.id}`}>
                      Open request
                    </Link>
                  </div>
                </article>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Latest work"
          title="Open requests"
          action={<StatusChip status="IN_PROGRESS" label={`${openRequests.length} open`} />}
        >
          <div className="activity-list">
            {latestOpenRequests.length === 0 ? (
              <EmptyState title="No open requests">
                Your completed work remains available in requests and reports.
              </EmptyState>
            ) : (
              latestOpenRequests.map((request) => (
                <article key={request.id}>
                  <strong>{request.title}</strong>
                  <small>
                    {request.status} · due{" "}
                    {request.dueAt
                      ? new Date(request.dueAt).toLocaleDateString("en-SA")
                      : "Not set"}
                  </small>
                  <div className="row-actions">
                    <Link className="os-button os-button-secondary" href={`/client/requests/${request.id}`}>
                      View details
                    </Link>
                  </div>
                </article>
              ))
            )}
          </div>
        </SectionCard>
      </section>

      <section className="quote-summary-grid">
        <SectionCard eyebrow="Account context" title={account.clients[0]?.name ?? "Client account"}>
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
        </SectionCard>
        <SectionCard eyebrow="Open records" title="Commercial snapshots">
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
            <Link className="os-button os-button-secondary" href="/client/quotes">
              View quotes
            </Link>
            <Link className="os-button os-button-secondary" href="/client/invoices">
              View invoices
            </Link>
          </div>
        </SectionCard>
      </section>

      <SectionCard
        eyebrow="My services"
        title="Active monthly services"
        action={<StatusChip status="ACTIVE" label={`${account.services.subscribedMonthly.length} active`} />}
      >
        {account.services.subscribedMonthly.length === 0 ? (
          <EmptyState>No active subscription services are assigned yet.</EmptyState>
        ) : (
          <div className="entity-grid service-grid">
            {account.services.subscribedMonthly.map((service) => (
              <SubscribedServiceCard key={service.id} service={service} />
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        eyebrow="Available services"
        title="Service catalog"
        action={<StatusChip status="ACTIVE" label={`${availableCount} available`} />}
      >
        {availableCount === 0 ? (
          <EmptyState>No active catalog services are available yet.</EmptyState>
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
      </SectionCard>
    </>
  );
}
