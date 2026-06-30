export const ACCOUNT_MANAGER_ROLE_CODE = "ROLE-AM";
export const SPECIALIST_ROLE_CODE = "ROLE-SPECIALIST";
export const SUPERVISOR_ROLE_CODE = "ROLE-SUPERVISOR";

export const REQUEST_STATUSES = [
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
] as const;

export type RequestLifecycleStatus = (typeof REQUEST_STATUSES)[number];

export const REQUEST_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

export const REQUEST_QUEUE_TYPES = ["all", "specialist", "supervisor", "account-manager"] as const;

export const REQUEST_TASK_STATUSES = [
  "PENDING",
  "TODO",
  "IN_PROGRESS",
  "DONE",
  "NOT_APPLICABLE",
  "BLOCKED",
  "CANCELLED",
] as const;

export const REQUEST_OUTPUT_STATUSES = [
  "DRAFT",
  "INTERNAL_REVIEW",
  "APPROVED_INTERNAL",
  "SHARED_WITH_CLIENT",
  "ACCEPTED_BY_CLIENT",
  "RETURNED_BY_CLIENT",
  "CLOSED",
  "REVISION_REQUESTED",
] as const;

export const CLIENT_VISIBLE_OUTPUT_STATUSES = [
  "SHARED_WITH_CLIENT",
  "ACCEPTED_BY_CLIENT",
  "RETURNED_BY_CLIENT",
  "CLOSED",
] as const;

export const CLIENT_DOCUMENT_REQUEST_STATUSES = [
  "REQUESTED",
  "UPLOADED",
  "CANCELLED",
  "CLOSED",
] as const;

export const TIME_ENTRY_STATUSES = ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"] as const;

export const SUPERVISOR_REVIEW_ACTIONS = ["APPROVE", "RETURN", "REJECT", "ESCALATE"] as const;

export const REQUEST_OUTPUT_REVIEW_ACTIONS = ["APPROVE", "RETURN", "REJECT"] as const;

export const CLIENT_OUTPUT_DECISION_ACTIONS = ["ACCEPT", "RETURN"] as const;

export const TIME_ENTRY_REVIEW_ACTIONS = ["APPROVE", "REJECT"] as const;

export const REQUEST_EVENT = {
  attachmentAdded: "REQUEST_ATTACHMENT_METADATA_ADDED",
  attachmentArchived: "REQUEST_ATTACHMENT_ARCHIVED",
  assignmentChanged: "REQUEST_ASSIGNMENT_CHANGED",
  clientCommentAdded: "REQUEST_CLIENT_COMMENT_ADDED",
  clientRequestViewed: "CLIENT_REQUEST_VIEWED",
  commentAdded: "REQUEST_COMMENT_ADDED",
  created: "REQUEST_CREATED",
  internalNoteAdded: "REQUEST_INTERNAL_NOTE_ADDED",
  outputCreated: "REQUEST_OUTPUT_CREATED",
  outputClosed: "REQUEST_OUTPUT_CLOSED",
  outputClientAccepted: "REQUEST_OUTPUT_CLIENT_ACCEPTED",
  outputClientReturned: "REQUEST_OUTPUT_CLIENT_RETURNED",
  outputReviewed: "REQUEST_OUTPUT_REVIEWED",
  outputShared: "REQUEST_OUTPUT_SHARED_WITH_CLIENT",
  outputSubmitted: "REQUEST_OUTPUT_SUBMITTED",
  outputUpdated: "REQUEST_OUTPUT_UPDATED",
  documentRequested: "REQUEST_CLIENT_DOCUMENT_REQUESTED",
  documentRequestCancelled: "REQUEST_CLIENT_DOCUMENT_REQUEST_CANCELLED",
  documentUploaded: "REQUEST_CLIENT_DOCUMENT_UPLOADED",
  statusChanged: "REQUEST_STATUS_CHANGED",
  taskCreated: "REQUEST_TASK_CREATED",
  taskUpdated: "REQUEST_TASK_UPDATED",
  timeEntryCreated: "REQUEST_TIME_ENTRY_CREATED",
  timeEntryReviewed: "REQUEST_TIME_ENTRY_REVIEWED",
  timeEntrySubmitted: "REQUEST_TIME_ENTRY_SUBMITTED",
  timeEntryUpdated: "REQUEST_TIME_ENTRY_UPDATED",
} as const;
