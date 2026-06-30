"use client";

import { useState } from "react";
import {
  advanceQuoteLifecycle,
  getQuoteOnboardingOptions,
  quoteErrorMessage,
} from "../../lib/quote-client";
import type { Quote, QuoteOnboardingOptions, QuoteStatus } from "../../lib/quote-types";
import { commercialCopy, commercialLocale } from "../commercial-i18n";
import { QuoteOnboardingDialog } from "./quote-onboarding-dialog";

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
  onAccepted,
  quoteId,
  status,
}: {
  compact?: boolean;
  locale?: string;
  onAccepted?: (quote: Quote) => void;
  onUpdated?: (quote: Quote) => void;
  quoteId: string;
  status: QuoteStatus;
}) {
  const locale = commercialLocale(localeInput);
  const t = commercialCopy[locale];
  const [submitting, setSubmitting] = useState<LifecycleTarget>();
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [onboardingOptions, setOnboardingOptions] = useState<QuoteOnboardingOptions | null>(null);
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
      if (action.status === "ACCEPTED") {
        onAccepted?.(updated);
      }
      if (action.status === "ACCEPTED" && !compact && !onAccepted) {
        try {
          setOnboardingOptions(await getQuoteOnboardingOptions(quoteId));
        } catch (optionsError) {
          setError(quoteErrorMessage(optionsError));
        }
      }
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
    <>
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
      {onboardingOptions ? (
        <QuoteOnboardingDialog
          locale={locale}
          options={onboardingOptions}
          onClose={() => setOnboardingOptions(null)}
        />
      ) : null}
    </>
  );
}

export function QuoteOnboardingLauncher({
  compact = false,
  locale: localeInput = "en",
  quoteId,
}: {
  compact?: boolean;
  locale?: string;
  quoteId: string;
}) {
  const locale = commercialLocale(localeInput);
  const t = commercialCopy[locale];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [onboardingOptions, setOnboardingOptions] = useState<QuoteOnboardingOptions | null>(null);

  async function open() {
    setLoading(true);
    setError(undefined);
    try {
      setOnboardingOptions(await getQuoteOnboardingOptions(quoteId));
    } catch (caught) {
      setError(quoteErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className={compact ? "quote-inline-actions" : "quote-lifecycle-actions"}>
        <button
          className="os-button os-button-primary"
          disabled={loading}
          type="button"
          onClick={() => void open()}
        >
          {loading ? t.saving : t.activateClientServices}
        </button>
        {error ? (
          <small className="quote-action-feedback error" role="status">
            {error}
          </small>
        ) : null}
      </div>
      {onboardingOptions ? (
        <QuoteOnboardingDialog
          locale={locale}
          options={onboardingOptions}
          onClose={() => setOnboardingOptions(null)}
        />
      ) : null}
    </>
  );
}
