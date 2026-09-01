"use client";

import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { useEffect, useState } from "react";

export function FeedbackToast({
  error,
  nextStep,
  onDismiss,
  success,
}: {
  error?: string | null | undefined;
  nextStep?: string | undefined;
  onDismiss?: () => void;
  success?: string | null | undefined;
}) {
  const message = error ?? success;
  const [visible, setVisible] = useState(Boolean(message));
  const resolvedNextStep =
    nextStep ??
    (success
      ? /[\u0600-\u06ff]/.test(message ?? "")
        ? "يمكنك متابعة الخطوة التالية، والبيانات المعروضة محدثة الآن."
        : "You can continue to the next step; the displayed data is now up to date."
      : undefined);

  useEffect(() => {
    setVisible(Boolean(message));
    if (!message || error) return;
    const timeout = window.setTimeout(() => setVisible(false), 6000);
    return () => window.clearTimeout(timeout);
  }, [error, message]);

  if (!message || !visible) return null;

  function dismiss() {
    setVisible(false);
    onDismiss?.();
  }

  return (
    <aside
      className={`app-feedback-toast ${error ? "error" : "success"}`}
      role={error ? "alert" : "status"}
      aria-live={error ? "assertive" : "polite"}
    >
      <span className="app-feedback-icon" aria-hidden="true">
        {error ? <AlertCircle size={19} /> : <CheckCircle2 size={19} />}
      </span>
      <div>
        <strong>{message}</strong>
        {resolvedNextStep ? <p>{resolvedNextStep}</p> : null}
      </div>
      <button className="icon-button" type="button" onClick={dismiss} aria-label="إغلاق الرسالة">
        <X aria-hidden="true" size={16} />
      </button>
    </aside>
  );
}
