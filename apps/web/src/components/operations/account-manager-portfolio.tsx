import { accountManagerPortfolioCopy as copy } from "../../i18n/dictionaries/operations";
import type { AccountManagerPortfolio as Portfolio } from "../../lib/operations-types";
import { normalizeLocale, platformTimeZone, type SupportedLocale } from "../../lib/i18n";
import {
  BentoGrid,
  EmptyState,
  MetricCard,
  PageHeader,
  SectionCard,
  StatusChip,
} from "../premium-os";

function number(value: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    maximumFractionDigits: 2,
  }).format(value);
}

function dateTime(value: string, locale: SupportedLocale): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    timeZone: platformTimeZone,
    year: "numeric",
  }).format(new Date(value));
}

function healthLabel(code: "ATTENTION" | "WATCH" | "HEALTHY", locale: SupportedLocale): string {
  return copy[locale].healthStatus[code];
}

function healthReason(code: "ATTENTION" | "WATCH" | "HEALTHY", locale: SupportedLocale): string {
  return copy[locale].healthReason[code];
}

function uniqueRecentActivity<
  T extends { occurredAt: string; reason: string | null; request?: { id?: string } | null },
>(activity: T[]): T[] {
  const seen = new Set<string>();
  return activity.filter((entry) => {
    const occurredAtSecond = new Date(entry.occurredAt).toISOString().slice(0, 19);
    const key = `${entry.request?.id ?? "request"}|${entry.reason ?? "activity"}|${occurredAtSecond}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function AccountManagerPortfolio({
  locale = "en",
  portfolio,
}: {
  locale?: string;
  portfolio: Portfolio;
}) {
  const language = normalizeLocale(locale);
  const t = copy[language];
  const attentionClients = portfolio.portfolio.filter((entry) => entry.health.code === "ATTENTION");
  const totals = portfolio.portfolio.reduce(
    (acc, entry) => ({
      approvedHours: acc.approvedHours + entry.indicators.approvedHoursThisMonth,
      openRequests: acc.openRequests + entry.indicators.openRequests,
      overdueRequests: acc.overdueRequests + entry.indicators.overdueRequests,
      waitingClientRequests: acc.waitingClientRequests + entry.indicators.waitingClientRequests,
    }),
    {
      approvedHours: 0,
      openRequests: 0,
      overdueRequests: 0,
      waitingClientRequests: 0,
    },
  );

  return (
    <>
      <PageHeader
        eyebrow={t.portfolioCommandCenter}
        title={t.clientPortfolio}
        description={t.pageDescription}
        meta={<span>{`${t.generated} ${dateTime(portfolio.generatedAt, language)}`}</span>}
      />

      <BentoGrid compact>
        <MetricCard
          label={t.clients}
          value={number(portfolio.portfolio.length, language)}
          detail={`${number(attentionClients.length, language)} ${healthLabel("ATTENTION", language)}`}
          accent
        />
        <MetricCard
          label={t.overdueRequests}
          value={number(totals.overdueRequests, language)}
          detail={t.overdue}
        />
        <MetricCard
          label={t.waitingClientRequests}
          value={number(totals.waitingClientRequests, language)}
          detail={t.waitingClient}
        />
        <MetricCard
          label={t.approvedHours}
          value={number(totals.approvedHours, language)}
          detail={t.hours}
        />
      </BentoGrid>

      <SectionCard title={t.clientHealthActivity}>
        {portfolio.portfolio.length === 0 ? (
          <EmptyState>{t.noClients}</EmptyState>
        ) : (
          <div className="entity-grid">
            {portfolio.portfolio.map((entry) => {
              const recentActivity = uniqueRecentActivity(entry.recentActivity);
              return (
                <article className="entity-card" key={entry.client.id}>
                  <div className="entity-card-heading">
                    <div>
                      <StatusChip
                        status={entry.health.code}
                        label={healthLabel(entry.health.code, language)}
                      />
                      <h3>{entry.client.name}</h3>
                    </div>
                    <span>{entry.client.code}</span>
                  </div>
                  <p>{healthReason(entry.health.code, language)}</p>
                  <dl className="entity-meta four-up portfolio-client-signals">
                    <div>
                      <dt>{t.open}</dt>
                      <dd>{number(entry.indicators.openRequests, language)}</dd>
                    </div>
                    <div>
                      <dt>{t.overdue}</dt>
                      <dd>{number(entry.indicators.overdueRequests, language)}</dd>
                    </div>
                    <div>
                      <dt>{t.waitingClient}</dt>
                      <dd>{number(entry.indicators.waitingClientRequests, language)}</dd>
                    </div>
                    <div>
                      <dt>{t.hours}</dt>
                      <dd>{number(entry.indicators.approvedHoursThisMonth, language)}</dd>
                    </div>
                  </dl>
                  <details className="portfolio-client-details">
                    <summary>
                      {language === "ar"
                        ? "بيانات العميل والمسؤولية"
                        : "Client context and ownership"}
                    </summary>
                    <dl className="entity-meta portfolio-client-context">
                      <div>
                        <dt>{t.sector}</dt>
                        <dd>{entry.client.sector}</dd>
                      </div>
                      <div>
                        <dt>{t.city}</dt>
                        <dd>{entry.client.city ?? "-"}</dd>
                      </div>
                      <div>
                        <dt>{t.assignedManagers}</dt>
                        <dd>
                          {entry.accountManagers.map((manager) => manager.displayName).join(", ") ||
                            "-"}
                        </dd>
                      </div>
                    </dl>
                  </details>
                  <details className="portfolio-client-details">
                    <summary>
                      {t.recentActivity} ({number(recentActivity.length, language)})
                    </summary>
                    <div className="activity-list portfolio-activity-list">
                      {recentActivity.length === 0 ? (
                        <EmptyState>{t.noActivity}</EmptyState>
                      ) : (
                        recentActivity.map((activity) => (
                          <article key={activity.id}>
                            <strong>{activity.request?.requestNumber ?? t.requestActivity}</strong>
                            <p>{activity.reason ?? t.activityRecorded}</p>
                            <small>{dateTime(activity.occurredAt, language)}</small>
                          </article>
                        ))
                      )}
                    </div>
                  </details>
                </article>
              );
            })}
          </div>
        )}
      </SectionCard>
    </>
  );
}
