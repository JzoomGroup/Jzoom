"use client";

import { useState } from "react";
import { advanceQuoteLifecycle, quoteErrorMessage } from "../../lib/quote-client";
import type { Quote, QuoteStatus } from "../../lib/quote-types";

type LifecycleTarget = Exclude<QuoteStatus, "DRAFT">;

interface LifecycleAction {
  label: string;
  notePrompt?: string;
  status: LifecycleTarget;
  tone?: "danger" | "primary";
}

const actions: Partial<Record<QuoteStatus, LifecycleAction[]>> = {
  DRAFT: [
    { label: "Issue quote", status: "ISSUED" },
    {
      label: "Cancel quote",
      notePrompt: "Optional cancellation note:",
      status: "CANCELLED",
      tone: "danger",
    },
  ],
  ISSUED: [
    { label: "Accept quote", status: "ACCEPTED" },
    {
      label: "Reject quote",
      notePrompt: "Optional rejection note:",
      status: "REJECTED",
      tone: "danger",
    },
    { label: "Expire quote", status: "EXPIRED", tone: "danger" },
    {
      label: "Cancel quote",
      notePrompt: "Optional cancellation note:",
      status: "CANCELLED",
      tone: "danger",
    },
  ],
};

export function QuoteLifecycleActions({
  compact = false,
  onUpdated,
  quoteId,
  status,
}: {
  compact?: boolean;
  onUpdated?: (quote: Quote) => void;
  quoteId: string;
  status: QuoteStatus;
}) {
  const [submitting, setSubmitting] = useState<LifecycleTarget>();
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const availableActions = actions[status] ?? [];

  async function run(action: LifecycleAction) {
    const rawNote = action.notePrompt ? window.prompt(action.notePrompt) : undefined;
    if (rawNote === null) {
      return;
    }
    const note = rawNote?.trim() || undefined;
    if (!window.confirm(`${action.label} from current status ${status}?`)) {
      return;
    }
    setSubmitting(action.status);
    setError(undefined);
    setSuccess(undefined);
    try {
      const updated = await advanceQuoteLifecycle(quoteId, action.status, note);
      onUpdated?.(updated);
      setSuccess(`Quote status changed to ${action.status}.`);
    } catch (lifecycleError) {
      setError(quoteErrorMessage(lifecycleError));
    } finally {
      setSubmitting(undefined);
    }
  }

  if (availableActions.length === 0) {
    return null;
  }

  return (
    <div className={compact ? "quote-inline-actions" : "quote-lifecycle-actions"}>
      <div className="row-actions">
        {availableActions.map((action) => (
          <button
            key={action.status}
            type="button"
            className={
              action.tone === "danger"
                ? "os-button os-button-danger"
                : "os-button os-button-primary"
            }
            disabled={Boolean(submitting)}
            onClick={() => void run(action)}
          >
            {submitting === action.status ? "Saving..." : action.label}
          </button>
        ))}
      </div>
      {(error || success) && (
        <small
          className={error ? "quote-action-feedback error" : "quote-action-feedback success"}
          role="status"
        >
          {error ?? success}
        </small>
      )}
    </div>
  );
}
