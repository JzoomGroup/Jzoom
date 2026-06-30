"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { refreshRequestQueue, requestErrorMessage } from "../../lib/request-client";
import type {
  RequestAssignmentCandidate,
  RequestIntakeOptions,
  RequestIntakeSubscriptionServiceOption,
  RequestQueueResponse,
  RequestStatus,
  RequestSummary,
} from "../../lib/request-types";
import { normalizeLocale, type SupportedLocale } from "../../lib/i18n";
import {
  BentoGrid,
  EmptyState,
  MetricCard,
  PageHeader,
  PriorityChip,
  SectionCard,
  StatusChip,
} from "../premium-os";

const queues: RequestQueueResponse["queue"][] = [
  "all",
  "specialist",
  "supervisor",
  "account-manager",
];

const statuses = [
  "",
  "NEW",
  "TRIAGE",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_CLIENT",
  "WAITING_SUPERVISOR",
  "COMPLETED",
  "RETURNED",
] as const;

const priorities = ["", "LOW", "NORMAL", "HIGH", "URGENT"] as const;

const copy = {
  ar: {
    accountManager: "مدير الحساب",
    activeQueue: "الطابور الحالي",
    allRequests: "كل الطلبات",
    anyPriority: "كل الأولويات",
    anyAssignee: "كل المسؤولين",
    anyClient: "كل العملاء",
    anyService: "كل الخدمات",
    anyStatus: "كل الحالات",
    applyFilters: "تطبيق الفلاتر",
    assigneeId: "المسؤول",
    clientFollowUp: "متابعة العميل",
    clientId: "العميل",
    due: "الموعد",
    dueBefore: "مستحق قبل",
    emptyQueue: "لا توجد طلبات مطابقة لهذا الطابور.",
    executionQueue: "طابور التنفيذ",
    internalExecution: "التنفيذ الداخلي",
    needsAttention: "تحتاج متابعة",
    notSet: "غير محدد",
    open: "مفتوحة",
    overdue: "متأخرة",
    priority: "الأولوية",
    queueFilters: "فلاتر الطابور",
    queueResults: "نتائج الطابور",
    segmentWork: "فرز وتصفية العمل",
    serviceId: "الخدمة",
    specialist: "المختص",
    status: "الحالة",
    supervisor: "المشرف",
    reviewQueue: "طابور المراجعة",
    visibleActiveWork: "عمل نشط ظاهر",
    visibleRequests: "طلبات ظاهرة",
    workQueues: "طوابير عمل الطلبات",
    workQueuesDescription:
      "تابع عمل المختص والمشرف ومدير الحساب من طوابير طلبات مرتبطة بصلاحيات backend.",
  },
  en: {
    accountManager: "Account manager",
    activeQueue: "Active queue",
    allRequests: "All requests",
    anyPriority: "Any priority",
    anyAssignee: "Any assignee",
    anyClient: "Any client",
    anyService: "Any service",
    anyStatus: "Any status",
    applyFilters: "Apply filters",
    assigneeId: "Assignee",
    clientFollowUp: "Client follow-up",
    clientId: "Client",
    due: "Due",
    dueBefore: "Due before",
    emptyQueue: "No requests match this queue.",
    executionQueue: "Execution queue",
    internalExecution: "Internal execution",
    needsAttention: "Needs attention",
    notSet: "Not set",
    open: "Open",
    overdue: "Overdue",
    priority: "Priority",
    queueFilters: "Queue filters",
    queueResults: "Queue results",
    segmentWork: "Segment and refine work",
    serviceId: "Service",
    specialist: "Specialist",
    status: "Status",
    supervisor: "Supervisor",
    reviewQueue: "Review queue",
    visibleActiveWork: "Visible active work",
    visibleRequests: "visible requests",
    workQueues: "Request work queues",
    workQueuesDescription:
      "Track specialist, supervisor, and account-manager work from backend-scoped request queues.",
  },
} as const;

const queueLabels: Record<RequestQueueResponse["queue"], Record<SupportedLocale, string>> = {
  "account-manager": { ar: "مدير الحساب", en: "Account manager" },
  all: { ar: "كل الطوابير", en: "All queues" },
  specialist: { ar: "المختص", en: "Specialist" },
  supervisor: { ar: "المشرف", en: "Supervisor" },
};

const priorityLabels = {
  HIGH: { ar: "عالية", en: "High" },
  LOW: { ar: "منخفضة", en: "Low" },
  NORMAL: { ar: "عادية", en: "Normal" },
  URGENT: { ar: "عاجلة", en: "Urgent" },
} as const;

const statusLabels = {
  ASSIGNED: { ar: "مسند", en: "Assigned" },
  CLOSED: { ar: "مغلق", en: "Closed" },
  COMPLETED: { ar: "مكتمل", en: "Completed" },
  IN_PROGRESS: { ar: "قيد التنفيذ", en: "In progress" },
  NEW: { ar: "جديد", en: "New" },
  REJECTED: { ar: "مرفوض", en: "Rejected" },
  RETURNED: { ar: "معاد للتعديل", en: "Returned" },
  TRIAGE: { ar: "قيد الفرز", en: "In review" },
  WAITING_CLIENT: { ar: "بانتظار العميل", en: "Waiting for client" },
  WAITING_SUPERVISOR: { ar: "بانتظار المشرف", en: "Waiting for supervisor" },
} satisfies Record<RequestStatus, Record<SupportedLocale, string>>;

const emptyIntakeOptions: RequestIntakeOptions = {
  assignmentCandidates: {
    accountManagers: [],
    specialists: [],
    supervisors: [],
  },
  clients: [],
};

function intakeClientLabel(client: RequestIntakeOptions["clients"][number]): string {
  return `${client.name} (${client.code})`;
}

function intakeServiceLabel(
  service: RequestIntakeSubscriptionServiceOption,
  locale: SupportedLocale,
): string {
  const monthlyName =
    locale === "ar"
      ? service.monthlyService.nameAr || service.monthlyService.nameEn
      : service.monthlyService.nameEn || service.monthlyService.nameAr;
  const level =
    locale === "ar"
      ? service.serviceLevel.labelAr || service.serviceLevel.labelEn
      : service.serviceLevel.labelEn || service.serviceLevel.labelAr;
  return `${monthlyName} (${service.monthlyService.code}) - ${level}`;
}

function candidateLabel(candidate: RequestAssignmentCandidate): string {
  return `${candidate.displayName} - ${candidate.email}`;
}

function serviceFilterOptions(
  options: RequestIntakeOptions,
): RequestIntakeSubscriptionServiceOption[] {
  const services = new Map<string, RequestIntakeSubscriptionServiceOption>();
  for (const client of options.clients) {
    for (const subscription of client.subscriptions) {
      for (const service of subscription.services) {
        services.set(service.monthlyService.id, service);
      }
    }
  }
  return [...services.values()].sort((left, right) =>
    left.monthlyService.code.localeCompare(right.monthlyService.code),
  );
}

function assigneeFilterOptions(options: RequestIntakeOptions): RequestAssignmentCandidate[] {
  const users = new Map<string, RequestAssignmentCandidate>();
  for (const candidate of [
    ...options.assignmentCandidates.specialists,
    ...options.assignmentCandidates.supervisors,
    ...options.assignmentCandidates.accountManagers,
  ]) {
    users.set(candidate.id, candidate);
  }
  return [...users.values()].sort((left, right) =>
    left.displayName.localeCompare(right.displayName),
  );
}

function displayDate(value: string | null, locale: SupportedLocale): string {
  if (!value) return copy[locale].notSet;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function localizedServiceName(request: RequestSummary, locale: SupportedLocale): string {
  return locale === "ar"
    ? request.service.monthlyService.nameAr || request.service.monthlyService.nameEn
    : request.service.monthlyService.nameEn || request.service.monthlyService.nameAr;
}

function priorityLabel(priority: string, locale: SupportedLocale): string {
  return priorityLabels[priority as keyof typeof priorityLabels]?.[locale] ?? priority;
}

function statusLabel(status: RequestStatus, locale: SupportedLocale): string {
  return statusLabels[status]?.[locale] ?? status;
}

export function RequestQueue({
  intakeOptions = emptyIntakeOptions,
  initialQueue,
  locale: localeInput = "en",
}: {
  intakeOptions?: RequestIntakeOptions | null;
  initialQueue: RequestQueueResponse;
  locale?: string;
}) {
  const locale = normalizeLocale(localeInput);
  const t = copy[locale];
  const filterOptions = intakeOptions ?? emptyIntakeOptions;
  const serviceOptions = serviceFilterOptions(filterOptions);
  const assigneeOptions = assigneeFilterOptions(filterOptions);
  const [queue, setQueue] = useState(initialQueue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    assigneeId: "",
    clientId: "",
    dueTo: "",
    priority: "",
    serviceId: "",
    status: "",
  });
  const numberFormatter = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-SA");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const activeFilters = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value.trim().length > 0),
      );
      if (activeFilters.dueTo) {
        activeFilters.dueTo = new Date(activeFilters.dueTo).toISOString();
      }
      setQueue(await refreshRequestQueue(queue.queue, activeFilters));
    } catch (caught) {
      setError(requestErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  async function switchQueue(nextQueue: RequestQueueResponse["queue"]) {
    setLoading(true);
    setError(null);
    try {
      setQueue(await refreshRequestQueue(nextQueue));
    } catch (caught) {
      setError(requestErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={t.internalExecution}
        title={t.workQueues}
        description={t.workQueuesDescription}
        actions={[{ href: "/requests", label: t.allRequests, variant: "secondary" }]}
      />

      <div className="request-queue-command">
        <BentoGrid>
          <MetricCard
            label={t.open}
            value={queue.counters.open}
            detail={t.visibleActiveWork}
            accent
          />
          <MetricCard
            label={t.specialist}
            value={queue.counters.specialist}
            detail={t.executionQueue}
          />
          <MetricCard
            label={t.supervisor}
            value={queue.counters.supervisor}
            detail={t.reviewQueue}
          />
          <MetricCard
            label={t.accountManager}
            value={queue.counters.accountManager}
            detail={t.clientFollowUp}
          />
          <MetricCard label={t.overdue} value={queue.counters.overdue} detail={t.needsAttention} />
        </BentoGrid>
      </div>

      <SectionCard eyebrow={t.queueFilters} title={t.segmentWork}>
        <div className="request-queue-tabs" aria-label={t.queueFilters}>
          {queues.map((item) => (
            <button
              className={
                item === queue.queue
                  ? "os-button os-button-primary"
                  : "os-button os-button-secondary"
              }
              disabled={loading}
              key={item}
              type="button"
              onClick={() => void switchQueue(item)}
            >
              {queueLabels[item][locale]}
            </button>
          ))}
        </div>
        <form className="catalog-form wide-form request-queue-filter-form" onSubmit={submit}>
          <label>
            {t.status}
            <select
              value={filters.status}
              onChange={(event) => setFilters({ ...filters, status: event.target.value })}
            >
              {statuses.map((status) => (
                <option key={status || "any"} value={status}>
                  {status ? statusLabel(status, locale) : t.anyStatus}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t.priority}
            <select
              value={filters.priority}
              onChange={(event) => setFilters({ ...filters, priority: event.target.value })}
            >
              {priorities.map((priority) => (
                <option key={priority || "any"} value={priority}>
                  {priority ? priorityLabel(priority, locale) : t.anyPriority}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t.clientId}
            <select
              value={filters.clientId}
              onChange={(event) => setFilters({ ...filters, clientId: event.target.value })}
            >
              <option value="">{t.anyClient}</option>
              {filterOptions.clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {intakeClientLabel(client)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t.serviceId}
            <select
              value={filters.serviceId}
              onChange={(event) => setFilters({ ...filters, serviceId: event.target.value })}
            >
              <option value="">{t.anyService}</option>
              {serviceOptions.map((service) => (
                <option key={service.monthlyService.id} value={service.monthlyService.id}>
                  {intakeServiceLabel(service, locale)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t.assigneeId}
            <select
              value={filters.assigneeId}
              onChange={(event) => setFilters({ ...filters, assigneeId: event.target.value })}
            >
              <option value="">{t.anyAssignee}</option>
              {assigneeOptions.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidateLabel(candidate)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t.dueBefore}
            <input
              type="datetime-local"
              value={filters.dueTo}
              onChange={(event) => setFilters({ ...filters, dueTo: event.target.value })}
            />
          </label>
          <button className="os-button os-button-primary" disabled={loading} type="submit">
            {t.applyFilters}
          </button>
        </form>
        {error && <p className="form-error">{error}</p>}
      </SectionCard>

      <SectionCard
        eyebrow={t.queueResults}
        title={
          locale === "ar"
            ? `طابور ${queueLabels[queue.queue][locale]}`
            : `${queueLabels[queue.queue][locale]} queue`
        }
      >
        <div className="request-queue-result-bar">
          <div>
            <span>{t.activeQueue}</span>
            <strong>{queueLabels[queue.queue][locale]}</strong>
          </div>
          <small>
            {numberFormatter.format(queue.requests.length)} {t.visibleRequests}
          </small>
        </div>
        {queue.requests.length === 0 ? (
          <EmptyState>{t.emptyQueue}</EmptyState>
        ) : (
          <div className="quote-list-grid">
            {queue.requests.map((request) => (
              <article className="quote-list-card request-operation-card" key={request.id}>
                <Link className="quote-list-main" href={`/requests/${request.id}`}>
                  <div>
                    <small>{request.requestNumber}</small>
                    <h2>{request.title}</h2>
                    <p>
                      {request.client.name} - {localizedServiceName(request, locale)}
                    </p>
                  </div>
                  <div className="quote-list-meta">
                    <StatusChip
                      status={request.status}
                      label={statusLabel(request.status, locale)}
                    />
                    <PriorityChip
                      priority={request.priority}
                      label={priorityLabel(request.priority, locale)}
                    />
                    <small>
                      {t.due} {displayDate(request.dueAt, locale)}
                    </small>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}
