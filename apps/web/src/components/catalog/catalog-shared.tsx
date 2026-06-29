"use client";

import { useState, type ReactNode } from "react";
import { catalogErrorMessage, catalogRequest, refreshCatalog } from "../../lib/catalog-client";
import type { CatalogSnapshot, CatalogStatus } from "../../lib/catalog-types";
import { normalizeLocale, type SupportedLocale } from "../../lib/i18n";
import { EmptyState as PremiumEmptyState, PageHeader, StatusChip } from "../premium-os";

const sharedCopy = {
  ar: {
    archive: "أرشفة",
    archiveConfirm: "هل تريد أرشفة هذا السجل؟ ستبقى المراجع التاريخية محفوظة.",
    archivePrompt: "ما سبب أرشفة هذا السجل؟",
    cancel: "إلغاء",
    disable: "تعطيل",
    disablePrompt: "ما سبب تعطيل هذا السجل؟",
    displayOrderSaved: "تم حفظ ترتيب العرض.",
    enable: "تفعيل",
    order: "الترتيب",
    save: "حفظ",
    saveOrder: "حفظ الترتيب",
    saving: "جار الحفظ...",
    statusChanged: (status: CatalogStatus) => `تم تحديث الحالة إلى ${statusLabel(status, "ar")}.`,
  },
  en: {
    archive: "Archive",
    archiveConfirm: "Archive this record? Historical references will remain unchanged.",
    archivePrompt: "Why are you archiving this record?",
    cancel: "Cancel",
    disable: "Disable",
    disablePrompt: "Why are you disabling this record?",
    displayOrderSaved: "Display order saved.",
    enable: "Enable",
    order: "Order",
    save: "Save",
    saveOrder: "Save order",
    saving: "Saving...",
    statusChanged: (status: CatalogStatus) =>
      `Status changed to ${status === "INACTIVE" ? "Inactive" : status.toLowerCase()}.`,
  },
} as const;

const statusLabels = {
  ACTIVE: { ar: "نشط", en: "Active" },
  ARCHIVED: { ar: "مؤرشف", en: "Archived" },
  DRAFT: { ar: "مسودة", en: "Draft" },
  INACTIVE: { ar: "غير نشط", en: "Inactive" },
} satisfies Record<CatalogStatus, Record<SupportedLocale, string>>;

function sharedLocale(locale: string | undefined): SupportedLocale {
  return normalizeLocale(locale);
}

function statusLabel(status: CatalogStatus, locale: SupportedLocale): string {
  return statusLabels[status][locale];
}

export function StatusBadge({ locale, status }: { locale?: string; status: CatalogStatus }) {
  const lang = sharedLocale(locale);
  return <StatusChip status={status} label={statusLabel(status, lang)} />;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <PageHeader eyebrow={eyebrow} title={title} description={description}>
      {action ? <div className="os-page-actions">{action}</div> : null}
    </PageHeader>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <PremiumEmptyState>{children}</PremiumEmptyState>;
}

export function FormActions({
  locale,
  submitting,
  onCancel,
  submitLabel = "Save",
}: {
  locale?: string;
  submitting: boolean;
  onCancel: () => void;
  submitLabel?: string;
}) {
  const lang = sharedLocale(locale);
  const t = sharedCopy[lang];
  return (
    <div className="form-actions">
      <button type="button" className="os-button os-button-secondary" onClick={onCancel}>
        {t.cancel}
      </button>
      <button type="submit" className="os-button os-button-primary" disabled={submitting}>
        {submitting ? t.saving : submitLabel}
      </button>
    </div>
  );
}

export function CatalogFeedback({
  error,
  success,
}: {
  error: string | undefined;
  success: string | undefined;
}) {
  if (!error && !success) {
    return null;
  }
  return (
    <p className={error ? "catalog-feedback error" : "catalog-feedback success"} role="status">
      {error ?? success}
    </p>
  );
}

export function useCatalogMutation<T = CatalogSnapshot>(
  setSnapshot: (snapshot: T) => void,
  refresher: () => Promise<T> = refreshCatalog as () => Promise<T>,
) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();

  async function mutate(
    path: string,
    options: RequestInit,
    successMessage: string,
  ): Promise<boolean> {
    setSubmitting(true);
    setError(undefined);
    setSuccess(undefined);
    try {
      await catalogRequest(path, options);
      setSnapshot(await refresher());
      setSuccess(successMessage);
      return true;
    } catch (mutationError) {
      setError(catalogErrorMessage(mutationError));
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  function clearFeedback() {
    setError(undefined);
    setSuccess(undefined);
  }

  return { submitting, error, success, mutate, clearFeedback };
}

export function LifecycleActions({
  locale,
  path,
  status,
  disabled,
  mutate,
}: {
  locale?: string;
  path: string;
  status: CatalogStatus;
  disabled: boolean;
  mutate: (path: string, options: RequestInit, successMessage: string) => Promise<boolean>;
}) {
  const lang = sharedLocale(locale);
  const t = sharedCopy[lang];
  if (status === "ARCHIVED") {
    return null;
  }

  async function change(target: CatalogStatus) {
    const destructive = target === "INACTIVE" || target === "ARCHIVED";
    const reason = destructive
      ? window.prompt(target === "ARCHIVED" ? t.archivePrompt : t.disablePrompt)
      : undefined;
    if (destructive && !reason?.trim()) {
      return;
    }
    if (target === "ARCHIVED" && !window.confirm(t.archiveConfirm)) {
      return;
    }

    await mutate(
      `${path}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({
          status: target,
          ...(reason ? { reason } : {}),
        }),
      },
      t.statusChanged(target),
    );
  }

  return (
    <div className="row-actions">
      {status !== "ACTIVE" ? (
        <button
          type="button"
          className="os-button os-button-secondary"
          disabled={disabled}
          onClick={() => void change("ACTIVE")}
        >
          {t.enable}
        </button>
      ) : (
        <button
          type="button"
          className="os-button os-button-secondary"
          disabled={disabled}
          onClick={() => void change("INACTIVE")}
        >
          {t.disable}
        </button>
      )}
      <button
        type="button"
        className="os-button os-button-danger"
        disabled={disabled}
        onClick={() => void change("ARCHIVED")}
      >
        {t.archive}
      </button>
    </div>
  );
}

export function OrderControl({
  locale,
  path,
  current,
  disabled,
  mutate,
}: {
  locale?: string;
  path: string;
  current: number;
  disabled: boolean;
  mutate: (path: string, options: RequestInit, successMessage: string) => Promise<boolean>;
}) {
  const lang = sharedLocale(locale);
  const t = sharedCopy[lang];
  const [value, setValue] = useState(current);

  return (
    <div className="order-control">
      <label>
        {t.order}
        <input
          type="number"
          min="0"
          max="100000"
          value={value}
          disabled={disabled}
          onChange={(event) => setValue(Number(event.target.value))}
        />
      </label>
      <button
        type="button"
        className="os-button os-button-secondary"
        disabled={disabled || value === current}
        onClick={() =>
          void mutate(
            `${path}/order`,
            {
              method: "PATCH",
              body: JSON.stringify({ sortOrder: value }),
            },
            t.displayOrderSaved,
          )
        }
      >
        {t.saveOrder}
      </button>
    </div>
  );
}
