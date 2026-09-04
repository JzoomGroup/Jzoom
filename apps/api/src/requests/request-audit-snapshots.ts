type RequestAuditRecord = {
  requestNumber: string;
  clientId: string;
  subscriptionServiceId: string;
  serviceItemRevisionId: string | null;
  sourceQuoteId: string | null;
  sourceInvoiceId: string | null;
  assignedSpecialistId: string | null;
  assignedSupervisorId: string | null;
  accountManagerId: string | null;
  status: string;
  title: string;
  priority: string;
  dueAt: Date | null;
  closedAt: Date | null;
};

export function requestAuditSnapshot(request: RequestAuditRecord) {
  return {
    requestNumber: request.requestNumber,
    clientId: request.clientId,
    subscriptionServiceId: request.subscriptionServiceId,
    serviceItemRevisionId: request.serviceItemRevisionId,
    sourceQuoteId: request.sourceQuoteId,
    sourceInvoiceId: request.sourceInvoiceId,
    assignedSpecialistId: request.assignedSpecialistId,
    assignedSupervisorId: request.assignedSupervisorId,
    accountManagerId: request.accountManagerId,
    status: request.status,
    title: request.title,
    priority: request.priority,
    dueAt: request.dueAt?.toISOString() ?? null,
    closedAt: request.closedAt?.toISOString() ?? null,
  };
}

export function fileAuditSnapshot(file: {
  archivedAt: Date | null;
  id: string;
  mimeType: string;
  originalName: string;
  requestId: string | null;
  sha256: string;
  sizeBytes: bigint | { toString(): string };
  storageProvider: string;
  uploadedById: string;
  version: number;
  visibility: string;
}) {
  return {
    id: file.id,
    requestId: file.requestId,
    uploadedById: file.uploadedById,
    storageProvider: file.storageProvider,
    originalName: file.originalName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes.toString(),
    sha256: file.sha256,
    visibility: file.visibility,
    version: file.version,
    archivedAt: file.archivedAt?.toISOString() ?? null,
  };
}

export function requestOutputAuditSnapshot(output: {
  clientDecidedAt: Date | null;
  clientDecisionById: string | null;
  clientReturnReason: string | null;
  closedAt: Date | null;
  code: string;
  contentSnapshot: unknown;
  description: string | null;
  dueAt: Date | null;
  id: string;
  reviewReason: string | null;
  reviewedAt: Date | null;
  reviewedById: string | null;
  sharedAt: Date | null;
  sharedById: string | null;
  status: string;
  submittedAt: Date | null;
  title: string;
}) {
  return {
    id: output.id,
    code: output.code,
    title: output.title,
    description: output.description,
    contentSnapshot: output.contentSnapshot,
    status: output.status,
    dueAt: output.dueAt?.toISOString() ?? null,
    submittedAt: output.submittedAt?.toISOString() ?? null,
    reviewedAt: output.reviewedAt?.toISOString() ?? null,
    sharedAt: output.sharedAt?.toISOString() ?? null,
    clientDecidedAt: output.clientDecidedAt?.toISOString() ?? null,
    closedAt: output.closedAt?.toISOString() ?? null,
    reviewedById: output.reviewedById,
    sharedById: output.sharedById,
    clientDecisionById: output.clientDecisionById,
    reviewReason: output.reviewReason,
    clientReturnReason: output.clientReturnReason,
  };
}

export function documentRequestAuditSnapshot(documentRequest: {
  cancelledAt: Date | null;
  closedAt: Date | null;
  dueAt: Date | null;
  fileMetadataId: string | null;
  fulfilledAt: Date | null;
  fulfilledById: string | null;
  id: string;
  instructions: string | null;
  requestedAt: Date;
  requestedById: string;
  requestId: string;
  status: string;
  title: string;
}) {
  return {
    id: documentRequest.id,
    requestId: documentRequest.requestId,
    title: documentRequest.title,
    instructions: documentRequest.instructions,
    status: documentRequest.status,
    dueAt: documentRequest.dueAt?.toISOString() ?? null,
    requestedAt: documentRequest.requestedAt.toISOString(),
    fulfilledAt: documentRequest.fulfilledAt?.toISOString() ?? null,
    closedAt: documentRequest.closedAt?.toISOString() ?? null,
    cancelledAt: documentRequest.cancelledAt?.toISOString() ?? null,
    requestedById: documentRequest.requestedById,
    fulfilledById: documentRequest.fulfilledById,
    fileMetadataId: documentRequest.fileMetadataId,
  };
}

export function timeEntryAuditSnapshot(entry: {
  billable: boolean;
  decidedAt: Date | null;
  decidedById: string | null;
  decisionReason: string | null;
  hours: { toString(): string };
  id: string;
  notes: string | null;
  requestId: string | null;
  status: string;
  submittedAt: Date | null;
  userId: string;
  workDate: Date;
}) {
  return {
    id: entry.id,
    requestId: entry.requestId,
    userId: entry.userId,
    workDate: entry.workDate.toISOString(),
    hours: Number(entry.hours),
    billable: entry.billable,
    status: entry.status,
    notes: entry.notes,
    submittedAt: entry.submittedAt?.toISOString() ?? null,
    decidedAt: entry.decidedAt?.toISOString() ?? null,
    decidedById: entry.decidedById,
    decisionReason: entry.decisionReason,
  };
}
