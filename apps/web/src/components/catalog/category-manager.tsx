"use client";

import { categoryManagerCopy as copy } from "../../i18n/dictionaries/catalog";

import { useState, type FormEvent } from "react";
import { PencilLine } from "lucide-react";
import type { CatalogCategory, CatalogSnapshot } from "../../lib/catalog-types";
import { normalizeLocale, type SupportedLocale } from "../../lib/i18n";
import { localizedCatalogLabel, localizedDescription } from "../../lib/localized-content";
import { AppDialog } from "../app-dialog";
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

function categoryLocale(locale: string | undefined): SupportedLocale {
  return normalizeLocale(locale);
}

export function CategoryManager({
  locale: localeInput = "en",
  snapshot,
  setSnapshot,
}: {
  locale?: string;
  snapshot: CatalogSnapshot;
  setSnapshot: (snapshot: CatalogSnapshot) => void;
}) {
  const locale = categoryLocale(localeInput);
  const t = copy[locale];
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
      creating ? t.categoryCreated : t.categoryUpdated,
    );
    if (saved) {
      closeForm();
    }
  }

  return (
    <>
      <SectionHeader
        eyebrow={t.monthlyCatalog}
        title={t.serviceCategories}
        description={t.serviceCategoriesDescription}
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
            {t.addCategory}
          </button>
        }
      />
      <CatalogFeedback error={mutation.error} success={mutation.success} />

      {(creating || editing) && (
        <AppDialog
          busy={mutation.submitting}
          closeLabel={locale === "ar" ? "إغلاق" : "Close"}
          description={t.codesImmutable}
          eyebrow={creating ? t.addCategory : t.editCategory(editing!.code)}
          onClose={closeForm}
          size="md"
          title={creating ? t.newCategory : t.editCategory(editing!.code)}
        >
          <form className="catalog-form" noValidate onSubmit={submit}>
            {creating && (
              <label>
                {t.code}
                <input
                  name="code"
                  required
                  pattern="[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*"
                  placeholder="CAT-HR"
                />
              </label>
            )}
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
      )}

      <section className="catalog-panel">
        <div className="panel-heading">
          <div>
            <h2>{t.allCategories}</h2>
            <p>{t.records(snapshot.categories.length)}</p>
          </div>
        </div>
        {snapshot.categories.length === 0 ? (
          <EmptyState>{t.noCategories}</EmptyState>
        ) : (
          <div className="entity-grid">
            {snapshot.categories.map((category) => (
              <article className="entity-card catalog-category-card" key={category.id}>
                <div className="entity-card-top">
                  <div>
                    <small>{category.code}</small>
                    <h3>{localizedCatalogLabel(category, locale)}</h3>
                    {locale === "en" ? <p dir="rtl">{category.nameAr}</p> : null}
                  </div>
                  <StatusBadge locale={locale} status={category.status} />
                </div>
                <p className="entity-description">
                  {localizedDescription(category.description, locale, t.noDescription)}
                </p>
                <dl className="entity-meta">
                  <div>
                    <dt>{t.services}</dt>
                    <dd>{category.serviceCount}</dd>
                  </div>
                  <div>
                    <dt>{t.order}</dt>
                    <dd>{category.sortOrder}</dd>
                  </div>
                </dl>
                <footer className="catalog-card-footer">
                  <OrderControl
                    locale={locale}
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
                      <PencilLine aria-hidden="true" size={14} />
                      {t.edit}
                    </button>
                    <LifecycleActions
                      locale={locale}
                      path={`admin/catalog/categories/${category.id}`}
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
      </section>
    </>
  );
}
