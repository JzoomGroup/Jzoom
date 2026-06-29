import type { CatalogSnapshot } from "../../lib/catalog-types";
import { normalizeLocale, type SupportedLocale } from "../../lib/i18n";
import { ControlDeck, ControlTile, MetricCard, SectionCard, SmartTable } from "../premium-os";
import { SectionHeader, StatusBadge } from "./catalog-shared";

const copy = {
  ar: {
    active: "نشطة",
    adminConsole: "لوحة الأدمن",
    administrationAreas: "مناطق الإدارة",
    administrationDescription: "كل تغيير مصرح من الـ backend ويتم تسجيله في سجل التدقيق.",
    categories: "التصنيفات",
    categoriesDescription: "تجميع محلي، ترتيب، وتحكم آمن بالحالة.",
    category: "التصنيف",
    catalogSummary: "ملخص الكتالوج",
    items: "البنود",
    monthlyCatalog: "كتالوج الخدمات الشهرية",
    monthlyCatalogDescription:
      "إدارة الكتالوج الشهري الحي المرتبط بقاعدة PostgreSQL مع الحفاظ على كل إصدار تاريخي مثبت.",
    monthlyGroups: "مجموعات شهرية",
    monthlyServices: "الخدمات الشهرية",
    monthlyServicesDescription: "أسماء، ساعات، أسعار، رسوم، وتوفر باقات مع إصدارات آمنة.",
    oneTimeCategories: "تصنيفات المرة الواحدة",
    oneTimeCategoriesDescription: "تجميعات Build وDigital محلية مع تحكم آمن بالحالة.",
    oneTimeServices: "خدمات المرة الواحدة",
    oneTimeServicesDescription: "تسعير بإصدارات، مراحل، مخرجات، مهام، ومدة تنفيذ.",
    packageLevels: "مستويات الباقات",
    revision: "الإصدار",
    seededCatalog: "رؤية الكتالوج المحمل",
    seededCatalogDescription: "إصدارات الخدمات الحية الحالية المحملة من Excel V3.",
    service: "الخدمة",
    serviceItems: "بنود الخدمة",
    serviceItemsDescription: "تعريفات البنود ومصفوفة شمول الباقات الكاملة.",
    serviceLevels: "مستويات الخدمة",
    serviceLevelsDescription:
      "Basic وGrowth وAdvanced وPartnership ومستويات مستقبلية قابلة للتكوين.",
    status: "الحالة",
    subscriptionTiers: "شرائح الاشتراك",
  },
  en: {
    active: "active",
    adminConsole: "Admin Console",
    administrationAreas: "Administration areas",
    administrationDescription:
      "Each change is authorized by the backend and written to the audit log.",
    categories: "Categories",
    categoriesDescription: "Localized grouping, ordering, and lifecycle controls.",
    category: "Category",
    catalogSummary: "Catalog summary",
    items: "Items",
    monthlyCatalog: "Monthly catalog",
    monthlyCatalogDescription:
      "Manage the live PostgreSQL-backed monthly catalog while preserving every pinned historical revision.",
    monthlyGroups: "Monthly groups",
    monthlyServices: "Monthly services",
    monthlyServicesDescription:
      "Revision-safe names, hours, rates, fees, and package availability.",
    oneTimeCategories: "One-time categories",
    oneTimeCategoriesDescription:
      "Localized Build and Digital groupings with safe lifecycle controls.",
    oneTimeServices: "One-time services",
    oneTimeServicesDescription: "Revisioned pricing, phases, deliverables, tasks, and duration.",
    packageLevels: "Package levels",
    revision: "Revision",
    seededCatalog: "Seeded catalog visibility",
    seededCatalogDescription: "The current live service revisions loaded from Excel V3.",
    service: "Service",
    serviceItems: "Service items",
    serviceItemsDescription: "Item definitions and the complete package inclusion matrix.",
    serviceLevels: "Service levels",
    serviceLevelsDescription:
      "Basic, Growth, Advanced, Partnership, and future configurable levels.",
    status: "Status",
    subscriptionTiers: "Subscription tiers",
  },
} as const;

function overviewLocale(locale: string | undefined): SupportedLocale {
  return normalizeLocale(locale);
}

function number(value: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-SA").format(value);
}

export function CatalogOverview({
  locale: localeInput = "en",
  snapshot,
}: {
  locale?: string;
  snapshot: CatalogSnapshot;
}) {
  const locale = overviewLocale(localeInput);
  const t = copy[locale];
  const activeServices = snapshot.services.filter((service) => service.status === "ACTIVE").length;
  const activeItems = snapshot.items.filter((item) => item.status === "ACTIVE").length;

  return (
    <>
      <SectionHeader
        eyebrow={t.adminConsole}
        title={t.monthlyCatalog}
        description={t.monthlyCatalogDescription}
      />

      <section className="metric-grid" aria-label={t.catalogSummary}>
        <MetricCard
          label={t.categories}
          value={number(snapshot.categories.length, locale)}
          detail={t.monthlyGroups}
        />
        <MetricCard
          label={t.monthlyServices}
          value={number(snapshot.services.length, locale)}
          detail={`${number(activeServices, locale)} ${t.active}`}
          accent
        />
        <MetricCard
          label={t.serviceItems}
          value={number(snapshot.items.length, locale)}
          detail={`${number(activeItems, locale)} ${t.active}`}
        />
        <MetricCard
          label={t.packageLevels}
          value={number(snapshot.levels.length, locale)}
          detail={t.subscriptionTiers}
        />
      </section>

      <ControlDeck title={t.administrationAreas} description={t.administrationDescription}>
        <ControlTile
          href="/admin/catalog/categories"
          meta="01"
          title={t.categories}
          description={t.categoriesDescription}
        />
        <ControlTile
          href="/admin/catalog/monthly-services"
          meta="02"
          title={t.monthlyServices}
          description={t.monthlyServicesDescription}
        />
        <ControlTile
          href="/admin/catalog/service-items"
          meta="03"
          title={t.serviceItems}
          description={t.serviceItemsDescription}
        />
        <ControlTile
          href="/admin/catalog/service-levels"
          meta="04"
          title={t.serviceLevels}
          description={t.serviceLevelsDescription}
        />
        <ControlTile
          href="/admin/catalog/one-time-categories"
          meta="05"
          title={t.oneTimeCategories}
          description={t.oneTimeCategoriesDescription}
        />
        <ControlTile
          href="/admin/catalog/one-time-services"
          meta="06"
          title={t.oneTimeServices}
          description={t.oneTimeServicesDescription}
        />
      </ControlDeck>

      <SectionCard title={t.seededCatalog} description={t.seededCatalogDescription}>
        <SmartTable>
          <table className="catalog-table">
            <thead>
              <tr>
                <th>{t.service}</th>
                <th>{t.category}</th>
                <th>{t.revision}</th>
                <th>{t.status}</th>
                <th>{t.items}</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.services.map((service) => (
                <tr key={service.id}>
                  <td>
                    <strong>
                      {locale === "ar"
                        ? service.revision?.nameAr || service.revision?.nameEn || service.code
                        : service.revision?.nameEn || service.revision?.nameAr || service.code}
                    </strong>
                    <small>{service.code}</small>
                  </td>
                  <td>
                    {locale === "ar"
                      ? service.category.nameAr || service.category.nameEn
                      : service.category.nameEn || service.category.nameAr}
                  </td>
                  <td>v{service.revision?.version ?? "-"}</td>
                  <td>
                    <StatusBadge locale={locale} status={service.status} />
                  </td>
                  <td>{number(service.itemCount, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SmartTable>
      </SectionCard>
    </>
  );
}
