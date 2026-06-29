import Link from "next/link";
import type {
  AccountManagerPortfolio,
  MonthlyReport,
  MonthlyUsageResponse,
} from "../lib/operations-types";
import type { RequestQueueResponse } from "../lib/request-types";
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
      <PageHeader
        eyebrow={page.eyebrow}
        title={page.title}
        description={page.description}
        actions={[{ href: "/requests/queues", label: "Open work queues", variant: "secondary" }]}
      />

      <BentoGrid>
        <MetricCard label="Open requests" value={queue.counters.open} detail={page.queueLabel} accent />
        <MetricCard label="Delayed requests" value={queue.counters.overdue} detail="Needs attention" />
        <MetricCard label="Waiting client" value={waitingClient.length} detail="Client action" />
        <MetricCard label="Waiting supervisor" value={waitingSupervisor.length} detail="Review action" />
        <MetricCard label="Approved hours" value={hours(usage.totals.approvedHours)} detail={`Period ${usage.period.key}`} />
        <MetricCard label="Submitted hours" value={hours(usage.totals.submittedHours)} detail="Pending approval" />
        {mode === "management" ? (
          <MetricCard label="Monthly reports" value={reports.length} detail="Prepared reports" />
        ) : (
          <MetricCard label="Tracked entries" value={usage.totals.entries} detail="Ledger entries" />
        )}
        {mode === "management" ? (
          <MetricCard label="Health watch" value={attentionClients.length} detail="Client portfolio" />
        ) : (
          <MetricCard label="Billable hours" value={hours(usage.totals.billableHours)} detail="Approved or submitted" />
        )}
      </BentoGrid>

      <SectionCard
        title="Priority work"
        description="Recently updated requests from the backend-scoped queue for this role."
        action={<Link className="os-button os-button-secondary" href="/requests">Request list</Link>}
      >
        {latestRequests.length === 0 ? (
          <EmptyState>No requests are currently visible in this queue.</EmptyState>
        ) : (
          <SmartTable>
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

      {mode === "management" && (
        <SectionCard
          title="Client health watch"
          description="Portfolio clients that require management or account-manager follow-up."
          action={<Link className="os-button os-button-secondary" href="/account-manager">Portfolio</Link>}
        >
          {attentionClients.length === 0 ? (
            <EmptyState>No at-risk clients in the visible portfolio.</EmptyState>
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
      )}

      <SectionCard
        title="Quick actions"
        description="Role-safe destinations already protected by backend route guards."
      >
        <div className="admin-area-grid">
          <ActionCard href="/requests/queues" index="01" title="Work queues" description="Filter assigned, review, account-manager, and all work queues." />
          <ActionCard href="/requests" index="02" title="Request details" description="Open request execution, conversations, documents, hours, and deliverables." />
          <ActionCard href="/hours-ledger" index="03" title="Hours ledger" description="Review submitted, approved, rejected, billable, and non-billable hours." />
          <ActionCard
            href={mode === "management" ? "/reports" : "/notifications"}
            index="04"
            title={mode === "management" ? "Reports" : "Notifications"}
            description={
              mode === "management"
                ? "Review monthly reports and client operating summaries."
                : "Open messages tied to request and operations activity."
            }
          />
        </div>
      </SectionCard>
    </>
  );
}
