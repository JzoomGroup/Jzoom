import type { CatalogSnapshot } from "../../lib/catalog-types";
import { normalizeLocale, type SupportedLocale } from "../../lib/i18n";
import { localizedCatalogLabel } from "../../lib/localized-content";
import { MetricCard, SectionCard, SmartTable } from "../premium-os";
import { SectionHeader, StatusBadge } from "./catalog-shared";

const copy = {
  ar: {
    active: "نشطة",
    adminConsole: "لوحة الأدمن",
    categories: "التصنيفات",
    category: "التصنيف",
    catalogSummary: "ملخص الكتالوج",
    items: "البنود",
    monthlyCatalog: "كتالوج الخدمات الشهرية",
    monthlyCatalogDescription:
      "إدارة الكتالوج الشهري الحي المرتبط بقاعدة البيانات مع الحفاظ على كل إصدار تاريخي مثبت.",
    monthlyGroups: "مجموعات شهرية",
    monthlyServices: "الخدمات الشهرية",
    packageLevels: "مستويات الباقات",
    revision: "الإصدار",
    seededCatalog: "رؤية الكتالوج المحمل",
    seededCatalogDescription: "إصدارات الخدمات الحية الحالية المحملة من ملف الاستيراد المعتمد.",
    service: "الخدمة",
    serviceItems: "بنود الخدمة",
    status: "الحالة",
    subscriptionTiers: "شرائح الاشتراك",
  },
  en: {
    active: "active",
    adminConsole: "Admin Console",
    categories: "Categories",
    category: "Category",
    catalogSummary: "Catalog summary",
    items: "Items",
    monthlyCatalog: "Monthly catalog",
    monthlyCatalogDescription:
      "Manage the live PostgreSQL-backed monthly catalog while preserving every pinned historical revision.",
    monthlyGroups: "Monthly groups",
    monthlyServices: "Monthly services",
    packageLevels: "Package levels",
    revision: "Revision",
    seededCatalog: "Seeded catalog visibility",
    seededCatalogDescription: "The current live service revisions loaded from Excel V3.",
    service: "Service",
    serviceItems: "Service items",
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
                  <td>{localizedCatalogLabel(service.category, locale)}</td>
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
