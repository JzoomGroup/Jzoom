import Link from "next/link";
import { normalizeLocale, type SupportedLocale } from "../lib/i18n";
import type {
  AccountManagerPortfolio,
  MonthlyReport,
  MonthlyUsageResponse,
} from "../lib/operations-types";
import type { RequestQueueResponse } from "../lib/request-types";
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

type RoleDashboardMode = "management" | "specialist" | "supervisor";

const content = {
  ar: {
    specialist: {
      eyebrow: "مساحة المختص",
      title: "مركز إنجاز العمل",
      description:
        "طلباتك المسندة، الأعمال المتأخرة، ما ينتظر العميل، والساعات المسجلة من نطاقك التشغيلي.",
      queueLabel: "قائمة المختص",
    },
    supervisor: {
      eyebrow: "مساحة المشرف",
      title: "مركز المراجعة والاعتماد",
      description: "رؤية واضحة لحمل الفريق، الطلبات المنتظرة للمراجعة، التأخيرات، وسياق الاعتماد.",
      queueLabel: "قائمة المشرف",
    },
    management: {
      eyebrow: "مساحة الإدارة",
      title: "لوحة القيادة التنفيذية",
      description:
        "ملخص عالي المستوى لحجم الطلبات، التعثرات، استخدام الساعات، التقارير، وصحة العملاء.",
      queueLabel: "كل القوائم",
    },
    actions: {
      openQueues: "فتح قوائم العمل",
      requestList: "قائمة الطلبات",
      portfolio: "المحفظة",
    },
    metrics: {
      openRequests: "طلبات مفتوحة",
      delayedRequests: "طلبات متأخرة",
      needsAttention: "تحتاج متابعة",
      waitingClient: "بانتظار العميل",
      clientAction: "إجراء من العميل",
      waitingSupervisor: "بانتظار المشرف",
      reviewAction: "إجراء مراجعة",
      approvedHours: "ساعات معتمدة",
      period: "الفترة",
      submittedHours: "ساعات مقدمة",
      pendingApproval: "بانتظار الاعتماد",
      monthlyReports: "تقارير شهرية",
      preparedReports: "تقارير جاهزة",
      trackedEntries: "قيود مسجلة",
      ledgerEntries: "قيود السجل",
      healthWatch: "متابعة الصحة",
      clientPortfolio: "محفظة العملاء",
      billableHours: "ساعات قابلة للفوترة",
      approvedOrSubmitted: "معتمدة أو مقدمة",
    },
    priority: {
      title: "أولوية العمل",
      description: "آخر الطلبات المحدثة ضمن قائمة العمل المحمية لهذا الدور.",
      empty: "لا توجد طلبات ظاهرة حاليًا في هذه القائمة.",
      request: "الطلب",
      client: "العميل",
      status: "الحالة",
      priority: "الأولوية",
      updated: "آخر تحديث",
    },
    health: {
      title: "متابعة صحة العملاء",
      description: "عملاء يحتاجون متابعة من الإدارة أو مدير الحساب.",
      emptyTitle: "لا توجد حسابات عالية المخاطر",
      emptyBody: "لا يوجد عملاء متعثرون أو تحت المتابعة في المحفظة الحالية.",
      open: "مفتوحة",
      overdue: "متأخرة",
      waitingClient: "بانتظار العميل",
      hours: "ساعات",
    },
    quick: {
      title: "إجراءات سريعة",
      description: "وجهات آمنة حسب الدور ومحمية من صلاحيات النظام.",
      queuesTitle: "قوائم العمل",
      queuesDescription: "فلترة العمل المسند، المراجعة، ومدير الحساب.",
      requestsTitle: "تفاصيل الطلبات",
      requestsDescription: "فتح التنفيذ، المحادثات، المستندات، الساعات، والمخرجات.",
      ledgerTitle: "سجل الساعات",
      ledgerDescription: "مراجعة الساعات المقدمة، المعتمدة، المرفوضة، والقابلة للفوترة.",
      reportsTitle: "التقارير",
      reportsDescription: "مراجعة التقارير الشهرية وملخصات العملاء.",
      notificationsTitle: "الإشعارات",
      notificationsDescription: "رسائل مرتبطة بالطلبات ونشاط العمليات.",
    },
  },
  en: {
    specialist: {
      eyebrow: "Specialist workspace",
      title: "My execution dashboard",
      description:
        "Assigned work, delayed tasks, waiting-client requests, and registered hours from your scoped backend queue.",
      queueLabel: "Specialist queue",
    },
    supervisor: {
      eyebrow: "Supervisor workspace",
      title: "Team review dashboard",
      description:
        "Team workload, requests waiting for review, delayed work, and approval context from existing operations data.",
      queueLabel: "Supervisor queue",
    },
    management: {
      eyebrow: "Management workspace",
      title: "Executive operating dashboard",
      description:
        "High-level visibility into request volume, delayed work, hours usage, reports, and client health.",
      queueLabel: "All queues",
    },
    actions: {
      openQueues: "Open work queues",
      requestList: "Request list",
      portfolio: "Portfolio",
    },
    metrics: {
      openRequests: "Open requests",
      delayedRequests: "Delayed requests",
      needsAttention: "Needs attention",
      waitingClient: "Waiting client",
      clientAction: "Client action",
      waitingSupervisor: "Waiting supervisor",
      reviewAction: "Review action",
      approvedHours: "Approved hours",
      period: "Period",
      submittedHours: "Submitted hours",
      pendingApproval: "Pending approval",
      monthlyReports: "Monthly reports",
      preparedReports: "Prepared reports",
      trackedEntries: "Tracked entries",
      ledgerEntries: "Ledger entries",
      healthWatch: "Health watch",
      clientPortfolio: "Client portfolio",
      billableHours: "Billable hours",
      approvedOrSubmitted: "Approved or submitted",
    },
    priority: {
      title: "Priority work",
      description: "Recently updated requests from the backend-scoped queue for this role.",
      empty: "No requests are currently visible in this queue.",
      request: "Request",
      client: "Client",
      status: "Status",
      priority: "Priority",
      updated: "Updated",
    },
    health: {
      title: "Client health watch",
      description: "Portfolio clients that require management or account-manager follow-up.",
      emptyTitle: "No at-risk clients",
      emptyBody: "No at-risk clients in the visible portfolio.",
      open: "Open",
      overdue: "Overdue",
      waitingClient: "Waiting client",
      hours: "Hours",
    },
    quick: {
      title: "Quick actions",
      description: "Role-safe destinations already protected by backend route guards.",
      queuesTitle: "Work queues",
      queuesDescription: "Filter assigned, review, account-manager, and all work queues.",
      requestsTitle: "Request details",
      requestsDescription:
        "Open request execution, conversations, documents, hours, and deliverables.",
      ledgerTitle: "Hours ledger",
      ledgerDescription: "Review submitted, approved, rejected, billable, and non-billable hours.",
      reportsTitle: "Reports",
      reportsDescription: "Review monthly reports and client operating summaries.",
      notificationsTitle: "Notifications",
      notificationsDescription: "Open messages tied to request and operations activity.",
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

export function InternalRoleDashboard({
  locale = "en",
  mode,
  portfolio,
  reports = [],
  queue,
  usage,
}: {
  locale?: string;
  mode: RoleDashboardMode;
  portfolio?: AccountManagerPortfolio;
  reports?: MonthlyReport[];
  queue: RequestQueueResponse;
  usage: MonthlyUsageResponse;
}) {
  const language = normalizeLocale(locale);
  const t = content[language];
  const page = t[mode];
  const waitingClient = queue.requests.filter((request) => request.status === "WAITING_CLIENT");
  const waitingSupervisor = queue.requests.filter(
    (request) => request.status === "WAITING_SUPERVISOR",
  );
  const latestRequests = [...queue.requests]
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .slice(0, 6);
  const attentionClients =
    portfolio?.portfolio
      .filter((entry) => entry.health.code !== "HEALTHY")
      .sort(
        (left, right) =>
          right.indicators.overdueRequests - left.indicators.overdueRequests ||
          right.indicators.openRequests - left.indicators.openRequests,
      )
      .slice(0, 4) ?? [];

  return (
    <>
      <PageHeader
        eyebrow={page.eyebrow}
        title={page.title}
        description={page.description}
        actions={[{ href: "/requests/queues", label: t.actions.openQueues, variant: "secondary" }]}
      />

      <BentoGrid>
        <MetricCard
          label={t.metrics.openRequests}
          value={number(queue.counters.open, language)}
          detail={page.queueLabel}
          accent
        />
        <MetricCard
          label={t.metrics.delayedRequests}
          value={number(queue.counters.overdue, language)}
          detail={t.metrics.needsAttention}
        />
        <MetricCard
          label={t.metrics.waitingClient}
          value={number(waitingClient.length, language)}
          detail={t.metrics.clientAction}
        />
        <MetricCard
          label={t.metrics.waitingSupervisor}
          value={number(waitingSupervisor.length, language)}
          detail={t.metrics.reviewAction}
        />
        <MetricCard
          label={t.metrics.approvedHours}
          value={hours(usage.totals.approvedHours, language)}
          detail={`${t.metrics.period} ${usage.period.key}`}
        />
        <MetricCard
          label={t.metrics.submittedHours}
          value={hours(usage.totals.submittedHours, language)}
          detail={t.metrics.pendingApproval}
        />
        {mode === "management" ? (
          <MetricCard
            label={t.metrics.monthlyReports}
            value={number(reports.length, language)}
            detail={t.metrics.preparedReports}
          />
        ) : (
          <MetricCard
            label={t.metrics.trackedEntries}
            value={number(usage.totals.entries, language)}
            detail={t.metrics.ledgerEntries}
          />
        )}
        {mode === "management" ? (
          <MetricCard
            label={t.metrics.healthWatch}
            value={number(attentionClients.length, language)}
            detail={t.metrics.clientPortfolio}
          />
        ) : (
          <MetricCard
            label={t.metrics.billableHours}
            value={hours(usage.totals.billableHours, language)}
            detail={t.metrics.approvedOrSubmitted}
          />
        )}
      </BentoGrid>

      <SectionCard
        title={t.priority.title}
        description={t.priority.description}
        action={
          <Link className="os-button os-button-secondary" href="/requests">
            {t.actions.requestList}
          </Link>
        }
      >
        {latestRequests.length === 0 ? (
          <EmptyState>{t.priority.empty}</EmptyState>
        ) : (
          <SmartTable>
            <table className="catalog-table">
              <thead>
                <tr>
                  <th>{t.priority.request}</th>
                  <th>{t.priority.client}</th>
                  <th>{t.priority.status}</th>
                  <th>{t.priority.priority}</th>
                  <th>{t.priority.updated}</th>
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

      {mode === "management" && (
        <SectionCard
          title={t.health.title}
          description={t.health.description}
          action={
            <Link className="os-button os-button-secondary" href="/account-manager">
              {t.actions.portfolio}
            </Link>
          }
        >
          {attentionClients.length === 0 ? (
            <EmptyState title={t.health.emptyTitle}>{t.health.emptyBody}</EmptyState>
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
      )}

      <SectionCard title={t.quick.title} description={t.quick.description}>
        <div className="admin-area-grid">
          <ActionCard
            href="/requests/queues"
            index="01"
            title={t.quick.queuesTitle}
            description={t.quick.queuesDescription}
          />
          <ActionCard
            href="/requests"
            index="02"
            title={t.quick.requestsTitle}
            description={t.quick.requestsDescription}
          />
          <ActionCard
            href="/hours-ledger"
            index="03"
            title={t.quick.ledgerTitle}
            description={t.quick.ledgerDescription}
          />
          <ActionCard
            href={mode === "management" ? "/reports" : "/notifications"}
            index="04"
            title={mode === "management" ? t.quick.reportsTitle : t.quick.notificationsTitle}
            description={
              mode === "management" ? t.quick.reportsDescription : t.quick.notificationsDescription
            }
          />
        </div>
      </SectionCard>
    </>
  );
}
