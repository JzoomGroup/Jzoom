"use client";

import { useState } from "react";
import { advanceInvoiceLifecycle, invoiceErrorMessage } from "../../lib/invoice-client";
import type { Invoice, InvoiceStatus } from "../../lib/invoice-types";

const actionsByStatus: Record<
  InvoiceStatus,
  Array<{ label: string; status: Exclude<InvoiceStatus, "DRAFT">; tone?: "danger" }>
> = {
  DRAFT: [
    { label: "Issue invoice", status: "ISSUED" },
    { label: "Cancel invoice", status: "CANCELLED", tone: "danger" },
  ],
  ISSUED: [{ label: "Void invoice", status: "VOIDED", tone: "danger" }],
  CANCELLED: [],
  VOIDED: [],
};

export function InvoiceLifecycleActions({
  compact = false,
  invoiceId,
  onUpdated,
  status,
}: {
  compact?: boolean;
  invoiceId: string;
  onUpdated?: (invoice: Invoice) => void;
  status: InvoiceStatus;
}) {
  const [pending, setPending] = useState<InvoiceStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const actions = actionsByStatus[status];

  if (actions.length === 0) {
    return compact ? null : <p className="pricing-muted">This invoice is in a terminal state.</p>;
  }

  async function submit(target: Exclude<InvoiceStatus, "DRAFT">) {
    setPending(target);
    setError(null);
    setSuccess(null);
    try {
      const updated = await advanceInvoiceLifecycle(invoiceId, target);
      setSuccess(`Invoice moved to ${updated.status}.`);
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
            className={action.tone === "danger" ? "button-danger" : "button-secondary"}
            disabled={pending !== null}
            key={action.status}
            type="button"
            onClick={() => void submit(action.status)}
          >
            {pending === action.status ? "Saving…" : action.label}
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
