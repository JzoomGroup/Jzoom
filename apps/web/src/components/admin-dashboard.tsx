import Link from "next/link";
import type { ClientsSnapshot } from "../lib/clients-types";
import type {
  AccountManagerPortfolio,
  MonthlyReport,
  MonthlyUsageResponse,
} from "../lib/operations-types";
import type { RequestQueueResponse, RequestSummary } from "../lib/request-types";

const completedStatuses = new Set(["COMPLETED", "CLOSED", "REJECTED"]);

function hours(value: number | undefined): string {
  return `${Number(value ?? 0).toFixed(2)}h`;
}

function metric(label: string, value: string | number, detail?: string) {
  return (
    <article>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </article>
  );
}

export function AdminDashboard({
  clientsSnapshot,
  portfolio,
  reports,
  requestQueue,
  requests,
  usage,
}: {
  clientsSnapshot: ClientsSnapshot;
  portfolio: AccountManagerPortfolio;
  reports: MonthlyReport[];
  requestQueue: RequestQueueResponse;
  requests: RequestSummary[];
  usage: MonthlyUsageResponse;
}) {
  const activeClients = clientsSnapshot.clients.filter((client) => client.status === "ACTIVE");
  const portalUsers = clientsSnapshot.clients.reduce((sum, client) => sum + client.users.length, 0);
  const waitingClientRequests = requests.filter(
    (request) => request.status === "WAITING_CLIENT",
  ).length;
  const completedRequests = requests.filter((request) =>
    completedStatuses.has(request.status),
  ).length;
  const highRiskClients = portfolio.portfolio.filter(
    (entry) => entry.health.code === "ATTENTION",
  );
  const watchClients = portfolio.portfolio.filter((entry) => entry.health.code === "WATCH");
  const publishedReports = reports.filter((report) => report.status === "PUBLISHED").length;
  const latestRequests = [...requests]
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .slice(0, 5);
  const attentionClients = [...highRiskClients, ...watchClients].slice(0, 4);

  return (
    <>
      <header className="catalog-header">
        <div>
          <p className="eyebrow">Admin Console</p>
          <h1>Operating dashboard</h1>
          <p>
            A read-only control room for clients, request queues, hours usage, reports, and client
            health using the current backend data contracts.
          </p>
        </div>
        <Link className="button-secondary" href="/admin/clients">
          Manage clients
        </Link>
      </header>

      <section className="metric-grid" aria-label="Admin operating summary">
        {metric("Total clients", clientsSnapshot.clients.length, `${activeClients.length} active`)}
        {metric("Open requests", requestQueue.counters.open, `${completedRequests} completed`)}
        {metric("Delayed requests", requestQueue.counters.overdue, "From request queues")}
        {metric("Used hours", hours(usage.totals.approvedHours), `Period ${usage.period.key}`)}
        {metric("Client action", waitingClientRequests, "Waiting on client")}
        {metric("Portal users", portalUsers, "Linked to managed clients")}
        {metric("Client health", highRiskClients.length, `${watchClients.length} watch`)}
        {metric("Monthly reports", reports.length, `${publishedReports} published`)}
      </section>

      <section className="quote-summary-grid">
        <article className="catalog-panel">
          <div className="panel-heading">
            <div>
              <h2>Operations queues</h2>
              <p>Backend-scoped request counts for internal execution.</p>
            </div>
            <Link className="button-secondary" href="/requests/queues">
              Open queues
            </Link>
          </div>
          <div className="pricing-total-grid">
            <div>
              <span>Specialist</span>
              <strong>{requestQueue.counters.specialist}</strong>
            </div>
            <div>
              <span>Supervisor</span>
              <strong>{requestQueue.counters.supervisor}</strong>
            </div>
            <div>
              <span>Account manager</span>
              <strong>{requestQueue.counters.accountManager}</strong>
            </div>
            <div className="primary">
              <span>Overdue</span>
              <strong>{requestQueue.counters.overdue}</strong>
            </div>
          </div>
        </article>

        <article className="catalog-panel">
          <div className="panel-heading">
            <div>
              <h2>Hours usage</h2>
              <p>Approved and pending time for the current ledger period.</p>
            </div>
            <Link className="button-secondary" href="/hours-ledger">
              View ledger
            </Link>
          </div>
          <div className="pricing-total-grid">
            <div>
              <span>Approved</span>
              <strong>{hours(usage.totals.approvedHours)}</strong>
            </div>
            <div>
              <span>Submitted</span>
              <strong>{hours(usage.totals.submittedHours)}</strong>
            </div>
            <div>
              <span>Billable</span>
              <strong>{hours(usage.totals.billableHours)}</strong>
            </div>
            <div className="primary">
              <span>Clients</span>
              <strong>{usage.clients.length}</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="catalog-panel">
        <div className="panel-heading">
          <div>
            <h2>Client health watchlist</h2>
            <p>Clients that need account-manager or management attention.</p>
          </div>
          <Link className="button-secondary" href="/account-manager">
            Portfolio
          </Link>
        </div>
        {attentionClients.length === 0 ? (
          <div className="catalog-empty">No high-risk or watch clients in the current portfolio.</div>
        ) : (
          <div className="entity-grid">
            {attentionClients.map((entry) => (
              <article className="entity-card" key={entry.client.id}>
                <div className="entity-card-heading">
                  <div>
                    <span className={`status-pill status-${entry.health.code.toLowerCase()}`}>
                      {entry.health.label}
                    </span>
                    <h3>{entry.client.name}</h3>
                  </div>
                  <span>{entry.client.code}</span>
                </div>
                <p>{entry.health.reason}</p>
                <dl className="entity-meta four-up">
                  <div>
                    <dt>Open</dt>
                    <dd>{entry.indicators.openRequests}</dd>
                  </div>
                  <div>
                    <dt>Overdue</dt>
                    <dd>{entry.indicators.overdueRequests}</dd>
                  </div>
                  <div>
                    <dt>Waiting client</dt>
                    <dd>{entry.indicators.waitingClientRequests}</dd>
                  </div>
                  <div>
                    <dt>Hours</dt>
                    <dd>{hours(entry.indicators.approvedHoursThisMonth)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="catalog-panel">
        <div className="panel-heading">
          <div>
            <h2>Recently updated requests</h2>
            <p>Fast access to live work without exposing client-only screens.</p>
          </div>
          <Link className="button-secondary" href="/requests">
            All requests
          </Link>
        </div>
        {latestRequests.length === 0 ? (
          <div className="catalog-empty">No service requests have been created yet.</div>
        ) : (
          <div className="compact-table-wrap">
            <table className="catalog-table">
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Client</th>
                  <th>Service</th>
                  <th>Status</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {latestRequests.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <Link href={`/requests/${request.id}`}>
                        <strong>{request.requestNumber}</strong>
                        <small>{request.title}</small>
                      </Link>
                    </td>
                    <td>{request.client.name}</td>
                    <td>{request.service.monthlyService.nameEn}</td>
                    <td>
                      <span className={`status-pill status-${request.status.toLowerCase()}`}>
                        {request.status}
                      </span>
                    </td>
                    <td>{new Date(request.updatedAt).toLocaleDateString("en-SA")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="catalog-panel">
        <div className="panel-heading">
          <div>
            <h2>Administration shortcuts</h2>
            <p>Core setup areas that currently have backend-backed management screens.</p>
          </div>
        </div>
        <div className="admin-area-grid">
          <Link href="/admin/clients">
            <span>01</span>
            <strong>Client management</strong>
            <p>Client profiles, status, contacts, and linked portal users.</p>
          </Link>
          <Link href="/admin/catalog">
            <span>02</span>
            <strong>Monthly catalog</strong>
            <p>Monthly services, levels, items, package inclusion, and revisions.</p>
          </Link>
          <Link href="/admin/request-templates">
            <span>03</span>
            <strong>Request templates</strong>
            <p>Dynamic service-item forms used by client request intake.</p>
          </Link>
          <Link href="/admin/platform-configuration">
            <span>04</span>
            <strong>Platform configuration</strong>
            <p>Settings, workflow states, notifications, and document templates.</p>
          </Link>
        </div>
      </section>
    </>
  );
}
