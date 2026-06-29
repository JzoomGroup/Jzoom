"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import {
  acceptClientRequestOutput,
  addClientRequestComment,
  requestErrorMessage,
  returnClientRequestOutput,
  uploadClientRequestedDocument,
} from "../../lib/request-client";
import type { ServiceRequest } from "../../lib/request-types";
import { PageHeader, StatusChip } from "../premium-os";
import {
  clientDateTime,
  clientLabel,
  clientLocale,
  clientName,
  clientNumber,
  documentStatusLabel,
  outputStatusLabel,
  requestStatusLabel,
  type ClientDisplayLocale,
} from "./client-format";

type ClientDocumentStatus = ServiceRequest["documentRequests"][number]["status"];
type ClientOutputStatus = ServiceRequest["outputs"][number]["status"];

const hasArabic = /[\u0600-\u06ff]/;

const copy = {
  ar: {
    acceptOutput: "اعتماد المخرج",
    acceptedDocument: "تم قبول طلب المستند وإغلاقه.",
    actionCenter: "مركز إجراءات الطلب",
    addComment: "إضافة تعليق",
    addCommentLabel: "إضافة تعليق",
    allRequests: "عرض كل الطلبات",
    attachmentHint: "مرفق ظاهر للعميل",
    attachments: "المرفقات الظاهرة",
    back: "العودة إلى الطلبات",
    closedOutput: "هذا المخرج مغلق ومحفوظ كمرجع.",
    comments: "التعليقات",
    completed: "طلب مكتمل",
    completeness: "الاكتمال",
    decision: "قرار العميل",
    deliverables: "المخرجات",
    deliverablesShared: "الأعمال المشاركة معك",
    deliverablesToReview: "مخرجات بانتظار المراجعة",
    documentCancelled: "طلب المستند لم يعد نشطًا.",
    documentClosed: "تم قبول المستند",
    documentInstructionsFallback: "ارفع بيانات المستند المطلوب حتى يتمكن فريق جزوم من المتابعة.",
    documents: "المستندات",
    due: "الموعد",
    fileName: "اسم الملف",
    fileSizeBytes: "الحجم بالبايت",
    generalServiceItem: "طلب عام على الخدمة",
    jzoomWaiting: "جزوم بانتظار ردك على هذا الطلب.",
    metadataUpload: "رفع بيانات الملف",
    mimeType: "نوع الملف MIME",
    noAction: "لا يوجد إجراء مطلوب منك الآن.",
    noActionBody: "سنشارك التحديثات هنا عندما نحتاج مراجعتك أو مستندات منك.",
    noAttachments: "لا توجد بيانات مرفقات ظاهرة للعميل حتى الآن.",
    noComments: "لا توجد تعليقات ظاهرة للعميل حتى الآن.",
    noDecision: "هذا المخرج لم يعد بانتظار قرار من العميل.",
    noDocumentUpload: "لا يوجد رفع مستندات مطلوب منك حاليًا.",
    noDocuments: "لم يتم طلب مستندات حتى الآن.",
    noOutputs: "لا توجد مخرجات مشاركة حتى الآن.",
    noStructuredAnswers: "لم يتم إرسال إجابات منظمة ظاهرة للعميل.",
    outputAccepted: "تم اعتماد هذا المخرج من طرفك، ولا يوجد إجراء إضافي مطلوب.",
    outputDefault: "هذا المخرج لا ينتظر قرارًا من العميل.",
    outputReview: "راجع هذا المخرج، ثم اعتمده أو أعده مع ملاحظاتك.",
    outputReturned: "وصلت ملاحظاتك إلى جزوم وسيتم تجهيز النسخة التالية.",
    package: "الباقة",
    pendingReview: "بانتظار مراجعتك",
    request: "الطلب",
    requestDetail: "تفاصيل الطلب",
    requestDocuments: "المستندات المطلوبة",
    returnNote: "ملاحظة الإرجاع",
    returnOutput: "إرجاع المخرج",
    returnedNote: "ملاحظة الإرجاع",
    reviewDeliverables: "مراجعة المخرجات",
    revision: "إصدار",
    selectDocument: "اختر الطلب",
    service: "الخدمة",
    serviceContext: "بيانات الخدمة",
    serviceItem: "بند الخدمة",
    shared: "تمت المشاركة",
    submittedAnswers: "إجابات النموذج المرسلة",
    uploadDocuments: "رفع المستندات",
    uploadRequired: "ارفع المستند المطلوب حتى يتمكن فريق جزوم من إكمال العمل.",
    uploaded: "تم الرفع",
    uploadedPrefix: "تم الرفع",
    uploadedReview: "تم استلام الملف وهو الآن تحت مراجعة جزوم.",
    visibleAttachments: "المرفقات الظاهرة",
    workInProgress: "العمل قيد التنفيذ",
  },
  en: {
    acceptOutput: "Accept output",
    acceptedDocument: "This document request has been accepted and closed.",
    actionCenter: "Request action center",
    addComment: "Add comment",
    addCommentLabel: "Add comment",
    allRequests: "View all requests",
    attachmentHint: "Client-visible attachment metadata",
    attachments: "Visible attachments",
    back: "Back to requests",
    closedOutput: "This deliverable is closed and kept here for reference.",
    comments: "Comments",
    completed: "Request completed",
    completeness: "Completeness",
    decision: "Decision",
    deliverables: "Deliverables",
    deliverablesShared: "Work shared with you",
    deliverablesToReview: "Deliverables to review",
    documentCancelled: "This document request is no longer active.",
    documentClosed: "Accepted",
    documentInstructionsFallback: "Upload the requested document metadata for Jzoom review.",
    documents: "Documents",
    due: "Due",
    fileName: "File name",
    fileSizeBytes: "Size bytes",
    generalServiceItem: "General service request",
    jzoomWaiting: "Jzoom is waiting for your response on this request.",
    metadataUpload: "Upload metadata",
    mimeType: "MIME type",
    noAction: "No action is pending from you.",
    noActionBody: "Jzoom will share updates here when your review or documents are needed.",
    noAttachments: "No client-visible attachment metadata yet.",
    noComments: "No client-visible comments yet.",
    noDecision: "This deliverable is no longer waiting for a client decision.",
    noDocumentUpload: "No document upload is currently required from you.",
    noDocuments: "No documents requested yet.",
    noOutputs: "No shared outputs yet.",
    noStructuredAnswers: "No client-visible structured answers were submitted.",
    outputAccepted: "You accepted this deliverable. No further action is needed.",
    outputDefault: "This deliverable is not waiting for a client decision.",
    outputReview: "Please review this deliverable and either accept it or return it with comments.",
    outputReturned: "Jzoom has your return note and will prepare the next revision.",
    package: "Package",
    pendingReview: "Waiting for your review",
    request: "Request",
    requestDetail: "Request detail",
    requestDocuments: "Requested documents",
    returnNote: "Return note",
    returnOutput: "Return output",
    returnedNote: "Return note",
    reviewDeliverables: "Review deliverables",
    revision: "Revision",
    selectDocument: "Select request",
    service: "Service",
    serviceContext: "Service context",
    serviceItem: "Service item",
    shared: "Shared",
    submittedAnswers: "Submitted template answers",
    uploadDocuments: "Upload documents",
    uploadRequired: "Upload the requested document so Jzoom can continue the work.",
    uploaded: "Uploaded",
    uploadedPrefix: "Uploaded",
    uploadedReview: "Your upload is with Jzoom for review.",
    visibleAttachments: "Visible attachments",
    workInProgress: "Work in progress",
  },
} as const;

function fileSize(sizeBytes: number, locale: ClientDisplayLocale): string {
  if (sizeBytes >= 1_000_000) {
    return `${clientNumber(sizeBytes / 1_000_000, locale)} MB`;
  }

  if (sizeBytes >= 1_000) {
    return `${clientNumber(sizeBytes / 1_000, locale)} KB`;
  }

  return locale === "ar"
    ? `${clientNumber(sizeBytes, locale)} بايت`
    : `${clientNumber(sizeBytes, locale)} bytes`;
}

function safeSystemText(value: string | null | undefined, fallback: string, locale: ClientDisplayLocale) {
  if (!value) return fallback;
  if (locale === "en") return value;
  return hasArabic.test(value) ? value : fallback;
}

function outputActionCopy(status: ClientOutputStatus, locale: ClientDisplayLocale): string {
  const t = copy[locale];
  switch (status) {
    case "SHARED_WITH_CLIENT":
      return t.outputReview;
    case "ACCEPTED_BY_CLIENT":
      return t.outputAccepted;
    case "RETURNED_BY_CLIENT":
      return t.outputReturned;
    case "CLOSED":
      return t.closedOutput;
    default:
      return t.outputDefault;
  }
}

function documentActionCopy(status: ClientDocumentStatus, locale: ClientDisplayLocale): string {
  const t = copy[locale];
  switch (status) {
    case "REQUESTED":
      return t.uploadRequired;
    case "UPLOADED":
      return t.uploadedReview;
    case "CLOSED":
      return t.acceptedDocument;
    case "CANCELLED":
    default:
      return t.documentCancelled;
  }
}

const activeClientRequestStatuses = [
  "NEW",
  "TRIAGE",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_CLIENT",
  "WAITING_SUPERVISOR",
  "RETURNED",
];

const clientVisibleOutputStatuses: ClientOutputStatus[] = [
  "SHARED_WITH_CLIENT",
  "ACCEPTED_BY_CLIENT",
  "RETURNED_BY_CLIENT",
  "CLOSED",
];

export function ClientRequestDetail({
  locale: localeInput = "en",
  request: initialRequest,
}: {
  locale?: string;
  request: ServiceRequest;
}) {
  const locale = clientLocale(localeInput);
  const t = copy[locale];
  const [request, setRequest] = useState(initialRequest);
  const [body, setBody] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [uploadForm, setUploadForm] = useState({
    documentRequestId: "",
    mimeType: "",
    originalName: "",
    sha256: "",
    sizeBytes: "1",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<ServiceRequest>) {
    setSaving(true);
    setError(null);
    try {
      const updated = await action();
      setRequest(updated);
    } catch (caught) {
      setError(requestErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await run(async () => {
      const updated = await addClientRequestComment(request.id, body);
      setBody("");
      return updated;
    });
  }

  function acceptOutput(outputId: string) {
    void run(() => acceptClientRequestOutput(request.id, outputId));
  }

  function returnOutput(outputId: string) {
    void run(async () => {
      const updated = await returnClientRequestOutput(request.id, outputId, returnReason);
      setReturnReason("");
      return updated;
    });
  }

  function submitUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDocumentRequestId) {
      setError(locale === "ar" ? "اختر المستند المطلوب قبل الرفع." : "Select a requested document before uploading.");
      return;
    }

    void run(async () => {
      const updated = await uploadClientRequestedDocument(request.id, selectedDocumentRequestId, {
        mimeType: uploadForm.mimeType,
        originalName: uploadForm.originalName,
        sha256: uploadForm.sha256,
        sizeBytes: Number(uploadForm.sizeBytes),
      });
      setUploadForm({
        documentRequestId: "",
        mimeType: "",
        originalName: "",
        sha256: "",
        sizeBytes: "1",
      });
      return updated;
    });
  }

  const sharedOutputs = request.outputs.filter((output) =>
    clientVisibleOutputStatuses.includes(output.status),
  );
  const outputsAwaitingDecision = sharedOutputs.filter(
    (output) => output.status === "SHARED_WITH_CLIENT",
  );
  const requestedDocuments = request.documentRequests.filter(
    (documentRequest) => documentRequest.status === "REQUESTED",
  );
  const uploadedDocuments = request.documentRequests.filter(
    (documentRequest) => documentRequest.status === "UPLOADED",
  );
  const nextActions = [
    ...(outputsAwaitingDecision.length > 0
      ? [
          locale === "ar"
            ? `راجع ${clientNumber(outputsAwaitingDecision.length, locale)} من المخرجات المشاركة.`
            : `Review ${outputsAwaitingDecision.length} shared deliverable(s).`,
        ]
      : []),
    ...(requestedDocuments.length > 0
      ? [
          locale === "ar"
            ? `ارفع ${clientNumber(requestedDocuments.length, locale)} من المستندات المطلوبة.`
            : `Upload ${requestedDocuments.length} requested document(s).`,
        ]
      : []),
    ...(request.status === "WAITING_CLIENT" ? [t.jzoomWaiting] : []),
  ];
  const uploadSelectionIsValid = requestedDocuments.some(
    (documentRequest) => documentRequest.id === uploadForm.documentRequestId,
  );
  const selectedDocumentRequestId = uploadSelectionIsValid
    ? uploadForm.documentRequestId
    : requestedDocuments.length === 1
      ? (requestedDocuments[0]?.id ?? "")
      : "";
  const selectedDocumentRequest = requestedDocuments.find(
    (documentRequest) => documentRequest.id === selectedDocumentRequestId,
  );
  const primaryAction =
    outputsAwaitingDecision.length > 0
      ? { href: "#client-deliverables", label: t.reviewDeliverables }
      : requestedDocuments.length > 0
        ? { href: "#client-documents", label: t.uploadDocuments }
        : null;
  const isActiveRequest = activeClientRequestStatuses.includes(request.status);

  return (
    <>
      <PageHeader
        eyebrow={t.requestDetail}
        title={request.title}
        description={`${request.requestNumber} - ${clientName(request.service.monthlyService, locale)}`}
        meta={<StatusChip status={request.status} label={requestStatusLabel(request.status, locale)} />}
      >
        <div className="quote-header-actions">
          <Link className="os-button os-button-secondary" href="/client/requests">
            {t.back}
          </Link>
        </div>
      </PageHeader>

      {error && <p className="form-error">{error}</p>}

      <section className="catalog-panel">
        <p className="eyebrow">{t.actionCenter}</p>
        <h2>{isActiveRequest ? t.workInProgress : t.completed}</h2>
        <div className="pricing-total-grid">
          <div>
            <span>{t.deliverablesToReview}</span>
            <strong>{clientNumber(outputsAwaitingDecision.length, locale)}</strong>
          </div>
          <div>
            <span>{t.requestDocuments}</span>
            <strong>{clientNumber(requestedDocuments.length, locale)}</strong>
          </div>
          <div>
            <span>{t.uploaded}</span>
            <strong>{clientNumber(uploadedDocuments.length, locale)}</strong>
          </div>
          <div>
            <span>{t.visibleAttachments}</span>
            <strong>{clientNumber(request.attachments.length, locale)}</strong>
          </div>
          <div className="primary">
            <span>{t.comments}</span>
            <strong>{clientNumber(request.comments.length, locale)}</strong>
          </div>
        </div>
        <div className="activity-list">
          {nextActions.length === 0 ? (
            <article>
              <strong>{t.noAction}</strong>
              <p>{t.noActionBody}</p>
            </article>
          ) : (
            nextActions.map((action) => (
              <article key={action}>
                <strong>{locale === "ar" ? "الإجراء التالي" : "Next action"}</strong>
                <p>{action}</p>
              </article>
            ))
          )}
        </div>
        <div className="row-actions">
          {primaryAction ? (
            <a className="os-button os-button-primary" href={primaryAction.href}>
              {primaryAction.label}
            </a>
          ) : (
            <Link className="os-button os-button-secondary" href="/client/requests">
              {t.allRequests}
            </Link>
          )}
        </div>
      </section>

      <section className="quote-summary-grid">
        <article className="catalog-panel">
          <h2>{t.serviceContext}</h2>
          <dl className="quote-definition-list">
            <div>
              <dt>{t.service}</dt>
              <dd>{clientName(request.service.monthlyService, locale)}</dd>
            </div>
            <div>
              <dt>{t.package}</dt>
              <dd>{clientLabel(request.service.serviceLevel, locale)}</dd>
            </div>
            <div>
              <dt>{t.serviceItem}</dt>
              <dd>{request.serviceItem ? clientName(request.serviceItem, locale) : t.generalServiceItem}</dd>
            </div>
            <div>
              <dt>{t.due}</dt>
              <dd>{clientDateTime(request.dueAt, locale)}</dd>
            </div>
          </dl>
          <p>{request.description}</p>
        </article>

        <article className="catalog-panel">
          <h2>{t.visibleAttachments}</h2>
          <div className="activity-list">
            {request.attachments.length === 0 ? (
              <p>{t.noAttachments}</p>
            ) : (
              request.attachments.map((file) => (
                <article key={file.id}>
                  <strong>{file.originalName}</strong>
                  <small>
                    {file.mimeType} · {fileSize(file.sizeBytes, locale)}
                  </small>
                </article>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="quote-summary-grid">
        <article className="catalog-panel" id="client-deliverables">
          <p className="eyebrow">{t.deliverables}</p>
          <h2>{t.deliverablesShared}</h2>
          <div className="activity-list">
            {sharedOutputs.length === 0 ? (
              <p>{t.noOutputs}</p>
            ) : (
              sharedOutputs.map((output) => (
                <article key={output.id}>
                  <div className="entity-card-heading">
                    <div>
                      <strong>{output.title}</strong>
                      <small>
                        {t.revision} {clientNumber(output.revision, locale)}
                      </small>
                    </div>
                    <StatusChip status={output.status} label={outputStatusLabel(output.status, locale)} />
                  </div>
                  <dl className="quote-definition-list">
                    <div>
                      <dt>{t.shared}</dt>
                      <dd>{clientDateTime(output.sharedAt, locale)}</dd>
                    </div>
                    <div>
                      <dt>{t.decision}</dt>
                      <dd>{clientDateTime(output.clientDecidedAt, locale)}</dd>
                    </div>
                  </dl>
                  {output.description && <p>{safeSystemText(output.description, t.attachmentHint, locale)}</p>}
                  {output.clientReturnReason && <p>{t.returnedNote}: {output.clientReturnReason}</p>}
                  <p>{outputActionCopy(output.status, locale)}</p>
                  {output.status === "SHARED_WITH_CLIENT" ? (
                    <div className="row-actions">
                      <button
                        className="os-button os-button-secondary"
                        disabled={saving}
                        type="button"
                        onClick={() => acceptOutput(output.id)}
                      >
                        {t.acceptOutput}
                      </button>
                      <input
                        aria-label={t.returnNote}
                        placeholder={t.returnNote}
                        value={returnReason}
                        onChange={(event) => setReturnReason(event.target.value)}
                      />
                      <button
                        className="os-button os-button-secondary"
                        disabled={saving || !returnReason.trim()}
                        type="button"
                        onClick={() => returnOutput(output.id)}
                      >
                        {t.returnOutput}
                      </button>
                    </div>
                  ) : (
                    <p>{t.noDecision}</p>
                  )}
                </article>
              ))
            )}
          </div>
        </article>

        <article className="catalog-panel" id="client-documents">
          <p className="eyebrow">{t.documents}</p>
          <h2>{t.requestDocuments}</h2>
          {requestedDocuments.length === 0 ? (
            <p>{t.noDocumentUpload}</p>
          ) : (
            <form className="catalog-form" onSubmit={submitUpload}>
              <label>
                {t.request}
                <select
                  required
                  value={selectedDocumentRequestId}
                  onChange={(event) =>
                    setUploadForm({ ...uploadForm, documentRequestId: event.target.value })
                  }
                >
                  <option value="">{t.selectDocument}</option>
                  {requestedDocuments.map((documentRequest) => (
                    <option key={documentRequest.id} value={documentRequest.id}>
                      {safeSystemText(documentRequest.title, t.requestDocuments, locale)}
                    </option>
                  ))}
                </select>
              </label>
              {selectedDocumentRequest && (
                <div className="form-span">
                  <p>
                    {safeSystemText(
                      selectedDocumentRequest.instructions,
                      t.documentInstructionsFallback,
                      locale,
                    )}
                  </p>
                </div>
              )}
              <label>
                {t.fileName}
                <input
                  required
                  value={uploadForm.originalName}
                  onChange={(event) =>
                    setUploadForm({ ...uploadForm, originalName: event.target.value })
                  }
                />
              </label>
              <label>
                {t.mimeType}
                <input
                  required
                  value={uploadForm.mimeType}
                  onChange={(event) =>
                    setUploadForm({ ...uploadForm, mimeType: event.target.value })
                  }
                />
              </label>
              <label>
                {t.fileSizeBytes}
                <input
                  required
                  min="1"
                  type="number"
                  value={uploadForm.sizeBytes}
                  onChange={(event) =>
                    setUploadForm({ ...uploadForm, sizeBytes: event.target.value })
                  }
                />
              </label>
              <label className="form-span">
                SHA-256
                <input
                  required
                  minLength={64}
                  maxLength={64}
                  value={uploadForm.sha256}
                  onChange={(event) => setUploadForm({ ...uploadForm, sha256: event.target.value })}
                />
              </label>
              <button className="os-button os-button-primary" type="submit" disabled={saving}>
                {t.metadataUpload}
              </button>
            </form>
          )}
          <div className="activity-list">
            {request.documentRequests.length === 0 ? (
              <p>{t.noDocuments}</p>
            ) : (
              request.documentRequests.map((documentRequest) => (
                <article key={documentRequest.id}>
                  <div className="entity-card-heading">
                    <div>
                      <strong>{safeSystemText(documentRequest.title, t.requestDocuments, locale)}</strong>
                      <small>
                        {t.due} {clientDateTime(documentRequest.dueAt, locale)}
                      </small>
                    </div>
                    <StatusChip
                      status={documentRequest.status}
                      label={documentStatusLabel(documentRequest.status, locale)}
                    />
                  </div>
                  <p>{documentActionCopy(documentRequest.status, locale)}</p>
                  {documentRequest.instructions && (
                    <p>{safeSystemText(documentRequest.instructions, t.documentInstructionsFallback, locale)}</p>
                  )}
                  {documentRequest.file && (
                    <p>
                      {t.uploadedPrefix}: {documentRequest.file.originalName} -{" "}
                      {fileSize(documentRequest.file.sizeBytes, locale)}
                    </p>
                  )}
                </article>
              ))
            )}
          </div>
        </article>
      </section>

      {request.templateResponse && (
        <section className="catalog-panel">
          <h2>{t.submittedAnswers}</h2>
          <p>
            {t.completeness}:{" "}
            <StatusChip
              status={request.templateResponse.completenessStatus}
              label={requestStatusLabel(request.templateResponse.completenessStatus, locale)}
            />
          </p>
          <div className="activity-list">
            {request.templateResponse.answers.length === 0 ? (
              <p>{t.noStructuredAnswers}</p>
            ) : (
              request.templateResponse.answers.map((answer) => (
                <article key={answer.id}>
                  <strong>{locale === "ar" ? answer.labelAr || answer.labelEn : answer.labelEn || answer.labelAr}</strong>
                  <small>
                    {answer.fieldCode} · {answer.fieldType}
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

      <section className="catalog-panel">
        <h2>{t.comments}</h2>
        <form className="catalog-form" onSubmit={submit}>
          <label className="form-span">
            {t.addCommentLabel}
            <textarea required value={body} onChange={(event) => setBody(event.target.value)} />
          </label>
          <button className="os-button os-button-primary" type="submit" disabled={saving}>
            {t.addComment}
          </button>
        </form>
        <div className="activity-list">
          {request.comments.length === 0 ? (
            <p>{t.noComments}</p>
          ) : (
            request.comments.map((comment) => (
              <article key={comment.id}>
                <strong>{comment.author.displayName}</strong>
                <small>{clientDateTime(comment.createdAt, locale)}</small>
                <p>{comment.body}</p>
              </article>
            ))
          )}
        </div>
      </section>
    </>
  );
}
