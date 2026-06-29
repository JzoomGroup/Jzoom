import Link from "next/link";
import type { ClientsSnapshot } from "../lib/clients-types";
import type {
  AccountManagerPortfolio,
  MonthlyReport,
  MonthlyUsageResponse,
} from "../lib/operations-types";
import type { RequestQueueResponse, RequestSummary } from "../lib/request-types";
import {
  ActionCard,
  BentoGrid,
  EmptyState,
  MetricCard,
  PageHeader,
  PriorityChip,
  SectionCard,
  SmartTable,
  StatusChip,
} from "./premium-os";

const completedStatuses = new Set(["COMPLETED", "CLOSED", "REJECTED"]);

function hours(value: number | undefined): string {
  return `${Number(value ?? 0).toFixed(2)}h`;
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
  const highRiskClients = portfolio.portfolio.filter((entry) => entry.health.code === "ATTENTION");
  const watchClients = portfolio.portfolio.filter((entry) => entry.health.code === "WATCH");
  const publishedReports = reports.filter((report) => report.status === "PUBLISHED").length;
  const latestRequests = [...requests]
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .slice(0, 5);
  const attentionClients = [...highRiskClients, ...watchClients].slice(0, 4);

  return (
    <>
      <PageHeader
        eyebrow="Admin Console"
        title="Operating dashboard"
        description="A premium control room for clients, request queues, hours usage, reports, and client health using the current backend data contracts."
        actions={[{ href: "/admin/clients", label: "Manage clients", variant: "secondary" }]}
      />

      <BentoGrid>
        <MetricCard label="Total clients" value={clientsSnapshot.clients.length} detail={`${activeClients.length} active`} />
        <MetricCard label="Open requests" value={requestQueue.counters.open} detail={`${completedRequests} completed`} accent />
        <MetricCard label="Delayed requests" value={requestQueue.counters.overdue} detail="From request queues" />
        <MetricCard label="Used hours" value={hours(usage.totals.approvedHours)} detail={`Period ${usage.period.key}`} />
        <MetricCard label="Client action" value={waitingClientRequests} detail="Waiting on client" />
        <MetricCard label="Portal users" value={portalUsers} detail="Linked to managed clients" />
        <MetricCard label="Client health" value={highRiskClients.length} detail={`${watchClients.length} watch`} />
        <MetricCard label="Monthly reports" value={reports.length} detail={`${publishedReports} published`} />
      </BentoGrid>

      <section className="quote-summary-grid">
        <SectionCard
          title="Operations queues"
          description="Backend-scoped request counts for internal execution."
          action={<Link className="os-button os-button-secondary" href="/requests/queues">Open queues</Link>}
        >
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
        </SectionCard>

        <SectionCard
          title="Hours usage"
          description="Approved and pending time for the current ledger period."
          action={<Link className="os-button os-button-secondary" href="/hours-ledger">View ledger</Link>}
        >
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
        </SectionCard>
      </section>

      <SectionCard
        title="Client health watchlist"
        description="Clients that need account-manager or management attention."
        action={<Link className="os-button os-button-secondary" href="/account-manager">Portfolio</Link>}
      >
        {attentionClients.length === 0 ? (
          <EmptyState title="Portfolio is stable">No high-risk or watch clients in the current portfolio.</EmptyState>
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
      </SectionCard>

      <SectionCard
        title="Recently updated requests"
        description="Fast access to live work without exposing client-only screens."
        action={<Link className="os-button os-button-secondary" href="/requests">All requests</Link>}
      >
        {latestRequests.length === 0 ? (
          <EmptyState>No service requests have been created yet.</EmptyState>
        ) : (
          <SmartTable>
            <table className="catalog-table">
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Client</th>
                  <th>Service</th>
                  <th>Status</th>
                  <th>Priority</th>
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
                      <StatusChip status={request.status} />
                    </td>
                    <td><PriorityChip priority={request.priority} /></td>
                    <td>{new Date(request.updatedAt).toLocaleDateString("en-SA")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SmartTable>
        )}
      </SectionCard>

      <SectionCard
        title="Administration shortcuts"
        description="Core setup areas that currently have backend-backed management screens."
      >
        <div className="admin-area-grid">
          <ActionCard href="/admin/clients" index="01" title="Client management" description="Client profiles, status, contacts, and linked portal users." />
          <ActionCard href="/admin/catalog" index="02" title="Monthly catalog" description="Monthly services, levels, items, package inclusion, and revisions." />
          <ActionCard href="/admin/request-templates" index="03" title="Request templates" description="Dynamic service-item forms used by client request intake." />
          <ActionCard href="/admin/platform-configuration" index="04" title="Platform configuration" description="Settings, workflow states, notifications, and document templates." />
        </div>
      </SectionCard>
    </>
  );
}
