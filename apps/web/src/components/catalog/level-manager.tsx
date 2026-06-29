"use client";

import { useState, type FormEvent } from "react";
import type { CatalogSnapshot, ServiceLevel } from "../../lib/catalog-types";
import {
  CatalogFeedback,
  EmptyState,
  FormActions,
  LifecycleActions,
  OrderControl,
  SectionHeader,
  StatusBadge,
  useCatalogMutation,
} from "./catalog-shared";

export function LevelManager({
  snapshot,
  setSnapshot,
}: {
  snapshot: CatalogSnapshot;
  setSnapshot: (snapshot: CatalogSnapshot) => void;
}) {
  const [editing, setEditing] = useState<ServiceLevel | null>(null);
  const [creating, setCreating] = useState(false);
  const mutation = useCatalogMutation(setSnapshot);

  function closeForm() {
    setEditing(null);
    setCreating(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      ...(creating
        ? {
            code: String(form.get("code") ?? "").trim(),
            status: String(form.get("status") ?? "DRAFT"),
            sortOrder: Number(form.get("sortOrder") ?? 0),
          }
        : {}),
      labelAr: String(form.get("labelAr") ?? "").trim(),
      labelEn: String(form.get("labelEn") ?? "").trim(),
      purpose: String(form.get("purpose") ?? "").trim(),
      slaRule: String(form.get("slaRule") ?? "").trim(),
      scopeRule: String(form.get("scopeRule") ?? "").trim(),
      governanceRule: String(form.get("governanceRule") ?? "").trim(),
      isCustom: form.get("isCustom") === "on",
    };
    const saved = await mutation.mutate(
      creating ? "service-levels" : `service-levels/${editing!.id}`,
      {
        method: creating ? "POST" : "PUT",
        body: JSON.stringify(payload),
      },
      creating ? "Service level created." : "Service level updated.",
    );
    if (saved) {
      closeForm();
    }
  }

  return (
    <>
      <SectionHeader
        eyebrow="Monthly catalog"
        title="Service levels & packages"
        description="Manage package labels and governance. Active dependencies protect levels from unsafe disabling or archiving."
        action={
          <button
            className="os-button os-button-primary"
            type="button"
            onClick={() => {
              mutation.clearFeedback();
              setEditing(null);
              setCreating(true);
            }}
          >
            Add service level
          </button>
        }
      />
      <CatalogFeedback error={mutation.error} success={mutation.success} />

      {(creating || editing) && (
        <section className="catalog-panel editor-panel">
          <div className="panel-heading">
            <div>
              <h2>{creating ? "New service level" : `Edit ${editing!.code}`}</h2>
              <p>Package codes are immutable after creation.</p>
            </div>
          </div>
          <form className="catalog-form" onSubmit={submit}>
            {creating && (
              <label>
                Code
                <input name="code" required placeholder="Enterprise" />
              </label>
            )}
            <label>
              Arabic label
              <input name="labelAr" required dir="rtl" defaultValue={editing?.labelAr} />
            </label>
            <label>
              English label
              <input name="labelEn" required defaultValue={editing?.labelEn ?? ""} />
            </label>
            <label className="form-span">
              Purpose
              <textarea name="purpose" defaultValue={editing?.purpose ?? ""} />
            </label>
            <label>
              SLA rule
              <textarea name="slaRule" defaultValue={editing?.slaRule ?? ""} />
            </label>
            <label>
              Scope rule
              <textarea name="scopeRule" defaultValue={editing?.scopeRule ?? ""} />
            </label>
            <label className="form-span">
              Governance rule
              <textarea name="governanceRule" defaultValue={editing?.governanceRule ?? ""} />
            </label>
            <label className="checkbox-field">
              <input name="isCustom" type="checkbox" defaultChecked={editing?.isCustom ?? false} />
              Custom package level
            </label>
            {creating && (
              <>
                <label>
                  Initial status
                  <select name="status" defaultValue="DRAFT">
                    <option value="DRAFT">Draft</option>
                    <option value="ACTIVE">Active</option>
                  </select>
                </label>
                <label>
                  Display order
                  <input name="sortOrder" type="number" min="0" defaultValue="0" />
                </label>
              </>
            )}
            <FormActions
              submitting={mutation.submitting}
              onCancel={closeForm}
              submitLabel={creating ? "Create level" : "Save level"}
            />
          </form>
        </section>
      )}

      <section className="catalog-panel">
        <div className="panel-heading">
          <div>
            <h2>Configured packages</h2>
            <p>Used by service hours and the service-item inclusion matrix.</p>
          </div>
        </div>
        {snapshot.levels.length === 0 ? (
          <EmptyState>No service levels exist yet.</EmptyState>
        ) : (
          <div className="entity-grid">
            {snapshot.levels.map((level) => (
              <article className="entity-card" key={level.id}>
                <div className="entity-card-top">
                  <div>
                    <small>{level.code}</small>
                    <h3>{level.labelEn || level.code}</h3>
                    <p dir="rtl">{level.labelAr}</p>
                  </div>
                  <StatusBadge status={level.status} />
                </div>
                <p className="entity-description">
                  {level.purpose || "No package purpose provided."}
                </p>
                <div className="rule-list">
                  <span>
                    <strong>SLA:</strong> {level.slaRule || "Not set"}
                  </span>
                  <span>
                    <strong>Scope:</strong> {level.scopeRule || "Not set"}
                  </span>
                  {level.isCustom && <span className="custom-chip">Custom</span>}
                </div>
                <OrderControl
                  path={`service-levels/${level.id}`}
                  current={level.sortOrder}
                  disabled={mutation.submitting || level.status === "ARCHIVED"}
                  mutate={mutation.mutate}
                />
                <div className="entity-card-actions">
                  <button
                    className="os-button os-button-secondary"
                    type="button"
                    disabled={level.status === "ARCHIVED"}
                    onClick={() => {
                      mutation.clearFeedback();
                      setCreating(false);
                      setEditing(level);
                    }}
                  >
                    Edit
                  </button>
                  <LifecycleActions
                    path={`service-levels/${level.id}`}
                    status={level.status}
                    disabled={mutation.submitting}
                    mutate={mutation.mutate}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
