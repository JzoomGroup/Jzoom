"use client";

import { hoursLedgerCopy as copy } from "../../i18n/dictionaries/operations";

import { type FormEvent, type ReactNode, useState } from "react";
import { normalizeLocale, platformTimeZone, type SupportedLocale } from "../../lib/i18n";
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
import { replaceCurrentUrlQuery } from "../../lib/url-state";
import { AppDialog } from "../app-dialog";
import {
  BentoGrid,
  EmptyState,
  MetricCard,
  PageHeader,
  SectionCard,
  SmartTable,
  StatusChip,
} from "../premium-os";

interface OperationsClientOption {
  id: string;
  code: string;
  name: string;
}

function clientOptionLabel(client: OperationsClientOption): string {
  return `${client.name} (${client.code})`;
}

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
  return new Intl.NumberFormat(
    locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-SA-u-ca-gregory-nu-latn",
    {
      maximumFractionDigits: 2,
    },
  ).format(value ?? 0);
}

function hours(value: number | undefined, locale: SupportedLocale): string {
  return locale === "ar" ? `${number(value, locale)} ساعة` : `${number(value, locale)}h`;
}

function date(value: string | null | undefined, locale: SupportedLocale): string {
  if (!value) return locale === "ar" ? "غير محدد" : "Not set";
  return new Intl.DateTimeFormat(
    locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-SA-u-ca-gregory-nu-latn",
    {
      dateStyle: "medium",
      timeZone: platformTimeZone,
    },
  ).format(new Date(value));
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
  clientOptions = [],
  initialClientId = "",
  initialClosings,
  initialLedger,
  initialUsage,
  locale: localeInput = "en",
}: {
  canManageClosings: boolean;
  clientOptions?: OperationsClientOption[];
  initialClientId?: string;
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
  const [showClosingForm, setShowClosingForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    clientId: initialClientId,
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
      replaceCurrentUrlQuery(
        {
          clientId: filters.clientId.trim() || undefined,
          period: filters.period === currentPeriod() ? undefined : filters.period,
        },
        ["clientId", "period"],
      );
      setShowFilters(false);
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
      setShowClosingForm(false);
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
        actions={[
          {
            label: t.filterUsage,
            onClick: () => setShowFilters(true),
            variant: "secondary",
          },
          ...(canManageClosings
            ? [
                {
                  label: t.prepareClosing,
                  onClick: () => setShowClosingForm(true),
                  variant: "primary" as const,
                },
              ]
            : []),
        ]}
      />

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {showFilters ? (
        <AppDialog
          busy={saving}
          closeLabel={locale === "ar" ? "إغلاق" : "Close"}
          description={t.filterDescription}
          eyebrow={t.ledgerFilters}
          onClose={() => setShowFilters(false)}
          size="md"
          title={t.filterUsage}
        >
          <form className="catalog-form" noValidate onSubmit={refresh}>
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
              <select
                value={filters.clientId}
                onChange={(event) => setFilters({ ...filters, clientId: event.target.value })}
              >
                <option value="">{t.clientIdPlaceholder}</option>
                {clientOptions.map((client) => (
                  <option key={client.id} value={client.id}>
                    {clientOptionLabel(client)}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-actions">
              <button type="submit" disabled={saving}>
                {saving ? t.saving : t.refreshLedger}
              </button>
            </div>
          </form>
        </AppDialog>
      ) : null}

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

      {canManageClosings && showClosingForm ? (
        <AppDialog
          busy={saving}
          closeLabel={locale === "ar" ? "إغلاق" : "Close"}
          description={t.prepareClosingDescription}
          eyebrow={t.closingWorkflow}
          onClose={() => setShowClosingForm(false)}
          size="md"
          title={t.prepareClosing}
        >
          <form className="catalog-form" noValidate onSubmit={prepare}>
            <label>
              {t.clientId}
              <select
                required
                value={closingForm.clientId}
                onChange={(event) =>
                  setClosingForm({ ...closingForm, clientId: event.target.value })
                }
              >
                <option value="">{t.clientIdPlaceholder}</option>
                {clientOptions.map((client) => (
                  <option key={client.id} value={client.id}>
                    {clientOptionLabel(client)}
                  </option>
                ))}
              </select>
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
        </AppDialog>
      ) : null}

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
