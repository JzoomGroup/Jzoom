import Link from "next/link";
import type {
  AccountManagerPortfolio,
  MonthlyReport,
  MonthlyUsageResponse,
} from "../lib/operations-types";
import type { RequestQueueResponse } from "../lib/request-types";

type RoleDashboardMode = "management" | "specialist" | "supervisor";

const content: Record<
  RoleDashboardMode,
  { eyebrow: string; title: string; description: string; queueLabel: string }
> = {
  specialist: {
    eyebrow: "Specialist workspace",
    title: "My execution dashboard",
    description:
      "Assigned work, delayed tasks, waiting-client requests, and registered hours from your scoped backend queue.",
    queueLabel: "Specialist queue",
  },
  supervisor: {
    eyebrow: "Supervisor workspace",
    title: "Team review dashboard",
    description:
      "Team workload, requests waiting for review, delayed work, and approval context from existing operations data.",
    queueLabel: "Supervisor queue",
  },
  management: {
    eyebrow: "Management workspace",
    title: "Executive operating dashboard",
    description:
      "High-level visibility into request volume, delayed work, hours usage, reports, and client health.",
    queueLabel: "All queues",
  },
};

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

export function InternalRoleDashboard({
  mode,
  portfolio,
  reports = [],
  queue,
  usage,
}: {
  mode: RoleDashboardMode;
  portfolio?: AccountManagerPortfolio;
  reports?: MonthlyReport[];
  queue: RequestQueueResponse;
  usage: MonthlyUsageResponse;
}) {
  const page = content[mode];
  const waitingClient = queue.requests.filter((request) => request.status === "WAITING_CLIENT");
  const waitingSupervisor = queue.requests.filter(
    (request) => request.status === "WAITING_SUPERVISOR",
  );
  const latestRequests = [...queue.requests]
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .slice(0, 6);
  const attentionClients =
    portfolio?.portfolio
      .filter((entry) => entry.health.code !== "HEALTHY")
      .sort(
        (left, right) =>
          right.indicators.overdueRequests - left.indicators.overdueRequests ||
          right.indicators.openRequests - left.indicators.openRequests,
      )
      .slice(0, 4) ?? [];

  return (
    <>
      <header className="catalog-header">
        <div>
          <p className="eyebrow">{page.eyebrow}</p>
          <h1>{page.title}</h1>
          <p>{page.description}</p>
        </div>
        <Link className="button-secondary" href="/requests/queues">
          Open work queues
        </Link>
      </header>

      <section className="metric-grid" aria-label={`${page.title} summary`}>
        {metric("Open requests", queue.counters.open, page.queueLabel)}
        {metric("Delayed requests", queue.counters.overdue, "Needs attention")}
        {metric("Waiting client", waitingClient.length, "Client action")}
        {metric("Waiting supervisor", waitingSupervisor.length, "Review action")}
        {metric("Approved hours", hours(usage.totals.approvedHours), `Period ${usage.period.key}`)}
        {metric("Submitted hours", hours(usage.totals.submittedHours), "Pending approval")}
        {mode === "management"
          ? metric("Monthly reports", reports.length, "Prepared reports")
          : metric("Tracked entries", usage.totals.entries, "Ledger entries")}
        {mode === "management"
          ? metric("Health watch", attentionClients.length, "Client portfolio")
          : metric("Billable hours", hours(usage.totals.billableHours), "Approved or submitted")}
      </section>

      <section className="catalog-panel">
        <div className="panel-heading">
          <div>
            <h2>Priority work</h2>
            <p>Recently updated requests from the backend-scoped queue for this role.</p>
          </div>
          <Link className="button-secondary" href="/requests">
            Request list
          </Link>
        </div>
        {latestRequests.length === 0 ? (
          <div className="catalog-empty">No requests are currently visible in this queue.</div>
        ) : (
          <div className="compact-table-wrap">
            <table className="catalog-table">
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Client</th>
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
                    <td>
                      <span className={`status-pill status-${request.status.toLowerCase()}`}>
                        {request.status}
                      </span>
                    </td>
                    <td>{request.priority}</td>
                    <td>{new Date(request.updatedAt).toLocaleDateString("en-SA")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {mode === "management" && (
        <section className="catalog-panel">
          <div className="panel-heading">
            <div>
              <h2>Client health watch</h2>
              <p>Portfolio clients that require management or account-manager follow-up.</p>
            </div>
            <Link className="button-secondary" href="/account-manager">
              Portfolio
            </Link>
          </div>
          {attentionClients.length === 0 ? (
            <div className="catalog-empty">No at-risk clients in the visible portfolio.</div>
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
      )}

      <section className="catalog-panel">
        <div className="panel-heading">
          <div>
            <h2>Quick actions</h2>
            <p>Role-safe destinations already protected by backend route guards.</p>
          </div>
        </div>
        <div className="admin-area-grid">
          <Link href="/requests/queues">
            <span>01</span>
            <strong>Work queues</strong>
            <p>Filter assigned, review, account-manager, and all work queues.</p>
          </Link>
          <Link href="/requests">
            <span>02</span>
            <strong>Request details</strong>
            <p>Open request execution, conversations, documents, hours, and deliverables.</p>
          </Link>
          <Link href="/hours-ledger">
            <span>03</span>
            <strong>Hours ledger</strong>
            <p>Review submitted, approved, rejected, billable, and non-billable hours.</p>
          </Link>
          <Link href={mode === "management" ? "/reports" : "/notifications"}>
            <span>04</span>
            <strong>{mode === "management" ? "Reports" : "Notifications"}</strong>
            <p>
              {mode === "management"
                ? "Review monthly reports and client operating summaries."
                : "Open messages tied to request and operations activity."}
            </p>
          </Link>
        </div>
      </section>
    </>
  );
}
