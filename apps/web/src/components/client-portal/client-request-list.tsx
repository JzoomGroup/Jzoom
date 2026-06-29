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
import {
  BentoGrid,
  EmptyState,
  MetricCard,
  PageHeader,
  PriorityChip,
  SectionCard,
  StatusChip,
} from "../premium-os";

const priorities = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

function displayDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString("en-SA") : "Not set";
}

function optional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function serviceLabel(service: ClientPortalSubscribedMonthlyService): string {
  return `${service.service.nameEn} - ${service.serviceLevel.labelEn ?? service.serviceLevel.code}`;
}

function priorityLabel(priority: (typeof priorities)[number]): string {
  switch (priority) {
    case "LOW":
      return "Low";
    case "HIGH":
      return "High";
    case "URGENT":
      return "Urgent";
    case "NORMAL":
    default:
      return "Normal";
  }
}

function openRequestCount(requests: RequestSummary[], subscriptionServiceId: string): number {
  return requests.filter(
    (request) =>
      request.service.subscriptionServiceId === subscriptionServiceId &&
      !["COMPLETED", "CLOSED", "REJECTED"].includes(request.status),
  ).length;
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
  const selectedClient =
    account.clients.find((client) => client.id === form.clientId) ?? account.clients[0] ?? null;
  const selectedServiceItem =
    selectedService?.serviceItems.find((item) => item.id === form.serviceItemRevisionId) ?? null;
  const selectedServiceItems = selectedService?.serviceItems ?? [];
  const selectedServiceOpenRequests = selectedService
    ? openRequestCount(items, selectedService.id)
    : 0;
  const templateRequiredFields =
    activeTemplate?.fields.filter((field) => field.required).length ?? 0;
  const templateOptionalFields = activeTemplate
    ? activeTemplate.fields.length - templateRequiredFields
    : 0;
  const openRequests = items.filter(
    (request) => !["COMPLETED", "CLOSED", "REJECTED"].includes(request.status),
  ).length;
  const waitingClientRequests = items.filter((request) => request.status === "WAITING_CLIENT").length;

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
      <PageHeader
        eyebrow="Client service center"
        title="Requests"
        description="Create, track, and review service requests tied to your active subscriptions."
      />

      <BentoGrid compact>
        <MetricCard accent label="Open requests" value={openRequests} detail="Still active" />
        <MetricCard label="Waiting for you" value={waitingClientRequests} detail="Client action needed" />
        <MetricCard label="Subscribed services" value={services.length} detail="Available for intake" />
        <MetricCard
          label="Selected service"
          value={selectedService ? selectedService.hoursAllocated : 0}
          detail="Monthly hours"
        />
      </BentoGrid>

      <SectionCard
        eyebrow="Request intake"
        title="Create request"
        description="Select a subscribed service, choose the exact work item, and complete any dynamic template questions."
      >
        {services.length === 0 ? (
          <EmptyState title="No subscribed services">
            No active subscribed services are available for request creation yet.
          </EmptyState>
        ) : (
          <form className="catalog-form wide-form" onSubmit={submit}>
            <div className="pricing-total-grid form-span">
              <div>
                <span>Client</span>
                <strong>{selectedClient?.code ?? "Client"}</strong>
              </div>
              <div>
                <span>Monthly hours</span>
                <strong>{selectedService?.hoursAllocated ?? 0}</strong>
              </div>
              <div>
                <span>Open on service</span>
                <strong>{selectedServiceOpenRequests}</strong>
              </div>
              <div>
                <span>Included service items</span>
                <strong>{selectedServiceItems.length}</strong>
              </div>
              <div className="primary">
                <span>Template fields</span>
                <strong>{activeTemplate ? activeTemplate.fields.length : "Auto"}</strong>
              </div>
            </div>

            <div className="activity-list form-span">
              <article>
                <strong>Request setup</strong>
                <small>Step 1 of 3 - choose the subscribed service and the exact work item.</small>
                <p>
                  Pick the service closest to your need. Jzoom will route the request to the right
                  team and show any item-specific questions automatically.
                </p>
              </article>
              {selectedService && (
                <article>
                  <strong>Selected service summary</strong>
                  <small>
                    {serviceLabel(selectedService)} - {selectedService.client.name}
                  </small>
                  <p>{selectedService.service.description}</p>
                  <div className="hours-strip">
                    <span>{selectedService.service.category.nameEn}</span>
                    <span>{selectedService.service.domain}</span>
                    <span>{selectedService.hoursAllocated} monthly hours</span>
                  </div>
                </article>
              )}
            </div>

            <label>
              Service
              <select
                required
                value={form.subscriptionServiceId}
                onChange={(event) => selectService(event.target.value)}
              >
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {serviceLabel(service)} - {service.client.code} - {service.hoursAllocated}h
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
                <option value="">General service request - no specific item</option>
                {selectedServiceItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nameEn}
                    {item.expectedOutput ? ` - ${item.expectedOutput}` : ""}
                  </option>
                ))}
              </select>
            </label>
            {selectedServiceItem ? (
              <p className="catalog-feedback success form-span">
                Expected output: {selectedServiceItem.expectedOutput ?? selectedServiceItem.nameEn}
                {selectedServiceItem.requiresFile ? " - attachment details may be required." : ""}
              </p>
            ) : (
              <p className="catalog-feedback success form-span">
                General requests are routed to Jzoom for triage when the work does not match a
                specific service item.
              </p>
            )}

            <div className="activity-list form-span">
              <article>
                <strong>Request details</strong>
                <small>Step 2 of 3 - describe what you need in plain language.</small>
                <p>
                  Use a clear title and include the business context, deadline, and any important
                  notes. You can add files later if Jzoom requests them.
                </p>
              </article>
            </div>
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
                    {priorityLabel(priority)}
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
              <summary>Optional commercial reference</summary>
              <div className="catalog-form wide-form">
                <label>
                  Quote reference ID
                  <input
                    value={form.sourceQuoteId}
                    onChange={(event) => setForm({ ...form, sourceQuoteId: event.target.value })}
                  />
                </label>
                <label>
                  Invoice reference ID
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
            {activeTemplate && (
              <div className="pricing-total-grid form-span">
                <div>
                  <span>Template version</span>
                  <strong>v{activeTemplate.version}</strong>
                </div>
                <div>
                  <span>Required fields</span>
                  <strong>{templateRequiredFields}</strong>
                </div>
                <div>
                  <span>Optional fields</span>
                  <strong>{templateOptionalFields}</strong>
                </div>
                <div>
                  <span>Documents</span>
                  <strong>{activeTemplate.documentChecklist.length}</strong>
                </div>
                <div className="primary">
                  <span>Files</span>
                  <strong>{activeTemplate.downloadableFiles.length}</strong>
                </div>
              </div>
            )}
            <RequestTemplateFields
              template={activeTemplate}
              values={templateAnswers}
              onChange={setTemplateAnswer}
            />
            {error && <p className="form-error form-span">{error}</p>}
            <button
              className="os-button os-button-primary"
              type="submit"
              disabled={saving || loadingTemplate || !form.subscriptionServiceId}
            >
              {saving ? "Creating..." : "Submit request to Jzoom"}
            </button>
          </form>
        )}
      </SectionCard>

      <SectionCard
        eyebrow="Request library"
        title="Visible requests"
        description="Every row keeps the original request detail route and workflow actions available."
      >
        {items.length === 0 ? (
          <EmptyState title="No visible requests">
            No requests are currently visible for this account.
          </EmptyState>
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
                    <StatusChip status={request.status} label={request.status} />
                    <PriorityChip priority={request.priority} />
                    <small>Due {displayDate(request.dueAt)}</small>
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
