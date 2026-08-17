import { adminDashboardCopy as copy } from "../i18n/dictionaries/administration";
import Link from "next/link";
import type { ClientsSnapshot } from "../lib/clients-types";
import { normalizeLocale, platformTimeZone, type SupportedLocale } from "../lib/i18n";
import type {
  AccountManagerPortfolio,
  MonthlyReport,
  MonthlyUsageResponse,
} from "../lib/operations-types";
import type { RequestQueueResponse, RequestSummary } from "../lib/request-types";
import { healthReasonText, healthStatusText } from "./operations/health-i18n";
import {
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

function number(value: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-SA").format(value);
}

function hours(value: number | undefined, locale: SupportedLocale): string {
  const amount = Number(value ?? 0);
  return locale === "ar"
    ? `${new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(amount)} ساعة`
    : `${amount.toFixed(2)}h`;
}

function date(value: string, locale: SupportedLocale): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    day: "2-digit",
    month: "short",
    timeZone: platformTimeZone,
    year: "numeric",
  }).format(new Date(value));
}

function serviceName(request: RequestSummary, locale: SupportedLocale): string {
  return locale === "ar"
    ? request.service.monthlyService.nameAr || request.service.monthlyService.nameEn
    : request.service.monthlyService.nameEn;
}

export function AdminDashboard({
  clientsSnapshot,
  locale = "en",
  portfolio,
  reports,
  requestQueue,
  requests,
  usage,
}: {
  clientsSnapshot: ClientsSnapshot;
  locale?: string;
  portfolio: AccountManagerPortfolio;
  reports: MonthlyReport[];
  requestQueue: RequestQueueResponse;
  requests: RequestSummary[];
  usage: MonthlyUsageResponse;
}) {
  const language = normalizeLocale(locale);
  const t = copy[language];
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
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />

      <BentoGrid>
        <MetricCard
          label={t.metrics.totalClients}
          value={number(clientsSnapshot.clients.length, language)}
          detail={`${number(activeClients.length, language)} ${t.metrics.activeClients}`}
        />
        <MetricCard
          label={t.metrics.openRequests}
          value={number(requestQueue.counters.open, language)}
          detail={`${number(completedRequests, language)} ${t.metrics.completed}`}
          accent
        />
        <MetricCard
          label={t.metrics.delayedRequests}
          value={number(requestQueue.counters.overdue, language)}
          detail={t.metrics.fromQueues}
        />
        <MetricCard
          label={t.metrics.usedHours}
          value={hours(usage.totals.approvedHours, language)}
          detail={`${t.metrics.period} ${usage.period.key}`}
        />
        <MetricCard
          label={t.metrics.clientAction}
          value={number(waitingClientRequests, language)}
          detail={t.metrics.waitingClient}
        />
        <MetricCard
          label={t.metrics.portalUsers}
          value={number(portalUsers, language)}
          detail={t.metrics.linkedClients}
        />
        <MetricCard
          label={t.metrics.clientHealth}
          value={number(highRiskClients.length, language)}
          detail={`${number(watchClients.length, language)} ${t.metrics.watch}`}
        />
        <MetricCard
          label={t.metrics.monthlyReports}
          value={number(reports.length, language)}
          detail={`${number(publishedReports, language)} ${t.metrics.published}`}
        />
      </BentoGrid>

      <section className="quote-summary-grid dashboard-summary-grid">
        <SectionCard
          title={t.queues.title}
          description={t.queues.description}
          action={
            <Link className="os-button os-button-secondary" href="/requests/queues">
              {t.queues.action}
            </Link>
          }
        >
          <div className="pricing-total-grid">
            <div>
              <span>{t.queues.specialist}</span>
              <strong>{number(requestQueue.counters.specialist, language)}</strong>
            </div>
            <div>
              <span>{t.queues.supervisor}</span>
              <strong>{number(requestQueue.counters.supervisor, language)}</strong>
            </div>
            <div>
              <span>{t.queues.accountManager}</span>
              <strong>{number(requestQueue.counters.accountManager, language)}</strong>
            </div>
            <div className="primary">
              <span>{t.queues.overdue}</span>
              <strong>{number(requestQueue.counters.overdue, language)}</strong>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title={t.hours.title}
          description={t.hours.description}
          action={
            <Link className="os-button os-button-secondary" href="/hours-ledger">
              {t.hours.action}
            </Link>
          }
        >
          <div className="pricing-total-grid">
            <div>
              <span>{t.hours.approved}</span>
              <strong>{hours(usage.totals.approvedHours, language)}</strong>
            </div>
            <div>
              <span>{t.hours.submitted}</span>
              <strong>{hours(usage.totals.submittedHours, language)}</strong>
            </div>
            <div>
              <span>{t.hours.billable}</span>
              <strong>{hours(usage.totals.billableHours, language)}</strong>
            </div>
            <div className="primary">
              <span>{t.hours.clients}</span>
              <strong>{number(usage.clients.length, language)}</strong>
            </div>
          </div>
        </SectionCard>
      </section>

      <SectionCard
        title={t.health.title}
        description={t.health.description}
        action={
          <Link className="os-button os-button-secondary" href="/account-manager">
            {t.health.action}
          </Link>
        }
      >
        {attentionClients.length === 0 ? (
          <EmptyState title={t.health.stableTitle}>{t.health.stableBody}</EmptyState>
        ) : (
          <div className="entity-grid">
            {attentionClients.map((entry) => (
              <article className="entity-card" key={entry.client.id}>
                <div className="entity-card-heading">
                  <div>
                    <span className={`status-pill status-${entry.health.code.toLowerCase()}`}>
                      {healthStatusText(entry.health.code, language)}
                    </span>
                    <h3>{entry.client.name}</h3>
                  </div>
                  <span>{entry.client.code}</span>
                </div>
                <p>{healthReasonText(entry.health.code, language)}</p>
                <dl className="entity-meta four-up">
                  <div>
                    <dt>{t.health.open}</dt>
                    <dd>{number(entry.indicators.openRequests, language)}</dd>
                  </div>
                  <div>
                    <dt>{t.health.overdue}</dt>
                    <dd>{number(entry.indicators.overdueRequests, language)}</dd>
                  </div>
                  <div>
                    <dt>{t.health.waitingClient}</dt>
                    <dd>{number(entry.indicators.waitingClientRequests, language)}</dd>
                  </div>
                  <div>
                    <dt>{t.health.hours}</dt>
                    <dd>{hours(entry.indicators.approvedHoursThisMonth, language)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title={t.requests.title}
        description={t.requests.description}
        action={
          <Link className="os-button os-button-secondary" href="/requests">
            {t.requests.action}
          </Link>
        }
      >
        {latestRequests.length === 0 ? (
          <EmptyState>{t.requests.empty}</EmptyState>
        ) : (
          <SmartTable>
            <table className="catalog-table">
              <thead>
                <tr>
                  <th>{t.requests.request}</th>
                  <th>{t.requests.client}</th>
                  <th>{t.requests.service}</th>
                  <th>{t.requests.status}</th>
                  <th>{t.requests.priority}</th>
                  <th>{t.requests.updated}</th>
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
                    <td>{serviceName(request, language)}</td>
                    <td>
                      <StatusChip locale={language} status={request.status} />
                    </td>
                    <td>
                      <PriorityChip locale={language} priority={request.priority} />
                    </td>
                    <td>{date(request.updatedAt, language)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SmartTable>
        )}
      </SectionCard>
    </>
  );
}
