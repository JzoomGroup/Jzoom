import { clientCopy } from "../../i18n/dictionaries/client-portal";
import Link from "next/link";
import type { ClientPortalAccount } from "../../lib/client-portal-types";
import { localizedFreeText } from "./client-format";
import { normalizeLocale, platformTimeZone, type SupportedLocale } from "../../lib/i18n";
import type { RequestSummary } from "../../lib/request-types";
import {
  BentoGrid,
  EmptyState,
  MetricCard,
  PageHeader,
  SectionCard,
  StatusChip,
} from "../premium-os";

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
  return new Intl.NumberFormat(
    locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-SA-u-ca-gregory-nu-latn",
  ).format(value);
}

function formatDate(value: string | null, locale: SupportedLocale, copy: ClientCopy): string {
  if (!value) return copy.notSet;
  return new Intl.DateTimeFormat(
    locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-SA-u-ca-gregory-nu-latn",
    {
      timeZone: platformTimeZone,
    },
  ).format(new Date(value));
}

function localizedName(value: { nameAr: string; nameEn: string }, locale: SupportedLocale): string {
  return locale === "ar" ? value.nameAr || value.nameEn : value.nameEn || value.nameAr;
}

function statusLabel(status: RequestSummary["status"], locale: SupportedLocale): string {
  return requestStatusLabels[status]?.[locale] ?? status;
}

export function ClientOverview({
  account,
  locale: localeInput,
  requests,
}: {
  account: ClientPortalAccount;
  locale?: string;
  requests: RequestSummary[];
}) {
  const locale = normalizeLocale(localeInput ?? account.user.preferredLocale);
  const copy = clientCopy[locale];
  const openRequests = requests.filter(
    (request) => !["CLOSED", "COMPLETED", "REJECTED"].includes(request.status),
  );
  const waitingClientRequests = requests.filter((request) => request.status === "WAITING_CLIENT");
  const completedRequests = requests.filter((request) =>
    ["COMPLETED", "CLOSED"].includes(request.status),
  );
  const latestOpenRequests = openRequests.slice(0, 3);

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
                    {request.requestNumber} ·{" "}
                    {localizedName(request.service.monthlyService, locale)}
                  </small>
                  <div className="row-actions">
                    <Link
                      className="os-button os-button-secondary"
                      href={`/client/requests/${request.id}`}
                    >
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
                    {statusLabel(request.status, locale)} ·{" "}
                    {formatDate(request.dueAt, locale, copy)}
                  </small>
                  <div className="row-actions">
                    <Link
                      className="os-button os-button-secondary"
                      href={`/client/requests/${request.id}`}
                    >
                      {copy.viewDetails}
                    </Link>
                  </div>
                </article>
              ))
            )}
          </div>
        </SectionCard>
      </section>
    </>
  );
}
