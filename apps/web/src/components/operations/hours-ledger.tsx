"use client";

import { type FormEvent, useState } from "react";
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

function currentPeriod(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function hours(value: number | undefined): string {
  return `${Number(value ?? 0).toFixed(2)}h`;
}

function metric(label: string, value: string | number) {
  return (
    <>
      <span>{label}</span>
      <strong>{value}</strong>
    </>
  );
}

export function HoursLedger({
  canManageClosings,
  initialClosings,
  initialLedger,
  initialUsage,
}: {
  canManageClosings: boolean;
  initialClosings: MonthlyClosing[];
  initialLedger: HoursLedgerResponse;
  initialUsage: MonthlyUsageResponse;
}) {
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

  return (
    <>
      <header className="catalog-header">
        <div>
          <p className="eyebrow">Hours Ledger foundation</p>
          <h1>Hours ledger and monthly closing</h1>
          <p>
            Internal, scope-protected view of submitted, approved, and rejected time entries with
            immutable month-end closing snapshots.
          </p>
        </div>
        <span>Period {ledger.period.key}</span>
      </header>

      {error && <p className="form-error">{error}</p>}

      <section className="catalog-panel editor-panel">
        <h2>Ledger filters</h2>
        <form className="catalog-form" onSubmit={refresh}>
          <label>
            Period
            <input
              required
              pattern="\d{4}-\d{2}"
              value={filters.period}
              onChange={(event) => setFilters({ ...filters, period: event.target.value })}
            />
          </label>
          <label>
            Client ID
            <input
              value={filters.clientId}
              onChange={(event) => setFilters({ ...filters, clientId: event.target.value })}
              placeholder="Optional"
            />
          </label>
          <div className="form-actions">
            <button type="submit" disabled={saving}>
              Refresh ledger
            </button>
          </div>
        </form>
      </section>

      <section className="catalog-panel">
        <h2>Monthly totals</h2>
        <div className="entity-meta four-up">
          {metric("Entries", ledger.totals.entries)}
          {metric("Approved", hours(ledger.totals.approvedHours))}
          {metric("Submitted", hours(ledger.totals.submittedHours))}
          {metric("Rejected", hours(ledger.totals.rejectedHours))}
          {metric("Billable", hours(ledger.totals.billableHours))}
          {metric("Non-billable", hours(ledger.totals.nonBillableHours))}
          {metric("Tracked", hours(ledger.totals.hours))}
          {metric("Clients", usage.clients.length)}
        </div>
      </section>

      <section className="catalog-panel">
        <h2>Usage summary by client</h2>
        <div className="entity-grid">
          {usage.clients.map((client) => (
            <article className="entity-card" key={client.id}>
              <div className="entity-card-heading">
                <div>
                  <span className="status-pill status-active">{client.code}</span>
                  <h3>{client.name}</h3>
                </div>
                <span>{client.sector}</span>
              </div>
              <div className="entity-meta four-up">
                {metric("Approved", hours(client.approvedHours))}
                {metric("Submitted", hours(client.submittedHours))}
                {metric("Rejected", hours(client.rejectedHours))}
                {metric("Entries", client.entries)}
              </div>
            </article>
          ))}
        </div>
        {usage.clients.length === 0 && <p>No submitted, approved, or rejected hours yet.</p>}
      </section>

      {canManageClosings && (
        <section className="catalog-panel editor-panel">
          <h2>Prepare monthly closing</h2>
          <form className="catalog-form" onSubmit={prepare}>
            <label>
              Client ID
              <input
                required
                value={closingForm.clientId}
                onChange={(event) =>
                  setClosingForm({ ...closingForm, clientId: event.target.value })
                }
              />
            </label>
            <label>
              Period
              <input
                required
                pattern="\d{4}-\d{2}"
                value={closingForm.period}
                onChange={(event) => setClosingForm({ ...closingForm, period: event.target.value })}
              />
            </label>
            <label>
              Title
              <input
                value={closingForm.title}
                onChange={(event) => setClosingForm({ ...closingForm, title: event.target.value })}
              />
            </label>
            <div className="form-actions">
              <button type="submit" disabled={saving}>
                Prepare closing draft
              </button>
            </div>
          </form>
        </section>
      )}

      {canManageClosings && (
        <section className="catalog-panel">
          <h2>Monthly closing snapshots</h2>
          <div className="entity-grid">
            {closings.map((closing) => (
              <article className="entity-card" key={closing.id}>
                <div className="entity-card-heading">
                  <div>
                    <span className={`status-pill status-${closing.status.toLowerCase()}`}>
                      {closing.status}
                    </span>
                    <h3>{closing.title}</h3>
                  </div>
                  <span>{closing.period}</span>
                </div>
                <p>
                  {closing.client.name} · {closing.client.code}
                </p>
                <div className="entity-meta four-up">
                  {metric("Approved", hours(closing.summary.totals?.approvedHours))}
                  {metric("Submitted", hours(closing.summary.totals?.submittedHours))}
                  {metric("Rejected", hours(closing.summary.totals?.rejectedHours))}
                  {metric("Entries", closing.summary.totals?.entries ?? 0)}
                </div>
                {closing.status === "DRAFT" && (
                  <div className="entity-card-actions">
                    <button type="button" disabled={saving} onClick={() => finalize(closing.id)}>
                      Finalize and lock
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
          {closings.length === 0 && <p>No monthly closing snapshots have been prepared yet.</p>}
        </section>
      )}

      <section className="catalog-panel">
        <h2>Time entries</h2>
        <div className="table-scroll">
          <table className="catalog-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Client</th>
                <th>Request</th>
                <th>Service</th>
                <th>User</th>
                <th>Status</th>
                <th>Billable</th>
                <th>Hours</th>
              </tr>
            </thead>
            <tbody>
              {ledger.entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{new Date(entry.workDate).toLocaleDateString("en-SA")}</td>
                  <td>{entry.client.name}</td>
                  <td>{entry.request.requestNumber}</td>
                  <td>{entry.service.monthlyService.nameEn}</td>
                  <td>{entry.user.displayName}</td>
                  <td>{entry.status}</td>
                  <td>{entry.billable ? "Yes" : "No"}</td>
                  <td>{hours(entry.hours)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {ledger.entries.length === 0 && <p>No ledger entries match this filter.</p>}
      </section>
    </>
  );
}
