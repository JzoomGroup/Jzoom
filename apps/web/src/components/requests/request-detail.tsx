"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import {
  addAttachmentMetadata,
  addInternalNote,
  addRequestComment,
  assignRequest,
  changeRequestStatus,
  changeClientDocumentRequestStatus,
  createRequestOutput,
  createRequestTask,
  createRequestTimeEntry,
  closeRequestOutput,
  requestErrorMessage,
  requestClientDocument,
  reviewRequestOutput,
  reviewRequestTimeEntry,
  shareRequestOutput,
  startRequestWork,
  submitRequestOutput,
  submitRequestTimeEntry,
  supervisorReviewRequest,
  updateRequestTask,
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
  const [taskForm, setTaskForm] = useState({
    assigneeId: "",
    description: "",
    dueAt: "",
    priority: "NORMAL" as "LOW" | "NORMAL" | "HIGH" | "URGENT",
    title: "",
  });
  const [outputForm, setOutputForm] = useState({
    code: "",
    description: "",
    title: "",
  });
  const [documentForm, setDocumentForm] = useState({
    dueAt: "",
    instructions: "",
    title: "",
  });
  const [timeForm, setTimeForm] = useState({
    billable: true,
    hours: "1",
    notes: "",
    workDate: new Date().toISOString().slice(0, 10),
  });
  const [reviewReason, setReviewReason] = useState("");
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

  function startWork() {
    void run("start", () => startRequestWork(request.id));
  }

  function supervisorAction(action: "APPROVE" | "RETURN" | "REJECT" | "ESCALATE") {
    void run("supervisor-review", () =>
      supervisorReviewRequest(request.id, action, reviewReason || undefined),
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

  function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload: Parameters<typeof createRequestTask>[1] = {
      title: taskForm.title,
      priority: taskForm.priority,
    };
    if (taskForm.description) payload.description = taskForm.description;
    if (taskForm.assigneeId) payload.assigneeId = taskForm.assigneeId;
    if (taskForm.dueAt) payload.dueAt = new Date(taskForm.dueAt).toISOString();
    void run("task", async () => {
      const updated = await createRequestTask(request.id, payload);
      setTaskForm({
        assigneeId: "",
        description: "",
        dueAt: "",
        priority: "NORMAL",
        title: "",
      });
      return updated;
    });
  }

  function setTaskStatus(
    taskId: string,
    status: "PENDING" | "IN_PROGRESS" | "DONE" | "NOT_APPLICABLE" | "BLOCKED",
  ) {
    void run("task-status", () => updateRequestTask(request.id, taskId, { status }));
  }

  function submitOutput(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run("output", async () => {
      const updated = await createRequestOutput(request.id, {
        code: outputForm.code,
        title: outputForm.title,
        ...(outputForm.description ? { description: outputForm.description } : {}),
      });
      setOutputForm({ code: "", description: "", title: "" });
      return updated;
    });
  }

  function submitOutputForReview(outputId: string) {
    void run("output-submit", () => submitRequestOutput(request.id, outputId));
  }

  function reviewOutput(outputId: string, action: "APPROVE" | "RETURN" | "REJECT") {
    void run("output-review", () =>
      reviewRequestOutput(request.id, outputId, action, reviewReason || undefined),
    );
  }

  function shareOutput(outputId: string) {
    void run("output-share", () =>
      shareRequestOutput(request.id, outputId, reviewReason || undefined),
    );
  }

  function closeOutput(outputId: string) {
    void run("output-close", () =>
      closeRequestOutput(request.id, outputId, reviewReason || undefined),
    );
  }

  function submitDocumentRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run("document-request", async () => {
      const updated = await requestClientDocument(request.id, {
        title: documentForm.title,
        ...(documentForm.instructions ? { instructions: documentForm.instructions } : {}),
        ...(documentForm.dueAt ? { dueAt: new Date(documentForm.dueAt).toISOString() } : {}),
      });
      setDocumentForm({ dueAt: "", instructions: "", title: "" });
      return updated;
    });
  }

  function setDocumentRequestStatus(documentRequestId: string, status: "CANCELLED" | "CLOSED") {
    void run("document-request-status", () =>
      changeClientDocumentRequestStatus(
        request.id,
        documentRequestId,
        status,
        reviewReason || undefined,
      ),
    );
  }

  function submitTimeEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run("time-entry", async () => {
      const updated = await createRequestTimeEntry(request.id, {
        billable: timeForm.billable,
        hours: Number(timeForm.hours),
        workDate: new Date(timeForm.workDate).toISOString(),
        ...(timeForm.notes ? { notes: timeForm.notes } : {}),
      });
      setTimeForm({
        billable: true,
        hours: "1",
        notes: "",
        workDate: new Date().toISOString().slice(0, 10),
      });
      return updated;
    });
  }

  function submitTimeEntryForReview(timeEntryId: string) {
    void run("time-entry-submit", () => submitRequestTimeEntry(request.id, timeEntryId));
  }

  function reviewTimeEntry(timeEntryId: string, action: "APPROVE" | "REJECT") {
    void run("time-entry-review", () =>
      reviewRequestTimeEntry(request.id, timeEntryId, action, reviewReason || undefined),
    );
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
        <div className="row-actions">
          <button className="button-secondary" type="button" onClick={startWork}>
            Start work
          </button>
          <input
            aria-label="Supervisor review reason"
            placeholder="Supervisor review reason"
            value={reviewReason}
            onChange={(event) => setReviewReason(event.target.value)}
          />
          <button
            className="button-secondary"
            type="button"
            onClick={() => supervisorAction("APPROVE")}
          >
            Approve request
          </button>
          <button
            className="button-secondary"
            type="button"
            onClick={() => supervisorAction("RETURN")}
          >
            Return changes
          </button>
          <button
            className="button-danger"
            type="button"
            onClick={() => supervisorAction("REJECT")}
          >
            Reject
          </button>
          <button
            className="button-secondary"
            type="button"
            onClick={() => supervisorAction("ESCALATE")}
          >
            Escalate
          </button>
        </div>
      </section>

      <section className="quote-summary-grid">
        <article className="catalog-panel">
          <h2>Internal checklist</h2>
          <form className="catalog-form" onSubmit={submitTask}>
            <label>
              Task title
              <input
                required
                value={taskForm.title}
                onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })}
              />
            </label>
            <label>
              Assignee ID
              <input
                value={taskForm.assigneeId}
                onChange={(event) => setTaskForm({ ...taskForm, assigneeId: event.target.value })}
              />
            </label>
            <label>
              Priority
              <select
                value={taskForm.priority}
                onChange={(event) =>
                  setTaskForm({
                    ...taskForm,
                    priority: event.target.value as typeof taskForm.priority,
                  })
                }
              >
                {["LOW", "NORMAL", "HIGH", "URGENT"].map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Due at
              <input
                type="datetime-local"
                value={taskForm.dueAt}
                onChange={(event) => setTaskForm({ ...taskForm, dueAt: event.target.value })}
              />
            </label>
            <label className="form-span">
              Description
              <textarea
                value={taskForm.description}
                onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })}
              />
            </label>
            <button className="button-primary" type="submit" disabled={saving === "task"}>
              Add checklist item
            </button>
          </form>
          <div className="activity-list">
            {request.tasks.length === 0 ? (
              <p>No internal checklist items yet.</p>
            ) : (
              request.tasks.map((task) => (
                <article key={task.id}>
                  <strong>{task.title}</strong>
                  <small>
                    {task.status} · {task.priority} · {task.assignee?.displayName ?? "Unassigned"}
                  </small>
                  {task.description && <p>{task.description}</p>}
                  <div className="row-actions">
                    <button
                      className="button-secondary"
                      type="button"
                      onClick={() => setTaskStatus(task.id, "PENDING")}
                    >
                      Pending
                    </button>
                    <button
                      className="button-secondary"
                      type="button"
                      onClick={() => setTaskStatus(task.id, "IN_PROGRESS")}
                    >
                      Start
                    </button>
                    <button
                      className="button-secondary"
                      type="button"
                      onClick={() => setTaskStatus(task.id, "DONE")}
                    >
                      Done
                    </button>
                    <button
                      className="button-secondary"
                      type="button"
                      onClick={() => setTaskStatus(task.id, "NOT_APPLICABLE")}
                    >
                      N/A
                    </button>
                    <button
                      className="button-secondary"
                      type="button"
                      onClick={() => setTaskStatus(task.id, "BLOCKED")}
                    >
                      Blocked
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </article>

        <article className="catalog-panel">
          <h2>Internal outputs</h2>
          <form className="catalog-form" onSubmit={submitOutput}>
            <label>
              Output code
              <input
                required
                value={outputForm.code}
                onChange={(event) => setOutputForm({ ...outputForm, code: event.target.value })}
              />
            </label>
            <label>
              Title
              <input
                required
                value={outputForm.title}
                onChange={(event) => setOutputForm({ ...outputForm, title: event.target.value })}
              />
            </label>
            <label className="form-span">
              Description
              <textarea
                value={outputForm.description}
                onChange={(event) =>
                  setOutputForm({ ...outputForm, description: event.target.value })
                }
              />
            </label>
            <button className="button-primary" type="submit" disabled={saving === "output"}>
              Create internal output
            </button>
          </form>
          <div className="activity-list">
            {request.outputs.length === 0 ? (
              <p>No internal outputs prepared yet.</p>
            ) : (
              request.outputs.map((output) => (
                <article key={output.id}>
                  <strong>
                    {output.code} · {output.title}
                  </strong>
                  <small>
                    {output.status} · created by {output.createdBy?.displayName ?? "Internal user"}
                    {output.reviewedBy ? ` · reviewed by ${output.reviewedBy.displayName}` : ""}
                    {output.sharedAt ? ` · shared ${dateTime(output.sharedAt)}` : ""}
                  </small>
                  {output.description && <p>{output.description}</p>}
                  {output.reviewReason && <p>Review note: {output.reviewReason}</p>}
                  {output.clientReturnReason && (
                    <p>Client return note: {output.clientReturnReason}</p>
                  )}
                  <div className="row-actions">
                    <button
                      className="button-secondary"
                      type="button"
                      onClick={() => submitOutputForReview(output.id)}
                    >
                      Submit
                    </button>
                    <button
                      className="button-secondary"
                      type="button"
                      onClick={() => reviewOutput(output.id, "APPROVE")}
                    >
                      Approve
                    </button>
                    <button
                      className="button-secondary"
                      type="button"
                      onClick={() => reviewOutput(output.id, "RETURN")}
                    >
                      Return
                    </button>
                    <button
                      className="button-danger"
                      type="button"
                      onClick={() => reviewOutput(output.id, "REJECT")}
                    >
                      Reject
                    </button>
                    <button
                      className="button-secondary"
                      type="button"
                      onClick={() => shareOutput(output.id)}
                    >
                      Share with client
                    </button>
                    <button
                      className="button-secondary"
                      type="button"
                      onClick={() => closeOutput(output.id)}
                    >
                      Close delivery
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="quote-summary-grid">
        <article className="catalog-panel">
          <h2>Client document requests</h2>
          <form className="catalog-form" onSubmit={submitDocumentRequest}>
            <label>
              Document title
              <input
                required
                value={documentForm.title}
                onChange={(event) =>
                  setDocumentForm({ ...documentForm, title: event.target.value })
                }
              />
            </label>
            <label>
              Due at
              <input
                type="datetime-local"
                value={documentForm.dueAt}
                onChange={(event) =>
                  setDocumentForm({ ...documentForm, dueAt: event.target.value })
                }
              />
            </label>
            <label className="form-span">
              Instructions
              <textarea
                value={documentForm.instructions}
                onChange={(event) =>
                  setDocumentForm({ ...documentForm, instructions: event.target.value })
                }
              />
            </label>
            <button
              className="button-primary"
              type="submit"
              disabled={saving === "document-request"}
            >
              Request document
            </button>
          </form>
          <div className="activity-list">
            {request.documentRequests.length === 0 ? (
              <p>No client documents requested yet.</p>
            ) : (
              request.documentRequests.map((documentRequest) => (
                <article key={documentRequest.id}>
                  <strong>{documentRequest.title}</strong>
                  <small>
                    {documentRequest.status} · due {dateTime(documentRequest.dueAt)}
                  </small>
                  {documentRequest.instructions && <p>{documentRequest.instructions}</p>}
                  {documentRequest.file && <p>Uploaded: {documentRequest.file.originalName}</p>}
                  <div className="row-actions">
                    <button
                      className="button-secondary"
                      type="button"
                      onClick={() => setDocumentRequestStatus(documentRequest.id, "CLOSED")}
                    >
                      Close
                    </button>
                    <button
                      className="button-danger"
                      type="button"
                      onClick={() => setDocumentRequestStatus(documentRequest.id, "CANCELLED")}
                    >
                      Cancel
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </article>

        <article className="catalog-panel">
          <h2>Basic time entries</h2>
          <form className="catalog-form" onSubmit={submitTimeEntry}>
            <label>
              Work date
              <input
                required
                type="date"
                value={timeForm.workDate}
                onChange={(event) => setTimeForm({ ...timeForm, workDate: event.target.value })}
              />
            </label>
            <label>
              Hours
              <input
                required
                max="24"
                min="0.01"
                step="0.25"
                type="number"
                value={timeForm.hours}
                onChange={(event) => setTimeForm({ ...timeForm, hours: event.target.value })}
              />
            </label>
            <label className="checkbox-label">
              <input
                checked={timeForm.billable}
                type="checkbox"
                onChange={(event) => setTimeForm({ ...timeForm, billable: event.target.checked })}
              />
              Billable
            </label>
            <label className="form-span">
              Note
              <textarea
                value={timeForm.notes}
                onChange={(event) => setTimeForm({ ...timeForm, notes: event.target.value })}
              />
            </label>
            <button className="button-primary" type="submit" disabled={saving === "time-entry"}>
              Add time
            </button>
          </form>
          <div className="activity-list">
            {request.timeEntries.length === 0 ? (
              <p>No time entries yet.</p>
            ) : (
              request.timeEntries.map((entry) => (
                <article key={entry.id}>
                  <strong>
                    {entry.hours}h · {entry.user.displayName}
                  </strong>
                  <small>
                    {entry.status} · {dateTime(entry.workDate)} ·{" "}
                    {entry.billable ? "Billable" : "Non-billable"}
                  </small>
                  {entry.notes && <p>{entry.notes}</p>}
                  {entry.decisionReason && <p>Decision note: {entry.decisionReason}</p>}
                  <div className="row-actions">
                    <button
                      className="button-secondary"
                      type="button"
                      onClick={() => submitTimeEntryForReview(entry.id)}
                    >
                      Submit
                    </button>
                    <button
                      className="button-secondary"
                      type="button"
                      onClick={() => reviewTimeEntry(entry.id, "APPROVE")}
                    >
                      Approve
                    </button>
                    <button
                      className="button-danger"
                      type="button"
                      onClick={() => reviewTimeEntry(entry.id, "REJECT")}
                    >
                      Reject
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </article>
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
