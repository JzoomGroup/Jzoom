export type RequestStatus =
  | "NEW"
  | "TRIAGE"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "WAITING_CLIENT"
  | "WAITING_SUPERVISOR"
  | "COMPLETED"
  | "CLOSED"
  | "RETURNED"
  | "REJECTED";

export interface RequestUser {
  id: string;
  email: string;
  displayName: string;
}

export interface RequestAssignmentCandidate extends RequestUser {
  roleCodes: string[];
}

export interface RequestAssignmentCandidates {
  specialists: RequestAssignmentCandidate[];
  supervisors: RequestAssignmentCandidate[];
  accountManagers: RequestAssignmentCandidate[];
}

export interface RequestIntakeServiceItemOption {
  id: string;
  itemId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  expectedOutput: string | null;
  requiresFile: boolean;
  requestType: string | null;
}

export interface RequestIntakeSubscriptionServiceOption {
  id: string;
  subscriptionId: string;
  status: string;
  startsAt: string;
  endsAt: string | null;
  hoursAllocated: number;
  monthlyService: {
    id: string;
    code: string;
    revisionId: string;
    nameAr: string;
    nameEn: string;
    serviceLine: string;
    domain: string;
  };
  serviceLevel: {
    id: string;
    code: string;
    labelAr: string;
    labelEn: string | null;
  };
  serviceItems: RequestIntakeServiceItemOption[];
}

export interface RequestIntakeClientOption {
  id: string;
  code: string;
  name: string;
  legalName: string | null;
  sector: string | null;
  city: string | null;
  subscriptions: Array<{
    id: string;
    status: string;
    startsAt: string;
    endsAt: string | null;
    services: RequestIntakeSubscriptionServiceOption[];
  }>;
  sourceQuotes: Array<{
    id: string;
    quoteNumber: string;
    status: string;
  }>;
  sourceInvoices: Array<{
    id: string;
    invoiceNumber: string;
    status: string;
  }>;
}

export interface RequestIntakeOptions {
  clients: RequestIntakeClientOption[];
  assignmentCandidates: RequestAssignmentCandidates;
}

export interface RequestSummary {
  id: string;
  requestNumber: string;
  status: RequestStatus;
  title: string;
  description: string;
  priority: string;
  dueAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  client: {
    id: string;
    code: string;
    name: string;
    legalName: string | null;
    sector: string | null;
    city: string | null;
  };
  service: {
    subscriptionServiceId: string;
    subscriptionId: string;
    hoursAllocated: number;
    status: string;
    monthlyService: {
      id: string;
      code: string;
      revisionId: string;
      nameAr: string;
      nameEn: string;
      serviceLine: string;
      domain: string;
    };
    serviceLevel: {
      id: string;
      code: string;
      labelAr: string;
      labelEn: string | null;
    };
  };
  serviceItem: {
    id: string;
    code: string;
    nameAr: string;
    nameEn: string;
    expectedOutput: string | null;
  } | null;
  sourceQuote: {
    id: string;
    quoteNumber: string;
    status: string;
    snapshotHash: string | null;
  } | null;
  sourceInvoice: {
    id: string;
    invoiceNumber: string;
    status: string;
    snapshotHash: string | null;
  } | null;
  assignments: {
    specialist: RequestUser | null;
    supervisor: RequestUser | null;
    accountManager: RequestUser | null;
  };
  counts: {
    comments: number;
    documentRequests: number;
    files: number;
    internalNotes: number;
    outputs: number;
    tasks: number;
    timeEntries: number;
    workflowEvents: number;
  };
}

export interface RequestComment {
  id: string;
  author: RequestUser;
  body: string;
  isClientVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RequestInternalNote {
  id: string;
  author: RequestUser;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface RequestAttachment {
  id: string;
  uploadedBy: RequestUser;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  visibility: "INTERNAL" | "CLIENT_VISIBLE";
  version: number;
  downloadUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RequestActivity {
  id: string;
  actorId: string | null;
  actorRole: string;
  fromState: { code: string; labelEn: string; labelAr: string | null } | null;
  toState: { code: string; labelEn: string; labelAr: string | null };
  reason: string | null;
  metadata: unknown;
  occurredAt: string;
}

export interface RequestTask {
  id: string;
  title: string;
  description: string | null;
  status: "PENDING" | "TODO" | "IN_PROGRESS" | "DONE" | "NOT_APPLICABLE" | "BLOCKED" | "CANCELLED";
  priority: string;
  assignee: RequestUser | null;
  dueAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface RequestOutput {
  id: string;
  code: string;
  title: string;
  description: string | null;
  contentSnapshot: unknown;
  status:
    | "DRAFT"
    | "INTERNAL_REVIEW"
    | "APPROVED_INTERNAL"
    | "SHARED_WITH_CLIENT"
    | "ACCEPTED_BY_CLIENT"
    | "RETURNED_BY_CLIENT"
    | "CLOSED"
    | "REVISION_REQUESTED";
  dueAt: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  sharedAt: string | null;
  clientDecidedAt: string | null;
  closedAt: string | null;
  reviewReason: string | null;
  clientReturnReason: string | null;
  revision: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  createdBy: RequestUser | null;
  reviewedBy: RequestUser | null;
  sharedBy: RequestUser | null;
  clientDecisionBy: RequestUser | null;
}

export interface RequestDocumentRequest {
  id: string;
  title: string;
  instructions: string | null;
  status: "REQUESTED" | "UPLOADED" | "CANCELLED" | "CLOSED";
  dueAt: string | null;
  requestedAt: string;
  fulfilledAt: string | null;
  closedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  requestedBy: RequestUser | null;
  fulfilledBy: RequestUser | null;
  file: RequestAttachment | null;
}

export interface RequestTimeEntry {
  id: string;
  user: RequestUser;
  workDate: string;
  hours: number;
  billable: boolean;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
  notes: string | null;
  decisionReason: string | null;
  submittedAt: string | null;
  decidedAt: string | null;
  decidedBy: RequestUser | null;
  createdAt: string;
  updatedAt: string;
}

export interface RequestTemplateAnswer {
  id: string;
  fieldCode: string;
  systemKey: string | null;
  labelAr: string;
  labelEn: string;
  fieldType: string;
  value: unknown;
  clientVisible: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface RequestTemplateResponse {
  id: string;
  requestTemplateVersionId: string | null;
  requestTemplateVersion: {
    id: string;
    version: number;
    status: string;
    requestTemplateId: string;
  } | null;
  completenessStatus:
    | "COMPLETE"
    | "MISSING_REQUIRED_FIELDS"
    | "MISSING_REQUIRED_ATTACHMENTS"
    | "PENDING_INTERNAL_REVIEW";
  templateSnapshot: unknown;
  fileSnapshot: unknown;
  submittedBy: RequestUser | null;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
  answers: RequestTemplateAnswer[];
}

export interface ServiceRequest extends RequestSummary {
  comments: RequestComment[];
  internalNotes: RequestInternalNote[];
  attachments: RequestAttachment[];
  documentRequests: RequestDocumentRequest[];
  activity: RequestActivity[];
  outputs: RequestOutput[];
  tasks: RequestTask[];
  templateResponse?: RequestTemplateResponse | null;
  timeEntries: RequestTimeEntry[];
}

export interface RequestQueueResponse {
  queue: "all" | "specialist" | "supervisor" | "account-manager";
  filters: Record<string, unknown>;
  counters: {
    accountManager: number;
    open: number;
    overdue: number;
    specialist: number;
    supervisor: number;
  };
  requests: RequestSummary[];
}
