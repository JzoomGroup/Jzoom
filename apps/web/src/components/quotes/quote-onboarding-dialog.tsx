"use client";

import { quoteOnboardingDialogCopy as copy } from "../../i18n/dictionaries/commercial";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { completeQuoteOnboarding, quoteErrorMessage } from "../../lib/quote-client";
import type {
  QuoteOnboardingInput,
  QuoteOnboardingOptions,
  QuoteOnboardingResult,
} from "../../lib/quote-types";
import type { SupportedLocale } from "../../lib/i18n";
import { countText, lineTypeLabel } from "../commercial-i18n";

function serviceName(
  service: QuoteOnboardingOptions["services"][number],
  locale: SupportedLocale,
): string {
  return locale === "ar" ? service.nameAr || service.nameEn : service.nameEn || service.nameAr;
}

function serviceLevelName(
  service: QuoteOnboardingOptions["services"][number],
  locale: SupportedLocale,
): string | null {
  if (locale === "ar") {
    return service.serviceLevelLabelAr || service.serviceLevelLabel;
  }
  return service.serviceLevelLabelEn || service.serviceLevelLabel;
}

function initialAssignments(options: QuoteOnboardingOptions): Record<string, string[]> {
  return Object.fromEntries(
    options.services.map((service) => [service.quoteItemId, service.existingSpecialistIds]),
  );
}

export function QuoteOnboardingDialog({
  locale,
  onClose,
  onCompleted,
  options,
}: {
  locale: SupportedLocale;
  onClose: () => void;
  onCompleted?: (result: QuoteOnboardingResult) => void;
  options: QuoteOnboardingOptions;
}) {
  const t = copy[locale];
  const [createPortalUser, setCreatePortalUser] = useState(options.portalUsers.length === 0);
  const [portalEmail, setPortalEmail] = useState(options.client.defaultPortalEmail);
  const [portalDisplayName, setPortalDisplayName] = useState(
    options.client.legalName ?? options.client.name,
  );
  const [preferredLocale, setPreferredLocale] = useState<"ar" | "en">("ar");
  const [assignments, setAssignments] = useState<Record<string, string[]>>(() =>
    initialAssignments(options),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuoteOnboardingResult | null>(null);

  useEffect(() => {
    setPortalEmail(options.client.defaultPortalEmail);
    setPortalDisplayName(options.client.legalName ?? options.client.name);
    setAssignments(initialAssignments(options));
  }, [options]);

  const assignmentPayload = useMemo(
    () =>
      options.services.map((service) => ({
        quoteItemId: service.quoteItemId,
        specialistIds: assignments[service.quoteItemId] ?? [],
      })),
    [assignments, options.services],
  );
  const monthlyCount = options.services.filter((service) => service.lineType === "MONTHLY").length;
  const oneTimeCount = options.services.length - monthlyCount;

  function toggleSpecialist(quoteItemId: string, specialistId: string) {
    setAssignments((current) => {
      const selected = new Set(current[quoteItemId] ?? []);
      if (selected.has(specialistId)) {
        selected.delete(specialistId);
      } else {
        selected.add(specialistId);
      }
      return { ...current, [quoteItemId]: [...selected] };
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);
    if (createPortalUser) {
      const normalizedEmail = portalEmail.trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
        setError(t.invalidEmail);
        return;
      }
      if (!portalDisplayName.trim()) {
        setError(t.displayNameRequired);
        return;
      }
    }
    if (assignmentPayload.some((assignment) => assignment.specialistIds.length === 0)) {
      setError(t.assignmentRequired);
      return;
    }
    setSaving(true);
    const payload: QuoteOnboardingInput = {
      serviceAssignments: assignmentPayload,
    };
    if (createPortalUser) {
      payload.portalUser = {
        email: portalEmail.trim().toLowerCase(),
        displayName: portalDisplayName.trim(),
        preferredLocale,
      };
    }

    try {
      const completed = await completeQuoteOnboarding(options.quote.id, payload);
      setResult(completed);
      onCompleted?.(completed);
    } catch (caught) {
      setError(quoteErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="quote-onboarding-backdrop">
      <section
        aria-labelledby="quote-onboarding-title"
        aria-modal="true"
        className="quote-onboarding-dialog"
        role="dialog"
      >
        <header className="quote-onboarding-header">
          <div>
            <p className="eyebrow">{options.quote.quoteNumber}</p>
            <h2 id="quote-onboarding-title">{t.title}</h2>
            <p>{t.description}</p>
          </div>
          <button className="os-button os-button-secondary" type="button" onClick={onClose}>
            {t.cancel}
          </button>
        </header>

        <form className="quote-onboarding-form" noValidate onSubmit={submit}>
          <section className="quote-onboarding-panel">
            <div className="quote-onboarding-panel-heading">
              <h3>{t.portalUser}</h3>
              <label className="quote-onboarding-toggle">
                <input
                  checked={createPortalUser}
                  type="checkbox"
                  onChange={(event) => setCreatePortalUser(event.target.checked)}
                />
                {t.createPortalUser}
              </label>
            </div>
            {options.portalUsers.length > 0 ? (
              <div className="quote-onboarding-existing-users">
                <strong>{t.existingPortalUsers}</strong>
                {options.portalUsers.map((user) => (
                  <span key={user.id}>
                    {user.displayName} · {user.email}
                  </span>
                ))}
              </div>
            ) : (
              <p className="pricing-muted">{t.noPortalUsers}</p>
            )}
            <div className="quote-onboarding-user-grid">
              <label>
                {t.email}
                <input
                  autoComplete="email"
                  disabled={!createPortalUser}
                  name="portalEmail"
                  type="email"
                  value={portalEmail}
                  onChange={(event) => setPortalEmail(event.target.value)}
                />
              </label>
              <label>
                {t.displayName}
                <input
                  autoComplete="name"
                  disabled={!createPortalUser}
                  name="portalDisplayName"
                  value={portalDisplayName}
                  onChange={(event) => setPortalDisplayName(event.target.value)}
                />
              </label>
              <label>
                {t.language}
                <select
                  disabled={!createPortalUser}
                  value={preferredLocale}
                  onChange={(event) => setPreferredLocale(event.target.value as "ar" | "en")}
                >
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                </select>
              </label>
            </div>
            <p className="quote-onboarding-note">{t.defaultPassword}</p>
          </section>

          <section className="quote-onboarding-panel">
            <div className="quote-onboarding-panel-heading">
              <h3>{t.services}</h3>
              <div className="quote-onboarding-counts">
                <span>
                  {countText(monthlyCount, locale)} {lineTypeLabel("MONTHLY", locale)}
                </span>
                <span>
                  {countText(oneTimeCount, locale)} {lineTypeLabel("ONE_TIME", locale)}
                </span>
              </div>
            </div>
            {options.services.length === 0 ? (
              <p className="pricing-muted">{t.noServices}</p>
            ) : (
              <div className="quote-onboarding-services">
                {options.services.map((service) => (
                  <article className="quote-onboarding-service" key={service.quoteItemId}>
                    <div>
                      <strong>{serviceName(service, locale)}</strong>
                      <small>
                        {lineTypeLabel(service.lineType, locale)} · {service.serviceCode}
                        {serviceLevelName(service, locale)
                          ? ` · ${serviceLevelName(service, locale)}`
                          : ""}
                        {service.hoursAllocated !== null
                          ? ` · ${countText(service.hoursAllocated, locale)} ${t.hours}`
                          : ""}
                      </small>
                    </div>
                    <div
                      className="quote-onboarding-specialists"
                      aria-label={t.eligibleSpecialists}
                    >
                      {(service.eligibleSpecialistIds ?? []).length === 0 ? (
                        <span>{t.noSpecialists}</span>
                      ) : (
                        options.specialists
                          .filter((specialist) =>
                            (service.eligibleSpecialistIds ?? []).includes(specialist.id),
                          )
                          .map((specialist) => (
                            <label key={specialist.id}>
                              <input
                                checked={
                                  assignments[service.quoteItemId]?.includes(specialist.id) ?? false
                                }
                                type="checkbox"
                                onChange={() =>
                                  toggleSpecialist(service.quoteItemId, specialist.id)
                                }
                              />
                              {specialist.displayName}
                            </label>
                          ))
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {error ? <p className="quote-action-feedback error">{error}</p> : null}
          {result ? (
            <p className="quote-action-feedback success">
              {t.completed} {t.createdServices}:{" "}
              {countText(result.subscription.createdServiceIds.length, locale)} · {t.reusedServices}
              : {countText(result.subscription.reusedServiceIds.length, locale)} ·{" "}
              {t.toppedUpServices}:{" "}
              {countText(result.subscription.toppedUpServiceIds.length, locale)}
              {" · "}
              {t.replacedServices}:{" "}
              {countText(result.subscription.replacedServiceIds.length, locale)}
              {" · "}
              {t.createdProjects}: {countText(result.projects.createdProjectIds.length, locale)} ·{" "}
              {t.reusedProjects}: {countText(result.projects.reusedProjectIds.length, locale)}
            </p>
          ) : null}

          <div className="form-actions">
            <button className="os-button os-button-secondary" type="button" onClick={onClose}>
              {t.cancel}
            </button>
            <button className="os-button os-button-primary" disabled={saving} type="submit">
              {saving ? t.saving : t.save}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
