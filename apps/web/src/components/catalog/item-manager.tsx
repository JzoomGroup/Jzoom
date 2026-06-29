"use client";

import { useMemo, useState, type FormEvent } from "react";
import type {
  CatalogSnapshot,
  CatalogStatus,
  ServiceItem,
  ServiceLevel,
  MonthlyService,
} from "../../lib/catalog-types";
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

interface EditableInclusion {
  serviceLevelId: string;
  included: boolean;
  sortOrder: number;
}

const copy = {
  ar: {
    active: "نشط",
    addServiceItem: "إضافة بند خدمة",
    allServices: "كل الخدمات",
    arabicName: "الاسم العربي",
    behavior: "السلوك",
    code: "الرمز",
    createItem: "إنشاء بند",
    createRevision: "إنشاء إصدار",
    deductHours: "تخصم من الساعات",
    displayOrder: "ترتيب العرض",
    draft: "مسودة",
    editItem: "تعديل البند",
    editItemTitle: (code: string) => `تعديل ${code}`,
    englishName: "الاسم الإنجليزي",
    expectedOutput: "المخرج المتوقع",
    included: "مشمول",
    includedLinks: "روابط شمول الباقات",
    include: "إضافة",
    activeItems: "بنود نشطة",
    itemCreated: "تم إنشاء بند الخدمة.",
    itemDefinitions: "تعريفات البنود",
    itemDefinitionsDescription: "تفاصيل محلية، حالة، ترتيب، وسلوك الطلبات المستقبلية.",
    itemRevisionCreated: "تم إنشاء إصدار جديد لبند الخدمة.",
    matrix: "مصفوفة شمول الباقات",
    matrixDescription: "التغييرات تنشئ إصدار بند جديد ولا تعيد كتابة لقطات عروض السعر.",
    matrixRules: "ضوابط المصفوفة",
    matrixUpdated: "تم تحديث مصفوفة شمول الباقات.",
    monthlyCatalog: "كتالوج الخدمات الشهرية",
    monthlyService: "الخدمة الشهرية",
    newItem: "بند خدمة جديد",
    noExpectedOutput: "لا يوجد مخرج متوقع.",
    noServiceItems: "لا توجد بنود خدمة مطابقة لهذا الفلتر.",
    notIncluded: "-",
    packageInclusion: "شمول الباقات",
    packages: "الباقات",
    parentService: "الخدمة الشهرية الرئيسية",
    remove: "إزالة",
    requestType: "نوع الطلب",
    requiresFile: "يتطلب ملف",
    revision: "الإصدار",
    saveRevisionDescription: (version: number) =>
      `الحفظ ينشئ الإصدار v${new Intl.NumberFormat("ar-SA").format(version)}.`,
    selectService: "اختر الخدمة",
    serviceItem: "بند الخدمة",
    serviceItemStudio: "استوديو بنود الخدمة",
    serviceItemStudioDescription:
      "إدارة البنود التي تظهر داخل الخدمات الشهرية، مع مصفوفة شمول الباقات وسلوك الطلبات المستقبلية.",
    serviceItems: "بنود الخدمة",
    serviceItemsDescription:
      "إدارة إصدارات بنود الخدمة ومصفوفة شمول الباقات المستخدمة في بطاقات الخدمات والطلبات المستقبلية.",
    status: "الحالة",
    studioSafetyA: "تغيير شمول الباقة ينشئ إصدارًا آمنًا ولا يغير عروض السعر أو الطلبات القديمة.",
    studioSafetyB: "البند المؤرشف لا يظهر في الطلبات الجديدة، لكنه يبقى محفوظًا للمراجع التاريخية.",
    studioSafetyC: "ظهور البند للعميل يعتمد على حالة الخدمة والبند ومصفوفة شمول الباقة.",
    totalItems: "إجمالي البنود",
    visibleInQuote: "ظاهر في عروض السعر المستقبلية",
    quoteVisible: "ظاهر في العروض",
    chooseParentMatrix: "اختر الخدمة الرئيسية ومصفوفة الباقات الأولية.",
  },
  en: {
    active: "Active",
    addServiceItem: "Add service item",
    allServices: "All services",
    arabicName: "Arabic name",
    behavior: "Behavior",
    code: "Code",
    createItem: "Create item",
    createRevision: "Create revision",
    deductHours: "Deduct hours",
    displayOrder: "Display order",
    draft: "Draft",
    editItem: "Edit item",
    editItemTitle: (code: string) => `Edit ${code}`,
    englishName: "English name",
    expectedOutput: "Expected output",
    included: "Included",
    includedLinks: "Included package links",
    include: "Include",
    activeItems: "Active items",
    itemCreated: "Service item created.",
    itemDefinitions: "Item definitions",
    itemDefinitionsDescription:
      "Localized details, lifecycle, ordering, and future request behavior.",
    itemRevisionCreated: "A new service-item revision was created.",
    matrix: "Package inclusion matrix",
    matrixDescription: "Changes create a new item revision and never rewrite quote snapshots.",
    matrixRules: "Matrix guardrails",
    matrixUpdated: "Package inclusion matrix updated.",
    monthlyCatalog: "Monthly catalog",
    monthlyService: "Monthly service",
    newItem: "New service item",
    noExpectedOutput: "No expected output provided.",
    noServiceItems: "No service items match this filter.",
    notIncluded: "-",
    packageInclusion: "Package inclusion",
    packages: "Packages",
    parentService: "Parent monthly service",
    remove: "Remove",
    requestType: "Request type",
    requiresFile: "Requires file",
    revision: "Revision",
    saveRevisionDescription: (version: number) => `Saving creates revision v${version}.`,
    selectService: "Select service",
    serviceItem: "Service item",
    serviceItemStudio: "Service item studio",
    serviceItemStudioDescription:
      "Manage the items shown under monthly services, including package inclusion and future request behavior.",
    serviceItems: "Service items",
    serviceItemsDescription:
      "Manage service-item revisions and the package inclusion matrix used by future service cards and requests.",
    status: "Status",
    studioSafetyA:
      "Changing package inclusion creates a safe revision and never changes old quotes or requests.",
    studioSafetyB: "Archived items stay available for history but do not appear in new requests.",
    studioSafetyC:
      "Client visibility depends on service status, item status, and package inclusion.",
    totalItems: "Total items",
    visibleInQuote: "Visible in future quotes",
    quoteVisible: "Visible in quotes",
    chooseParentMatrix: "Choose the parent service and initial package matrix.",
  },
} as const;

const statusLabels = {
  ACTIVE: { ar: "نشط", en: "Active" },
  ARCHIVED: { ar: "مؤرشف", en: "Archived" },
  DRAFT: { ar: "مسودة", en: "Draft" },
  INACTIVE: { ar: "غير نشط", en: "Inactive" },
} satisfies Record<CatalogStatus, Record<SupportedLocale, string>>;

function inclusionsForItem(levels: ServiceLevel[], item: ServiceItem | null): EditableInclusion[] {
  return levels.map((level, index) => {
    const current = item?.revision?.levelInclusions.find(
      (inclusion) => inclusion.serviceLevelId === level.id,
    );
    return {
      serviceLevelId: level.id,
      included: current?.included ?? false,
      sortOrder: current?.sortOrder ?? index,
    };
  });
}

function localeFor(locale: string | undefined): SupportedLocale {
  return normalizeLocale(locale);
}

function statusLabel(status: CatalogStatus, locale: SupportedLocale): string {
  return statusLabels[status][locale];
}

function localizedLevelName(level: ServiceLevel, locale: SupportedLocale): string {
  return locale === "ar"
    ? level.labelAr || level.labelEn || level.code
    : level.labelEn || level.labelAr || level.code;
}

function localizedServiceName(
  service: Pick<MonthlyService, "code" | "revision"> | ServiceItem["monthlyService"],
  locale: SupportedLocale,
): string {
  const nameAr = "revision" in service ? service.revision?.nameAr : service.nameAr;
  const nameEn = "revision" in service ? service.revision?.nameEn : service.nameEn;
  return locale === "ar" ? nameAr || nameEn || service.code : nameEn || nameAr || service.code;
}

function localizedItemName(item: ServiceItem, locale: SupportedLocale): string {
  return locale === "ar"
    ? item.revision?.nameAr || item.revision?.nameEn || item.code
    : item.revision?.nameEn || item.revision?.nameAr || item.code;
}

function number(value: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-SA").format(value);
}

function matrixActionLabel(
  checked: boolean,
  itemCode: string,
  levelCode: string,
  locale: SupportedLocale,
): string {
  if (locale === "ar") {
    return checked ? `إزالة ${itemCode} من ${levelCode}` : `إضافة ${itemCode} إلى ${levelCode}`;
  }
  return `${checked ? "Remove" : "Include"} ${itemCode} ${checked ? "from" : "in"} ${levelCode}`;
}

export function ItemManager({
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
  const [editing, setEditing] = useState<ServiceItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [serviceFilter, setServiceFilter] = useState("ALL");
  const [inclusions, setInclusions] = useState<EditableInclusion[]>([]);
  const mutation = useCatalogMutation(setSnapshot);
  const visibleItems = useMemo(
    () =>
      snapshot.items.filter(
        (item) => serviceFilter === "ALL" || item.monthlyServiceId === serviceFilter,
      ),
    [serviceFilter, snapshot.items],
  );
  const activeItems = snapshot.items.filter((item) => item.status === "ACTIVE").length;
  const quoteVisibleItems = snapshot.items.filter((item) => item.revision?.visibleInQuote).length;
  const includedLinks = snapshot.items.reduce(
    (sum, item) =>
      sum + (item.revision?.levelInclusions.filter((inclusion) => inclusion.included).length ?? 0),
    0,
  );

  function openCreate() {
    mutation.clearFeedback();
    setEditing(null);
    setCreating(true);
    setInclusions(inclusionsForItem(snapshot.levels, null));
  }

  function openEdit(item: ServiceItem) {
    mutation.clearFeedback();
    setCreating(false);
    setEditing(item);
    setInclusions(inclusionsForItem(snapshot.levels, item));
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
    setInclusions([]);
  }

  function setIncluded(serviceLevelId: string, included: boolean) {
    setInclusions((current) =>
      current.map((inclusion) =>
        inclusion.serviceLevelId === serviceLevelId ? { ...inclusion, included } : inclusion,
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
            monthlyServiceId: String(form.get("monthlyServiceId") ?? ""),
            status: String(form.get("status") ?? "DRAFT"),
            sortOrder: Number(form.get("sortOrder") ?? 0),
          }
        : {}),
      nameAr: String(form.get("nameAr") ?? "").trim(),
      nameEn: String(form.get("nameEn") ?? "").trim(),
      expectedOutput: String(form.get("expectedOutput") ?? "").trim(),
      requestType: String(form.get("requestType") ?? "").trim(),
      visibleInQuote: form.get("visibleInQuote") === "on",
      requiresFile: form.get("requiresFile") === "on",
      deductHours: form.get("deductHours") === "on",
      levelInclusions: inclusions,
    };
    const saved = await mutation.mutate(
      creating ? "service-items" : `service-items/${editing!.id}`,
      {
        method: creating ? "POST" : "PUT",
        body: JSON.stringify(payload),
      },
      creating ? t.itemCreated : t.itemRevisionCreated,
    );
    if (saved) {
      closeForm();
    }
  }

  async function toggleMatrix(item: ServiceItem, serviceLevelId: string) {
    if (!item.revision) {
      return;
    }
    const updated = inclusionsForItem(snapshot.levels, item).map((inclusion) =>
      inclusion.serviceLevelId === serviceLevelId
        ? { ...inclusion, included: !inclusion.included }
        : inclusion,
    );
    await mutation.mutate(
      `service-items/${item.id}/levels`,
      {
        method: "PUT",
        body: JSON.stringify({ levelInclusions: updated }),
      },
      t.matrixUpdated,
    );
  }

  const current = editing?.revision;

  return (
    <>
      <PageHeader
        actions={[{ label: t.addServiceItem, onClick: openCreate, variant: "primary" }]}
        eyebrow={t.monthlyCatalog}
        title={t.serviceItems}
        description={t.serviceItemsDescription}
      />
      <CatalogFeedback error={mutation.error} success={mutation.success} />

      <section className="item-admin-command" aria-label={t.serviceItemStudio}>
        <div className="item-admin-command-main">
          <p className="eyebrow">{t.serviceItemStudio}</p>
          <h2>{t.matrix}</h2>
          <p>{t.serviceItemStudioDescription}</p>
        </div>
        <div className="item-admin-guardrails">
          <strong>{t.matrixRules}</strong>
          <span>{t.studioSafetyA}</span>
          <span>{t.studioSafetyB}</span>
          <span>{t.studioSafetyC}</span>
        </div>
      </section>

      <BentoGrid compact>
        <MetricCard
          accent
          label={t.totalItems}
          value={number(snapshot.items.length, locale)}
          detail={`${number(activeItems, locale)} ${t.activeItems}`}
        />
        <MetricCard
          label={t.quoteVisible}
          value={number(quoteVisibleItems, locale)}
          detail={t.visibleInQuote}
        />
        <MetricCard
          label={t.includedLinks}
          value={number(includedLinks, locale)}
          detail={t.packageInclusion}
        />
        <MetricCard
          label={t.monthlyService}
          value={number(snapshot.services.length, locale)}
          detail={t.parentService}
        />
      </BentoGrid>

      <SectionCard
        title={t.matrix}
        description={t.matrixDescription}
        action={
          <label className="compact-filter">
            {t.monthlyService}
            <select
              value={serviceFilter}
              onChange={(event) => setServiceFilter(event.target.value)}
            >
              <option value="ALL">{t.allServices}</option>
              {snapshot.services.map((service) => (
                <option value={service.id} key={service.id}>
                  {localizedServiceName(service, locale)}
                </option>
              ))}
            </select>
          </label>
        }
      >
        {visibleItems.length === 0 ? (
          <EmptyState>{t.noServiceItems}</EmptyState>
        ) : (
          <div className="matrix-wrap item-admin-matrix-wrap">
            <table className="catalog-table matrix-table">
              <thead>
                <tr>
                  <th>{t.serviceItem}</th>
                  {snapshot.levels.map((level) => (
                    <th key={level.id}>{localizedLevelName(level, locale)}</th>
                  ))}
                  <th>{t.status}</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{localizedItemName(item, locale)}</strong>
                      <small>
                        {item.code} - {item.monthlyService.code}
                      </small>
                    </td>
                    {snapshot.levels.map((level) => {
                      const inclusion = item.revision?.levelInclusions.find(
                        (candidate) => candidate.serviceLevelId === level.id,
                      );
                      const checked = inclusion?.included ?? false;
                      const canChange =
                        item.status !== "INACTIVE" &&
                        item.status !== "ARCHIVED" &&
                        level.status === "ACTIVE";
                      return (
                        <td key={level.id}>
                          <button
                            className={`matrix-toggle ${checked ? "included" : ""}`}
                            type="button"
                            aria-label={matrixActionLabel(checked, item.code, level.code, locale)}
                            aria-pressed={checked}
                            disabled={!canChange || mutation.submitting}
                            onClick={() => void toggleMatrix(item, level.id)}
                          >
                            {checked ? t.included : t.notIncluded}
                          </button>
                        </td>
                      );
                    })}
                    <td>
                      <StatusBadge locale={locale} status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {creating || editing ? (
        <section className="item-admin-editor">
          <div className="item-admin-editor-heading">
            <span>{creating ? t.createItem : t.createRevision}</span>
            <h2>{creating ? t.newItem : t.editItemTitle(editing!.code)}</h2>
            <p>
              {creating
                ? t.chooseParentMatrix
                : t.saveRevisionDescription((current?.version ?? 0) + 1)}
            </p>
          </div>
          <form className="catalog-form wide-form item-admin-form" onSubmit={submit}>
            {creating ? (
              <>
                <label>
                  {t.code}
                  <input
                    name="code"
                    required
                    pattern="[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*"
                    placeholder="ITEM-HR-ONBOARDING"
                  />
                </label>
                <label>
                  {t.parentService}
                  <select name="monthlyServiceId" required defaultValue="">
                    <option value="" disabled>
                      {t.selectService}
                    </option>
                    {snapshot.services
                      .filter(
                        (service) => service.status === "ACTIVE" || service.status === "DRAFT",
                      )
                      .map((service) => (
                        <option value={service.id} key={service.id}>
                          {localizedServiceName(service, locale)} -{" "}
                          {statusLabel(service.status, locale)}
                        </option>
                      ))}
                  </select>
                </label>
              </>
            ) : null}
            <label>
              {t.arabicName}
              <input name="nameAr" required dir="rtl" defaultValue={current?.nameAr} />
            </label>
            <label>
              {t.englishName}
              <input name="nameEn" required defaultValue={current?.nameEn} />
            </label>
            <label className="form-span">
              {t.expectedOutput}
              <textarea name="expectedOutput" defaultValue={current?.expectedOutput ?? ""} />
            </label>
            <label className="form-span">
              {t.requestType}
              <input name="requestType" defaultValue={current?.requestType ?? ""} />
            </label>
            <fieldset className="form-span option-fieldset">
              <legend>{t.behavior}</legend>
              <label className="checkbox-field">
                <input
                  name="visibleInQuote"
                  type="checkbox"
                  defaultChecked={current?.visibleInQuote ?? true}
                />
                {t.visibleInQuote}
              </label>
              <label className="checkbox-field">
                <input
                  name="requiresFile"
                  type="checkbox"
                  defaultChecked={current?.requiresFile ?? false}
                />
                {t.requiresFile}
              </label>
              <label className="checkbox-field">
                <input
                  name="deductHours"
                  type="checkbox"
                  defaultChecked={current?.deductHours ?? true}
                />
                {t.deductHours}
              </label>
            </fieldset>
            <fieldset className="form-span package-editor">
              <legend>{t.packageInclusion}</legend>
              <div className="inclusion-grid">
                {snapshot.levels.map((level) => {
                  const inclusion = inclusions.find(
                    (candidate) => candidate.serviceLevelId === level.id,
                  );
                  return (
                    <label className="inclusion-option" key={level.id}>
                      <input
                        type="checkbox"
                        checked={inclusion?.included ?? false}
                        disabled={level.status !== "ACTIVE"}
                        onChange={(event) => setIncluded(level.id, event.target.checked)}
                      />
                      <span>
                        <strong>{localizedLevelName(level, locale)}</strong>
                        <small>{statusLabel(level.status, locale)}</small>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            {creating && (
              <>
                <label>
                  {t.status}
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
              submitLabel={creating ? t.createItem : t.createRevision}
            />
          </form>
        </section>
      ) : null}

      <SectionCard title={t.itemDefinitions} description={t.itemDefinitionsDescription}>
        {visibleItems.length === 0 ? (
          <EmptyState>{t.noServiceItems}</EmptyState>
        ) : (
          <div className="item-admin-grid">
            {visibleItems.map((item) => {
              const revision = item.revision;
              const includedCount =
                revision?.levelInclusions.filter((inclusion) => inclusion.included).length ?? 0;

              return (
                <article className="item-admin-card" key={item.id}>
                  <div className="item-admin-card-top">
                    <span className="item-admin-badge" aria-hidden="true">
                      {item.code.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="item-admin-card-title">
                      <small>
                        {item.code} - {item.monthlyService.code}
                      </small>
                      <h3>{localizedItemName(item, locale)}</h3>
                      {locale === "en" && revision?.nameAr ? (
                        <p dir="rtl">{revision.nameAr}</p>
                      ) : null}
                    </div>
                    <StatusBadge locale={locale} status={item.status} />
                  </div>

                  <p className="item-admin-description">
                    {revision?.expectedOutput || t.noExpectedOutput}
                  </p>

                  <dl className="item-admin-metrics">
                    <div>
                      <dt>{t.revision}</dt>
                      <dd>v{revision?.version ?? "-"}</dd>
                    </div>
                    <div>
                      <dt>{t.packages}</dt>
                      <dd>{number(includedCount, locale)}</dd>
                    </div>
                    <div>
                      <dt>{t.requestType}</dt>
                      <dd>{revision?.requestType || "-"}</dd>
                    </div>
                    <div>
                      <dt>{t.monthlyService}</dt>
                      <dd>{localizedServiceName(item.monthlyService, locale)}</dd>
                    </div>
                  </dl>

                  <div className="item-admin-flags">
                    {revision?.visibleInQuote ? <span>{t.visibleInQuote}</span> : null}
                    {revision?.requiresFile ? <span>{t.requiresFile}</span> : null}
                    {revision?.deductHours ? <span>{t.deductHours}</span> : null}
                  </div>

                  <div className="item-admin-order">
                    <OrderControl
                      locale={locale}
                      path={`service-items/${item.id}`}
                      current={item.sortOrder}
                      disabled={mutation.submitting || item.status === "ARCHIVED"}
                      mutate={mutation.mutate}
                    />
                  </div>

                  <div className="item-admin-actions">
                    <button
                      className="os-button os-button-secondary"
                      type="button"
                      disabled={item.status === "ARCHIVED"}
                      onClick={() => openEdit(item)}
                    >
                      {t.editItem}
                    </button>
                    <LifecycleActions
                      locale={locale}
                      path={`service-items/${item.id}`}
                      status={item.status}
                      disabled={mutation.submitting}
                      mutate={mutation.mutate}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </SectionCard>
    </>
  );
}
