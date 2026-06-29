"use client";

import { useState, type ReactNode } from "react";
import { catalogErrorMessage, catalogRequest, refreshCatalog } from "../../lib/catalog-client";
import type { CatalogSnapshot, CatalogStatus } from "../../lib/catalog-types";
import { EmptyState as PremiumEmptyState, PageHeader, StatusChip } from "../premium-os";

export function StatusBadge({ status }: { status: CatalogStatus }) {
  return <StatusChip status={status} label={status === "INACTIVE" ? "Inactive" : status[0] + status.slice(1).toLowerCase()} />;
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
  submitting,
  onCancel,
  submitLabel = "Save",
}: {
  submitting: boolean;
  onCancel: () => void;
  submitLabel?: string;
}) {
  return (
    <div className="form-actions">
      <button type="button" className="os-button os-button-secondary" onClick={onCancel}>
        Cancel
      </button>
      <button type="submit" className="os-button os-button-primary" disabled={submitting}>
        {submitting ? "Saving..." : submitLabel}
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
  path,
  status,
  disabled,
  mutate,
}: {
  path: string;
  status: CatalogStatus;
  disabled: boolean;
  mutate: (path: string, options: RequestInit, successMessage: string) => Promise<boolean>;
}) {
  if (status === "ARCHIVED") {
    return null;
  }

  async function change(target: CatalogStatus) {
    const destructive = target === "INACTIVE" || target === "ARCHIVED";
    const reason = destructive
      ? window.prompt(
          target === "ARCHIVED"
            ? "Why are you archiving this record?"
            : "Why are you disabling this record?",
        )
      : undefined;
    if (destructive && !reason?.trim()) {
      return;
    }
    if (
      target === "ARCHIVED" &&
      !window.confirm("Archive this record? Historical references will remain unchanged.")
    ) {
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
      `Status changed to ${target === "INACTIVE" ? "Inactive" : target.toLowerCase()}.`,
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
          Enable
        </button>
      ) : (
        <button
          type="button"
          className="os-button os-button-secondary"
          disabled={disabled}
          onClick={() => void change("INACTIVE")}
        >
          Disable
        </button>
      )}
      <button
        type="button"
        className="os-button os-button-danger"
        disabled={disabled}
        onClick={() => void change("ARCHIVED")}
      >
        Archive
      </button>
    </div>
  );
}

export function OrderControl({
  path,
  current,
  disabled,
  mutate,
}: {
  path: string;
  current: number;
  disabled: boolean;
  mutate: (path: string, options: RequestInit, successMessage: string) => Promise<boolean>;
}) {
  const [value, setValue] = useState(current);

  return (
    <div className="order-control">
      <label>
        Order
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
            "Display order saved.",
          )
        }
      >
        Save order
      </button>
    </div>
  );
}
