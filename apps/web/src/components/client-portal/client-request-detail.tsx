"use client";

import { clientRequestDetailCopy as copy } from "../../i18n/dictionaries/client-portal";

import Link from "next/link";
import { type ChangeEvent, type FormEvent, useState } from "react";
import {
  acceptClientRequestOutput,
  addClientRequestComment,
  archiveClientRequestAttachment,
  requestErrorMessage,
  returnClientRequestOutput,
  uploadClientRequestedDocument,
} from "../../lib/request-client";
import type { ServiceRequest } from "../../lib/request-types";
import { PageHeader, StatusChip } from "../premium-os";
import { ActivityTimeline, FileCard } from "../workflow-ui";
import {
  clientDateTime,
  clientLabel,
  clientLocale,
  clientName,
  clientNumber,
  documentStatusLabel,
  localizedFreeText,
  outputStatusLabel,
  requestStatusLabel,
  type ClientDisplayLocale,
} from "./client-format";

type ClientDocumentStatus = ServiceRequest["documentRequests"][number]["status"];
type ClientOutputStatus = ServiceRequest["outputs"][number]["status"];

function fileSize(sizeBytes: number, locale: ClientDisplayLocale): string {
  if (sizeBytes >= 1_000_000) {
    return `${clientNumber(sizeBytes / 1_000_000, locale)} MB`;
  }

  if (sizeBytes >= 1_000) {
    return `${clientNumber(sizeBytes / 1_000, locale)} KB`;
  }

  return locale === "ar"
    ? `${clientNumber(sizeBytes, locale)} بايت`
    : `${clientNumber(sizeBytes, locale)} bytes`;
}

function safeSystemText(
  value: string | null | undefined,
  fallback: string,
  locale: ClientDisplayLocale,
) {
  return localizedFreeText(value, locale, fallback);
}

function outputActionCopy(status: ClientOutputStatus, locale: ClientDisplayLocale): string {
  const t = copy[locale];
  switch (status) {
    case "SHARED_WITH_CLIENT":
      return t.outputReview;
    case "ACCEPTED_BY_CLIENT":
      return t.outputAccepted;
    case "RETURNED_BY_CLIENT":
      return t.outputReturned;
    case "CLOSED":
      return t.closedOutput;
    default:
      return t.outputDefault;
  }
}

function documentActionCopy(status: ClientDocumentStatus, locale: ClientDisplayLocale): string {
  const t = copy[locale];
  switch (status) {
    case "REQUESTED":
      return t.uploadRequired;
    case "UPLOADED":
      return t.uploadedReview;
    case "CLOSED":
      return t.acceptedDocument;
    case "CANCELLED":
    default:
      return t.documentCancelled;
  }
}

const activeClientRequestStatuses = [
  "NEW",
  "TRIAGE",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_CLIENT",
  "WAITING_SUPERVISOR",
  "RETURNED",
];

const clientVisibleOutputStatuses: ClientOutputStatus[] = [
  "SHARED_WITH_CLIENT",
  "ACCEPTED_BY_CLIENT",
  "RETURNED_BY_CLIENT",
  "CLOSED",
];

const fieldTypeLabels: Record<string, Record<ClientDisplayLocale, string>> = {
  AMOUNT: { ar: "مبلغ", en: "Amount" },
  CHECKBOX: { ar: "اختيار", en: "Checkbox" },
  DATE: { ar: "تاريخ", en: "Date" },
  DROPDOWN: { ar: "قائمة اختيار", en: "Dropdown" },
  EMAIL: { ar: "بريد إلكتروني", en: "Email" },
  FILE: { ar: "ملف", en: "File" },
  LONG_TEXT: { ar: "نص طويل", en: "Long text" },
  MULTI_SELECT: { ar: "اختيار متعدد", en: "Multi select" },
  NUMBER: { ar: "رقم", en: "Number" },
  PHONE: { ar: "هاتف", en: "Phone" },
  RADIO: { ar: "اختيار واحد", en: "Radio" },
  SHORT_TEXT: { ar: "نص قصير", en: "Short text" },
  URL: { ar: "رابط", en: "URL" },
};

function templateFieldTypeLabel(fieldType: string, locale: ClientDisplayLocale): string {
  return fieldTypeLabels[fieldType]?.[locale] ?? (locale === "ar" ? "حقل" : "Field");
}

function answerValue(value: unknown, locale: ClientDisplayLocale): string {
  if (Array.isArray(value)) {
    return value.map((item) => answerValue(item, locale)).join(locale === "ar" ? "، " : ", ");
  }
  if (typeof value === "boolean") {
    return locale === "ar" ? (value ? "نعم" : "لا") : value ? "Yes" : "No";
  }
  if (typeof value === "number") {
    return clientNumber(value, locale);
  }
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }
  return "-";
}

function userRoleLabel(
  user: ServiceRequest["comments"][number]["author"] | null | undefined,
  locale: ClientDisplayLocale,
): string {
  const roleCode = user?.roles?.[0]?.role.code?.replace(/^ROLE-/, "");
  if (!roleCode) return locale === "ar" ? "مستخدم" : "User";
  const labels: Record<string, Record<ClientDisplayLocale, string>> = {
    ADMIN: { ar: "الأدمن", en: "Admin" },
    AM: { ar: "مدير الحساب", en: "Account manager" },
    CLIENT: { ar: "العميل", en: "Client" },
    MGMT: { ar: "الإدارة", en: "Management" },
    SPECIALIST: { ar: "المختص", en: "Specialist" },
    SUPERVISOR: { ar: "المشرف", en: "Supervisor" },
  };
  return labels[roleCode]?.[locale] ?? roleCode;
}

function userDisplayWithRole(
  user: ServiceRequest["comments"][number]["author"] | null | undefined,
  fallback: string,
  locale: ClientDisplayLocale,
): string {
  if (!user) return fallback;
  return `${user.displayName} - ${userRoleLabel(user, locale)}`;
}

export function ClientRequestDetail({
  locale: localeInput = "en",
  request: initialRequest,
}: {
  locale?: string;
  request: ServiceRequest;
}) {
  const locale = clientLocale(localeInput);
  const t = copy[locale];
  const [request, setRequest] = useState(initialRequest);
  const [body, setBody] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [uploadForm, setUploadForm] = useState({
    documentRequestId: "",
    mimeType: "",
    originalName: "",
    sha256: "",
    sizeBytes: "1",
  });
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [fileProcessing, setFileProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<ServiceRequest>) {
    setSaving(true);
    setError(null);
    try {
      const updated = await action();
      setRequest(updated);
    } catch (caught) {
      setError(requestErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await run(async () => {
      const updated = await addClientRequestComment(request.id, body);
      setBody("");
      return updated;
    });
  }

  function acceptOutput(outputId: string) {
    if (!window.confirm(t.confirmAcceptOutput)) {
      return;
    }
    void run(() => acceptClientRequestOutput(request.id, outputId));
  }

  function returnOutput(outputId: string) {
    if (!window.confirm(t.confirmReturnOutput)) {
      return;
    }
    void run(async () => {
      const updated = await returnClientRequestOutput(request.id, outputId, returnReason);
      setReturnReason("");
      return updated;
    });
  }

  function submitUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDocumentRequestId) {
      setError(t.selectDocumentError);
      return;
    }
    if (!selectedUploadFile) {
      setError(t.fileUploadHint);
      return;
    }

    void run(async () => {
      const updated = await uploadClientRequestedDocument(
        request.id,
        selectedDocumentRequestId,
        selectedUploadFile,
        {
          mimeType: uploadForm.mimeType,
          originalName: uploadForm.originalName,
          sha256: uploadForm.sha256,
          sizeBytes: Number(uploadForm.sizeBytes),
        },
      );
      setUploadForm({
        documentRequestId: "",
        mimeType: "",
        originalName: "",
        sha256: "",
        sizeBytes: "1",
      });
      setSelectedUploadFile(null);
      return updated;
    });
  }

  async function selectUploadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileProcessing(true);
    setError(null);
    try {
      setSelectedUploadFile(file);
      let sha256 = uploadForm.sha256;
      if (globalThis.crypto?.subtle) {
        const digest = await globalThis.crypto.subtle.digest("SHA-256", await file.arrayBuffer());
        sha256 = Array.from(new Uint8Array(digest))
          .map((byte) => byte.toString(16).padStart(2, "0"))
          .join("");
      }
      setUploadForm((current) => ({
        ...current,
        originalName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: String(Math.max(file.size, 1)),
        sha256,
      }));
    } finally {
      setFileProcessing(false);
    }
  }

  function archiveAttachment(fileId: string) {
    if (!window.confirm(t.archiveAttachmentConfirm)) {
      return;
    }
    void run(() => archiveClientRequestAttachment(request.id, fileId));
  }

  const sharedOutputs = request.outputs.filter((output) =>
    clientVisibleOutputStatuses.includes(output.status),
  );
  const outputsAwaitingDecision = sharedOutputs.filter(
    (output) => output.status === "SHARED_WITH_CLIENT",
  );
  const requestedDocuments = request.documentRequests.filter(
    (documentRequest) => documentRequest.status === "REQUESTED",
  );
  const uploadedDocuments = request.documentRequests.filter(
    (documentRequest) => documentRequest.status === "UPLOADED",
  );
  const specificNextActions = [
    ...(outputsAwaitingDecision.length > 0
      ? [
          locale === "ar"
            ? `راجع ${clientNumber(outputsAwaitingDecision.length, locale)} من المخرجات المشاركة.`
            : `Review ${outputsAwaitingDecision.length} shared deliverable(s).`,
        ]
      : []),
    ...(requestedDocuments.length > 0
      ? [
          locale === "ar"
            ? `ارفع ${clientNumber(requestedDocuments.length, locale)} من المستندات المطلوبة.`
            : `Upload ${requestedDocuments.length} requested document(s).`,
        ]
      : []),
  ];
  const nextActions =
    specificNextActions.length > 0
      ? specificNextActions
      : request.status === "WAITING_CLIENT"
        ? [t.jzoomWaiting]
        : [];
  const uploadSelectionIsValid = requestedDocuments.some(
    (documentRequest) => documentRequest.id === uploadForm.documentRequestId,
  );
  const selectedDocumentRequestId = uploadSelectionIsValid
    ? uploadForm.documentRequestId
    : requestedDocuments.length === 1
      ? (requestedDocuments[0]?.id ?? "")
      : "";
  const selectedDocumentRequest = requestedDocuments.find(
    (documentRequest) => documentRequest.id === selectedDocumentRequestId,
  );
  const primaryAction =
    outputsAwaitingDecision.length > 0
      ? { href: "#client-deliverables", label: t.reviewDeliverables }
      : requestedDocuments.length > 0
        ? { href: "#client-documents", label: t.uploadDocuments }
        : null;
  const isActiveRequest = activeClientRequestStatuses.includes(request.status);
  const clientTimeline = [
    {
      at: request.createdAt,
      detail: request.requestNumber,
      id: "request-created",
      label: t.created,
    },
    ...sharedOutputs
      .filter((output) => output.sharedAt || output.createdAt)
      .flatMap((output) => {
        const revision = `${t.revision} ${clientNumber(output.revision, locale)}`;
        const sharedEvent = {
          at: output.sharedAt ?? output.createdAt,
          detail: revision,
          id: `output-${output.id}`,
          label: t.outputShared,
        };
        if (!output.clientDecidedAt) {
          return [sharedEvent];
        }

        const wasReturned =
          output.status === "RETURNED_BY_CLIENT" ||
          (output.status === "CLOSED" && Boolean(output.clientReturnReason));
        return [
          sharedEvent,
          {
            at: output.clientDecidedAt,
            detail: wasReturned && output.clientReturnReason ? output.clientReturnReason : revision,
            id: `output-decision-${output.id}`,
            label: wasReturned ? t.outputReturnedTimeline : t.outputAcceptedTimeline,
          },
        ];
      }),
    ...request.documentRequests.map((documentRequest) => ({
      at:
        documentRequest.fulfilledAt ??
        documentRequest.closedAt ??
        documentRequest.cancelledAt ??
        documentRequest.requestedAt,
      detail: t.requestDocuments,
      id: `document-${documentRequest.id}`,
      label: documentRequest.status === "REQUESTED" ? t.documentRequested : t.documentTimeline,
    })),
    ...request.comments.map((comment) => ({
      at: comment.createdAt,
      detail: t.comments,
      id: `comment-${comment.id}`,
      label: userDisplayWithRole(comment.author, t.teamMessage, locale),
    })),
    ...request.attachments.map((file) => ({
      at: file.createdAt,
      detail: `${file.originalName} - ${fileSize(file.sizeBytes, locale)}`,
      id: `attachment-${file.id}`,
      label: t.visibleAttachments,
    })),
  ]
    .filter((item) => item.at)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 6);

  return (
    <>
      <PageHeader
        eyebrow={t.requestDetail}
        title={localizedFreeText(request.title, locale, t.request)}
        description={`${request.requestNumber} - ${clientName(request.service.monthlyService, locale)}`}
        meta={
          <StatusChip status={request.status} label={requestStatusLabel(request.status, locale)} />
        }
      >
        <div className="quote-header-actions">
          <Link className="os-button os-button-secondary" href="/client/requests">
            {t.back}
          </Link>
        </div>
      </PageHeader>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <section className="client-request-command">
        <div className="client-command-main">
          <p className="eyebrow">{t.actionCenter}</p>
          <h2>{isActiveRequest ? t.workInProgress : t.completed}</h2>
          <div className="client-next-actions">
            {nextActions.length === 0 ? (
              <article>
                <strong>{t.noAction}</strong>
                <p>{t.noActionBody}</p>
              </article>
            ) : (
              nextActions.map((action) => (
                <article key={action}>
                  <strong>{t.nextAction}</strong>
                  <p>{action}</p>
                </article>
              ))
            )}
          </div>
          <div className="row-actions">
            {primaryAction ? (
              <a className="os-button os-button-primary" href={primaryAction.href}>
                {primaryAction.label}
              </a>
            ) : (
              <Link className="os-button os-button-secondary" href="/client/requests">
                {t.allRequests}
              </Link>
            )}
          </div>
        </div>
        <div className="client-command-metrics">
          <div className="primary">
            <span>{t.deliverablesToReview}</span>
            <strong>{clientNumber(outputsAwaitingDecision.length, locale)}</strong>
          </div>
          <div>
            <span>{t.requestDocuments}</span>
            <strong>{clientNumber(requestedDocuments.length, locale)}</strong>
          </div>
          <div>
            <span>{t.uploaded}</span>
            <strong>{clientNumber(uploadedDocuments.length, locale)}</strong>
          </div>
          <div>
            <span>{t.visibleAttachments}</span>
            <strong>{clientNumber(request.attachments.length, locale)}</strong>
          </div>
          <div>
            <span>{t.comments}</span>
            <strong>{clientNumber(request.comments.length, locale)}</strong>
          </div>
        </div>
      </section>

      <nav className="client-detail-tabs" aria-label={t.requestJourney}>
        <a href="#client-summary">{t.requestSnapshot}</a>
        <a href="#client-deliverables">{t.nextAction}</a>
        <a href="#client-documents">{t.documents}</a>
        <a href="#client-timeline">{t.requestProgress}</a>
      </nav>

      <section className="client-action-grid">
        <article className="client-action-panel" id="client-deliverables">
          <div className="client-panel-heading">
            <div>
              <p className="eyebrow">{t.deliverables}</p>
              <h2>{t.deliverablesShared}</h2>
            </div>
            <StatusChip
              status={outputsAwaitingDecision.length > 0 ? "WAITING_CLIENT" : request.status}
              label={requestStatusLabel(request.status, locale)}
            />
          </div>
          <div className="client-card-list">
            {sharedOutputs.length === 0 ? (
              <p>{t.noOutputs}</p>
            ) : (
              sharedOutputs.map((output) => (
                <article className="client-output-card" key={output.id}>
                  <div className="entity-card-heading">
                    <div>
                      <strong>{localizedFreeText(output.title, locale, t.deliverables)}</strong>
                      <small>
                        {t.revision} {clientNumber(output.revision, locale)}
                      </small>
                    </div>
                    <StatusChip
                      status={output.status}
                      label={outputStatusLabel(output.status, locale)}
                    />
                  </div>
                  <dl className="quote-definition-list">
                    <div>
                      <dt>{t.shared}</dt>
                      <dd>{clientDateTime(output.sharedAt, locale)}</dd>
                    </div>
                    <div>
                      <dt>{t.decision}</dt>
                      <dd>{clientDateTime(output.clientDecidedAt, locale)}</dd>
                    </div>
                  </dl>
                  {output.description && (
                    <p>{safeSystemText(output.description, t.attachmentHint, locale)}</p>
                  )}
                  {output.clientReturnReason && (
                    <p>
                      {t.returnedNote}:{" "}
                      {safeSystemText(output.clientReturnReason, t.returnNote, locale)}
                    </p>
                  )}
                  {output.attachments.length > 0 && (
                    <div className="os-file-list">
                      {output.attachments.map((file) => (
                        <FileCard
                          key={file.id}
                          locale={locale}
                          downloadLabel={t.downloadFile}
                          file={{
                            id: file.id,
                            downloadUrl: file.downloadUrl,
                            mimeType: file.mimeType,
                            name: file.originalName,
                            sizeBytes: file.sizeBytes,
                            version: file.version,
                          }}
                        />
                      ))}
                    </div>
                  )}
                  <p>{outputActionCopy(output.status, locale)}</p>
                  {output.status === "SHARED_WITH_CLIENT" ? (
                    <div className="client-decision-bar">
                      <button
                        className="os-button os-button-primary"
                        disabled={saving}
                        type="button"
                        onClick={() => acceptOutput(output.id)}
                      >
                        {t.acceptOutput}
                      </button>
                      <input
                        aria-label={t.returnNote}
                        placeholder={t.returnNote}
                        value={returnReason}
                        onChange={(event) => setReturnReason(event.target.value)}
                      />
                      <button
                        className="os-button os-button-secondary"
                        disabled={saving || !returnReason.trim()}
                        type="button"
                        onClick={() => returnOutput(output.id)}
                      >
                        {t.returnOutput}
                      </button>
                    </div>
                  ) : (
                    <p>{t.noDecision}</p>
                  )}
                </article>
              ))
            )}
          </div>
        </article>

        <article className="client-action-panel" id="client-documents">
          <div className="client-panel-heading">
            <div>
              <p className="eyebrow">{t.documents}</p>
              <h2>{t.requestDocuments}</h2>
            </div>
            <StatusChip
              status={requestedDocuments.length > 0 ? "WAITING_CLIENT" : request.status}
              label={
                requestedDocuments.length > 0
                  ? t.uploadRequired
                  : requestStatusLabel(request.status, locale)
              }
            />
          </div>
          {requestedDocuments.length === 0 ? (
            <p>{t.noDocumentUpload}</p>
          ) : (
            <form className="catalog-form client-upload-form" noValidate onSubmit={submitUpload}>
              <label>
                {t.request}
                <select
                  required
                  value={selectedDocumentRequestId}
                  onChange={(event) =>
                    setUploadForm({ ...uploadForm, documentRequestId: event.target.value })
                  }
                >
                  <option value="">{t.selectDocument}</option>
                  {requestedDocuments.map((documentRequest) => (
                    <option key={documentRequest.id} value={documentRequest.id}>
                      {safeSystemText(documentRequest.title, t.requestDocuments, locale)}
                    </option>
                  ))}
                </select>
              </label>
              {selectedDocumentRequest && (
                <div className="form-span">
                  <p>
                    {safeSystemText(
                      selectedDocumentRequest.instructions,
                      t.documentInstructionsFallback,
                      locale,
                    )}
                  </p>
                </div>
              )}
              <label className="client-file-drop form-span">
                <input type="file" onChange={(event) => void selectUploadFile(event)} />
                <span>{t.chooseFile}</span>
                <small>{fileProcessing ? t.fileProcessing : t.fileUploadHint}</small>
              </label>
              {uploadForm.originalName && (
                <div className="client-upload-preview form-span">
                  <strong>{t.fileReady}</strong>
                  <span>
                    {uploadForm.originalName} -{" "}
                    {fileSize(Number(uploadForm.sizeBytes || 0), locale)}
                  </span>
                </div>
              )}
              <label>
                {t.fileName}
                <input
                  required
                  value={uploadForm.originalName}
                  onChange={(event) =>
                    setUploadForm({ ...uploadForm, originalName: event.target.value })
                  }
                />
              </label>
              <label>
                {t.mimeType}
                <input
                  required
                  value={uploadForm.mimeType}
                  onChange={(event) =>
                    setUploadForm({ ...uploadForm, mimeType: event.target.value })
                  }
                />
              </label>
              <label>
                {t.fileSizeBytes}
                <input
                  required
                  min="1"
                  type="number"
                  value={uploadForm.sizeBytes}
                  onChange={(event) =>
                    setUploadForm({ ...uploadForm, sizeBytes: event.target.value })
                  }
                />
              </label>
              <label className="form-span">
                {t.fileFingerprint}
                <input
                  required
                  minLength={64}
                  maxLength={64}
                  value={uploadForm.sha256}
                  onChange={(event) => setUploadForm({ ...uploadForm, sha256: event.target.value })}
                />
              </label>
              <button className="os-button os-button-primary" type="submit" disabled={saving}>
                {t.metadataUpload}
              </button>
            </form>
          )}
          <div className="client-card-list">
            {request.documentRequests.length === 0 ? (
              <p>{t.noDocuments}</p>
            ) : (
              request.documentRequests.map((documentRequest) => (
                <article className="client-document-card" key={documentRequest.id}>
                  <div className="entity-card-heading">
                    <div>
                      <strong>
                        {safeSystemText(documentRequest.title, t.requestDocuments, locale)}
                      </strong>
                      <small>
                        {t.due} {clientDateTime(documentRequest.dueAt, locale)}
                      </small>
                    </div>
                    <StatusChip
                      status={documentRequest.status}
                      label={documentStatusLabel(documentRequest.status, locale)}
                    />
                  </div>
                  <p>{documentActionCopy(documentRequest.status, locale)}</p>
                  {documentRequest.instructions && (
                    <p>
                      {safeSystemText(
                        documentRequest.instructions,
                        t.documentInstructionsFallback,
                        locale,
                      )}
                    </p>
                  )}
                  {documentRequest.file && (
                    <div className="os-file-list">
                      <FileCard
                        locale={locale}
                        downloadLabel={t.downloadFile}
                        readyLabel={t.uploaded}
                        file={{
                          id: documentRequest.file.id,
                          downloadUrl: documentRequest.file.downloadUrl,
                          mimeType: documentRequest.file.mimeType,
                          name: documentRequest.file.originalName,
                          sizeBytes: documentRequest.file.sizeBytes,
                          version: documentRequest.file.version,
                        }}
                        actions={
                          documentRequest.status === "UPLOADED" && isActiveRequest ? (
                            <button
                              className="os-button os-button-secondary"
                              disabled={saving}
                              type="button"
                              onClick={() => {
                                if (documentRequest.file)
                                  archiveAttachment(documentRequest.file.id);
                              }}
                            >
                              {t.archiveAttachment}
                            </button>
                          ) : null
                        }
                      />
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="client-request-context-grid">
        <article className="client-context-panel" id="client-summary">
          <h2>{t.requestSnapshot}</h2>
          <dl className="quote-definition-list">
            <div>
              <dt>{t.service}</dt>
              <dd>{clientName(request.service.monthlyService, locale)}</dd>
            </div>
            <div>
              <dt>{t.package}</dt>
              <dd>{clientLabel(request.service.serviceLevel, locale)}</dd>
            </div>
            <div>
              <dt>{t.serviceItem}</dt>
              <dd>
                {request.serviceItem
                  ? clientName(request.serviceItem, locale)
                  : t.generalServiceItem}
              </dd>
            </div>
            <div>
              <dt>{t.due}</dt>
              <dd>{request.dueAt ? clientDateTime(request.dueAt, locale) : t.noDueDate}</dd>
            </div>
          </dl>
          <p>{localizedFreeText(request.description, locale, t.requestDetail)}</p>
        </article>

        <article className="client-context-panel" id="client-timeline">
          <h2>{t.requestProgress}</h2>
          <ActivityTimeline
            empty={t.noActionBody}
            items={clientTimeline.map((item, index) => ({
              id: item.id,
              title: item.label,
              meta: clientDateTime(item.at, locale),
              description: item.detail,
              tone: index === 0 ? "accent" : "success",
            }))}
          />
        </article>

        <article className="client-context-panel">
          <h2>{t.visibleAttachments}</h2>
          <div className="os-file-list">
            {request.attachments.length === 0 ? (
              <p>{t.noAttachments}</p>
            ) : (
              request.attachments.map((file) => (
                <FileCard
                  key={file.id}
                  locale={locale}
                  downloadLabel={t.downloadFile}
                  file={{
                    id: file.id,
                    downloadUrl: file.downloadUrl,
                    mimeType: file.mimeType,
                    name: file.originalName,
                    sizeBytes: file.sizeBytes,
                    version: file.version,
                  }}
                />
              ))
            )}
          </div>
        </article>
      </section>

      {request.templateResponse && (
        <section className="client-context-panel">
          <h2>{t.submittedAnswers}</h2>
          <p>
            {t.completeness}:{" "}
            <StatusChip
              status={request.templateResponse.completenessStatus}
              label={requestStatusLabel(request.templateResponse.completenessStatus, locale)}
            />
          </p>
          <div className="activity-list">
            {request.templateResponse.answers.length === 0 ? (
              <p>{t.noStructuredAnswers}</p>
            ) : (
              request.templateResponse.answers.map((answer) => (
                <article key={answer.id}>
                  <strong>
                    {locale === "ar"
                      ? answer.labelAr || answer.labelEn
                      : answer.labelEn || answer.labelAr}
                  </strong>
                  <small>{templateFieldTypeLabel(answer.fieldType, locale)}</small>
                  <p>{answerValue(answer.value, locale)}</p>
                </article>
              ))
            )}
          </div>
        </section>
      )}

      <section className="client-context-panel client-comments-panel" id="client-comments">
        <h2>{t.comments}</h2>
        <form className="catalog-form" noValidate onSubmit={submit}>
          <label className="form-span">
            {t.addCommentLabel}
            <textarea required value={body} onChange={(event) => setBody(event.target.value)} />
          </label>
          <button className="os-button os-button-primary" type="submit" disabled={saving}>
            {t.addComment}
          </button>
        </form>
        <div className="activity-list">
          {request.comments.length === 0 ? (
            <p>{t.noComments}</p>
          ) : (
            request.comments.map((comment) => (
              <article key={comment.id}>
                <strong>{userDisplayWithRole(comment.author, t.teamMessage, locale)}</strong>
                <small>{clientDateTime(comment.createdAt, locale)}</small>
                <p>{comment.body}</p>
              </article>
            ))
          )}
        </div>
      </section>
    </>
  );
}
