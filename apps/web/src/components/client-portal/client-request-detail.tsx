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

function dateTime(value: string | null): string {
  return formatRiyadhDateTime(value);
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
    void run(async () => {
      const updated = await uploadClientRequestedDocument(
        request.id,
        uploadForm.documentRequestId,
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
      return updated;
    });
  }

  const sharedOutputs = request.outputs.filter((output) =>
    ["SHARED_WITH_CLIENT", "ACCEPTED_BY_CLIENT", "RETURNED_BY_CLIENT", "CLOSED"].includes(
      output.status,
    ),
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
  const isActiveRequest = activeClientRequestStatuses.includes(request.status);

  return (
    <>
      <header className="catalog-header">
        <div>
          <p className="eyebrow">Request detail</p>
          <h1>{request.title}</h1>
          <p>
            {request.requestNumber} · {request.service.monthlyService.nameEn}
          </p>
        </div>
        <div className="quote-header-actions">
          <span className={`status-badge status-${request.status.toLowerCase()}`}>
            {request.status}
          </span>
          <Link className="button-secondary" href="/client/requests">
            Back to requests
          </Link>
        </div>
      </header>

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
        <article className="catalog-panel">
          <h2>Shared outputs</h2>
          <div className="activity-list">
            {sharedOutputs.length === 0 ? (
              <p>No shared outputs yet.</p>
            ) : (
              sharedOutputs.map((output) => (
                <article key={output.id}>
                  <strong>{output.title}</strong>
                  <small>
                    {output.status} · shared {dateTime(output.sharedAt)}
                  </small>
                  {output.description && <p>{output.description}</p>}
                  {output.clientReturnReason && <p>Return note: {output.clientReturnReason}</p>}
                  {output.status === "SHARED_WITH_CLIENT" ? (
                    <div className="row-actions">
                      <button
                        className="button-secondary"
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
                        className="button-secondary"
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

        <article className="catalog-panel">
          <h2>Requested documents</h2>
          {requestedDocuments.length === 0 ? (
            <p>No document upload is currently required from you.</p>
          ) : (
            <form className="catalog-form" onSubmit={submitUpload}>
              <label>
                Request
                <select
                  required
                  value={uploadForm.documentRequestId}
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
              <button className="button-primary" type="submit" disabled={saving}>
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
                  <strong>{documentRequest.title}</strong>
                  <small>
                    {documentRequest.status} · due {dateTime(documentRequest.dueAt)}
                  </small>
                  {documentRequest.instructions && <p>{documentRequest.instructions}</p>}
                  {documentRequest.file && <p>Uploaded: {documentRequest.file.originalName}</p>}
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
            <span
              className={`status-badge status-${request.templateResponse.completenessStatus.toLowerCase()}`}
            >
              {request.templateResponse.completenessStatus}
            </span>
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
          <button className="button-primary" type="submit" disabled={saving}>
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
