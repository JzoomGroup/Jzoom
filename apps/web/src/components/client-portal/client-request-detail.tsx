"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import {
  acceptClientRequestOutput,
  addClientRequestComment,
  requestErrorMessage,
  returnClientRequestOutput,
  uploadClientRequestedDocument,
} from "../../lib/request-client";
import type { ServiceRequest } from "../../lib/request-types";
import { formatRiyadhDateTime } from "../../lib/stable-date";
import { PageHeader, StatusChip } from "../premium-os";

type ClientDocumentStatus = ServiceRequest["documentRequests"][number]["status"];
type ClientOutputStatus = ServiceRequest["outputs"][number]["status"];

function dateTime(value: string | null): string {
  return formatRiyadhDateTime(value);
}

function fileSize(sizeBytes: number): string {
  if (sizeBytes >= 1_000_000) {
    return `${(sizeBytes / 1_000_000).toFixed(1)} MB`;
  }

  if (sizeBytes >= 1_000) {
    return `${(sizeBytes / 1_000).toFixed(1)} KB`;
  }

  return `${sizeBytes} bytes`;
}

function outputStatusLabel(status: ClientOutputStatus): string {
  switch (status) {
    case "SHARED_WITH_CLIENT":
      return "Waiting for your review";
    case "ACCEPTED_BY_CLIENT":
      return "Accepted by you";
    case "RETURNED_BY_CLIENT":
      return "Returned for revision";
    case "CLOSED":
      return "Closed";
    case "APPROVED_INTERNAL":
      return "Approved internally";
    case "INTERNAL_REVIEW":
      return "Under Jzoom review";
    case "REVISION_REQUESTED":
      return "Revision requested";
    case "DRAFT":
    default:
      return "Draft";
  }
}

function outputActionCopy(status: ClientOutputStatus): string {
  switch (status) {
    case "SHARED_WITH_CLIENT":
      return "Please review this deliverable and either accept it or return it with comments.";
    case "ACCEPTED_BY_CLIENT":
      return "You accepted this deliverable. No further action is needed.";
    case "RETURNED_BY_CLIENT":
      return "Jzoom has your return note and will prepare the next revision.";
    case "CLOSED":
      return "This deliverable is closed and kept here for reference.";
    default:
      return "This deliverable is not waiting for a client decision.";
  }
}

function documentStatusLabel(status: ClientDocumentStatus): string {
  switch (status) {
    case "REQUESTED":
      return "Upload required";
    case "UPLOADED":
      return "Uploaded";
    case "CLOSED":
      return "Accepted";
    case "CANCELLED":
    default:
      return "Cancelled";
  }
}

function documentActionCopy(status: ClientDocumentStatus): string {
  switch (status) {
    case "REQUESTED":
      return "Upload the requested document so Jzoom can continue the work.";
    case "UPLOADED":
      return "Your upload is with Jzoom for review.";
    case "CLOSED":
      return "This document request has been accepted and closed.";
    case "CANCELLED":
    default:
      return "This document request is no longer active.";
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

export function ClientRequestDetail({ request: initialRequest }: { request: ServiceRequest }) {
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
  const [saving, setSaving] = useState(false);
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
    void run(() => acceptClientRequestOutput(request.id, outputId));
  }

  function returnOutput(outputId: string) {
    void run(async () => {
      const updated = await returnClientRequestOutput(request.id, outputId, returnReason);
      setReturnReason("");
      return updated;
    });
  }

  function submitUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDocumentRequestId) {
      setError("Select a requested document before uploading.");
      return;
    }

    void run(async () => {
      const updated = await uploadClientRequestedDocument(request.id, selectedDocumentRequestId, {
        mimeType: uploadForm.mimeType,
        originalName: uploadForm.originalName,
        sha256: uploadForm.sha256,
        sizeBytes: Number(uploadForm.sizeBytes),
      });
      setUploadForm({
        documentRequestId: "",
        mimeType: "",
        originalName: "",
        sha256: "",
        sizeBytes: "1",
      });
      return updated;
    });
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
  const nextActions = [
    ...(outputsAwaitingDecision.length > 0
      ? [`Review ${outputsAwaitingDecision.length} shared deliverable(s).`]
      : []),
    ...(requestedDocuments.length > 0
      ? [`Upload ${requestedDocuments.length} requested document(s).`]
      : []),
    ...(request.status === "WAITING_CLIENT"
      ? ["Jzoom is waiting for your response on this request."]
      : []),
  ];
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
      ? { href: "#client-deliverables", label: "Review deliverables" }
      : requestedDocuments.length > 0
        ? { href: "#client-documents", label: "Upload documents" }
        : null;
  const isActiveRequest = activeClientRequestStatuses.includes(request.status);

  return (
    <>
      <PageHeader
        eyebrow="Request detail"
        title={request.title}
        description={`${request.requestNumber} - ${request.service.monthlyService.nameEn}`}
        meta={<StatusChip status={request.status} label={request.status} />}
      >
        <div className="quote-header-actions">
          <Link className="os-button os-button-secondary" href="/client/requests">
            Back to requests
          </Link>
        </div>
      </PageHeader>

      {error && <p className="form-error">{error}</p>}

      <section className="catalog-panel">
        <p className="eyebrow">Request action center</p>
        <h2>{isActiveRequest ? "Work in progress" : "Request completed"}</h2>
        <div className="pricing-total-grid">
          <div>
            <span>Deliverables to review</span>
            <strong>{outputsAwaitingDecision.length}</strong>
          </div>
          <div>
            <span>Requested documents</span>
            <strong>{requestedDocuments.length}</strong>
          </div>
          <div>
            <span>Uploaded documents</span>
            <strong>{uploadedDocuments.length}</strong>
          </div>
          <div>
            <span>Visible attachments</span>
            <strong>{request.attachments.length}</strong>
          </div>
          <div className="primary">
            <span>Comments</span>
            <strong>{request.comments.length}</strong>
          </div>
        </div>
        <div className="activity-list">
          {nextActions.length === 0 ? (
            <article>
              <strong>No action is pending from you.</strong>
              <p>Jzoom will share updates here when your review or documents are needed.</p>
            </article>
          ) : (
            nextActions.map((action) => (
              <article key={action}>
                <strong>Next action</strong>
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
              View all requests
            </Link>
          )}
        </div>
      </section>

      <section className="quote-summary-grid">
        <article className="catalog-panel">
          <h2>Service context</h2>
          <dl className="quote-definition-list">
            <div>
              <dt>Service</dt>
              <dd>{request.service.monthlyService.nameEn}</dd>
            </div>
            <div>
              <dt>Package</dt>
              <dd>{request.service.serviceLevel.labelEn ?? request.service.serviceLevel.code}</dd>
            </div>
            <div>
              <dt>Service item</dt>
              <dd>{request.serviceItem?.nameEn ?? "General service request"}</dd>
            </div>
            <div>
              <dt>Due</dt>
              <dd>{dateTime(request.dueAt)}</dd>
            </div>
          </dl>
          <p>{request.description}</p>
        </article>

        <article className="catalog-panel">
          <h2>Visible attachments</h2>
          <div className="activity-list">
            {request.attachments.length === 0 ? (
              <p>No client-visible attachment metadata yet.</p>
            ) : (
              request.attachments.map((file) => (
                <article key={file.id}>
                  <strong>{file.originalName}</strong>
                  <small>
                    {file.mimeType} · {file.sizeBytes} bytes
                  </small>
                </article>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="quote-summary-grid">
        <article className="catalog-panel" id="client-deliverables">
          <p className="eyebrow">Deliverables</p>
          <h2>Work shared with you</h2>
          <div className="activity-list">
            {sharedOutputs.length === 0 ? (
              <p>No shared outputs yet.</p>
            ) : (
              sharedOutputs.map((output) => (
                <article key={output.id}>
                  <div className="entity-card-heading">
                    <div>
                      <strong>{output.title}</strong>
                      <small>Revision {output.revision}</small>
                    </div>
                    <StatusChip status={output.status} label={outputStatusLabel(output.status)} />
                  </div>
                  <dl className="quote-definition-list">
                    <div>
                      <dt>Shared</dt>
                      <dd>{dateTime(output.sharedAt)}</dd>
                    </div>
                    <div>
                      <dt>Decision</dt>
                      <dd>{dateTime(output.clientDecidedAt)}</dd>
                    </div>
                  </dl>
                  {output.description && <p>{output.description}</p>}
                  {output.clientReturnReason && <p>Return note: {output.clientReturnReason}</p>}
                  <p>{outputActionCopy(output.status)}</p>
                  {output.status === "SHARED_WITH_CLIENT" ? (
                    <div className="row-actions">
                      <button
                        className="os-button os-button-secondary"
                        disabled={saving}
                        type="button"
                        onClick={() => acceptOutput(output.id)}
                      >
                        Accept output
                      </button>
                      <input
                        aria-label="Return note"
                        placeholder="Return note"
                        value={returnReason}
                        onChange={(event) => setReturnReason(event.target.value)}
                      />
                      <button
                        className="os-button os-button-secondary"
                        disabled={saving || !returnReason.trim()}
                        type="button"
                        onClick={() => returnOutput(output.id)}
                      >
                        Return output
                      </button>
                    </div>
                  ) : (
                    <p>This deliverable is no longer waiting for a client decision.</p>
                  )}
                </article>
              ))
            )}
          </div>
        </article>

        <article className="catalog-panel" id="client-documents">
          <p className="eyebrow">Documents</p>
          <h2>Requested documents</h2>
          {requestedDocuments.length === 0 ? (
            <p>No document upload is currently required from you.</p>
          ) : (
            <form className="catalog-form" onSubmit={submitUpload}>
              <label>
                Request
                <select
                  required
                  value={selectedDocumentRequestId}
                  onChange={(event) =>
                    setUploadForm({ ...uploadForm, documentRequestId: event.target.value })
                  }
                >
                  <option value="">Select request</option>
                  {requestedDocuments.map((documentRequest) => (
                    <option key={documentRequest.id} value={documentRequest.id}>
                      {documentRequest.title}
                    </option>
                  ))}
                </select>
              </label>
              {selectedDocumentRequest && (
                <div className="form-span">
                  <p>
                    {selectedDocumentRequest.instructions ??
                      "Upload the requested document metadata for Jzoom review."}
                  </p>
                </div>
              )}
              <label>
                File name
                <input
                  required
                  value={uploadForm.originalName}
                  onChange={(event) =>
                    setUploadForm({ ...uploadForm, originalName: event.target.value })
                  }
                />
              </label>
              <label>
                MIME type
                <input
                  required
                  value={uploadForm.mimeType}
                  onChange={(event) =>
                    setUploadForm({ ...uploadForm, mimeType: event.target.value })
                  }
                />
              </label>
              <label>
                Size bytes
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
                SHA-256
                <input
                  required
                  minLength={64}
                  maxLength={64}
                  value={uploadForm.sha256}
                  onChange={(event) => setUploadForm({ ...uploadForm, sha256: event.target.value })}
                />
              </label>
              <button className="os-button os-button-primary" type="submit" disabled={saving}>
                Upload metadata
              </button>
            </form>
          )}
          <div className="activity-list">
            {request.documentRequests.length === 0 ? (
              <p>No documents requested yet.</p>
            ) : (
              request.documentRequests.map((documentRequest) => (
                <article key={documentRequest.id}>
                  <div className="entity-card-heading">
                    <div>
                      <strong>{documentRequest.title}</strong>
                      <small>Due {dateTime(documentRequest.dueAt)}</small>
                    </div>
                    <StatusChip
                      status={documentRequest.status}
                      label={documentStatusLabel(documentRequest.status)}
                    />
                  </div>
                  <p>{documentActionCopy(documentRequest.status)}</p>
                  {documentRequest.instructions && <p>{documentRequest.instructions}</p>}
                  {documentRequest.file && (
                    <p>
                      Uploaded: {documentRequest.file.originalName} -{" "}
                      {fileSize(documentRequest.file.sizeBytes)}
                    </p>
                  )}
                </article>
              ))
            )}
          </div>
        </article>
      </section>

      {request.templateResponse && (
        <section className="catalog-panel">
          <h2>Submitted template answers</h2>
          <p>
            Completeness:{" "}
            <StatusChip
              status={request.templateResponse.completenessStatus}
              label={request.templateResponse.completenessStatus}
            />
          </p>
          <div className="activity-list">
            {request.templateResponse.answers.length === 0 ? (
              <p>No client-visible structured answers were submitted.</p>
            ) : (
              request.templateResponse.answers.map((answer) => (
                <article key={answer.id}>
                  <strong>{answer.labelEn}</strong>
                  <small>
                    {answer.fieldCode} · {answer.fieldType}
                  </small>
                  <p>
                    {typeof answer.value === "string" ? answer.value : JSON.stringify(answer.value)}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>
      )}

      <section className="catalog-panel">
        <h2>Comments</h2>
        <form className="catalog-form" onSubmit={submit}>
          <label className="form-span">
            Add comment
            <textarea required value={body} onChange={(event) => setBody(event.target.value)} />
          </label>
          <button className="os-button os-button-primary" type="submit" disabled={saving}>
            Add comment
          </button>
        </form>
        <div className="activity-list">
          {request.comments.length === 0 ? (
            <p>No client-visible comments yet.</p>
          ) : (
            request.comments.map((comment) => (
              <article key={comment.id}>
                <strong>{comment.author.displayName}</strong>
                <small>{dateTime(comment.createdAt)}</small>
                <p>{comment.body}</p>
              </article>
            ))
          )}
        </div>
      </section>
    </>
  );
}
