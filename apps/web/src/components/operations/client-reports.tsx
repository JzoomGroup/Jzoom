import Link from "next/link";
import type { MonthlyReport } from "../../lib/operations-types";

type ReportSummarySection = "requests" | "outputs" | "documentRequests";

function hours(value: number | undefined): string {
  const amount = value ?? 0;
  return `${amount.toFixed(1).replace(/\.0$/, "")}h`;
}

function reportDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString("en-SA") : "Not published";
}

function metric(label: string, value: number | string, detail?: string) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}

function countFrom(report: MonthlyReport, section: ReportSummarySection): number {
  return report.summary[section]?.total ?? 0;
}

function statusBreakdown(
  report: MonthlyReport,
  section: ReportSummarySection,
): Array<[string, number]> {
  return Object.entries(report.summary[section]?.byStatus ?? {}).sort(([left], [right]) =>
    left.localeCompare(right),
  );
}

function hoursSource(report: MonthlyReport): string {
  if (report.summary.monthlyClosing) {
    return "Finalized monthly closing";
  }

  return report.summary.hours?.source === "FINALIZED_CLOSING"
    ? "Finalized monthly closing"
    : "Live approved time entries";
}

export function ClientReportList({ reports }: { reports: MonthlyReport[] }) {
  const latestReport = reports[0] ?? null;
  const publishedReports = reports.filter((report) => report.status === "PUBLISHED").length;
  const totalRequests = reports.reduce((total, report) => total + countFrom(report, "requests"), 0);
  const totalHours = reports.reduce(
    (total, report) =>
      total + (report.summary.hours?.approvedTotal ?? report.summary.hours?.total ?? 0),
    0,
  );

  return (
    <>
      <header className="catalog-header">
        <div>
          <p className="eyebrow">Client reports</p>
          <h1>Monthly reports</h1>
          <p>
            Published monthly summaries for requests, deliverables, documents, and approved hours.
          </p>
        </div>
      </header>

      <section className="catalog-panel">
        <p className="eyebrow">Report center</p>
        <h2>Monthly operating summary</h2>
        <div className="pricing-total-grid">
          {metric("Published reports", publishedReports)}
          {metric("Latest period", latestReport?.period ?? "None")}
          {metric("Requests covered", totalRequests)}
          {metric("Approved hours", hours(totalHours))}
          {metric("Latest publish", reportDate(latestReport?.publishedAt ?? null))}
        </div>
      </section>

      <section className="catalog-panel">
        <div className="entity-grid">
          {reports.map((report) => (
            <article className="entity-card" key={report.id}>
              <div className="entity-card-heading">
                <div>
                  <span className={`status-badge status-${report.status.toLowerCase()}`}>
                    {report.status}
                  </span>
                  <h3>{report.title}</h3>
                </div>
                <span>{report.period}</span>
              </div>
              <p>
                {report.client.name} - published {reportDate(report.publishedAt)}
              </p>
              <dl className="entity-meta four-up">
                <div>
                  <dt>Requests</dt>
                  <dd>{countFrom(report, "requests")}</dd>
                </div>
                <div>
                  <dt>Deliverables</dt>
                  <dd>{countFrom(report, "outputs")}</dd>
                </div>
                <div>
                  <dt>Documents</dt>
                  <dd>{countFrom(report, "documentRequests")}</dd>
                </div>
                <div>
                  <dt>Hours</dt>
                  <dd>
                    {hours(report.summary.hours?.approvedTotal ?? report.summary.hours?.total)}
                  </dd>
                </div>
              </dl>
              <Link className="button-secondary" href={`/client/reports/${report.id}`}>
                View report
              </Link>
            </article>
          ))}
        </div>
        {reports.length === 0 && (
          <div className="catalog-empty">No published monthly reports yet.</div>
        )}
      </section>
    </>
  );
}

export function ClientReportDetail({ report }: { report: MonthlyReport }) {
  const recentActivity = report.summary.recentClientSafeActivity ?? [];
  const approvedHours = report.summary.hours?.approvedTotal ?? report.summary.hours?.total ?? 0;
  const billableHours = report.summary.hours?.billableHours ?? approvedHours;
  const nonBillableHours = report.summary.hours?.nonBillableHours ?? 0;
  const requestStatusItems = statusBreakdown(report, "requests");
  const outputStatusItems = statusBreakdown(report, "outputs");
  const documentStatusItems = statusBreakdown(report, "documentRequests");

  return (
    <>
      <header className="catalog-header">
        <div>
          <p className="eyebrow">Monthly report - {report.period}</p>
          <h1>{report.title}</h1>
          <p>
            {report.client.name} - published {reportDate(report.publishedAt)}
          </p>
        </div>
        <Link className="button-secondary" href="/client/reports">
          Back to reports
        </Link>
      </header>

      <section className="catalog-panel">
        <p className="eyebrow">Usage snapshot</p>
        <h2>What happened this month</h2>
        <div className="pricing-total-grid">
          {metric("Requests", countFrom(report, "requests"))}
          {metric("Shared outputs", countFrom(report, "outputs"))}
          {metric("Document requests", countFrom(report, "documentRequests"))}
          {metric("Approved hours", hours(approvedHours), hoursSource(report))}
          {metric(
            "Billable hours",
            hours(billableHours),
            `${hours(nonBillableHours)} non-billable`,
          )}
        </div>
      </section>

      <section className="quote-summary-grid">
        <article className="catalog-panel">
          <p className="eyebrow">Request status</p>
          <h2>Request mix</h2>
          <div className="activity-list">
            {requestStatusItems.length === 0 ? (
              <p>No request status data in this report.</p>
            ) : (
              requestStatusItems.map(([status, count]) => (
                <article key={status}>
                  <strong>{status}</strong>
                  <small>{count} request(s)</small>
                </article>
              ))
            )}
          </div>
        </article>

        <article className="catalog-panel">
          <p className="eyebrow">Delivery status</p>
          <h2>Deliverables and documents</h2>
          <div className="activity-list">
            {outputStatusItems.length === 0 && documentStatusItems.length === 0 ? (
              <p>No deliverable or document status data in this report.</p>
            ) : (
              <>
                {outputStatusItems.map(([status, count]) => (
                  <article key={`output-${status}`}>
                    <strong>Output - {status}</strong>
                    <small>{count} item(s)</small>
                  </article>
                ))}
                {documentStatusItems.map(([status, count]) => (
                  <article key={`document-${status}`}>
                    <strong>Document - {status}</strong>
                    <small>{count} item(s)</small>
                  </article>
                ))}
              </>
            )}
          </div>
        </article>
      </section>

      <section className="catalog-panel">
        <p className="eyebrow">Activity</p>
        <h2>Recent client-visible activity</h2>
        <div className="activity-list">
          {recentActivity.map((activity) => (
            <article key={activity.id}>
              <strong>
                {activity.request?.requestNumber ?? "Request"}
                {activity.request?.title ? ` - ${activity.request.title}` : ""}
              </strong>
              <p>{activity.reason ?? "Client-visible activity"}</p>
              <small>
                {new Date(activity.occurredAt).toLocaleString("en-SA")}
                {activity.request?.status ? ` - ${activity.request.status}` : ""}
              </small>
              {activity.request && (
                <Link className="button-secondary" href={`/client/requests/${activity.request.id}`}>
                  Open request
                </Link>
              )}
            </article>
          ))}
        </div>
        {recentActivity.length === 0 && (
          <div className="catalog-empty">No client-visible activity recorded for this period.</div>
        )}
      </section>
    </>
  );
}
