import type { AccountManagerPortfolio as Portfolio } from "../../lib/operations-types";
import { EmptyState, PageHeader, SectionCard, StatusChip } from "../premium-os";

export function AccountManagerPortfolio({ portfolio }: { portfolio: Portfolio }) {
  return (
    <>
      <PageHeader
        eyebrow="Portfolio command center"
        title="Client portfolio"
        description="Assigned clients, open work, attention indicators, and health signals based on existing request, delivery, document, and hours data."
        meta={<span>Generated {new Date(portfolio.generatedAt).toLocaleString("en-SA")}</span>}
      />

      <SectionCard title="Client health and activity">
        <div className="entity-grid">
          {portfolio.portfolio.map((entry) => (
            <article className="entity-card" key={entry.client.id}>
              <div className="entity-card-heading">
                <div>
                  <StatusChip status={entry.health.code} label={entry.health.label} />
                  <h3>{entry.client.name}</h3>
                </div>
                <span>{entry.client.code}</span>
              </div>
              <p>{entry.health.reason}</p>
              <div className="entity-meta four-up">
                <span>Open</span>
                <strong>{entry.indicators.openRequests}</strong>
                <span>Overdue</span>
                <strong>{entry.indicators.overdueRequests}</strong>
                <span>Waiting client</span>
                <strong>{entry.indicators.waitingClientRequests}</strong>
                <span>Hours</span>
                <strong>{entry.indicators.approvedHoursThisMonth}</strong>
              </div>
              <div className="activity-list">
                {entry.recentActivity.map((activity) => (
                  <article key={activity.id}>
                    <strong>{activity.request?.requestNumber ?? "Request activity"}</strong>
                    <p>{activity.reason ?? "Activity recorded"}</p>
                    <small>{new Date(activity.occurredAt).toLocaleString("en-SA")}</small>
                  </article>
                ))}
              </div>
            </article>
          ))}
        </div>
        {portfolio.portfolio.length === 0 && (
          <EmptyState>No assigned active clients in this portfolio.</EmptyState>
        )}
      </SectionCard>
    </>
  );
}
