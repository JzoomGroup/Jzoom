"use client";

import { type FormEvent, useMemo, useState } from "react";
import {
  applySuggestedRequestTemplate,
  changeRequestTemplateVersionStatus,
  createRequestFieldLibraryItem,
  requestTemplateErrorMessage,
  refreshRequestTemplates,
  reviseRequestTemplate,
} from "../../lib/request-templates-client";
import type {
  RequestFieldLibraryItem,
  RequestTemplateFieldType,
  RequestTemplateServiceItem,
  RequestTemplateVersion,
  RequestTemplatesSnapshot,
} from "../../lib/request-template-types";
import { CatalogFeedback, EmptyState, SectionHeader } from "../catalog/catalog-shared";

const fieldTypes: RequestTemplateFieldType[] = [
  "SHORT_TEXT",
  "LONG_TEXT",
  "NUMBER",
  "DATE",
  "DROPDOWN",
  "MULTI_SELECT",
  "CHECKBOX",
  "RADIO",
  "FILE",
  "EMAIL",
  "PHONE",
  "AMOUNT",
  "URL",
];

function pretty(value: unknown): string {
  return JSON.stringify(value ?? {}, null, 2);
}

function versionToEditableConfig(version: RequestTemplateVersion | null) {
  if (!version) {
    return {
      status: "DRAFT",
      instructionsAr: "",
      instructionsEn: "",
      sections: [
        {
          code: "basic_request_information",
          titleAr: "معلومات الطلب الأساسية",
          titleEn: "Basic request information",
          sortOrder: 1,
        },
      ],
      fields: [],
      downloadableFiles: [],
      documentChecklist: [],
      reason: "Created from Admin request templates",
    };
  }
  return {
    status: version.status === "ACTIVE" ? "DRAFT" : version.status,
    instructionsAr: version.instructionsAr ?? "",
    instructionsEn: version.instructionsEn ?? "",
    sections: version.sections.map((section) => ({
      code: section.code,
      titleAr: section.titleAr,
      titleEn: section.titleEn,
      descriptionAr: section.descriptionAr,
      descriptionEn: section.descriptionEn,
      active: section.status === "ACTIVE",
      sortOrder: section.sortOrder,
    })),
    fields: version.fields.map((field) => ({
      code: field.code,
      sectionCode: field.sectionCode,
      libraryFieldCode: field.libraryFieldCode,
      systemKey: field.systemKey,
      fieldType: field.fieldType,
      labelAr: field.labelAr,
      labelEn: field.labelEn,
      helpTextAr: field.helpTextAr,
      helpTextEn: field.helpTextEn,
      required: field.required,
      clientVisible: field.clientVisible,
      defaultValue: field.defaultValue,
      validation: field.validation,
      sortOrder: field.sortOrder,
      options: field.options.map((option) => ({
        value: option.value,
        labelAr: option.labelAr,
        labelEn: option.labelEn,
        active: option.status === "ACTIVE",
        sortOrder: option.sortOrder,
      })),
    })),
    downloadableFiles: version.downloadableFiles.map((file) => ({
      code: file.code,
      titleAr: file.titleAr,
      titleEn: file.titleEn,
      descriptionAr: file.descriptionAr,
      descriptionEn: file.descriptionEn,
      fileName: file.fileName,
      fileType: file.fileType,
      mimeType: file.mimeType,
      storageKey: file.storageKey,
      required: file.required,
      returnUploadRequired: file.returnUploadRequired,
      clientVisible: file.clientVisible,
      sortOrder: file.sortOrder,
    })),
    documentChecklist: version.documentChecklist.map((document) => ({
      code: document.code,
      labelAr: document.labelAr,
      labelEn: document.labelEn,
      descriptionAr: document.descriptionAr,
      descriptionEn: document.descriptionEn,
      required: document.required,
      uploadRequired: document.uploadRequired,
      acceptedFileTypes: document.acceptedFileTypes,
      sortOrder: document.sortOrder,
    })),
    reason: "Revised from Admin request templates",
  };
}

function TemplatePreview({ version }: { version: RequestTemplateVersion | null }) {
  if (!version) {
    return (
      <EmptyState>No active or suggested template is available for this service item.</EmptyState>
    );
  }
  return (
    <div className="activity-list">
      <article>
        <strong>
          v{version.version} · {version.status}
        </strong>
        <p>{version.instructionsEn || version.instructionsAr || "No instructions configured."}</p>
      </article>
      {version.sections.map((section) => (
        <article key={section.code}>
          <strong>{section.titleEn}</strong>
          {section.descriptionEn && <p>{section.descriptionEn}</p>}
          <small>{section.titleAr}</small>
          <ul>
            {version.fields
              .filter((field) => field.sectionCode === section.code)
              .map((field) => (
                <li key={field.code}>
                  {field.labelEn} · {field.fieldType} · {field.required ? "required" : "optional"} ·{" "}
                  {field.clientVisible ? "client-visible" : "internal-only"}
                </li>
              ))}
          </ul>
        </article>
      ))}
      {version.downloadableFiles.length > 0 && (
        <article>
          <strong>Downloadable files</strong>
          <ul>
            {version.downloadableFiles.map((file) => (
              <li key={file.code}>
                {file.titleEn} ·{" "}
                {file.returnUploadRequired ? "return upload required" : "reference"}
              </li>
            ))}
          </ul>
        </article>
      )}
      {version.documentChecklist.length > 0 && (
        <article>
          <strong>Required document checklist</strong>
          <ul>
            {version.documentChecklist.map((document) => (
              <li key={document.code}>
                {document.labelEn} ·{" "}
                {document.uploadRequired ? "upload required" : "optional upload"}
              </li>
            ))}
          </ul>
        </article>
      )}
    </div>
  );
}

function FieldLibraryPanel({
  fields,
  onSaved,
  onError,
}: {
  fields: RequestFieldLibraryItem[];
  onError: (message: string) => void;
  onSaved: (snapshot: RequestTemplatesSnapshot, message: string) => void;
}) {
  const [form, setForm] = useState({
    code: "",
    fieldType: "SHORT_TEXT" as RequestTemplateFieldType,
    labelAr: "",
    labelEn: "",
    systemKey: "",
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await createRequestFieldLibraryItem({
        code: form.code,
        fieldType: form.fieldType,
        labelAr: form.labelAr,
        labelEn: form.labelEn,
        ...(form.systemKey ? { systemKey: form.systemKey } : {}),
      });
      const snapshot = await refreshRequestTemplates();
      setForm({
        code: "",
        fieldType: "SHORT_TEXT",
        labelAr: "",
        labelEn: "",
        systemKey: "",
      });
      onSaved(snapshot, "Field library item created.");
    } catch (error) {
      onError(requestTemplateErrorMessage(error));
    }
  }

  return (
    <article className="catalog-panel">
      <h2>Reusable field library</h2>
      <p>
        Add reusable field definitions once, then reference them from any service item request
        template.
      </p>
      <form className="catalog-form" onSubmit={submit}>
        <label>
          Code
          <input
            required
            value={form.code}
            onChange={(event) => setForm({ ...form, code: event.target.value })}
          />
        </label>
        <label>
          Field type
          <select
            value={form.fieldType}
            onChange={(event) =>
              setForm({ ...form, fieldType: event.target.value as RequestTemplateFieldType })
            }
          >
            {fieldTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label>
          Arabic label
          <input
            required
            value={form.labelAr}
            onChange={(event) => setForm({ ...form, labelAr: event.target.value })}
          />
        </label>
        <label>
          English label
          <input
            required
            value={form.labelEn}
            onChange={(event) => setForm({ ...form, labelEn: event.target.value })}
          />
        </label>
        <label>
          System key
          <input
            value={form.systemKey}
            onChange={(event) => setForm({ ...form, systemKey: event.target.value })}
          />
        </label>
        <button className="button-primary" type="submit">
          Add library field
        </button>
      </form>
      <div className="activity-list">
        {fields.slice(0, 18).map((field) => (
          <article key={field.id}>
            <strong>{field.labelEn}</strong>
            <small>
              {field.code} · {field.fieldType} · {field.status}
            </small>
            {field.systemKey && <p>System key: {field.systemKey}</p>}
          </article>
        ))}
      </div>
    </article>
  );
}

export function RequestTemplateManager({
  initialSnapshot,
}: {
  initialSnapshot: RequestTemplatesSnapshot;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [selectedServiceItemId, setSelectedServiceItemId] = useState(
    initialSnapshot.serviceItems[0]?.id ?? "",
  );
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const selected = useMemo(
    () => snapshot.serviceItems.find((item) => item.id === selectedServiceItemId) ?? null,
    [selectedServiceItemId, snapshot.serviceItems],
  );
  const currentVersion = selected?.template?.active ?? selected?.template?.suggested ?? null;
  const [editorText, setEditorText] = useState(pretty(versionToEditableConfig(currentVersion)));

  function selectServiceItem(item: RequestTemplateServiceItem) {
    setSelectedServiceItemId(item.id);
    setEditorText(
      pretty(versionToEditableConfig(item.template?.active ?? item.template?.suggested ?? null)),
    );
  }

  function saved(nextSnapshot: RequestTemplatesSnapshot, message: string) {
    setSnapshot(nextSnapshot);
    setSuccess(message);
    setError(undefined);
  }

  async function applySuggested() {
    if (!selected) return;
    try {
      saved(await applySuggestedRequestTemplate(selected.id), "Suggested template applied.");
    } catch (caught) {
      setError(requestTemplateErrorMessage(caught));
    }
  }

  async function submitRevision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    try {
      const parsed = JSON.parse(editorText) as Record<string, unknown>;
      saved(await reviseRequestTemplate(selected.id, parsed), "Template version saved.");
    } catch (caught) {
      setError(
        caught instanceof SyntaxError
          ? "Template JSON is invalid."
          : requestTemplateErrorMessage(caught),
      );
    }
  }

  async function archiveActive() {
    if (!selected?.template?.active) return;
    try {
      saved(
        await changeRequestTemplateVersionStatus(
          selected.template.active.templateId,
          selected.template.active.id,
          "ARCHIVED",
          "Archived from Admin request templates",
        ),
        "Active template archived.",
      );
    } catch (caught) {
      setError(requestTemplateErrorMessage(caught));
    }
  }

  return (
    <>
      <SectionHeader
        eyebrow="Admin request templates"
        title="Service item request templates"
        description="Configure optional dynamic request forms for monthly service items. Generic request creation remains available when no active template exists."
      />
      <CatalogFeedback error={error} success={success} />

      <section className="quote-summary-grid">
        <article className="catalog-panel">
          <h2>Service item template status</h2>
          <div className="activity-list">
            {snapshot.serviceItems.map((item) => (
              <button
                className="button-quiet"
                key={item.id}
                type="button"
                aria-pressed={item.id === selectedServiceItemId}
                onClick={() => selectServiceItem(item)}
              >
                <strong>{item.latestRevision?.nameEn ?? item.code}</strong>
                <small>
                  {item.code} · {item.template?.active ? "active" : "no active"} ·{" "}
                  {item.template?.suggested ? "suggested available" : "no suggestion"}
                </small>
              </button>
            ))}
          </div>
        </article>

        <FieldLibraryPanel fields={snapshot.fieldLibrary} onSaved={saved} onError={setError} />
      </section>

      <section className="quote-summary-grid">
        <article className="catalog-panel">
          <h2>{selected?.latestRevision?.nameEn ?? "Select a service item"}</h2>
          <p>
            {selected?.latestRevision?.expectedOutput ??
              "Choose a service item to inspect, apply, or revise its request template."}
          </p>
          <div className="row-actions">
            <button
              className="button-secondary"
              type="button"
              disabled={!selected?.template?.suggested}
              onClick={() => void applySuggested()}
            >
              Apply suggested
            </button>
            <button
              className="button-danger"
              type="button"
              disabled={!selected?.template?.active}
              onClick={() => void archiveActive()}
            >
              Archive active
            </button>
          </div>
          <TemplatePreview version={currentVersion} />
        </article>

        <article className="catalog-panel editor-panel">
          <h2>Edit template version</h2>
          <p>
            Edit sections, fields, options, downloadable file metadata, and required document
            checklist as JSON. Saving creates a new version and never changes old request answers.
          </p>
          <form className="catalog-form wide-form" onSubmit={submitRevision}>
            <label className="form-span">
              Template config JSON
              <textarea
                rows={28}
                value={editorText}
                onChange={(event) => setEditorText(event.target.value)}
              />
            </label>
            <button className="button-primary" type="submit" disabled={!selected}>
              Save new template version
            </button>
          </form>
        </article>
      </section>
    </>
  );
}
