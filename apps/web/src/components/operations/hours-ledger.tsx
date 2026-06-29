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
import {
  BentoGrid,
  EmptyState,
  MetricCard,
  PageHeader,
  SectionCard,
  SmartTable,
  StatusChip,
} from "../premium-os";

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
      <PageHeader
        eyebrow="Time and utilization"
        title="Hours ledger and monthly closing"
        description="Internal, scope-protected view of submitted, approved, and rejected time entries with immutable month-end closing snapshots."
        meta={<span>Period {ledger.period.key}</span>}
      />

      {error && <p className="form-error">{error}</p>}

      <SectionCard eyebrow="Ledger filters" title="Filter usage">
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
      </SectionCard>

      <BentoGrid>
        <MetricCard label="Entries" value={ledger.totals.entries} detail="Ledger records" accent />
        <MetricCard label="Approved" value={hours(ledger.totals.approvedHours)} detail="Approved time" />
        <MetricCard label="Submitted" value={hours(ledger.totals.submittedHours)} detail="Pending approval" />
        <MetricCard label="Rejected" value={hours(ledger.totals.rejectedHours)} detail="Rejected time" />
        <MetricCard label="Billable" value={hours(ledger.totals.billableHours)} detail="Billable time" />
        <MetricCard label="Non-billable" value={hours(ledger.totals.nonBillableHours)} detail="Non-billable time" />
        <MetricCard label="Tracked" value={hours(ledger.totals.hours)} detail="All tracked hours" />
        <MetricCard label="Clients" value={usage.clients.length} detail="Included clients" />
      </BentoGrid>

      <SectionCard title="Usage summary by client">
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
        {usage.clients.length === 0 && <EmptyState>No submitted, approved, or rejected hours yet.</EmptyState>}
      </SectionCard>

      {canManageClosings && (
        <SectionCard eyebrow="Closing workflow" title="Prepare monthly closing">
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
        </SectionCard>
      )}

      {canManageClosings && (
        <SectionCard title="Monthly closing snapshots">
          <div className="entity-grid">
            {closings.map((closing) => (
              <article className="entity-card" key={closing.id}>
                <div className="entity-card-heading">
                  <div>
                    <StatusChip status={closing.status} />
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
          {closings.length === 0 && <EmptyState>No monthly closing snapshots have been prepared yet.</EmptyState>}
        </SectionCard>
      )}

      <SectionCard title="Time entries">
        <SmartTable>
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
        </SmartTable>
        {ledger.entries.length === 0 && <EmptyState>No ledger entries match this filter.</EmptyState>}
      </SectionCard>
    </>
  );
}
