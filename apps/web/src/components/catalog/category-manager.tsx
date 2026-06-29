"use client";

import { useState, type FormEvent } from "react";
import type { CatalogCategory, CatalogSnapshot } from "../../lib/catalog-types";
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

export function CategoryManager({
  snapshot,
  setSnapshot,
}: {
  snapshot: CatalogSnapshot;
  setSnapshot: (snapshot: CatalogSnapshot) => void;
}) {
  const [editing, setEditing] = useState<CatalogCategory | null>(null);
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
            code: String(form.get("code") ?? "")
              .trim()
              .toUpperCase(),
            status: String(form.get("status") ?? "DRAFT"),
            sortOrder: Number(form.get("sortOrder") ?? 0),
          }
        : {}),
      nameAr: String(form.get("nameAr") ?? "").trim(),
      nameEn: String(form.get("nameEn") ?? "").trim(),
      description: String(form.get("description") ?? "").trim(),
    };
    const saved = await mutation.mutate(
      creating ? "admin/catalog/categories" : `admin/catalog/categories/${editing!.id}`,
      {
        method: creating ? "POST" : "PUT",
        body: JSON.stringify(payload),
      },
      creating ? "Category created." : "Category updated.",
    );
    if (saved) {
      closeForm();
    }
  }

  return (
    <>
      <SectionHeader
        eyebrow="Monthly catalog"
        title="Service categories"
        description="Organize monthly services into editable localized categories without changing historical service revisions."
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
            Add category
          </button>
        }
      />
      <CatalogFeedback error={mutation.error} success={mutation.success} />

      {(creating || editing) && (
        <section className="catalog-panel editor-panel">
          <div className="panel-heading">
            <div>
              <h2>{creating ? "New category" : `Edit ${editing!.code}`}</h2>
              <p>Codes are immutable after creation.</p>
            </div>
          </div>
          <form className="catalog-form" onSubmit={submit}>
            {creating && (
              <label>
                Code
                <input
                  name="code"
                  required
                  pattern="[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*"
                  placeholder="CAT-HR"
                />
              </label>
            )}
            <label>
              Arabic name
              <input name="nameAr" required dir="rtl" defaultValue={editing?.nameAr} />
            </label>
            <label>
              English name
              <input name="nameEn" required defaultValue={editing?.nameEn} />
            </label>
            <label className="form-span">
              Description
              <textarea name="description" defaultValue={editing?.description ?? ""} />
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
              submitLabel={creating ? "Create category" : "Save category"}
            />
          </form>
        </section>
      )}

      <section className="catalog-panel">
        <div className="panel-heading">
          <div>
            <h2>All categories</h2>
            <p>{snapshot.categories.length} PostgreSQL-backed records.</p>
          </div>
        </div>
        {snapshot.categories.length === 0 ? (
          <EmptyState>No categories exist yet.</EmptyState>
        ) : (
          <div className="entity-grid">
            {snapshot.categories.map((category) => (
              <article className="entity-card" key={category.id}>
                <div className="entity-card-top">
                  <div>
                    <small>{category.code}</small>
                    <h3>{category.nameEn}</h3>
                    <p dir="rtl">{category.nameAr}</p>
                  </div>
                  <StatusBadge status={category.status} />
                </div>
                <p className="entity-description">
                  {category.description || "No description provided."}
                </p>
                <dl className="entity-meta">
                  <div>
                    <dt>Services</dt>
                    <dd>{category.serviceCount}</dd>
                  </div>
                  <div>
                    <dt>Order</dt>
                    <dd>{category.sortOrder}</dd>
                  </div>
                </dl>
                <OrderControl
                  path={`admin/catalog/categories/${category.id}`}
                  current={category.sortOrder}
                  disabled={mutation.submitting || category.status === "ARCHIVED"}
                  mutate={mutation.mutate}
                />
                <div className="entity-card-actions">
                  <button
                    className="os-button os-button-secondary"
                    type="button"
                    disabled={category.status === "ARCHIVED"}
                    onClick={() => {
                      mutation.clearFeedback();
                      setCreating(false);
                      setEditing(category);
                    }}
                  >
                    Edit
                  </button>
                  <LifecycleActions
                    path={`admin/catalog/categories/${category.id}`}
                    status={category.status}
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
