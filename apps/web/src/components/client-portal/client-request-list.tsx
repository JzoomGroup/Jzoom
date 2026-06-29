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
import {
  clientDate,
  clientLabel,
  clientLocale,
  clientName,
  clientNumber,
  localizedExpectedOutput,
  localizedServiceDescription,
  priorityLabel,
  requestStatusLabel,
  type ClientDisplayLocale,
} from "./client-format";

const priorities = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

const copy = {
  ar: {
    activeSubscribedEmpty: "لا توجد خدمات اشتراك نشطة متاحة لإنشاء الطلبات حتى الآن.",
    auto: "تلقائي",
    availableForIntake: "متاحة لإنشاء الطلبات",
    client: "العميل",
    clientActionNeeded: "مطلوب إجراء من العميل",
    clientServiceCenter: "مركز خدمة العميل",
    createRequest: "إنشاء طلب",
    creating: "جاري الإنشاء...",
    description: "الوصف",
    descriptionHelp:
      "اكتب عنوانًا واضحًا، وسياق العمل، والموعد المطلوب، وأي ملاحظات مهمة. يمكن إضافة الملفات لاحقًا عند طلبها من فريق جزوم.",
    due: "الموعد",
    dueAt: "الموعد المطلوب",
    exactItem: "بند الخدمة",
    expectedOutput: "المخرج المتوقع",
    files: "ملفات",
    generalItem: "طلب عام على الخدمة - بدون بند محدد",
    generalItemNotice:
      "سيتم توجيه الطلب العام إلى فريق جزوم للفرز عندما لا ينطبق العمل على بند محدد.",
    generalTemplateNotice: "تم اختيار طلب عام على الخدمة. سيتم استخدام نموذج الطلب العام.",
    includedItems: "بنود الخدمة المشمولة",
    itemAttachmentHint: "قد تكون تفاصيل المرفقات مطلوبة.",
    latestOrder: "حسب ترتيب القائمة الحالي",
    loadingTemplate: "جاري تحميل نموذج الطلب...",
    monthlyHours: "الساعات الشهرية",
    noRequests: "لا توجد طلبات ظاهرة",
    noRequestsBody: "لا توجد طلبات ظاهرة لهذا الحساب حاليًا.",
    noSubscribedServices: "لا توجد خدمات مشتركة",
    openOnService: "المفتوحة على الخدمة",
    openRequests: "طلبات مفتوحة",
    optionalFields: "حقول اختيارية",
    optionalReference: "مرجع تجاري اختياري",
    requestDetails: "تفاصيل الطلب",
    requestIntake: "استقبال الطلبات",
    requestLibrary: "سجل الطلبات",
    requestSetup: "إعداد الطلب",
    requests: "الطلبات",
    requiredDocuments: "المستندات",
    requiredFields: "حقول إلزامية",
    selectedService: "الخدمة المختارة",
    selectedServiceSummary: "ملخص الخدمة المختارة",
    service: "الخدمة",
    serviceDescription:
      "اختر الخدمة الأقرب لاحتياجك. سيقوم فريق جزوم بتوجيه الطلب للفريق المناسب وإظهار أي أسئلة خاصة بالبند تلقائيًا.",
    serviceIntro:
      "أنشئ وتابع وراجع طلبات الخدمة المرتبطة باشتراكاتك النشطة من مكان واحد.",
    serviceStep: "الخطوة 1 من 3 - اختر الخدمة المشتركة وبند العمل المطلوب.",
    stillActive: "لا تزال نشطة",
    submit: "إرسال الطلب إلى جزوم",
    subscribedServices: "الخدمات المشتركة",
    templateFields: "حقول النموذج",
    templateLoaded: (version: number, item: string) => `تم تحميل نموذج v${version} للبند ${item}.`,
    templateMissing: "لا يوجد نموذج نشط. سيتم استخدام نموذج الطلب العام.",
    templateVersion: "إصدار النموذج",
    title: "العنوان",
    trackDescription:
      "كل بطاقة تحفظ مسار تفاصيل الطلب وإجراءات سير العمل الأصلية بدون تغيير.",
    visibleRequests: "الطلبات الظاهرة",
    waitingForYou: "بانتظارك",
  },
  en: {
    activeSubscribedEmpty: "No active subscribed services are available for request creation yet.",
    auto: "Auto",
    availableForIntake: "Available for intake",
    client: "Client",
    clientActionNeeded: "Client action needed",
    clientServiceCenter: "Client service center",
    createRequest: "Create request",
    creating: "Creating...",
    description: "Description",
    descriptionHelp:
      "Use a clear title and include the business context, deadline, and any important notes. You can add files later if Jzoom requests them.",
    due: "Due",
    dueAt: "Due at",
    exactItem: "Service item",
    expectedOutput: "Expected output",
    files: "Files",
    generalItem: "General service request - no specific item",
    generalItemNotice:
      "General requests are routed to Jzoom for triage when the work does not match a specific service item.",
    generalTemplateNotice: "General service request selected. The generic request form will be used.",
    includedItems: "Included service items",
    itemAttachmentHint: "attachment details may be required.",
    latestOrder: "Based on current list order",
    loadingTemplate: "Loading request template...",
    monthlyHours: "Monthly hours",
    noRequests: "No visible requests",
    noRequestsBody: "No requests are currently visible for this account.",
    noSubscribedServices: "No subscribed services",
    openOnService: "Open on service",
    openRequests: "Open requests",
    optionalFields: "Optional fields",
    optionalReference: "Optional commercial reference",
    requestDetails: "Request details",
    requestIntake: "Request intake",
    requestLibrary: "Request library",
    requestSetup: "Request setup",
    requests: "Requests",
    requiredDocuments: "Documents",
    requiredFields: "Required fields",
    selectedService: "Selected service",
    selectedServiceSummary: "Selected service summary",
    service: "Service",
    serviceDescription:
      "Pick the service closest to your need. Jzoom will route the request to the right team and show any item-specific questions automatically.",
    serviceIntro:
      "Create, track, and review service requests tied to your active subscriptions.",
    serviceStep: "Step 1 of 3 - choose the subscribed service and the exact work item.",
    stillActive: "Still active",
    submit: "Submit request to Jzoom",
    subscribedServices: "Subscribed services",
    templateFields: "Template fields",
    templateLoaded: (version: number, item: string) => `Loaded template v${version} for ${item}.`,
    templateMissing: "No active template exists. The generic request form will be used.",
    templateVersion: "Template version",
    title: "Title",
    trackDescription:
      "Every row keeps the original request detail route and workflow actions available.",
    visibleRequests: "Visible requests",
    waitingForYou: "Waiting for you",
  },
} as const;

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

function openRequestCount(requests: RequestSummary[], subscriptionServiceId: string): number {
  return requests.filter(
    (request) =>
      request.service.subscriptionServiceId === subscriptionServiceId &&
      !["COMPLETED", "CLOSED", "REJECTED"].includes(request.status),
  ).length;
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
      setTemplateNotice(t.generalTemplateNotice);
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
          ? t.templateLoaded(response.template.version, clientName(response.serviceItemRevision, locale))
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
        eyebrow={t.clientServiceCenter}
        title={t.requests}
        description={t.serviceIntro}
      />

      <BentoGrid compact>
        <MetricCard
          accent
          label={t.openRequests}
          value={clientNumber(openRequests, locale)}
          detail={t.stillActive}
        />
        <MetricCard
          label={t.waitingForYou}
          value={clientNumber(waitingClientRequests, locale)}
          detail={t.clientActionNeeded}
        />
        <MetricCard
          label={t.subscribedServices}
          value={clientNumber(services.length, locale)}
          detail={t.availableForIntake}
        />
        <MetricCard
          label={t.selectedService}
          value={clientNumber(selectedService ? selectedService.hoursAllocated : 0, locale)}
          detail={t.monthlyHours}
        />
      </BentoGrid>

      <SectionCard
        eyebrow={t.requestIntake}
        title={t.createRequest}
        description={t.serviceDescription}
      >
        {services.length === 0 ? (
          <EmptyState title={t.noSubscribedServices}>{t.activeSubscribedEmpty}</EmptyState>
        ) : (
          <form className="catalog-form wide-form" onSubmit={submit}>
            <div className="pricing-total-grid form-span">
              <div>
                <span>{t.client}</span>
                <strong>{selectedClient?.code ?? t.client}</strong>
              </div>
              <div>
                <span>{t.monthlyHours}</span>
                <strong>{clientNumber(selectedService?.hoursAllocated ?? 0, locale)}</strong>
              </div>
              <div>
                <span>{t.openOnService}</span>
                <strong>{clientNumber(selectedServiceOpenRequests, locale)}</strong>
              </div>
              <div>
                <span>{t.includedItems}</span>
                <strong>{clientNumber(selectedServiceItems.length, locale)}</strong>
              </div>
              <div className="primary">
                <span>{t.templateFields}</span>
                <strong>{activeTemplate ? clientNumber(activeTemplate.fields.length, locale) : t.auto}</strong>
              </div>
            </div>

            <div className="activity-list form-span">
              <article>
                <strong>{t.requestSetup}</strong>
                <small>{t.serviceStep}</small>
                <p>{t.serviceDescription}</p>
              </article>
              {selectedService && (
                <article>
                  <strong>{t.selectedServiceSummary}</strong>
                  <small>
                    {serviceLabel(selectedService, locale)} - {selectedService.client.name}
                  </small>
                  <p>
                    {localizedServiceDescription({
                      description: selectedService.service.description,
                      domain: selectedService.service.domain,
                      locale,
                      name: clientName(selectedService.service, locale),
                      serviceLine: selectedService.service.serviceLine,
                    })}
                  </p>
                  <div className="hours-strip">
                    <span>{clientName(selectedService.service.category, locale)}</span>
                    <span>{selectedService.service.domain}</span>
                    <span>
                      {clientNumber(selectedService.hoursAllocated, locale)} {t.monthlyHours}
                    </span>
                  </div>
                </article>
              )}
            </div>

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
                      {expectedOutput && expectedOutput !== itemName ? ` - ${expectedOutput}` : ""}
                    </option>
                  );
                })}
              </select>
            </label>
            {selectedServiceItem ? (
              <p className="catalog-feedback success form-span">
                {t.expectedOutput}:{" "}
                {localizedExpectedOutput({
                  fallbackName: clientName(selectedServiceItem, locale),
                  locale,
                  value: selectedServiceItem.expectedOutput,
                })}
                {selectedServiceItem.requiresFile ? ` - ${t.itemAttachmentHint}` : ""}
              </p>
            ) : (
              <p className="catalog-feedback success form-span">{t.generalItemNotice}</p>
            )}

            <div className="activity-list form-span">
              <article>
                <strong>{t.requestDetails}</strong>
                <small>{locale === "ar" ? "الخطوة 2 من 3 - اشرح المطلوب بوضوح." : "Step 2 of 3 - describe what you need in plain language."}</small>
                <p>{t.descriptionHelp}</p>
              </article>
            </div>
            <label>
              {t.title}
              <input
                required
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            </label>
            <label>
              {locale === "ar" ? "الأولوية" : "Priority"}
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
            <details className="form-span">
              <summary>{t.optionalReference}</summary>
              <div className="catalog-form wide-form">
                <label>
                  {locale === "ar" ? "معرف العرض" : "Quote reference ID"}
                  <input
                    value={form.sourceQuoteId}
                    onChange={(event) => setForm({ ...form, sourceQuoteId: event.target.value })}
                  />
                </label>
                <label>
                  {locale === "ar" ? "معرف الفاتورة" : "Invoice reference ID"}
                  <input
                    value={form.sourceInvoiceId}
                    onChange={(event) => setForm({ ...form, sourceInvoiceId: event.target.value })}
                  />
                </label>
              </div>
            </details>
            <label className="form-span">
              {t.description}
              <textarea
                required
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </label>
            {loadingTemplate && (
              <p className="catalog-feedback success form-span">{t.loadingTemplate}</p>
            )}
            {templateNotice && (
              <p className="catalog-feedback success form-span">{templateNotice}</p>
            )}
            {activeTemplate && (
              <div className="pricing-total-grid form-span">
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
                  <strong>{clientNumber(activeTemplate.documentChecklist.length, locale)}</strong>
                </div>
                <div className="primary">
                  <span>{t.files}</span>
                  <strong>{clientNumber(activeTemplate.downloadableFiles.length, locale)}</strong>
                </div>
              </div>
            )}
            <RequestTemplateFields
              locale={locale}
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
              {saving ? t.creating : t.submit}
            </button>
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
          <div className="quote-list-grid">
            {items.map((request) => (
              <article className="quote-list-card" key={request.id}>
                <Link className="quote-list-main" href={`/client/requests/${request.id}`}>
                  <div>
                    <small>{request.requestNumber}</small>
                    <h2>{request.title}</h2>
                    <p>{clientName(request.service.monthlyService, locale)}</p>
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
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}
