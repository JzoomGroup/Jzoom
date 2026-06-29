"use client";

import { type FormEvent, type ReactNode, useState } from "react";
import { normalizeLocale, type SupportedLocale } from "../../lib/i18n";
import {
  fetchHoursLedger,
  fetchMonthlyClosings,
  fetchMonthlyUsage,
  finalizeMonthlyClosing,
  operationsErrorMessage,
  prepareMonthlyClosing,
} from "../../lib/operations-client";
import type {
  HoursLedgerResponse,
  MonthlyClosing,
  MonthlyUsageResponse,
} from "../../lib/operations-types";
import {
  BentoGrid,
  EmptyState,
  MetricCard,
  PageHeader,
  SectionCard,
  SmartTable,
  StatusChip,
} from "../premium-os";

const copy = {
  ar: {
    approved: "معتمدة",
    approvedDetail: "ساعات اعتمدت للمراجعة الشهرية",
    billable: "قابلة للفوترة",
    billableDetail: "ساعات تؤثر على رصيد العميل",
    billableNo: "لا",
    billableYes: "نعم",
    client: "العميل",
    clientId: "معرف العميل",
    clientIdPlaceholder: "اختياري",
    clients: "العملاء",
    clientsDetail: "عملاء ضمن النطاق",
    closingDrafts: "مسودات الإغلاق",
    closingLibrary: "لقطات الإغلاق الشهرية",
    closingLibraryDescription: "لقطات محفوظة لاستخدامها في التقارير الشهرية بعد الاعتماد.",
    closingReady: "جاهزة للإقفال",
    closingWorkflow: "مسار الإغلاق",
    date: "التاريخ",
    decision: "قرار المراجعة",
    description:
      "مراجعة داخلية محكومة بالصلاحيات للساعات المقدمة والمعتمدة والمرفوضة، مع لقطات إغلاق شهرية ثابتة.",
    emptyClosings: "لم يتم تجهيز أي لقطة إغلاق شهرية حتى الآن.",
    emptyClosingsTitle: "لا توجد إغلاقات شهرية",
    emptyEntries: "لا توجد قيود ساعات مطابقة لهذا الفلتر.",
    emptyEntriesTitle: "لا توجد قيود",
    emptyUsage: "لا توجد ساعات مقدمة أو معتمدة أو مرفوضة حتى الآن.",
    emptyUsageTitle: "لا يوجد استخدام",
    entries: "القيود",
    entriesDetail: "سجلات الساعات",
    filterDescription: "استخدم الفترة ومعرف العميل عند الحاجة لمراجعة نطاق محدد.",
    filterUsage: "تصفية السجل",
    finalizeAndLock: "اعتماد وإقفال",
    generated: "آخر تحديث",
    hours: "الساعات",
    ledgerFilters: "فلاتر السجل",
    metaPeriod: "الفترة",
    nonBillable: "غير قابلة للفوترة",
    nonBillableDetail: "ساعات متابعة داخلية",
    period: "الفترة",
    prepareClosing: "تجهيز إغلاق شهري",
    prepareClosingDescription: "جهز لقطة شهرية قابلة للإقفال بدون تغيير قيود الساعات الأصلية.",
    prepareDraft: "تجهيز مسودة الإغلاق",
    refreshLedger: "تحديث السجل",
    rejected: "مرفوضة",
    rejectedDetail: "ساعات لم تعتمد",
    request: "الطلب",
    saving: "جاري الحفظ...",
    service: "الخدمة",
    submitted: "مقدمة",
    submittedDetail: "بانتظار المراجعة",
    timeAndUtilization: "الساعات والاستخدام",
    timeEntries: "قيود الساعات",
    timeEntriesDescription: "تفاصيل القيود حسب العميل والطلب والخدمة والمستخدم.",
    title: "العنوان",
    tracked: "المسجلة",
    trackedDetail: "إجمالي الساعات",
    usageSummary: "ملخص الاستخدام حسب العميل",
    usageSummaryDescription: "قراءة سريعة للاعتماد والاستهلاك لكل عميل داخل الفترة.",
    user: "المستخدم",
  },
  en: {
    approved: "Approved",
    approvedDetail: "Approved time for monthly review",
    billable: "Billable",
    billableDetail: "Hours that affect client balance",
    billableNo: "No",
    billableYes: "Yes",
    client: "Client",
    clientId: "Client ID",
    clientIdPlaceholder: "Optional",
    clients: "Clients",
    clientsDetail: "Clients in scope",
    closingDrafts: "Closing drafts",
    closingLibrary: "Monthly closing snapshots",
    closingLibraryDescription: "Saved snapshots used by monthly reports after finalization.",
    closingReady: "Ready to lock",
    closingWorkflow: "Closing workflow",
    date: "Date",
    decision: "Review decision",
    description:
      "Internal, scope-protected view of submitted, approved, and rejected time entries with immutable month-end closing snapshots.",
    emptyClosings: "No monthly closing snapshots have been prepared yet.",
    emptyClosingsTitle: "No monthly closings",
    emptyEntries: "No ledger entries match this filter.",
    emptyEntriesTitle: "No entries",
    emptyUsage: "No submitted, approved, or rejected hours yet.",
    emptyUsageTitle: "No usage yet",
    entries: "Entries",
    entriesDetail: "Ledger records",
    filterDescription: "Use period and client ID when you need to review a specific scope.",
    filterUsage: "Filter usage",
    finalizeAndLock: "Finalize and lock",
    generated: "Generated",
    hours: "Hours",
    ledgerFilters: "Ledger filters",
    metaPeriod: "Period",
    nonBillable: "Non-billable",
    nonBillableDetail: "Internal follow-up time",
    period: "Period",
    prepareClosing: "Prepare monthly closing",
    prepareClosingDescription:
      "Prepare a lockable monthly snapshot without mutating original time entries.",
    prepareDraft: "Prepare closing draft",
    refreshLedger: "Refresh ledger",
    rejected: "Rejected",
    rejectedDetail: "Rejected time",
    request: "Request",
    saving: "Saving...",
    service: "Service",
    submitted: "Submitted",
    submittedDetail: "Pending approval",
    timeAndUtilization: "Time and utilization",
    timeEntries: "Time entries",
    timeEntriesDescription: "Entry-level detail by client, request, service, and user.",
    title: "Title",
    tracked: "Tracked",
    trackedDetail: "All tracked hours",
    usageSummary: "Usage summary by client",
    usageSummaryDescription:
      "Fast review of approval and usage per client for the selected period.",
    user: "User",
  },
} as const;

const timeStatusLabels = {
  APPROVED: { ar: "معتمدة", en: "Approved" },
  REJECTED: { ar: "مرفوضة", en: "Rejected" },
  SUBMITTED: { ar: "مقدمة", en: "Submitted" },
} as const;

const closingStatusLabels = {
  ARCHIVED: { ar: "مؤرشف", en: "Archived" },
  DRAFT: { ar: "مسودة", en: "Draft" },
  FINALIZED: { ar: "نهائي", en: "Finalized" },
} as const;

function currentPeriod(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function number(value: number | undefined, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

function hours(value: number | undefined, locale: SupportedLocale): string {
  return locale === "ar" ? `${number(value, locale)} ساعة` : `${number(value, locale)}h`;
}

function date(value: string | null | undefined, locale: SupportedLocale): string {
  if (!value) return locale === "ar" ? "غير محدد" : "Not set";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function localizedService(entry: HoursLedgerResponse["entries"][number], locale: SupportedLocale) {
  const service = entry.service.monthlyService;
  return locale === "ar" ? service.nameAr || service.nameEn : service.nameEn || service.nameAr;
}

function timeStatusLabel(
  status: HoursLedgerResponse["entries"][number]["status"],
  locale: SupportedLocale,
) {
  return timeStatusLabels[status]?.[locale] ?? status;
}

function closingStatusLabel(status: MonthlyClosing["status"], locale: SupportedLocale) {
  return closingStatusLabels[status]?.[locale] ?? status;
}

function metric(label: ReactNode, value: ReactNode) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function HoursLedger({
  canManageClosings,
  initialClosings,
  initialLedger,
  initialUsage,
  locale: localeInput = "en",
}: {
  canManageClosings: boolean;
  initialClosings: MonthlyClosing[];
  initialLedger: HoursLedgerResponse;
  initialUsage: MonthlyUsageResponse;
  locale?: string;
}) {
  const locale = normalizeLocale(localeInput);
  const t = copy[locale];
  const [ledger, setLedger] = useState(initialLedger);
  const [usage, setUsage] = useState(initialUsage);
  const [closings, setClosings] = useState(initialClosings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    clientId: "",
    period: initialLedger.period.key || currentPeriod(),
  });
  const [closingForm, setClosingForm] = useState({
    clientId: "",
    period: initialLedger.period.key || currentPeriod(),
    title: "",
  });

  async function refresh(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const query = {
        ...(filters.clientId.trim() ? { clientId: filters.clientId.trim() } : {}),
        period: filters.period,
      };
      const [nextLedger, nextUsage, nextClosings] = await Promise.all([
        fetchHoursLedger(query),
        fetchMonthlyUsage(query),
        canManageClosings ? fetchMonthlyClosings(query) : Promise.resolve(closings),
      ]);
      setLedger(nextLedger);
      setUsage(nextUsage);
      setClosings(nextClosings);
    } catch (caught) {
      setError(operationsErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  async function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManageClosings) return;
    setSaving(true);
    setError(null);
    try {
      const closing = await prepareMonthlyClosing({
        clientId: closingForm.clientId.trim(),
        period: closingForm.period,
        ...(closingForm.title.trim() ? { title: closingForm.title.trim() } : {}),
      });
      setClosings((items) => [closing, ...items.filter((item) => item.id !== closing.id)]);
    } catch (caught) {
      setError(operationsErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  async function finalize(id: string) {
    if (!canManageClosings) return;
    setSaving(true);
    setError(null);
    try {
      const closing = await finalizeMonthlyClosing(id);
      setClosings((items) => items.map((item) => (item.id === id ? closing : item)));
    } catch (caught) {
      setError(operationsErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  const draftClosings = closings.filter((closing) => closing.status === "DRAFT").length;

  return (
    <>
      <PageHeader
        eyebrow={t.timeAndUtilization}
        title={locale === "ar" ? "سجل الساعات والإغلاق الشهري" : "Hours ledger and monthly closing"}
        description={t.description}
        meta={
          <>
            <span>
              {t.metaPeriod} {ledger.period.key}
            </span>
            <span>
              {t.generated} {date(ledger.generatedAt, locale)}
            </span>
          </>
        }
      />

      {error && <p className="form-error">{error}</p>}

      <section className="operations-command-panel">
        <SectionCard
          eyebrow={t.ledgerFilters}
          title={t.filterUsage}
          description={t.filterDescription}
        >
          <form className="catalog-form" onSubmit={refresh}>
            <label>
              {t.period}
              <input
                required
                pattern="\d{4}-\d{2}"
                value={filters.period}
                onChange={(event) => setFilters({ ...filters, period: event.target.value })}
              />
            </label>
            <label>
              {t.clientId}
              <input
                value={filters.clientId}
                onChange={(event) => setFilters({ ...filters, clientId: event.target.value })}
                placeholder={t.clientIdPlaceholder}
              />
            </label>
            <div className="form-actions">
              <button type="submit" disabled={saving}>
                {saving ? t.saving : t.refreshLedger}
              </button>
            </div>
          </form>
        </SectionCard>
      </section>

      <BentoGrid compact>
        <MetricCard
          accent
          label={t.entries}
          value={number(ledger.totals.entries, locale)}
          detail={t.entriesDetail}
        />
        <MetricCard
          label={t.approved}
          value={hours(ledger.totals.approvedHours, locale)}
          detail={t.approvedDetail}
        />
        <MetricCard
          label={t.submitted}
          value={hours(ledger.totals.submittedHours, locale)}
          detail={t.submittedDetail}
        />
        <MetricCard
          label={t.billable}
          value={hours(ledger.totals.billableHours, locale)}
          detail={t.billableDetail}
        />
        <MetricCard
          label={t.tracked}
          value={hours(ledger.totals.hours, locale)}
          detail={t.trackedDetail}
        />
        <MetricCard
          label={t.clients}
          value={number(usage.clients.length, locale)}
          detail={t.clientsDetail}
        />
        <MetricCard
          label={t.rejected}
          value={hours(ledger.totals.rejectedHours, locale)}
          detail={t.rejectedDetail}
        />
        <MetricCard
          label={t.closingDrafts}
          value={number(draftClosings, locale)}
          detail={t.closingReady}
        />
      </BentoGrid>

      <SectionCard title={t.usageSummary} description={t.usageSummaryDescription}>
        <div className="entity-grid operations-record-grid">
          {usage.clients.map((client) => (
            <article className="entity-card" key={client.id}>
              <div className="entity-card-heading">
                <div>
                  <span className="status-pill status-active">{client.code}</span>
                  <h3>{client.name}</h3>
                </div>
                <span>{client.sector}</span>
              </div>
              <dl className="entity-meta four-up">
                {metric(t.approved, hours(client.approvedHours, locale))}
                {metric(t.submitted, hours(client.submittedHours, locale))}
                {metric(t.rejected, hours(client.rejectedHours, locale))}
                {metric(t.entries, number(client.entries, locale))}
              </dl>
            </article>
          ))}
        </div>
        {usage.clients.length === 0 && (
          <EmptyState title={t.emptyUsageTitle}>{t.emptyUsage}</EmptyState>
        )}
      </SectionCard>

      {canManageClosings && (
        <SectionCard
          eyebrow={t.closingWorkflow}
          title={t.prepareClosing}
          description={t.prepareClosingDescription}
        >
          <form className="catalog-form" onSubmit={prepare}>
            <label>
              {t.clientId}
              <input
                required
                value={closingForm.clientId}
                onChange={(event) =>
                  setClosingForm({ ...closingForm, clientId: event.target.value })
                }
              />
            </label>
            <label>
              {t.period}
              <input
                required
                pattern="\d{4}-\d{2}"
                value={closingForm.period}
                onChange={(event) => setClosingForm({ ...closingForm, period: event.target.value })}
              />
            </label>
            <label>
              {t.title}
              <input
                value={closingForm.title}
                onChange={(event) => setClosingForm({ ...closingForm, title: event.target.value })}
              />
            </label>
            <div className="form-actions">
              <button type="submit" disabled={saving}>
                {saving ? t.saving : t.prepareDraft}
              </button>
            </div>
          </form>
        </SectionCard>
      )}

      {canManageClosings && (
        <SectionCard title={t.closingLibrary} description={t.closingLibraryDescription}>
          <div className="entity-grid operations-record-grid">
            {closings.map((closing) => (
              <article className="entity-card" key={closing.id}>
                <div className="entity-card-heading">
                  <div>
                    <StatusChip
                      status={closing.status}
                      label={closingStatusLabel(closing.status, locale)}
                    />
                    <h3>{closing.title}</h3>
                  </div>
                  <span>{closing.period}</span>
                </div>
                <p>
                  {closing.client.name} · {closing.client.code}
                </p>
                <dl className="entity-meta four-up">
                  {metric(t.approved, hours(closing.summary.totals?.approvedHours, locale))}
                  {metric(t.submitted, hours(closing.summary.totals?.submittedHours, locale))}
                  {metric(t.rejected, hours(closing.summary.totals?.rejectedHours, locale))}
                  {metric(t.entries, number(closing.summary.totals?.entries, locale))}
                </dl>
                {closing.status === "DRAFT" && (
                  <div className="entity-card-actions">
                    <button type="button" disabled={saving} onClick={() => finalize(closing.id)}>
                      {saving ? t.saving : t.finalizeAndLock}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
          {closings.length === 0 && (
            <EmptyState title={t.emptyClosingsTitle}>{t.emptyClosings}</EmptyState>
          )}
        </SectionCard>
      )}

      <SectionCard title={t.timeEntries} description={t.timeEntriesDescription}>
        <SmartTable>
          <table className="catalog-table operations-ledger-table">
            <thead>
              <tr>
                <th>{t.date}</th>
                <th>{t.client}</th>
                <th>{t.request}</th>
                <th>{t.service}</th>
                <th>{t.user}</th>
                <th>{t.decision}</th>
                <th>{t.billable}</th>
                <th>{t.hours}</th>
              </tr>
            </thead>
            <tbody>
              {ledger.entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{date(entry.workDate, locale)}</td>
                  <td>{entry.client.name}</td>
                  <td>{entry.request.requestNumber}</td>
                  <td>{localizedService(entry, locale)}</td>
                  <td>{entry.user.displayName}</td>
                  <td>
                    <StatusChip
                      status={entry.status}
                      label={timeStatusLabel(entry.status, locale)}
                    />
                  </td>
                  <td>{entry.billable ? t.billableYes : t.billableNo}</td>
                  <td>{hours(entry.hours, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SmartTable>
        {ledger.entries.length === 0 && (
          <EmptyState title={t.emptyEntriesTitle}>{t.emptyEntries}</EmptyState>
        )}
      </SectionCard>
    </>
  );
}
