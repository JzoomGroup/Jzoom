"use client";

import { pricingStudioCopy as copy, pricingCopy } from "../../i18n/dictionaries/catalog";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import {
  pricingErrorMessage,
  pricingRequest,
  refreshPricingDrafts,
} from "../../lib/pricing-client";
import { createQuote, quoteErrorMessage } from "../../lib/quote-client";
import { normalizeLocale, type SupportedLocale } from "../../lib/i18n";
import type {
  MonthlyPricingSelection,
  OneTimePricingSelection,
  PricingCalculation,
  PricingClient,
  PricingClientCreateInput,
  PricingDraft,
  PricingDraftSummary,
  PricingInput,
  PricingStudioCatalog,
} from "../../lib/pricing-types";
import { LogoutButton } from "../logout-button";
import { EmptyState, PageHeader, SmartTable, StatusChip } from "../premium-os";

interface MonthlySelectionState {
  levelId: string;
  quantity: number;
}

function pricingDateInput(value?: string): string {
  return (value ? new Date(value) : new Date()).toISOString().slice(0, 10);
}

function pricingDateIso(value: string): string {
  return new Date(`${value}T12:00:00.000Z`).toISOString();
}

function sar(value: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 2,
  }).format(value);
}

function number(value: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formText(form: FormData, key: string): string | undefined {
  const value = String(form.get(key) ?? "").trim();
  return value ? value : undefined;
}

function formNumber(form: FormData, key: string): number | undefined {
  const value = formText(form, key);
  return value ? Number(value) : undefined;
}

function suggestedClientCode(name: string): string {
  const ascii = name
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/_+/g, "-")
    .toUpperCase();
  return ascii ? ascii.slice(0, 24) : `CLIENT-${new Date().getTime().toString().slice(-6)}`;
}

function createClientPayload(form: FormData): PricingClientCreateInput {
  const name = formText(form, "name") ?? "";
  const billingContact = formText(form, "billingContact");
  const branchesCount = formNumber(form, "branchesCount");
  const city = formText(form, "city");
  const commercialRegistration = formText(form, "commercialRegistration");
  const employeesCount = formNumber(form, "employeesCount");
  const legalName = formText(form, "legalName");
  return {
    authorizedApprover: formText(form, "authorizedApprover") ?? "",
    code: (formText(form, "code") || suggestedClientCode(name)).toUpperCase(),
    name,
    sector: formText(form, "sector") ?? "",
    status: "ACTIVE",
    ...(billingContact ? { billingContact } : {}),
    ...(branchesCount !== undefined ? { branchesCount } : {}),
    ...(city ? { city } : {}),
    ...(commercialRegistration ? { commercialRegistration } : {}),
    ...(employeesCount !== undefined ? { employeesCount } : {}),
    ...(legalName ? { legalName } : {}),
  };
}

function serviceLineLabel(value: string, locale: SupportedLocale): string {
  if (locale === "en") return value;
  if (value === "Build") return "بناء";
  if (value === "Digital") return "رقمي";
  return /[\u0600-\u06ff]/.test(value) ? value : "مسار خدمة";
}

function categoryLabel(value: string, locale: SupportedLocale): string {
  if (locale === "en" || /[\u0600-\u06ff]/.test(value)) return value;
  const labels: Record<string, string> = {
    Build: "بناء",
    Consulting: "استشارات",
    Digital: "رقمي",
    Finance: "مالية",
    HR: "موارد بشرية",
    Legal: "قانونية",
    Marketing: "تسويق",
    Operations: "تشغيل",
    Strategy: "استراتيجية",
  };
  return labels[value] ?? "تصنيف خدمة";
}

function levelLabel(value: string | null | undefined, locale: SupportedLocale): string {
  if (!value || locale === "en" || /[\u0600-\u06ff]/.test(value)) return value ?? "";
  const labels: Record<string, string> = {
    Basic: "أساسي",
    Enterprise: "مؤسسي",
    Growth: "نمو",
    Premium: "مميز",
    Scale: "توسع",
    Standard: "قياسي",
    Starter: "بداية",
  };
  return labels[value] ?? "مستوى خدمة";
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

function serviceDescription(name: string, description: string, locale: SupportedLocale): string {
  if (locale === "en") return description;
  return /[\u0600-\u06ff]/.test(description)
    ? description
    : `خدمة ${name} ضمن كتالوج التسعير، يتم احتسابها من الخلفية حسب الإعدادات الحالية.`;
}

function lineName(line: PricingCalculation["lines"][number], locale: SupportedLocale): string {
  return locale === "ar" ? line.nameAr || "خدمة غير مترجمة" : line.nameEn || line.nameAr;
}

function draftStatusLabel(status: string, locale: SupportedLocale): string {
  if (locale === "en") return status;
  const labels: Record<string, string> = {
    ARCHIVED: "مؤرشفة",
    DRAFT: "مسودة",
  };
  return labels[status] ?? status;
}

function initialMonthlySelections(draft?: PricingDraft | null): Map<string, MonthlySelectionState> {
  return new Map(
    (draft?.monthlySelections ?? []).map((selection) => [
      selection.monthlyServiceRevisionId,
      { levelId: selection.serviceLevelId, quantity: selection.quantity },
    ]),
  );
}

function initialOneTimeSelections(draft?: PricingDraft | null): Map<string, number> {
  return new Map(
    (draft?.oneTimeSelections ?? []).map((selection) => [
      selection.oneTimeServiceRevisionId,
      selection.quantity,
    ]),
  );
}

export function PricingStudio({
  displayName,
  embedded = false,
  isAdmin,
  initialCatalog,
  initialDrafts,
  initialDraft,
  locale: localeInput = "en",
  openClientCreator = false,
}: {
  displayName: string;
  embedded?: boolean;
  isAdmin: boolean;
  initialCatalog: PricingStudioCatalog;
  initialDrafts: PricingDraftSummary[];
  initialDraft?: PricingDraft | null;
  locale?: string;
  openClientCreator?: boolean;
}) {
  const router = useRouter();
  const locale = normalizeLocale(localeInput);
  const t = pricingCopy[locale];
  const [catalog, setCatalog] = useState(initialCatalog);
  const [drafts, setDrafts] = useState(initialDrafts);
  const [currentDraft, setCurrentDraft] = useState(initialDraft ?? null);
  const [clientId, setClientId] = useState(
    initialDraft?.clientId ?? initialCatalog.clients[0]?.id ?? "",
  );
  const [title, setTitle] = useState(
    initialDraft?.title ?? (locale === "ar" ? "مسودة تسعير" : "Pricing draft"),
  );
  const [notes, setNotes] = useState(initialDraft?.notes ?? "");
  const [pricingDate, setPricingDate] = useState(pricingDateInput(initialDraft?.pricingDate));
  const [monthlySelections, setMonthlySelections] = useState(
    initialMonthlySelections(initialDraft),
  );
  const [oneTimeSelections, setOneTimeSelections] = useState(
    initialOneTimeSelections(initialDraft),
  );
  const [calculation, setCalculation] = useState<PricingCalculation | null>(
    initialDraft?.calculation ?? null,
  );
  const [submitting, setSubmitting] = useState<"preview" | "save" | "archive" | null>(null);
  const [clientSubmitting, setClientSubmitting] = useState(false);
  const [showClientCreator, setShowClientCreator] = useState(openClientCreator && isAdmin);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();

  const selectedClient = catalog.clients.find((client) => client.id === clientId);
  const selectedCount = monthlySelections.size + oneTimeSelections.size;
  const isArchived = currentDraft?.status === "ARCHIVED";
  const canCalculate = Boolean(clientId && title.trim() && selectedCount > 0 && !isArchived);
  const selectedMonthlyServices = catalog.monthlyServices.filter((service) =>
    monthlySelections.has(service.revision.id),
  );
  const selectedOneTimeServices = catalog.oneTimeServices.filter((service) =>
    oneTimeSelections.has(service.revision.id),
  );
  const quoteReady = Boolean(currentDraft && calculation && !isArchived);
  const quoteReadiness = quoteReady
    ? t.quoteReady
    : currentDraft
      ? t.quoteNeedsPreview
      : t.quoteNeedsDraft;

  const input = useMemo<PricingInput>(
    () => ({
      clientId,
      title: title.trim(),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      pricingDate: pricingDateIso(pricingDate),
      currency: "SAR",
      monthlySelections: [...monthlySelections.entries()].map(
        ([monthlyServiceRevisionId, selection]): MonthlyPricingSelection => ({
          monthlyServiceRevisionId,
          serviceLevelId: selection.levelId,
          quantity: selection.quantity,
        }),
      ),
      oneTimeSelections: [...oneTimeSelections.entries()].map(
        ([oneTimeServiceRevisionId, quantity]): OneTimePricingSelection => ({
          oneTimeServiceRevisionId,
          quantity,
        }),
      ),
    }),
    [clientId, monthlySelections, notes, oneTimeSelections, pricingDate, title],
  );

  function clearFeedback() {
    setError(undefined);
    setSuccess(undefined);
  }

  async function createClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearFeedback();
    const form = new FormData(event.currentTarget);
    const requiredKeys = ["code", "name", "sector", "authorizedApprover"];
    if (requiredKeys.some((key) => !formText(form, key))) {
      setError(t.clientRequiredFields);
      return;
    }
    setClientSubmitting(true);
    try {
      const created = await pricingRequest<PricingClient>("admin/clients", {
        method: "POST",
        body: JSON.stringify(createClientPayload(form)),
      });
      setCatalog((current) => ({
        ...current,
        clients: [...current.clients.filter((client) => client.id !== created.id), created].sort(
          (first, second) => first.name.localeCompare(second.name),
        ),
      }));
      setClientId(created.id);
      setCalculation(null);
      setShowClientCreator(false);
      setSuccess(t.clientCreated);
    } catch (clientError) {
      setError(pricingErrorMessage(clientError));
    } finally {
      setClientSubmitting(false);
    }
  }

  function toggleMonthly(revisionId: string, defaultLevelId: string, checked: boolean) {
    clearFeedback();
    setCalculation(null);
    setMonthlySelections((current) => {
      const next = new Map(current);
      if (checked) {
        next.set(revisionId, { levelId: defaultLevelId, quantity: 1 });
      } else {
        next.delete(revisionId);
      }
      return next;
    });
  }

  function updateMonthly(revisionId: string, update: Partial<MonthlySelectionState>) {
    clearFeedback();
    setCalculation(null);
    setMonthlySelections((current) => {
      const next = new Map(current);
      const existing = next.get(revisionId);
      if (existing) {
        next.set(revisionId, { ...existing, ...update });
      }
      return next;
    });
  }

  function toggleOneTime(revisionId: string, checked: boolean) {
    clearFeedback();
    setCalculation(null);
    setOneTimeSelections((current) => {
      const next = new Map(current);
      if (checked) {
        next.set(revisionId, 1);
      } else {
        next.delete(revisionId);
      }
      return next;
    });
  }

  async function preview() {
    clearFeedback();
    setSubmitting("preview");
    try {
      const result = await pricingRequest<{ calculation: PricingCalculation }>("pricing/preview", {
        method: "POST",
        body: JSON.stringify(input),
      });
      setCalculation(result.calculation);
      setSuccess(t.previewSuccess);
    } catch (previewError) {
      setError(pricingErrorMessage(previewError));
    } finally {
      setSubmitting(null);
    }
  }

  async function save() {
    clearFeedback();
    setSubmitting("save");
    try {
      const saved = await pricingRequest<PricingDraft>(
        currentDraft ? `pricing/drafts/${currentDraft.id}` : "pricing/drafts",
        {
          method: currentDraft ? "PUT" : "POST",
          body: JSON.stringify(input),
        },
      );
      setCurrentDraft(saved);
      setCalculation(saved.calculation);
      setDrafts(await refreshPricingDrafts());
      setSuccess(currentDraft ? t.pricingDraftUpdated : t.pricingDraftSaved);
      router.replace(`/pricing/${saved.id}`);
    } catch (saveError) {
      setError(pricingErrorMessage(saveError));
    } finally {
      setSubmitting(null);
    }
  }

  async function archive() {
    if (!currentDraft || !window.confirm(t.archiveConfirm)) {
      return;
    }
    const reason = window.prompt(t.archivePrompt);
    if (!reason?.trim()) {
      return;
    }
    clearFeedback();
    setSubmitting("archive");
    try {
      const archived = await pricingRequest<PricingDraft>(
        `pricing/drafts/${currentDraft.id}/archive`,
        {
          method: "POST",
          body: JSON.stringify({ reason: reason.trim() }),
        },
      );
      setCurrentDraft(archived);
      setDrafts(await refreshPricingDrafts());
      setSuccess(t.archiveSuccess);
    } catch (archiveError) {
      setError(pricingErrorMessage(archiveError));
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className={embedded ? "pricing-shell pricing-shell-embedded" : "pricing-shell"}>
      {!embedded && (
        <header className="pricing-topbar">
          <Link className="admin-brand" href="/pricing">
            <span className="brand-mark" aria-hidden="true">
              J
            </span>
            <span>
              <strong>Jzoom</strong>
              <small>{t.pricingStudio}</small>
            </span>
          </Link>
          <nav aria-label={t.pricingAccount}>
            {isAdmin && <Link href="/admin/pricing-rules">{t.pricingRules}</Link>}
            <Link href="/pricing/quotes">{t.quotes}</Link>
            <Link href="/profile">{t.profile}</Link>
            <span>{displayName}</span>
            <LogoutButton />
          </nav>
        </header>
      )}

      <div className="pricing-layout">
        <aside className="pricing-drafts">
          <div className="pricing-aside-heading">
            <div>
              <p className="eyebrow">{t.savedWork}</p>
              <h2>{t.pricingDrafts}</h2>
            </div>
            <Link className="os-button os-button-primary" href="/pricing">
              {t.newDraft}
            </Link>
          </div>
          {drafts.length === 0 ? (
            <p className="pricing-muted">{t.noDrafts}</p>
          ) : (
            <div className="pricing-draft-list">
              {drafts.map((draft) => (
                <Link
                  key={draft.id}
                  href={`/pricing/${draft.id}`}
                  className={currentDraft?.id === draft.id ? "active" : undefined}
                >
                  <div className="pricing-draft-list-top">
                    <strong>{draft.title}</strong>
                    <StatusChip
                      status={draft.status}
                      label={draftStatusLabel(draft.status, locale)}
                    />
                  </div>
                  <span>{draft.client.name}</span>
                  <small>
                    {draft.draftNumber} - {number(draft.itemCount, locale)} {t.items}
                  </small>
                  <small>
                    {t.draftValue}: {draft.totals ? sar(draft.totals.finalTotal, locale) : "-"}
                  </small>
                </Link>
              ))}
            </div>
          )}
        </aside>

        <main className="pricing-main">
          <PageHeader
            eyebrow={t.pricingStudioFoundation}
            title={currentDraft ? currentDraft.title : t.newPricingDraft}
            description={t.pricingStudioDescription}
          >
            {currentDraft && (
              <div className="pricing-draft-identity">
                <strong>{currentDraft.draftNumber}</strong>
                <span>{t.calculationVersion(currentDraft.calculationVersion)}</span>
              </div>
            )}
          </PageHeader>

          {(error || success) && (
            <p
              className={error ? "catalog-feedback error" : "catalog-feedback success"}
              role="status"
            >
              {error ?? success}
            </p>
          )}
          {isArchived && <p className="catalog-feedback error">{t.archivedWarning}</p>}

          <section className="pricing-journey" aria-label={t.commercialJourney}>
            <div className="pricing-journey-main">
              <div>
                <p className="eyebrow">{t.commercialJourney}</p>
                <h2>{t.serviceSelectionSummary}</h2>
                <p>{t.commercialJourneyDescription}</p>
              </div>
              <ol className="pricing-journey-steps">
                <li className={clientId ? "active" : undefined}>
                  <span>01</span>
                  <strong>{t.clientSetup}</strong>
                  <small>{t.journeyClientDetail}</small>
                </li>
                <li className={selectedCount > 0 ? "active" : undefined}>
                  <span>02</span>
                  <strong>{t.selectedServices}</strong>
                  <small>{t.journeyServicesDetail}</small>
                </li>
                <li className={calculation ? "active" : undefined}>
                  <span>03</span>
                  <strong>{t.backendPreview}</strong>
                  <small>{t.journeyPreviewDetail}</small>
                </li>
                <li className={quoteReady ? "active" : undefined}>
                  <span>04</span>
                  <strong>{t.createQuote}</strong>
                  <small>{t.journeyQuoteDetail}</small>
                </li>
              </ol>
            </div>
            <aside className="pricing-journey-summary">
              <div>
                <span>{t.quoteReadiness}</span>
                <strong>{quoteReadiness}</strong>
              </div>
              <div>
                <span>{t.selectedMonthly}</span>
                <strong>{number(selectedMonthlyServices.length, locale)}</strong>
                <small>
                  {selectedMonthlyServices
                    .map((service) => monthlyName(service, locale))
                    .join(", ") || t.selected(0)}
                </small>
              </div>
              <div>
                <span>{t.selectedOneTime}</span>
                <strong>{number(selectedOneTimeServices.length, locale)}</strong>
                <small>
                  {selectedOneTimeServices
                    .map((service) => oneTimeName(service, locale))
                    .join(", ") || t.selected(0)}
                </small>
              </div>
            </aside>
          </section>

          <section className="catalog-panel">
            <div className="panel-heading">
              <div>
                <h2>{t.clientSetup}</h2>
                <p>{t.clientSetupDescription}</p>
              </div>
              {isAdmin && !isArchived ? (
                <button
                  className="os-button os-button-secondary"
                  type="button"
                  onClick={() => {
                    clearFeedback();
                    setShowClientCreator((visible) => !visible);
                  }}
                >
                  {showClientCreator ? t.cancelClientCreate : t.newClient}
                </button>
              ) : null}
            </div>
            {showClientCreator && isAdmin ? (
              <form
                className="catalog-form wide-form pricing-client-create-form"
                noValidate
                onSubmit={createClient}
              >
                <div className="form-span">
                  <strong>{t.createClientInPricing}</strong>
                  <p className="pricing-muted">{t.createClientInPricingDescription}</p>
                </div>
                <label>
                  {t.clientCode}
                  <input name="code" placeholder="CLIENT-001" />
                </label>
                <label>
                  {t.clientName}
                  <input name="name" />
                </label>
                <label>
                  {t.legalName}
                  <input name="legalName" />
                </label>
                <label>
                  {t.commercialRegistration}
                  <input name="commercialRegistration" />
                </label>
                <label>
                  {t.sector}
                  <input name="sector" />
                </label>
                <label>
                  {t.city}
                  <input name="city" />
                </label>
                <label>
                  {t.approver}
                  <input name="authorizedApprover" />
                </label>
                <label>
                  {t.billingContact}
                  <input name="billingContact" />
                </label>
                <label>
                  {t.employees}
                  <input min="0" name="employeesCount" type="number" />
                </label>
                <label>
                  {t.branches}
                  <input min="0" name="branchesCount" type="number" />
                </label>
                {error ? (
                  <p className="quote-action-feedback error form-span" role="alert">
                    {error}
                  </p>
                ) : null}
                <div className="form-actions form-span">
                  <button
                    className="os-button os-button-secondary"
                    disabled={clientSubmitting}
                    type="button"
                    onClick={() => setShowClientCreator(false)}
                  >
                    {t.cancel}
                  </button>
                  <button
                    className="os-button os-button-primary"
                    disabled={clientSubmitting}
                    type="submit"
                  >
                    {clientSubmitting ? t.savingClient : t.createClient}
                  </button>
                </div>
              </form>
            ) : null}
            <div className="catalog-form wide-form">
              <label>
                {t.client}
                <select
                  aria-label={t.client}
                  value={clientId}
                  disabled={isArchived}
                  onChange={(event) => {
                    setClientId(event.target.value);
                    setCalculation(null);
                  }}
                >
                  {catalog.clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} ({client.code})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t.draftTitle}
                <input
                  aria-label={t.draftTitle}
                  value={title}
                  disabled={isArchived}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>
              <label>
                {t.pricingDate}
                <input
                  aria-label={t.pricingDate}
                  type="date"
                  value={pricingDate}
                  disabled={isArchived}
                  onChange={(event) => {
                    setPricingDate(event.target.value);
                    setCalculation(null);
                  }}
                />
              </label>
              <label className="form-span">
                {t.internalNotes}
                <textarea
                  aria-label={t.internalNotes}
                  value={notes}
                  disabled={isArchived}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </label>
            </div>
            {selectedClient && (
              <dl className="entity-meta four-up">
                <div>
                  <dt>{t.sector}</dt>
                  <dd>{selectedClient.sector}</dd>
                </div>
                <div>
                  <dt>{t.city}</dt>
                  <dd>{selectedClient.city ?? "-"}</dd>
                </div>
                <div>
                  <dt>{t.legalName}</dt>
                  <dd>{selectedClient.legalName ?? selectedClient.name}</dd>
                </div>
                <div>
                  <dt>{t.approver}</dt>
                  <dd>{selectedClient.authorizedApprover}</dd>
                </div>
              </dl>
            )}
          </section>

          <section className="catalog-panel">
            <div className="panel-heading">
              <div>
                <h2>{t.monthlyServices}</h2>
                <p>{t.monthlyServicesDescription}</p>
              </div>
              <span>{t.selected(monthlySelections.size)}</span>
            </div>
            <div className="pricing-service-grid">
              {catalog.monthlyServices.map((service) => {
                const selected = monthlySelections.get(service.revision.id);
                const name = monthlyName(service, locale);
                return (
                  <article
                    className={selected ? "pricing-service-card selected" : "pricing-service-card"}
                    key={service.id}
                  >
                    <label className="pricing-select-heading">
                      <input
                        type="checkbox"
                        aria-label={t.selectService(name)}
                        checked={Boolean(selected)}
                        disabled={isArchived}
                        onChange={(event) =>
                          toggleMonthly(
                            service.revision.id,
                            service.revision.levels[0]!.id,
                            event.target.checked,
                          )
                        }
                      />
                      <span>
                        <small>{service.code}</small>
                        <strong>{name}</strong>
                        <em>{categoryLabel(service.categoryName, locale)}</em>
                      </span>
                    </label>
                    <p>{serviceDescription(name, service.revision.description, locale)}</p>
                    <dl className="pricing-card-meta">
                      <div>
                        <dt>{t.monthlyRate}</dt>
                        <dd>{sar(service.revision.sellingHourlyRateSar, locale)}</dd>
                      </div>
                      <div>
                        <dt>{t.setupPct}</dt>
                        <dd>{number(service.revision.setupFeePct, locale)}%</dd>
                      </div>
                      <div>
                        <dt>{t.package}</dt>
                        <dd>{number(service.revision.levels.length, locale)}</dd>
                      </div>
                    </dl>
                    {selected && (
                      <div className="pricing-selection-fields">
                        <label>
                          {t.package}
                          <select
                            aria-label={`${name} ${t.package}`}
                            value={selected.levelId}
                            onChange={(event) =>
                              updateMonthly(service.revision.id, {
                                levelId: event.target.value,
                              })
                            }
                          >
                            {service.revision.levels.map((level) => (
                              <option key={level.id} value={level.id}>
                                {locale === "ar"
                                  ? level.labelAr || levelLabel(level.labelEn, locale)
                                  : (level.labelEn ?? level.labelAr)}{" "}
                                - {number(level.hours, locale)}
                                {locale === "ar" ? " س" : "h"}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          {t.quantity}
                          <input
                            aria-label={`${name} ${t.quantity}`}
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={selected.quantity}
                            onChange={(event) =>
                              updateMonthly(service.revision.id, {
                                quantity: Number(event.target.value),
                              })
                            }
                          />
                        </label>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          <section className="catalog-panel">
            <div className="panel-heading">
              <div>
                <h2>{t.oneTimeServices}</h2>
                <p>{t.oneTimeServicesDescription}</p>
              </div>
              <span>{t.selected(oneTimeSelections.size)}</span>
            </div>
            <div className="pricing-service-grid">
              {catalog.oneTimeServices.map((service) => {
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
                        type="checkbox"
                        aria-label={t.selectService(name)}
                        checked={selected}
                        disabled={isArchived}
                        onChange={(event) =>
                          toggleOneTime(service.revision.id, event.target.checked)
                        }
                      />
                      <span>
                        <small>{service.code}</small>
                        <strong>{name}</strong>
                        <em>{serviceLineLabel(service.serviceLine, locale)}</em>
                      </span>
                    </label>
                    <p>{serviceDescription(name, service.revision.description, locale)}</p>
                    <dl className="pricing-card-meta">
                      <div>
                        <dt>{t.subtotalBase}</dt>
                        <dd>{sar(service.revision.basePriceSar, locale)}</dd>
                      </div>
                      <div>
                        <dt>{t.duration}</dt>
                        <dd>
                          {number(service.revision.durationDays, locale)} {t.days}
                        </dd>
                      </div>
                    </dl>
                    {selected && (
                      <label className="pricing-quantity">
                        {t.quantity}
                        <input
                          aria-label={`${name} ${t.quantity}`}
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={quantity}
                          onChange={(event) => {
                            const next = new Map(oneTimeSelections);
                            next.set(service.revision.id, Number(event.target.value));
                            setOneTimeSelections(next);
                            setCalculation(null);
                          }}
                        />
                      </label>
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          <section className="catalog-panel pricing-review">
            <div className="panel-heading">
              <div>
                <h2>{t.backendPreview}</h2>
                <p>{t.previewDescription}</p>
              </div>
              <div className="row-actions">
                <button
                  className="os-button os-button-secondary"
                  type="button"
                  disabled={!canCalculate || submitting !== null}
                  onClick={() => void preview()}
                >
                  {submitting === "preview" ? t.calculating : t.recalculatePreview}
                </button>
                <button
                  className="os-button os-button-primary"
                  type="button"
                  disabled={!canCalculate || submitting !== null}
                  onClick={() => void save()}
                >
                  {submitting === "save"
                    ? t.saving
                    : currentDraft
                      ? t.saveDraftChanges
                      : t.savePricingDraft}
                </button>
                {currentDraft && !isArchived && (
                  <button
                    className="os-button os-button-danger"
                    type="button"
                    disabled={submitting !== null}
                    onClick={() => void archive()}
                  >
                    {t.archive}
                  </button>
                )}
                {currentDraft && calculation && !isArchived && (
                  <button
                    className="os-button os-button-secondary"
                    type="button"
                    disabled={submitting !== null}
                    onClick={() => setShowQuoteForm((visible) => !visible)}
                  >
                    {t.createQuote}
                  </button>
                )}
              </div>
            </div>
            {showQuoteForm && currentDraft && (
              <QuoteCreationForm
                pricingDraftId={currentDraft.id}
                disabled={submitting !== null}
                onCancel={() => setShowQuoteForm(false)}
                onError={setError}
                locale={locale}
              />
            )}
            {calculation ? (
              <>
                <div className="pricing-total-grid">
                  <div>
                    <span>{t.monthly}</span>
                    <strong>{sar(calculation.totals.subtotalMonthly, locale)}</strong>
                  </div>
                  <div>
                    <span>{t.setupFees}</span>
                    <strong>{sar(calculation.totals.subtotalSetup, locale)}</strong>
                  </div>
                  <div>
                    <span>{t.oneTime}</span>
                    <strong>{sar(calculation.totals.subtotalOneTime, locale)}</strong>
                  </div>
                  <div>
                    <span>{t.discounts}</span>
                    <strong>- {sar(calculation.totals.discountTotal, locale)}</strong>
                  </div>
                  <div>
                    <span>{t.tax}</span>
                    <strong>{sar(calculation.totals.taxTotal, locale)}</strong>
                  </div>
                  <div className="primary">
                    <span>{t.finalTotal}</span>
                    <strong>{sar(calculation.totals.finalTotal, locale)}</strong>
                  </div>
                  <div>
                    <span>{t.internalCost}</span>
                    <strong>{sar(calculation.totals.internalCost, locale)}</strong>
                  </div>
                  <div>
                    <span>{t.margin}</span>
                    <strong>{number(calculation.totals.marginPct, locale)}%</strong>
                  </div>
                </div>
                <p className="pricing-muted">
                  <strong>{t.pricingImpactTitle}: </strong>
                  {t.pricingImpactDescription}
                </p>
                <SmartTable>
                  <table className="catalog-table pricing-lines">
                    <thead>
                      <tr>
                        <th>{t.service}</th>
                        <th>{t.type}</th>
                        <th>{t.quantity}</th>
                        <th>{t.subtotalBase}</th>
                        <th>{t.setupFees}</th>
                        <th>{t.subtotalTotal}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculation.lines.map((line) => (
                        <tr key={`${line.lineType}-${line.serviceCode}-${line.sortOrder}`}>
                          <td>
                            <strong>{lineName(line, locale)}</strong>
                            <small>
                              {levelLabel(line.serviceLevelLabel, locale) || line.serviceCode}
                            </small>
                          </td>
                          <td>{line.lineType === "MONTHLY" ? t.monthly : t.oneTime}</td>
                          <td>{number(line.quantity, locale)}</td>
                          <td>{sar(line.baseAmount, locale)}</td>
                          <td>{sar(line.setupFee, locale)}</td>
                          <td>{sar(line.lineTotal, locale)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </SmartTable>
                {calculation.appliedRules.length > 0 && (
                  <p className="pricing-muted">
                    {t.appliedRules}:{" "}
                    {calculation.appliedRules
                      .map((rule) => `${rule.code} v${rule.version}`)
                      .join(", ")}
                  </p>
                )}
              </>
            ) : (
              <EmptyState title={t.noPreview}>{t.noPreviewDescription}</EmptyState>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

function QuoteCreationForm({
  pricingDraftId,
  disabled,
  onCancel,
  onError,
  locale: localeInput = "en",
}: {
  pricingDraftId: string;
  disabled: boolean;
  onCancel: () => void;
  onError: (message: string | undefined) => void;
  locale?: string;
}) {
  const router = useRouter();
  const locale = normalizeLocale(localeInput);
  const t = copy[locale];
  const [creating, setCreating] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onError(undefined);
    setCreating(true);
    try {
      const quote = await createQuote({
        pricingDraftId,
        validityDays: Number(form.get("validityDays") ?? 30),
        terms: {
          paymentTerms: String(form.get("paymentTerms") ?? "").trim(),
          ...(String(form.get("deliveryTerms") ?? "").trim()
            ? { deliveryTerms: String(form.get("deliveryTerms")).trim() }
            : {}),
          ...(String(form.get("additionalTerms") ?? "").trim()
            ? { additionalTerms: String(form.get("additionalTerms")).trim() }
            : {}),
          ...(String(form.get("clientNotes") ?? "").trim()
            ? { clientNotes: String(form.get("clientNotes")).trim() }
            : {}),
        },
      });
      router.push(`/pricing/quotes/${quote.id}`);
    } catch (error) {
      onError(quoteErrorMessage(error));
    } finally {
      setCreating(false);
    }
  }

  return (
    <form className="quote-create-form" noValidate onSubmit={submit}>
      <div>
        <h3>{t.createImmutableQuote}</h3>
        <p>{t.termsSnapshot}</p>
      </div>
      <label>
        {t.validityDays}
        <input name="validityDays" type="number" min="1" max="365" defaultValue="30" required />
      </label>
      <label>
        {t.paymentTerms}
        <input name="paymentTerms" defaultValue={t.paymentDefault} required />
      </label>
      <label>
        {t.deliveryTerms}
        <input name="deliveryTerms" />
      </label>
      <label className="form-span">
        {t.additionalTerms}
        <textarea name="additionalTerms" />
      </label>
      <label className="form-span">
        {t.clientNotes}
        <textarea name="clientNotes" />
      </label>
      <div className="form-actions">
        <button className="os-button os-button-secondary" type="button" onClick={onCancel}>
          {t.cancel}
        </button>
        <button
          className="os-button os-button-primary"
          type="submit"
          disabled={disabled || creating}
        >
          {creating ? t.creating : t.createQuoteSnapshot}
        </button>
      </div>
    </form>
  );
}
