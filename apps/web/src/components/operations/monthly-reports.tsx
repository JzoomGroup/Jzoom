"use client";

import { monthlyReportsCopy as copy } from "../../i18n/dictionaries/operations";

import { type FormEvent, useState } from "react";
import {
  operationsErrorMessage,
  prepareMonthlyReport,
  publishMonthlyReport,
} from "../../lib/operations-client";
import type { MonthlyReport } from "../../lib/operations-types";
import { commercialLocale, countText } from "../commercial-i18n";
import { localizedFreeText } from "../client-portal/client-format";
import {
  BentoGrid,
  EmptyState,
  MetricCard,
  PageHeader,
  SectionCard,
  StatusChip,
} from "../premium-os";

interface ReportClientOption {
  id: string;
  code: string;
  name: string;
}

function clientOptionLabel(client: ReportClientOption): string {
  return `${client.name} (${client.code})`;
}

function currentPeriod(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function countFrom(report: MonthlyReport, section: "requests" | "outputs" | "documentRequests") {
  return report.summary[section]?.total ?? 0;
}

function reportStatusLabel(status: MonthlyReport["status"], locale: "ar" | "en"): string {
  if (locale === "en") return status;
  const labels: Record<MonthlyReport["status"], string> = {
    ARCHIVED: "مؤرشف",
    DRAFT: "مسودة",
    PREPARED: "جاهز",
    PUBLISHED: "منشور",
  };
  return labels[status];
}

function hours(value: number | undefined, locale: "ar" | "en"): string {
  const amount = value ?? 0;
  return locale === "ar" ? `${countText(amount, locale)} ساعة` : `${amount}h`;
}

function uniqueClients(reports: MonthlyReport[]): number {
  return new Set(reports.map((report) => report.client.id)).size;
}

function approvedHours(reports: MonthlyReport[]): number {
  return reports.reduce(
    (total, report) =>
      total + (report.summary.hours?.approvedTotal ?? report.summary.hours?.total ?? 0),
    0,
  );
}

export function MonthlyReports({
  clientOptions = [],
  initialReports,
  locale: localeInput = "en",
}: {
  clientOptions?: ReportClientOption[];
  initialReports: MonthlyReport[];
  locale?: string;
}) {
  const locale = commercialLocale(localeInput);
  const t = copy[locale];
  const [reports, setReports] = useState(initialReports);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    clientId: "",
    period: currentPeriod(),
    title: "",
  });
  const publishedReports = reports.filter((report) => report.status === "PUBLISHED").length;
  const pendingReports = reports.filter((report) => report.status !== "PUBLISHED").length;
  const latestPeriod = reports[0]?.period ?? (locale === "ar" ? "لا يوجد" : "None");
  const totalHours = approvedHours(reports);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const report = await prepareMonthlyReport({
        clientId: form.clientId,
        period: form.period,
        ...(form.title.trim() ? { title: form.title.trim() } : {}),
      });
      setReports((items) => [report, ...items.filter((item) => item.id !== report.id)]);
    } catch (caught) {
      setError(operationsErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  async function publish(reportId: string) {
    setSaving(true);
    setError(null);
    try {
      const report = await publishMonthlyReport(reportId);
      setReports((items) => items.map((item) => (item.id === report.id ? report : item)));
    } catch (caught) {
      setError(operationsErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={t.managementReports}
        title={t.monthlyReports}
        description={t.description}
      />

      {error && <p className="form-error">{error}</p>}

      <SectionCard eyebrow={t.reportCommand} title={t.reportSummary}>
        <BentoGrid compact>
          <MetricCard
            accent
            label={t.preparedReports}
            value={countText(reports.length, locale)}
            detail={t.readyLibrary}
          />
          <MetricCard
            label={t.published}
            value={countText(publishedReports, locale)}
            detail={t.publishToClient}
          />
          <MetricCard
            label={t.pendingPublish}
            value={countText(pendingReports, locale)}
            detail={t.preparedReports}
          />
          <MetricCard
            label={t.clientSnapshots}
            value={countText(uniqueClients(reports), locale)}
            detail={t.reportLibrary}
          />
          <MetricCard label={t.latestPeriod} value={latestPeriod} detail={t.period} />
          <MetricCard label={t.approvedHours} value={hours(totalHours, locale)} detail={t.hours} />
        </BentoGrid>
      </SectionCard>

      <section className="operations-report-workspace">
        <SectionCard
          eyebrow={t.reportBuilder}
          title={t.prepareReport}
          description={t.reportBuilderDescription}
        >
          <form className="catalog-form" noValidate onSubmit={submit}>
            <label>
              {t.clientId}
              <select
                required
                value={form.clientId}
                onChange={(event) => setForm({ ...form, clientId: event.target.value })}
              >
                <option value="">{locale === "ar" ? "اختر العميل" : "Select client"}</option>
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
                value={form.period}
                onChange={(event) => setForm({ ...form, period: event.target.value })}
              />
            </label>
            <label>
              {t.title}
              <input
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            </label>
            <div className="form-actions">
              <button type="submit" disabled={saving}>
                {saving ? t.saving : t.prepareSnapshot}
              </button>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          eyebrow={t.reportLibrary}
          title={t.preparedReports}
          description={t.reportCardsDescription}
        >
          <div className="entity-grid operations-record-grid">
            {reports.map((report) => (
              <article className="entity-card" key={report.id}>
                <div className="entity-card-heading">
                  <div>
                    <StatusChip
                      status={report.status}
                      label={reportStatusLabel(report.status, locale)}
                    />
                    <h3>{localizedFreeText(report.title, locale, t.monthlyReports)}</h3>
                  </div>
                  <span>{report.period}</span>
                </div>
                <p>
                  {report.client.name} - {report.client.code}
                </p>
                <dl className="entity-meta four-up">
                  <div>
                    <dt>{t.requests}</dt>
                    <dd>{countText(countFrom(report, "requests"), locale)}</dd>
                  </div>
                  <div>
                    <dt>{t.outputs}</dt>
                    <dd>{countText(countFrom(report, "outputs"), locale)}</dd>
                  </div>
                  <div>
                    <dt>{t.documents}</dt>
                    <dd>{countText(countFrom(report, "documentRequests"), locale)}</dd>
                  </div>
                  <div>
                    <dt>{t.approvedHours}</dt>
                    <dd>
                      {hours(
                        report.summary.hours?.approvedTotal ?? report.summary.hours?.total,
                        locale,
                      )}
                    </dd>
                  </div>
                </dl>
                {report.summary.monthlyClosing && (
                  <p className="operations-source-note">
                    {t.source}:{" "}
                    {localizedFreeText(
                      report.summary.monthlyClosing.title,
                      locale,
                      t.finalizedClosing,
                    )}
                  </p>
                )}
                <div className="entity-card-actions">
                  {report.status !== "PUBLISHED" && (
                    <button type="button" disabled={saving} onClick={() => publish(report.id)}>
                      {saving ? t.saving : t.publishToClient}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
          {reports.length === 0 && <EmptyState title={t.noReportsTitle}>{t.noReports}</EmptyState>}
        </SectionCard>
      </section>
    </>
  );
}
