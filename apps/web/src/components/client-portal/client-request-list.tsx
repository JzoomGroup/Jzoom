"use client";

import { clientRequestListCopy as copy } from "../../i18n/dictionaries/client-portal";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  RequestTemplateFields,
  type TemplateAnswerState,
  type TemplateFileState,
} from "../request-templates/request-template-fields";
import {
  createClientServiceRequest,
  requestErrorMessage,
  uploadRequestAttachment,
} from "../../lib/request-client";
import { answersForTemplate, fetchActiveRequestTemplate } from "../../lib/request-templates-client";
import type {
  ClientPortalAccount,
  ClientPortalSubscribedMonthlyService,
} from "../../lib/client-portal-types";
import type { RequestTemplateVersion, TemplateAnswerValue } from "../../lib/request-template-types";
import type { RequestStatus, RequestSummary } from "../../lib/request-types";
import { EmptyState, PageHeader, PriorityChip, SectionCard, StatusChip } from "../premium-os";
import {
  clientDate,
  clientLabel,
  clientLocale,
  clientName,
  clientNumber,
  localizedExpectedOutput,
  localizedFreeText,
  priorityLabel,
  requestStatusLabel,
  type ClientDisplayLocale,
} from "./client-format";

const priorities = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
const requestStatuses: RequestStatus[] = [
  "NEW",
  "TRIAGE",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_CLIENT",
  "WAITING_SUPERVISOR",
  "COMPLETED",
  "CLOSED",
  "RETURNED",
  "REJECTED",
];

function optional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function serviceLabel(
  service: ClientPortalSubscribedMonthlyService,
  locale: ClientDisplayLocale,
): string {
  return `${clientName(service.service, locale)} - ${clientLabel(service.serviceLevel, locale)}`;
}

function requestNextStep(request: RequestSummary, t: (typeof copy)[ClientDisplayLocale]): string {
  if (request.status === "WAITING_CLIENT") return t.uploadDocuments;
  if (request.counts.outputs > 0 && ["COMPLETED", "CLOSED"].includes(request.status)) {
    return t.reviewOutputs;
  }
  if (["NEW", "TRIAGE", "ASSIGNED", "IN_PROGRESS", "WAITING_SUPERVISOR"].includes(request.status)) {
    return t.workUnderway;
  }
  if (request.status === "RETURNED") return t.workUnderway;
  if (request.status === "REJECTED") return t.noAction;
  return t.trackProgress;
}

export function ClientRequestList({
  account,
  locale: localeInput,
  requests,
}: {
  account: ClientPortalAccount;
  locale?: string;
  requests: RequestSummary[];
}) {
  const router = useRouter();
  const locale = clientLocale(localeInput ?? account.user.preferredLocale);
  const t = copy[locale];
  const services = account.services.subscribedMonthly;
  const defaultService = services[0];
  const [items, setItems] = useState(requests);
  const [saving, setSaving] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templateNotice, setTemplateNotice] = useState<string | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<RequestTemplateVersion | null>(null);
  const [templateAnswers, setTemplateAnswers] = useState<TemplateAnswerState>({});
  const [templateFiles, setTemplateFiles] = useState<TemplateFileState>({});
  const [form, setForm] = useState({
    clientId: defaultService?.clientId ?? account.clients[0]?.id ?? "",
    subscriptionServiceId: defaultService?.id ?? "",
    serviceItemRevisionId: "",
    title: "",
    description: "",
    priority: "NORMAL" as (typeof priorities)[number],
    dueAt: "",
  });
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "">("");
  const [serviceFilter, setServiceFilter] = useState("");
  const draftKey = `jzoom.client.requestDraft.${account.user.id}`;
  const selectedService =
    services.find((service) => service.id === form.subscriptionServiceId) ?? null;
  const selectedServiceItem =
    selectedService?.serviceItems.find((item) => item.id === form.serviceItemRevisionId) ?? null;
  const selectedServiceItems = selectedService?.serviceItems ?? [];
  const templateRequiredFields =
    activeTemplate?.fields.filter((field) => field.required).length ?? 0;
  const templateOptionalFields = activeTemplate
    ? activeTemplate.fields.length - templateRequiredFields
    : 0;
  const requestServiceOptions = useMemo(
    () =>
      Array.from(
        new Map(
          items.map((request) => [
            request.service.monthlyService.id,
            clientName(request.service.monthlyService, locale),
          ]),
        ),
      ),
    [items, locale],
  );
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((request) => {
      const serviceName = clientName(request.service.monthlyService, locale);
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [
          request.requestNumber,
          request.title,
          request.description,
          serviceName,
          request.service.monthlyService.code,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesStatus = !statusFilter || request.status === statusFilter;
      const matchesService = !serviceFilter || request.service.monthlyService.id === serviceFilter;
      return matchesQuery && matchesStatus && matchesService;
    });
  }, [items, locale, query, serviceFilter, statusFilter]);

  useEffect(() => {
    const savedDraft = window.localStorage.getItem(draftKey);
    if (!savedDraft) return;
    try {
      const parsed = JSON.parse(savedDraft) as {
        form?: Partial<typeof form>;
        templateAnswers?: TemplateAnswerState;
      };
      if (parsed.form) {
        setForm((current) => ({ ...current, ...parsed.form }));
      }
      if (parsed.templateAnswers) {
        setTemplateAnswers(parsed.templateAnswers);
      }
      setTemplateNotice(t.draftLoaded);
    } catch {
      window.localStorage.removeItem(draftKey);
    }
  }, [draftKey]);

  async function loadTemplate(serviceItemRevisionId = form.serviceItemRevisionId) {
    const selectedServiceItemRevisionId = optional(serviceItemRevisionId);
    if (!selectedServiceItemRevisionId) {
      setTemplateNotice(t.generalTemplateNotice);
      setActiveTemplate(null);
      setTemplateAnswers({});
      setTemplateFiles({});
      return;
    }
    setLoadingTemplate(true);
    setError(null);
    try {
      const response = await fetchActiveRequestTemplate(selectedServiceItemRevisionId);
      setActiveTemplate(response.template);
      setTemplateAnswers({});
      setTemplateFiles({});
      setTemplateNotice(
        response.template
          ? t.templateLoaded(
              response.template.version,
              clientName(response.serviceItemRevision, locale),
            )
          : t.templateMissing,
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
    setTemplateFiles({});
    setTemplateNotice(null);
  }

  function selectServiceItem(serviceItemRevisionId: string) {
    setForm((current) => ({ ...current, serviceItemRevisionId }));
    void loadTemplate(serviceItemRevisionId);
  }

  function setTemplateAnswer(code: string, value: TemplateAnswerValue) {
    setTemplateAnswers((current) => ({ ...current, [code]: value }));
  }

  function saveDraft() {
    window.localStorage.setItem(
      draftKey,
      JSON.stringify({
        form,
        templateAnswers,
        savedAt: new Date().toISOString(),
      }),
    );
    setTemplateNotice(t.draftSaved);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (
      !form.clientId ||
      !form.subscriptionServiceId ||
      !form.title.trim() ||
      !form.description.trim()
    ) {
      setError(t.completeRequiredFields);
      return;
    }
    const dueAt = form.dueAt ? new Date(form.dueAt) : null;
    if (dueAt && Number.isNaN(dueAt.getTime())) {
      setError(t.invalidDueAt);
      return;
    }
    setSaving(true);
    try {
      const payload: Parameters<typeof createClientServiceRequest>[0] = {
        clientId: form.clientId,
        subscriptionServiceId: form.subscriptionServiceId,
        title: form.title,
        description: form.description,
        priority: form.priority,
      };
      const serviceItemRevisionId = optional(form.serviceItemRevisionId);
      if (serviceItemRevisionId) payload.serviceItemRevisionId = serviceItemRevisionId;
      if (dueAt) payload.dueAt = dueAt.toISOString();
      if (activeTemplate) {
        payload.requestTemplateVersionId = activeTemplate.id;
        payload.templateAnswers = answersForTemplate(activeTemplate, templateAnswers);
      }
      const created = await createClientServiceRequest(payload);
      window.localStorage.removeItem(draftKey);
      setItems((current) => [created, ...current]);
      try {
        for (const file of Object.values(templateFiles).flat()) {
          await uploadRequestAttachment(created.id, file, "CLIENT_VISIBLE");
        }
      } catch {
        setError(
          locale === "ar"
            ? "تم إنشاء الطلب، لكن تعذر رفع بعض الملفات. افتح الطلب وأعد رفعها من قسم المستندات."
            : "The request was created, but some files could not be uploaded. Open it and upload them again.",
        );
        return;
      }
      router.push(`/client/requests/${created.id}`);
    } catch (caught) {
      setError(requestErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow={t.clientServiceCenter} title={t.requests} description={t.serviceIntro} />

      <SectionCard
        eyebrow={t.requestIntake}
        title={t.createRequest}
        description={t.serviceDescription}
      >
        {services.length === 0 ? (
          <EmptyState title={t.noSubscribedServices}>{t.activeSubscribedEmpty}</EmptyState>
        ) : (
          <form className="catalog-form wide-form client-request-form" noValidate onSubmit={submit}>
            <section className="request-intake-panel form-span">
              <div className="request-panel-heading">
                <span>01</span>
                <div>
                  <h3>{t.requestSetup}</h3>
                  <p>{t.serviceDescription}</p>
                </div>
              </div>
              <div className="request-field-grid">
                <label>
                  {t.service}
                  <select
                    required
                    value={form.subscriptionServiceId}
                    onChange={(event) => selectService(event.target.value)}
                  >
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {serviceLabel(service, locale)} - {service.client.code} -{" "}
                        {clientNumber(service.hoursAllocated, locale)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t.exactItem}
                  <select
                    value={form.serviceItemRevisionId}
                    onChange={(event) => selectServiceItem(event.target.value)}
                  >
                    <option value="">{t.generalItem}</option>
                    {selectedServiceItems.map((item) => {
                      const itemName = clientName(item, locale);
                      const expectedOutput = localizedExpectedOutput({
                        fallbackName: itemName,
                        locale,
                        value: item.expectedOutput,
                      });
                      return (
                        <option key={item.id} value={item.id}>
                          {itemName}
                          {expectedOutput && expectedOutput !== itemName
                            ? ` - ${expectedOutput}`
                            : ""}
                        </option>
                      );
                    })}
                  </select>
                </label>
              </div>
              {selectedServiceItem ? (
                <p className="catalog-feedback success">
                  {t.expectedOutput}:{" "}
                  {localizedExpectedOutput({
                    fallbackName: clientName(selectedServiceItem, locale),
                    locale,
                    value: selectedServiceItem.expectedOutput,
                  })}
                  {selectedServiceItem.requiresFile ? ` - ${t.itemAttachmentHint}` : ""}
                </p>
              ) : (
                <p className="catalog-feedback success">{t.generalItemNotice}</p>
              )}
            </section>

            <section className="request-intake-panel request-details-panel form-span">
              <div className="request-panel-heading">
                <span>02</span>
                <div>
                  <h3>{t.requestDetails}</h3>
                  <p>{t.descriptionHelp}</p>
                </div>
              </div>
              <div className="request-field-grid request-field-grid-three">
                <label>
                  {t.title}
                  <input
                    required
                    value={form.title}
                    onChange={(event) => setForm({ ...form, title: event.target.value })}
                  />
                </label>
                <label>
                  {t.priority}
                  <select
                    value={form.priority}
                    onChange={(event) =>
                      setForm({ ...form, priority: event.target.value as typeof form.priority })
                    }
                  >
                    {priorities.map((priority) => (
                      <option key={priority} value={priority}>
                        {priorityLabel(priority, locale)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t.dueAt}
                  <input
                    type="datetime-local"
                    value={form.dueAt}
                    onChange={(event) => setForm({ ...form, dueAt: event.target.value })}
                  />
                </label>
              </div>
              <label>
                {t.description}
                <textarea
                  required
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                />
              </label>
            </section>

            {(loadingTemplate || templateNotice || activeTemplate) && (
              <section className="request-intake-panel request-template-summary form-span">
                <div className="request-panel-heading">
                  <span>03</span>
                  <div>
                    <h3>{t.templateFields}</h3>
                    <p>
                      {activeTemplate
                        ? t.templateLoaded(activeTemplate.version, t.exactItem)
                        : t.auto}
                    </p>
                  </div>
                </div>
                {loadingTemplate && <p className="catalog-feedback success">{t.loadingTemplate}</p>}
                {templateNotice && <p className="catalog-feedback success">{templateNotice}</p>}
                {activeTemplate && (
                  <div className="pricing-total-grid">
                    <div>
                      <span>{t.templateVersion}</span>
                      <strong>v{activeTemplate.version}</strong>
                    </div>
                    <div>
                      <span>{t.requiredFields}</span>
                      <strong>{clientNumber(templateRequiredFields, locale)}</strong>
                    </div>
                    <div>
                      <span>{t.optionalFields}</span>
                      <strong>{clientNumber(templateOptionalFields, locale)}</strong>
                    </div>
                    <div>
                      <span>{t.requiredDocuments}</span>
                      <strong>
                        {clientNumber(activeTemplate.documentChecklist.length, locale)}
                      </strong>
                    </div>
                    <div className="primary">
                      <span>{t.files}</span>
                      <strong>
                        {clientNumber(activeTemplate.downloadableFiles.length, locale)}
                      </strong>
                    </div>
                  </div>
                )}
              </section>
            )}
            <RequestTemplateFields
              locale={locale}
              template={activeTemplate}
              values={templateAnswers}
              onChange={setTemplateAnswer}
              onFilesChange={(code, files) =>
                setTemplateFiles((current) => ({ ...current, [code]: files }))
              }
            />
            {error && <p className="form-error form-span">{error}</p>}
            <div className="request-review-bar form-span">
              <div>
                <span>{t.review}</span>
                <strong>{form.title.trim() || t.requestDetails}</strong>
                <small>
                  {selectedService ? serviceLabel(selectedService, locale) : t.selectedService}
                </small>
              </div>
              <div className="form-actions">
                <button
                  className="os-button os-button-secondary"
                  type="button"
                  disabled={!form.subscriptionServiceId}
                  onClick={saveDraft}
                >
                  {t.saveDraft}
                </button>
                <button
                  className="os-button os-button-primary"
                  type="submit"
                  disabled={saving || loadingTemplate || !form.subscriptionServiceId}
                >
                  {saving ? t.creating : t.submit}
                </button>
              </div>
            </div>
          </form>
        )}
      </SectionCard>

      <SectionCard
        eyebrow={t.requestLibrary}
        title={t.visibleRequests}
        description={t.trackDescription}
      >
        {items.length === 0 ? (
          <EmptyState title={t.noRequests}>{t.noRequestsBody}</EmptyState>
        ) : (
          <>
            <div className="request-filter-bar">
              <input
                aria-label={t.searchPlaceholder}
                placeholder={t.searchPlaceholder}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <select
                aria-label={t.allStatuses}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as RequestStatus | "")}
              >
                <option value="">{t.allStatuses}</option>
                {requestStatuses.map((status) => (
                  <option key={status} value={status}>
                    {requestStatusLabel(status, locale)}
                  </option>
                ))}
              </select>
              <select
                aria-label={t.allServices}
                value={serviceFilter}
                onChange={(event) => setServiceFilter(event.target.value)}
              >
                <option value="">{t.allServices}</option>
                {requestServiceOptions.map(([serviceId, serviceName]) => (
                  <option key={serviceId} value={serviceId}>
                    {serviceName}
                  </option>
                ))}
              </select>
              <button
                className="os-button os-button-secondary"
                type="button"
                onClick={() => {
                  setQuery("");
                  setStatusFilter("");
                  setServiceFilter("");
                }}
              >
                {t.clearFilters}
              </button>
            </div>
            {filteredItems.length === 0 ? (
              <EmptyState title={t.noFilteredRequests}>{t.noFilteredRequestsBody}</EmptyState>
            ) : (
              <div className="client-request-list">
                {filteredItems.map((request) => (
                  <article className="quote-list-card client-request-list-card" key={request.id}>
                    <Link className="quote-list-main" href={`/client/requests/${request.id}`}>
                      <div className="client-request-card-body">
                        <small>{request.requestNumber}</small>
                        <h2>{localizedFreeText(request.title, locale, t.requestDetails)}</h2>
                        <p>{clientName(request.service.monthlyService, locale)}</p>
                        <dl className="commercial-card-meta">
                          <div>
                            <dt>{t.requestNextStep}</dt>
                            <dd>{requestNextStep(request, t)}</dd>
                          </div>
                          <div>
                            <dt>{t.requestUpdated}</dt>
                            <dd>{clientDate(request.updatedAt, locale)}</dd>
                          </div>
                        </dl>
                      </div>
                      <div className="quote-list-meta">
                        <StatusChip
                          status={request.status}
                          label={requestStatusLabel(request.status, locale)}
                        />
                        <PriorityChip
                          priority={request.priority}
                          label={priorityLabel(request.priority, locale)}
                        />
                        <small>
                          {t.due} {clientDate(request.dueAt, locale)}
                        </small>
                      </div>
                    </Link>
                    <div className="client-request-card-stats" aria-label={t.requestStats}>
                      <span>
                        <small>{t.documents}</small>
                        <strong>{clientNumber(request.counts.documentRequests, locale)}</strong>
                      </span>
                      <span>
                        <small>{t.deliverables}</small>
                        <strong>{clientNumber(request.counts.outputs, locale)}</strong>
                      </span>
                      <span>
                        <small>{t.comments}</small>
                        <strong>{clientNumber(request.counts.comments, locale)}</strong>
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </SectionCard>
    </>
  );
}
