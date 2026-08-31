"use client";

import { levelManagerCopy as copy } from "../../i18n/dictionaries/catalog";

import { useState, type FormEvent } from "react";
import { PencilLine } from "lucide-react";
import type { CatalogSnapshot, ServiceLevel } from "../../lib/catalog-types";
import { normalizeLocale, type SupportedLocale } from "../../lib/i18n";
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

function levelLocale(locale: string | undefined): SupportedLocale {
  return normalizeLocale(locale);
}

function number(value: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-SA").format(value);
}

function localizedLevelName(level: ServiceLevel, locale: SupportedLocale): string {
  return locale === "ar"
    ? level.labelAr || level.labelEn || level.code
    : level.labelEn || level.labelAr || level.code;
}

function secondaryLevelName(level: ServiceLevel, locale: SupportedLocale): string | null {
  return locale === "ar" ? level.labelEn : level.labelAr;
}

export function LevelManager({
  locale: localeInput = "en",
  snapshot,
  setSnapshot,
}: {
  locale?: string;
  snapshot: CatalogSnapshot;
  setSnapshot: (snapshot: CatalogSnapshot) => void;
}) {
  const locale = levelLocale(localeInput);
  const t = copy[locale];
  const [editing, setEditing] = useState<ServiceLevel | null>(null);
  const [creating, setCreating] = useState(false);
  const mutation = useCatalogMutation(setSnapshot);
  const activeLevels = snapshot.levels.filter((level) => level.status === "ACTIVE").length;
  const customLevels = snapshot.levels.filter((level) => level.isCustom).length;
  const serviceLinks = snapshot.services.reduce(
    (sum, service) => sum + (service.revision?.levelConfigs.length ?? 0),
    0,
  );

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
      creating ? t.levelCreated : t.levelUpdated,
    );
    if (saved) {
      closeForm();
    }
  }

  return (
    <>
      <PageHeader
        actions={[{ label: t.addLevel, onClick: openCreate, variant: "primary" }]}
        eyebrow={t.monthlyCatalog}
        title={t.serviceLevels}
        description={t.serviceLevelsDescription}
      />
      <CatalogFeedback error={mutation.error} success={mutation.success} />

      <section className="package-admin-command" aria-label={t.packageStudio}>
        <div className="package-admin-command-main">
          <p className="eyebrow">{t.packageStudio}</p>
          <h2>{t.configuredPackages}</h2>
          <p>{t.packageStudioDescription}</p>
        </div>
        <div className="package-admin-guardrails">
          <strong>{t.rules}</strong>
          <span>{t.safetyA}</span>
          <span>{t.safetyB}</span>
          <span>{t.safetyC}</span>
        </div>
      </section>

      <BentoGrid compact>
        <MetricCard
          accent
          label={t.totalPackages}
          value={number(snapshot.levels.length, locale)}
          detail={`${number(activeLevels, locale)} ${t.active}`}
        />
        <MetricCard
          label={t.custom}
          value={number(customLevels, locale)}
          detail={t.customPackageLevel}
        />
        <MetricCard
          label={t.linkedServices}
          value={number(serviceLinks, locale)}
          detail={t.activeLinks}
        />
        <MetricCard
          label={t.linkedItems}
          value={number(
            snapshot.items.reduce(
              (sum, item) => sum + (item.revision?.levelInclusions.length ?? 0),
              0,
            ),
            locale,
          )}
          detail={t.packagesReady}
        />
      </BentoGrid>

      {creating || editing ? (
        <AppDialog
          busy={mutation.submitting}
          closeLabel={locale === "ar" ? "إغلاق" : "Close"}
          description={t.packageCodesImmutable}
          eyebrow={creating ? t.createLevel : t.edit}
          onClose={closeForm}
          size="lg"
          title={creating ? t.newServiceLevel : t.editLevel(editing!.code)}
        >
          <form className="catalog-form wide-form package-admin-form" noValidate onSubmit={submit}>
            {creating ? (
              <label>
                {t.code}
                <input name="code" required placeholder="Enterprise" />
              </label>
            ) : null}
            <label>
              {t.arabicLabel}
              <input name="labelAr" required dir="rtl" defaultValue={editing?.labelAr} />
            </label>
            <label>
              {t.englishLabel}
              <input name="labelEn" required defaultValue={editing?.labelEn ?? ""} />
            </label>
            <label className="form-span">
              {t.purpose}
              <textarea name="purpose" defaultValue={editing?.purpose ?? ""} />
            </label>
            <label>
              {t.slaRule}
              <textarea name="slaRule" defaultValue={editing?.slaRule ?? ""} />
            </label>
            <label>
              {t.scopeRule}
              <textarea name="scopeRule" defaultValue={editing?.scopeRule ?? ""} />
            </label>
            <label className="form-span">
              {t.governanceRule}
              <textarea name="governanceRule" defaultValue={editing?.governanceRule ?? ""} />
            </label>
            <label className="checkbox-field">
              <input name="isCustom" type="checkbox" defaultChecked={editing?.isCustom ?? false} />
              {t.customPackageLevel}
            </label>
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
              submitLabel={creating ? t.createLevel : t.saveLevel}
            />
          </form>
        </AppDialog>
      ) : null}

      <SectionCard title={t.configuredPackages} description={t.packagesDescription}>
        {snapshot.levels.length === 0 ? (
          <EmptyState>{t.noServiceLevels}</EmptyState>
        ) : (
          <div className="package-admin-grid">
            {snapshot.levels.map((level) => {
              const linkedServices = snapshot.services.filter((service) =>
                service.revision?.levelConfigs.some(
                  (config) => config.serviceLevelId === level.id && config.isEnabled,
                ),
              ).length;
              const linkedItems = snapshot.items.filter((item) =>
                item.revision?.levelInclusions.some(
                  (inclusion) => inclusion.serviceLevelId === level.id && inclusion.included,
                ),
              ).length;
              const secondaryName = secondaryLevelName(level, locale);

              return (
                <article className="package-admin-card" key={level.id}>
                  <div className="package-admin-card-top">
                    <span className="package-admin-badge" aria-hidden="true">
                      {level.code.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="package-admin-card-title">
                      <small>{level.code}</small>
                      <h3>{localizedLevelName(level, locale)}</h3>
                      {secondaryName ? (
                        <p dir={locale === "ar" ? "ltr" : "rtl"}>{secondaryName}</p>
                      ) : null}
                    </div>
                    <StatusBadge locale={locale} status={level.status} />
                  </div>

                  <p className="package-admin-description">{level.purpose || t.noPackagePurpose}</p>

                  <dl className="package-admin-metrics">
                    <div>
                      <dt>{t.displayOrder}</dt>
                      <dd>{number(level.sortOrder, locale)}</dd>
                    </div>
                    <div>
                      <dt>{t.linkedServices}</dt>
                      <dd>{number(linkedServices, locale)}</dd>
                    </div>
                    <div>
                      <dt>{t.linkedItems}</dt>
                      <dd>{number(linkedItems, locale)}</dd>
                    </div>
                    <div>
                      <dt>{t.custom}</dt>
                      <dd>{level.isCustom ? t.custom : t.notSet}</dd>
                    </div>
                  </dl>

                  <div className="package-admin-rules">
                    <article>
                      <span>{t.sla}</span>
                      <p>{level.slaRule || t.notSet}</p>
                    </article>
                    <article>
                      <span>{t.scope}</span>
                      <p>{level.scopeRule || t.notSet}</p>
                    </article>
                    <article className="wide">
                      <span>{t.governanceRule}</span>
                      <p>{level.governanceRule || t.notSet}</p>
                    </article>
                  </div>

                  <footer className="catalog-card-footer">
                    <div className="package-admin-order">
                      <OrderControl
                        locale={locale}
                        path={`service-levels/${level.id}`}
                        current={level.sortOrder}
                        disabled={mutation.submitting || level.status === "ARCHIVED"}
                        mutate={mutation.mutate}
                      />
                    </div>

                    <div className="package-admin-actions">
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
                        <PencilLine aria-hidden="true" size={14} />
                        {t.edit}
                      </button>
                      <LifecycleActions
                        locale={locale}
                        path={`service-levels/${level.id}`}
                        status={level.status}
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
