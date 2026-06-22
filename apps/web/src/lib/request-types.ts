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
    files: number;
    internalNotes: number;
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

export interface ServiceRequest extends RequestSummary {
  comments: RequestComment[];
  internalNotes: RequestInternalNote[];
  attachments: RequestAttachment[];
  activity: RequestActivity[];
}
