"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { completeQuoteOnboarding, quoteErrorMessage } from "../../lib/quote-client";
import type {
  QuoteOnboardingInput,
  QuoteOnboardingOptions,
  QuoteOnboardingResult,
} from "../../lib/quote-types";
import type { SupportedLocale } from "../../lib/i18n";
import { countText, lineTypeLabel } from "../commercial-i18n";

const copy = {
  ar: {
    title: "تفعيل خدمات العميل بعد الدفع",
    description:
      "أنشئ مستخدم البوابة وفعل خدمات العرض ثم اربط كل خدمة بالمختصين الذين تظهر لهم طلبات هذا العميل.",
    portalUser: "مستخدم بوابة العميل",
    createPortalUser: "إنشاء مستخدم بوابة جديد",
    existingPortalUsers: "مستخدمو البوابة الحاليون",
    noPortalUsers: "لا يوجد مستخدم بوابة لهذا العميل حتى الآن.",
    email: "البريد الإلكتروني",
    displayName: "الاسم الظاهر",
    language: "اللغة",
    defaultPassword:
      "سيتم استخدام كلمة المرور المؤقتة الافتراضية، وسيُطلب من المستخدم تغييرها عند أول دخول.",
    services: "الخدمات والإسناد",
    specialists: "المختصون",
    noSpecialists: "لا يوجد مختصون نشطون للاختيار.",
    noServices: "لا توجد خدمات قابلة للتفعيل في هذا العرض.",
    hours: "ساعة",
    cancel: "إغلاق",
    save: "تفعيل وحفظ الإسناد",
    saving: "جار التفعيل...",
    completed: "تم تفعيل خدمات العميل وحفظ الإسناد.",
    createdServices: "خدمات مفعلة جديدة",
    reusedServices: "خدمات كانت مفعلة مسبقًا",
    createdProjects: "مشاريع جديدة",
    reusedProjects: "مشاريع مفعلة مسبقًا",
    invalidEmail: "أدخل بريدًا إلكترونيًا صحيحًا لمستخدم البوابة.",
    displayNameRequired: "أدخل الاسم الظاهر لمستخدم البوابة.",
    eligibleSpecialists: "المختصون المؤهلون لهذه الخدمة",
    assignmentRequired: "اختر مختصًا واحدًا على الأقل لكل خدمة قبل التفعيل.",
  },
  en: {
    title: "Activate client services after payment",
    description:
      "Create the portal user, activate quote services, and assign each service to the specialists who should see this client work.",
    portalUser: "Client portal user",
    createPortalUser: "Create a new portal user",
    existingPortalUsers: "Existing portal users",
    noPortalUsers: "This client does not have a portal user yet.",
    email: "Email",
    displayName: "Display name",
    language: "Language",
    defaultPassword:
      "The default temporary password will be assigned, and the user must change it at first login.",
    services: "Services and assignments",
    specialists: "Specialists",
    noSpecialists: "No active specialists are available.",
    noServices: "This quote has no services that can be activated.",
    hours: "hours",
    cancel: "Close",
    save: "Activate and save assignments",
    saving: "Activating...",
    completed: "Client services and assignments were activated.",
    createdServices: "Newly activated services",
    reusedServices: "Already active services",
    createdProjects: "New projects",
    reusedProjects: "Existing projects",
    invalidEmail: "Enter a valid email address for the portal user.",
    displayNameRequired: "Enter the portal user's display name.",
    eligibleSpecialists: "Specialists eligible for this service",
    assignmentRequired: "Select at least one eligible specialist for every service.",
  },
} as const;

function serviceName(
  service: QuoteOnboardingOptions["services"][number],
  locale: SupportedLocale,
): string {
  return locale === "ar" ? service.nameAr || service.nameEn : service.nameEn || service.nameAr;
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
              <span>
                {countText(options.services.length, locale)} {lineTypeLabel("MONTHLY", locale)}
              </span>
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
                        {service.serviceLevelLabel ? ` · ${service.serviceLevelLabel}` : ""}
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
