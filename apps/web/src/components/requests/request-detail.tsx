"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
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
import type { CurrentUser } from "../../lib/auth";
import type {
  RequestAssignmentCandidate,
  RequestAssignmentCandidates,
  RequestStatus,
  ServiceRequest,
} from "../../lib/request-types";
import { formatRiyadhDateTime, riyadhDateInputValue } from "../../lib/stable-date";
import { PageHeader, PriorityChip, StatusChip } from "../premium-os";

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

const workflowStages: RequestStatus[] = [
  "NEW",
  "TRIAGE",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_CLIENT",
  "WAITING_SUPERVISOR",
  "COMPLETED",
  "CLOSED",
];

const startableStatuses: RequestStatus[] = [
  "ASSIGNED",
  "WAITING_CLIENT",
  "WAITING_SUPERVISOR",
  "RETURNED",
];

type RequestTaskStatus = ServiceRequest["tasks"][number]["status"];
type RequestOutputStatus = ServiceRequest["outputs"][number]["status"];
type RequestTimeEntryStatus = ServiceRequest["timeEntries"][number]["status"];

const openTaskStatuses: RequestTaskStatus[] = ["PENDING", "TODO", "IN_PROGRESS", "BLOCKED"];
const submittableOutputStatuses: RequestOutputStatus[] = [
  "DRAFT",
  "REVISION_REQUESTED",
  "RETURNED_BY_CLIENT",
];
const closableOutputStatuses: RequestOutputStatus[] = [
  "SHARED_WITH_CLIENT",
  "ACCEPTED_BY_CLIENT",
  "RETURNED_BY_CLIENT",
];
const submittableTimeEntryStatuses: RequestTimeEntryStatus[] = ["DRAFT", "REJECTED"];

function dateTime(value: string | null): string {
  return formatRiyadhDateTime(value);
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

function assignmentCandidateLabel(candidate: RequestAssignmentCandidate): string {
  return `${candidate.displayName} (${candidate.email})`;
}

function hasRole(user: CurrentUser, role: string): boolean {
  return user.roles.includes(role);
}

function userMatches(user: CurrentUser, assigned: ServiceRequest["assignments"]["specialist"]) {
  return assigned?.id === user.id;
}

function hours(entries: ServiceRequest["timeEntries"]): string {
  const total = entries.reduce((sum, entry) => sum + Number(entry.hours), 0);
  return `${total.toFixed(total % 1 === 0 ? 0 : 2)}h`;
}

function roleWorkspace(user: CurrentUser): { title: string; description: string } {
  if (hasRole(user, "ROLE-ADMIN")) {
    return {
      title: "Admin operations control",
      description: "Full request control, assignment, review, delivery, and hours oversight.",
    };
  }
  if (hasRole(user, "ROLE-MGMT")) {
    return {
      title: "Management review",
      description: "Executive visibility with escalation and approval access.",
    };
  }
  if (hasRole(user, "ROLE-SUPERVISOR")) {
    return {
      title: "Supervisor review",
      description: "Quality review, delivery approval, workload, and hours decisions.",
    };
  }
  if (hasRole(user, "ROLE-SPECIALIST")) {
    return {
      title: "Specialist workbench",
      description: "Assigned execution, checklist work, document requests, deliverables, and time.",
    };
  }
  if (hasRole(user, "ROLE-AM")) {
    return {
      title: "Account manager follow-up",
      description: "Client context, relationship notes, document follow-up, and status visibility.",
    };
  }
  return {
    title: "Request workspace",
    description: "Scoped request visibility.",
  };
}

function RequestDetailNav() {
  const sections = [
    ["#request-context", "Summary"],
    ["#request-lifecycle", "Workflow"],
    ["#request-checklist", "Checklist"],
    ["#request-outputs", "Outputs"],
    ["#request-documents", "Documents"],
    ["#request-hours", "Hours"],
    ["#request-notes", "Notes"],
    ["#request-activity", "Activity"],
  ] as const;

  return (
    <nav className="request-detail-nav" aria-label="Request detail sections">
      {sections.map(([href, label]) => (
        <a key={href} href={href}>
          {label}
        </a>
      ))}
    </nav>
  );
}

function RequestSignalCard({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string | number;
}) {
  return (
    <article>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function workflowStageLabel(stage: RequestStatus) {
  return stage
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function WorkflowStepper({ status }: { status: RequestStatus }) {
  const currentIndex = workflowStages.indexOf(status);

  return (
    <section className="request-workflow-stepper" aria-label="Request workflow progress">
      <div className="request-workflow-heading">
        <div>
          <p className="eyebrow">Workflow</p>
          <h2>Operating path</h2>
        </div>
        <StatusChip status={status} label={`Current: ${workflowStageLabel(status)}`} />
      </div>
      <ol>
        {workflowStages.map((stage, index) => {
          const isCurrent = stage === status;
          const isPast = currentIndex > -1 && index < currentIndex;
          return (
            <li
              className={isCurrent ? "current" : isPast ? "done" : undefined}
              key={stage}
              aria-current={isCurrent ? "step" : undefined}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{workflowStageLabel(stage)}</strong>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function RequestDetail({
  assignmentCandidates,
  currentUser,
  initialRequest,
}: {
  assignmentCandidates?: RequestAssignmentCandidates | null;
  currentUser: CurrentUser;
  initialRequest: ServiceRequest;
}) {
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
    workDate: "",
  });
  const [reviewReason, setReviewReason] = useState("");
  const [fileForm, setFileForm] = useState({
    originalName: "",
    mimeType: "",
    sizeBytes: "1",
    sha256: "",
    visibility: "INTERNAL" as "INTERNAL" | "CLIENT_VISIBLE",
  });

  useEffect(() => {
    setTimeForm((current) =>
      current.workDate ? current : { ...current, workDate: riyadhDateInputValue() },
    );
  }, []);

  const hasGlobalOperations =
    hasRole(currentUser, "ROLE-ADMIN") || hasRole(currentUser, "ROLE-MGMT");
  const isSupervisor = hasRole(currentUser, "ROLE-SUPERVISOR");
  const isSpecialist = hasRole(currentUser, "ROLE-SPECIALIST");
  const isAccountManager = hasRole(currentUser, "ROLE-AM");
  const assignedAsSpecialist = userMatches(currentUser, request.assignments.specialist);
  const assignedAsSupervisor = userMatches(currentUser, request.assignments.supervisor);
  const assignedAsAccountManager = userMatches(currentUser, request.assignments.accountManager);
  const assignedTask = request.tasks.some((task) => task.assignee?.id === currentUser.id);
  const canAssign = hasGlobalOperations || isSupervisor;
  const canExecute =
    hasGlobalOperations || (isSpecialist && (assignedAsSpecialist || assignedTask)) || assignedTask;
  const canSupervise = hasGlobalOperations || (isSupervisor && assignedAsSupervisor);
  const canManageLifecycle = hasGlobalOperations || canSupervise;
  const canAddOperationalContext =
    hasGlobalOperations ||
    canExecute ||
    canSupervise ||
    (isAccountManager && assignedAsAccountManager);
  const canRequestDocuments = canAddOperationalContext;
  const canAttachMetadata = canAddOperationalContext;
  const canStartWork = canExecute && startableStatuses.includes(request.status);
  const workspace = roleWorkspace(currentUser);
  const taskAssignmentCandidates = assignmentCandidates
    ? [
        ...new Map(
          [
            ...assignmentCandidates.specialists,
            ...assignmentCandidates.supervisors,
            ...assignmentCandidates.accountManagers,
          ].map((candidate) => [candidate.id, candidate]),
        ).values(),
      ]
    : [];
  const openTasks = request.tasks.filter((task) => openTaskStatuses.includes(task.status));
  const reviewOutputs = request.outputs.filter((output) => output.status === "INTERNAL_REVIEW");
  const readyOutputs = request.outputs.filter((output) => output.status === "APPROVED_INTERNAL");
  const returnedOutputs = request.outputs.filter((output) =>
    ["RETURNED_BY_CLIENT", "REVISION_REQUESTED"].includes(output.status),
  );
  const submittedTimeEntries = request.timeEntries.filter((entry) => entry.status === "SUBMITTED");
  const approvedTimeEntries = request.timeEntries.filter((entry) => entry.status === "APPROVED");
  const clientDocumentRequests = request.documentRequests.filter(
    (documentRequest) => documentRequest.status === "REQUESTED",
  );
  const uploadedDocumentRequests = request.documentRequests.filter(
    (documentRequest) => documentRequest.status === "UPLOADED",
  );
  const nextActions = [
    ...(canAssign && !request.assignments.specialist
      ? ["Assign a specialist before execution starts."]
      : []),
    ...(canStartWork ? ["Start work and move the request into execution."] : []),
    ...(canExecute && returnedOutputs.length > 0
      ? [`Revise ${returnedOutputs.length} returned deliverable(s).`]
      : []),
    ...(canSupervise && reviewOutputs.length > 0
      ? [`Review ${reviewOutputs.length} deliverable(s) waiting for supervisor approval.`]
      : []),
    ...(canSupervise && readyOutputs.length > 0
      ? [`Share ${readyOutputs.length} approved deliverable(s) with the client.`]
      : []),
    ...(canSupervise && submittedTimeEntries.length > 0
      ? [`Approve or reject ${submittedTimeEntries.length} submitted time entry(s).`]
      : []),
    ...(canRequestDocuments && uploadedDocumentRequests.length > 0
      ? [`Close ${uploadedDocumentRequests.length} uploaded client document request(s).`]
      : []),
    ...(request.status === "WAITING_CLIENT"
      ? ["Request is waiting for a client response or document upload."]
      : []),
  ];

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
    if (!startableStatuses.includes(request.status)) {
      return;
    }
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
        workDate: riyadhDateInputValue(),
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
      <PageHeader
        eyebrow="Request detail"
        title={request.title}
        description={`${request.requestNumber} - ${request.client.name} - ${request.service.monthlyService.nameEn}`}
        meta={
          <>
            <StatusChip status={request.status} />
            <PriorityChip priority={request.priority} />
          </>
        }
      >
        <div className="quote-header-actions">
          <Link className="os-button os-button-secondary" href="/requests">
            Back to requests
          </Link>
        </div>
      </PageHeader>

      {error && <p className="form-error">{error}</p>}

      <RequestDetailNav />

      <section className="request-signal-strip" aria-label="Request operating signals">
        <RequestSignalCard
          label="Open tasks"
          value={openTasks.length}
          detail={`${request.tasks.length} total checklist items`}
        />
        <RequestSignalCard
          label="Supervisor review"
          value={reviewOutputs.length}
          detail={`${readyOutputs.length} ready to share`}
        />
        <RequestSignalCard
          label="Client documents"
          value={clientDocumentRequests.length}
          detail={`${uploadedDocumentRequests.length} uploaded`}
        />
        <RequestSignalCard
          label="Submitted hours"
          value={hours(submittedTimeEntries)}
          detail={`${hours(approvedTimeEntries)} approved`}
        />
      </section>

      <WorkflowStepper status={request.status} />

      <section className="catalog-panel">
        <p className="eyebrow">Operations workbench</p>
        <h2>{workspace.title}</h2>
        <p>{workspace.description}</p>
        <div className="metric-grid" aria-label="Request operations summary">
          <article>
            <span>Open tasks</span>
            <strong>{openTasks.length}</strong>
            <small>{request.tasks.length} total checklist items</small>
          </article>
          <article>
            <span>Supervisor review</span>
            <strong>{reviewOutputs.length}</strong>
            <small>{readyOutputs.length} approved and ready to share</small>
          </article>
          <article>
            <span>Client documents</span>
            <strong>{clientDocumentRequests.length}</strong>
            <small>{uploadedDocumentRequests.length} uploaded by client</small>
          </article>
          <article>
            <span>Submitted hours</span>
            <strong>{hours(submittedTimeEntries)}</strong>
            <small>{hours(approvedTimeEntries)} approved</small>
          </article>
        </div>
        <div className="activity-list">
          {nextActions.length === 0 ? (
            <article>
              <strong>No blocking operation right now.</strong>
              <p>The request has no role-specific pending action for your workspace.</p>
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

      <section className="quote-summary-grid" id="request-context">
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
          {canAssign ? (
            <form className="catalog-form" onSubmit={submitAssignment}>
              {assignmentCandidates ? (
                <>
                  <label>
                    Specialist
                    <select
                      value={assignmentForm.assignedSpecialistId}
                      onChange={(event) =>
                        setAssignmentForm({
                          ...assignmentForm,
                          assignedSpecialistId: event.target.value,
                        })
                      }
                    >
                      <option value="">Keep current specialist</option>
                      <option value="clear">Clear specialist</option>
                      {assignmentCandidates.specialists.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {assignmentCandidateLabel(candidate)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Supervisor
                    <select
                      value={assignmentForm.assignedSupervisorId}
                      onChange={(event) =>
                        setAssignmentForm({
                          ...assignmentForm,
                          assignedSupervisorId: event.target.value,
                        })
                      }
                    >
                      <option value="">Keep current supervisor</option>
                      <option value="clear">Clear supervisor</option>
                      {assignmentCandidates.supervisors.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {assignmentCandidateLabel(candidate)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Account manager
                    <select
                      value={assignmentForm.accountManagerId}
                      onChange={(event) =>
                        setAssignmentForm({
                          ...assignmentForm,
                          accountManagerId: event.target.value,
                        })
                      }
                    >
                      <option value="">Keep current account manager</option>
                      <option value="clear">Clear account manager</option>
                      {assignmentCandidates.accountManagers.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {assignmentCandidateLabel(candidate)}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : (
                <>
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
                        setAssignmentForm({
                          ...assignmentForm,
                          accountManagerId: event.target.value,
                        })
                      }
                    />
                  </label>
                </>
              )}
              <label>
                Reason
                <input
                  value={assignmentForm.reason}
                  onChange={(event) =>
                    setAssignmentForm({ ...assignmentForm, reason: event.target.value })
                  }
                />
              </label>
              <button className="os-button os-button-primary" type="submit" disabled={saving === "assignment"}>
                Save assignment
              </button>
            </form>
          ) : (
            <p>Assignment changes are limited to admin, management, or supervisor workspaces.</p>
          )}
        </article>
      </section>

      <section className="catalog-panel" id="request-lifecycle">
        <h2>Lifecycle</h2>
        {canManageLifecycle ? (
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
            <button className="os-button os-button-primary" type="submit" disabled={saving === "status"}>
              Update status
            </button>
          </form>
        ) : (
          <p>Status changes are handled by the assigned supervisor, management, or admin.</p>
        )}
        <div className="row-actions">
          {canStartWork && (
            <button
              className="os-button os-button-secondary"
              disabled={saving === "start"}
              type="button"
              onClick={startWork}
            >
              Start work
            </button>
          )}
          {canSupervise && (
            <>
              <input
                aria-label="Supervisor review reason"
                placeholder="Supervisor review reason"
                value={reviewReason}
                onChange={(event) => setReviewReason(event.target.value)}
              />
              <button
                className="os-button os-button-secondary"
                type="button"
                onClick={() => supervisorAction("APPROVE")}
              >
                Approve request
              </button>
              <button
                className="os-button os-button-secondary"
                type="button"
                onClick={() => supervisorAction("RETURN")}
              >
                Return changes
              </button>
              <button
                className="os-button os-button-danger"
                type="button"
                onClick={() => supervisorAction("REJECT")}
              >
                Reject
              </button>
              <button
                className="os-button os-button-secondary"
                type="button"
                onClick={() => supervisorAction("ESCALATE")}
              >
                Escalate
              </button>
            </>
          )}
        </div>
      </section>

      {request.templateResponse && (
        <section className="catalog-panel" id="request-template">
          <h2>Template answers</h2>
          <p>
            Completeness:{" "}
            <StatusChip
              status={request.templateResponse.completenessStatus}
              label={request.templateResponse.completenessStatus}
            />
          </p>
          <div className="activity-list">
            {request.templateResponse.answers.length === 0 ? (
              <p>No structured answers were submitted.</p>
            ) : (
              request.templateResponse.answers.map((answer) => (
                <article key={answer.id}>
                  <strong>{answer.labelEn}</strong>
                  <small>
                    {answer.fieldCode} · {answer.fieldType} ·{" "}
                    {answer.clientVisible ? "client-visible" : "internal-only"}
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

      <section className="quote-summary-grid">
        <article className="catalog-panel" id="request-checklist">
          <h2>Internal checklist</h2>
          {canAddOperationalContext ? (
            <form className="catalog-form" onSubmit={submitTask}>
              <label>
                Task title
                <input
                  required
                  value={taskForm.title}
                  onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })}
                />
              </label>
              {assignmentCandidates ? (
                <label>
                  Assignee
                  <select
                    value={taskForm.assigneeId}
                    onChange={(event) =>
                      setTaskForm({ ...taskForm, assigneeId: event.target.value })
                    }
                  >
                    <option value="">No assignee</option>
                    {taskAssignmentCandidates.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {assignmentCandidateLabel(candidate)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                canAssign && (
                  <label>
                    Assignee ID
                    <input
                      value={taskForm.assigneeId}
                      onChange={(event) =>
                        setTaskForm({ ...taskForm, assigneeId: event.target.value })
                      }
                    />
                  </label>
                )
              )}
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
                  onChange={(event) =>
                    setTaskForm({ ...taskForm, description: event.target.value })
                  }
                />
              </label>
              <button className="os-button os-button-primary" type="submit" disabled={saving === "task"}>
                Add checklist item
              </button>
            </form>
          ) : (
            <p>Checklist updates are limited to assigned internal workspaces.</p>
          )}
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
                  {canAddOperationalContext && (
                    <div className="row-actions">
                      <button
                        className="os-button os-button-secondary"
                        type="button"
                        onClick={() => setTaskStatus(task.id, "PENDING")}
                      >
                        Pending
                      </button>
                      <button
                        className="os-button os-button-secondary"
                        type="button"
                        onClick={() => setTaskStatus(task.id, "IN_PROGRESS")}
                      >
                        Start
                      </button>
                      <button
                        className="os-button os-button-secondary"
                        type="button"
                        onClick={() => setTaskStatus(task.id, "DONE")}
                      >
                        Done
                      </button>
                      <button
                        className="os-button os-button-secondary"
                        type="button"
                        onClick={() => setTaskStatus(task.id, "NOT_APPLICABLE")}
                      >
                        N/A
                      </button>
                      <button
                        className="os-button os-button-secondary"
                        type="button"
                        onClick={() => setTaskStatus(task.id, "BLOCKED")}
                      >
                        Blocked
                      </button>
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        </article>

        <article className="catalog-panel" id="request-outputs">
          <h2>Internal outputs</h2>
          {canExecute ? (
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
              <button className="os-button os-button-primary" type="submit" disabled={saving === "output"}>
                Create internal output
              </button>
            </form>
          ) : (
            <p>Deliverable preparation is available to assigned specialists and global roles.</p>
          )}
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
                    {canExecute && submittableOutputStatuses.includes(output.status) && (
                      <button
                        className="os-button os-button-secondary"
                        type="button"
                        onClick={() => submitOutputForReview(output.id)}
                      >
                        Submit
                      </button>
                    )}
                    {canSupervise && output.status === "INTERNAL_REVIEW" && (
                      <>
                        <button
                          className="os-button os-button-secondary"
                          type="button"
                          onClick={() => reviewOutput(output.id, "APPROVE")}
                        >
                          Approve
                        </button>
                        <button
                          className="os-button os-button-secondary"
                          type="button"
                          onClick={() => reviewOutput(output.id, "RETURN")}
                        >
                          Return
                        </button>
                        <button
                          className="os-button os-button-danger"
                          type="button"
                          onClick={() => reviewOutput(output.id, "REJECT")}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {canSupervise && output.status === "APPROVED_INTERNAL" && (
                      <button
                        className="os-button os-button-secondary"
                        type="button"
                        onClick={() => shareOutput(output.id)}
                      >
                        Share with client
                      </button>
                    )}
                    {canSupervise && closableOutputStatuses.includes(output.status) && (
                      <button
                        className="os-button os-button-secondary"
                        type="button"
                        onClick={() => closeOutput(output.id)}
                      >
                        Close delivery
                      </button>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="quote-summary-grid">
        <article className="catalog-panel" id="request-documents">
          <h2>Client document requests</h2>
          {canRequestDocuments ? (
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
                className="os-button os-button-primary"
                type="submit"
                disabled={saving === "document-request"}
              >
                Request document
              </button>
            </form>
          ) : (
            <p>Client document requests are available to assigned internal workspaces.</p>
          )}
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
                  {canRequestDocuments && (
                    <div className="row-actions">
                      {["REQUESTED", "UPLOADED"].includes(documentRequest.status) && (
                        <button
                          className="os-button os-button-secondary"
                          type="button"
                          onClick={() => setDocumentRequestStatus(documentRequest.id, "CLOSED")}
                        >
                          Close
                        </button>
                      )}
                      {documentRequest.status === "REQUESTED" && (
                        <button
                          className="os-button os-button-danger"
                          type="button"
                          onClick={() => setDocumentRequestStatus(documentRequest.id, "CANCELLED")}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        </article>

        <article className="catalog-panel" id="request-hours">
          <h2>Basic time entries</h2>
          {canExecute ? (
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
              <button className="os-button os-button-primary" type="submit" disabled={saving === "time-entry"}>
                Add time
              </button>
            </form>
          ) : (
            <p>Time registration is available to assigned execution users and global roles.</p>
          )}
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
                    {(hasGlobalOperations || entry.user.id === currentUser.id) &&
                      submittableTimeEntryStatuses.includes(entry.status) && (
                        <button
                          className="os-button os-button-secondary"
                          type="button"
                          onClick={() => submitTimeEntryForReview(entry.id)}
                        >
                          Submit
                        </button>
                      )}
                    {canSupervise && entry.status === "SUBMITTED" && (
                      <>
                        <button
                          className="os-button os-button-secondary"
                          type="button"
                          onClick={() => reviewTimeEntry(entry.id, "APPROVE")}
                        >
                          Approve
                        </button>
                        <button
                          className="os-button os-button-danger"
                          type="button"
                          onClick={() => reviewTimeEntry(entry.id, "REJECT")}
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="quote-summary-grid">
        <article className="catalog-panel" id="request-comments">
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
            <button className="os-button os-button-primary" type="submit" disabled={saving === "comment"}>
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

        <article className="catalog-panel" id="request-notes">
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
            <button className="os-button os-button-primary" type="submit" disabled={saving === "note"}>
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
        <article className="catalog-panel" id="request-attachments">
          <h2>Attachment metadata</h2>
          {canAttachMetadata ? (
            <form className="catalog-form" onSubmit={submitAttachment}>
              <label>
                Original name
                <input
                  required
                  value={fileForm.originalName}
                  onChange={(event) =>
                    setFileForm({ ...fileForm, originalName: event.target.value })
                  }
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
              <button className="os-button os-button-primary" type="submit" disabled={saving === "attachment"}>
                Add metadata
              </button>
            </form>
          ) : (
            <p>Attachment metadata updates are available to assigned internal workspaces.</p>
          )}
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

        <article className="catalog-panel" id="request-activity">
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
