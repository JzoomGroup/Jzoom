import Link from "next/link";
import { normalizeLocale, platformTimeZone, type SupportedLocale } from "../lib/i18n";
import type { MonthlyReport, MonthlyUsageResponse } from "../lib/operations-types";
import type { RequestQueueResponse } from "../lib/request-types";
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
      description: "ملخص عالي المستوى لحجم الطلبات، التعثرات، استخدام الساعات والتقارير.",
      queueLabel: "كل القوائم",
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
        "High-level visibility into request volume, delayed work, hours usage, and reports.",
      queueLabel: "All queues",
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
  },
} as const;

function number(value: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(
    locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-SA-u-ca-gregory-nu-latn",
  ).format(value);
}

function hours(value: number | undefined, locale: SupportedLocale): string {
  const amount = Number(value ?? 0);
  return locale === "ar"
    ? `${new Intl.NumberFormat("ar-SA-u-ca-gregory-nu-latn", { maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(amount)} ساعة`
    : `${amount.toFixed(2)}h`;
}

function date(value: string, locale: SupportedLocale): string {
  return new Intl.DateTimeFormat(
    locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-SA-u-ca-gregory-nu-latn",
    {
      day: "2-digit",
      month: "short",
      timeZone: platformTimeZone,
      year: "numeric",
    },
  ).format(new Date(value));
}

export function InternalRoleDashboard({
  locale = "en",
  mode,
  reports = [],
  queue,
  usage,
}: {
  locale?: string;
  mode: RoleDashboardMode;
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
  return (
    <>
      <PageHeader eyebrow={page.eyebrow} title={page.title} description={page.description} />

      <BentoGrid compact>
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
        {mode === "management" ? (
          <>
            <MetricCard
              label={t.metrics.monthlyReports}
              value={number(reports.length, language)}
              detail={t.metrics.preparedReports}
            />
          </>
        ) : (
          <>
            {mode === "supervisor" ? (
              <MetricCard
                label={t.metrics.waitingSupervisor}
                value={number(waitingSupervisor.length, language)}
                detail={t.metrics.reviewAction}
              />
            ) : (
              <MetricCard
                label={t.metrics.waitingClient}
                value={number(waitingClient.length, language)}
                detail={t.metrics.clientAction}
              />
            )}
            {mode === "supervisor" ? (
              <MetricCard
                label={t.metrics.submittedHours}
                value={hours(usage.totals.submittedHours, language)}
                detail={t.metrics.pendingApproval}
              />
            ) : (
              <MetricCard
                label={t.metrics.approvedHours}
                value={hours(usage.totals.approvedHours, language)}
                detail={`${t.metrics.period} ${usage.period.key}`}
              />
            )}
          </>
        )}
      </BentoGrid>

      <SectionCard title={t.priority.title} description={t.priority.description}>
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
