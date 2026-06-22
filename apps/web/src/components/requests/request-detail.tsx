"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import {
  addAttachmentMetadata,
  addInternalNote,
  addRequestComment,
  assignRequest,
  changeRequestStatus,
  requestErrorMessage,
} from "../../lib/request-client";
import type { RequestStatus, ServiceRequest } from "../../lib/request-types";

const statuses: RequestStatus[] = [
  "NEW",
  "TRIAGE",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_CLIENT",
  "WAITING_SUPERVISOR",
  "COMPLETED",
  "CLOSED",
  "RETURNED",
  "REJECTED",
];

function dateTime(value: string | null): string {
  return value ? new Date(value).toLocaleString("en-SA") : "Not set";
}

function assignee(value: ServiceRequest["assignments"]["specialist"]): string {
  return value ? value.displayName : "Unassigned";
}

function assignmentValue(value: string): string | null | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.toLowerCase() === "clear" ? null : trimmed;
}

export function RequestDetail({ initialRequest }: { initialRequest: ServiceRequest }) {
  const [request, setRequest] = useState(initialRequest);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [statusForm, setStatusForm] = useState({ status: request.status, reason: "" });
  const [assignmentForm, setAssignmentForm] = useState({
    assignedSpecialistId: "",
    assignedSupervisorId: "",
    accountManagerId: "",
    reason: "",
  });
  const [commentForm, setCommentForm] = useState({ body: "", isClientVisible: true });
  const [noteBody, setNoteBody] = useState("");
  const [fileForm, setFileForm] = useState({
    originalName: "",
    mimeType: "",
    sizeBytes: "1",
    sha256: "",
    visibility: "INTERNAL" as "INTERNAL" | "CLIENT_VISIBLE",
  });

  async function run(label: string, action: () => Promise<ServiceRequest>) {
    setSaving(label);
    setError(null);
    try {
      const updated = await action();
      setRequest(updated);
      setStatusForm((current) => ({ ...current, status: updated.status }));
    } catch (caught) {
      setError(requestErrorMessage(caught));
    } finally {
      setSaving(null);
    }
  }

  function submitStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run("status", () =>
      changeRequestStatus(request.id, statusForm.status, statusForm.reason || undefined),
    );
  }

  function submitAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload: Parameters<typeof assignRequest>[1] = {};
    const assignedSpecialistId = assignmentValue(assignmentForm.assignedSpecialistId);
    const assignedSupervisorId = assignmentValue(assignmentForm.assignedSupervisorId);
    const accountManagerId = assignmentValue(assignmentForm.accountManagerId);
    if (assignedSpecialistId !== undefined) payload.assignedSpecialistId = assignedSpecialistId;
    if (assignedSupervisorId !== undefined) payload.assignedSupervisorId = assignedSupervisorId;
    if (accountManagerId !== undefined) payload.accountManagerId = accountManagerId;
    if (assignmentForm.reason) payload.reason = assignmentForm.reason;
    void run("assignment", () => assignRequest(request.id, payload));
  }

  function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run("comment", async () => {
      const updated = await addRequestComment(
        request.id,
        commentForm.body,
        commentForm.isClientVisible,
      );
      setCommentForm({ body: "", isClientVisible: true });
      return updated;
    });
  }

  function submitNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run("note", async () => {
      const updated = await addInternalNote(request.id, noteBody);
      setNoteBody("");
      return updated;
    });
  }

  function submitAttachment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run("attachment", async () => {
      const updated = await addAttachmentMetadata(request.id, {
        originalName: fileForm.originalName,
        mimeType: fileForm.mimeType,
        sizeBytes: Number(fileForm.sizeBytes),
        sha256: fileForm.sha256,
        visibility: fileForm.visibility,
      });
      setFileForm({
        originalName: "",
        mimeType: "",
        sizeBytes: "1",
        sha256: "",
        visibility: "INTERNAL",
      });
      return updated;
    });
  }

  return (
    <>
      <header className="catalog-header">
        <div>
          <p className="eyebrow">Request detail</p>
          <h1>{request.title}</h1>
          <p>
            {request.requestNumber} · {request.client.name} ·{" "}
            {request.service.monthlyService.nameEn}
          </p>
        </div>
        <div className="quote-header-actions">
          <span className={`status-badge status-${request.status.toLowerCase()}`}>
            {request.status}
          </span>
          <Link className="button-secondary" href="/requests">
            Back to requests
          </Link>
        </div>
      </header>

      {error && <p className="form-error">{error}</p>}

      <section className="quote-summary-grid">
        <article className="catalog-panel">
          <h2>Request context</h2>
          <dl className="quote-definition-list">
            <div>
              <dt>Client</dt>
              <dd>{request.client.name}</dd>
            </div>
            <div>
              <dt>Service</dt>
              <dd>{request.service.monthlyService.nameEn}</dd>
            </div>
            <div>
              <dt>Package</dt>
              <dd>{request.service.serviceLevel.labelEn ?? request.service.serviceLevel.code}</dd>
            </div>
            <div>
              <dt>Hours</dt>
              <dd>{request.service.hoursAllocated}</dd>
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
          <h2>Assignments</h2>
          <dl className="quote-definition-list">
            <div>
              <dt>Specialist</dt>
              <dd>{assignee(request.assignments.specialist)}</dd>
            </div>
            <div>
              <dt>Supervisor</dt>
              <dd>{assignee(request.assignments.supervisor)}</dd>
            </div>
            <div>
              <dt>Account manager</dt>
              <dd>{assignee(request.assignments.accountManager)}</dd>
            </div>
          </dl>
          <form className="catalog-form" onSubmit={submitAssignment}>
            <label>
              Specialist ID
              <input
                placeholder="UUID or clear"
                value={assignmentForm.assignedSpecialistId}
                onChange={(event) =>
                  setAssignmentForm({
                    ...assignmentForm,
                    assignedSpecialistId: event.target.value,
                  })
                }
              />
            </label>
            <label>
              Supervisor ID
              <input
                placeholder="UUID or clear"
                value={assignmentForm.assignedSupervisorId}
                onChange={(event) =>
                  setAssignmentForm({
                    ...assignmentForm,
                    assignedSupervisorId: event.target.value,
                  })
                }
              />
            </label>
            <label>
              Account manager ID
              <input
                placeholder="UUID or clear"
                value={assignmentForm.accountManagerId}
                onChange={(event) =>
                  setAssignmentForm({ ...assignmentForm, accountManagerId: event.target.value })
                }
              />
            </label>
            <label>
              Reason
              <input
                value={assignmentForm.reason}
                onChange={(event) =>
                  setAssignmentForm({ ...assignmentForm, reason: event.target.value })
                }
              />
            </label>
            <button className="button-primary" type="submit" disabled={saving === "assignment"}>
              Save assignment
            </button>
          </form>
        </article>
      </section>

      <section className="catalog-panel">
        <h2>Lifecycle</h2>
        <form className="catalog-form" onSubmit={submitStatus}>
          <label>
            Status
            <select
              value={statusForm.status}
              onChange={(event) =>
                setStatusForm({ ...statusForm, status: event.target.value as RequestStatus })
              }
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label>
            Reason
            <input
              value={statusForm.reason}
              onChange={(event) => setStatusForm({ ...statusForm, reason: event.target.value })}
            />
          </label>
          <button className="button-primary" type="submit" disabled={saving === "status"}>
            Update status
          </button>
        </form>
      </section>

      <section className="quote-summary-grid">
        <article className="catalog-panel">
          <h2>Comments</h2>
          <form className="catalog-form" onSubmit={submitComment}>
            <label className="form-span">
              Comment
              <textarea
                required
                value={commentForm.body}
                onChange={(event) => setCommentForm({ ...commentForm, body: event.target.value })}
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={commentForm.isClientVisible}
                onChange={(event) =>
                  setCommentForm({ ...commentForm, isClientVisible: event.target.checked })
                }
              />
              Visible to client
            </label>
            <button className="button-primary" type="submit" disabled={saving === "comment"}>
              Add comment
            </button>
          </form>
          <div className="activity-list">
            {request.comments.map((comment) => (
              <article key={comment.id}>
                <strong>{comment.author.displayName}</strong>
                <small>
                  {dateTime(comment.createdAt)} ·{" "}
                  {comment.isClientVisible ? "Client-visible" : "Internal-only"}
                </small>
                <p>{comment.body}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="catalog-panel">
          <h2>Internal notes</h2>
          <form className="catalog-form" onSubmit={submitNote}>
            <label className="form-span">
              Note
              <textarea
                required
                value={noteBody}
                onChange={(event) => setNoteBody(event.target.value)}
              />
            </label>
            <button className="button-primary" type="submit" disabled={saving === "note"}>
              Add internal note
            </button>
          </form>
          <div className="activity-list">
            {request.internalNotes.map((note) => (
              <article key={note.id}>
                <strong>{note.author.displayName}</strong>
                <small>{dateTime(note.createdAt)}</small>
                <p>{note.body}</p>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="quote-summary-grid">
        <article className="catalog-panel">
          <h2>Attachment metadata</h2>
          <form className="catalog-form" onSubmit={submitAttachment}>
            <label>
              Original name
              <input
                required
                value={fileForm.originalName}
                onChange={(event) => setFileForm({ ...fileForm, originalName: event.target.value })}
              />
            </label>
            <label>
              MIME type
              <input
                required
                value={fileForm.mimeType}
                onChange={(event) => setFileForm({ ...fileForm, mimeType: event.target.value })}
              />
            </label>
            <label>
              Size bytes
              <input
                required
                min="1"
                type="number"
                value={fileForm.sizeBytes}
                onChange={(event) => setFileForm({ ...fileForm, sizeBytes: event.target.value })}
              />
            </label>
            <label>
              SHA-256
              <input
                required
                minLength={64}
                maxLength={64}
                value={fileForm.sha256}
                onChange={(event) => setFileForm({ ...fileForm, sha256: event.target.value })}
              />
            </label>
            <label>
              Visibility
              <select
                value={fileForm.visibility}
                onChange={(event) =>
                  setFileForm({
                    ...fileForm,
                    visibility: event.target.value as typeof fileForm.visibility,
                  })
                }
              >
                <option value="INTERNAL">Internal</option>
                <option value="CLIENT_VISIBLE">Client visible</option>
              </select>
            </label>
            <button className="button-primary" type="submit" disabled={saving === "attachment"}>
              Add metadata
            </button>
          </form>
          <div className="activity-list">
            {request.attachments.map((file) => (
              <article key={file.id}>
                <strong>{file.originalName}</strong>
                <small>
                  {file.mimeType} · {file.sizeBytes} bytes · {file.visibility}
                </small>
              </article>
            ))}
          </div>
        </article>

        <article className="catalog-panel">
          <h2>Activity</h2>
          <div className="activity-list">
            {request.activity.map((event) => (
              <article key={event.id}>
                <strong>
                  {event.fromState?.code ?? "START"} → {event.toState.code}
                </strong>
                <small>
                  {dateTime(event.occurredAt)} · {event.actorRole}
                </small>
                {event.reason && <p>{event.reason}</p>}
              </article>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}
