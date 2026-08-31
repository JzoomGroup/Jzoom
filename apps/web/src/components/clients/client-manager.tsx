"use client";

import { clientManagerCopy as copy } from "../../i18n/dictionaries/administration";

import { useEffect, useState, type FormEvent } from "react";
import { clientsErrorMessage, clientsRequest, refreshClients } from "../../lib/clients-client";
import type { ClientStatus, ClientsSnapshot, ManagedClient } from "../../lib/clients-types";
import { normalizeLocale, type SupportedLocale } from "../../lib/i18n";
import { CatalogFeedback } from "../catalog/catalog-shared";
import { AppDialog } from "../app-dialog";
import {
  BentoGrid,
  EmptyState,
  MetricCard,
  PageHeader,
  SectionCard,
  StatusChip,
} from "../premium-os";

interface ClientPayload {
  authorizedApprover: string;
  billingContact: string | undefined;
  branchesCount: number | undefined;
  city: string | undefined;
  commercialRegistration: string | undefined;
  dataReadiness: string | undefined;
  employeesCount: number | undefined;
  legalName: string | undefined;
  name: string;
  operationalComplexity: string | undefined;
  sector: string;
  transactionVolume: string | undefined;
  urgency: string | undefined;
}

const statusLabels = {
  ACTIVE: { ar: "نشط", en: "Active" },
  ARCHIVED: { ar: "مؤرشف", en: "Archived" },
  DRAFT: { ar: "مسودة", en: "Draft" },
  INACTIVE: { ar: "غير نشط", en: "Inactive" },
} satisfies Record<ClientStatus, Record<SupportedLocale, string>>;

type ClientCopy = (typeof copy)[SupportedLocale];

function text(form: FormData, key: string): string | undefined {
  const value = String(form.get(key) ?? "").trim();
  return value ? value : undefined;
}

function numberValue(form: FormData, key: string): number | undefined {
  const value = text(form, key);
  return value ? Number(value) : undefined;
}

function payload(form: FormData): ClientPayload {
  return {
    authorizedApprover: text(form, "authorizedApprover") ?? "",
    billingContact: text(form, "billingContact"),
    branchesCount: numberValue(form, "branchesCount"),
    city: text(form, "city"),
    commercialRegistration: text(form, "commercialRegistration"),
    dataReadiness: text(form, "dataReadiness"),
    employeesCount: numberValue(form, "employeesCount"),
    legalName: text(form, "legalName"),
    name: text(form, "name") ?? "",
    operationalComplexity: text(form, "operationalComplexity"),
    sector: text(form, "sector") ?? "",
    transactionVolume: text(form, "transactionVolume"),
    urgency: text(form, "urgency"),
  };
}

function statusLabel(status: ClientStatus, locale: SupportedLocale): string {
  return statusLabels[status][locale];
}

function number(value: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-SA").format(value);
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function defaultPortalEmail(): string {
  return "";
}

function ClientForm({
  client,
  onCancel,
  onSubmit,
  submitting,
  t,
}: {
  client: ManagedClient | undefined;
  onCancel: () => void;
  onSubmit: (form: FormData) => Promise<void>;
  submitting: boolean;
  t: ClientCopy;
}) {
  const [formError, setFormError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const requiredValues = [
      ...(client ? [] : [text(form, "code")]),
      text(form, "name"),
      text(form, "sector"),
      text(form, "authorizedApprover"),
    ];
    if (requiredValues.some((value) => !value)) {
      setFormError(t.requiredFields);
      return;
    }
    setFormError(undefined);
    await onSubmit(form);
  }

  return (
    <form className="catalog-form wide-form client-admin-form" noValidate onSubmit={submit}>
      {!client ? (
        <label>
          {t.clientCode}
          <input name="code" defaultValue="" placeholder="0001" />
        </label>
      ) : null}
      <label>
        {t.clientName}
        <input name="name" defaultValue={client?.name ?? ""} />
      </label>
      <label>
        {t.legalName}
        <input name="legalName" defaultValue={client?.legalName ?? ""} />
      </label>
      <label>
        {t.commercialRegistration}
        <input name="commercialRegistration" defaultValue={client?.commercialRegistration ?? ""} />
      </label>
      <label>
        {t.sector}
        <input name="sector" defaultValue={client?.sector ?? ""} />
      </label>
      <label>
        {t.city}
        <input name="city" defaultValue={client?.city ?? ""} />
      </label>
      <label>
        {t.authorizedApprover}
        <input name="authorizedApprover" defaultValue={client?.authorizedApprover ?? ""} />
      </label>
      <label>
        {t.billingContact}
        <input name="billingContact" defaultValue={client?.billingContact ?? ""} />
      </label>
      <label>
        {t.employees}
        <input
          name="employeesCount"
          type="number"
          min="0"
          defaultValue={client?.employeesCount ?? 0}
        />
      </label>
      <label>
        {t.branches}
        <input
          name="branchesCount"
          type="number"
          min="0"
          defaultValue={client?.branchesCount ?? 0}
        />
      </label>
      <label>
        {t.transactionVolume}
        <input name="transactionVolume" defaultValue={client?.transactionVolume ?? ""} />
      </label>
      <label>
        {t.operationalComplexity}
        <input name="operationalComplexity" defaultValue={client?.operationalComplexity ?? ""} />
      </label>
      <label>
        {t.dataReadiness}
        <input name="dataReadiness" defaultValue={client?.dataReadiness ?? ""} />
      </label>
      <label>
        {t.urgency}
        <input name="urgency" defaultValue={client?.urgency ?? ""} />
      </label>
      {formError ? (
        <p className="quote-action-feedback error form-span" role="alert">
          {formError}
        </p>
      ) : null}
      <div className="form-actions">
        <button
          type="button"
          className="os-button os-button-secondary"
          disabled={submitting}
          onClick={onCancel}
        >
          {t.cancel}
        </button>
        <button type="submit" className="os-button os-button-primary" disabled={submitting}>
          {submitting ? t.saving : client ? t.saveClient : t.createClient}
        </button>
      </div>
    </form>
  );
}

function PortalUserForm({
  client,
  onCancel,
  onSubmit,
  submitting,
  t,
  externalError,
}: {
  client: ManagedClient;
  onCancel: () => void;
  onSubmit: (form: FormData) => Promise<void>;
  submitting: boolean;
  t: ClientCopy;
  externalError?: string;
}) {
  const [email, setEmail] = useState(() => defaultPortalEmail());
  const [displayName, setDisplayName] = useState(client.authorizedApprover || client.name);
  const [formError, setFormError] = useState<string>();

  useEffect(() => {
    setEmail(defaultPortalEmail());
    setDisplayName(client.authorizedApprover || client.name);
    setFormError(undefined);
  }, [client]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setFormError(t.invalidEmail);
      return;
    }
    if (!displayName.trim()) {
      setFormError(t.displayNameRequired);
      return;
    }
    const form = new FormData(event.currentTarget);
    form.set("email", normalizedEmail);
    form.set("displayName", displayName.trim());
    setFormError(undefined);
    await onSubmit(form);
  }

  return (
    <form className="catalog-form wide-form client-admin-form" noValidate onSubmit={submit}>
      <section className="client-portal-user-guardrails form-span">
        <strong>{t.portalUserChecklist}</strong>
        <span>{t.portalUserGuardA}</span>
        <span>{t.portalUserGuardB}</span>
        <span>{t.portalUserGuardC}</span>
      </section>
      <label>
        {t.email}
        <input
          autoComplete="email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <label>
        {t.displayName}
        <input
          name="displayName"
          autoComplete="name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />
      </label>
      {formError || externalError ? (
        <p className="quote-action-feedback error form-span" role="alert">
          {formError ?? externalError}
        </p>
      ) : null}
      <label>
        {t.language}
        <select name="preferredLocale" defaultValue="ar">
          <option value="ar">العربية</option>
          <option value="en">English</option>
        </select>
      </label>
      <div className="form-actions">
        <button
          type="button"
          className="os-button os-button-secondary"
          disabled={submitting}
          onClick={onCancel}
        >
          {t.cancel}
        </button>
        <button type="submit" className="os-button os-button-primary" disabled={submitting}>
          {submitting ? t.creating : t.createPortalUser}
        </button>
      </div>
    </form>
  );
}

function ClientCard({
  client,
  locale,
  onCreateUser,
  onEdit,
  onStatus,
  submitting,
  t,
}: {
  client: ManagedClient;
  locale: SupportedLocale;
  onCreateUser: (client: ManagedClient) => void;
  onEdit: (client: ManagedClient) => void;
  onStatus: (client: ManagedClient, status: ClientStatus) => Promise<void>;
  submitting: boolean;
  t: ClientCopy;
}) {
  const isArchived = client.status === "ARCHIVED";

  return (
    <article className="client-admin-card">
      <div className="client-admin-card-top">
        <span className="client-admin-avatar" aria-hidden="true">
          {initials(client.name)}
        </span>
        <div>
          <small>{client.code}</small>
          <h3>{client.name}</h3>
          <p>{client.legalName ?? client.sector}</p>
        </div>
        <StatusChip status={client.status} label={statusLabel(client.status, locale)} />
      </div>

      <dl className="client-admin-definition-grid">
        <div>
          <dt>{t.sector}</dt>
          <dd>{client.sector}</dd>
        </div>
        <div>
          <dt>{t.city}</dt>
          <dd>{client.city ?? "-"}</dd>
        </div>
        <div>
          <dt>{t.authorizedApprover}</dt>
          <dd>{client.authorizedApprover}</dd>
        </div>
        <div>
          <dt>{t.billing}</dt>
          <dd>{client.billingContact ?? "-"}</dd>
        </div>
      </dl>

      <div className="client-admin-mini-metrics">
        <div>
          <span>{t.quotes}</span>
          <strong>{number(client.counts.quotes, locale)}</strong>
        </div>
        <div>
          <span>{t.requests}</span>
          <strong>{number(client.counts.requests, locale)}</strong>
        </div>
        <div>
          <span>{t.users}</span>
          <strong>{number(client.counts.assignments, locale)}</strong>
        </div>
        <div>
          <span>{t.contacts}</span>
          <strong>{number(client.counts.contacts, locale)}</strong>
        </div>
      </div>

      <section className="client-admin-portal-panel">
        <div>
          <span>{t.portalAccess}</span>
          <strong>{number(client.users.length, locale)}</strong>
        </div>
        {client.users.length === 0 ? (
          <p>{t.noPortalUsers}</p>
        ) : (
          <ul>
            {client.users.map((user) => (
              <li key={user.id}>
                <span>{user.displayName}</span>
                <small>{user.email}</small>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!isArchived ? (
        <div className="client-admin-actions">
          <button
            type="button"
            className="os-button os-button-secondary"
            disabled={submitting}
            onClick={() => onEdit(client)}
          >
            {t.edit}
          </button>
          <button
            type="button"
            className="os-button os-button-secondary"
            disabled={submitting}
            onClick={() => onCreateUser(client)}
          >
            {t.portalUser}
          </button>
          {client.status !== "ACTIVE" ? (
            <button
              type="button"
              className="os-button os-button-secondary"
              disabled={submitting}
              onClick={() => void onStatus(client, "ACTIVE")}
            >
              {t.enable}
            </button>
          ) : (
            <button
              type="button"
              className="os-button os-button-secondary"
              disabled={submitting}
              onClick={() => void onStatus(client, "INACTIVE")}
            >
              {t.disable}
            </button>
          )}
          <button
            type="button"
            className="os-button os-button-danger"
            disabled={submitting}
            onClick={() => void onStatus(client, "ARCHIVED")}
          >
            {t.archive}
          </button>
        </div>
      ) : null}
    </article>
  );
}

export function ClientManager({
  initialSnapshot,
  locale: localeInput = "en",
}: {
  initialSnapshot: ClientsSnapshot;
  locale?: string;
}) {
  const locale = normalizeLocale(localeInput);
  const t = copy[locale];
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [editing, setEditing] = useState<ManagedClient | null>(null);
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string>();
  const [userClient, setUserClient] = useState<ManagedClient | null>(null);

  const activeClients = snapshot.clients.filter((client) => client.status === "ACTIVE").length;
  const archivedClients = snapshot.clients.filter((client) => client.status === "ARCHIVED").length;
  const portalUsers = snapshot.clients.reduce((sum, client) => sum + client.users.length, 0);
  const requestLinks = snapshot.clients.reduce((sum, client) => sum + client.counts.requests, 0);

  async function refresh(message: string) {
    setSnapshot(await refreshClients());
    setSuccess(message);
    setError(undefined);
  }

  async function update(form: FormData) {
    if (!editing) return;
    setSubmitting(true);
    try {
      await clientsRequest(`admin/clients/${editing.id}`, {
        body: JSON.stringify(payload(form)),
        method: "PUT",
      });
      setEditing(null);
      await refresh(t.clientSaved);
    } catch (caught) {
      setError(clientsErrorMessage(caught));
      setSuccess(undefined);
    } finally {
      setSubmitting(false);
    }
  }

  async function createPortalUser(form: FormData) {
    if (!userClient) return;
    setSubmitting(true);
    try {
      await clientsRequest(`admin/clients/${userClient.id}/users`, {
        body: JSON.stringify({
          displayName: text(form, "displayName"),
          email: text(form, "email"),
          preferredLocale: text(form, "preferredLocale") ?? "ar",
        }),
        method: "POST",
      });
      setUserClient(null);
      await refresh(t.portalUserCreated);
    } catch (caught) {
      setError(clientsErrorMessage(caught));
      setSuccess(undefined);
    } finally {
      setSubmitting(false);
    }
  }

  async function changeStatus(client: ManagedClient, status: ClientStatus) {
    const destructive = status === "INACTIVE" || status === "ARCHIVED";
    const reason = destructive
      ? window.prompt(
          status === "ARCHIVED" ? t.archivePrompt(client.name) : t.disablePrompt(client.name),
        )
      : undefined;
    if (destructive && !reason?.trim()) return;
    if (status === "ARCHIVED" && !window.confirm(t.archiveConfirm(client.name))) return;

    setSubmitting(true);
    try {
      await clientsRequest(`admin/clients/${client.id}/status`, {
        body: JSON.stringify({ status, ...(reason ? { reason } : {}) }),
        method: "PATCH",
      });
      await refresh(t.statusChanged(status));
    } catch (caught) {
      setError(clientsErrorMessage(caught));
      setSuccess(undefined);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        actions={[{ href: "/pricing?newClient=1", label: t.newClient, variant: "primary" }]}
        description={t.pageDescription}
        eyebrow={t.adminClients}
        title={t.pageTitle}
      />
      <CatalogFeedback error={error} success={success} />

      <BentoGrid compact>
        <MetricCard
          accent
          label={t.clients}
          value={number(snapshot.clients.length, locale)}
          detail={`${number(activeClients, locale)} ${t.active}`}
        />
        <MetricCard
          label={t.portalUsers}
          value={number(portalUsers, locale)}
          detail={t.linkedClientAccounts}
        />
        <MetricCard
          label={t.requestLinks}
          value={number(requestLinks, locale)}
          detail={t.historicalAndActiveRequests}
        />
        <MetricCard
          label={t.archived}
          value={number(archivedClients, locale)}
          detail={t.archivedDetail}
        />
      </BentoGrid>

      {editing ? (
        <AppDialog
          busy={submitting}
          closeLabel={t.cancel}
          eyebrow={t.edit}
          onClose={() => setEditing(null)}
          size="lg"
          title={t.editClient(editing.name)}
        >
          <ClientForm
            client={editing}
            onCancel={() => setEditing(null)}
            onSubmit={update}
            submitting={submitting}
            t={t}
          />
        </AppDialog>
      ) : null}

      {userClient ? (
        <AppDialog
          busy={submitting}
          closeLabel={t.cancel}
          eyebrow={t.portalAccess}
          onClose={() => setUserClient(null)}
          size="md"
          title={t.createPortalUserFor(userClient.name)}
        >
          <PortalUserForm
            client={userClient}
            onCancel={() => setUserClient(null)}
            onSubmit={createPortalUser}
            submitting={submitting}
            t={t}
            {...(error ? { externalError: error } : {})}
          />
        </AppDialog>
      ) : null}

      <SectionCard title={t.clientList} description={t.clientListDescription}>
        {snapshot.clients.length === 0 ? (
          <EmptyState title={t.noClients}>{t.clientListDescription}</EmptyState>
        ) : (
          <div className="client-admin-grid">
            {snapshot.clients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                locale={locale}
                onCreateUser={(next) => {
                  setUserClient(next);
                  setEditing(null);
                  setError(undefined);
                  setSuccess(undefined);
                }}
                onEdit={(next) => {
                  setEditing(next);
                  setUserClient(null);
                  setError(undefined);
                  setSuccess(undefined);
                }}
                onStatus={changeStatus}
                submitting={submitting}
                t={t}
              />
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}
