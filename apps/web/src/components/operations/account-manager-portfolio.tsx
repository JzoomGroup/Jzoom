import type { AccountManagerPortfolio as Portfolio } from "../../lib/operations-types";

export function AccountManagerPortfolio({ portfolio }: { portfolio: Portfolio }) {
  return (
    <>
      <header className="catalog-header">
        <div>
          <p className="eyebrow">Account Manager foundation</p>
          <h1>Client portfolio</h1>
          <p>
            Assigned clients, open work, attention indicators, and simple health signals based on
            existing request, delivery, document, and hours data.
          </p>
        </div>
        <span>Generated {new Date(portfolio.generatedAt).toLocaleString("en-SA")}</span>
      </header>

      <section className="catalog-panel">
        <div className="entity-grid">
          {portfolio.portfolio.map((entry) => (
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
        {portfolio.portfolio.length === 0 && <p>No assigned active clients in this portfolio.</p>}
      </section>
    </>
  );
}
