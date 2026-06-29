"use client";

import { useState } from "react";
import { advanceQuoteLifecycle, quoteErrorMessage } from "../../lib/quote-client";
import type { Quote, QuoteStatus } from "../../lib/quote-types";
import { commercialCopy, commercialLocale } from "../commercial-i18n";

type LifecycleTarget = Exclude<QuoteStatus, "DRAFT">;

interface LifecycleAction {
  label: string;
  notePrompt?: string;
  status: LifecycleTarget;
  tone?: "danger" | "primary";
}

export function QuoteLifecycleActions({
  compact = false,
  locale: localeInput = "en",
  onUpdated,
  quoteId,
  status,
}: {
  compact?: boolean;
  locale?: string;
  onUpdated?: (quote: Quote) => void;
  quoteId: string;
  status: QuoteStatus;
}) {
  const locale = commercialLocale(localeInput);
  const t = commercialCopy[locale];
  const [submitting, setSubmitting] = useState<LifecycleTarget>();
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const actions: Partial<Record<QuoteStatus, LifecycleAction[]>> = {
    DRAFT: [
      { label: t.issueQuote, status: "ISSUED" },
      {
        label: t.cancelQuote,
        notePrompt: t.cancellationNote,
        status: "CANCELLED",
        tone: "danger",
      },
    ],
    ISSUED: [
      { label: t.acceptQuote, status: "ACCEPTED" },
      {
        label: t.rejectQuote,
        notePrompt: t.rejectionNote,
        status: "REJECTED",
        tone: "danger",
      },
      { label: t.expireQuote, status: "EXPIRED", tone: "danger" },
      {
        label: t.cancelQuote,
        notePrompt: t.cancellationNote,
        status: "CANCELLED",
        tone: "danger",
      },
    ],
  };
  const availableActions = actions[status] ?? [];

  async function run(action: LifecycleAction) {
    const rawNote = action.notePrompt ? window.prompt(action.notePrompt) : undefined;
    if (rawNote === null) {
      return;
    }
    const note = rawNote?.trim() || undefined;
    if (!window.confirm(t.quoteIssueConfirm(action.label, status))) {
      return;
    }
    setSubmitting(action.status);
    setError(undefined);
    setSuccess(undefined);
    try {
      const updated = await advanceQuoteLifecycle(quoteId, action.status, note);
      onUpdated?.(updated);
      setSuccess(t.quoteStatusChanged(action.status));
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
            {submitting === action.status ? t.saving : action.label}
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
