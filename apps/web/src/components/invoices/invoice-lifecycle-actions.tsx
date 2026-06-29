"use client";

import { useState } from "react";
import { advanceInvoiceLifecycle, invoiceErrorMessage } from "../../lib/invoice-client";
import type { Invoice, InvoiceStatus } from "../../lib/invoice-types";
import { commercialCopy, commercialLocale } from "../commercial-i18n";

export function InvoiceLifecycleActions({
  compact = false,
  invoiceId,
  locale: localeInput = "en",
  onUpdated,
  status,
}: {
  compact?: boolean;
  invoiceId: string;
  locale?: string;
  onUpdated?: (invoice: Invoice) => void;
  status: InvoiceStatus;
}) {
  const locale = commercialLocale(localeInput);
  const t = commercialCopy[locale];
  const [pending, setPending] = useState<InvoiceStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const actionsByStatus: Record<
    InvoiceStatus,
    Array<{ label: string; status: Exclude<InvoiceStatus, "DRAFT">; tone?: "danger" }>
  > = {
    DRAFT: [
      { label: t.issueInvoice, status: "ISSUED" },
      { label: t.cancelInvoice, status: "CANCELLED", tone: "danger" },
    ],
    ISSUED: [{ label: t.voidInvoice, status: "VOIDED", tone: "danger" }],
    CANCELLED: [],
    VOIDED: [],
  };
  const actions = actionsByStatus[status];

  if (actions.length === 0) {
    return compact ? null : <p className="pricing-muted">{t.invoiceTerminalState}</p>;
  }

  async function submit(action: { label: string; status: Exclude<InvoiceStatus, "DRAFT"> }) {
    if (!window.confirm(t.invoiceStatusConfirm(action.label, status))) {
      return;
    }
    const target = action.status;
    setPending(target);
    setError(null);
    setSuccess(null);
    try {
      const updated = await advanceInvoiceLifecycle(invoiceId, target);
      setSuccess(t.invoiceStatusChanged(updated.status));
      onUpdated?.(updated);
    } catch (invoiceError) {
      setError(invoiceErrorMessage(invoiceError));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className={compact ? "quote-inline-actions" : "quote-lifecycle-actions"}>
      <div className="row-actions">
        {actions.map((action) => (
          <button
            className={
              action.tone === "danger"
                ? "os-button os-button-danger"
                : "os-button os-button-secondary"
            }
            disabled={pending !== null}
            key={action.status}
            type="button"
            onClick={() => void submit(action)}
          >
            {pending === action.status ? t.saving : action.label}
          </button>
        ))}
      </div>
      {(error || success) && (
        <small className={error ? "quote-action-feedback error" : "quote-action-feedback success"}>
          {error ?? success}
        </small>
      )}
    </div>
  );
}
