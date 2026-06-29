import Link from "next/link";
import type { MonthlyReport } from "../../lib/operations-types";
import { EmptyState, MetricCard, PageHeader, SectionCard, StatusChip } from "../premium-os";

type ReportSummarySection = "requests" | "outputs" | "documentRequests";

function hours(value: number | undefined): string {
  const amount = value ?? 0;
  return `${amount.toFixed(1).replace(/\.0$/, "")}h`;
}

function reportDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString("en-SA") : "Not published";
}

function metric(label: string, value: number | string, detail?: string) {
  return <MetricCard label={label} value={value} detail={detail} />;
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
      <PageHeader
        eyebrow="Client reports"
        title="Monthly reports"
        description="Published monthly summaries for requests, deliverables, documents, and approved hours."
      />

      <SectionCard eyebrow="Report center" title="Monthly operating summary">
        <section className="os-bento-grid compact">
          {metric("Published reports", publishedReports)}
          {metric("Latest period", latestReport?.period ?? "None")}
          {metric("Requests covered", totalRequests)}
          {metric("Approved hours", hours(totalHours))}
          {metric("Latest publish", reportDate(latestReport?.publishedAt ?? null))}
        </section>
      </SectionCard>

      <SectionCard eyebrow="Report archive" title="Report library">
        {reports.length === 0 ? (
          <EmptyState title="No published monthly reports">
            No published monthly reports yet.
          </EmptyState>
        ) : (
          <div className="entity-grid">
            {reports.map((report) => (
              <article className="entity-card" key={report.id}>
                <div className="entity-card-heading">
                  <div>
                    <StatusChip status={report.status} label={report.status} />
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
                <Link className="os-button os-button-secondary" href={`/client/reports/${report.id}`}>
                  View report
                </Link>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
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
      <PageHeader
        eyebrow={`Monthly report - ${report.period}`}
        title={report.title}
        description={`${report.client.name} - published ${reportDate(report.publishedAt)}`}
        actions={[{ href: "/client/reports", label: "Back to reports" }]}
      />

      <SectionCard eyebrow="Usage snapshot" title="What happened this month">
        <section className="os-bento-grid compact">
          {metric("Requests", countFrom(report, "requests"))}
          {metric("Shared outputs", countFrom(report, "outputs"))}
          {metric("Document requests", countFrom(report, "documentRequests"))}
          {metric("Approved hours", hours(approvedHours), hoursSource(report))}
          {metric("Billable hours", hours(billableHours), `${hours(nonBillableHours)} non-billable`)}
        </section>
      </SectionCard>

      <section className="quote-summary-grid">
        <SectionCard eyebrow="Request status" title="Request mix">
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
        </SectionCard>

        <SectionCard eyebrow="Delivery status" title="Deliverables and documents">
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
        </SectionCard>
      </section>

      <SectionCard eyebrow="Activity" title="Recent client-visible activity">
        {recentActivity.length === 0 ? (
          <EmptyState title="No activity recorded">
            No client-visible activity recorded for this period.
          </EmptyState>
        ) : (
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
                  <Link
                    className="os-button os-button-secondary"
                    href={`/client/requests/${activity.request.id}`}
                  >
                    Open request
                  </Link>
                )}
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}
