"use client";

import { type FormEvent, useState } from "react";
import {
  createPlatformSetting,
  platformConfigurationErrorMessage,
  publishTranslations,
  reviseNotificationTemplate,
  revisePdfTemplate,
  revisePlatformSetting,
  reviseWorkflowTemplate,
} from "../../lib/platform-configuration-client";
import type {
  NotificationTemplateConfig,
  PdfTemplateConfig,
  PlatformConfigurationSnapshot,
  PlatformSetting,
  SettingValueType,
  WorkflowTemplateConfig,
} from "../../lib/platform-configuration-types";
import { CatalogFeedback, SectionHeader } from "../catalog/catalog-shared";

function pretty(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value ?? {}, null, 2);
}

function parseJson(text: string, fallback: unknown = {}) {
  const trimmed = text.trim();
  if (!trimmed) return fallback;
  return JSON.parse(trimmed) as unknown;
}

function parseSettingValue(type: SettingValueType, text: string) {
  if (type === "JSON") return parseJson(text);
  if (type === "NUMBER") {
    const value = Number(text);
    if (!Number.isFinite(value)) throw new Error("Number settings require a finite number.");
    return value;
  }
  if (type === "BOOLEAN") {
    return ["true", "1", "yes", "on"].includes(text.trim().toLowerCase());
  }
  return text;
}

function currentLabel(version?: number, status?: string) {
  return version ? `v${version} · ${status}` : "No revision";
}

function SettingCard({
  setting,
  onSaved,
  onError,
}: {
  setting: PlatformSetting;
  onError: (message: string) => void;
  onSaved: (snapshot: PlatformConfigurationSnapshot, message: string) => void;
}) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const snapshot = await revisePlatformSetting(setting.key, {
        value: parseSettingValue(setting.valueType, String(form.get("value") ?? "")),
        reason: String(form.get("reason") ?? "").trim() || undefined,
      });
      onSaved(snapshot, `${setting.key} revised.`);
    } catch (error) {
      onError(platformConfigurationErrorMessage(error));
    }
  }

  return (
    <article className="entity-card">
      <div className="entity-card-heading">
        <div>
          <span className={`status-pill status-${setting.status.toLowerCase()}`}>
            {setting.category}
          </span>
          <h3>{setting.key}</h3>
        </div>
        <span>{currentLabel(setting.current?.version, setting.current?.status)}</span>
      </div>
      <form className="catalog-form" onSubmit={submit}>
        <label className="full-span">
          Value
          <textarea
            name="value"
            rows={setting.valueType === "JSON" ? 5 : 2}
            defaultValue={pretty(setting.current?.value)}
            disabled={setting.current?.masked}
          />
        </label>
        <label>
          Reason
          <input name="reason" placeholder="Why is this changing?" />
        </label>
        <div className="form-actions">
          <button type="submit" className="button-primary" disabled={setting.current?.masked}>
            Save revision
          </button>
        </div>
      </form>
    </article>
  );
}

function NotificationCard({
  template,
  onSaved,
  onError,
}: {
  template: NotificationTemplateConfig;
  onError: (message: string) => void;
  onSaved: (snapshot: PlatformConfigurationSnapshot, message: string) => void;
}) {
  const current = template.current;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const snapshot = await reviseNotificationTemplate(template.id, {
        messageAr: String(form.get("messageAr") ?? ""),
        messageEn: String(form.get("messageEn") ?? ""),
        deepLink: String(form.get("deepLink") ?? ""),
        recipients: parseJson(String(form.get("recipients") ?? "[]"), []),
        channels: parseJson(String(form.get("channels") ?? "[]"), []),
        placeholders: parseJson(String(form.get("placeholders") ?? "{}"), {}),
      });
      onSaved(snapshot, `${template.code} notification template revised.`);
    } catch (error) {
      onError(platformConfigurationErrorMessage(error));
    }
  }

  return (
    <article className="entity-card">
      <div className="entity-card-heading">
        <div>
          <span className="status-pill status-active">{template.event}</span>
          <h3>{template.code}</h3>
        </div>
        <span>{currentLabel(current?.version, current?.status)}</span>
      </div>
      <form className="catalog-form" onSubmit={submit}>
        <label className="full-span">
          Arabic message
          <textarea name="messageAr" rows={3} defaultValue={current?.messageAr ?? ""} />
        </label>
        <label className="full-span">
          English message
          <textarea name="messageEn" rows={3} defaultValue={current?.messageEn ?? ""} />
        </label>
        <label>
          Deep link
          <input name="deepLink" defaultValue={current?.deepLink ?? "/notifications"} />
        </label>
        <label>
          Channels JSON
          <textarea
            name="channels"
            rows={3}
            defaultValue={pretty(current?.channels ?? ["inApp"])}
          />
        </label>
        <label>
          Recipients JSON
          <textarea name="recipients" rows={3} defaultValue={pretty(current?.recipients ?? [])} />
        </label>
        <label>
          Placeholders JSON
          <textarea
            name="placeholders"
            rows={3}
            defaultValue={pretty(current?.placeholders ?? {})}
          />
        </label>
        <div className="form-actions">
          <button type="submit" className="button-primary">
            Save template revision
          </button>
        </div>
      </form>
    </article>
  );
}

function PdfCard({
  template,
  onSaved,
  onError,
}: {
  template: PdfTemplateConfig;
  onError: (message: string) => void;
  onSaved: (snapshot: PlatformConfigurationSnapshot, message: string) => void;
}) {
  const current = template.current;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const snapshot = await revisePdfTemplate(template.id, {
        name: String(form.get("name") ?? "").trim(),
        audience: String(form.get("audience") ?? "").trim(),
        languageDirection: String(form.get("languageDirection") ?? "rtl"),
        technicalRule: String(form.get("technicalRule") ?? "").trim(),
        contentSchema: parseJson(String(form.get("contentSchema") ?? "{}"), {}),
      });
      onSaved(snapshot, `${template.code} PDF template revised.`);
    } catch (error) {
      onError(platformConfigurationErrorMessage(error));
    }
  }

  return (
    <article className="entity-card">
      <div className="entity-card-heading">
        <div>
          <span className="status-pill status-active">{template.documentType}</span>
          <h3>{template.name}</h3>
        </div>
        <span>{currentLabel(current?.version, current?.status)}</span>
      </div>
      <form className="catalog-form" onSubmit={submit}>
        <label>
          Display name
          <input name="name" defaultValue={template.name} />
        </label>
        <label>
          Audience
          <input name="audience" defaultValue={current?.audience ?? "client"} />
        </label>
        <label>
          Direction
          <select name="languageDirection" defaultValue={current?.languageDirection ?? "rtl"}>
            <option value="rtl">Arabic RTL first</option>
            <option value="ltr">LTR</option>
          </select>
        </label>
        <label className="full-span">
          Business text / content schema JSON
          <textarea name="contentSchema" rows={6} defaultValue={pretty(current?.contentSchema)} />
        </label>
        <label className="full-span">
          Technical rule
          <textarea name="technicalRule" rows={3} defaultValue={current?.technicalRule ?? ""} />
        </label>
        <div className="form-actions">
          <button type="submit" className="button-primary">
            Save PDF settings revision
          </button>
        </div>
      </form>
    </article>
  );
}

function WorkflowCard({
  workflow,
  onSaved,
  onError,
}: {
  workflow: WorkflowTemplateConfig;
  onError: (message: string) => void;
  onSaved: (snapshot: PlatformConfigurationSnapshot, message: string) => void;
}) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const snapshot = await reviseWorkflowTemplate(workflow.id, {
        name: String(form.get("name") ?? "").trim(),
        configuration: parseJson(String(form.get("configuration") ?? "{}"), {}),
        revisionStatus: "DRAFT",
      });
      onSaved(snapshot, `${workflow.code} workflow template draft created.`);
    } catch (error) {
      onError(platformConfigurationErrorMessage(error));
    }
  }

  return (
    <article className="entity-card">
      <div className="entity-card-heading">
        <div>
          <span className="status-pill status-draft">{workflow.type}</span>
          <h3>{workflow.name}</h3>
        </div>
        <span>{currentLabel(workflow.current?.version, workflow.current?.status)}</span>
      </div>
      <p>
        {workflow.current?.states.length ?? 0} states · {workflow.current?.transitions.length ?? 0}{" "}
        transitions copied into each new revision.
      </p>
      <form className="catalog-form" onSubmit={submit}>
        <label>
          Name
          <input name="name" defaultValue={workflow.name} />
        </label>
        <label className="full-span">
          Checklist / workflow configuration JSON
          <textarea
            name="configuration"
            rows={6}
            defaultValue={pretty(
              workflow.current?.configuration ?? {
                checklistTemplate: [],
                defaultSteps: [],
              },
            )}
          />
        </label>
        <div className="form-actions">
          <button type="submit" className="button-primary">
            Save draft revision
          </button>
        </div>
      </form>
    </article>
  );
}

export function PlatformConfigurationManager({
  initialSnapshot,
}: {
  initialSnapshot: PlatformConfigurationSnapshot;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();

  function onSaved(next: PlatformConfigurationSnapshot, message: string) {
    setSnapshot(next);
    setSuccess(message);
    setError(undefined);
  }

  function onError(message: string) {
    setError(message);
    setSuccess(undefined);
  }

  async function createSetting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const valueType = String(form.get("valueType") ?? "STRING") as SettingValueType;
    try {
      const next = await createPlatformSetting({
        key: String(form.get("key") ?? "").trim(),
        category: String(form.get("category") ?? "").trim(),
        valueType,
        value: parseSettingValue(valueType, String(form.get("value") ?? "")),
        reason: "Created from Admin Platform Configuration",
      });
      event.currentTarget.reset();
      onSaved(next, "Platform setting created.");
    } catch (caught) {
      onError(platformConfigurationErrorMessage(caught));
    }
  }

  async function publishLabel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const next = await publishTranslations({
        reason: "Published from Admin Platform Configuration",
        values: [
          {
            key: String(form.get("key") ?? "").trim(),
            namespace: String(form.get("namespace") ?? "").trim(),
            locale: String(form.get("locale") ?? "ar").trim(),
            value: String(form.get("value") ?? ""),
            description: String(form.get("description") ?? "").trim(),
          },
        ],
      });
      onSaved(next, "Localization label revision published.");
    } catch (caught) {
      onError(platformConfigurationErrorMessage(caught));
    }
  }

  const settingsByCategory = new Map<string, PlatformSetting[]>();
  for (const setting of snapshot.settings) {
    settingsByCategory.set(setting.category, [
      ...(settingsByCategory.get(setting.category) ?? []),
      setting,
    ]);
  }

  return (
    <>
      <SectionHeader
        eyebrow="Admin configuration"
        title="Platform configuration"
        description="Manage PostgreSQL-backed platform, branding, localization, notification, PDF, workflow, and business-text foundations. Changes create future-facing revisions and do not rewrite issued snapshots."
      />
      <CatalogFeedback error={error} success={success} />

      <section className="catalog-panel editor-panel">
        <h2>Create setting</h2>
        <form className="catalog-form wide-form" onSubmit={createSetting}>
          <label>
            Key
            <input name="key" required placeholder="business_text.new_template" />
          </label>
          <label>
            Category
            <input name="category" required placeholder="business_text" />
          </label>
          <label>
            Type
            <select name="valueType" defaultValue="STRING">
              {snapshot.settingValueTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="full-span">
            Initial value
            <textarea name="value" rows={3} required />
          </label>
          <div className="form-actions">
            <button type="submit" className="button-primary">
              Add setting
            </button>
          </div>
        </form>
      </section>

      {[...settingsByCategory.entries()].map(([category, settings]) => (
        <section className="catalog-panel" key={category}>
          <h2>{category.replaceAll("_", " ")} settings</h2>
          <div className="entity-grid">
            {settings.map((setting) => (
              <SettingCard key={setting.id} setting={setting} onError={onError} onSaved={onSaved} />
            ))}
          </div>
        </section>
      ))}

      <section className="catalog-panel">
        <h2>Notification templates</h2>
        <p>
          In-app/outbox templates only. External email, SMS, and WhatsApp sending remain
          future-ready.
        </p>
        <div className="entity-grid">
          {snapshot.notificationTemplates.map((template) => (
            <NotificationCard
              key={template.id}
              template={template}
              onError={onError}
              onSaved={onSaved}
            />
          ))}
        </div>
      </section>

      <section className="catalog-panel">
        <h2>PDF template settings</h2>
        <p>
          Quote and invoice PDFs keep using immutable quote/invoice snapshots as their source of
          truth.
        </p>
        <div className="entity-grid">
          {snapshot.pdfTemplates.map((template) => (
            <PdfCard key={template.id} template={template} onError={onError} onSaved={onSaved} />
          ))}
        </div>
      </section>

      <section className="catalog-panel editor-panel">
        <h2>Localization labels</h2>
        <form className="catalog-form wide-form" onSubmit={publishLabel}>
          <label>
            Key
            <input name="key" required placeholder="common.save" />
          </label>
          <label>
            Namespace
            <input name="namespace" required defaultValue="common" />
          </label>
          <label>
            Locale
            <select name="locale" defaultValue="ar">
              <option value="ar">Arabic</option>
              <option value="en">English</option>
            </select>
          </label>
          <label>
            Description
            <input name="description" />
          </label>
          <label className="full-span">
            Value
            <textarea name="value" rows={2} required />
          </label>
          <div className="form-actions">
            <button type="submit" className="button-primary">
              Publish label revision
            </button>
          </div>
        </form>
      </section>

      <section className="catalog-panel">
        <h2>Workflow/checklist templates</h2>
        <p>
          Simple JSON checklist/default-step configuration only. Full visual Workflow Builder is
          excluded.
        </p>
        <div className="entity-grid">
          {snapshot.workflows.map((workflow) => (
            <WorkflowCard
              key={workflow.id}
              workflow={workflow}
              onError={onError}
              onSaved={onSaved}
            />
          ))}
        </div>
      </section>
    </>
  );
}
