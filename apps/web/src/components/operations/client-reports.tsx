import { clientReportsCopy as copy } from "../../i18n/dictionaries/operations";
import Link from "next/link";
import type { MonthlyReport } from "../../lib/operations-types";
import { EmptyState, MetricCard, PageHeader, SectionCard, StatusChip } from "../premium-os";
import {
  clientDate,
  clientDateTime,
  clientLocale,
  clientNumber,
  documentStatusLabel,
  localizedFreeText,
  outputStatusLabel,
  requestStatusLabel,
  type ClientDisplayLocale,
} from "../client-portal/client-format";

type ReportSummarySection = "requests" | "outputs" | "documentRequests";

function hours(value: number | undefined, locale: ClientDisplayLocale): string {
  const amount = value ?? 0;
  return locale === "ar"
    ? `${clientNumber(amount, locale)} ساعة`
    : `${amount.toFixed(1).replace(/\.0$/, "")}h`;
}

function reportDate(value: string | null, locale: ClientDisplayLocale): string {
  return value ? clientDate(value, locale) : copy[locale].notPublished;
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

function hoursSource(report: MonthlyReport, locale: ClientDisplayLocale): string {
  if (report.summary.monthlyClosing) {
    return copy[locale].finalizedClosing;
  }

  return report.summary.hours?.source === "FINALIZED_CLOSING"
    ? copy[locale].finalizedClosing
    : copy[locale].liveHours;
}

function reportStatusLabel(status: string, locale: ClientDisplayLocale): string {
  if (status === "PUBLISHED") return locale === "ar" ? "منشور" : "PUBLISHED";
  if (status === "DRAFT") return locale === "ar" ? "مسودة" : "DRAFT";
  if (status === "PREPARED") return locale === "ar" ? "جاهز" : "PREPARED";
  if (status === "ARCHIVED") return locale === "ar" ? "مؤرشف" : "ARCHIVED";
  return status;
}

export function ClientReportList({
  locale: localeInput = "en",
  reports,
}: {
  locale?: string;
  reports: MonthlyReport[];
}) {
  const locale = clientLocale(localeInput);
  const t = copy[locale];
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
      <PageHeader eyebrow={t.clientReports} title={t.monthlyReports} description={t.description} />

      <SectionCard eyebrow={t.reportCenter} title={t.monthlyOperatingSummary}>
        <section className="os-bento-grid compact">
          {metric(t.publishedReports, clientNumber(publishedReports, locale))}
          {metric(t.latestPeriod, latestReport?.period ?? (locale === "ar" ? "لا يوجد" : "None"))}
          {metric(t.requestsCovered, clientNumber(totalRequests, locale))}
          {metric(t.approvedHours, hours(totalHours, locale))}
          {metric(t.latestPublish, reportDate(latestReport?.publishedAt ?? null, locale))}
        </section>
      </SectionCard>

      <SectionCard eyebrow={t.reportArchive} title={t.reportLibrary}>
        {reports.length === 0 ? (
          <EmptyState title={t.noPublished}>{t.noPublishedBody}</EmptyState>
        ) : (
          <div className="entity-grid">
            {reports.map((report) => (
              <article className="entity-card" key={report.id}>
                <div className="entity-card-heading">
                  <div>
                    <StatusChip
                      status={report.status}
                      label={reportStatusLabel(report.status, locale)}
                    />
                    <h3>{localizedFreeText(report.title, locale, t.monthlyReport)}</h3>
                  </div>
                  <span>{report.period}</span>
                </div>
                <p>
                  {report.client.name} - {t.published} {reportDate(report.publishedAt, locale)}
                </p>
                <dl className="entity-meta four-up">
                  <div>
                    <dt>{t.requests}</dt>
                    <dd>{clientNumber(countFrom(report, "requests"), locale)}</dd>
                  </div>
                  <div>
                    <dt>{t.deliverables}</dt>
                    <dd>{clientNumber(countFrom(report, "outputs"), locale)}</dd>
                  </div>
                  <div>
                    <dt>{t.documents}</dt>
                    <dd>{clientNumber(countFrom(report, "documentRequests"), locale)}</dd>
                  </div>
                  <div>
                    <dt>{t.hours}</dt>
                    <dd>
                      {hours(
                        report.summary.hours?.approvedTotal ?? report.summary.hours?.total,
                        locale,
                      )}
                    </dd>
                  </div>
                </dl>
                <Link
                  className="os-button os-button-secondary"
                  href={`/client/reports/${report.id}`}
                >
                  {locale === "ar" ? "عرض التقرير" : "View report"}
                </Link>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}

export function ClientReportDetail({
  locale: localeInput = "en",
  report,
}: {
  locale?: string;
  report: MonthlyReport;
}) {
  const locale = clientLocale(localeInput);
  const t = copy[locale];
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
        eyebrow={`${t.monthlyReport} - ${report.period}`}
        title={localizedFreeText(report.title, locale, t.monthlyReport)}
        description={`${report.client.name} - ${t.published} ${reportDate(report.publishedAt, locale)}`}
        actions={[{ href: "/client/reports", label: t.back }]}
      />

      <SectionCard eyebrow={t.usageSnapshot} title={t.whatHappened}>
        <section className="os-bento-grid compact">
          {metric(t.requests, clientNumber(countFrom(report, "requests"), locale))}
          {metric(t.sharedOutputs, clientNumber(countFrom(report, "outputs"), locale))}
          {metric(t.documentRequests, clientNumber(countFrom(report, "documentRequests"), locale))}
          {metric(t.approvedHours, hours(approvedHours, locale), hoursSource(report, locale))}
          {metric(
            t.billableHours,
            hours(billableHours, locale),
            `${hours(nonBillableHours, locale)} ${t.nonBillable}`,
          )}
        </section>
      </SectionCard>

      <section className="quote-summary-grid">
        <SectionCard eyebrow={t.requestStatus} title={t.requestMix}>
          <div className="activity-list">
            {requestStatusItems.length === 0 ? (
              <p>{t.noRequestData}</p>
            ) : (
              requestStatusItems.map(([status, count]) => (
                <article key={status}>
                  <strong>{requestStatusLabel(status, locale)}</strong>
                  <small>
                    {clientNumber(count, locale)} {t.request}
                  </small>
                </article>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard eyebrow={t.deliveryStatus} title={t.deliverablesAndDocuments}>
          <div className="activity-list">
            {outputStatusItems.length === 0 && documentStatusItems.length === 0 ? (
              <p>{t.noDeliveryData}</p>
            ) : (
              <>
                {outputStatusItems.map(([status, count]) => (
                  <article key={`output-${status}`}>
                    <strong>
                      {t.output} - {outputStatusLabel(status, locale)}
                    </strong>
                    <small>
                      {clientNumber(count, locale)} {t.item}
                    </small>
                  </article>
                ))}
                {documentStatusItems.map(([status, count]) => (
                  <article key={`document-${status}`}>
                    <strong>
                      {t.document} - {documentStatusLabel(status, locale)}
                    </strong>
                    <small>
                      {clientNumber(count, locale)} {t.item}
                    </small>
                  </article>
                ))}
              </>
            )}
          </div>
        </SectionCard>
      </section>

      <SectionCard eyebrow={t.activity} title={t.recentActivity}>
        {recentActivity.length === 0 ? (
          <EmptyState title={t.noActivity}>{t.noActivityBody}</EmptyState>
        ) : (
          <div className="activity-list">
            {recentActivity.map((activity) => (
              <article key={activity.id}>
                <strong>
                  {activity.request?.requestNumber ?? t.request}
                  {activity.request?.title
                    ? ` - ${localizedFreeText(activity.request.title, locale, t.request)}`
                    : ""}
                </strong>
                <p>
                  {localizedFreeText(
                    activity.reason,
                    locale,
                    locale === "ar" ? "نشاط ظاهر للعميل" : "Client-visible activity",
                  )}
                </p>
                <small>
                  {clientDateTime(activity.occurredAt, locale)}
                  {activity.request?.status
                    ? ` - ${requestStatusLabel(activity.request.status, locale)}`
                    : ""}
                </small>
                {activity.request && (
                  <Link
                    className="os-button os-button-secondary"
                    href={`/client/requests/${activity.request.id}`}
                  >
                    {t.openRequest}
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
