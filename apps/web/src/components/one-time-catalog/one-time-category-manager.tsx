"use client";

import { oneTimeCategoryManagerCopy as copy } from "../../i18n/dictionaries/catalog";

import { useState, type FormEvent } from "react";
import { PencilLine } from "lucide-react";
import { refreshOneTimeCatalog } from "../../lib/one-time-catalog-client";
import { normalizeLocale, type SupportedLocale } from "../../lib/i18n";
import { localizedCatalogLabel, localizedDescription } from "../../lib/localized-content";
import type { OneTimeCatalogSnapshot, OneTimeCategory } from "../../lib/one-time-catalog-types";
import {
  CatalogFeedback,
  EmptyState,
  FormActions,
  LifecycleActions,
  OrderControl,
  StatusBadge,
  useCatalogMutation,
} from "../catalog/catalog-shared";
import { BentoGrid, MetricCard, PageHeader, SectionCard } from "../premium-os";
import { AppDialog } from "../app-dialog";

function localizedCategoryName(category: OneTimeCategory, locale: SupportedLocale): string {
  return localizedCatalogLabel(category, locale);
}

function number(value: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-SA").format(value);
}

export function OneTimeCategoryManager({
  initialSnapshot,
  locale: localeInput = "en",
}: {
  initialSnapshot: OneTimeCatalogSnapshot;
  locale?: string;
}) {
  const locale = normalizeLocale(localeInput);
  const t = copy[locale];
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [editing, setEditing] = useState<OneTimeCategory | null>(null);
  const [creating, setCreating] = useState(false);
  const mutation = useCatalogMutation(setSnapshot, refreshOneTimeCatalog);
  const activeCategories = snapshot.categories.filter(
    (category) => category.status === "ACTIVE",
  ).length;
  const linkedServices = snapshot.categories.reduce(
    (sum, category) => sum + category.serviceCount,
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
      creating
        ? "admin/catalog/one-time/categories"
        : `admin/catalog/one-time/categories/${editing!.id}`,
      {
        method: creating ? "POST" : "PUT",
        body: JSON.stringify(payload),
      },
      creating ? t.created : t.updated,
    );
    if (saved) {
      closeForm();
    }
  }

  return (
    <>
      <PageHeader
        actions={[{ label: t.addCategory, onClick: openCreate, variant: "primary" }]}
        eyebrow={t.oneTimeCatalog}
        title={t.oneTimeCategories}
        description={t.descriptionBody}
      />
      <CatalogFeedback error={mutation.error} success={mutation.success} />

      <BentoGrid compact>
        <MetricCard
          accent
          label={t.totalCategories}
          value={number(snapshot.categories.length, locale)}
          detail={`${number(activeCategories, locale)} ${t.active}`}
        />
        <MetricCard
          label={t.services}
          value={number(linkedServices, locale)}
          detail={t.configuredCategories}
        />
      </BentoGrid>

      {creating || editing ? (
        <AppDialog
          busy={mutation.submitting}
          closeLabel={locale === "ar" ? "إغلاق" : "Close"}
          description={t.codesImmutable}
          eyebrow={creating ? t.createCategory : t.edit}
          onClose={closeForm}
          size="lg"
          title={creating ? t.newCategory : t.editCategory(editing!.code)}
        >
          <form
            className="catalog-form wide-form one-time-category-form"
            noValidate
            onSubmit={submit}
          >
            {creating ? (
              <label>
                {t.code}
                <input
                  name="code"
                  required
                  pattern="[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*"
                  placeholder="OT-CAT-BUILD"
                />
              </label>
            ) : null}
            <label>
              {t.arabicName}
              <input name="nameAr" required dir="rtl" defaultValue={editing?.nameAr} />
            </label>
            <label>
              {t.englishName}
              <input name="nameEn" required defaultValue={editing?.nameEn} />
            </label>
            <label className="form-span">
              {t.description}
              <textarea name="description" defaultValue={editing?.description ?? ""} />
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
              submitLabel={creating ? t.createCategory : t.saveCategory}
            />
          </form>
        </AppDialog>
      ) : null}

      <SectionCard
        title={t.configuredCategories}
        description={t.records(snapshot.categories.length)}
      >
        {snapshot.categories.length === 0 ? (
          <EmptyState>{t.noCategories}</EmptyState>
        ) : (
          <div className="one-time-category-grid">
            {snapshot.categories.map((category) => (
              <article className="one-time-category-card" key={category.id}>
                <div className="one-time-category-card-top">
                  <span className="one-time-category-badge" aria-hidden="true">
                    {category.code.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="one-time-category-card-title">
                    <small>{category.code}</small>
                    <h3>{localizedCategoryName(category, locale)}</h3>
                    {locale === "en" ? <p dir="rtl">{category.nameAr}</p> : null}
                  </div>
                  <StatusBadge locale={locale} status={category.status} />
                </div>
                <p className="one-time-category-description">
                  {localizedDescription(category.description, locale, t.noDescription)}
                </p>
                <dl className="one-time-category-metrics">
                  <div>
                    <dt>{t.services}</dt>
                    <dd>{number(category.serviceCount, locale)}</dd>
                  </div>
                  <div>
                    <dt>{t.order}</dt>
                    <dd>{number(category.sortOrder, locale)}</dd>
                  </div>
                </dl>
                <footer className="catalog-card-footer">
                  <div className="one-time-category-order">
                    <OrderControl
                      locale={locale}
                      path={`admin/catalog/one-time/categories/${category.id}`}
                      current={category.sortOrder}
                      disabled={mutation.submitting || category.status === "ARCHIVED"}
                      mutate={mutation.mutate}
                    />
                  </div>
                  <div className="one-time-category-actions">
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
                      <PencilLine aria-hidden="true" size={14} />
                      {t.edit}
                    </button>
                    <LifecycleActions
                      locale={locale}
                      path={`admin/catalog/one-time/categories/${category.id}`}
                      status={category.status}
                      disabled={mutation.submitting}
                      mutate={mutation.mutate}
                    />
                  </div>
                </footer>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}
