"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import {
  pricingErrorMessage,
  pricingRequest,
  refreshPricingDrafts,
} from "../../lib/pricing-client";
import { createQuote, quoteErrorMessage } from "../../lib/quote-client";
import type {
  MonthlyPricingSelection,
  OneTimePricingSelection,
  PricingCalculation,
  PricingDraft,
  PricingDraftSummary,
  PricingInput,
  PricingStudioCatalog,
} from "../../lib/pricing-types";
import { LogoutButton } from "../logout-button";
import { EmptyState, PageHeader, SmartTable } from "../premium-os";

interface MonthlySelectionState {
  levelId: string;
  quantity: number;
}

function pricingDateInput(value?: string): string {
  return (value ? new Date(value) : new Date()).toISOString().slice(0, 10);
}

function pricingDateIso(value: string): string {
  return new Date(`${value}T12:00:00.000Z`).toISOString();
}

function sar(value: number): string {
  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 2,
  }).format(value);
}

function initialMonthlySelections(draft?: PricingDraft | null): Map<string, MonthlySelectionState> {
  return new Map(
    (draft?.monthlySelections ?? []).map((selection) => [
      selection.monthlyServiceRevisionId,
      { levelId: selection.serviceLevelId, quantity: selection.quantity },
    ]),
  );
}

function initialOneTimeSelections(draft?: PricingDraft | null): Map<string, number> {
  return new Map(
    (draft?.oneTimeSelections ?? []).map((selection) => [
      selection.oneTimeServiceRevisionId,
      selection.quantity,
    ]),
  );
}

export function PricingStudio({
  displayName,
  embedded = false,
  isAdmin,
  initialCatalog,
  initialDrafts,
  initialDraft,
}: {
  displayName: string;
  embedded?: boolean;
  isAdmin: boolean;
  initialCatalog: PricingStudioCatalog;
  initialDrafts: PricingDraftSummary[];
  initialDraft?: PricingDraft | null;
}) {
  const router = useRouter();
  const [drafts, setDrafts] = useState(initialDrafts);
  const [currentDraft, setCurrentDraft] = useState(initialDraft ?? null);
  const [clientId, setClientId] = useState(
    initialDraft?.clientId ?? initialCatalog.clients[0]?.id ?? "",
  );
  const [title, setTitle] = useState(initialDraft?.title ?? "Pricing draft");
  const [notes, setNotes] = useState(initialDraft?.notes ?? "");
  const [pricingDate, setPricingDate] = useState(pricingDateInput(initialDraft?.pricingDate));
  const [monthlySelections, setMonthlySelections] = useState(
    initialMonthlySelections(initialDraft),
  );
  const [oneTimeSelections, setOneTimeSelections] = useState(
    initialOneTimeSelections(initialDraft),
  );
  const [calculation, setCalculation] = useState<PricingCalculation | null>(
    initialDraft?.calculation ?? null,
  );
  const [submitting, setSubmitting] = useState<"preview" | "save" | "archive" | null>(null);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();

  const selectedClient = initialCatalog.clients.find((client) => client.id === clientId);
  const selectedCount = monthlySelections.size + oneTimeSelections.size;
  const isArchived = currentDraft?.status === "ARCHIVED";
  const canCalculate = Boolean(clientId && title.trim() && selectedCount > 0 && !isArchived);

  const input = useMemo<PricingInput>(
    () => ({
      clientId,
      title: title.trim(),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      pricingDate: pricingDateIso(pricingDate),
      currency: "SAR",
      monthlySelections: [...monthlySelections.entries()].map(
        ([monthlyServiceRevisionId, selection]): MonthlyPricingSelection => ({
          monthlyServiceRevisionId,
          serviceLevelId: selection.levelId,
          quantity: selection.quantity,
        }),
      ),
      oneTimeSelections: [...oneTimeSelections.entries()].map(
        ([oneTimeServiceRevisionId, quantity]): OneTimePricingSelection => ({
          oneTimeServiceRevisionId,
          quantity,
        }),
      ),
    }),
    [clientId, monthlySelections, notes, oneTimeSelections, pricingDate, title],
  );

  function clearFeedback() {
    setError(undefined);
    setSuccess(undefined);
  }

  function toggleMonthly(revisionId: string, defaultLevelId: string, checked: boolean) {
    clearFeedback();
    setCalculation(null);
    setMonthlySelections((current) => {
      const next = new Map(current);
      if (checked) {
        next.set(revisionId, { levelId: defaultLevelId, quantity: 1 });
      } else {
        next.delete(revisionId);
      }
      return next;
    });
  }

  function updateMonthly(revisionId: string, update: Partial<MonthlySelectionState>) {
    clearFeedback();
    setCalculation(null);
    setMonthlySelections((current) => {
      const next = new Map(current);
      const existing = next.get(revisionId);
      if (existing) {
        next.set(revisionId, { ...existing, ...update });
      }
      return next;
    });
  }

  function toggleOneTime(revisionId: string, checked: boolean) {
    clearFeedback();
    setCalculation(null);
    setOneTimeSelections((current) => {
      const next = new Map(current);
      if (checked) {
        next.set(revisionId, 1);
      } else {
        next.delete(revisionId);
      }
      return next;
    });
  }

  async function preview() {
    clearFeedback();
    setSubmitting("preview");
    try {
      const result = await pricingRequest<{ calculation: PricingCalculation }>("pricing/preview", {
        method: "POST",
        body: JSON.stringify(input),
      });
      setCalculation(result.calculation);
      setSuccess("Backend pricing preview recalculated.");
    } catch (previewError) {
      setError(pricingErrorMessage(previewError));
    } finally {
      setSubmitting(null);
    }
  }

  async function save() {
    clearFeedback();
    setSubmitting("save");
    try {
      const saved = await pricingRequest<PricingDraft>(
        currentDraft ? `pricing/drafts/${currentDraft.id}` : "pricing/drafts",
        {
          method: currentDraft ? "PUT" : "POST",
          body: JSON.stringify(input),
        },
      );
      setCurrentDraft(saved);
      setCalculation(saved.calculation);
      setDrafts(await refreshPricingDrafts());
      setSuccess(currentDraft ? "Pricing draft updated." : "Pricing draft saved.");
      router.replace(`/pricing/${saved.id}`);
    } catch (saveError) {
      setError(pricingErrorMessage(saveError));
    } finally {
      setSubmitting(null);
    }
  }

  async function archive() {
    if (
      !currentDraft ||
      !window.confirm("Archive this pricing draft? It will remain available as historical data.")
    ) {
      return;
    }
    const reason = window.prompt("Why are you archiving this pricing draft?");
    if (!reason?.trim()) {
      return;
    }
    clearFeedback();
    setSubmitting("archive");
    try {
      const archived = await pricingRequest<PricingDraft>(
        `pricing/drafts/${currentDraft.id}/archive`,
        {
          method: "POST",
          body: JSON.stringify({ reason: reason.trim() }),
        },
      );
      setCurrentDraft(archived);
      setDrafts(await refreshPricingDrafts());
      setSuccess("Pricing draft archived.");
    } catch (archiveError) {
      setError(pricingErrorMessage(archiveError));
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className={embedded ? "pricing-shell pricing-shell-embedded" : "pricing-shell"}>
      {!embedded && (
        <header className="pricing-topbar">
          <Link className="admin-brand" href="/pricing">
            <span className="brand-mark" aria-hidden="true">
              J
            </span>
            <span>
              <strong>Jzoom</strong>
              <small>Pricing Studio</small>
            </span>
          </Link>
          <nav aria-label="Pricing account">
            {isAdmin && <Link href="/admin/pricing-rules">Pricing rules</Link>}
            <Link href="/pricing/quotes">Quotes</Link>
            <Link href="/profile">Profile</Link>
            <span>{displayName}</span>
            <LogoutButton />
          </nav>
        </header>
      )}

      <div className="pricing-layout">
        <aside className="pricing-drafts">
          <div className="pricing-aside-heading">
            <div>
              <p className="eyebrow">Saved work</p>
              <h2>Pricing drafts</h2>
            </div>
            <Link className="os-button os-button-primary" href="/pricing">
              New
            </Link>
          </div>
          {drafts.length === 0 ? (
            <p className="pricing-muted">No pricing drafts yet.</p>
          ) : (
            <div className="pricing-draft-list">
              {drafts.map((draft) => (
                <Link
                  key={draft.id}
                  href={`/pricing/${draft.id}`}
                  className={currentDraft?.id === draft.id ? "active" : undefined}
                >
                  <strong>{draft.title}</strong>
                  <span>{draft.client.name}</span>
                  <small>
                    {draft.draftNumber} - {draft.itemCount} items
                  </small>
                </Link>
              ))}
            </div>
          )}
        </aside>

        <main className="pricing-main">
          <PageHeader
            eyebrow="Pricing Studio foundation"
            title={currentDraft ? currentDraft.title : "New pricing draft"}
            description="Select active catalog revisions, recalculate through the backend, and save the result without creating a quote."
          >
            {currentDraft && (
              <div className="pricing-draft-identity">
                <strong>{currentDraft.draftNumber}</strong>
                <span>Calculation v{currentDraft.calculationVersion}</span>
              </div>
            )}
          </PageHeader>

          {(error || success) && (
            <p
              className={error ? "catalog-feedback error" : "catalog-feedback success"}
              role="status"
            >
              {error ?? success}
            </p>
          )}
          {isArchived && (
            <p className="catalog-feedback error">
              This pricing draft is archived and cannot be recalculated or changed.
            </p>
          )}

          <section className="catalog-panel">
            <div className="panel-heading">
              <div>
                <h2>1. Client setup</h2>
                <p>Account Managers see only clients assigned to their portfolio.</p>
              </div>
            </div>
            <div className="catalog-form wide-form">
              <label>
                Client
                <select
                  aria-label="Client"
                  value={clientId}
                  disabled={isArchived}
                  onChange={(event) => {
                    setClientId(event.target.value);
                    setCalculation(null);
                  }}
                >
                  {initialCatalog.clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} ({client.code})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Draft title
                <input
                  aria-label="Draft title"
                  value={title}
                  disabled={isArchived}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>
              <label>
                Pricing date
                <input
                  aria-label="Pricing date"
                  type="date"
                  value={pricingDate}
                  disabled={isArchived}
                  onChange={(event) => {
                    setPricingDate(event.target.value);
                    setCalculation(null);
                  }}
                />
              </label>
              <label className="form-span">
                Internal notes
                <textarea
                  aria-label="Internal notes"
                  value={notes}
                  disabled={isArchived}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </label>
            </div>
            {selectedClient && (
              <dl className="entity-meta four-up">
                <div>
                  <dt>Sector</dt>
                  <dd>{selectedClient.sector}</dd>
                </div>
                <div>
                  <dt>City</dt>
                  <dd>{selectedClient.city ?? "—"}</dd>
                </div>
                <div>
                  <dt>Legal name</dt>
                  <dd>{selectedClient.legalName ?? selectedClient.name}</dd>
                </div>
                <div>
                  <dt>Approver</dt>
                  <dd>{selectedClient.authorizedApprover}</dd>
                </div>
              </dl>
            )}
          </section>

          <section className="catalog-panel">
            <div className="panel-heading">
              <div>
                <h2>2. Monthly services</h2>
                <p>Select one package level per monthly service.</p>
              </div>
              <span>{monthlySelections.size} selected</span>
            </div>
            <div className="pricing-service-grid">
              {initialCatalog.monthlyServices.map((service) => {
                const selected = monthlySelections.get(service.revision.id);
                return (
                  <article
                    className={selected ? "pricing-service-card selected" : "pricing-service-card"}
                    key={service.id}
                  >
                    <label className="pricing-select-heading">
                      <input
                        type="checkbox"
                        aria-label={`Select ${service.revision.nameEn}`}
                        checked={Boolean(selected)}
                        disabled={isArchived}
                        onChange={(event) =>
                          toggleMonthly(
                            service.revision.id,
                            service.revision.levels[0]!.id,
                            event.target.checked,
                          )
                        }
                      />
                      <span>
                        <small>{service.code}</small>
                        <strong>{service.revision.nameEn}</strong>
                        <em>{service.categoryName}</em>
                      </span>
                    </label>
                    <p>{service.revision.description}</p>
                    {selected && (
                      <div className="pricing-selection-fields">
                        <label>
                          Package
                          <select
                            aria-label={`${service.revision.nameEn} package`}
                            value={selected.levelId}
                            onChange={(event) =>
                              updateMonthly(service.revision.id, {
                                levelId: event.target.value,
                              })
                            }
                          >
                            {service.revision.levels.map((level) => (
                              <option key={level.id} value={level.id}>
                                {level.labelEn ?? level.labelAr} - {level.hours}h
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Quantity
                          <input
                            aria-label={`${service.revision.nameEn} quantity`}
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={selected.quantity}
                            onChange={(event) =>
                              updateMonthly(service.revision.id, {
                                quantity: Number(event.target.value),
                              })
                            }
                          />
                        </label>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          <section className="catalog-panel">
            <div className="panel-heading">
              <div>
                <h2>3. One-time services</h2>
                <p>Select active Build and Digital services from the configured catalog.</p>
              </div>
              <span>{oneTimeSelections.size} selected</span>
            </div>
            <div className="pricing-service-grid">
              {initialCatalog.oneTimeServices.map((service) => {
                const quantity = oneTimeSelections.get(service.revision.id);
                const selected = quantity !== undefined;
                return (
                  <article
                    className={selected ? "pricing-service-card selected" : "pricing-service-card"}
                    key={service.id}
                  >
                    <label className="pricing-select-heading">
                      <input
                        type="checkbox"
                        aria-label={`Select ${service.revision.nameEn}`}
                        checked={selected}
                        disabled={isArchived}
                        onChange={(event) =>
                          toggleOneTime(service.revision.id, event.target.checked)
                        }
                      />
                      <span>
                        <small>{service.code}</small>
                        <strong>{service.revision.nameEn}</strong>
                        <em>{service.serviceLine}</em>
                      </span>
                    </label>
                    <p>{service.revision.description}</p>
                    <dl className="pricing-card-meta">
                      <div>
                        <dt>Base price</dt>
                        <dd>{sar(service.revision.basePriceSar)}</dd>
                      </div>
                      <div>
                        <dt>Duration</dt>
                        <dd>{service.revision.durationDays} days</dd>
                      </div>
                    </dl>
                    {selected && (
                      <label className="pricing-quantity">
                        Quantity
                        <input
                          aria-label={`${service.revision.nameEn} quantity`}
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={quantity}
                          onChange={(event) => {
                            const next = new Map(oneTimeSelections);
                            next.set(service.revision.id, Number(event.target.value));
                            setOneTimeSelections(next);
                            setCalculation(null);
                          }}
                        />
                      </label>
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          <section className="catalog-panel pricing-review">
            <div className="panel-heading">
              <div>
                <h2>4. Backend preview</h2>
                <p>Totals are trusted only after backend recalculation.</p>
              </div>
              <div className="row-actions">
                <button
                  className="os-button os-button-secondary"
                  type="button"
                  disabled={!canCalculate || submitting !== null}
                  onClick={() => void preview()}
                >
                  {submitting === "preview" ? "Calculating..." : "Recalculate preview"}
                </button>
                <button
                  className="os-button os-button-primary"
                  type="button"
                  disabled={!canCalculate || submitting !== null}
                  onClick={() => void save()}
                >
                  {submitting === "save"
                    ? "Saving..."
                    : currentDraft
                      ? "Save draft changes"
                      : "Save pricing draft"}
                </button>
                {currentDraft && !isArchived && (
                  <button
                    className="os-button os-button-danger"
                    type="button"
                    disabled={submitting !== null}
                    onClick={() => void archive()}
                  >
                    Archive
                  </button>
                )}
                {currentDraft && calculation && !isArchived && (
                  <button
                    className="os-button os-button-secondary"
                    type="button"
                    disabled={submitting !== null}
                    onClick={() => setShowQuoteForm((visible) => !visible)}
                  >
                    Create quote
                  </button>
                )}
              </div>
            </div>
            {showQuoteForm && currentDraft && (
              <QuoteCreationForm
                pricingDraftId={currentDraft.id}
                disabled={submitting !== null}
                onCancel={() => setShowQuoteForm(false)}
                onError={setError}
              />
            )}
            {calculation ? (
              <>
                <div className="pricing-total-grid">
                  <div>
                    <span>Monthly</span>
                    <strong>{sar(calculation.totals.subtotalMonthly)}</strong>
                  </div>
                  <div>
                    <span>Setup fees</span>
                    <strong>{sar(calculation.totals.subtotalSetup)}</strong>
                  </div>
                  <div>
                    <span>One-time</span>
                    <strong>{sar(calculation.totals.subtotalOneTime)}</strong>
                  </div>
                  <div>
                    <span>Discounts</span>
                    <strong>- {sar(calculation.totals.discountTotal)}</strong>
                  </div>
                  <div>
                    <span>Tax</span>
                    <strong>{sar(calculation.totals.taxTotal)}</strong>
                  </div>
                  <div className="primary">
                    <span>Final total</span>
                    <strong>{sar(calculation.totals.finalTotal)}</strong>
                  </div>
                  <div>
                    <span>Internal cost</span>
                    <strong>{sar(calculation.totals.internalCost)}</strong>
                  </div>
                  <div>
                    <span>Margin</span>
                    <strong>{calculation.totals.marginPct}%</strong>
                  </div>
                </div>
                <SmartTable>
                  <table className="catalog-table pricing-lines">
                    <thead>
                      <tr>
                        <th>Service</th>
                        <th>Type</th>
                        <th>Quantity</th>
                        <th>Base</th>
                        <th>Setup</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculation.lines.map((line) => (
                        <tr key={`${line.lineType}-${line.serviceCode}-${line.sortOrder}`}>
                          <td>
                            <strong>{line.nameEn}</strong>
                            <small>{line.serviceLevelLabel ?? line.serviceCode}</small>
                          </td>
                          <td>{line.lineType === "MONTHLY" ? "Monthly" : "One-time"}</td>
                          <td>{line.quantity}</td>
                          <td>{sar(line.baseAmount)}</td>
                          <td>{sar(line.setupFee)}</td>
                          <td>{sar(line.lineTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </SmartTable>
                {calculation.appliedRules.length > 0 && (
                  <p className="pricing-muted">
                    Applied rules:{" "}
                    {calculation.appliedRules
                      .map((rule) => `${rule.code} v${rule.version}`)
                      .join(", ")}
                  </p>
                )}
              </>
            ) : (
              <EmptyState title="No preview yet">
                Select at least one service, then recalculate through the backend.
              </EmptyState>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

function QuoteCreationForm({
  pricingDraftId,
  disabled,
  onCancel,
  onError,
}: {
  pricingDraftId: string;
  disabled: boolean;
  onCancel: () => void;
  onError: (message: string | undefined) => void;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onError(undefined);
    setCreating(true);
    try {
      const quote = await createQuote({
        pricingDraftId,
        validityDays: Number(form.get("validityDays") ?? 30),
        terms: {
          paymentTerms: String(form.get("paymentTerms") ?? "").trim(),
          ...(String(form.get("deliveryTerms") ?? "").trim()
            ? { deliveryTerms: String(form.get("deliveryTerms")).trim() }
            : {}),
          ...(String(form.get("additionalTerms") ?? "").trim()
            ? { additionalTerms: String(form.get("additionalTerms")).trim() }
            : {}),
          ...(String(form.get("clientNotes") ?? "").trim()
            ? { clientNotes: String(form.get("clientNotes")).trim() }
            : {}),
        },
      });
      router.push(`/pricing/quotes/${quote.id}`);
    } catch (error) {
      onError(quoteErrorMessage(error));
    } finally {
      setCreating(false);
    }
  }

  return (
    <form className="quote-create-form" onSubmit={submit}>
      <div>
        <h3>Create immutable quote</h3>
        <p>The current saved calculation and terms will be permanently snapshotted.</p>
      </div>
      <label>
        Validity days
        <input name="validityDays" type="number" min="1" max="365" defaultValue="30" required />
      </label>
      <label>
        Payment terms
        <input name="paymentTerms" defaultValue="Payment due according to agreed terms." required />
      </label>
      <label>
        Delivery terms
        <input name="deliveryTerms" />
      </label>
      <label className="form-span">
        Additional terms
        <textarea name="additionalTerms" />
      </label>
      <label className="form-span">
        Client-facing notes
        <textarea name="clientNotes" />
      </label>
      <div className="form-actions">
        <button className="os-button os-button-secondary" type="button" onClick={onCancel}>
          Cancel
        </button>
        <button className="os-button os-button-primary" type="submit" disabled={disabled || creating}>
          {creating ? "Creating..." : "Create quote snapshot"}
        </button>
      </div>
    </form>
  );
}
