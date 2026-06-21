"use client";

import { useState, type ReactNode } from "react";
import { catalogErrorMessage, catalogRequest, refreshCatalog } from "../../lib/catalog-client";
import type { CatalogSnapshot, CatalogStatus } from "../../lib/catalog-types";

export function StatusBadge({ status }: { status: CatalogStatus }) {
  return (
    <span className={`status-badge status-${status.toLowerCase()}`}>
      {status === "INACTIVE" ? "Inactive" : status[0] + status.slice(1).toLowerCase()}
    </span>
  );
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
    <header className="catalog-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="catalog-empty">{children}</div>;
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
      <button type="button" className="button-secondary" onClick={onCancel}>
        Cancel
      </button>
      <button type="submit" className="button-primary" disabled={submitting}>
        {submitting ? "Saving…" : submitLabel}
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

export function useCatalogMutation(setSnapshot: (snapshot: CatalogSnapshot) => void) {
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
      setSnapshot(await refreshCatalog());
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
          className="button-quiet"
          disabled={disabled}
          onClick={() => void change("ACTIVE")}
        >
          Enable
        </button>
      ) : (
        <button
          type="button"
          className="button-quiet"
          disabled={disabled}
          onClick={() => void change("INACTIVE")}
        >
          Disable
        </button>
      )}
      <button
        type="button"
        className="button-danger"
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
        className="button-quiet"
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
