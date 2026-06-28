"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import {
  RequestTemplateFields,
  type TemplateAnswerState,
} from "../request-templates/request-template-fields";
import { createClientServiceRequest, requestErrorMessage } from "../../lib/request-client";
import { answersForTemplate, fetchActiveRequestTemplate } from "../../lib/request-templates-client";
import type {
  ClientPortalAccount,
  ClientPortalSubscribedMonthlyService,
} from "../../lib/client-portal-types";
import type { RequestTemplateVersion, TemplateAnswerValue } from "../../lib/request-template-types";
import type { RequestSummary } from "../../lib/request-types";

const priorities = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

function displayDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString("en-SA") : "Not set";
}

function optional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function serviceLabel(service: ClientPortalSubscribedMonthlyService): string {
  return `${service.service.nameEn} / ${service.serviceLevel.labelEn ?? service.serviceLevel.code}`;
}

export function ClientRequestList({
  account,
  requests,
}: {
  account: ClientPortalAccount;
  requests: RequestSummary[];
}) {
  const router = useRouter();
  const services = account.services.subscribedMonthly;
  const defaultService = services[0];
  const [items, setItems] = useState(requests);
  const [saving, setSaving] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templateNotice, setTemplateNotice] = useState<string | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<RequestTemplateVersion | null>(null);
  const [templateAnswers, setTemplateAnswers] = useState<TemplateAnswerState>({});
  const [form, setForm] = useState({
    clientId: defaultService?.clientId ?? account.clients[0]?.id ?? "",
    subscriptionServiceId: defaultService?.id ?? "",
    serviceItemRevisionId: "",
    sourceQuoteId: "",
    sourceInvoiceId: "",
    title: "",
    description: "",
    priority: "NORMAL" as (typeof priorities)[number],
    dueAt: "",
  });
  const selectedService =
    services.find((service) => service.id === form.subscriptionServiceId) ?? null;

  async function loadTemplate(serviceItemRevisionId = form.serviceItemRevisionId) {
    const selectedServiceItemRevisionId = optional(serviceItemRevisionId);
    if (!selectedServiceItemRevisionId) {
      setTemplateNotice("General service request selected. The generic request form will be used.");
      setActiveTemplate(null);
      setTemplateAnswers({});
      return;
    }
    setLoadingTemplate(true);
    setError(null);
    try {
      const response = await fetchActiveRequestTemplate(selectedServiceItemRevisionId);
      setActiveTemplate(response.template);
      setTemplateAnswers({});
      setTemplateNotice(
        response.template
          ? `Loaded template v${response.template.version} for ${response.serviceItemRevision.nameEn}.`
          : "No active template exists. The generic request form will be used.",
      );
    } catch (caught) {
      setError(requestErrorMessage(caught));
      setActiveTemplate(null);
    } finally {
      setLoadingTemplate(false);
    }
  }

  function selectService(subscriptionServiceId: string) {
    const service = services.find((candidate) => candidate.id === subscriptionServiceId);
    setForm((current) => ({
      ...current,
      clientId: service?.clientId ?? current.clientId,
      subscriptionServiceId,
      serviceItemRevisionId: "",
    }));
    setActiveTemplate(null);
    setTemplateAnswers({});
    setTemplateNotice(null);
  }

  function selectServiceItem(serviceItemRevisionId: string) {
    setForm((current) => ({ ...current, serviceItemRevisionId }));
    void loadTemplate(serviceItemRevisionId);
  }

  function setTemplateAnswer(code: string, value: TemplateAnswerValue) {
    setTemplateAnswers((current) => ({ ...current, [code]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: Parameters<typeof createClientServiceRequest>[0] = {
        clientId: form.clientId,
        subscriptionServiceId: form.subscriptionServiceId,
        title: form.title,
        description: form.description,
        priority: form.priority,
      };
      const serviceItemRevisionId = optional(form.serviceItemRevisionId);
      const sourceQuoteId = optional(form.sourceQuoteId);
      const sourceInvoiceId = optional(form.sourceInvoiceId);
      if (serviceItemRevisionId) payload.serviceItemRevisionId = serviceItemRevisionId;
      if (sourceQuoteId) payload.sourceQuoteId = sourceQuoteId;
      if (sourceInvoiceId) payload.sourceInvoiceId = sourceInvoiceId;
      if (form.dueAt) payload.dueAt = new Date(form.dueAt).toISOString();
      if (activeTemplate) {
        payload.requestTemplateVersionId = activeTemplate.id;
        payload.templateAnswers = answersForTemplate(activeTemplate, templateAnswers);
      }
      const created = await createClientServiceRequest(payload);
      setItems((current) => [created, ...current]);
      router.push(`/client/requests/${created.id}`);
    } catch (caught) {
      setError(requestErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <header className="catalog-header">
        <div>
          <p className="eyebrow">Client portal</p>
          <h1>Requests</h1>
          <p>Track your onboarded service requests and client-visible comments.</p>
        </div>
      </header>

      <section className="catalog-panel editor-panel">
        <h2>Create request</h2>
        <p>
          Select one of your subscribed services, choose the service item, then complete the related
          request details. If the item has an active template, it loads automatically.
        </p>
        {services.length === 0 ? (
          <div className="catalog-empty">
            No active subscribed services are available for request creation yet.
          </div>
        ) : (
          <form className="catalog-form wide-form" onSubmit={submit}>
            <label>
              Service
              <select
                required
                value={form.subscriptionServiceId}
                onChange={(event) => selectService(event.target.value)}
              >
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {serviceLabel(service)} / {service.client.code} / {service.hoursAllocated}h
                  </option>
                ))}
              </select>
            </label>
            <label>
              Service item
              <select
                value={form.serviceItemRevisionId}
                onChange={(event) => selectServiceItem(event.target.value)}
              >
                <option value="">General service request</option>
                {selectedService?.serviceItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nameEn}
                  </option>
                ))}
              </select>
            </label>
            {selectedService?.service.description && (
              <p className="catalog-feedback success form-span">
                {selectedService.service.description}
              </p>
            )}
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
            <details className="form-span">
              <summary>Link to quote or invoice</summary>
              <div className="catalog-form wide-form">
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
              </div>
            </details>
            <label className="form-span">
              Description
              <textarea
                required
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </label>
            {loadingTemplate && (
              <p className="catalog-feedback success form-span">Loading request template...</p>
            )}
            {templateNotice && (
              <p className="catalog-feedback success form-span">{templateNotice}</p>
            )}
            <RequestTemplateFields
              template={activeTemplate}
              values={templateAnswers}
              onChange={setTemplateAnswer}
            />
            {error && <p className="form-error form-span">{error}</p>}
            <button className="button-primary" type="submit" disabled={saving || loadingTemplate}>
              {saving ? "Creating..." : "Create request"}
            </button>
          </form>
        )}
      </section>

      <section className="catalog-panel">
        {items.length === 0 ? (
          <div className="catalog-empty">No requests are currently visible for this account.</div>
        ) : (
          <div className="quote-list-grid">
            {items.map((request) => (
              <article className="quote-list-card" key={request.id}>
                <Link className="quote-list-main" href={`/client/requests/${request.id}`}>
                  <div>
                    <small>{request.requestNumber}</small>
                    <h2>{request.title}</h2>
                    <p>{request.service.monthlyService.nameEn}</p>
                  </div>
                  <div className="quote-list-meta">
                    <span className={`status-badge status-${request.status.toLowerCase()}`}>
                      {request.status}
                    </span>
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
