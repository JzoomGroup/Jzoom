"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { addClientRequestComment, requestErrorMessage } from "../../lib/request-client";
import type { ServiceRequest } from "../../lib/request-types";

function dateTime(value: string | null): string {
  return value ? new Date(value).toLocaleString("en-SA") : "Not set";
}

export function ClientRequestDetail({ request: initialRequest }: { request: ServiceRequest }) {
  const [request, setRequest] = useState(initialRequest);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await addClientRequestComment(request.id, body);
      setRequest(updated);
      setBody("");
    } catch (caught) {
      setError(requestErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

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
