"use client";

import { requestListCopy as copy } from "../../i18n/dictionaries/workflow";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import {
  RequestTemplateFields,
  type TemplateAnswerState,
  type TemplateFileState,
} from "../request-templates/request-template-fields";
import {
  createServiceRequest,
  requestErrorMessage,
  uploadRequestAttachment,
} from "../../lib/request-client";
import { answersForTemplate, fetchActiveRequestTemplate } from "../../lib/request-templates-client";
import type { RequestTemplateVersion, TemplateAnswerValue } from "../../lib/request-template-types";
import type {
  RequestAssignmentCandidate,
  RequestIntakeOptions,
  RequestIntakeServiceItemOption,
  RequestIntakeSubscriptionServiceOption,
  RequestStatus,
  RequestSummary,
} from "../../lib/request-types";
import { AppDialog } from "../app-dialog";
import { EmptyState, PageHeader, PriorityChip, SectionCard, StatusChip } from "../premium-os";
import { normalizeLocale, platformTimeZone, type SupportedLocale } from "../../lib/i18n";

const priorities = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

const emptyIntakeOptions: RequestIntakeOptions = {
  clients: [],
  assignmentCandidates: {
    specialists: [],
    supervisors: [],
    accountManagers: [],
  },
};

const priorityLabels = {
  HIGH: { ar: "عالية", en: "High" },
  LOW: { ar: "منخفضة", en: "Low" },
  NORMAL: { ar: "عادية", en: "Normal" },
  URGENT: { ar: "عاجلة", en: "Urgent" },
} as const;

const statusLabels = {
  ASSIGNED: { ar: "مسند", en: "Assigned" },
  CLOSED: { ar: "مغلق", en: "Closed" },
  COMPLETED: { ar: "مكتمل", en: "Completed" },
  IN_PROGRESS: { ar: "قيد التنفيذ", en: "In progress" },
  NEW: { ar: "جديد", en: "New" },
  REJECTED: { ar: "مرفوض", en: "Rejected" },
  RETURNED: { ar: "معاد للتعديل", en: "Returned" },
  TRIAGE: { ar: "قيد الفرز", en: "In review" },
  WAITING_CLIENT: { ar: "بانتظار العميل", en: "Waiting for client" },
  WAITING_SUPERVISOR: { ar: "بانتظار المشرف", en: "Waiting for supervisor" },
} satisfies Record<RequestStatus, Record<SupportedLocale, string>>;

const closedStatuses = new Set<RequestStatus>(["CLOSED", "COMPLETED", "REJECTED"]);

function displayDate(value: string | null, locale: SupportedLocale): string {
  if (!value) return copy[locale].notSet;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    dateStyle: "medium",
    timeZone: platformTimeZone,
  }).format(new Date(value));
}

function localizedServiceName(request: RequestSummary, locale: SupportedLocale): string {
  return locale === "ar"
    ? request.service.monthlyService.nameAr || request.service.monthlyService.nameEn
    : request.service.monthlyService.nameEn || request.service.monthlyService.nameAr;
}

function priorityLabel(priority: string, locale: SupportedLocale): string {
  return priorityLabels[priority as keyof typeof priorityLabels]?.[locale] ?? priority;
}

function statusLabel(status: RequestStatus, locale: SupportedLocale): string {
  return statusLabels[status]?.[locale] ?? status;
}

function optional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function localizedName(
  value: { nameAr?: string | null; nameEn?: string | null },
  locale: SupportedLocale,
): string {
  return locale === "ar" ? value.nameAr || value.nameEn || "" : value.nameEn || value.nameAr || "";
}

function clientLabel(client: RequestIntakeOptions["clients"][number]): string {
  return `${client.name} - ${client.code}`;
}

function serviceLabel(
  service: RequestIntakeSubscriptionServiceOption,
  locale: SupportedLocale,
  numberFormatter: Intl.NumberFormat,
): string {
  const serviceName = localizedName(service.monthlyService, locale);
  const level =
    locale === "ar"
      ? service.serviceLevel.labelAr || service.serviceLevel.labelEn || service.serviceLevel.code
      : service.serviceLevel.labelEn || service.serviceLevel.labelAr || service.serviceLevel.code;
  const hours = numberFormatter.format(service.hoursAllocated);
  return `${serviceName} - ${level} - ${hours} ${locale === "ar" ? "ساعة" : "hours"}`;
}

function serviceItemLabel(item: RequestIntakeServiceItemOption, locale: SupportedLocale): string {
  const itemName = localizedName(item, locale);
  return item.expectedOutput && item.expectedOutput !== itemName
    ? `${itemName} - ${item.expectedOutput}`
    : itemName;
}

function candidateLabel(candidate: RequestAssignmentCandidate): string {
  return `${candidate.displayName} - ${candidate.email}`;
}

function isRequestOverdue(request: RequestSummary): boolean {
  if (!request.dueAt || closedStatuses.has(request.status)) return false;
  const dueTime = new Date(request.dueAt).getTime();
  return Number.isFinite(dueTime) && dueTime < Date.now();
}

export function RequestList({
  canCreate = true,
  intakeOptions = emptyIntakeOptions,
  locale: localeInput = "en",
  requests,
}: {
  canCreate?: boolean;
  intakeOptions?: RequestIntakeOptions | null;
  locale?: string;
  requests: RequestSummary[];
}) {
  const locale = normalizeLocale(localeInput);
  const t = copy[locale];
  const options = intakeOptions ?? emptyIntakeOptions;
  const router = useRouter();
  const [items, setItems] = useState(requests);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templateNotice, setTemplateNotice] = useState<string | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<RequestTemplateVersion | null>(null);
  const [templateAnswers, setTemplateAnswers] = useState<TemplateAnswerState>({});
  const [templateFiles, setTemplateFiles] = useState<TemplateFileState>({});
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
  const numberFormatter = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-SA");
  const selectedClient = useMemo(
    () => options.clients.find((client) => client.id === form.clientId) ?? null,
    [form.clientId, options.clients],
  );
  const subscriptionServices = useMemo(
    () => selectedClient?.subscriptions.flatMap((subscription) => subscription.services) ?? [],
    [selectedClient],
  );
  const selectedSubscriptionService = useMemo(
    () => subscriptionServices.find((service) => service.id === form.subscriptionServiceId) ?? null,
    [form.subscriptionServiceId, subscriptionServices],
  );
  const serviceItems = selectedSubscriptionService?.serviceItems ?? [];
  const selectedServiceItem =
    serviceItems.find((item) => item.id === form.serviceItemRevisionId) ?? null;
  const sourceQuotes = selectedClient?.sourceQuotes ?? [];
  const sourceInvoices = selectedClient?.sourceInvoices ?? [];
  const canSubmit = Boolean(
    form.clientId &&
    form.subscriptionServiceId &&
    form.title.trim() &&
    form.description.trim() &&
    !creating,
  );
  const activeRequests = items.filter((request) => !closedStatuses.has(request.status)).length;
  const clientActionRequests = items.filter(
    (request) => request.status === "WAITING_CLIENT",
  ).length;
  const supervisorReviewRequests = items.filter(
    (request) => request.status === "WAITING_SUPERVISOR",
  ).length;
  const overdueRequests = items.filter(isRequestOverdue).length;

  async function loadTemplate(serviceItemRevisionIdInput = form.serviceItemRevisionId) {
    const serviceItemRevisionId = optional(serviceItemRevisionIdInput);
    if (!serviceItemRevisionId) {
      setTemplateNotice(t.templateFirst);
      setActiveTemplate(null);
      setTemplateAnswers({});
      setTemplateFiles({});
      return;
    }
    setLoadingTemplate(true);
    setError(null);
    setTemplateNotice(null);
    try {
      const response = await fetchActiveRequestTemplate(serviceItemRevisionId);
      setActiveTemplate(response.template);
      setTemplateAnswers({});
      setTemplateFiles({});
      setTemplateNotice(
        response.template
          ? `${t.loadedTemplate} v${response.template.version} ${t.templateFor} ${
              locale === "ar"
                ? response.serviceItemRevision.nameAr || response.serviceItemRevision.nameEn
                : response.serviceItemRevision.nameEn || response.serviceItemRevision.nameAr
            }.`
          : t.noActiveTemplate,
      );
    } catch (caught) {
      setActiveTemplate(null);
      setError(requestErrorMessage(caught));
    } finally {
      setLoadingTemplate(false);
    }
  }

  function clearTemplateState() {
    setActiveTemplate(null);
    setTemplateAnswers({});
    setTemplateFiles({});
    setTemplateNotice(null);
  }

  function selectClient(clientId: string) {
    setForm((current) => ({
      ...current,
      clientId,
      subscriptionServiceId: "",
      serviceItemRevisionId: "",
      sourceQuoteId: "",
      sourceInvoiceId: "",
      assignedSpecialistId: "",
      assignedSupervisorId: "",
      accountManagerId: "",
    }));
    clearTemplateState();
  }

  function selectSubscriptionService(subscriptionServiceId: string) {
    setForm((current) => ({
      ...current,
      subscriptionServiceId,
      serviceItemRevisionId: "",
    }));
    clearTemplateState();
  }

  function selectServiceItem(serviceItemRevisionId: string) {
    setForm((current) => ({ ...current, serviceItemRevisionId }));
    clearTemplateState();
    if (serviceItemRevisionId) {
      void loadTemplate(serviceItemRevisionId);
    }
  }

  function setTemplateAnswer(code: string, value: TemplateAnswerValue) {
    setTemplateAnswers((current) => ({ ...current, [code]: value }));
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
    setCreating(true);
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
      if (dueAt) payload.dueAt = dueAt.toISOString();
      if (activeTemplate) {
        payload.requestTemplateVersionId = activeTemplate.id;
        payload.templateAnswers = answersForTemplate(activeTemplate, templateAnswers);
      }
      const created = await createServiceRequest(payload);
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
      router.push(`/requests/${created.id}`);
    } catch (caught) {
      setError(requestErrorMessage(caught));
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={t.commandEyebrow}
        title={t.pageTitle}
        description={t.pageDescription}
        actions={[
          ...(canCreate
            ? [
                {
                  label: t.createRequest,
                  onClick: () => setShowCreateModal(true),
                  variant: "primary" as const,
                },
              ]
            : []),
        ]}
      />

      <section
        className="request-list-metrics request-list-metrics-standalone"
        aria-label={t.queueSnapshot}
      >
        <article className="primary">
          <span>{t.activeRequests}</span>
          <strong>{numberFormatter.format(activeRequests)}</strong>
          <small>{t.liveOperations}</small>
        </article>
        <article>
          <span>{t.clientAction}</span>
          <strong>{numberFormatter.format(clientActionRequests)}</strong>
          <small>{statusLabel("WAITING_CLIENT", locale)}</small>
        </article>
        <article>
          <span>{t.supervisorReview}</span>
          <strong>{numberFormatter.format(supervisorReviewRequests)}</strong>
          <small>{statusLabel("WAITING_SUPERVISOR", locale)}</small>
        </article>
        <article>
          <span>{t.overdueRequests}</span>
          <strong>{numberFormatter.format(overdueRequests)}</strong>
          <small>{t.due}</small>
        </article>
      </section>

      {showCreateModal && canCreate ? (
        <AppDialog
          busy={creating}
          closeLabel={locale === "ar" ? "إغلاق" : "Close"}
          description={t.createRequestDescription}
          eyebrow={t.intake}
          onClose={() => setShowCreateModal(false)}
          size="full"
          title={t.createRequest}
        >
          <form
            className="catalog-form wide-form request-list-intake-form"
            noValidate
            onSubmit={submit}
          >
            <section className="request-intake-panel form-span">
              <div className="request-panel-heading">
                <span>01</span>
                <div>
                  <h3>{t.requestSetup}</h3>
                  <p>{t.requestSetupHint}</p>
                </div>
              </div>
              <div className="request-field-grid request-field-grid-three">
                <label>
                  {t.clientId}
                  <select
                    required
                    value={form.clientId}
                    onChange={(event) => selectClient(event.target.value)}
                  >
                    <option value="">{t.selectClient}</option>
                    {options.clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {clientLabel(client)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t.subscriptionServiceId}
                  <select
                    required
                    disabled={!selectedClient || subscriptionServices.length === 0}
                    value={form.subscriptionServiceId}
                    onChange={(event) => selectSubscriptionService(event.target.value)}
                  >
                    <option value="">
                      {selectedClient ? t.selectSubscriptionService : t.selectClient}
                    </option>
                    {subscriptionServices.map((service) => (
                      <option key={service.id} value={service.id}>
                        {serviceLabel(service, locale, numberFormatter)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t.serviceItemRevisionId}
                  <select
                    disabled={!selectedSubscriptionService || serviceItems.length === 0}
                    value={form.serviceItemRevisionId}
                    onChange={(event) => selectServiceItem(event.target.value)}
                  >
                    <option value="">{t.selectServiceItem}</option>
                    {serviceItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {serviceItemLabel(item, locale)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {options.clients.length === 0 && (
                <p className="catalog-feedback form-span">{t.noClients}</p>
              )}
              {selectedClient && subscriptionServices.length === 0 && (
                <p className="catalog-feedback form-span">{t.noSubscriptionServices}</p>
              )}
              {selectedSubscriptionService && serviceItems.length === 0 && (
                <p className="catalog-feedback form-span">{t.noServiceItems}</p>
              )}
            </section>

            <section className="request-intake-panel request-template-summary form-span">
              <div className="request-panel-heading">
                <span>02</span>
                <div>
                  <h3>{t.templateAndValidation}</h3>
                  <p>{t.templateAndValidationHint}</p>
                </div>
              </div>
              <div className="request-review-bar">
                <div>
                  <span>{t.serviceItemRevisionId}</span>
                  <strong>
                    {selectedServiceItem ? serviceItemLabel(selectedServiceItem, locale) : t.notSet}
                  </strong>
                </div>
                <button
                  className="os-button os-button-secondary"
                  type="button"
                  disabled={loadingTemplate || !form.serviceItemRevisionId.trim()}
                  onClick={() => void loadTemplate()}
                >
                  {loadingTemplate ? t.loadingTemplate : t.loadRequestTemplate}
                </button>
              </div>
            </section>

            <section className="request-intake-panel form-span">
              <div className="request-panel-heading">
                <span>03</span>
                <div>
                  <h3>{t.assignmentAndSources}</h3>
                  <p>{t.assignmentAndSourcesHint}</p>
                </div>
              </div>
              <div className="request-field-grid">
                <label>
                  {t.sourceQuoteId}
                  <select
                    disabled={!selectedClient || sourceQuotes.length === 0}
                    value={form.sourceQuoteId}
                    onChange={(event) => setForm({ ...form, sourceQuoteId: event.target.value })}
                  >
                    <option value="">
                      {sourceQuotes.length === 0 ? t.noQuotes : t.selectQuote}
                    </option>
                    {sourceQuotes.map((quote) => (
                      <option key={quote.id} value={quote.id}>
                        {quote.quoteNumber} - {quote.status}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t.sourceInvoiceId}
                  <select
                    disabled={!selectedClient || sourceInvoices.length === 0}
                    value={form.sourceInvoiceId}
                    onChange={(event) => setForm({ ...form, sourceInvoiceId: event.target.value })}
                  >
                    <option value="">
                      {sourceInvoices.length === 0 ? t.noInvoices : t.selectInvoice}
                    </option>
                    {sourceInvoices.map((invoice) => (
                      <option key={invoice.id} value={invoice.id}>
                        {invoice.invoiceNumber} - {invoice.status}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t.specialistId}
                  <select
                    value={form.assignedSpecialistId}
                    onChange={(event) =>
                      setForm({ ...form, assignedSpecialistId: event.target.value })
                    }
                  >
                    <option value="">{t.autoAssign}</option>
                    {options.assignmentCandidates.specialists.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidateLabel(candidate)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t.supervisorId}
                  <select
                    value={form.assignedSupervisorId}
                    onChange={(event) =>
                      setForm({ ...form, assignedSupervisorId: event.target.value })
                    }
                  >
                    <option value="">{t.autoAssign}</option>
                    {options.assignmentCandidates.supervisors.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidateLabel(candidate)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t.accountManagerId}
                  <select
                    value={form.accountManagerId}
                    onChange={(event) => setForm({ ...form, accountManagerId: event.target.value })}
                  >
                    <option value="">{t.autoAssign}</option>
                    {options.assignmentCandidates.accountManagers.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidateLabel(candidate)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <section className="request-intake-panel request-details-panel form-span">
              <div className="request-panel-heading">
                <span>04</span>
                <div>
                  <h3>{t.requestDetails}</h3>
                  <p>{t.requestDetailsHint}</p>
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
                <label className="form-span">
                  {t.description}
                  <textarea
                    required
                    value={form.description}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                  />
                </label>
              </div>
            </section>
            {templateNotice && (
              <p className="catalog-feedback success form-span">{templateNotice}</p>
            )}
            <RequestTemplateFields
              template={activeTemplate}
              locale={locale}
              values={templateAnswers}
              onChange={setTemplateAnswer}
              onFilesChange={(code, files) =>
                setTemplateFiles((current) => ({ ...current, [code]: files }))
              }
            />
            {error && <p className="form-error form-span">{error}</p>}
            <div className="request-review-bar form-span">
              <div>
                <span>{t.readyToCreate}</span>
                <strong>{form.title || t.createRequest}</strong>
              </div>
              <button className="os-button os-button-primary" type="submit" disabled={!canSubmit}>
                {creating ? t.creating : t.createCta}
              </button>
            </div>
          </form>
        </AppDialog>
      ) : null}

      <SectionCard eyebrow={t.liveOperations} title={t.requestList}>
        {items.length === 0 ? (
          <EmptyState>{t.emptyRequests}</EmptyState>
        ) : (
          <div className="quote-list-grid">
            {items.map((request) => (
              <article className="quote-list-card request-operation-card" key={request.id}>
                <Link className="quote-list-main" href={`/requests/${request.id}`}>
                  <div>
                    <small>{request.requestNumber}</small>
                    <h2>{request.title}</h2>
                    <p>
                      {request.client.name} - {localizedServiceName(request, locale)}
                    </p>
                  </div>
                  <div className="quote-list-meta">
                    <StatusChip
                      status={request.status}
                      label={statusLabel(request.status, locale)}
                    />
                    <PriorityChip
                      priority={request.priority}
                      label={priorityLabel(request.priority, locale)}
                    />
                    <small>
                      {t.due} {displayDate(request.dueAt, locale)}
                    </small>
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
