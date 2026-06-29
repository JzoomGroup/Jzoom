import Link from "next/link";
import type {
  ClientInvoiceSummary,
  ClientPortalAccount,
  ClientPortalAvailableMonthlyService,
  ClientPortalAvailableOneTimeService,
  ClientPortalSubscribedMonthlyService,
  ClientQuoteSummary,
} from "../../lib/client-portal-types";
import { localizedFreeText, localizedServiceDescription } from "./client-format";
import { normalizeLocale, type SupportedLocale } from "../../lib/i18n";
import type { RequestSummary } from "../../lib/request-types";
import {
  BentoGrid,
  EmptyState,
  MetricCard,
  PageHeader,
  SectionCard,
  StatusChip,
} from "../premium-os";

const clientCopy = {
  ar: {
    active: "نشطة",
    activeMonthlyServices: "الخدمات الشهرية النشطة",
    activeServices: "الخدمات النشطة",
    accountContext: "بيانات الحساب",
    allocatedSubscriptionHours: "ساعات الاشتراك المخصصة",
    authorizedApprover: "المعتمد",
    available: "متاحة",
    availableServices: "الخدمات المتاحة",
    billingRecords: "سجلات الفوترة",
    catalogOptions: "خيارات الكتالوج",
    clientActionRequired: "مطلوب إجراء من العميل",
    clientActions: "إجراءات العميل",
    clientCode: "رمز العميل",
    clientServiceCenter: "مركز خدمة العميل",
    closedOrCompleted: "مغلقة أو مكتملة",
    commercialSnapshots: "السجلات التجارية",
    completed: "مكتملة",
    createNewRequest: "إنشاء طلب جديد",
    createRequest: "إنشاء طلب",
    currentlyActive: "نشطة حاليًا",
    duration: "المدة",
    email: "البريد الإلكتروني",
    hours: "الساعات",
    includedItems: "البنود المشمولة",
    invoices: "الفواتير",
    issuedCommercialRecords: "عروض تجارية صادرة",
    latestInvoice: "آخر فاتورة",
    latestWork: "آخر الأعمال",
    level: "الباقة",
    line: "المسار",
    monthly: "شهري",
    monthlyHours: "الساعات الشهرية",
    myServices: "خدماتي",
    needsAttention: "تحتاج انتباهك",
    noActiveServices: "لم يتم تعيين خدمات اشتراك نشطة حتى الآن.",
    noCatalogServices: "لا توجد خدمات كتالوج نشطة متاحة حتى الآن.",
    noClientAction: "لا توجد إجراءات مطلوبة منك الآن.",
    noClientActionDetail: "سننبهك هنا عند احتياج أي طلب إلى رد أو مستند منك.",
    noOpenRequests: "لا توجد طلبات مفتوحة",
    noOpenRequestsDetail: "تبقى الأعمال المكتملة متاحة داخل الطلبات والتقارير.",
    notSet: "غير محدد",
    notSpecified: "غير مذكور",
    oneTime: "مرة واحدة",
    open: "مفتوحة",
    openRecords: "سجلات مفتوحة",
    openRequest: "فتح الطلب",
    openRequests: "طلبات مفتوحة",
    pageDescription:
      "مركز تشغيلي واضح يجمع خدماتك وطلباتك ومستنداتك ومخرجاتك وعروضك وفواتيرك وتقاريرك في مساحة واحدة.",
    pending: "قيد الانتظار",
    price: "القيمة",
    quotes: "العروض",
    rate: "السعر",
    serviceCatalog: "كتالوج الخدمات",
    sla: "اتفاقية الخدمة",
    subscribedMonthlyServices: "خدمات شهرية مشتركة",
    type: "النوع",
    viewDetails: "عرض التفاصيل",
    viewInvoices: "عرض الفواتير",
    viewQuotes: "عرض العروض",
    waitingOnYou: "بانتظارك",
    welcome: (name: string) => `مرحبًا، ${name}`,
  },
  en: {
    active: "active",
    activeMonthlyServices: "Active monthly services",
    activeServices: "Active services",
    accountContext: "Account context",
    allocatedSubscriptionHours: "Allocated subscription hours",
    authorizedApprover: "Authorized approver",
    available: "available",
    availableServices: "Available services",
    billingRecords: "Billing records",
    catalogOptions: "Catalog options",
    clientActionRequired: "Client action required",
    clientActions: "Client actions",
    clientCode: "Client code",
    clientServiceCenter: "Client service center",
    closedOrCompleted: "Closed or completed",
    commercialSnapshots: "Commercial snapshots",
    completed: "Completed",
    createNewRequest: "Create new request",
    createRequest: "Create request",
    currentlyActive: "Currently active",
    duration: "Duration",
    email: "Email",
    hours: "Hours",
    includedItems: "Included items",
    invoices: "Invoices",
    issuedCommercialRecords: "Issued commercial records",
    latestInvoice: "Latest invoice",
    latestWork: "Latest work",
    level: "Level",
    line: "Line",
    monthly: "Monthly",
    monthlyHours: "Monthly hours",
    myServices: "My services",
    needsAttention: "Needs attention",
    noActiveServices: "No active subscription services are assigned yet.",
    noCatalogServices: "No active catalog services are available yet.",
    noClientAction: "No client action is pending.",
    noClientActionDetail: "Jzoom will update you when a request needs a response or document.",
    noOpenRequests: "No open requests",
    noOpenRequestsDetail: "Your completed work remains available in requests and reports.",
    notSet: "Not set",
    notSpecified: "Not specified",
    oneTime: "One-time",
    open: "open",
    openRecords: "Open records",
    openRequest: "Open request",
    openRequests: "Open requests",
    pageDescription:
      "A clear operating center for your services, requests, documents, outputs, quotes, invoices, and reports.",
    pending: "pending",
    price: "Price",
    quotes: "Quotes",
    rate: "Rate",
    serviceCatalog: "Service catalog",
    sla: "SLA",
    subscribedMonthlyServices: "Subscribed monthly services",
    type: "Type",
    viewDetails: "View details",
    viewInvoices: "View invoices",
    viewQuotes: "View quotes",
    waitingOnYou: "Waiting on you",
    welcome: (name: string) => `Welcome, ${name}`,
  },
} as const;

type ClientCopy = (typeof clientCopy)[SupportedLocale];

const requestStatusLabels = {
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
} satisfies Record<RequestSummary["status"], Record<SupportedLocale, string>>;

function formatNumber(value: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-SA").format(value);
}

function formatCurrency(value: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    currency: "SAR",
    maximumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

function formatDate(value: string | null, locale: SupportedLocale, copy: ClientCopy): string {
  if (!value) return copy.notSet;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-SA").format(new Date(value));
}

function formatHours(value: number, locale: SupportedLocale): string {
  return locale === "ar"
    ? `${formatNumber(value, locale)} ساعة`
    : `${formatNumber(value, locale)}h`;
}

function formatDays(value: number, locale: SupportedLocale): string {
  return locale === "ar"
    ? `${formatNumber(value, locale)} يوم`
    : `${formatNumber(value, locale)}d`;
}

function localizedName(
  value: { nameAr: string; nameEn: string },
  locale: SupportedLocale,
): string {
  return locale === "ar" ? value.nameAr || value.nameEn : value.nameEn || value.nameAr;
}

function localizedLevel(
  value: { labelAr: string; labelEn: string | null },
  locale: SupportedLocale,
): string {
  return locale === "ar" ? value.labelAr || value.labelEn || "" : value.labelEn || value.labelAr;
}

function statusLabel(status: RequestSummary["status"], locale: SupportedLocale): string {
  return requestStatusLabels[status]?.[locale] ?? status;
}

function SubscribedServiceCard({
  copy,
  locale,
  service,
}: {
  copy: ClientCopy;
  locale: SupportedLocale;
  service: ClientPortalSubscribedMonthlyService;
}) {
  return (
    <article className="entity-card">
      <div className="entity-card-heading">
        <div>
          <small>{localizedName(service.service.category, locale)}</small>
          <h3>{localizedName(service.service, locale)}</h3>
        </div>
        <span>{service.service.code}</span>
      </div>
      <dl className="entity-meta four-up">
        <div>
          <dt>{copy.level}</dt>
          <dd>{localizedLevel(service.serviceLevel, locale)}</dd>
        </div>
        <div>
          <dt>{copy.hours}</dt>
          <dd>{formatNumber(service.hoursAllocated, locale)}</dd>
        </div>
        <div>
          <dt>{copy.line}</dt>
          <dd>{locale === "ar" ? "مسار الخدمة" : service.service.serviceLine}</dd>
        </div>
        <div>
          <dt>{copy.clientCode}</dt>
          <dd>{service.client.code}</dd>
        </div>
      </dl>
      {service.serviceItems.length > 0 && (
        <div className="entity-meta">
          <div>
            <dt>{copy.includedItems}</dt>
            <dd>{service.serviceItems.map((item) => localizedName(item, locale)).join(", ")}</dd>
          </div>
        </div>
      )}
      <div className="row-actions">
        <Link className="os-button os-button-secondary" href="/client/requests">
          {copy.createRequest}
        </Link>
      </div>
    </article>
  );
}

function AvailableMonthlyCard({
  copy,
  locale,
  service,
}: {
  copy: ClientCopy;
  locale: SupportedLocale;
  service: ClientPortalAvailableMonthlyService;
}) {
  return (
    <article className="entity-card">
      <div className="entity-card-heading">
        <div>
          <small>{localizedName(service.category, locale)}</small>
          <h3>{localizedName(service, locale)}</h3>
        </div>
        <span>{service.code}</span>
      </div>
      <dl className="entity-meta four-up">
        <div>
          <dt>{copy.type}</dt>
          <dd>{copy.monthly}</dd>
        </div>
        <div>
          <dt>{copy.rate}</dt>
          <dd>{formatCurrency(service.sellingHourlyRateSar, locale)}</dd>
        </div>
        <div>
          <dt>{copy.sla}</dt>
          <dd>{formatHours(service.defaultSlaHours, locale)}</dd>
        </div>
        <div>
          <dt>{copy.level}</dt>
          <dd>{formatNumber(service.levels.length, locale)}</dd>
        </div>
      </dl>
      <p>
        {localizedServiceDescription({
          description: service.description,
          domain: service.domain,
          locale,
          name: localizedName(service, locale),
          serviceLine: service.serviceLine,
        })}
      </p>
    </article>
  );
}

function AvailableOneTimeCard({
  copy,
  locale,
  service,
}: {
  copy: ClientCopy;
  locale: SupportedLocale;
  service: ClientPortalAvailableOneTimeService;
}) {
  return (
    <article className="entity-card">
      <div className="entity-card-heading">
        <div>
          <small>{localizedName(service.category, locale)}</small>
          <h3>{localizedName(service, locale)}</h3>
        </div>
        <span>{service.code}</span>
      </div>
      <dl className="entity-meta four-up">
        <div>
          <dt>{copy.type}</dt>
          <dd>{copy.oneTime}</dd>
        </div>
        <div>
          <dt>{copy.price}</dt>
          <dd>{formatCurrency(service.basePriceSar, locale)}</dd>
        </div>
        <div>
          <dt>{copy.hours}</dt>
          <dd>{formatNumber(service.estimatedHours, locale)}</dd>
        </div>
        <div>
          <dt>{copy.duration}</dt>
          <dd>{formatDays(service.durationDays, locale)}</dd>
        </div>
      </dl>
      <p>
        {localizedServiceDescription({
          description: service.description,
          locale,
          name: localizedName(service, locale),
          serviceLine: service.serviceLine,
        })}
      </p>
    </article>
  );
}

export function ClientOverview({
  account,
  invoices,
  locale: localeInput,
  quotes,
  requests,
}: {
  account: ClientPortalAccount;
  invoices: ClientInvoiceSummary[];
  locale?: string;
  quotes: ClientQuoteSummary[];
  requests: RequestSummary[];
}) {
  const locale = normalizeLocale(localeInput ?? account.user.preferredLocale);
  const copy = clientCopy[locale];
  const availableCount =
    account.services.availableMonthly.length + account.services.availableOneTime.length;
  const openRequests = requests.filter(
    (request) => !["CLOSED", "COMPLETED", "REJECTED"].includes(request.status),
  );
  const waitingClientRequests = requests.filter((request) => request.status === "WAITING_CLIENT");
  const completedRequests = requests.filter((request) =>
    ["COMPLETED", "CLOSED"].includes(request.status),
  );
  const latestOpenRequests = openRequests.slice(0, 3);
  const subscribedHours = account.services.subscribedMonthly.reduce(
    (total, service) => total + service.hoursAllocated,
    0,
  );
  const accountTitle = account.clients[0]?.name ?? copy.accountContext;

  return (
    <>
      <PageHeader
        eyebrow={copy.clientServiceCenter}
        title={copy.welcome(account.user.displayName)}
        description={copy.pageDescription}
        actions={[{ href: "/client/requests", label: copy.createNewRequest, variant: "primary" }]}
      />

      <h2 className="sr-only">{`${copy.openRequests} / ${copy.activeServices}`}</h2>
      <BentoGrid>
        <MetricCard
          label={copy.openRequests}
          value={formatNumber(openRequests.length, locale)}
          detail={copy.currentlyActive}
          accent
        />
        <MetricCard
          label={copy.waitingOnYou}
          value={formatNumber(waitingClientRequests.length, locale)}
          detail={copy.clientActionRequired}
        />
        <MetricCard
          label={copy.completed}
          value={formatNumber(completedRequests.length, locale)}
          detail={copy.closedOrCompleted}
        />
        <MetricCard
          label={copy.activeServices}
          value={formatNumber(account.services.subscribedMonthly.length, locale)}
          detail={copy.subscribedMonthlyServices}
        />
        <MetricCard
          label={copy.monthlyHours}
          value={formatNumber(subscribedHours, locale)}
          detail={copy.allocatedSubscriptionHours}
        />
        <MetricCard
          label={copy.quotes}
          value={formatNumber(quotes.length, locale)}
          detail={copy.issuedCommercialRecords}
        />
        <MetricCard
          label={copy.invoices}
          value={formatNumber(invoices.length, locale)}
          detail={copy.billingRecords}
        />
        <MetricCard
          label={copy.availableServices}
          value={formatNumber(availableCount, locale)}
          detail={copy.catalogOptions}
        />
      </BentoGrid>

      <section className="quote-summary-grid">
        <SectionCard
          eyebrow={copy.needsAttention}
          title={copy.clientActions}
          action={
            <StatusChip
              status="WAITING_CLIENT"
              label={`${formatNumber(waitingClientRequests.length, locale)} ${copy.pending}`}
            />
          }
        >
          <div className="activity-list">
            {waitingClientRequests.length === 0 ? (
              <EmptyState title={copy.noClientAction}>{copy.noClientActionDetail}</EmptyState>
            ) : (
              waitingClientRequests.slice(0, 4).map((request) => (
                <article key={request.id}>
                  <strong>{localizedFreeText(request.title, locale, "طلب خدمة")}</strong>
                  <small>
                    {request.requestNumber} · {localizedName(request.service.monthlyService, locale)}
                  </small>
                  <div className="row-actions">
                    <Link className="os-button os-button-secondary" href={`/client/requests/${request.id}`}>
                      {copy.openRequest}
                    </Link>
                  </div>
                </article>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow={copy.latestWork}
          title={copy.openRequests}
          action={
            <StatusChip
              status="IN_PROGRESS"
              label={`${formatNumber(openRequests.length, locale)} ${copy.open}`}
            />
          }
        >
          <div className="activity-list">
            {latestOpenRequests.length === 0 ? (
              <EmptyState title={copy.noOpenRequests}>{copy.noOpenRequestsDetail}</EmptyState>
            ) : (
              latestOpenRequests.map((request) => (
                <article key={request.id}>
                  <strong>{localizedFreeText(request.title, locale, "طلب خدمة")}</strong>
                  <small>
                    {statusLabel(request.status, locale)} · {formatDate(request.dueAt, locale, copy)}
                  </small>
                  <div className="row-actions">
                    <Link className="os-button os-button-secondary" href={`/client/requests/${request.id}`}>
                      {copy.viewDetails}
                    </Link>
                  </div>
                </article>
              ))
            )}
          </div>
        </SectionCard>
      </section>

      <section className="quote-summary-grid">
        <SectionCard eyebrow={copy.accountContext} title={accountTitle}>
          <dl className="quote-definition-list">
            <div>
              <dt>{copy.email}</dt>
              <dd>{account.user.email}</dd>
            </div>
            <div>
              <dt>{copy.clientCode}</dt>
              <dd>{account.clients.map((client) => client.code).join(", ")}</dd>
            </div>
            <div>
              <dt>{copy.authorizedApprover}</dt>
              <dd>{account.clients[0]?.authorizedApprover ?? copy.notSpecified}</dd>
            </div>
          </dl>
        </SectionCard>
        <SectionCard eyebrow={copy.openRecords} title={copy.commercialSnapshots}>
          <div className="pricing-total-grid">
            <div>
              <span>{copy.quotes}</span>
              <strong>{formatNumber(quotes.length, locale)}</strong>
            </div>
            <div>
              <span>{copy.invoices}</span>
              <strong>{formatNumber(invoices.length, locale)}</strong>
            </div>
            <div className="primary">
              <span>{copy.latestInvoice}</span>
              <strong>{invoices[0] ? formatCurrency(invoices[0].finalDueNoTax, locale) : "-"}</strong>
            </div>
          </div>
          <div className="row-actions">
            <Link className="os-button os-button-secondary" href="/client/quotes">
              {copy.viewQuotes}
            </Link>
            <Link className="os-button os-button-secondary" href="/client/invoices">
              {copy.viewInvoices}
            </Link>
          </div>
        </SectionCard>
      </section>

      <SectionCard
        eyebrow={copy.myServices}
        title={copy.activeMonthlyServices}
        action={
          <StatusChip
            status="ACTIVE"
            label={`${formatNumber(account.services.subscribedMonthly.length, locale)} ${copy.active}`}
          />
        }
      >
        {account.services.subscribedMonthly.length === 0 ? (
          <EmptyState>{copy.noActiveServices}</EmptyState>
        ) : (
          <div className="entity-grid service-grid">
            {account.services.subscribedMonthly.map((service) => (
              <SubscribedServiceCard key={service.id} copy={copy} locale={locale} service={service} />
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        eyebrow={copy.availableServices}
        title={copy.serviceCatalog}
        action={
          <StatusChip
            status="ACTIVE"
            label={`${formatNumber(availableCount, locale)} ${copy.available}`}
          />
        }
      >
        {availableCount === 0 ? (
          <EmptyState>{copy.noCatalogServices}</EmptyState>
        ) : (
          <div className="entity-grid service-grid">
            {account.services.availableMonthly.map((service) => (
              <AvailableMonthlyCard key={service.id} copy={copy} locale={locale} service={service} />
            ))}
            {account.services.availableOneTime.map((service) => (
              <AvailableOneTimeCard key={service.id} copy={copy} locale={locale} service={service} />
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}
