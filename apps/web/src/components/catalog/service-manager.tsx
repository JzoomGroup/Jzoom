"use client";

import { serviceManagerCopy as copy } from "../../i18n/dictionaries/catalog";

import { useMemo, useState, type FormEvent } from "react";
import { PencilLine } from "lucide-react";
import type {
  CatalogSnapshot,
  CatalogStatus,
  MonthlyService,
  ServiceLevel,
} from "../../lib/catalog-types";
import { normalizeLocale, type SupportedLocale } from "../../lib/i18n";
import { localizedCatalogLabel, localizedDescription } from "../../lib/localized-content";
import {
  CatalogFeedback,
  EmptyState,
  FormActions,
  LifecycleActions,
  OrderControl,
  StatusBadge,
  useCatalogMutation,
} from "./catalog-shared";
import { BentoGrid, MetricCard, PageHeader, SectionCard } from "../premium-os";
import { AppDialog } from "../app-dialog";

interface EditableLevelConfig {
  serviceLevelId: string;
  hours: number;
  slaHours: number | null;
  isEnabled: boolean;
  sortOrder: number;
}

const statusLabels = {
  ACTIVE: { ar: "نشط", en: "Active" },
  ARCHIVED: { ar: "مؤرشف", en: "Archived" },
  DRAFT: { ar: "مسودة", en: "Draft" },
  INACTIVE: { ar: "غير نشط", en: "Inactive" },
} satisfies Record<CatalogStatus, Record<SupportedLocale, string>>;

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

function localeFor(locale: string | undefined): SupportedLocale {
  return normalizeLocale(locale);
}

function statusLabel(status: CatalogStatus, locale: SupportedLocale): string {
  return statusLabels[status][locale];
}

function localizedCategoryName(
  category: { code?: string; nameAr: string; nameEn: string },
  locale: SupportedLocale,
): string {
  return localizedCatalogLabel(category, locale);
}

function localizedServiceName(service: MonthlyService, locale: SupportedLocale): string {
  return locale === "ar"
    ? service.revision?.nameAr || service.revision?.nameEn || service.code
    : service.revision?.nameEn || service.revision?.nameAr || service.code;
}

function localizedLevelName(level: ServiceLevel, locale: SupportedLocale): string {
  return locale === "ar"
    ? level.labelAr || level.labelEn || level.code
    : level.labelEn || level.labelAr || level.code;
}

function localizedConfigLevelName(
  config: NonNullable<MonthlyService["revision"]>["levelConfigs"][number],
  locale: SupportedLocale,
): string {
  return locale === "ar"
    ? config.serviceLevelLabelAr || config.serviceLevelLabelEn || config.serviceLevelCode
    : config.serviceLevelLabelEn || config.serviceLevelLabelAr || config.serviceLevelCode;
}

function number(value: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-SA").format(value);
}

function hours(value: number, locale: SupportedLocale): string {
  return locale === "ar" ? `${number(value, locale)} س` : `${number(value, locale)}h`;
}

export function ServiceManager({
  locale: localeInput = "en",
  snapshot,
  setSnapshot,
}: {
  locale?: string;
  snapshot: CatalogSnapshot;
  setSnapshot: (snapshot: CatalogSnapshot) => void;
}) {
  const locale = localeFor(localeInput);
  const t = copy[locale];
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
  const activeServices = snapshot.services.filter((service) => service.status === "ACTIVE").length;
  const pricingVisibleServices = snapshot.services.filter(
    (service) => service.revision?.visibleInPricing,
  ).length;
  const enabledPackageLinks = snapshot.services.reduce(
    (sum, service) =>
      sum + (service.revision?.levelConfigs.filter((config) => config.isEnabled).length ?? 0),
    0,
  );
  const averageSellingRate =
    snapshot.services.length === 0
      ? 0
      : snapshot.services.reduce(
          (sum, service) => sum + (service.revision?.sellingHourlyRateSar ?? 0),
          0,
        ) / snapshot.services.length;

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
      creating ? t.monthlyServiceCreated : t.monthlyServiceRevisionCreated,
    );
    if (saved) {
      closeForm();
    }
  }

  const current = editing?.revision;

  return (
    <>
      <PageHeader
        actions={[{ label: t.addMonthlyService, onClick: openCreate, variant: "primary" }]}
        eyebrow={t.monthlyCatalog}
        title={t.monthlyServices}
        description={t.monthlyServicesDescription}
      />
      <CatalogFeedback error={mutation.error} success={mutation.success} />

      <section className="service-admin-command" aria-label={t.monthlyServiceStudio}>
        <div className="service-admin-command-main">
          <p className="eyebrow">{t.monthlyServiceStudio}</p>
          <h2>{t.configuredServices}</h2>
          <p>{t.monthlyServiceStudioDescription}</p>
        </div>
        <div className="service-admin-guardrails">
          <strong>{t.studioRules}</strong>
          <span>{t.studioSafetyA}</span>
          <span>{t.studioSafetyB}</span>
          <span>{t.studioSafetyC}</span>
        </div>
      </section>

      <BentoGrid compact>
        <MetricCard
          accent
          label={t.totalServices}
          value={number(snapshot.services.length, locale)}
          detail={`${number(activeServices, locale)} ${t.active}`}
        />
        <MetricCard
          label={t.pricingVisible}
          value={number(pricingVisibleServices, locale)}
          detail={t.visibleInPricing}
        />
        <MetricCard
          label={t.enabledPackageLinks}
          value={number(enabledPackageLinks, locale)}
          detail={t.packageHours}
        />
        <MetricCard
          label={t.averageSellingRate}
          value={`${number(Math.round(averageSellingRate), locale)} ${t.sar}`}
          detail={t.sellingRate}
        />
      </BentoGrid>

      {creating || editing ? (
        <AppDialog
          busy={mutation.submitting}
          closeLabel={locale === "ar" ? "إغلاق" : "Close"}
          description={
            creating
              ? t.createServiceDescription
              : t.createRevisionDescription((current?.version ?? 0) + 1)
          }
          eyebrow={creating ? t.createService : t.createRevision}
          onClose={closeForm}
          size="xl"
          title={creating ? t.newMonthlyService : t.editService(editing!.code)}
        >
          <form className="catalog-form wide-form service-admin-form" noValidate onSubmit={submit}>
            {creating ? (
              <label>
                {t.code}
                <input
                  name="code"
                  required
                  pattern="[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*"
                  placeholder="MS-HR"
                />
              </label>
            ) : null}
            <label>
              {t.category}
              <select name="categoryId" required defaultValue={editing?.categoryId ?? ""}>
                <option value="" disabled>
                  {t.selectCategory}
                </option>
                {snapshot.categories
                  .filter((category) => category.status !== "ARCHIVED")
                  .map((category) => (
                    <option value={category.id} key={category.id}>
                      {localizedCategoryName(category, locale)} -{" "}
                      {statusLabel(category.status, locale)}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              {t.arabicName}
              <input name="nameAr" required dir="rtl" defaultValue={current?.nameAr} />
            </label>
            <label>
              {t.englishName}
              <input name="nameEn" required defaultValue={current?.nameEn} />
            </label>
            <label className="form-span">
              {t.description}
              <textarea name="description" required defaultValue={current?.description} />
            </label>
            <label>
              {t.sellingHourlyRate}
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
              {t.internalHourlyCost}
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
              {t.setupFee}
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
              {t.defaultSlaHours}
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
              <legend>{t.behavior}</legend>
              <label className="checkbox-field">
                <input
                  name="visibleInPricing"
                  type="checkbox"
                  defaultChecked={current?.visibleInPricing ?? true}
                />
                {t.visibleInPricing}
              </label>
              <label className="checkbox-field">
                <input
                  name="deductHours"
                  type="checkbox"
                  defaultChecked={current?.deductHours ?? true}
                />
                {t.deductHours}
              </label>
              <label className="checkbox-field">
                <input
                  name="requiresSupervisor"
                  type="checkbox"
                  defaultChecked={current?.requiresSupervisor ?? false}
                />
                {t.requiresSupervisor}
              </label>
              <label className="checkbox-field">
                <input
                  name="requiresManagement"
                  type="checkbox"
                  defaultChecked={current?.requiresManagement ?? false}
                />
                {t.requiresManagement}
              </label>
              <label className="checkbox-field">
                <input
                  name="clientApprovalRequired"
                  type="checkbox"
                  defaultChecked={current?.clientApprovalRequired ?? false}
                />
                {t.clientApprovalRequired}
              </label>
            </fieldset>

            <fieldset className="form-span package-editor">
              <legend>{t.monthlyHoursByPackage}</legend>
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
                        <strong>{localizedLevelName(level, locale)}</strong>
                        <span>{statusLabel(level.status, locale)}</span>
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
                        {t.enabled}
                      </label>
                      <label>
                        {t.hours}
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
                        {t.slaHours}
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
                  {t.initialStatus}
                  <select name="status" defaultValue="DRAFT">
                    <option value="DRAFT">{t.draft}</option>
                    <option value="ACTIVE">{t.active}</option>
                  </select>
                </label>
                <label>
                  {t.displayOrder}
                  <input name="sortOrder" type="number" min="0" defaultValue="0" />
                </label>
              </>
            )}
            <FormActions
              locale={locale}
              submitting={mutation.submitting}
              onCancel={closeForm}
              submitLabel={creating ? t.createService : t.createRevision}
            />
          </form>
        </AppDialog>
      ) : null}

      <SectionCard
        title={t.configuredServices}
        description={t.records(snapshot.services.length)}
        action={
          <label className="compact-filter">
            {t.category}
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="ALL">{t.allCategories}</option>
              {snapshot.categories.map((category) => (
                <option value={category.id} key={category.id}>
                  {localizedCategoryName(category, locale)}
                </option>
              ))}
            </select>
          </label>
        }
      >
        {visibleServices.length === 0 ? (
          <EmptyState>{t.noMonthlyServices}</EmptyState>
        ) : (
          <div className="service-admin-grid">
            {visibleServices.map((service) => {
              const enabledConfigs =
                service.revision?.levelConfigs.filter((config) => config.isEnabled) ?? [];
              const revision = service.revision;

              return (
                <article className="service-admin-card" key={service.id}>
                  <div className="service-admin-card-top">
                    <span className="service-admin-badge" aria-hidden="true">
                      {service.code.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="service-admin-card-title">
                      <small>
                        {service.code} - {localizedCategoryName(service.category, locale)}
                      </small>
                      <h3>{localizedServiceName(service, locale)}</h3>
                      {locale === "en" && revision?.nameAr ? (
                        <p dir="rtl">{revision.nameAr}</p>
                      ) : null}
                    </div>
                    <StatusBadge locale={locale} status={service.status} />
                  </div>

                  <p className="service-admin-description">
                    {localizedDescription(revision?.description, locale, t.noDescription)}
                  </p>

                  <dl className="service-admin-metrics">
                    <div>
                      <dt>{t.revision}</dt>
                      <dd>v{revision?.version ?? "-"}</dd>
                    </div>
                    <div>
                      <dt>{t.items}</dt>
                      <dd>{number(service.itemCount, locale)}</dd>
                    </div>
                    <div>
                      <dt>{t.sellingRate}</dt>
                      <dd>
                        {number(revision?.sellingHourlyRateSar ?? 0, locale)} {t.sar}
                      </dd>
                    </div>
                    <div>
                      <dt>{t.internalCost}</dt>
                      <dd>
                        {number(revision?.internalHourlyCostSar ?? 0, locale)} {t.sar}
                      </dd>
                    </div>
                  </dl>

                  <div className="service-admin-flags">
                    {revision?.visibleInPricing ? <span>{t.visibleInPricing}</span> : null}
                    {revision?.deductHours ? <span>{t.deductHours}</span> : null}
                    {revision?.requiresSupervisor ? <span>{t.requiresSupervisor}</span> : null}
                    {revision?.requiresManagement ? <span>{t.requiresManagement}</span> : null}
                    {revision?.clientApprovalRequired ? (
                      <span>{t.clientApprovalRequired}</span>
                    ) : null}
                  </div>

                  <div className="service-admin-hours" aria-label={t.packageHours}>
                    {(revision?.levelConfigs ?? []).map((config) => (
                      <span
                        className={config.isEnabled ? "enabled" : "disabled"}
                        key={config.serviceLevelId}
                      >
                        <strong>{localizedConfigLevelName(config, locale)}</strong>
                        {config.isEnabled ? hours(config.hours, locale) : t.off}
                      </span>
                    ))}
                    {enabledConfigs.length === 0 ? <span className="disabled">{t.off}</span> : null}
                  </div>

                  <footer className="catalog-card-footer">
                    <div className="service-admin-order">
                      <OrderControl
                        locale={locale}
                        path={`services/monthly/${service.id}`}
                        current={service.sortOrder}
                        disabled={mutation.submitting || service.status === "ARCHIVED"}
                        mutate={mutation.mutate}
                      />
                    </div>

                    <div className="service-admin-actions">
                      <button
                        className="os-button os-button-secondary"
                        type="button"
                        disabled={service.status === "ARCHIVED"}
                        onClick={() => openEdit(service)}
                      >
                        <PencilLine aria-hidden="true" size={14} />
                        {t.editHoursRates}
                      </button>
                      <LifecycleActions
                        locale={locale}
                        path={`services/monthly/${service.id}`}
                        status={service.status}
                        disabled={mutation.submitting}
                        mutate={mutation.mutate}
                      />
                    </div>
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </SectionCard>
    </>
  );
}
