"use client";

import { useState, type FormEvent } from "react";
import { refreshPricingRules } from "../../lib/pricing-client";
import { normalizeLocale, type SupportedLocale } from "../../lib/i18n";
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

const copy = {
  ar: {
    active: "نشطة",
    addPricingRule: "إضافة قاعدة تسعير",
    appliesTo: "تنطبق على",
    archived: "مؤرشفة",
    backendCalculation: "Backend calculation",
    calculation: "طريقة الحساب",
    code: "الرمز",
    commercialConfiguration: "الإعدادات التجارية",
    configuredRules: "القواعد المهيأة",
    createRevision: "إنشاء إصدار",
    createRule: "إنشاء القاعدة",
    created: "تم إنشاء قاعدة التسعير.",
    currentVersionDescription: (version?: number) =>
      `الإصدار الحالي ${version ? new Intl.NumberFormat("ar-SA").format(version) : "-"} يبقى محفوظًا للسجل.`,
    description:
      "إدارة بطاقات الأسعار، رسوم التأسيس، الهوامش، الخصومات، والضرائب بتواريخ فعالية. كل تعديل ينشئ إصدارًا بدل إعادة كتابة الحسابات السابقة.",
    displayOrder: "ترتيب العرض",
    draft: "مسودة",
    effectiveCalculations: "تدخل في الحسابات الفعلية",
    effectiveFrom: "فعالة من",
    effectiveTo: "فعالة إلى",
    enabledRules: "القواعد المفعلة",
    formula: "معادلة",
    formulaOrRule: "المعادلة أو القاعدة",
    formulaRules: "قواعد المعادلات",
    implementationOwner: "مالك التنفيذ",
    method: "الطريقة",
    name: "الاسم",
    newRule: "قاعدة تسعير جديدة",
    newRuleDescription: "إنشاء أول إصدار لقاعدة تسعير قابلة لإعادة الاستخدام في الخلفية.",
    noFormula: "لا توجد معادلة تسعير مهيأة.",
    noRevision: "لا يوجد إصدار",
    optionalFormula: "اختياري لقواعد المعادلات",
    preservedHistory: "سجل محفوظ",
    priority: "الأولوية",
    pricingRules: "قواعد التسعير",
    records: (count: number) =>
      `${new Intl.NumberFormat("ar-SA").format(count)} قاعدة آمنة بالإصدارات.`,
    revisionCreated: "تم إنشاء إصدار جديد لقاعدة التسعير.",
    revisionStatus: "حالة الإصدار",
    reviseRule: (code: string) => `مراجعة ${code}`,
    ruleEngineEntries: "مدخلات محرك القواعد",
    rules: "القواعد",
    ruleStatus: "حالة القاعدة",
    ruleType: "نوع القاعدة",
    stackable: "تتراكم مع القواعد المطابقة",
    target: "النطاق",
    targetCode: "رمز الخدمة المستهدفة",
    targetCodeHint: "اتركه فارغًا لتطبيق القاعدة على كامل النطاق",
    value: "القيمة",
    versions: "الإصدارات",
    visibility: "الظهور",
  },
  en: {
    active: "active",
    addPricingRule: "Add pricing rule",
    appliesTo: "Applies to",
    archived: "Archived",
    backendCalculation: "Backend calculation",
    calculation: "Calculation",
    code: "Code",
    commercialConfiguration: "Commercial configuration",
    configuredRules: "Configured rules",
    createRevision: "Create revision",
    createRule: "Create rule",
    created: "Pricing rule created.",
    currentVersionDescription: (version?: number) =>
      `Current version ${version ?? "-"} remains available for history.`,
    description:
      "Configure effective-dated rate cards, setup fees, margins, discounts, and taxes. Changes create revisions instead of rewriting prior calculations.",
    displayOrder: "Display order",
    draft: "Draft",
    effectiveCalculations: "Effective calculations",
    effectiveFrom: "Effective from",
    effectiveTo: "Effective to",
    enabledRules: "Enabled",
    formula: "Formula",
    formulaOrRule: "Formula or rule",
    formulaRules: "Formula rules",
    implementationOwner: "Implementation owner",
    method: "Method",
    name: "Name",
    newRule: "New pricing rule",
    newRuleDescription: "Create the first version of a reusable backend pricing rule.",
    noFormula: "No pricing formula configured.",
    noRevision: "No revision",
    optionalFormula: "Optional for formula rules",
    preservedHistory: "Preserved history",
    priority: "Priority",
    pricingRules: "Pricing rules",
    records: (count: number) => `${count} revision-safe rules.`,
    revisionCreated: "Pricing-rule revision created.",
    revisionStatus: "Revision status",
    reviseRule: (code: string) => `Revise ${code}`,
    ruleEngineEntries: "Rule engine entries",
    rules: "Rules",
    ruleStatus: "Rule status",
    ruleType: "Rule type",
    stackable: "Stack with matching rules",
    target: "Target",
    targetCode: "Target service code",
    targetCodeHint: "Leave empty for the whole target",
    value: "Value",
    versions: "Versions",
    visibility: "Visibility",
  },
} as const;

const statusLabels = {
  ACTIVE: { ar: "نشطة", en: "Active" },
  DRAFT: { ar: "مسودة", en: "Draft" },
} as const;

function dateTimeInput(value?: string | null): string {
  const date = value ? new Date(value) : new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function optionalNumber(form: FormData, key: string): number | undefined {
  const value = String(form.get(key) ?? "").trim();
  return value ? Number(value) : undefined;
}

function number(value: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-SA").format(value);
}

function optionLabel(value: string, locale: SupportedLocale): string {
  if (locale === "en") return value.replaceAll("_", " ");
  const labels: Record<string, string> = {
    ALL: "الكل",
    DISCOUNT: "خصم",
    FIXED_AMOUNT: "مبلغ ثابت",
    FORMULA: "معادلة",
    MARGIN: "هامش",
    MONTHLY: "شهري",
    NONE: "بدون",
    ONE_TIME: "مرة واحدة",
    PERCENTAGE: "نسبة مئوية",
    RATE_CARD: "بطاقة سعر",
    SETUP_FEE: "رسوم تأسيس",
    TAX: "ضريبة",
  };
  return labels[value] ?? value.replaceAll("_", " ");
}

export function PricingRuleManager({
  initialSnapshot,
  locale: localeInput = "en",
}: {
  initialSnapshot: PricingRulesSnapshot;
  locale?: string;
}) {
  const locale = normalizeLocale(localeInput);
  const t = copy[locale];
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
      creating ? t.created : t.revisionCreated,
    );
    if (saved) {
      closeForm();
    }
  }

  const current = editing?.revision;
  const activeRules = snapshot.rules.filter((rule) => rule.status === "ACTIVE").length;
  const enabledRules = snapshot.rules.filter((rule) => rule.revision?.isEnabled).length;
  const formulaRules = snapshot.rules.filter(
    (rule) => rule.revision?.ruleType === "FORMULA",
  ).length;
  const archivedRules = snapshot.rules.filter((rule) => rule.status === "ARCHIVED").length;

  return (
    <>
      <SectionHeader
        eyebrow={t.commercialConfiguration}
        title={t.pricingRules}
        description={t.description}
        action={
          <button className="os-button os-button-primary" type="button" onClick={openCreate}>
            {t.addPricingRule}
          </button>
        }
      />
      <CatalogFeedback error={mutation.error} success={mutation.success} />

      <section className="metric-grid" aria-label={t.pricingRules}>
        <MetricCard
          label={t.rules}
          value={number(snapshot.rules.length, locale)}
          detail={`${number(activeRules, locale)} ${t.active}`}
          accent
        />
        <MetricCard
          label={t.enabledRules}
          value={number(enabledRules, locale)}
          detail={t.effectiveCalculations}
        />
        <MetricCard
          label={t.formulaRules}
          value={number(formulaRules, locale)}
          detail={t.ruleEngineEntries}
        />
        <MetricCard
          label={t.archived}
          value={number(archivedRules, locale)}
          detail={t.preservedHistory}
        />
      </section>

      {(creating || editing) && (
        <section className="catalog-panel editor-panel">
          <div className="panel-heading">
            <div>
              <h2>{creating ? t.newRule : t.reviseRule(editing!.code)}</h2>
              <p>
                {creating ? t.newRuleDescription : t.currentVersionDescription(current?.version)}
              </p>
            </div>
          </div>
          <form className="catalog-form wide-form" onSubmit={submit}>
            {creating && (
              <label>
                {t.code}
                <input
                  name="code"
                  required
                  pattern="[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*"
                  placeholder="PRICE-TAX-STANDARD"
                />
              </label>
            )}
            <label>
              {t.name}
              <input name="name" required defaultValue={editing?.name} />
            </label>
            <label>
              {t.ruleType}
              <select name="ruleType" defaultValue={current?.ruleType ?? "FORMULA"}>
                {snapshot.ruleTypes.map((type) => (
                  <option key={type} value={type}>
                    {optionLabel(type, locale)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t.calculation}
              <select name="calculationMethod" defaultValue={current?.calculationMethod ?? "NONE"}>
                {snapshot.calculationMethods.map((method) => (
                  <option key={method} value={method}>
                    {optionLabel(method, locale)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t.value}
              <input
                name="value"
                type="number"
                min="0"
                step="0.0001"
                defaultValue={current?.value ?? ""}
                placeholder={t.optionalFormula}
              />
            </label>
            <label>
              {t.target}
              <select name="targetType" defaultValue={current?.targetType ?? "ALL"}>
                {snapshot.targetTypes.map((target) => (
                  <option key={target} value={target}>
                    {optionLabel(target, locale)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t.targetCode}
              <input
                name="targetCode"
                defaultValue={current?.targetCode ?? ""}
                placeholder={t.targetCodeHint}
              />
            </label>
            <label>
              {t.priority}
              <input
                name="priority"
                type="number"
                min="0"
                defaultValue={current?.priority ?? editing?.sortOrder ?? 0}
              />
            </label>
            <label>
              {t.effectiveFrom}
              <input
                name="effectiveFrom"
                type="datetime-local"
                required
                defaultValue={dateTimeInput(current?.effectiveFrom)}
              />
            </label>
            <label>
              {t.effectiveTo}
              <input
                name="effectiveTo"
                type="datetime-local"
                defaultValue={current?.effectiveTo ? dateTimeInput(current.effectiveTo) : ""}
              />
            </label>
            <label>
              {t.revisionStatus}
              <select name="revisionStatus" defaultValue={creating ? "DRAFT" : "ACTIVE"}>
                <option value="DRAFT">{statusLabels.DRAFT[locale]}</option>
                <option value="ACTIVE">{statusLabels.ACTIVE[locale]}</option>
              </select>
            </label>
            {creating && (
              <>
                <label>
                  {t.ruleStatus}
                  <select name="status" defaultValue="DRAFT">
                    <option value="DRAFT">{statusLabels.DRAFT[locale]}</option>
                    <option value="ACTIVE">{statusLabels.ACTIVE[locale]}</option>
                  </select>
                </label>
                <label>
                  {t.displayOrder}
                  <input name="sortOrder" type="number" min="0" defaultValue="0" />
                </label>
              </>
            )}
            <label className="form-span">
              {t.formulaOrRule}
              <textarea name="formulaOrRule" required defaultValue={current?.formulaOrRule ?? ""} />
            </label>
            <label className="form-span">
              {t.appliesTo}
              <input name="appliesTo" required defaultValue={current?.appliesTo ?? ""} />
            </label>
            <label>
              {t.implementationOwner}
              <input
                name="implementationOwner"
                defaultValue={current?.implementationOwner ?? t.backendCalculation}
              />
            </label>
            <label>
              {t.visibility}
              <input name="visibility" defaultValue={current?.visibility ?? ""} />
            </label>
            <label className="checkbox-field">
              <input name="isEnabled" type="checkbox" defaultChecked={current?.isEnabled ?? true} />
              {t.effectiveCalculations}
            </label>
            <label className="checkbox-field">
              <input
                name="isStackable"
                type="checkbox"
                defaultChecked={current?.isStackable ?? true}
              />
              {t.stackable}
            </label>
            <FormActions
              locale={locale}
              submitting={mutation.submitting}
              onCancel={closeForm}
              submitLabel={creating ? t.createRule : t.createRevision}
            />
          </form>
        </section>
      )}

      <SectionCard title={t.configuredRules} description={t.records(snapshot.rules.length)}>
        <div className="entity-grid">
          {snapshot.rules.map((rule) => (
            <article className="entity-card" key={rule.id}>
              <div className="entity-card-top">
                <div>
                  <small>{rule.code}</small>
                  <h3>{rule.name}</h3>
                  <p>
                    {rule.revision ? optionLabel(rule.revision.ruleType, locale) : t.noRevision} -{" "}
                    {t.versions} {rule.revision?.version ?? "-"}
                  </p>
                </div>
                <StatusBadge locale={locale} status={rule.status} />
              </div>
              <dl className="entity-meta four-up">
                <div>
                  <dt>{t.method}</dt>
                  <dd>
                    {rule.revision ? optionLabel(rule.revision.calculationMethod, locale) : "-"}
                  </dd>
                </div>
                <div>
                  <dt>{t.value}</dt>
                  <dd>{rule.revision?.value ?? t.formula}</dd>
                </div>
                <div>
                  <dt>{t.target}</dt>
                  <dd>
                    {rule.revision?.targetCode ??
                      (rule.revision ? optionLabel(rule.revision.targetType, locale) : "-")}
                  </dd>
                </div>
                <div>
                  <dt>{t.versions}</dt>
                  <dd>{number(rule.revisions.length, locale)}</dd>
                </div>
              </dl>
              <p className="entity-description">{rule.revision?.formulaOrRule ?? t.noFormula}</p>
              <OrderControl
                locale={locale}
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
                  {t.createRevision}
                </button>
                <LifecycleActions
                  locale={locale}
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
