"use client";

import { useState, type FormEvent } from "react";
import { refreshOneTimeCatalog } from "../../lib/one-time-catalog-client";
import { normalizeLocale, type SupportedLocale } from "../../lib/i18n";
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

const copy = {
  ar: {
    active: "نشط",
    addCategory: "إضافة تصنيف",
    arabicName: "الاسم العربي",
    code: "الرمز",
    configuredCategories: "التصنيفات المفعلة",
    createCategory: "إنشاء التصنيف",
    created: "تم إنشاء تصنيف المرة الواحدة.",
    codesImmutable: "الرموز ثابتة بعد الإنشاء.",
    description: "الوصف",
    descriptionBody:
      "إدارة تصنيفات خدمات المرة الواحدة مثل Build وDigital بدون حذف السجلات التاريخية.",
    displayOrder: "ترتيب العرض",
    draft: "مسودة",
    edit: "تعديل",
    editCategory: (code: string) => `تعديل ${code}`,
    englishName: "الاسم الإنجليزي",
    initialStatus: "الحالة الأولية",
    newCategory: "تصنيف مرة واحدة جديد",
    noCategories: "لا توجد تصنيفات لخدمات المرة الواحدة حتى الآن.",
    noDescription: "لا يوجد وصف.",
    oneTimeCatalog: "كتالوج المرة الواحدة",
    oneTimeCategoryStudio: "استوديو تصنيفات المرة الواحدة",
    oneTimeCategoryStudioDescription:
      "تنظيم مسارات خدمات المرة الواحدة وربطها بالخدمات والأسعار والطلبات المستقبلية بشكل آمن.",
    oneTimeCategories: "تصنيفات خدمات المرة الواحدة",
    order: "الترتيب",
    records: (count: number) =>
      `${new Intl.NumberFormat("ar-SA").format(count)} سجل مرتبط بقاعدة البيانات.`,
    saveCategory: "حفظ التصنيف",
    services: "الخدمات",
    studioRules: "ضوابط التصنيف",
    studioSafetyA: "رمز التصنيف ثابت بعد الإنشاء لحماية الخدمات والطلبات السابقة.",
    studioSafetyB: "أرشفة التصنيف لا تحذف الخدمات المرتبطة أو الإصدارات التاريخية.",
    studioSafetyC: "التصنيف النشط فقط يجب أن يظهر في إنشاء خدمات جديدة.",
    totalCategories: "إجمالي التصنيفات",
    updated: "تم تحديث تصنيف المرة الواحدة.",
  },
  en: {
    active: "Active",
    addCategory: "Add category",
    arabicName: "Arabic name",
    code: "Code",
    configuredCategories: "Configured categories",
    createCategory: "Create category",
    created: "One-time category created.",
    codesImmutable: "Codes are immutable after creation.",
    description: "Description",
    descriptionBody:
      "Manage localized categories for Build and Digital services without deleting historical revisions.",
    displayOrder: "Display order",
    draft: "Draft",
    edit: "Edit",
    editCategory: (code: string) => `Edit ${code}`,
    englishName: "English name",
    initialStatus: "Initial status",
    newCategory: "New one-time category",
    noCategories: "No one-time categories exist yet.",
    noDescription: "No description provided.",
    oneTimeCatalog: "One-time catalog",
    oneTimeCategoryStudio: "One-time category studio",
    oneTimeCategoryStudioDescription:
      "Organize one-time service paths and keep them connected to services, pricing, and future requests safely.",
    oneTimeCategories: "One-time service categories",
    order: "Order",
    records: (count: number) => `${count} PostgreSQL-backed records.`,
    saveCategory: "Save category",
    services: "Services",
    studioRules: "Category guardrails",
    studioSafetyA:
      "Category codes stay stable after creation to protect services and prior requests.",
    studioSafetyB: "Archiving a category never deletes linked services or historical revisions.",
    studioSafetyC: "Only active categories should be used when creating new services.",
    totalCategories: "Total categories",
    updated: "One-time category updated.",
  },
} as const;

function localizedCategoryName(category: OneTimeCategory, locale: SupportedLocale): string {
  return locale === "ar"
    ? category.nameAr || category.nameEn || category.code
    : category.nameEn || category.nameAr || category.code;
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

      <section className="one-time-category-command" aria-label={t.oneTimeCategoryStudio}>
        <div className="one-time-category-command-main">
          <p className="eyebrow">{t.oneTimeCategoryStudio}</p>
          <h2>{t.configuredCategories}</h2>
          <p>{t.oneTimeCategoryStudioDescription}</p>
        </div>
        <div className="one-time-category-guardrails">
          <strong>{t.studioRules}</strong>
          <span>{t.studioSafetyA}</span>
          <span>{t.studioSafetyB}</span>
          <span>{t.studioSafetyC}</span>
        </div>
      </section>

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
        <section className="one-time-category-editor">
          <div className="one-time-category-editor-heading">
            <span>{creating ? t.createCategory : t.edit}</span>
            <h2>{creating ? t.newCategory : t.editCategory(editing!.code)}</h2>
            <p>{t.codesImmutable}</p>
          </div>
          <form className="catalog-form wide-form one-time-category-form" onSubmit={submit}>
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
        </section>
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
                  {category.description || t.noDescription}
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
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}
