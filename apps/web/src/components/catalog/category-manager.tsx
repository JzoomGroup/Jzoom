"use client";

import { useState, type FormEvent } from "react";
import type { CatalogCategory, CatalogSnapshot } from "../../lib/catalog-types";
import { normalizeLocale, type SupportedLocale } from "../../lib/i18n";
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

const copy = {
  ar: {
    active: "نشط",
    addCategory: "إضافة تصنيف",
    allCategories: "كل التصنيفات",
    arabicName: "الاسم العربي",
    categoryCreated: "تم إنشاء التصنيف.",
    categoryUpdated: "تم تحديث التصنيف.",
    code: "الرمز",
    codesImmutable: "لا يمكن تغيير الرموز بعد الإنشاء.",
    createCategory: "إنشاء تصنيف",
    description: "الوصف",
    displayOrder: "ترتيب العرض",
    draft: "مسودة",
    edit: "تعديل",
    editCategory: (code: string) => `تعديل ${code}`,
    englishName: "الاسم الإنجليزي",
    initialStatus: "الحالة الأولية",
    monthlyCatalog: "كتالوج الخدمات الشهرية",
    newCategory: "تصنيف جديد",
    noCategories: "لا توجد تصنيفات حتى الآن.",
    noDescription: "لا يوجد وصف.",
    records: (count: number) =>
      `${new Intl.NumberFormat("ar-SA").format(count)} سجل مرتبط بقاعدة البيانات.`,
    saveCategory: "حفظ التصنيف",
    services: "الخدمات",
    serviceCategories: "تصنيفات الخدمات",
    serviceCategoriesDescription:
      "تنظيم الخدمات الشهرية داخل تصنيفات محلية قابلة للتعديل بدون تغيير إصدارات الخدمات التاريخية.",
    order: "الترتيب",
  },
  en: {
    active: "Active",
    addCategory: "Add category",
    allCategories: "All categories",
    arabicName: "Arabic name",
    categoryCreated: "Category created.",
    categoryUpdated: "Category updated.",
    code: "Code",
    codesImmutable: "Codes are immutable after creation.",
    createCategory: "Create category",
    description: "Description",
    displayOrder: "Display order",
    draft: "Draft",
    edit: "Edit",
    editCategory: (code: string) => `Edit ${code}`,
    englishName: "English name",
    initialStatus: "Initial status",
    monthlyCatalog: "Monthly catalog",
    newCategory: "New category",
    noCategories: "No categories exist yet.",
    noDescription: "No description provided.",
    records: (count: number) => `${count} PostgreSQL-backed records.`,
    saveCategory: "Save category",
    services: "Services",
    serviceCategories: "Service categories",
    serviceCategoriesDescription:
      "Organize monthly services into editable localized categories without changing historical service revisions.",
    order: "Order",
  },
} as const;

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
        <section className="catalog-panel editor-panel">
          <div className="panel-heading">
            <div>
              <h2>{creating ? t.newCategory : t.editCategory(editing!.code)}</h2>
              <p>{t.codesImmutable}</p>
            </div>
          </div>
          <form className="catalog-form" onSubmit={submit}>
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
        </section>
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
              <article className="entity-card" key={category.id}>
                <div className="entity-card-top">
                  <div>
                    <small>{category.code}</small>
                    <h3>{category.nameEn}</h3>
                    <p dir="rtl">{category.nameAr}</p>
                  </div>
                  <StatusBadge locale={locale} status={category.status} />
                </div>
                <p className="entity-description">{category.description || t.noDescription}</p>
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
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
