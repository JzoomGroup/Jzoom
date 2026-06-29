"use client";

import { useState, type FormEvent } from "react";
import { clientsErrorMessage, clientsRequest, refreshClients } from "../../lib/clients-client";
import type { ClientsSnapshot, ClientStatus, ManagedClient } from "../../lib/clients-types";
import { CatalogFeedback, EmptyState, SectionHeader, StatusBadge } from "../catalog/catalog-shared";
import { MetricCard, SectionCard } from "../premium-os";

interface ClientPayload {
  name: string;
  legalName: string | undefined;
  commercialRegistration: string | undefined;
  sector: string;
  city: string | undefined;
  employeesCount: number | undefined;
  branchesCount: number | undefined;
  transactionVolume: string | undefined;
  operationalComplexity: string | undefined;
  dataReadiness: string | undefined;
  urgency: string | undefined;
  billingContact: string | undefined;
  authorizedApprover: string;
}

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
    name: text(form, "name") ?? "",
    legalName: text(form, "legalName"),
    commercialRegistration: text(form, "commercialRegistration"),
    sector: text(form, "sector") ?? "",
    city: text(form, "city"),
    employeesCount: numberValue(form, "employeesCount"),
    branchesCount: numberValue(form, "branchesCount"),
    transactionVolume: text(form, "transactionVolume"),
    operationalComplexity: text(form, "operationalComplexity"),
    dataReadiness: text(form, "dataReadiness"),
    urgency: text(form, "urgency"),
    billingContact: text(form, "billingContact"),
    authorizedApprover: text(form, "authorizedApprover") ?? "",
  };
}

function ClientForm({
  client,
  submitting,
  onCancel,
  onSubmit,
}: {
  client: ManagedClient | undefined;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (form: FormData) => Promise<void>;
}) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(new FormData(event.currentTarget));
  }

  return (
    <form className="catalog-form wide-form" onSubmit={submit}>
      {!client && (
        <label>
          Client code
          <input name="code" required defaultValue="" placeholder="0001" />
        </label>
      )}
      <label>
        Client name
        <input name="name" required defaultValue={client?.name ?? ""} />
      </label>
      <label>
        Legal name
        <input name="legalName" defaultValue={client?.legalName ?? ""} />
      </label>
      <label>
        Commercial registration
        <input name="commercialRegistration" defaultValue={client?.commercialRegistration ?? ""} />
      </label>
      <label>
        Sector
        <input name="sector" required defaultValue={client?.sector ?? ""} />
      </label>
      <label>
        City
        <input name="city" defaultValue={client?.city ?? ""} />
      </label>
      <label>
        Authorized approver
        <input name="authorizedApprover" required defaultValue={client?.authorizedApprover ?? ""} />
      </label>
      <label>
        Billing contact
        <input name="billingContact" defaultValue={client?.billingContact ?? ""} />
      </label>
      <label>
        Employees
        <input
          name="employeesCount"
          type="number"
          min="0"
          defaultValue={client?.employeesCount ?? 0}
        />
      </label>
      <label>
        Branches
        <input
          name="branchesCount"
          type="number"
          min="0"
          defaultValue={client?.branchesCount ?? 0}
        />
      </label>
      <label>
        Transaction volume
        <input name="transactionVolume" defaultValue={client?.transactionVolume ?? ""} />
      </label>
      <label>
        Operational complexity
        <input name="operationalComplexity" defaultValue={client?.operationalComplexity ?? ""} />
      </label>
      <label>
        Data readiness
        <input name="dataReadiness" defaultValue={client?.dataReadiness ?? ""} />
      </label>
      <label>
        Urgency
        <input name="urgency" defaultValue={client?.urgency ?? ""} />
      </label>
      <div className="form-actions">
        <button type="button" className="os-button os-button-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="os-button os-button-primary" disabled={submitting}>
          {submitting ? "Saving..." : client ? "Save client" : "Create client"}
        </button>
      </div>
    </form>
  );
}

function defaultPortalEmail(client: ManagedClient): string {
  return `${client.code.toLowerCase()}@client.jzoom.local`;
}

function PortalUserForm({
  client,
  submitting,
  onCancel,
  onSubmit,
}: {
  client: ManagedClient;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (form: FormData) => Promise<void>;
}) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(new FormData(event.currentTarget));
  }

  return (
    <form className="catalog-form wide-form" onSubmit={submit}>
      <label>
        Email
        <input name="email" type="email" required defaultValue={defaultPortalEmail(client)} />
      </label>
      <label>
        Display name
        <input
          name="displayName"
          required
          defaultValue={client.authorizedApprover || client.name}
        />
      </label>
      <label>
        Password
        <input name="password" type="password" minLength={8} required />
      </label>
      <label>
        Language
        <select name="preferredLocale" defaultValue="ar">
          <option value="ar">Arabic</option>
          <option value="en">English</option>
        </select>
      </label>
      <div className="form-actions">
        <button type="button" className="os-button os-button-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="os-button os-button-primary" disabled={submitting}>
          {submitting ? "Creating..." : "Create portal user"}
        </button>
      </div>
    </form>
  );
}

function ClientCard({
  client,
  submitting,
  onEdit,
  onCreateUser,
  onStatus,
}: {
  client: ManagedClient;
  submitting: boolean;
  onEdit: (client: ManagedClient) => void;
  onCreateUser: (client: ManagedClient) => void;
  onStatus: (client: ManagedClient, status: ClientStatus) => Promise<void>;
}) {
  return (
    <article className="entity-card">
      <div className="entity-card-heading">
        <div>
          <StatusBadge status={client.status} />
          <h3>{client.name}</h3>
        </div>
        <span>{client.code}</span>
      </div>
      <dl className="entity-meta">
        <div>
          <dt>Sector</dt>
          <dd>{client.sector}</dd>
        </div>
        <div>
          <dt>City</dt>
          <dd>{client.city ?? "-"}</dd>
        </div>
        <div>
          <dt>Approver</dt>
          <dd>{client.authorizedApprover}</dd>
        </div>
        <div>
          <dt>Billing</dt>
          <dd>{client.billingContact ?? "-"}</dd>
        </div>
      </dl>
      <div className="entity-meta four-up">
        <div>
          <dt>Quotes</dt>
          <dd>{client.counts.quotes}</dd>
        </div>
        <div>
          <dt>Requests</dt>
          <dd>{client.counts.requests}</dd>
        </div>
        <div>
          <dt>Users</dt>
          <dd>{client.counts.assignments}</dd>
        </div>
        <div>
          <dt>Contacts</dt>
          <dd>{client.counts.contacts}</dd>
        </div>
      </div>
      <div className="entity-meta">
        <div>
          <dt>Portal users</dt>
          <dd>
            {client.users.length === 0
              ? "No portal users"
              : client.users.map((user) => `${user.displayName} (${user.email})`).join(", ")}
          </dd>
        </div>
      </div>
      {client.status !== "ARCHIVED" && (
        <div className="row-actions">
          <button
            type="button"
            className="os-button os-button-secondary"
            disabled={submitting}
            onClick={() => onEdit(client)}
          >
            Edit
          </button>
          <button
            type="button"
            className="os-button os-button-secondary"
            disabled={submitting}
            onClick={() => onCreateUser(client)}
          >
            Portal user
          </button>
          {client.status !== "ACTIVE" ? (
            <button
              type="button"
              className="os-button os-button-secondary"
              disabled={submitting}
              onClick={() => void onStatus(client, "ACTIVE")}
            >
              Enable
            </button>
          ) : (
            <button
              type="button"
              className="os-button os-button-secondary"
              disabled={submitting}
              onClick={() => void onStatus(client, "INACTIVE")}
            >
              Disable
            </button>
          )}
          <button
            type="button"
            className="os-button os-button-danger"
            disabled={submitting}
            onClick={() => void onStatus(client, "ARCHIVED")}
          >
            Archive
          </button>
        </div>
      )}
    </article>
  );
}

export function ClientManager({ initialSnapshot }: { initialSnapshot: ClientsSnapshot }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [editing, setEditing] = useState<ManagedClient | null>(null);
  const [userClient, setUserClient] = useState<ManagedClient | null>(null);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const activeClients = snapshot.clients.filter((client) => client.status === "ACTIVE").length;
  const archivedClients = snapshot.clients.filter((client) => client.status === "ARCHIVED").length;
  const portalUsers = snapshot.clients.reduce((sum, client) => sum + client.users.length, 0);
  const openRequests = snapshot.clients.reduce((sum, client) => sum + client.counts.requests, 0);

  async function refresh(message: string) {
    setSnapshot(await refreshClients());
    setSuccess(message);
    setError(undefined);
  }

  async function create(form: FormData) {
    setSubmitting(true);
    try {
      await clientsRequest("admin/clients", {
        method: "POST",
        body: JSON.stringify({
          code: text(form, "code")?.toUpperCase(),
          ...payload(form),
          status: "ACTIVE",
        }),
      });
      setCreating(false);
      await refresh("Client created.");
    } catch (caught) {
      setError(clientsErrorMessage(caught));
      setSuccess(undefined);
    } finally {
      setSubmitting(false);
    }
  }

  async function update(form: FormData) {
    if (!editing) return;
    setSubmitting(true);
    try {
      await clientsRequest(`admin/clients/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify(payload(form)),
      });
      setEditing(null);
      await refresh("Client saved.");
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
        method: "POST",
        body: JSON.stringify({
          email: text(form, "email"),
          displayName: text(form, "displayName"),
          password: text(form, "password"),
          preferredLocale: text(form, "preferredLocale") ?? "ar",
        }),
      });
      setUserClient(null);
      await refresh("Client portal user created.");
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
          status === "ARCHIVED"
            ? `Why are you archiving ${client.name}?`
            : `Why are you disabling ${client.name}?`,
        )
      : undefined;
    if (destructive && !reason?.trim()) return;
    if (status === "ARCHIVED" && !window.confirm(`Archive ${client.name}?`)) return;

    setSubmitting(true);
    try {
      await clientsRequest(`admin/clients/${client.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, ...(reason ? { reason } : {}) }),
      });
      await refresh(`Client ${status === "ACTIVE" ? "enabled" : status.toLowerCase()}.`);
    } catch (caught) {
      setError(clientsErrorMessage(caught));
      setSuccess(undefined);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <SectionHeader
        eyebrow="Admin clients"
        title="Clients"
        description="Create and maintain client master data used by pricing, requests, quotes, invoices, reports, and client portal scope."
        action={
          <button
            type="button"
            className="os-button os-button-primary"
            onClick={() => {
              setCreating(true);
              setEditing(null);
              setUserClient(null);
              setError(undefined);
              setSuccess(undefined);
            }}
          >
            New client
          </button>
        }
      />
      <CatalogFeedback error={error} success={success} />

      <section className="metric-grid" aria-label="Client administration summary">
        <MetricCard label="Clients" value={snapshot.clients.length} detail={`${activeClients} active`} accent />
        <MetricCard label="Portal users" value={portalUsers} detail="Linked client accounts" />
        <MetricCard label="Request links" value={openRequests} detail="Historical and active requests" />
        <MetricCard label="Archived" value={archivedClients} detail="Hidden from active operations" />
      </section>

      {(creating || editing) && (
        <section className="catalog-panel editor-panel">
          <h2>{editing ? `Edit ${editing.name}` : "Create client"}</h2>
          <ClientForm
            client={editing ?? undefined}
            submitting={submitting}
            onCancel={() => {
              setCreating(false);
              setEditing(null);
            }}
            onSubmit={editing ? update : create}
          />
        </section>
      )}

      {userClient && (
        <section className="catalog-panel editor-panel">
          <h2>Create portal user for {userClient.name}</h2>
          <PortalUserForm
            client={userClient}
            submitting={submitting}
            onCancel={() => setUserClient(null)}
            onSubmit={createPortalUser}
          />
        </section>
      )}

      <SectionCard title="Client list" description="Operational client records, account contacts, request links, and portal access.">
        {snapshot.clients.length === 0 ? (
          <EmptyState>No clients have been created yet.</EmptyState>
        ) : (
          <div className="entity-grid">
            {snapshot.clients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                submitting={submitting}
                onEdit={(next) => {
                  setEditing(next);
                  setCreating(false);
                  setUserClient(null);
                  setError(undefined);
                  setSuccess(undefined);
                }}
                onCreateUser={(next) => {
                  setUserClient(next);
                  setEditing(null);
                  setCreating(false);
                  setError(undefined);
                  setSuccess(undefined);
                }}
                onStatus={changeStatus}
              />
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}
