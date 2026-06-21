"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { CatalogSnapshot, ServiceItem, ServiceLevel } from "../../lib/catalog-types";
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

interface EditableInclusion {
  serviceLevelId: string;
  included: boolean;
  sortOrder: number;
}

function inclusionsForItem(levels: ServiceLevel[], item: ServiceItem | null): EditableInclusion[] {
  return levels.map((level, index) => {
    const current = item?.revision?.levelInclusions.find(
      (inclusion) => inclusion.serviceLevelId === level.id,
    );
    return {
      serviceLevelId: level.id,
      included: current?.included ?? false,
      sortOrder: current?.sortOrder ?? index,
    };
  });
}

export function ItemManager({
  snapshot,
  setSnapshot,
}: {
  snapshot: CatalogSnapshot;
  setSnapshot: (snapshot: CatalogSnapshot) => void;
}) {
  const [editing, setEditing] = useState<ServiceItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [serviceFilter, setServiceFilter] = useState("ALL");
  const [inclusions, setInclusions] = useState<EditableInclusion[]>([]);
  const mutation = useCatalogMutation(setSnapshot);
  const visibleItems = useMemo(
    () =>
      snapshot.items.filter(
        (item) => serviceFilter === "ALL" || item.monthlyServiceId === serviceFilter,
      ),
    [serviceFilter, snapshot.items],
  );

  function openCreate() {
    mutation.clearFeedback();
    setEditing(null);
    setCreating(true);
    setInclusions(inclusionsForItem(snapshot.levels, null));
  }

  function openEdit(item: ServiceItem) {
    mutation.clearFeedback();
    setCreating(false);
    setEditing(item);
    setInclusions(inclusionsForItem(snapshot.levels, item));
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
    setInclusions([]);
  }

  function setIncluded(serviceLevelId: string, included: boolean) {
    setInclusions((current) =>
      current.map((inclusion) =>
        inclusion.serviceLevelId === serviceLevelId ? { ...inclusion, included } : inclusion,
      ),
    );
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
            monthlyServiceId: String(form.get("monthlyServiceId") ?? ""),
            status: String(form.get("status") ?? "DRAFT"),
            sortOrder: Number(form.get("sortOrder") ?? 0),
          }
        : {}),
      nameAr: String(form.get("nameAr") ?? "").trim(),
      nameEn: String(form.get("nameEn") ?? "").trim(),
      expectedOutput: String(form.get("expectedOutput") ?? "").trim(),
      requestType: String(form.get("requestType") ?? "").trim(),
      visibleInQuote: form.get("visibleInQuote") === "on",
      requiresFile: form.get("requiresFile") === "on",
      deductHours: form.get("deductHours") === "on",
      levelInclusions: inclusions,
    };
    const saved = await mutation.mutate(
      creating ? "service-items" : `service-items/${editing!.id}`,
      {
        method: creating ? "POST" : "PUT",
        body: JSON.stringify(payload),
      },
      creating ? "Service item created." : "A new service-item revision was created.",
    );
    if (saved) {
      closeForm();
    }
  }

  async function toggleMatrix(item: ServiceItem, serviceLevelId: string) {
    if (!item.revision) {
      return;
    }
    const updated = inclusionsForItem(snapshot.levels, item).map((inclusion) =>
      inclusion.serviceLevelId === serviceLevelId
        ? { ...inclusion, included: !inclusion.included }
        : inclusion,
    );
    await mutation.mutate(
      `service-items/${item.id}/levels`,
      {
        method: "PUT",
        body: JSON.stringify({ levelInclusions: updated }),
      },
      "Package inclusion matrix updated.",
    );
  }

  const current = editing?.revision;

  return (
    <>
      <SectionHeader
        eyebrow="Monthly catalog"
        title="Service items"
        description="Manage service-item revisions and the package inclusion matrix used by future service cards and requests."
        action={
          <button className="button-primary" type="button" onClick={openCreate}>
            Add service item
          </button>
        }
      />
      <CatalogFeedback error={mutation.error} success={mutation.success} />

      <section className="catalog-panel matrix-panel">
        <div className="panel-heading toolbar-heading">
          <div>
            <h2>Package inclusion matrix</h2>
            <p>Changes create a new item revision and never rewrite quote snapshots.</p>
          </div>
          <label className="compact-filter">
            Monthly service
            <select
              value={serviceFilter}
              onChange={(event) => setServiceFilter(event.target.value)}
            >
              <option value="ALL">All services</option>
              {snapshot.services.map((service) => (
                <option value={service.id} key={service.id}>
                  {service.revision?.nameEn ?? service.code}
                </option>
              ))}
            </select>
          </label>
        </div>
        {visibleItems.length === 0 ? (
          <EmptyState>No service items match this filter.</EmptyState>
        ) : (
          <div className="matrix-wrap">
            <table className="catalog-table matrix-table">
              <thead>
                <tr>
                  <th>Service item</th>
                  {snapshot.levels.map((level) => (
                    <th key={level.id}>{level.labelEn || level.code}</th>
                  ))}
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.revision?.nameEn ?? item.code}</strong>
                      <small>
                        {item.code} · {item.monthlyService.code}
                      </small>
                    </td>
                    {snapshot.levels.map((level) => {
                      const inclusion = item.revision?.levelInclusions.find(
                        (candidate) => candidate.serviceLevelId === level.id,
                      );
                      const checked = inclusion?.included ?? false;
                      const canChange =
                        item.status !== "INACTIVE" &&
                        item.status !== "ARCHIVED" &&
                        level.status === "ACTIVE";
                      return (
                        <td key={level.id}>
                          <button
                            className={`matrix-toggle ${checked ? "included" : ""}`}
                            type="button"
                            aria-label={`${checked ? "Remove" : "Include"} ${item.code} ${
                              checked ? "from" : "in"
                            } ${level.code}`}
                            aria-pressed={checked}
                            disabled={!canChange || mutation.submitting}
                            onClick={() => void toggleMatrix(item, level.id)}
                          >
                            {checked ? "Included" : "—"}
                          </button>
                        </td>
                      );
                    })}
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {(creating || editing) && (
        <section className="catalog-panel editor-panel">
          <div className="panel-heading">
            <div>
              <h2>{creating ? "New service item" : `Edit ${editing!.code}`}</h2>
              <p>
                {creating
                  ? "Choose the parent service and initial package matrix."
                  : `Saving creates revision v${(current?.version ?? 0) + 1}.`}
              </p>
            </div>
          </div>
          <form className="catalog-form wide-form" onSubmit={submit}>
            {creating && (
              <>
                <label>
                  Code
                  <input
                    name="code"
                    required
                    pattern="[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*"
                    placeholder="ITEM-HR-ONBOARDING"
                  />
                </label>
                <label>
                  Parent monthly service
                  <select name="monthlyServiceId" required defaultValue="">
                    <option value="" disabled>
                      Select service
                    </option>
                    {snapshot.services
                      .filter(
                        (service) => service.status === "ACTIVE" || service.status === "DRAFT",
                      )
                      .map((service) => (
                        <option value={service.id} key={service.id}>
                          {service.revision?.nameEn ?? service.code} · {service.status}
                        </option>
                      ))}
                  </select>
                </label>
              </>
            )}
            <label>
              Arabic name
              <input name="nameAr" required dir="rtl" defaultValue={current?.nameAr} />
            </label>
            <label>
              English name
              <input name="nameEn" required defaultValue={current?.nameEn} />
            </label>
            <label className="form-span">
              Expected output
              <textarea name="expectedOutput" defaultValue={current?.expectedOutput ?? ""} />
            </label>
            <label className="form-span">
              Request type
              <input name="requestType" defaultValue={current?.requestType ?? ""} />
            </label>
            <fieldset className="form-span option-fieldset">
              <legend>Behavior</legend>
              <label className="checkbox-field">
                <input
                  name="visibleInQuote"
                  type="checkbox"
                  defaultChecked={current?.visibleInQuote ?? true}
                />
                Visible in future quotes
              </label>
              <label className="checkbox-field">
                <input
                  name="requiresFile"
                  type="checkbox"
                  defaultChecked={current?.requiresFile ?? false}
                />
                Requires file
              </label>
              <label className="checkbox-field">
                <input
                  name="deductHours"
                  type="checkbox"
                  defaultChecked={current?.deductHours ?? true}
                />
                Deduct hours
              </label>
            </fieldset>
            <fieldset className="form-span package-editor">
              <legend>Package inclusion</legend>
              <div className="inclusion-grid">
                {snapshot.levels.map((level) => {
                  const inclusion = inclusions.find(
                    (candidate) => candidate.serviceLevelId === level.id,
                  );
                  return (
                    <label className="inclusion-option" key={level.id}>
                      <input
                        type="checkbox"
                        checked={inclusion?.included ?? false}
                        disabled={level.status !== "ACTIVE"}
                        onChange={(event) => setIncluded(level.id, event.target.checked)}
                      />
                      <span>
                        <strong>{level.labelEn || level.code}</strong>
                        <small>{level.status}</small>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
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
              submitLabel={creating ? "Create item" : "Create revision"}
            />
          </form>
        </section>
      )}

      <section className="catalog-panel">
        <div className="panel-heading">
          <div>
            <h2>Item definitions</h2>
            <p>Localized details, lifecycle, ordering, and future request behavior.</p>
          </div>
        </div>
        {visibleItems.length === 0 ? (
          <EmptyState>No service items match this filter.</EmptyState>
        ) : (
          <div className="entity-grid">
            {visibleItems.map((item) => (
              <article className="entity-card" key={item.id}>
                <div className="entity-card-top">
                  <div>
                    <small>
                      {item.code} · {item.monthlyService.code}
                    </small>
                    <h3>{item.revision?.nameEn ?? item.code}</h3>
                    <p dir="rtl">{item.revision?.nameAr}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
                <p className="entity-description">
                  {item.revision?.expectedOutput || "No expected output provided."}
                </p>
                <dl className="entity-meta">
                  <div>
                    <dt>Revision</dt>
                    <dd>v{item.revision?.version ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Packages</dt>
                    <dd>
                      {item.revision?.levelInclusions.filter((inclusion) => inclusion.included)
                        .length ?? 0}
                    </dd>
                  </div>
                </dl>
                <OrderControl
                  path={`service-items/${item.id}`}
                  current={item.sortOrder}
                  disabled={mutation.submitting || item.status === "ARCHIVED"}
                  mutate={mutation.mutate}
                />
                <div className="entity-card-actions">
                  <button
                    className="button-secondary"
                    type="button"
                    disabled={item.status === "ARCHIVED"}
                    onClick={() => openEdit(item)}
                  >
                    Edit item
                  </button>
                  <LifecycleActions
                    path={`service-items/${item.id}`}
                    status={item.status}
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
