"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import {
  RequestTemplateFields,
  type TemplateAnswerState,
} from "../request-templates/request-template-fields";
import { createServiceRequest, requestErrorMessage } from "../../lib/request-client";
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
import { EmptyState, PageHeader, PriorityChip, SectionCard, StatusChip } from "../premium-os";
import { normalizeLocale, type SupportedLocale } from "../../lib/i18n";

const priorities = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

const emptyIntakeOptions: RequestIntakeOptions = {
  clients: [],
  assignmentCandidates: {
    specialists: [],
    supervisors: [],
    accountManagers: [],
  },
};

const copy = {
  ar: {
    accountManagerId: "مدير الحساب",
    activeRequests: "طلبات نشطة",
    allRequests: "كل الطوابير",
    assignmentAndSources: "المصادر والتوزيع",
    assignmentAndSourcesHint: "اربط المراجع الداخلية وحدد فريق التشغيل إذا كانت البيانات متوفرة.",
    autoAssign: "تعيين تلقائي",
    clientId: "العميل",
    clientAction: "بانتظار العميل",
    commandEyebrow: "مركز تشغيل الطلبات",
    createCta: "إنشاء وفتح الطلب",
    createRequest: "إنشاء طلب",
    createRequestDescription:
      "أنشئ طلبا تشغيليا من بيانات العميل الفعلية: اختر العميل ثم خدمة الاشتراك والبند والمصادر المتاحة له.",
    creating: "جار إنشاء الطلب...",
    description: "الوصف",
    due: "الموعد",
    dueAt: "الموعد",
    emptyRequests: "لا توجد طلبات خدمة حتى الآن.",
    intake: "استقبال الطلب",
    liveOperations: "التشغيل المباشر",
    loadRequestTemplate: "تحميل نموذج الطلب",
    loadingTemplate: "جار تحميل النموذج...",
    loadedTemplate: "تم تحميل النموذج",
    noActiveTemplate:
      "لا يوجد نموذج نشط لهذا البند. يمكنك إنشاء الطلب الآن بالبيانات الأساسية، وسيظهر نموذج مخصص هنا بعد تفعيله من إدارة النماذج.",
    noClients: "لا توجد عملاء نشطون ضمن صلاحياتك حاليا.",
    noInvoices: "لا توجد فواتير مصدرة لهذا العميل",
    noQuotes: "لا توجد عروض سعر مصدرة أو مقبولة لهذا العميل",
    noServiceItems: "لا توجد بنود خدمة متاحة لهذا الاشتراك",
    noSubscriptionServices: "لا توجد خدمات اشتراك نشطة لهذا العميل",
    notSet: "غير محدد",
    openQueues: "فتح طوابير العمل",
    overdueRequests: "طلبات متأخرة",
    pageDescription:
      "إنشاء الطلبات، فرزها، وتشغيلها للعملاء النشطين مع الحفاظ على عقود البيانات الحالية.",
    pageTitle: "طلبات الخدمة",
    priority: "الأولوية",
    queueSnapshot: "ملخص التشغيل",
    readyToCreate: "جاهز للإنشاء",
    requestDetails: "وصف العمل والأولوية",
    requestDetailsHint: "اكتب عنوانًا واضحًا وحدد الأولوية والموعد ووصف المطلوب.",
    requestSetup: "بيانات الطلب",
    requestSetupHint: "ابدأ باختيار العميل، ثم اختر خدمة الاشتراك والبند من بيانات اشتراكه النشطة.",
    requestList: "قائمة الطلبات",
    selectClient: "اختر العميل",
    selectInvoice: "اختياري - اختر الفاتورة",
    selectQuote: "اختياري - اختر عرض السعر",
    selectServiceItem: "اختياري - اختر بند الخدمة",
    selectSubscriptionService: "اختر خدمة الاشتراك",
    serviceItemRevisionId: "بند الخدمة",
    sourceInvoiceId: "الفاتورة المصدر",
    sourceQuoteId: "عرض السعر المصدر",
    specialistId: "المختص",
    stepClient: "العميل",
    stepLaunch: "التشغيل",
    stepTemplate: "النموذج",
    subscriptionServiceId: "خدمة الاشتراك",
    supervisorReview: "بانتظار المشرف",
    supervisorId: "المشرف",
    templateAndValidation: "النموذج الديناميكي",
    templateAndValidationHint: "حمّل نموذج البند عند توفره حتى تُحفظ الإجابات بنفس عقد البيانات.",
    templateFor: "لـ",
    templateFirst: "اختر بند الخدمة أولا حتى يظهر النموذج المناسب.",
    title: "العنوان",
  },
  en: {
    accountManagerId: "Account manager",
    activeRequests: "Active requests",
    allRequests: "All queues",
    assignmentAndSources: "Sources and assignment",
    assignmentAndSourcesHint:
      "Connect internal references and assign the delivery team when available.",
    autoAssign: "Auto assign",
    clientId: "Client",
    clientAction: "Client action",
    commandEyebrow: "Request command center",
    createCta: "Create and open request",
    createRequest: "Create request",
    createRequestDescription:
      "Create an operational request from real client data: select the client, subscription service, service item, and available references.",
    creating: "Creating...",
    description: "Description",
    due: "Due",
    dueAt: "Due at",
    emptyRequests: "No service requests have been created yet.",
    intake: "Intake",
    liveOperations: "Live operations",
    loadRequestTemplate: "Load request template",
    loadingTemplate: "Loading template...",
    loadedTemplate: "Loaded template",
    noActiveTemplate:
      "No active template exists for this item. You can create the request with the basic fields now; a custom form will appear here after Admin activates one.",
    noClients: "There are no active clients in your current scope.",
    noInvoices: "No issued invoices for this client",
    noQuotes: "No issued or accepted quotes for this client",
    noServiceItems: "No service items are available for this subscription",
    noSubscriptionServices: "No active subscription services for this client",
    notSet: "Not set",
    openQueues: "Open work queues",
    overdueRequests: "Overdue",
    pageDescription:
      "Create, triage, and operate service requests for onboarded active clients while preserving the current backend contract.",
    pageTitle: "Service requests",
    priority: "Priority",
    queueSnapshot: "Queue snapshot",
    readyToCreate: "Ready to create",
    requestDetails: "Work brief and priority",
    requestDetailsHint: "Use a clear title, priority, due date, and delivery brief.",
    requestSetup: "Request setup",
    requestSetupHint:
      "Start by selecting the client, then choose from that client's active subscription data.",
    requestList: "Request list",
    selectClient: "Select client",
    selectInvoice: "Optional - select invoice",
    selectQuote: "Optional - select quote",
    selectServiceItem: "Optional - select service item",
    selectSubscriptionService: "Select subscription service",
    serviceItemRevisionId: "Service item",
    sourceInvoiceId: "Source invoice",
    sourceQuoteId: "Source quote",
    specialistId: "Specialist",
    stepClient: "Client",
    stepLaunch: "Launch",
    stepTemplate: "Template",
    subscriptionServiceId: "Subscription service",
    supervisorReview: "Supervisor review",
    supervisorId: "Supervisor",
    templateAndValidation: "Dynamic template",
    templateAndValidationHint:
      "Load the service-item template when available so answers keep the same data contract.",
    templateFor: "for",
    templateFirst: "Select a service item first so the right template can load.",
    title: "Title",
  },
} as const;

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
  intakeOptions = emptyIntakeOptions,
  locale: localeInput = "en",
  requests,
}: {
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
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templateNotice, setTemplateNotice] = useState<string | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<RequestTemplateVersion | null>(null);
  const [templateAnswers, setTemplateAnswers] = useState<TemplateAnswerState>({});
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
      return;
    }
    setLoadingTemplate(true);
    setError(null);
    setTemplateNotice(null);
    try {
      const response = await fetchActiveRequestTemplate(serviceItemRevisionId);
      setActiveTemplate(response.template);
      setTemplateAnswers({});
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
      if (activeTemplate) {
        payload.requestTemplateVersionId = activeTemplate.id;
        payload.templateAnswers = answersForTemplate(activeTemplate, templateAnswers);
      }
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
      <PageHeader
        eyebrow={t.commandEyebrow}
        title={t.pageTitle}
        description={t.pageDescription}
        actions={[{ href: "/requests/queues", label: t.openQueues, variant: "primary" }]}
      />

      <section className="request-list-command" aria-label={t.queueSnapshot}>
        <div className="request-list-command-main">
          <p className="eyebrow">{t.queueSnapshot}</p>
          <h2>{t.requestList}</h2>
          <p>{t.pageDescription}</p>
        </div>
        <div className="request-list-metrics">
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
        </div>
      </section>

      <SectionCard
        eyebrow={t.intake}
        title={t.createRequest}
        description={t.createRequestDescription}
      >
        <form className="catalog-form wide-form request-list-intake-form" onSubmit={submit}>
          <div className="request-intake-steps form-span">
            <div className="active">
              <span>01</span>
              <strong>{t.stepClient}</strong>
              <small>{t.requestSetup}</small>
            </div>
            <div>
              <span>02</span>
              <strong>{t.stepTemplate}</strong>
              <small>{t.templateAndValidation}</small>
            </div>
            <div>
              <span>03</span>
              <strong>{t.stepLaunch}</strong>
              <small>{t.readyToCreate}</small>
            </div>
          </div>

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
                  <option value="">{sourceQuotes.length === 0 ? t.noQuotes : t.selectQuote}</option>
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
          {templateNotice && <p className="catalog-feedback success form-span">{templateNotice}</p>}
          <RequestTemplateFields
            template={activeTemplate}
            locale={locale}
            values={templateAnswers}
            onChange={setTemplateAnswer}
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
      </SectionCard>

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
