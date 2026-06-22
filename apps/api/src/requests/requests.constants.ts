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

export const REQUEST_EVENT = {
  attachmentAdded: "REQUEST_ATTACHMENT_METADATA_ADDED",
  assignmentChanged: "REQUEST_ASSIGNMENT_CHANGED",
  clientCommentAdded: "REQUEST_CLIENT_COMMENT_ADDED",
  clientRequestViewed: "CLIENT_REQUEST_VIEWED",
  commentAdded: "REQUEST_COMMENT_ADDED",
  created: "REQUEST_CREATED",
  internalNoteAdded: "REQUEST_INTERNAL_NOTE_ADDED",
  statusChanged: "REQUEST_STATUS_CHANGED",
} as const;
