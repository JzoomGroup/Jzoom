"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { pricingCopy } from "../../i18n/dictionaries/catalog";
import { normalizeLocale, type SupportedLocale } from "../../lib/i18n";
import { localizedCatalogLabel } from "../../lib/localized-content";
import type { PricingStudioCatalog } from "../../lib/pricing-types";
import { EmptyState } from "../premium-os";

export interface MonthlySelectionState {
  levelId: string;
  quantity: number;
}

type ServiceTab = "MONTHLY" | "ONE_TIME";

function money(value: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(
    locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-SA-u-ca-gregory-nu-latn",
    {
      style: "currency",
      currency: "SAR",
      maximumFractionDigits: 2,
    },
  ).format(value);
}

function number(value: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(
    locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-SA-u-ca-gregory-nu-latn",
    {
      maximumFractionDigits: 2,
    },
  ).format(value);
}

function monthlyName(
  service: PricingStudioCatalog["monthlyServices"][number],
  locale: SupportedLocale,
): string {
  return locale === "ar"
    ? service.revision.nameAr || "خدمة شهرية غير مترجمة"
    : service.revision.nameEn || service.revision.nameAr;
}

function oneTimeName(
  service: PricingStudioCatalog["oneTimeServices"][number],
  locale: SupportedLocale,
): string {
  return locale === "ar"
    ? service.revision.nameAr || "خدمة مرة واحدة غير مترجمة"
    : service.revision.nameEn || service.revision.nameAr;
}

function categoryName(
  service: {
    categoryName: string;
    categoryNameAr?: string;
    categoryNameEn?: string;
  },
  locale: SupportedLocale,
): string {
  return localizedCatalogLabel(
    {
      code: service.categoryName,
      nameAr: service.categoryNameAr,
      nameEn: service.categoryNameEn || service.categoryName,
    },
    locale,
  );
}

function description(value: string, locale: SupportedLocale): string {
  if (locale === "en" || /[\u0600-\u06ff]/.test(value)) {
    return value;
  }
  return "تخضع تفاصيل هذه الخدمة وسعرها لإعدادات الكتالوج الحالية.";
}

function searchable(values: Array<string | null | undefined>): string {
  return values.filter(Boolean).join(" ").toLocaleLowerCase();
}

export function PricingServicePicker({
  catalog,
  disabled,
  locale: localeInput,
  monthlySelections,
  onMonthlyChange,
  onMonthlyToggle,
  onOneTimeChange,
  onOneTimeToggle,
  oneTimeSelections,
}: {
  catalog: PricingStudioCatalog;
  disabled: boolean;
  locale: string;
  monthlySelections: Map<string, MonthlySelectionState>;
  onMonthlyChange: (revisionId: string, update: Partial<MonthlySelectionState>) => void;
  onMonthlyToggle: (revisionId: string, defaultLevelId: string, checked: boolean) => void;
  onOneTimeChange: (revisionId: string, quantity: number) => void;
  onOneTimeToggle: (revisionId: string, checked: boolean) => void;
  oneTimeSelections: Map<string, number>;
}) {
  const locale = normalizeLocale(localeInput);
  const t = pricingCopy[locale];
  const [tab, setTab] = useState<ServiceTab>("MONTHLY");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [selectedOnly, setSelectedOnly] = useState(false);

  const activeServices = tab === "MONTHLY" ? catalog.monthlyServices : catalog.oneTimeServices;
  const categories = useMemo(
    () =>
      [...new Set(activeServices.map((service) => categoryName(service, locale)))].sort((a, b) =>
        a.localeCompare(b, locale === "ar" ? "ar" : "en"),
      ),
    [activeServices, locale],
  );
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleMonthly = catalog.monthlyServices.filter((service) => {
    const selected = monthlySelections.has(service.revision.id);
    return (
      (!selectedOnly || selected) &&
      (category === "ALL" || categoryName(service, locale) === category) &&
      (!normalizedQuery ||
        searchable([
          service.code,
          service.revision.nameAr,
          service.revision.nameEn,
          service.revision.description,
          categoryName(service, locale),
        ]).includes(normalizedQuery))
    );
  });
  const visibleOneTime = catalog.oneTimeServices.filter((service) => {
    const selected = oneTimeSelections.has(service.revision.id);
    return (
      (!selectedOnly || selected) &&
      (category === "ALL" || categoryName(service, locale) === category) &&
      (!normalizedQuery ||
        searchable([
          service.code,
          service.revision.nameAr,
          service.revision.nameEn,
          service.revision.description,
          categoryName(service, locale),
        ]).includes(normalizedQuery))
    );
  });
  const visibleCount = tab === "MONTHLY" ? visibleMonthly.length : visibleOneTime.length;

  function changeTab(next: ServiceTab) {
    setTab(next);
    setCategory("ALL");
    setQuery("");
  }

  return (
    <section className="catalog-panel pricing-service-picker">
      <div className="pricing-picker-heading">
        <div>
          <p className="eyebrow">{t.serviceCatalog}</p>
          <h2>{t.chooseServices}</h2>
          <p>{t.chooseServicesDescription}</p>
        </div>
        <div className="pricing-service-tabs" role="tablist" aria-label={t.serviceCatalog}>
          <button
            aria-selected={tab === "MONTHLY"}
            className={tab === "MONTHLY" ? "active" : undefined}
            role="tab"
            type="button"
            onClick={() => changeTab("MONTHLY")}
          >
            {t.monthlyServicesTab}
            <span>{number(monthlySelections.size, locale)}</span>
          </button>
          <button
            aria-selected={tab === "ONE_TIME"}
            className={tab === "ONE_TIME" ? "active" : undefined}
            role="tab"
            type="button"
            onClick={() => changeTab("ONE_TIME")}
          >
            {t.oneTimeServicesTab}
            <span>{number(oneTimeSelections.size, locale)}</span>
          </button>
        </div>
      </div>

      <div className="pricing-picker-toolbar">
        <label className="pricing-search-field">
          <Search aria-hidden="true" size={16} />
          <span className="sr-only">{t.searchServices}</span>
          <input
            aria-label={t.searchServices}
            placeholder={t.searchServicesPlaceholder}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="pricing-category-filter">
          <SlidersHorizontal aria-hidden="true" size={16} />
          <span className="sr-only">{t.serviceCategory}</span>
          <select
            aria-label={t.serviceCategory}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="ALL">{t.allCategories}</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="pricing-selected-toggle">
          <input
            checked={selectedOnly}
            type="checkbox"
            onChange={(event) => setSelectedOnly(event.target.checked)}
          />
          {t.selectedOnly}
        </label>
        <span className="pricing-result-count">{t.visibleServices(visibleCount)}</span>
      </div>

      {visibleCount === 0 ? (
        <EmptyState title={t.noMatchingServices}>{t.noMatchingServicesDescription}</EmptyState>
      ) : tab === "MONTHLY" ? (
        <div className="pricing-service-grid" role="tabpanel">
          {visibleMonthly.map((service) => {
            const selected = monthlySelections.get(service.revision.id);
            const name = monthlyName(service, locale);
            const defaultLevel = service.revision.levels[0];
            return (
              <article
                className={selected ? "pricing-service-card selected" : "pricing-service-card"}
                key={service.id}
              >
                <label className="pricing-select-heading">
                  <input
                    aria-label={t.selectService(name)}
                    checked={Boolean(selected)}
                    disabled={disabled || !defaultLevel}
                    type="checkbox"
                    onChange={(event) => {
                      if (defaultLevel) {
                        onMonthlyToggle(service.revision.id, defaultLevel.id, event.target.checked);
                      }
                    }}
                  />
                  <span>
                    <small>{service.code}</small>
                    <strong>{name}</strong>
                    <em>{categoryName(service, locale)}</em>
                  </span>
                </label>
                <p>{description(service.revision.description, locale)}</p>
                <dl className="pricing-card-meta">
                  <div>
                    <dt>{t.monthlyRate}</dt>
                    <dd>{money(service.revision.sellingHourlyRateSar, locale)}</dd>
                  </div>
                  <div>
                    <dt>{t.setupPct}</dt>
                    <dd>{number(service.revision.setupFeePct, locale)}%</dd>
                  </div>
                  <div>
                    <dt>{t.availablePackages}</dt>
                    <dd>{number(service.revision.levels.length, locale)}</dd>
                  </div>
                </dl>
                {!defaultLevel ? <p className="pricing-service-warning">{t.noPackages}</p> : null}
                {selected ? (
                  <div className="pricing-selection-fields">
                    <label>
                      {t.package}
                      <select
                        aria-label={`${name} ${t.package}`}
                        disabled={disabled}
                        value={selected.levelId}
                        onChange={(event) =>
                          onMonthlyChange(service.revision.id, { levelId: event.target.value })
                        }
                      >
                        {service.revision.levels.map((level) => (
                          <option key={level.id} value={level.id}>
                            {locale === "ar"
                              ? level.labelAr || level.labelEn || level.code
                              : level.labelEn || level.labelAr || level.code}{" "}
                            - {number(level.hours, locale)} {locale === "ar" ? "ساعة" : "hours"}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {t.packageQuantity}
                      <input
                        aria-label={`${name} ${t.packageQuantity}`}
                        disabled={disabled}
                        min="1"
                        step="1"
                        type="number"
                        value={selected.quantity}
                        onChange={(event) =>
                          onMonthlyChange(service.revision.id, {
                            quantity: Math.max(1, Math.floor(Number(event.target.value) || 1)),
                          })
                        }
                      />
                    </label>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="pricing-service-grid" role="tabpanel">
          {visibleOneTime.map((service) => {
            const quantity = oneTimeSelections.get(service.revision.id);
            const selected = quantity !== undefined;
            const name = oneTimeName(service, locale);
            return (
              <article
                className={selected ? "pricing-service-card selected" : "pricing-service-card"}
                key={service.id}
              >
                <label className="pricing-select-heading">
                  <input
                    aria-label={t.selectService(name)}
                    checked={selected}
                    disabled={disabled}
                    type="checkbox"
                    onChange={(event) => onOneTimeToggle(service.revision.id, event.target.checked)}
                  />
                  <span>
                    <small>{service.code}</small>
                    <strong>{name}</strong>
                    <em>{categoryName(service, locale)}</em>
                  </span>
                </label>
                <p>{description(service.revision.description, locale)}</p>
                <dl className="pricing-card-meta">
                  <div>
                    <dt>{t.subtotalBase}</dt>
                    <dd>{money(service.revision.basePriceSar, locale)}</dd>
                  </div>
                  <div>
                    <dt>{t.duration}</dt>
                    <dd>
                      {number(service.revision.durationDays, locale)} {t.days}
                    </dd>
                  </div>
                </dl>
                {selected ? (
                  <label className="pricing-quantity">
                    {t.quantity}
                    <input
                      aria-label={`${name} ${t.quantity}`}
                      disabled={disabled}
                      min="1"
                      step="1"
                      type="number"
                      value={quantity}
                      onChange={(event) =>
                        onOneTimeChange(
                          service.revision.id,
                          Math.max(1, Math.floor(Number(event.target.value) || 1)),
                        )
                      }
                    />
                  </label>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
