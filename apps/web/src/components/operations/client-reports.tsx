import Link from "next/link";
import type { MonthlyReport } from "../../lib/operations-types";

function metric(report: MonthlyReport, label: string, value: number) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function ClientReportList({ reports }: { reports: MonthlyReport[] }) {
  return (
    <>
      <header className="catalog-header">
        <div>
          <p className="eyebrow">Client reports</p>
          <h1>Monthly reports</h1>
          <p>Published monthly summaries for your organization.</p>
        </div>
      </header>
      <section className="catalog-panel">
        <div className="entity-grid">
          {reports.map((report) => (
            <article className="entity-card" key={report.id}>
              <div className="entity-card-heading">
                <div>
                  <span className="status-pill status-published">{report.status}</span>
                  <h3>{report.title}</h3>
                </div>
                <span>{report.period}</span>
              </div>
              <p>{report.client.name}</p>
              <Link className="button-secondary" href={`/client/reports/${report.id}`}>
                View report
              </Link>
            </article>
          ))}
        </div>
        {reports.length === 0 && <p>No published monthly reports yet.</p>}
      </section>
    </>
  );
}

export function ClientReportDetail({ report }: { report: MonthlyReport }) {
  const recentActivity = report.summary.recentClientSafeActivity ?? [];
  return (
    <>
      <header className="catalog-header">
        <div>
          <p className="eyebrow">Monthly report · {report.period}</p>
          <h1>{report.title}</h1>
          <p>
            {report.client.name} · published{" "}
            {report.publishedAt ? new Date(report.publishedAt).toLocaleDateString("en-SA") : "soon"}
          </p>
        </div>
        <Link className="button-secondary" href="/client/reports">
          Back to reports
        </Link>
      </header>

      <section className="catalog-panel">
        <div className="metric-grid">
          {metric(report, "Requests", report.summary.requests?.total ?? 0)}
          {metric(report, "Shared outputs", report.summary.outputs?.total ?? 0)}
          {metric(report, "Document requests", report.summary.documentRequests?.total ?? 0)}
          {metric(report, "Hours", report.summary.hours?.total ?? 0)}
        </div>
      </section>

      <section className="catalog-panel">
        <h2>Recent client-visible activity</h2>
        <div className="activity-list">
          {recentActivity.map((activity) => (
            <article key={activity.id}>
              <strong>{activity.request?.requestNumber ?? "Request"}</strong>
              <p>{activity.reason ?? "Client-visible activity"}</p>
              <small>{new Date(activity.occurredAt).toLocaleString("en-SA")}</small>
            </article>
          ))}
        </div>
        {recentActivity.length === 0 && <p>No client-visible activity recorded for this period.</p>}
      </section>
    </>
  );
}
