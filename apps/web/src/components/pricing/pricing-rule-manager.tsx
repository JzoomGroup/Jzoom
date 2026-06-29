"use client";

import { useState, type FormEvent } from "react";
import { refreshPricingRules } from "../../lib/pricing-client";
import type {
  PricingCalculationMethod,
  PricingRule,
  PricingRuleType,
  PricingRulesSnapshot,
  PricingTargetType,
} from "../../lib/pricing-types";
import {
  CatalogFeedback,
  FormActions,
  LifecycleActions,
  OrderControl,
  SectionHeader,
  StatusBadge,
  useCatalogMutation,
} from "../catalog/catalog-shared";
import { MetricCard, SectionCard } from "../premium-os";

function dateTimeInput(value?: string | null): string {
  const date = value ? new Date(value) : new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function optionalNumber(form: FormData, key: string): number | undefined {
  const value = String(form.get(key) ?? "").trim();
  return value ? Number(value) : undefined;
}

export function PricingRuleManager({ initialSnapshot }: { initialSnapshot: PricingRulesSnapshot }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<PricingRule | null>(null);
  const mutation = useCatalogMutation(setSnapshot, refreshPricingRules);

  function openCreate() {
    mutation.clearFeedback();
    setEditing(null);
    setCreating(true);
  }

  function closeForm() {
    setEditing(null);
    setCreating(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const effectiveTo = String(form.get("effectiveTo") ?? "").trim();
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
      name: String(form.get("name") ?? "").trim(),
      ruleType: String(form.get("ruleType") ?? "FORMULA") as PricingRuleType,
      calculationMethod: String(
        form.get("calculationMethod") ?? "NONE",
      ) as PricingCalculationMethod,
      value: optionalNumber(form, "value"),
      currency: "SAR",
      targetType: String(form.get("targetType") ?? "ALL") as PricingTargetType,
      targetCode:
        String(form.get("targetCode") ?? "")
          .trim()
          .toUpperCase() || undefined,
      priority: Number(form.get("priority") ?? 0),
      isStackable: form.get("isStackable") === "on",
      isEnabled: form.get("isEnabled") === "on",
      formulaOrRule: String(form.get("formulaOrRule") ?? "").trim(),
      appliesTo: String(form.get("appliesTo") ?? "").trim(),
      implementationOwner: String(form.get("implementationOwner") ?? "").trim(),
      visibility: String(form.get("visibility") ?? "").trim(),
      effectiveFrom: new Date(String(form.get("effectiveFrom"))).toISOString(),
      ...(effectiveTo ? { effectiveTo: new Date(effectiveTo).toISOString() } : {}),
      revisionStatus: String(form.get("revisionStatus") ?? "DRAFT"),
    };
    const saved = await mutation.mutate(
      creating ? "admin/pricing-rules" : `admin/pricing-rules/${editing!.id}`,
      {
        method: creating ? "POST" : "PUT",
        body: JSON.stringify(payload),
      },
      creating ? "Pricing rule created." : "Pricing-rule revision created.",
    );
    if (saved) {
      closeForm();
    }
  }

  const current = editing?.revision;
  const activeRules = snapshot.rules.filter((rule) => rule.status === "ACTIVE").length;
  const enabledRules = snapshot.rules.filter((rule) => rule.revision?.isEnabled).length;
  const formulaRules = snapshot.rules.filter((rule) => rule.revision?.ruleType === "FORMULA").length;
  const archivedRules = snapshot.rules.filter((rule) => rule.status === "ARCHIVED").length;

  return (
    <>
      <SectionHeader
        eyebrow="Commercial configuration"
        title="Pricing rules"
        description="Configure effective-dated rate cards, setup fees, margins, discounts, and taxes. Changes create revisions instead of rewriting prior calculations."
        action={
          <button className="os-button os-button-primary" type="button" onClick={openCreate}>
            Add pricing rule
          </button>
        }
      />
      <CatalogFeedback error={mutation.error} success={mutation.success} />

      <section className="metric-grid" aria-label="Pricing rules summary">
        <MetricCard label="Rules" value={snapshot.rules.length} detail={`${activeRules} active`} accent />
        <MetricCard label="Enabled" value={enabledRules} detail="Effective calculations" />
        <MetricCard label="Formula rules" value={formulaRules} detail="Rule engine entries" />
        <MetricCard label="Archived" value={archivedRules} detail="Preserved history" />
      </section>

      {(creating || editing) && (
        <section className="catalog-panel editor-panel">
          <div className="panel-heading">
            <div>
              <h2>{creating ? "New pricing rule" : `Revise ${editing!.code}`}</h2>
              <p>
                {creating
                  ? "Create the first version of a reusable backend pricing rule."
                  : `Current version ${current?.version ?? "—"} remains available for history.`}
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
                  placeholder="PRICE-TAX-STANDARD"
                />
              </label>
            )}
            <label>
              Name
              <input name="name" required defaultValue={editing?.name} />
            </label>
            <label>
              Rule type
              <select name="ruleType" defaultValue={current?.ruleType ?? "FORMULA"}>
                {snapshot.ruleTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Calculation
              <select name="calculationMethod" defaultValue={current?.calculationMethod ?? "NONE"}>
                {snapshot.calculationMethods.map((method) => (
                  <option key={method} value={method}>
                    {method.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Value
              <input
                name="value"
                type="number"
                min="0"
                step="0.0001"
                defaultValue={current?.value ?? ""}
                placeholder="Optional for formula rules"
              />
            </label>
            <label>
              Target
              <select name="targetType" defaultValue={current?.targetType ?? "ALL"}>
                {snapshot.targetTypes.map((target) => (
                  <option key={target} value={target}>
                    {target.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Target service code
              <input
                name="targetCode"
                defaultValue={current?.targetCode ?? ""}
                placeholder="Leave empty for the whole target"
              />
            </label>
            <label>
              Priority
              <input
                name="priority"
                type="number"
                min="0"
                defaultValue={current?.priority ?? editing?.sortOrder ?? 0}
              />
            </label>
            <label>
              Effective from
              <input
                name="effectiveFrom"
                type="datetime-local"
                required
                defaultValue={dateTimeInput(current?.effectiveFrom)}
              />
            </label>
            <label>
              Effective to
              <input
                name="effectiveTo"
                type="datetime-local"
                defaultValue={current?.effectiveTo ? dateTimeInput(current.effectiveTo) : ""}
              />
            </label>
            <label>
              Revision status
              <select name="revisionStatus" defaultValue={creating ? "DRAFT" : "ACTIVE"}>
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
              </select>
            </label>
            {creating && (
              <>
                <label>
                  Rule status
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
            <label className="form-span">
              Formula or rule
              <textarea name="formulaOrRule" required defaultValue={current?.formulaOrRule ?? ""} />
            </label>
            <label className="form-span">
              Applies to
              <input name="appliesTo" required defaultValue={current?.appliesTo ?? ""} />
            </label>
            <label>
              Implementation owner
              <input
                name="implementationOwner"
                defaultValue={current?.implementationOwner ?? "Backend calculation"}
              />
            </label>
            <label>
              Visibility
              <input name="visibility" defaultValue={current?.visibility ?? ""} />
            </label>
            <label className="checkbox-field">
              <input name="isEnabled" type="checkbox" defaultChecked={current?.isEnabled ?? true} />
              Enabled for effective calculations
            </label>
            <label className="checkbox-field">
              <input
                name="isStackable"
                type="checkbox"
                defaultChecked={current?.isStackable ?? true}
              />
              Stack with matching rules
            </label>
            <FormActions
              submitting={mutation.submitting}
              onCancel={closeForm}
              submitLabel={creating ? "Create rule" : "Create revision"}
            />
          </form>
        </section>
      )}

      <SectionCard title="Configured rules" description={`${snapshot.rules.length} revision-safe rules.`}>
        <div className="entity-grid">
          {snapshot.rules.map((rule) => (
            <article className="entity-card" key={rule.id}>
              <div className="entity-card-top">
                <div>
                  <small>{rule.code}</small>
                  <h3>{rule.name}</h3>
                  <p>
                    {rule.revision?.ruleType.replaceAll("_", " ") ?? "No revision"} · Version{" "}
                    {rule.revision?.version ?? "—"}
                  </p>
                </div>
                <StatusBadge status={rule.status} />
              </div>
              <dl className="entity-meta four-up">
                <div>
                  <dt>Method</dt>
                  <dd>{rule.revision?.calculationMethod.replaceAll("_", " ") ?? "—"}</dd>
                </div>
                <div>
                  <dt>Value</dt>
                  <dd>{rule.revision?.value ?? "Formula"}</dd>
                </div>
                <div>
                  <dt>Target</dt>
                  <dd>{rule.revision?.targetCode ?? rule.revision?.targetType ?? "—"}</dd>
                </div>
                <div>
                  <dt>Versions</dt>
                  <dd>{rule.revisions.length}</dd>
                </div>
              </dl>
              <p className="entity-description">
                {rule.revision?.formulaOrRule ?? "No pricing formula configured."}
              </p>
              <OrderControl
                path={`admin/pricing-rules/${rule.id}`}
                current={rule.sortOrder}
                disabled={mutation.submitting || rule.status === "ARCHIVED"}
                mutate={mutation.mutate}
              />
              <div className="entity-card-actions">
                <button
                  className="os-button os-button-secondary"
                  type="button"
                  disabled={rule.status === "ARCHIVED"}
                  onClick={() => {
                    mutation.clearFeedback();
                    setCreating(false);
                    setEditing(rule);
                  }}
                >
                  Create revision
                </button>
                <LifecycleActions
                  path={`admin/pricing-rules/${rule.id}`}
                  status={rule.status}
                  disabled={mutation.submitting}
                  mutate={mutation.mutate}
                />
              </div>
            </article>
          ))}
        </div>
      </SectionCard>
    </>
  );
}
