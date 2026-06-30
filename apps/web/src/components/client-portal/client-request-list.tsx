"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
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
import type { RequestStatus, RequestSummary } from "../../lib/request-types";
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
  localizedFreeText,
  localizedServiceDescription,
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

const copy = {
  ar: {
    activeSubscribedEmpty: "لا توجد خدمات اشتراك نشطة متاحة لإنشاء الطلبات حتى الآن.",
    allServices: "كل الخدمات",
    allStatuses: "كل الحالات",
    auto: "تلقائي",
    availableForIntake: "متاحة لإنشاء الطلبات",
    clearFilters: "مسح الفلاتر",
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
    comments: "التعليقات",
    draftLoaded: "تم استرجاع المسودة المحفوظة على هذا الجهاز.",
    draftSaved: "تم حفظ المسودة على هذا الجهاز.",
    exactItem: "بند الخدمة",
    expectedOutput: "المخرج المتوقع",
    deliverables: "المخرجات",
    documents: "المستندات",
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
    noAction: "لا يوجد إجراء مطلوب الآن.",
    noFilteredRequests: "لا توجد نتائج مطابقة",
    noFilteredRequestsBody: "غيّر البحث أو الفلاتر لعرض طلبات أخرى.",
    noSubscribedServices: "لا توجد خدمات مشتركة",
    openOnService: "المفتوحة على الخدمة",
    openRequests: "طلبات مفتوحة",
    optionalFields: "حقول اختيارية",
    optionalReference: "ربط اختياري بعرض أو فاتورة",
    priority: "الأولوية",
    quoteReferenceId: "مرجع العرض",
    invoiceReferenceId: "مرجع الفاتورة",
    review: "المراجعة",
    requestDetails: "تفاصيل الطلب",
    requestDetailsStep: "الخطوة 2 من 3 - اشرح المطلوب بوضوح.",
    requestIntake: "استقبال الطلبات",
    requestJourney: "رحلة الطلب",
    requestLibrary: "سجل الطلبات",
    requestNextStep: "الخطوة التالية",
    requestStats: "مؤشرات الطلب",
    requestSetup: "إعداد الطلب",
    requestUpdated: "آخر تحديث",
    requests: "الطلبات",
    reviewStep: "الخطوة 3 من 3 - راجع التفاصيل ثم أرسل الطلب.",
    reviewOutputs: "راجع المخرجات المشاركة من جزوم.",
    requiredDocuments: "المستندات",
    requiredFields: "حقول إلزامية",
    saveDraft: "حفظ كمسودة",
    searchPlaceholder: "ابحث برقم الطلب أو العنوان أو الخدمة...",
    selectedService: "الخدمة المختارة",
    selectedServiceItem: "بند العمل المختار",
    selectedServiceSummary: "ملخص الخدمة المختارة",
    service: "الخدمة",
    serviceDescription:
      "اختر الخدمة الأقرب لاحتياجك. سيقوم فريق جزوم بتوجيه الطلب للفريق المناسب وإظهار أي أسئلة خاصة بالبند تلقائيًا.",
    serviceIntro: "أنشئ وتابع وراجع طلبات الخدمة المرتبطة باشتراكاتك النشطة من مكان واحد.",
    serviceStep: "الخطوة 1 من 3 - اختر الخدمة المشتركة وبند العمل المطلوب.",
    stillActive: "لا تزال نشطة",
    submit: "إرسال الطلب إلى جزوم",
    subscribedServices: "الخدمات المشتركة",
    templateFields: "حقول النموذج",
    templateReady: "النموذج جاهز",
    templateLoaded: (version: number, item: string) => `تم تحميل نموذج v${version} للبند ${item}.`,
    templateMissing:
      "لا يوجد نموذج نشط لهذا البند. يمكنك إرسال الطلب بالبيانات الأساسية الآن، وسيظهر نموذج مخصص بعد تفعيله من فريق جزوم.",
    templateVersion: "إصدار النموذج",
    title: "العنوان",
    trackDescription: "كل بطاقة تحفظ مسار تفاصيل الطلب وإجراءات سير العمل الأصلية بدون تغيير.",
    trackProgress: "تابع مسار الطلب والتحديثات.",
    uploadDocuments: "ارفع المستندات المطلوبة للمتابعة.",
    visibleRequests: "الطلبات الظاهرة",
    waitingForYou: "بانتظارك",
    workUnderway: "فريق جزوم يعمل على الطلب.",
  },
  en: {
    activeSubscribedEmpty: "No active subscribed services are available for request creation yet.",
    allServices: "All services",
    allStatuses: "All statuses",
    auto: "Auto",
    availableForIntake: "Available for intake",
    clearFilters: "Clear filters",
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
    comments: "Comments",
    draftLoaded: "Your saved draft on this device was restored.",
    draftSaved: "Draft saved on this device.",
    exactItem: "Service item",
    expectedOutput: "Expected output",
    deliverables: "Deliverables",
    documents: "Documents",
    files: "Files",
    generalItem: "General service request - no specific item",
    generalItemNotice:
      "General requests are routed to Jzoom for triage when the work does not match a specific service item.",
    generalTemplateNotice:
      "General service request selected. The generic request form will be used.",
    includedItems: "Included service items",
    itemAttachmentHint: "attachment details may be required.",
    latestOrder: "Based on current list order",
    loadingTemplate: "Loading request template...",
    monthlyHours: "Monthly hours",
    noRequests: "No visible requests",
    noRequestsBody: "No requests are currently visible for this account.",
    noAction: "No action is required now.",
    noFilteredRequests: "No matching requests",
    noFilteredRequestsBody: "Adjust search or filters to show more requests.",
    noSubscribedServices: "No subscribed services",
    openOnService: "Open on service",
    openRequests: "Open requests",
    optionalFields: "Optional fields",
    optionalReference: "Optional quote or invoice link",
    priority: "Priority",
    quoteReferenceId: "Quote reference",
    invoiceReferenceId: "Invoice reference",
    review: "Review",
    requestDetails: "Request details",
    requestDetailsStep: "Step 2 of 3 - describe what you need in plain language.",
    requestIntake: "Request intake",
    requestJourney: "Request journey",
    requestLibrary: "Request library",
    requestNextStep: "Next step",
    requestStats: "Request stats",
    requestSetup: "Request setup",
    requestUpdated: "Last updated",
    requests: "Requests",
    reviewStep: "Step 3 of 3 - review the details and submit the request.",
    reviewOutputs: "Review deliverables shared by Jzoom.",
    requiredDocuments: "Documents",
    requiredFields: "Required fields",
    saveDraft: "Save draft",
    searchPlaceholder: "Search by request number, title, or service...",
    selectedService: "Selected service",
    selectedServiceItem: "Selected work item",
    selectedServiceSummary: "Selected service summary",
    service: "Service",
    serviceDescription:
      "Pick the service closest to your need. Jzoom will route the request to the right team and show any item-specific questions automatically.",
    serviceIntro: "Create, track, and review service requests tied to your active subscriptions.",
    serviceStep: "Step 1 of 3 - choose the subscribed service and the exact work item.",
    stillActive: "Still active",
    submit: "Submit request to Jzoom",
    subscribedServices: "Subscribed services",
    templateFields: "Template fields",
    templateReady: "Template ready",
    templateLoaded: (version: number, item: string) => `Loaded template v${version} for ${item}.`,
    templateMissing:
      "No active template exists for this item. You can submit the request with the basic fields now; a custom form will appear after Jzoom activates it.",
    templateVersion: "Template version",
    title: "Title",
    trackDescription:
      "Every row keeps the original request detail route and workflow actions available.",
    trackProgress: "Track the request timeline and updates.",
    uploadDocuments: "Upload requested documents to continue.",
    visibleRequests: "Visible requests",
    waitingForYou: "Waiting for you",
    workUnderway: "Jzoom is working on the request.",
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
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "">("");
  const [serviceFilter, setServiceFilter] = useState("");
  const draftKey = `jzoom.client.requestDraft.${account.user.id}`;
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
  const waitingClientRequests = items.filter(
    (request) => request.status === "WAITING_CLIENT",
  ).length;
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
      window.localStorage.removeItem(draftKey);
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
      <PageHeader eyebrow={t.clientServiceCenter} title={t.requests} description={t.serviceIntro} />

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
          <form className="catalog-form wide-form client-request-form" onSubmit={submit}>
            <div className="request-intake-steps form-span" aria-label={t.requestSetup}>
              <div className="active">
                <span>1</span>
                <strong>{t.service}</strong>
                <small>{t.serviceStep}</small>
              </div>
              <div>
                <span>2</span>
                <strong>{t.requestDetails}</strong>
                <small>{t.requestDetailsStep}</small>
              </div>
              <div>
                <span>3</span>
                <strong>{t.review}</strong>
                <small>{t.reviewStep}</small>
              </div>
            </div>

            <div className="client-request-readiness form-span">
              <div>
                <span>{t.selectedService}</span>
                <strong>{selectedService ? serviceLabel(selectedService, locale) : t.auto}</strong>
              </div>
              <div>
                <span>{t.selectedServiceItem}</span>
                <strong>
                  {selectedServiceItem ? clientName(selectedServiceItem, locale) : t.generalItem}
                </strong>
              </div>
              <div>
                <span>{t.templateFields}</span>
                <strong>{activeTemplate ? t.templateReady : t.auto}</strong>
              </div>
            </div>

            <div className="request-intake-layout form-span">
              <section className="request-intake-panel">
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

              <aside className="request-intake-panel request-selected-card">
                <div className="request-panel-heading compact">
                  <span>{t.auto}</span>
                  <div>
                    <h3>{t.selectedServiceSummary}</h3>
                    <p>{selectedClient?.code ?? t.client}</p>
                  </div>
                </div>
                {selectedService && (
                  <>
                    <strong>{serviceLabel(selectedService, locale)}</strong>
                    <p>
                      {localizedServiceDescription({
                        description: selectedService.service.description,
                        domain: selectedService.service.domain,
                        locale,
                        name: clientName(selectedService.service, locale),
                        serviceLine: selectedService.service.serviceLine,
                      })}
                    </p>
                    <div className="request-mini-metrics">
                      <span>
                        <small>{t.monthlyHours}</small>
                        <strong>{clientNumber(selectedService.hoursAllocated, locale)}</strong>
                      </span>
                      <span>
                        <small>{t.openOnService}</small>
                        <strong>{clientNumber(selectedServiceOpenRequests, locale)}</strong>
                      </span>
                      <span>
                        <small>{t.includedItems}</small>
                        <strong>{clientNumber(selectedServiceItems.length, locale)}</strong>
                      </span>
                      <span>
                        <small>{t.templateFields}</small>
                        <strong>
                          {activeTemplate
                            ? clientNumber(activeTemplate.fields.length, locale)
                            : t.auto}
                        </strong>
                      </span>
                    </div>
                    <div className="hours-strip">
                      <span>{clientName(selectedService.service.category, locale)}</span>
                      <span>{selectedService.service.domain}</span>
                    </div>
                  </>
                )}
              </aside>
            </div>

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
              <details>
                <summary>{t.optionalReference}</summary>
                <div className="request-field-grid">
                  <label>
                    {t.quoteReferenceId}
                    <input
                      value={form.sourceQuoteId}
                      onChange={(event) => setForm({ ...form, sourceQuoteId: event.target.value })}
                    />
                  </label>
                  <label>
                    {t.invoiceReferenceId}
                    <input
                      value={form.sourceInvoiceId}
                      onChange={(event) =>
                        setForm({ ...form, sourceInvoiceId: event.target.value })
                      }
                    />
                  </label>
                </div>
              </details>
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
              <div className="quote-list-grid">
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
