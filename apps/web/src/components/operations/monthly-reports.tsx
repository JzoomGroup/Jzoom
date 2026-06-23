"use client";

import { type FormEvent, useState } from "react";
import {
  operationsErrorMessage,
  prepareMonthlyReport,
  publishMonthlyReport,
} from "../../lib/operations-client";
import type { MonthlyReport } from "../../lib/operations-types";

function currentPeriod(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function countFrom(report: MonthlyReport, section: "requests" | "outputs" | "documentRequests") {
  return report.summary[section]?.total ?? 0;
}

export function MonthlyReports({ initialReports }: { initialReports: MonthlyReport[] }) {
  const [reports, setReports] = useState(initialReports);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    clientId: "",
    period: currentPeriod(),
    title: "",
  });

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
      <header className="catalog-header">
        <div>
          <p className="eyebrow">Monthly reports foundation</p>
          <h1>Client monthly reports</h1>
          <p>
            Prepare a client-safe monthly summary from requests, shared outputs, document requests,
            and basic hours. Publishing exposes the report to client portal users.
          </p>
        </div>
      </header>

      {error && <p className="form-error">{error}</p>}

      <section className="catalog-panel editor-panel">
        <h2>Prepare report</h2>
        <form className="catalog-form" onSubmit={submit}>
          <label>
            Client ID
            <input
              required
              value={form.clientId}
              onChange={(event) => setForm({ ...form, clientId: event.target.value })}
            />
          </label>
          <label>
            Period
            <input
              required
              pattern="\d{4}-\d{2}"
              value={form.period}
              onChange={(event) => setForm({ ...form, period: event.target.value })}
            />
          </label>
          <label>
            Title
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </label>
          <div className="form-actions">
            <button type="submit" disabled={saving}>
              Prepare snapshot
            </button>
          </div>
        </form>
      </section>

      <section className="catalog-panel">
        <div className="entity-grid">
          {reports.map((report) => (
            <article className="entity-card" key={report.id}>
              <div className="entity-card-heading">
                <div>
                  <span className={`status-pill status-${report.status.toLowerCase()}`}>
                    {report.status}
                  </span>
                  <h3>{report.title}</h3>
                </div>
                <span>{report.period}</span>
              </div>
              <p>
                {report.client.name} · {report.client.code}
              </p>
              <div className="entity-meta four-up">
                <span>Requests</span>
                <strong>{countFrom(report, "requests")}</strong>
                <span>Outputs</span>
                <strong>{countFrom(report, "outputs")}</strong>
                <span>Documents</span>
                <strong>{countFrom(report, "documentRequests")}</strong>
                <span>Hours</span>
                <strong>
                  {report.summary.hours?.approvedTotal ?? report.summary.hours?.total ?? 0}
                </strong>
              </div>
              {report.summary.monthlyClosing && (
                <p>Uses finalized closing snapshot: {report.summary.monthlyClosing.title}</p>
              )}
              <div className="entity-card-actions">
                {report.status !== "PUBLISHED" && (
                  <button type="button" disabled={saving} onClick={() => publish(report.id)}>
                    Publish to client
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
        {reports.length === 0 && <p>No monthly reports have been prepared yet.</p>}
      </section>
    </>
  );
}
