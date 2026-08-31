"use client";

import { useState, type FormEvent } from "react";
import { confirmQuotePayment, quoteErrorMessage } from "../../lib/quote-client";
import type { Quote, QuotePaymentMethod } from "../../lib/quote-types";
import { commercialCopy, commercialLocale } from "../commercial-i18n";
import { LocalizedDateTimeInput } from "../localized-date-input";

function localDateTimeInput(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function QuotePaymentDialog({
  locale: localeInput,
  onClose,
  onConfirmed,
  quoteId,
}: {
  locale?: string;
  onClose: () => void;
  onConfirmed: (quote: Quote) => void;
  quoteId: string;
}) {
  const locale = commercialLocale(localeInput);
  const t = commercialCopy[locale];
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const paidAt = String(form.get("paidAt") ?? "");
    const reference = String(form.get("reference") ?? "").trim();
    const note = String(form.get("note") ?? "").trim();
    setSaving(true);
    setError(undefined);
    try {
      const quote = await confirmQuotePayment(quoteId, {
        method: String(form.get("method") ?? "OTHER") as QuotePaymentMethod,
        ...(paidAt ? { paidAt: new Date(paidAt).toISOString() } : {}),
        ...(reference ? { reference } : {}),
        ...(note ? { note } : {}),
      });
      onConfirmed(quote);
    } catch (caught) {
      setError(quoteErrorMessage(caught));
      setSaving(false);
    }
  }

  return (
    <div className="quote-onboarding-backdrop">
      <section
        aria-labelledby="quote-payment-title"
        aria-modal="true"
        className="quote-payment-dialog"
        role="dialog"
      >
        <header className="quote-payment-header">
          <div>
            <p className="eyebrow">{t.payment}</p>
            <h2 id="quote-payment-title">{t.paymentDialogTitle}</h2>
            <p>{t.paymentDialogDescription}</p>
          </div>
          <button className="os-button os-button-secondary" type="button" onClick={onClose}>
            {t.close}
          </button>
        </header>
        <form className="quote-payment-form" noValidate onSubmit={submit}>
          <div className="quote-payment-fields">
            <label>
              {t.paymentMethod}
              <select defaultValue="BANK_TRANSFER" name="method">
                <option value="BANK_TRANSFER">{t.paymentMethodBank}</option>
                <option value="CARD">{t.paymentMethodCard}</option>
                <option value="CASH">{t.paymentMethodCash}</option>
                <option value="OTHER">{t.paymentMethodOther}</option>
              </select>
            </label>
            <label>
              {t.paymentDate}
              <LocalizedDateTimeInput
                aria-label={t.paymentDate}
                defaultValue={localDateTimeInput()}
                locale={locale}
                max={localDateTimeInput()}
                name="paidAt"
              />
            </label>
            <label className="form-span">
              {t.paymentReference}
              <input maxLength={160} name="reference" />
            </label>
            <label className="form-span">
              {t.paymentNote}
              <textarea maxLength={2000} name="note" rows={3} />
            </label>
          </div>
          {error ? (
            <p className="quote-action-feedback error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="form-actions">
            <button className="os-button os-button-secondary" type="button" onClick={onClose}>
              {t.close}
            </button>
            <button className="os-button os-button-primary" disabled={saving} type="submit">
              {saving ? t.confirmingPayment : t.confirmPayment}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
