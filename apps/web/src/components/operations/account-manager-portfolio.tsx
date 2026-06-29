import type { AccountManagerPortfolio as Portfolio } from "../../lib/operations-types";
import { normalizeLocale, type SupportedLocale } from "../../lib/i18n";
import { BentoGrid, EmptyState, MetricCard, PageHeader, SectionCard, StatusChip } from "../premium-os";

const copy = {
  ar: {
    activityRecorded: "تم تسجيل نشاط",
    approvedHours: "الساعات المعتمدة",
    assignedManagers: "مديرو الحساب",
    city: "المدينة",
    clientHealthActivity: "صحة العملاء والنشاط",
    clientPortfolio: "محفظة العملاء",
    clients: "العملاء",
    generated: "تم التحديث",
    healthReason: {
      ATTENTION: "تحتاج هذه المحفظة متابعة عاجلة بسبب مؤشرات تشغيلية عالية المخاطر.",
      HEALTHY: "نشاط العميل مستقر ضمن المؤشرات الحالية.",
      WATCH: "توجد مؤشرات تستحق المتابعة خلال الفترة الحالية.",
    },
    healthStatus: {
      ATTENTION: "تحتاج متابعة",
      HEALTHY: "مستقرة",
      WATCH: "تحت المتابعة",
    },
    hours: "الساعات",
    noActivity: "لا يوجد نشاط حديث لهذا العميل.",
    noClients: "لا يوجد عملاء نشطون مسندون لهذه المحفظة.",
    open: "مفتوحة",
    openRequests: "طلبات مفتوحة",
    overdue: "متأخرة",
    overdueRequests: "طلبات متأخرة",
    pageDescription:
      "مركز محفظة يوضح صحة العملاء، الاستخدام، الأعمال المفتوحة، ومؤشرات المتابعة باستخدام بيانات النظام الحالية.",
    portfolioCommandCenter: "مركز محفظة العملاء",
    recentActivity: "النشاط الأخير",
    requestActivity: "نشاط على الطلب",
    sector: "القطاع",
    waitingClient: "بانتظار العميل",
    waitingClientRequests: "بانتظار العميل",
  },
  en: {
    activityRecorded: "Activity recorded",
    approvedHours: "Approved hours",
    assignedManagers: "Account managers",
    city: "City",
    clientHealthActivity: "Client health and activity",
    clientPortfolio: "Client portfolio",
    clients: "Clients",
    generated: "Generated",
    healthReason: {
      ATTENTION: "This portfolio needs urgent follow-up due to high-risk operating indicators.",
      HEALTHY: "Client activity is stable across the current indicators.",
      WATCH: "Current indicators should be monitored this period.",
    },
    healthStatus: {
      ATTENTION: "Needs attention",
      HEALTHY: "Healthy",
      WATCH: "Watch",
    },
    hours: "Hours",
    noActivity: "No recent activity for this client.",
    noClients: "No assigned active clients in this portfolio.",
    open: "Open",
    openRequests: "Open requests",
    overdue: "Overdue",
    overdueRequests: "Overdue requests",
    pageDescription:
      "Assigned clients, open work, attention indicators, and health signals based on existing request, delivery, document, and hours data.",
    portfolioCommandCenter: "Portfolio command center",
    recentActivity: "Recent activity",
    requestActivity: "Request activity",
    sector: "Sector",
    waitingClient: "Waiting client",
    waitingClientRequests: "Waiting client",
  },
} as const;

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
    year: "numeric",
  }).format(new Date(value));
}

function healthLabel(code: "ATTENTION" | "WATCH" | "HEALTHY", locale: SupportedLocale): string {
  return copy[locale].healthStatus[code];
}

function healthReason(code: "ATTENTION" | "WATCH" | "HEALTHY", locale: SupportedLocale): string {
  return copy[locale].healthReason[code];
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
  const watchClients = portfolio.portfolio.filter((entry) => entry.health.code === "WATCH");
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
          label={t.openRequests}
          value={number(totals.openRequests, language)}
          detail={t.open}
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
        <MetricCard
          label={healthLabel("WATCH", language)}
          value={number(watchClients.length, language)}
          detail={t.clientHealthActivity}
        />
      </BentoGrid>

      <SectionCard title={t.clientHealthActivity}>
        {portfolio.portfolio.length === 0 ? (
          <EmptyState>{t.noClients}</EmptyState>
        ) : (
          <div className="entity-grid">
            {portfolio.portfolio.map((entry) => (
              <article className="entity-card" key={entry.client.id}>
                <div className="entity-card-heading">
                  <div>
                    <StatusChip status={entry.health.code} label={healthLabel(entry.health.code, language)} />
                    <h3>{entry.client.name}</h3>
                  </div>
                  <span>{entry.client.code}</span>
                </div>
                <p>{healthReason(entry.health.code, language)}</p>
                <dl className="entity-meta four-up">
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
                    <dd>{entry.accountManagers.map((manager) => manager.displayName).join(", ") || "-"}</dd>
                  </div>
                </dl>
                <div className="activity-list">
                  <h4>{t.recentActivity}</h4>
                  {entry.recentActivity.length === 0 ? (
                    <EmptyState>{t.noActivity}</EmptyState>
                  ) : (
                    entry.recentActivity.map((activity) => (
                      <article key={activity.id}>
                        <strong>{activity.request?.requestNumber ?? t.requestActivity}</strong>
                        <p>{activity.reason ?? t.activityRecorded}</p>
                        <small>{dateTime(activity.occurredAt, language)}</small>
                      </article>
                    ))
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}
