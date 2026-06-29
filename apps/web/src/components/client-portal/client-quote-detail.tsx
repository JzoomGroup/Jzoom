import Link from "next/link";
import { clientQuotePdfUrl } from "../../lib/client-portal-client";
import type { ClientQuote } from "../../lib/client-portal-types";
import { PageHeader, SectionCard, SmartTable, StatusChip } from "../premium-os";
import {
  clientCurrency,
  clientDate,
  clientLocale,
  clientName,
  clientNumber,
  localizedLineType,
  quoteStatusLabel,
} from "./client-format";

const copy = {
  ar: {
    allQuotes: "كل العروض",
    approver: "المعتمد",
    base: "الأساس",
    clientDetails: "بيانات العميل",
    code: "الرمز",
    commercialTerms: "الشروط التجارية",
    delivery: "التسليم",
    description:
      "يعرض هذا العرض من النسخة المحفوظة للقراءة فقط. الموافقة والدفع تتم خارج النظام قبل إنشاء حساب العميل.",
    discount: "الخصم",
    estimatedTax: "الضريبة التقديرية",
    finalTotal: "الإجمالي النهائي",
    financialSnapshot: "الملخص المالي",
    noValue: "غير محدد",
    oneTime: "مرة واحدة",
    payment: "الدفع",
    quantity: "الكمية",
    quoteLines: "بنود العرض",
    quoteSnapshot: "نسخة العرض",
    selectedServices: "الخدمات المختارة",
    service: "الخدمة",
    setup: "التأسيس",
    setupFees: "رسوم التأسيس",
    total: "الإجمالي",
    totals: "الإجماليات",
    typePackage: "النوع / الباقة",
    validUntil: "صالح حتى",
    viewPdf: "عرض PDF",
  },
  en: {
    allQuotes: "All quotes",
    approver: "Approver",
    base: "Base",
    clientDetails: "Client details",
    code: "Code",
    commercialTerms: "Commercial terms",
    delivery: "Delivery",
    description:
      "This quote is displayed as a read-only stored snapshot. Approval and payment happen outside the portal before the client account is created.",
    discount: "Discount",
    estimatedTax: "Estimated tax",
    finalTotal: "Final total",
    financialSnapshot: "Financial snapshot",
    noValue: "Not specified",
    oneTime: "One-time",
    payment: "Payment",
    quantity: "Quantity",
    quoteLines: "Quote lines",
    quoteSnapshot: "Quote snapshot",
    selectedServices: "Selected services",
    service: "Service",
    setup: "Setup",
    setupFees: "Setup fees",
    total: "Total",
    totals: "Totals",
    typePackage: "Type / package",
    validUntil: "Valid until",
    viewPdf: "View PDF",
  },
} as const;

export function ClientQuoteDetail({
  locale: localeInput = "en",
  quote,
}: {
  locale?: string;
  quote: ClientQuote;
}) {
  const locale = clientLocale(localeInput);
  const t = copy[locale];

  return (
    <>
      <PageHeader
        eyebrow={t.quoteSnapshot}
        title={quote.quoteNumber}
        description={t.description}
        meta={<StatusChip status={quote.status} label={quoteStatusLabel(quote.status, locale)} />}
      >
        <div className="quote-header-actions">
          <a
            className="os-button os-button-primary"
            href={clientQuotePdfUrl(quote.id)}
            target="_blank"
            rel="noreferrer"
          >
            {t.viewPdf}
          </a>
          <Link className="os-button os-button-secondary" href="/client/quotes">
            {t.allQuotes}
          </Link>
        </div>
      </PageHeader>

      <section className="quote-summary-grid">
        <SectionCard eyebrow={t.clientDetails} title={quote.client.legalName ?? quote.client.name}>
          <dl className="quote-definition-list">
            <div>
              <dt>{t.code}</dt>
              <dd>{quote.client.code}</dd>
            </div>
            <div>
              <dt>{locale === "ar" ? "القطاع" : "Sector"}</dt>
              <dd>{quote.client.sector ?? t.noValue}</dd>
            </div>
            <div>
              <dt>{t.approver}</dt>
              <dd>{quote.client.authorizedApprover ?? t.noValue}</dd>
            </div>
          </dl>
        </SectionCard>
        <SectionCard eyebrow={locale === "ar" ? "الشروط" : "Terms"} title={t.commercialTerms}>
          <dl className="quote-definition-list">
            <div>
              <dt>{t.validUntil}</dt>
              <dd>{clientDate(quote.terms.validUntil ?? quote.validUntil, locale)}</dd>
            </div>
            <div>
              <dt>{t.payment}</dt>
              <dd>{quote.terms.paymentTerms}</dd>
            </div>
            <div>
              <dt>{t.delivery}</dt>
              <dd>{quote.terms.deliveryTerms ?? t.noValue}</dd>
            </div>
          </dl>
        </SectionCard>
      </section>

      <SectionCard
        eyebrow={t.quoteLines}
        title={t.selectedServices}
        description={
          locale === "ar"
            ? `${clientNumber(quote.items.length, locale)} بند خدمة محفوظ في النسخة.`
            : `${quote.items.length} snapshotted service lines.`
        }
      >
        <SmartTable>
          <table className="catalog-table pricing-lines">
            <thead>
              <tr>
                <th>{t.service}</th>
                <th>{t.typePackage}</th>
                <th>{t.quantity}</th>
                <th>{t.base}</th>
                <th>{t.setup}</th>
                <th>{t.total}</th>
              </tr>
            </thead>
            <tbody>
              {quote.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{clientName(item.serviceSnapshot, locale)}</strong>
                    <small>{item.serviceSnapshot.serviceCode}</small>
                    {item.serviceItems.length > 0 && (
                      <ul className="quote-service-items">
                        {item.serviceItems.map((serviceItem) => (
                          <li key={serviceItem.itemCode}>{clientName(serviceItem, locale)}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td>
                    {localizedLineType(item.lineType, locale)}
                    <small>{item.serviceSnapshot.serviceLevelLabel ?? "-"}</small>
                  </td>
                  <td>{clientNumber(item.quantity, locale)}</td>
                  <td>{clientCurrency(item.serviceSnapshot.baseAmount, locale)}</td>
                  <td>{clientCurrency(item.setupFee, locale)}</td>
                  <td>{clientCurrency(item.lineTotal, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SmartTable>
      </SectionCard>

      <SectionCard eyebrow={t.financialSnapshot} title={t.totals}>
        <div className="pricing-total-grid">
          <div>
            <span>{locale === "ar" ? "شهري" : "Monthly"}</span>
            <strong>{clientCurrency(quote.totals.subtotalMonthly, locale)}</strong>
          </div>
          <div>
            <span>{t.setupFees}</span>
            <strong>{clientCurrency(quote.totals.subtotalSetup, locale)}</strong>
          </div>
          <div>
            <span>{t.oneTime}</span>
            <strong>{clientCurrency(quote.totals.subtotalOneTime, locale)}</strong>
          </div>
          <div>
            <span>{t.discount}</span>
            <strong>- {clientCurrency(quote.totals.discountTotal, locale)}</strong>
          </div>
          <div>
            <span>{t.estimatedTax}</span>
            <strong>{clientCurrency(quote.totals.taxTotal, locale)}</strong>
          </div>
          <div className="primary">
            <span>{t.finalTotal}</span>
            <strong>{clientCurrency(quote.totals.finalTotal, locale)}</strong>
          </div>
        </div>
      </SectionCard>
    </>
  );
}
