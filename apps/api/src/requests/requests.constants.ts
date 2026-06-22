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
  "TODO",
  "IN_PROGRESS",
  "DONE",
  "BLOCKED",
  "CANCELLED",
] as const;

export const REQUEST_OUTPUT_STATUSES = [
  "DRAFT",
  "INTERNAL_REVIEW",
  "APPROVED_INTERNAL",
  "REVISION_REQUESTED",
] as const;

export const SUPERVISOR_REVIEW_ACTIONS = ["APPROVE", "RETURN", "REJECT", "ESCALATE"] as const;

export const REQUEST_OUTPUT_REVIEW_ACTIONS = ["APPROVE", "RETURN", "REJECT"] as const;

export const REQUEST_EVENT = {
  attachmentAdded: "REQUEST_ATTACHMENT_METADATA_ADDED",
  assignmentChanged: "REQUEST_ASSIGNMENT_CHANGED",
  clientCommentAdded: "REQUEST_CLIENT_COMMENT_ADDED",
  clientRequestViewed: "CLIENT_REQUEST_VIEWED",
  commentAdded: "REQUEST_COMMENT_ADDED",
  created: "REQUEST_CREATED",
  internalNoteAdded: "REQUEST_INTERNAL_NOTE_ADDED",
  outputCreated: "REQUEST_OUTPUT_CREATED",
  outputReviewed: "REQUEST_OUTPUT_REVIEWED",
  outputSubmitted: "REQUEST_OUTPUT_SUBMITTED",
  outputUpdated: "REQUEST_OUTPUT_UPDATED",
  statusChanged: "REQUEST_STATUS_CHANGED",
  taskCreated: "REQUEST_TASK_CREATED",
  taskUpdated: "REQUEST_TASK_UPDATED",
} as const;
