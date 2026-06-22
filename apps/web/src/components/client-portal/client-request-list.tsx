import Link from "next/link";
import type { RequestSummary } from "../../lib/request-types";

function displayDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString("en-SA") : "Not set";
}

export function ClientRequestList({ requests }: { requests: RequestSummary[] }) {
  return (
    <>
      <header className="catalog-header">
        <div>
          <p className="eyebrow">Client portal</p>
          <h1>Requests</h1>
          <p>Track your onboarded service requests and client-visible comments.</p>
        </div>
      </header>
      <section className="catalog-panel">
        {requests.length === 0 ? (
          <div className="catalog-empty">No requests are currently visible for this account.</div>
        ) : (
          <div className="quote-list-grid">
            {requests.map((request) => (
              <article className="quote-list-card" key={request.id}>
                <Link className="quote-list-main" href={`/client/requests/${request.id}`}>
                  <div>
                    <small>{request.requestNumber}</small>
                    <h2>{request.title}</h2>
                    <p>{request.service.monthlyService.nameEn}</p>
                  </div>
                  <div className="quote-list-meta">
                    <span className={`status-badge status-${request.status.toLowerCase()}`}>
                      {request.status}
                    </span>
                    <small>Due {displayDate(request.dueAt)}</small>
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
