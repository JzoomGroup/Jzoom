"use client";

import Link from "next/link";
import { useState } from "react";
import { quotePdfUrl } from "../../lib/quote-client";
import type { Quote } from "../../lib/quote-types";
import {
  businessText,
  commercialCopy,
  commercialLocale,
  countText,
  dateText,
  hashText,
  levelLabel,
  lineTypeLabel,
  money,
  quoteStatusLabel,
  serviceName,
} from "../commercial-i18n";
import { CreateInvoiceAction } from "../invoices/create-invoice-action";
import { PageHeader, SectionCard, SmartTable, StatusChip } from "../premium-os";
import { QuoteLifecycleActions } from "./quote-lifecycle-actions";

export function QuoteDetail({
  initialQuote,
  locale: localeInput = "en",
}: {
  initialQuote: Quote;
  locale?: string;
}) {
  const locale = commercialLocale(localeInput);
  const t = commercialCopy[locale];
  const [quote, setQuote] = useState(initialQuote);

  return (
    <>
      <PageHeader
        eyebrow={t.quoteSnapshot}
        title={quote.quoteNumber}
        description={t.quoteCreatedFrom(
          businessText(
            quote.sourceDraft.title,
            locale,
            locale === "ar" ? "مسودة التسعير" : "Pricing draft",
          ),
          quote.sourceDraftVersion,
          hashText(quote.snapshotHash, locale),
        )}
        meta={<StatusChip status={quote.status} label={quoteStatusLabel(quote.status, locale)} />}
      >
        <div className="quote-header-actions">
          <a
            className="os-button os-button-primary"
            href={quotePdfUrl(quote.id)}
            target="_blank"
            rel="noreferrer"
          >
            {t.viewPdf}
          </a>
          <CreateInvoiceAction locale={locale} quote={quote} />
          <Link
            className="os-button os-button-secondary"
            href={`/pricing/${quote.sourcePricingDraftId}`}
          >
            {t.sourceDraft}
          </Link>
          <Link className="os-button os-button-secondary" href="/pricing/quotes">
            {t.allQuotes}
          </Link>
        </div>
      </PageHeader>

      {quote.status === "DRAFT" || quote.status === "ISSUED" ? (
        <SectionCard
          eyebrow={t.governance}
          title={t.lifecycle}
          description={
            locale === "ar"
              ? "إصدار العرض وتأكيد موافقة العميل والدفع خارج النظام أو رفضه أو إنهاء صلاحيته أو إلغاؤه تُسجل ولا تعيد كتابة محتوى العرض."
              : "Issuing, external approval/payment confirmation, rejection, expiration, and cancellation are audited and never rewrite quote content."
          }
        >
          <QuoteLifecycleActions
            locale={locale}
            quoteId={quote.id}
            status={quote.status}
            onUpdated={setQuote}
          />
        </SectionCard>
      ) : null}

      <section className="quote-summary-grid">
        <SectionCard eyebrow={t.clientSnapshot} title={quote.client.name}>
          <dl className="quote-definition-list">
            <div>
              <dt>{t.code}</dt>
              <dd>{quote.client.code}</dd>
            </div>
            <div>
              <dt>{t.legalName}</dt>
              <dd>{quote.client.legalName ?? quote.client.name}</dd>
            </div>
            <div>
              <dt>{t.sector}</dt>
              <dd>{quote.client.sector}</dd>
            </div>
            <div>
              <dt>{t.approver}</dt>
              <dd>{quote.client.authorizedApprover}</dd>
            </div>
          </dl>
        </SectionCard>
        <SectionCard eyebrow={t.commercialTerms} title={t.commercialTerms}>
          <dl className="quote-definition-list">
            <div>
              <dt>{t.validUntil}</dt>
              <dd>{dateText(quote.terms.validUntil, locale)}</dd>
            </div>
            <div>
              <dt>{t.payment}</dt>
              <dd>{businessText(quote.terms.paymentTerms, locale, t.notSpecified)}</dd>
            </div>
            <div>
              <dt>{t.delivery}</dt>
              <dd>{businessText(quote.terms.deliveryTerms, locale, t.notSpecified)}</dd>
            </div>
            <div>
              <dt>{t.additional}</dt>
              <dd>{businessText(quote.terms.additionalTerms, locale, t.none)}</dd>
            </div>
          </dl>
        </SectionCard>
      </section>

      <SectionCard
        eyebrow={t.quoteLines}
        title={locale === "ar" ? "الخدمات المحفوظة" : "Snapshotted services"}
        description={t.quoteLineDescription(quote.items.length)}
      >
        <SmartTable>
          <table className="catalog-table pricing-lines">
            <thead>
              <tr>
                <th>{t.service}</th>
                <th>{t.typePackage}</th>
                <th>{t.quantity}</th>
                <th>{locale === "ar" ? "الأساس" : "Base"}</th>
                <th>{t.setup}</th>
                <th>{t.total}</th>
              </tr>
            </thead>
            <tbody>
              {quote.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>
                      {serviceName(
                        item.serviceSnapshot,
                        locale,
                        locale === "ar" ? "خدمة غير مترجمة" : "Untitled service",
                      )}
                    </strong>
                    <small>{item.serviceSnapshot.serviceCode}</small>
                    {item.serviceItems.length > 0 && (
                      <ul className="quote-service-items">
                        {item.serviceItems.map((serviceItem) => (
                          <li key={serviceItem.itemCode}>
                            {serviceName(
                              serviceItem,
                              locale,
                              locale === "ar" ? "بند خدمة غير مترجم" : "Untitled item",
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td>
                    {lineTypeLabel(item.lineType, locale)}
                    <small>{levelLabel(item.serviceSnapshot.serviceLevelLabel, locale)}</small>
                  </td>
                  <td>{countText(item.quantity, locale)}</td>
                  <td>{money(item.serviceSnapshot.baseAmount, locale)}</td>
                  <td>{money(item.setupFee, locale)}</td>
                  <td>{money(item.lineTotal, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SmartTable>
      </SectionCard>

      <SectionCard eyebrow={t.financialSnapshot} title={locale === "ar" ? "الإجماليات" : "Totals"}>
        <div className="pricing-total-grid">
          <div>
            <span>{t.monthly}</span>
            <strong>{money(quote.totals.subtotalMonthly, locale)}</strong>
          </div>
          <div>
            <span>{t.setupFees}</span>
            <strong>{money(quote.totals.subtotalSetup, locale)}</strong>
          </div>
          <div>
            <span>{t.oneTime}</span>
            <strong>{money(quote.totals.subtotalOneTime, locale)}</strong>
          </div>
          <div>
            <span>{t.discount}</span>
            <strong>- {money(quote.totals.discountTotal, locale)}</strong>
          </div>
          <div>
            <span>{t.taxSnapshot}</span>
            <strong>{money(quote.totals.taxTotal, locale)}</strong>
          </div>
          <div className="primary">
            <span>{t.finalTotal}</span>
            <strong>{money(quote.totals.finalTotal, locale)}</strong>
          </div>
          <div>
            <span>{t.internalCost}</span>
            <strong>{money(quote.totals.internalCost, locale)}</strong>
          </div>
          <div>
            <span>{t.margin}</span>
            <strong>{countText(quote.totals.marginPct, locale)}%</strong>
          </div>
        </div>
        {quote.pricingRules.length > 0 && (
          <p className="pricing-muted">
            {t.pricingRuleVersions}:{" "}
            {quote.pricingRules.map((rule) => `${rule.code} v${rule.version}`).join(", ")}
          </p>
        )}
      </SectionCard>
    </>
  );
}
