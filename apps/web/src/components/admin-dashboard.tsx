import Link from "next/link";
import type { ClientsSnapshot } from "../lib/clients-types";
import { normalizeLocale, type SupportedLocale } from "../lib/i18n";
import type {
  AccountManagerPortfolio,
  MonthlyReport,
  MonthlyUsageResponse,
} from "../lib/operations-types";
import type { RequestQueueResponse, RequestSummary } from "../lib/request-types";
import {
  ActionCard,
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

const copy = {
  ar: {
    eyebrow: "لوحة الإدارة",
    title: "مركز تشغيل جزوم",
    description:
      "نظرة تنفيذية موحدة على العملاء، الطلبات، الساعات، التقارير، وصحة الحسابات باستخدام بيانات النظام الحالية.",
    manageClients: "إدارة العملاء",
    metrics: {
      totalClients: "إجمالي العملاء",
      activeClients: "عميل نشط",
      openRequests: "طلبات مفتوحة",
      completed: "مكتمل",
      delayedRequests: "طلبات متأخرة",
      fromQueues: "من قوائم العمل",
      usedHours: "الساعات المستخدمة",
      period: "الفترة",
      clientAction: "بانتظار العميل",
      waitingClient: "تحتاج إجراء من العميل",
      portalUsers: "مستخدمو البوابة",
      linkedClients: "مرتبطون بالعملاء",
      clientHealth: "صحة العملاء",
      watch: "تحت المتابعة",
      monthlyReports: "التقارير الشهرية",
      published: "منشور",
    },
    queues: {
      title: "قوائم التشغيل",
      description: "أحجام العمل الحالية للمختصين والمشرفين ومديري الحسابات.",
      action: "فتح قوائم العمل",
      specialist: "المختص",
      supervisor: "المشرف",
      accountManager: "مدير الحساب",
      overdue: "متأخر",
    },
    hours: {
      title: "استخدام الساعات",
      description: "الساعات المعتمدة والمعلقة خلال فترة السجل الحالية.",
      action: "عرض سجل الساعات",
      approved: "معتمدة",
      submitted: "مقدمة",
      billable: "قابلة للفوترة",
      clients: "عملاء",
    },
    health: {
      title: "متابعة صحة العملاء",
      description: "عملاء يحتاجون متابعة من مدير الحساب أو الإدارة.",
      action: "المحفظة",
      stableTitle: "المحفظة مستقرة",
      stableBody: "لا يوجد عملاء عاليي المخاطر أو تحت المتابعة حاليًا.",
      open: "مفتوحة",
      overdue: "متأخرة",
      waitingClient: "بانتظار العميل",
      hours: "ساعات",
    },
    requests: {
      title: "آخر الطلبات المحدثة",
      description: "دخول سريع إلى العمل الجاري دون فتح شاشات العميل.",
      action: "كل الطلبات",
      empty: "لم يتم إنشاء طلبات خدمة بعد.",
      request: "الطلب",
      client: "العميل",
      service: "الخدمة",
      status: "الحالة",
      priority: "الأولوية",
      updated: "آخر تحديث",
    },
    shortcuts: {
      title: "اختصارات الإدارة",
      description: "مساحات الإعداد الأساسية المدعومة حاليًا من النظام.",
      clientsTitle: "إدارة العملاء",
      clientsDescription: "ملفات العملاء، الحالات، جهات التواصل، ومستخدمي البوابة.",
      catalogTitle: "كتالوج الخدمات",
      catalogDescription: "الخدمات الشهرية، الباقات، البنود، الاشتراطات، والإصدارات.",
      templatesTitle: "نماذج الطلبات",
      templatesDescription: "نماذج ديناميكية مرتبطة ببنود الخدمات لإنشاء الطلبات.",
      platformTitle: "إعدادات المنصة",
      platformDescription: "الإعدادات، مسارات العمل، الإشعارات، وقوالب المستندات.",
    },
  },
  en: {
    eyebrow: "Admin Console",
    title: "Operating dashboard",
    description:
      "A premium control room for clients, request queues, hours usage, reports, and client health using the current backend data contracts.",
    manageClients: "Manage clients",
    metrics: {
      totalClients: "Total clients",
      activeClients: "active",
      openRequests: "Open requests",
      completed: "completed",
      delayedRequests: "Delayed requests",
      fromQueues: "From request queues",
      usedHours: "Used hours",
      period: "Period",
      clientAction: "Client action",
      waitingClient: "Waiting on client",
      portalUsers: "Portal users",
      linkedClients: "Linked to managed clients",
      clientHealth: "Client health",
      watch: "watch",
      monthlyReports: "Monthly reports",
      published: "published",
    },
    queues: {
      title: "Operations queues",
      description: "Backend-scoped request counts for internal execution.",
      action: "Open queues",
      specialist: "Specialist",
      supervisor: "Supervisor",
      accountManager: "Account manager",
      overdue: "Overdue",
    },
    hours: {
      title: "Hours usage",
      description: "Approved and pending time for the current ledger period.",
      action: "View ledger",
      approved: "Approved",
      submitted: "Submitted",
      billable: "Billable",
      clients: "Clients",
    },
    health: {
      title: "Client health watchlist",
      description: "Clients that need account-manager or management attention.",
      action: "Portfolio",
      stableTitle: "Portfolio is stable",
      stableBody: "No high-risk or watch clients in the current portfolio.",
      open: "Open",
      overdue: "Overdue",
      waitingClient: "Waiting client",
      hours: "Hours",
    },
    requests: {
      title: "Recently updated requests",
      description: "Fast access to live work without exposing client-only screens.",
      action: "All requests",
      empty: "No service requests have been created yet.",
      request: "Request",
      client: "Client",
      service: "Service",
      status: "Status",
      priority: "Priority",
      updated: "Updated",
    },
    shortcuts: {
      title: "Administration shortcuts",
      description: "Core setup areas that currently have backend-backed management screens.",
      clientsTitle: "Client management",
      clientsDescription: "Client profiles, status, contacts, and linked portal users.",
      catalogTitle: "Monthly catalog",
      catalogDescription: "Monthly services, levels, items, package inclusion, and revisions.",
      templatesTitle: "Request templates",
      templatesDescription: "Dynamic service-item forms used by client request intake.",
      platformTitle: "Platform configuration",
      platformDescription: "Settings, workflow states, notifications, and document templates.",
    },
  },
} as const;

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
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
        actions={[{ href: "/admin/clients", label: t.manageClients, variant: "secondary" }]}
      />

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

      <section className="quote-summary-grid">
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
                      {entry.health.label}
                    </span>
                    <h3>{entry.client.name}</h3>
                  </div>
                  <span>{entry.client.code}</span>
                </div>
                <p>{entry.health.reason}</p>
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
                      <StatusChip status={request.status} />
                    </td>
                    <td>
                      <PriorityChip priority={request.priority} />
                    </td>
                    <td>{date(request.updatedAt, language)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SmartTable>
        )}
      </SectionCard>

      <SectionCard title={t.shortcuts.title} description={t.shortcuts.description}>
        <div className="admin-area-grid">
          <ActionCard
            href="/admin/clients"
            index="01"
            title={t.shortcuts.clientsTitle}
            description={t.shortcuts.clientsDescription}
          />
          <ActionCard
            href="/admin/users"
            index="02"
            title={language === "ar" ? "إدارة المستخدمين" : "User management"}
            description={
              language === "ar"
                ? "الأدوار، النطاقات، حالة الحساب، وصلاحيات المستخدمين."
                : "Roles, scopes, account status, and user permissions."
            }
          />
          <ActionCard
            href="/admin/roles"
            index="03"
            title={language === "ar" ? "الأدوار والصلاحيات" : "Roles & permissions"}
            description={
              language === "ar"
                ? "مراجعة أدوار النظام والصلاحيات التشغيلية المرتبطة بها."
                : "Review system roles and assigned operational permissions."
            }
          />
          <ActionCard
            href="/admin/catalog"
            index="04"
            title={t.shortcuts.catalogTitle}
            description={t.shortcuts.catalogDescription}
          />
          <ActionCard
            href="/admin/request-templates"
            index="05"
            title={t.shortcuts.templatesTitle}
            description={t.shortcuts.templatesDescription}
          />
          <ActionCard
            href="/admin/platform-configuration"
            index="06"
            title={t.shortcuts.platformTitle}
            description={t.shortcuts.platformDescription}
          />
          <ActionCard
            href="/admin/audit-logs"
            index="07"
            title={language === "ar" ? "سجل التدقيق" : "Audit logs"}
            description={
              language === "ar"
                ? "أحداث الأمان وتغييرات الصلاحيات والعمليات الحساسة."
                : "Security events, permission changes, and sensitive operations."
            }
          />
        </div>
      </SectionCard>
    </>
  );
}
