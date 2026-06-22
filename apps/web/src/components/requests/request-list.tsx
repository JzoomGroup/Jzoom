"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { createServiceRequest, requestErrorMessage } from "../../lib/request-client";
import type { RequestSummary } from "../../lib/request-types";

const priorities = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

function displayDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString("en-SA") : "Not set";
}

function optional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function RequestList({ requests }: { requests: RequestSummary[] }) {
  const router = useRouter();
  const [items, setItems] = useState(requests);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    clientId: "",
    subscriptionServiceId: "",
    serviceItemRevisionId: "",
    sourceQuoteId: "",
    sourceInvoiceId: "",
    assignedSpecialistId: "",
    assignedSupervisorId: "",
    accountManagerId: "",
    title: "",
    description: "",
    priority: "NORMAL" as (typeof priorities)[number],
    dueAt: "",
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const payload: Parameters<typeof createServiceRequest>[0] = {
        clientId: form.clientId,
        subscriptionServiceId: form.subscriptionServiceId,
        title: form.title,
        description: form.description,
        priority: form.priority,
      };
      const serviceItemRevisionId = optional(form.serviceItemRevisionId);
      const sourceQuoteId = optional(form.sourceQuoteId);
      const sourceInvoiceId = optional(form.sourceInvoiceId);
      const assignedSpecialistId = optional(form.assignedSpecialistId);
      const assignedSupervisorId = optional(form.assignedSupervisorId);
      const accountManagerId = optional(form.accountManagerId);
      if (serviceItemRevisionId) payload.serviceItemRevisionId = serviceItemRevisionId;
      if (sourceQuoteId) payload.sourceQuoteId = sourceQuoteId;
      if (sourceInvoiceId) payload.sourceInvoiceId = sourceInvoiceId;
      if (assignedSpecialistId) payload.assignedSpecialistId = assignedSpecialistId;
      if (assignedSupervisorId) payload.assignedSupervisorId = assignedSupervisorId;
      if (accountManagerId) payload.accountManagerId = accountManagerId;
      if (form.dueAt) payload.dueAt = new Date(form.dueAt).toISOString();
      const created = await createServiceRequest(payload);
      setItems((current) => [created, ...current]);
      router.push(`/requests/${created.id}`);
    } catch (caught) {
      setError(requestErrorMessage(caught));
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <header className="catalog-header">
        <div>
          <p className="eyebrow">Request lifecycle foundation</p>
          <h1>Service requests</h1>
          <p>
            Create and triage service requests for onboarded active clients. Client users only see
            their own request-safe view after account creation.
          </p>
        </div>
      </header>

      <section className="catalog-panel editor-panel">
        <h2>Create request</h2>
        <p>
          Foundation form: paste the active client and subscription service IDs from the operating
          records. Rich pickers can be layered on later without changing the backend contract.
        </p>
        <form className="catalog-form wide-form" onSubmit={submit}>
          <label>
            Client ID
            <input
              required
              value={form.clientId}
              onChange={(event) => setForm({ ...form, clientId: event.target.value })}
            />
          </label>
          <label>
            Subscription service ID
            <input
              required
              value={form.subscriptionServiceId}
              onChange={(event) => setForm({ ...form, subscriptionServiceId: event.target.value })}
            />
          </label>
          <label>
            Service item revision ID
            <input
              value={form.serviceItemRevisionId}
              onChange={(event) => setForm({ ...form, serviceItemRevisionId: event.target.value })}
            />
          </label>
          <label>
            Source quote ID
            <input
              value={form.sourceQuoteId}
              onChange={(event) => setForm({ ...form, sourceQuoteId: event.target.value })}
            />
          </label>
          <label>
            Source invoice ID
            <input
              value={form.sourceInvoiceId}
              onChange={(event) => setForm({ ...form, sourceInvoiceId: event.target.value })}
            />
          </label>
          <label>
            Specialist ID
            <input
              value={form.assignedSpecialistId}
              onChange={(event) => setForm({ ...form, assignedSpecialistId: event.target.value })}
            />
          </label>
          <label>
            Supervisor ID
            <input
              value={form.assignedSupervisorId}
              onChange={(event) => setForm({ ...form, assignedSupervisorId: event.target.value })}
            />
          </label>
          <label>
            Account manager ID
            <input
              value={form.accountManagerId}
              onChange={(event) => setForm({ ...form, accountManagerId: event.target.value })}
            />
          </label>
          <label>
            Title
            <input
              required
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </label>
          <label>
            Priority
            <select
              value={form.priority}
              onChange={(event) =>
                setForm({ ...form, priority: event.target.value as typeof form.priority })
              }
            >
              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>
          <label>
            Due at
            <input
              type="datetime-local"
              value={form.dueAt}
              onChange={(event) => setForm({ ...form, dueAt: event.target.value })}
            />
          </label>
          <label className="form-span">
            Description
            <textarea
              required
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </label>
          {error && <p className="form-error form-span">{error}</p>}
          <button className="button-primary" type="submit" disabled={creating}>
            {creating ? "Creating..." : "Create request"}
          </button>
        </form>
      </section>

      <section className="catalog-panel">
        {items.length === 0 ? (
          <div className="catalog-empty">No service requests have been created yet.</div>
        ) : (
          <div className="quote-list-grid">
            {items.map((request) => (
              <article className="quote-list-card" key={request.id}>
                <Link className="quote-list-main" href={`/requests/${request.id}`}>
                  <div>
                    <small>{request.requestNumber}</small>
                    <h2>{request.title}</h2>
                    <p>
                      {request.client.name} · {request.service.monthlyService.nameEn}
                    </p>
                  </div>
                  <div className="quote-list-meta">
                    <span className={`status-badge status-${request.status.toLowerCase()}`}>
                      {request.status}
                    </span>
                    <small>{request.priority}</small>
                    <small>Due {displayDate(request.dueAt)}</small>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
