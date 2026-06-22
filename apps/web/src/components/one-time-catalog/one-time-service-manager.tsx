"use client";

import { useMemo, useState, type FormEvent } from "react";
import { refreshOneTimeCatalog } from "../../lib/one-time-catalog-client";
import type {
  OneTimeCatalogSnapshot,
  OneTimeDeliverable,
  OneTimePhase,
  OneTimeService,
  OneTimeTask,
} from "../../lib/one-time-catalog-types";
import type { CatalogStatus } from "../../lib/catalog-types";
import {
  CatalogFeedback,
  EmptyState,
  FormActions,
  LifecycleActions,
  OrderControl,
  SectionHeader,
  StatusBadge,
  useCatalogMutation,
} from "../catalog/catalog-shared";

interface EditablePhase {
  code: string;
  nameAr: string;
  nameEn: string;
  description: string;
  sortOrder: number;
  isRequired: boolean;
  status: CatalogStatus;
}

interface EditableTask {
  code: string;
  nameAr: string;
  nameEn: string;
  description: string;
  estimatedHours: number;
  sortOrder: number;
  isRequired: boolean;
  status: CatalogStatus;
}

interface EditableDeliverable {
  code: string;
  phaseCode: string;
  nameAr: string;
  nameEn: string;
  description: string;
  sortOrder: number;
  isRequired: boolean;
  requiresClientApproval: boolean;
  status: CatalogStatus;
  tasks: EditableTask[];
}

function editablePhases(phases: OneTimePhase[] = []): EditablePhase[] {
  return phases.map((phase) => ({
    code: phase.code,
    nameAr: phase.nameAr ?? phase.nameEn,
    nameEn: phase.nameEn,
    description: phase.description ?? "",
    sortOrder: phase.sortOrder,
    isRequired: phase.isRequired,
    status: phase.status,
  }));
}

function editableTasks(tasks: OneTimeTask[]): EditableTask[] {
  return tasks.map((task) => ({
    code: task.code,
    nameAr: task.nameAr,
    nameEn: task.nameEn,
    description: task.description ?? "",
    estimatedHours: task.estimatedHours,
    sortOrder: task.sortOrder,
    isRequired: task.isRequired,
    status: task.status,
  }));
}

function editableDeliverables(deliverables: OneTimeDeliverable[] = []): EditableDeliverable[] {
  return deliverables.map((deliverable) => ({
    code: deliverable.code,
    phaseCode: deliverable.phaseCode ?? "",
    nameAr: deliverable.nameAr ?? deliverable.nameEn,
    nameEn: deliverable.nameEn,
    description: deliverable.description ?? "",
    sortOrder: deliverable.sortOrder,
    isRequired: deliverable.isRequired,
    requiresClientApproval: deliverable.requiresClientApproval,
    status: deliverable.status,
    tasks: editableTasks(deliverable.tasks),
  }));
}

function nextCode(prefix: string, count: number): string {
  return `${prefix}-${String(count + 1).padStart(2, "0")}`;
}

export function OneTimeServiceManager({
  initialSnapshot,
}: {
  initialSnapshot: OneTimeCatalogSnapshot;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [editing, setEditing] = useState<OneTimeService | null>(null);
  const [creating, setCreating] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [phases, setPhases] = useState<EditablePhase[]>([]);
  const [deliverables, setDeliverables] = useState<EditableDeliverable[]>([]);
  const mutation = useCatalogMutation(setSnapshot, refreshOneTimeCatalog);
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
    setPhases([]);
    setDeliverables([]);
  }

  function openEdit(service: OneTimeService) {
    mutation.clearFeedback();
    setCreating(false);
    setEditing(service);
    setPhases(editablePhases(service.revision?.phases));
    setDeliverables(editableDeliverables(service.revision?.deliverables));
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
    setPhases([]);
    setDeliverables([]);
  }

  function addPhase() {
    setPhases((current) => [
      ...current,
      {
        code: nextCode("PHASE", current.length),
        nameAr: "",
        nameEn: "",
        description: "",
        sortOrder: current.length,
        isRequired: true,
        status: "ACTIVE",
      },
    ]);
  }

  function updatePhase(index: number, update: Partial<EditablePhase>) {
    setPhases((current) =>
      current.map((phase, candidate) => (candidate === index ? { ...phase, ...update } : phase)),
    );
  }

  function removePhase(index: number) {
    const removedCode = phases[index]?.code;
    setPhases((current) => current.filter((_, candidate) => candidate !== index));
    if (removedCode) {
      setDeliverables((current) =>
        current.map((deliverable) =>
          deliverable.phaseCode === removedCode ? { ...deliverable, phaseCode: "" } : deliverable,
        ),
      );
    }
  }

  function addDeliverable() {
    setDeliverables((current) => [
      ...current,
      {
        code: nextCode("DEL", current.length),
        phaseCode: phases[0]?.code ?? "",
        nameAr: "",
        nameEn: "",
        description: "",
        sortOrder: current.length,
        isRequired: true,
        requiresClientApproval: true,
        status: "ACTIVE",
        tasks: [],
      },
    ]);
  }

  function updateDeliverable(index: number, update: Partial<EditableDeliverable>) {
    setDeliverables((current) =>
      current.map((deliverable, candidate) =>
        candidate === index ? { ...deliverable, ...update } : deliverable,
      ),
    );
  }

  function addTask(deliverableIndex: number) {
    setDeliverables((current) =>
      current.map((deliverable, candidate) =>
        candidate === deliverableIndex
          ? {
              ...deliverable,
              tasks: [
                ...deliverable.tasks,
                {
                  code: nextCode("TASK", deliverable.tasks.length),
                  nameAr: "",
                  nameEn: "",
                  description: "",
                  estimatedHours: 0,
                  sortOrder: deliverable.tasks.length,
                  isRequired: true,
                  status: "ACTIVE",
                },
              ],
            }
          : deliverable,
      ),
    );
  }

  function updateTask(deliverableIndex: number, taskIndex: number, update: Partial<EditableTask>) {
    setDeliverables((current) =>
      current.map((deliverable, candidate) =>
        candidate === deliverableIndex
          ? {
              ...deliverable,
              tasks: deliverable.tasks.map((task, taskCandidate) =>
                taskCandidate === taskIndex ? { ...task, ...update } : task,
              ),
            }
          : deliverable,
      ),
    );
  }

  function removeTask(deliverableIndex: number, taskIndex: number) {
    setDeliverables((current) =>
      current.map((deliverable, candidate) =>
        candidate === deliverableIndex
          ? {
              ...deliverable,
              tasks: deliverable.tasks.filter((_, taskCandidate) => taskCandidate !== taskIndex),
            }
          : deliverable,
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
      serviceLine: String(form.get("serviceLine") ?? ""),
      nameAr: String(form.get("nameAr") ?? "").trim(),
      nameEn: String(form.get("nameEn") ?? "").trim(),
      description: String(form.get("description") ?? "").trim(),
      basePriceSar: Number(form.get("basePriceSar") ?? 0),
      estimatedHours: Number(form.get("estimatedHours") ?? 0),
      internalHourlyCostSar: Number(form.get("internalHourlyCostSar") ?? 0),
      durationDays: Number(form.get("durationDays") ?? 0),
      visibleInPricing: form.get("visibleInPricing") === "on",
      createsProject: form.get("createsProject") === "on",
      phases: phases.map((phase) => ({
        ...phase,
        code: phase.code.trim().toUpperCase(),
      })),
      deliverables: deliverables.map((deliverable) => ({
        ...deliverable,
        code: deliverable.code.trim().toUpperCase(),
        phaseCode: deliverable.phaseCode.trim().toUpperCase() || undefined,
        tasks: deliverable.tasks.map((task) => ({
          ...task,
          code: task.code.trim().toUpperCase(),
        })),
      })),
    };
    const saved = await mutation.mutate(
      creating ? "services/one-time" : `services/one-time/${editing!.id}`,
      {
        method: creating ? "POST" : "PUT",
        body: JSON.stringify(payload),
      },
      creating ? "One-time service created." : "A new one-time service revision was created.",
    );
    if (saved) {
      closeForm();
    }
  }

  const current = editing?.revision;

  return (
    <>
      <SectionHeader
        eyebrow="One-time catalog"
        title="One-time services"
        description="Configure Build and Digital services, pricing, duration, phases, deliverables, and tasks through revision-safe APIs."
        action={
          <button className="button-primary" type="button" onClick={openCreate}>
            Add one-time service
          </button>
        }
      />
      <CatalogFeedback error={mutation.error} success={mutation.success} />

      {(creating || editing) && (
        <section className="catalog-panel editor-panel">
          <div className="panel-heading">
            <div>
              <h2>{creating ? "New one-time service" : `Edit ${editing!.code}`}</h2>
              <p>
                {creating
                  ? "Create the stable record and its first template revision."
                  : `Saving creates revision v${(current?.version ?? 0) + 1}; issued history remains pinned.`}
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
                  placeholder="OT-BUILD-WEBSITE"
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
              Service path/type
              <select
                name="serviceLine"
                required
                defaultValue={editing?.serviceLine ?? snapshot.servicePaths[0] ?? ""}
              >
                {snapshot.servicePaths.map((path) => (
                  <option value={path} key={path}>
                    {path}
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
              Base price (SAR)
              <input
                name="basePriceSar"
                type="number"
                min="0"
                max="100000000"
                step="0.01"
                required
                defaultValue={current?.basePriceSar ?? 0}
              />
            </label>
            <label>
              Estimated hours
              <input
                name="estimatedHours"
                type="number"
                min="0"
                max="100000"
                step="0.01"
                required
                defaultValue={current?.estimatedHours ?? 0}
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
              Estimated duration (days)
              <input
                name="durationDays"
                type="number"
                min="0"
                max="3650"
                required
                defaultValue={current?.durationDays ?? 0}
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
                  name="createsProject"
                  type="checkbox"
                  defaultChecked={current?.createsProject ?? true}
                />
                Creates a project after future activation
              </label>
            </fieldset>

            <fieldset className="form-span package-editor">
              <legend>Service phases</legend>
              <div className="template-toolbar">
                <p>Phase codes remain stable inside each revision.</p>
                <button className="button-secondary" type="button" onClick={addPhase}>
                  Add phase
                </button>
              </div>
              {phases.length === 0 ? (
                <EmptyState>No phases configured.</EmptyState>
              ) : (
                <div className="template-stack">
                  {phases.map((phase, index) => (
                    <article className="template-editor-card" key={`${index}-${phase.code}`}>
                      <div className="template-card-heading">
                        <strong>Phase {index + 1}</strong>
                        <button
                          className="button-danger"
                          type="button"
                          onClick={() => removePhase(index)}
                        >
                          Remove phase
                        </button>
                      </div>
                      <div className="template-field-grid">
                        <label>
                          Code
                          <input
                            required
                            value={phase.code}
                            onChange={(event) => updatePhase(index, { code: event.target.value })}
                          />
                        </label>
                        <label>
                          English name
                          <input
                            required
                            value={phase.nameEn}
                            onChange={(event) => updatePhase(index, { nameEn: event.target.value })}
                          />
                        </label>
                        <label>
                          Arabic name
                          <input
                            required
                            dir="rtl"
                            value={phase.nameAr}
                            onChange={(event) => updatePhase(index, { nameAr: event.target.value })}
                          />
                        </label>
                        <label>
                          Order
                          <input
                            type="number"
                            min="0"
                            value={phase.sortOrder}
                            onChange={(event) =>
                              updatePhase(index, {
                                sortOrder: Number(event.target.value),
                              })
                            }
                          />
                        </label>
                        <label className="form-span">
                          Description
                          <textarea
                            value={phase.description}
                            onChange={(event) =>
                              updatePhase(index, {
                                description: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          Status
                          <select
                            value={phase.status}
                            onChange={(event) =>
                              updatePhase(index, {
                                status: event.target.value as CatalogStatus,
                              })
                            }
                          >
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                            <option value="ARCHIVED">Archived</option>
                          </select>
                        </label>
                        <label className="checkbox-field">
                          <input
                            type="checkbox"
                            checked={phase.isRequired}
                            onChange={(event) =>
                              updatePhase(index, {
                                isRequired: event.target.checked,
                              })
                            }
                          />
                          Required
                        </label>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </fieldset>

            <fieldset className="form-span package-editor">
              <legend>Deliverables and tasks</legend>
              <div className="template-toolbar">
                <p>Each task belongs to one deliverable in this revision.</p>
                <button className="button-secondary" type="button" onClick={addDeliverable}>
                  Add deliverable
                </button>
              </div>
              {deliverables.length === 0 ? (
                <EmptyState>No deliverables configured.</EmptyState>
              ) : (
                <div className="template-stack">
                  {deliverables.map((deliverable, deliverableIndex) => (
                    <article
                      className="template-editor-card"
                      key={`${deliverableIndex}-${deliverable.code}`}
                    >
                      <div className="template-card-heading">
                        <strong>Deliverable {deliverableIndex + 1}</strong>
                        <button
                          className="button-danger"
                          type="button"
                          onClick={() =>
                            setDeliverables((current) =>
                              current.filter((_, candidate) => candidate !== deliverableIndex),
                            )
                          }
                        >
                          Remove deliverable
                        </button>
                      </div>
                      <div className="template-field-grid">
                        <label>
                          Code
                          <input
                            required
                            value={deliverable.code}
                            onChange={(event) =>
                              updateDeliverable(deliverableIndex, {
                                code: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          Phase
                          <select
                            value={deliverable.phaseCode}
                            onChange={(event) =>
                              updateDeliverable(deliverableIndex, {
                                phaseCode: event.target.value,
                              })
                            }
                          >
                            <option value="">No phase</option>
                            {phases.map((phase) => (
                              <option value={phase.code} key={phase.code}>
                                {phase.nameEn || phase.code}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          English name
                          <input
                            required
                            value={deliverable.nameEn}
                            onChange={(event) =>
                              updateDeliverable(deliverableIndex, {
                                nameEn: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          Arabic name
                          <input
                            required
                            dir="rtl"
                            value={deliverable.nameAr}
                            onChange={(event) =>
                              updateDeliverable(deliverableIndex, {
                                nameAr: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          Order
                          <input
                            type="number"
                            min="0"
                            value={deliverable.sortOrder}
                            onChange={(event) =>
                              updateDeliverable(deliverableIndex, {
                                sortOrder: Number(event.target.value),
                              })
                            }
                          />
                        </label>
                        <label className="form-span">
                          Description
                          <textarea
                            value={deliverable.description}
                            onChange={(event) =>
                              updateDeliverable(deliverableIndex, {
                                description: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          Status
                          <select
                            value={deliverable.status}
                            onChange={(event) =>
                              updateDeliverable(deliverableIndex, {
                                status: event.target.value as CatalogStatus,
                              })
                            }
                          >
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                            <option value="ARCHIVED">Archived</option>
                          </select>
                        </label>
                        <label className="checkbox-field">
                          <input
                            type="checkbox"
                            checked={deliverable.isRequired}
                            onChange={(event) =>
                              updateDeliverable(deliverableIndex, {
                                isRequired: event.target.checked,
                              })
                            }
                          />
                          Required output
                        </label>
                        <label className="checkbox-field">
                          <input
                            type="checkbox"
                            checked={deliverable.requiresClientApproval}
                            onChange={(event) =>
                              updateDeliverable(deliverableIndex, {
                                requiresClientApproval: event.target.checked,
                              })
                            }
                          />
                          Client approval
                        </label>
                      </div>
                      <div className="task-editor">
                        <div className="template-toolbar">
                          <strong>Tasks</strong>
                          <button
                            className="button-quiet"
                            type="button"
                            onClick={() => addTask(deliverableIndex)}
                          >
                            Add task
                          </button>
                        </div>
                        {deliverable.tasks.map((task, taskIndex) => (
                          <div className="task-editor-row" key={`${taskIndex}-${task.code}`}>
                            <input
                              aria-label={`Task ${taskIndex + 1} code`}
                              required
                              value={task.code}
                              onChange={(event) =>
                                updateTask(deliverableIndex, taskIndex, {
                                  code: event.target.value,
                                })
                              }
                            />
                            <input
                              aria-label={`Task ${taskIndex + 1} English name`}
                              required
                              placeholder="English task name"
                              value={task.nameEn}
                              onChange={(event) =>
                                updateTask(deliverableIndex, taskIndex, {
                                  nameEn: event.target.value,
                                })
                              }
                            />
                            <input
                              aria-label={`Task ${taskIndex + 1} Arabic name`}
                              required
                              dir="rtl"
                              placeholder="Arabic task name"
                              value={task.nameAr}
                              onChange={(event) =>
                                updateTask(deliverableIndex, taskIndex, {
                                  nameAr: event.target.value,
                                })
                              }
                            />
                            <input
                              aria-label={`Task ${taskIndex + 1} description`}
                              placeholder="Task description"
                              value={task.description}
                              onChange={(event) =>
                                updateTask(deliverableIndex, taskIndex, {
                                  description: event.target.value,
                                })
                              }
                            />
                            <input
                              aria-label={`Task ${taskIndex + 1} hours`}
                              type="number"
                              min="0"
                              step="0.01"
                              value={task.estimatedHours}
                              onChange={(event) =>
                                updateTask(deliverableIndex, taskIndex, {
                                  estimatedHours: Number(event.target.value),
                                })
                              }
                            />
                            <input
                              aria-label={`Task ${taskIndex + 1} order`}
                              type="number"
                              min="0"
                              value={task.sortOrder}
                              onChange={(event) =>
                                updateTask(deliverableIndex, taskIndex, {
                                  sortOrder: Number(event.target.value),
                                })
                              }
                            />
                            <select
                              aria-label={`Task ${taskIndex + 1} status`}
                              value={task.status}
                              onChange={(event) =>
                                updateTask(deliverableIndex, taskIndex, {
                                  status: event.target.value as CatalogStatus,
                                })
                              }
                            >
                              <option value="ACTIVE">Active</option>
                              <option value="INACTIVE">Inactive</option>
                              <option value="ARCHIVED">Archived</option>
                            </select>
                            <label className="checkbox-field">
                              <input
                                type="checkbox"
                                checked={task.isRequired}
                                onChange={(event) =>
                                  updateTask(deliverableIndex, taskIndex, {
                                    isRequired: event.target.checked,
                                  })
                                }
                              />
                              Required
                            </label>
                            <button
                              className="button-danger"
                              type="button"
                              onClick={() => removeTask(deliverableIndex, taskIndex)}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              )}
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
            <h2>Configured one-time services</h2>
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
          <EmptyState>No one-time services match this filter.</EmptyState>
        ) : (
          <div className="entity-grid service-grid">
            {visibleServices.map((service) => (
              <article className="entity-card" key={service.id}>
                <div className="entity-card-top">
                  <div>
                    <small>
                      {service.code} · {service.serviceLine} · {service.category.nameEn}
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
                    <dt>Base price</dt>
                    <dd>{service.revision?.basePriceSar ?? 0} SAR</dd>
                  </div>
                  <div>
                    <dt>Hours</dt>
                    <dd>{service.revision?.estimatedHours ?? 0}</dd>
                  </div>
                  <div>
                    <dt>Duration</dt>
                    <dd>{service.revision?.durationDays ?? 0} days</dd>
                  </div>
                  <div>
                    <dt>Revision</dt>
                    <dd>v{service.revision?.version ?? "—"}</dd>
                  </div>
                </dl>
                <div className="rule-list">
                  <span>
                    <strong>Phases:</strong> {service.revision?.phases.length ?? 0}
                  </span>
                  <span>
                    <strong>Deliverables:</strong> {service.revision?.deliverables.length ?? 0}
                  </span>
                  <span>
                    <strong>Tasks:</strong>{" "}
                    {service.revision?.deliverables.reduce(
                      (total, deliverable) => total + deliverable.tasks.length,
                      0,
                    ) ?? 0}
                  </span>
                </div>
                <OrderControl
                  path={`services/one-time/${service.id}`}
                  current={service.sortOrder}
                  disabled={mutation.submitting || service.status === "ARCHIVED"}
                  mutate={mutation.mutate}
                />
                <div className="entity-card-actions">
                  <button
                    className="button-secondary"
                    type="button"
                    disabled={service.status === "ARCHIVED"}
                    onClick={() => openEdit(service)}
                  >
                    Edit details & template
                  </button>
                  <LifecycleActions
                    path={`services/one-time/${service.id}`}
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
