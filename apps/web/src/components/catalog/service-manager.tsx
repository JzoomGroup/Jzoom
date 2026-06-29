"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { CatalogSnapshot, MonthlyService, ServiceLevel } from "../../lib/catalog-types";
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

interface EditableLevelConfig {
  serviceLevelId: string;
  hours: number;
  slaHours: number | null;
  isEnabled: boolean;
  sortOrder: number;
}

function configsForService(
  levels: ServiceLevel[],
  service: MonthlyService | null,
): EditableLevelConfig[] {
  return levels.map((level, index) => {
    const existing = service?.revision?.levelConfigs.find(
      (config) => config.serviceLevelId === level.id,
    );
    return {
      serviceLevelId: level.id,
      hours: existing?.hours ?? 0,
      slaHours: existing?.slaHours ?? null,
      isEnabled: existing?.isEnabled ?? false,
      sortOrder: existing?.sortOrder ?? index,
    };
  });
}

export function ServiceManager({
  snapshot,
  setSnapshot,
}: {
  snapshot: CatalogSnapshot;
  setSnapshot: (snapshot: CatalogSnapshot) => void;
}) {
  const [editing, setEditing] = useState<MonthlyService | null>(null);
  const [creating, setCreating] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [levelConfigs, setLevelConfigs] = useState<EditableLevelConfig[]>([]);
  const mutation = useCatalogMutation(setSnapshot);
  const visibleServices = useMemo(
    () =>
      snapshot.services.filter(
        (service) => categoryFilter === "ALL" || service.categoryId === categoryFilter,
      ),
    [categoryFilter, snapshot.services],
  );

  function openCreate() {
    mutation.clearFeedback();
    setEditing(null);
    setCreating(true);
    setLevelConfigs(configsForService(snapshot.levels, null));
  }

  function openEdit(service: MonthlyService) {
    mutation.clearFeedback();
    setCreating(false);
    setEditing(service);
    setLevelConfigs(configsForService(snapshot.levels, service));
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
    setLevelConfigs([]);
  }

  function updateLevel(serviceLevelId: string, update: Partial<EditableLevelConfig>) {
    setLevelConfigs((current) =>
      current.map((config) =>
        config.serviceLevelId === serviceLevelId ? { ...config, ...update } : config,
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
            status: String(form.get("status") ?? "DRAFT"),
            sortOrder: Number(form.get("sortOrder") ?? 0),
          }
        : {}),
      categoryId: String(form.get("categoryId") ?? ""),
      nameAr: String(form.get("nameAr") ?? "").trim(),
      nameEn: String(form.get("nameEn") ?? "").trim(),
      description: String(form.get("description") ?? "").trim(),
      sellingHourlyRateSar: Number(form.get("sellingHourlyRateSar") ?? 0),
      internalHourlyCostSar: Number(form.get("internalHourlyCostSar") ?? 0),
      setupFeePct: Number(form.get("setupFeePct") ?? 0),
      defaultSlaHours: Number(form.get("defaultSlaHours") ?? 0),
      visibleInPricing: form.get("visibleInPricing") === "on",
      deductHours: form.get("deductHours") === "on",
      requiresSupervisor: form.get("requiresSupervisor") === "on",
      requiresManagement: form.get("requiresManagement") === "on",
      clientApprovalRequired: form.get("clientApprovalRequired") === "on",
      levelConfigs,
    };

    const saved = await mutation.mutate(
      creating ? "services/monthly" : `services/monthly/${editing!.id}`,
      {
        method: creating ? "POST" : "PUT",
        body: JSON.stringify(payload),
      },
      creating ? "Monthly service created." : "A new monthly service revision was created.",
    );
    if (saved) {
      closeForm();
    }
  }

  const current = editing?.revision;

  return (
    <>
      <SectionHeader
        eyebrow="Monthly catalog"
        title="Monthly services"
        description="Edit names, package hours, selling rates, internal costs, and setup fees through revision-safe backend APIs."
        action={
          <button className="os-button os-button-primary" type="button" onClick={openCreate}>
            Add monthly service
          </button>
        }
      />
      <CatalogFeedback error={mutation.error} success={mutation.success} />

      {(creating || editing) && (
        <section className="catalog-panel editor-panel">
          <div className="panel-heading">
            <div>
              <h2>{creating ? "New monthly service" : `Edit ${editing!.code}`}</h2>
              <p>
                {creating
                  ? "Create an initial draft or active revision."
                  : `Saving creates revision v${(current?.version ?? 0) + 1}; prior revisions remain pinned.`}
              </p>
            </div>
          </div>
          <form className="catalog-form wide-form" onSubmit={submit}>
            {creating && (
              <label>
                Code
                <input
                  name="code"
                  required
                  pattern="[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*"
                  placeholder="MS-HR"
                />
              </label>
            )}
            <label>
              Category
              <select name="categoryId" required defaultValue={editing?.categoryId ?? ""}>
                <option value="" disabled>
                  Select category
                </option>
                {snapshot.categories
                  .filter((category) => category.status !== "ARCHIVED")
                  .map((category) => (
                    <option value={category.id} key={category.id}>
                      {category.nameEn} · {category.status}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Arabic name
              <input name="nameAr" required dir="rtl" defaultValue={current?.nameAr} />
            </label>
            <label>
              English name
              <input name="nameEn" required defaultValue={current?.nameEn} />
            </label>
            <label className="form-span">
              Description
              <textarea name="description" required defaultValue={current?.description} />
            </label>
            <label>
              Selling hourly rate (SAR)
              <input
                name="sellingHourlyRateSar"
                type="number"
                min="0"
                max="1000000"
                step="0.01"
                required
                defaultValue={current?.sellingHourlyRateSar ?? 0}
              />
            </label>
            <label>
              Internal hourly cost (SAR)
              <input
                name="internalHourlyCostSar"
                type="number"
                min="0"
                max="1000000"
                step="0.01"
                required
                defaultValue={current?.internalHourlyCostSar ?? 0}
              />
            </label>
            <label>
              Setup fee %
              <input
                name="setupFeePct"
                type="number"
                min="0"
                max="100"
                step="0.0001"
                required
                defaultValue={current?.setupFeePct ?? 0}
              />
            </label>
            <label>
              Default SLA hours
              <input
                name="defaultSlaHours"
                type="number"
                min="0"
                max="8760"
                required
                defaultValue={current?.defaultSlaHours ?? 48}
              />
            </label>

            <fieldset className="form-span option-fieldset">
              <legend>Behavior</legend>
              <label className="checkbox-field">
                <input
                  name="visibleInPricing"
                  type="checkbox"
                  defaultChecked={current?.visibleInPricing ?? true}
                />
                Visible in future pricing
              </label>
              <label className="checkbox-field">
                <input
                  name="deductHours"
                  type="checkbox"
                  defaultChecked={current?.deductHours ?? true}
                />
                Deduct hours
              </label>
              <label className="checkbox-field">
                <input
                  name="requiresSupervisor"
                  type="checkbox"
                  defaultChecked={current?.requiresSupervisor ?? false}
                />
                Requires supervisor
              </label>
              <label className="checkbox-field">
                <input
                  name="requiresManagement"
                  type="checkbox"
                  defaultChecked={current?.requiresManagement ?? false}
                />
                Requires management
              </label>
              <label className="checkbox-field">
                <input
                  name="clientApprovalRequired"
                  type="checkbox"
                  defaultChecked={current?.clientApprovalRequired ?? false}
                />
                Client approval required
              </label>
            </fieldset>

            <fieldset className="form-span package-editor">
              <legend>Monthly hours by package</legend>
              <div className="package-config-grid">
                {snapshot.levels.map((level) => {
                  const config = levelConfigs.find(
                    (candidate) => candidate.serviceLevelId === level.id,
                  );
                  if (!config) {
                    return null;
                  }
                  return (
                    <article key={level.id}>
                      <div className="package-config-title">
                        <strong>{level.labelEn || level.code}</strong>
                        <span>{level.status}</span>
                      </div>
                      <label className="checkbox-field">
                        <input
                          type="checkbox"
                          checked={config.isEnabled}
                          disabled={level.status !== "ACTIVE"}
                          onChange={(event) =>
                            updateLevel(level.id, {
                              isEnabled: event.target.checked,
                            })
                          }
                        />
                        Enabled
                      </label>
                      <label>
                        Hours
                        <input
                          type="number"
                          min="0"
                          max="100000"
                          step="0.01"
                          value={config.hours}
                          onChange={(event) =>
                            updateLevel(level.id, {
                              hours: Number(event.target.value),
                            })
                          }
                        />
                      </label>
                      <label>
                        SLA hours
                        <input
                          type="number"
                          min="0"
                          max="8760"
                          value={config.slaHours ?? ""}
                          onChange={(event) =>
                            updateLevel(level.id, {
                              slaHours:
                                event.target.value === "" ? null : Number(event.target.value),
                            })
                          }
                        />
                      </label>
                    </article>
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
              submitLabel={creating ? "Create service" : "Create revision"}
            />
          </form>
        </section>
      )}

      <section className="catalog-panel">
        <div className="panel-heading toolbar-heading">
          <div>
            <h2>Configured services</h2>
            <p>{snapshot.services.length} stable service records.</p>
          </div>
          <label className="compact-filter">
            Category
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="ALL">All categories</option>
              {snapshot.categories.map((category) => (
                <option value={category.id} key={category.id}>
                  {category.nameEn}
                </option>
              ))}
            </select>
          </label>
        </div>
        {visibleServices.length === 0 ? (
          <EmptyState>No monthly services match this filter.</EmptyState>
        ) : (
          <div className="entity-grid service-grid">
            {visibleServices.map((service) => (
              <article className="entity-card" key={service.id}>
                <div className="entity-card-top">
                  <div>
                    <small>
                      {service.code} · {service.category.nameEn}
                    </small>
                    <h3>{service.revision?.nameEn ?? service.code}</h3>
                    <p dir="rtl">{service.revision?.nameAr}</p>
                  </div>
                  <StatusBadge status={service.status} />
                </div>
                <p className="entity-description">
                  {service.revision?.description || "No description provided."}
                </p>
                <dl className="entity-meta four-up">
                  <div>
                    <dt>Revision</dt>
                    <dd>v{service.revision?.version ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Items</dt>
                    <dd>{service.itemCount}</dd>
                  </div>
                  <div>
                    <dt>Selling rate</dt>
                    <dd>{service.revision?.sellingHourlyRateSar ?? 0} SAR</dd>
                  </div>
                  <div>
                    <dt>Internal cost</dt>
                    <dd>{service.revision?.internalHourlyCostSar ?? 0} SAR</dd>
                  </div>
                </dl>
                <div className="hours-strip" aria-label="Package hours">
                  {service.revision?.levelConfigs.map((config) => (
                    <span
                      className={config.isEnabled ? "enabled" : "disabled"}
                      key={config.serviceLevelId}
                    >
                      <strong>{config.serviceLevelLabelEn || config.serviceLevelCode}</strong>
                      {config.isEnabled ? `${config.hours}h` : "Off"}
                    </span>
                  ))}
                </div>
                <OrderControl
                  path={`services/monthly/${service.id}`}
                  current={service.sortOrder}
                  disabled={mutation.submitting || service.status === "ARCHIVED"}
                  mutate={mutation.mutate}
                />
                <div className="entity-card-actions">
                  <button
                    className="os-button os-button-secondary"
                    type="button"
                    disabled={service.status === "ARCHIVED"}
                    onClick={() => openEdit(service)}
                  >
                    Edit hours & rates
                  </button>
                  <LifecycleActions
                    path={`services/monthly/${service.id}`}
                    status={service.status}
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
