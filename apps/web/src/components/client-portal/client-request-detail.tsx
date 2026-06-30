"use client";

import Link from "next/link";
import { type ChangeEvent, type FormEvent, useState } from "react";
import {
  acceptClientRequestOutput,
  addClientRequestComment,
  archiveClientRequestAttachment,
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
  localizedFreeText,
  outputStatusLabel,
  requestStatusLabel,
  type ClientDisplayLocale,
} from "./client-format";

type ClientDocumentStatus = ServiceRequest["documentRequests"][number]["status"];
type ClientOutputStatus = ServiceRequest["outputs"][number]["status"];

const copy = {
  ar: {
    acceptOutput: "اعتماد المخرج",
    acceptedDocument: "تم قبول طلب المستند وإغلاقه.",
    actionCenter: "مركز إجراءات الطلب",
    addComment: "إضافة تعليق",
    addCommentLabel: "إضافة تعليق",
    allRequests: "عرض كل الطلبات",
    answerType: "نوع الحقل",
    attachmentHint: "مرفق ظاهر للعميل",
    attachments: "المرفقات الظاهرة",
    archiveAttachment: "إزالة الملف",
    archiveAttachmentConfirm: "هل تريد إزالة هذا الملف؟ سيعود طلب المستند مفتوحًا للرفع من جديد.",
    back: "العودة إلى الطلبات",
    closedOutput: "هذا المخرج مغلق ومحفوظ كمرجع.",
    comments: "التعليقات",
    completed: "طلب مكتمل",
    completeness: "الاكتمال",
    confirmAcceptOutput: "هل تريد اعتماد هذا المخرج؟",
    confirmReturnOutput: "هل تريد إرجاع هذا المخرج مع ملاحظاتك؟",
    created: "تم إنشاء الطلب",
    decision: "قرار العميل",
    deliverables: "المخرجات",
    deliverablesShared: "الأعمال المشاركة معك",
    deliverablesToReview: "مخرجات بانتظار المراجعة",
    documentCancelled: "طلب المستند لم يعد نشطًا.",
    documentClosed: "تم قبول المستند",
    documentInstructionsFallback: "ارفع بيانات المستند المطلوب حتى يتمكن فريق جزوم من المتابعة.",
    documentRequested: "تم طلب مستند",
    documentTimeline: "تحديث مستند",
    documents: "المستندات",
    due: "الموعد",
    downloadFile: "تحميل الملف",
    chooseFile: "اختيار ملف من الجهاز",
    fileName: "اسم الملف",
    fileFingerprint: "بصمة الملف SHA-256",
    fileProcessing: "جاري تجهيز بيانات الملف...",
    fileReady: "تم تجهيز بيانات الملف",
    fileUploadHint: "اختر الملف المطلوب وسنرفعه إلى جزوم مع حفظ بياناته تلقائيًا.",
    fileSizeBytes: "الحجم بالبايت",
    generalServiceItem: "طلب عام على الخدمة",
    jzoomWaiting: "جزوم بانتظار ردك على هذا الطلب.",
    metadataUpload: "رفع الملف",
    mimeType: "نوع الملف",
    nextAction: "الإجراء التالي",
    noAction: "لا يوجد إجراء مطلوب منك الآن.",
    noActionBody: "سنشارك التحديثات هنا عندما نحتاج مراجعتك أو مستندات منك.",
    noAttachments: "لا توجد بيانات مرفقات ظاهرة للعميل حتى الآن.",
    noComments: "لا توجد تعليقات ظاهرة للعميل حتى الآن.",
    noDueDate: "بدون موعد محدد",
    noDecision: "هذا المخرج لم يعد بانتظار قرار من العميل.",
    noDocumentUpload: "لا يوجد رفع مستندات مطلوب منك حاليًا.",
    noDocuments: "لم يتم طلب مستندات حتى الآن.",
    noOutputs: "لا توجد مخرجات مشاركة حتى الآن.",
    noStructuredAnswers: "لم يتم إرسال إجابات منظمة ظاهرة للعميل.",
    outputAccepted: "تم اعتماد هذا المخرج من طرفك، ولا يوجد إجراء إضافي مطلوب.",
    outputDefault: "هذا المخرج لا ينتظر قرارًا من العميل.",
    outputReview: "راجع هذا المخرج، ثم اعتمده أو أعده مع ملاحظاتك.",
    outputReturned: "وصلت ملاحظاتك إلى جزوم وسيتم تجهيز النسخة التالية.",
    outputShared: "تمت مشاركة مخرج",
    package: "الباقة",
    pendingReview: "بانتظار مراجعتك",
    request: "الطلب",
    requestProgress: "مسار المتابعة",
    requestDetail: "تفاصيل الطلب",
    requestDocuments: "المستندات المطلوبة",
    requestJourney: "تنقل تفاصيل الطلب",
    requestSnapshot: "ملخص الطلب",
    returnNote: "ملاحظة الإرجاع",
    returnOutput: "إرجاع المخرج",
    returnedNote: "ملاحظة الإرجاع",
    reviewDeliverables: "مراجعة المخرجات",
    revision: "إصدار",
    selectDocument: "اختر الطلب",
    selectDocumentError: "اختر المستند المطلوب قبل الرفع.",
    service: "الخدمة",
    serviceContext: "بيانات الخدمة",
    serviceItem: "بند الخدمة",
    shared: "تمت المشاركة",
    submittedAnswers: "إجابات النموذج المرسلة",
    teamMessage: "رسالة من فريق جزوم",
    uploadDocuments: "رفع المستندات",
    uploadRequired: "ارفع المستند المطلوب حتى يتمكن فريق جزوم من إكمال العمل.",
    uploadStepChoose: "اختر المستند المطلوب",
    uploadStepReview: "راجع بيانات الملف",
    uploadStepSubmit: "ارفع الملف",
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
    answerType: "Field type",
    attachmentHint: "Client-visible attachment metadata",
    attachments: "Visible attachments",
    archiveAttachment: "Remove file",
    archiveAttachmentConfirm:
      "Remove this file? The document request will reopen so you can upload a replacement.",
    back: "Back to requests",
    closedOutput: "This deliverable is closed and kept here for reference.",
    comments: "Comments",
    completed: "Request completed",
    completeness: "Completeness",
    confirmAcceptOutput: "Accept this deliverable?",
    confirmReturnOutput: "Return this deliverable with your comments?",
    created: "Request created",
    decision: "Decision",
    deliverables: "Deliverables",
    deliverablesShared: "Work shared with you",
    deliverablesToReview: "Deliverables to review",
    documentCancelled: "This document request is no longer active.",
    documentClosed: "Accepted",
    documentInstructionsFallback: "Upload the requested document metadata for Jzoom review.",
    documentRequested: "Document requested",
    documentTimeline: "Document update",
    documents: "Documents",
    due: "Due",
    downloadFile: "Download file",
    chooseFile: "Choose file from device",
    fileName: "File name",
    fileFingerprint: "File SHA-256 fingerprint",
    fileProcessing: "Preparing file...",
    fileReady: "File ready",
    fileUploadHint:
      "Choose the requested file and Jzoom will upload it while saving its metadata automatically.",
    fileSizeBytes: "Size bytes",
    generalServiceItem: "General service request",
    jzoomWaiting: "Jzoom is waiting for your response on this request.",
    metadataUpload: "Upload file",
    mimeType: "File type",
    nextAction: "Next action",
    noAction: "No action is pending from you.",
    noActionBody: "Jzoom will share updates here when your review or documents are needed.",
    noAttachments: "No client-visible attachment metadata yet.",
    noComments: "No client-visible comments yet.",
    noDueDate: "No due date",
    noDecision: "This deliverable is no longer waiting for a client decision.",
    noDocumentUpload: "No document upload is currently required from you.",
    noDocuments: "No documents requested yet.",
    noOutputs: "No shared outputs yet.",
    noStructuredAnswers: "No client-visible structured answers were submitted.",
    outputAccepted: "You accepted this deliverable. No further action is needed.",
    outputDefault: "This deliverable is not waiting for a client decision.",
    outputReview: "Please review this deliverable and either accept it or return it with comments.",
    outputReturned: "Jzoom has your return note and will prepare the next revision.",
    outputShared: "Output shared",
    package: "Package",
    pendingReview: "Waiting for your review",
    request: "Request",
    requestProgress: "Progress timeline",
    requestDetail: "Request detail",
    requestDocuments: "Requested documents",
    requestJourney: "Request detail navigation",
    requestSnapshot: "Request snapshot",
    returnNote: "Return note",
    returnOutput: "Return output",
    returnedNote: "Return note",
    reviewDeliverables: "Review deliverables",
    revision: "Revision",
    selectDocument: "Select request",
    selectDocumentError: "Select a requested document before uploading.",
    service: "Service",
    serviceContext: "Service context",
    serviceItem: "Service item",
    shared: "Shared",
    submittedAnswers: "Submitted template answers",
    teamMessage: "Message from Jzoom",
    uploadDocuments: "Upload documents",
    uploadRequired: "Upload the requested document so Jzoom can continue the work.",
    uploadStepChoose: "Choose the requested document",
    uploadStepReview: "Review file details",
    uploadStepSubmit: "Upload file",
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

function safeSystemText(
  value: string | null | undefined,
  fallback: string,
  locale: ClientDisplayLocale,
) {
  return localizedFreeText(value, locale, fallback);
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

const fieldTypeLabels: Record<string, Record<ClientDisplayLocale, string>> = {
  AMOUNT: { ar: "مبلغ", en: "Amount" },
  CHECKBOX: { ar: "اختيار", en: "Checkbox" },
  DATE: { ar: "تاريخ", en: "Date" },
  DROPDOWN: { ar: "قائمة اختيار", en: "Dropdown" },
  EMAIL: { ar: "بريد إلكتروني", en: "Email" },
  FILE: { ar: "ملف", en: "File" },
  LONG_TEXT: { ar: "نص طويل", en: "Long text" },
  MULTI_SELECT: { ar: "اختيار متعدد", en: "Multi select" },
  NUMBER: { ar: "رقم", en: "Number" },
  PHONE: { ar: "هاتف", en: "Phone" },
  RADIO: { ar: "اختيار واحد", en: "Radio" },
  SHORT_TEXT: { ar: "نص قصير", en: "Short text" },
  URL: { ar: "رابط", en: "URL" },
};

function templateFieldTypeLabel(fieldType: string, locale: ClientDisplayLocale): string {
  return fieldTypeLabels[fieldType]?.[locale] ?? (locale === "ar" ? "حقل" : "Field");
}

function answerValue(value: unknown, locale: ClientDisplayLocale): string {
  if (Array.isArray(value)) {
    return value.map((item) => answerValue(item, locale)).join(locale === "ar" ? "، " : ", ");
  }
  if (typeof value === "boolean") {
    return locale === "ar" ? (value ? "نعم" : "لا") : value ? "Yes" : "No";
  }
  if (typeof value === "number") {
    return clientNumber(value, locale);
  }
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }
  return "-";
}

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
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [fileProcessing, setFileProcessing] = useState(false);
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
    if (!window.confirm(t.confirmAcceptOutput)) {
      return;
    }
    void run(() => acceptClientRequestOutput(request.id, outputId));
  }

  function returnOutput(outputId: string) {
    if (!window.confirm(t.confirmReturnOutput)) {
      return;
    }
    void run(async () => {
      const updated = await returnClientRequestOutput(request.id, outputId, returnReason);
      setReturnReason("");
      return updated;
    });
  }

  function submitUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDocumentRequestId) {
      setError(t.selectDocumentError);
      return;
    }
    if (!selectedUploadFile) {
      setError(t.fileUploadHint);
      return;
    }

    void run(async () => {
      const updated = await uploadClientRequestedDocument(
        request.id,
        selectedDocumentRequestId,
        selectedUploadFile,
        {
          mimeType: uploadForm.mimeType,
          originalName: uploadForm.originalName,
          sha256: uploadForm.sha256,
          sizeBytes: Number(uploadForm.sizeBytes),
        },
      );
      setUploadForm({
        documentRequestId: "",
        mimeType: "",
        originalName: "",
        sha256: "",
        sizeBytes: "1",
      });
      setSelectedUploadFile(null);
      return updated;
    });
  }

  async function selectUploadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileProcessing(true);
    setError(null);
    try {
      setSelectedUploadFile(file);
      let sha256 = uploadForm.sha256;
      if (globalThis.crypto?.subtle) {
        const digest = await globalThis.crypto.subtle.digest("SHA-256", await file.arrayBuffer());
        sha256 = Array.from(new Uint8Array(digest))
          .map((byte) => byte.toString(16).padStart(2, "0"))
          .join("");
      }
      setUploadForm((current) => ({
        ...current,
        originalName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: String(Math.max(file.size, 1)),
        sha256,
      }));
    } finally {
      setFileProcessing(false);
    }
  }

  function archiveAttachment(fileId: string) {
    if (!window.confirm(t.archiveAttachmentConfirm)) {
      return;
    }
    void run(() => archiveClientRequestAttachment(request.id, fileId));
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
  const clientTimeline = [
    {
      at: request.createdAt,
      detail: request.requestNumber,
      id: "request-created",
      label: t.created,
    },
    ...sharedOutputs
      .filter((output) => output.sharedAt || output.createdAt)
      .map((output) => ({
        at: output.sharedAt ?? output.createdAt,
        detail: `${t.revision} ${clientNumber(output.revision, locale)}`,
        id: `output-${output.id}`,
        label: t.outputShared,
      })),
    ...request.documentRequests.map((documentRequest) => ({
      at:
        documentRequest.fulfilledAt ??
        documentRequest.closedAt ??
        documentRequest.cancelledAt ??
        documentRequest.requestedAt,
      detail: t.requestDocuments,
      id: `document-${documentRequest.id}`,
      label: documentRequest.status === "REQUESTED" ? t.documentRequested : t.documentTimeline,
    })),
    ...request.comments.map((comment) => ({
      at: comment.createdAt,
      detail: t.comments,
      id: `comment-${comment.id}`,
      label: t.teamMessage,
    })),
  ]
    .filter((item) => item.at)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 6);

  return (
    <>
      <PageHeader
        eyebrow={t.requestDetail}
        title={localizedFreeText(request.title, locale, t.request)}
        description={`${request.requestNumber} - ${clientName(request.service.monthlyService, locale)}`}
        meta={
          <StatusChip status={request.status} label={requestStatusLabel(request.status, locale)} />
        }
      >
        <div className="quote-header-actions">
          <Link className="os-button os-button-secondary" href="/client/requests">
            {t.back}
          </Link>
        </div>
      </PageHeader>

      {error && <p className="form-error">{error}</p>}

      <section className="client-request-command">
        <div className="client-command-main">
          <p className="eyebrow">{t.actionCenter}</p>
          <h2>{isActiveRequest ? t.workInProgress : t.completed}</h2>
          <div className="client-next-actions">
            {nextActions.length === 0 ? (
              <article>
                <strong>{t.noAction}</strong>
                <p>{t.noActionBody}</p>
              </article>
            ) : (
              nextActions.map((action) => (
                <article key={action}>
                  <strong>{t.nextAction}</strong>
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
        </div>
        <div className="client-command-metrics">
          <div className="primary">
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
          <div>
            <span>{t.comments}</span>
            <strong>{clientNumber(request.comments.length, locale)}</strong>
          </div>
        </div>
      </section>

      <nav className="client-detail-tabs" aria-label={t.requestJourney}>
        <a href="#client-deliverables">{t.deliverables}</a>
        <a href="#client-documents">{t.documents}</a>
        <a href="#client-summary">{t.requestSnapshot}</a>
        <a href="#client-timeline">{t.requestProgress}</a>
        <a href="#client-comments">{t.comments}</a>
      </nav>

      <section className="client-action-grid">
        <article className="client-action-panel" id="client-deliverables">
          <div className="client-panel-heading">
            <div>
              <p className="eyebrow">{t.deliverables}</p>
              <h2>{t.deliverablesShared}</h2>
            </div>
            <StatusChip
              status={outputsAwaitingDecision.length > 0 ? "WAITING_CLIENT" : request.status}
              label={requestStatusLabel(request.status, locale)}
            />
          </div>
          <div className="client-card-list">
            {sharedOutputs.length === 0 ? (
              <p>{t.noOutputs}</p>
            ) : (
              sharedOutputs.map((output) => (
                <article className="client-output-card" key={output.id}>
                  <div className="entity-card-heading">
                    <div>
                      <strong>{localizedFreeText(output.title, locale, t.deliverables)}</strong>
                      <small>
                        {t.revision} {clientNumber(output.revision, locale)}
                      </small>
                    </div>
                    <StatusChip
                      status={output.status}
                      label={outputStatusLabel(output.status, locale)}
                    />
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
                  {output.description && (
                    <p>{safeSystemText(output.description, t.attachmentHint, locale)}</p>
                  )}
                  {output.clientReturnReason && (
                    <p>
                      {t.returnedNote}:{" "}
                      {safeSystemText(output.clientReturnReason, t.returnNote, locale)}
                    </p>
                  )}
                  <p>{outputActionCopy(output.status, locale)}</p>
                  {output.status === "SHARED_WITH_CLIENT" ? (
                    <div className="client-decision-bar">
                      <button
                        className="os-button os-button-primary"
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

        <article className="client-action-panel" id="client-documents">
          <div className="client-panel-heading">
            <div>
              <p className="eyebrow">{t.documents}</p>
              <h2>{t.requestDocuments}</h2>
            </div>
            <StatusChip
              status={requestedDocuments.length > 0 ? "WAITING_CLIENT" : request.status}
              label={
                requestedDocuments.length > 0
                  ? t.uploadRequired
                  : requestStatusLabel(request.status, locale)
              }
            />
          </div>
          {requestedDocuments.length === 0 ? (
            <p>{t.noDocumentUpload}</p>
          ) : (
            <form className="catalog-form client-upload-form" onSubmit={submitUpload}>
              <div className="client-upload-steps form-span">
                <span>{t.uploadStepChoose}</span>
                <span>{t.uploadStepReview}</span>
                <span>{t.uploadStepSubmit}</span>
              </div>
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
              <label className="client-file-drop form-span">
                <input type="file" onChange={(event) => void selectUploadFile(event)} />
                <span>{t.chooseFile}</span>
                <small>{fileProcessing ? t.fileProcessing : t.fileUploadHint}</small>
              </label>
              {uploadForm.originalName && (
                <div className="client-upload-preview form-span">
                  <strong>{t.fileReady}</strong>
                  <span>
                    {uploadForm.originalName} -{" "}
                    {fileSize(Number(uploadForm.sizeBytes || 0), locale)}
                  </span>
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
                {t.fileFingerprint}
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
          <div className="client-card-list">
            {request.documentRequests.length === 0 ? (
              <p>{t.noDocuments}</p>
            ) : (
              request.documentRequests.map((documentRequest) => (
                <article className="client-document-card" key={documentRequest.id}>
                  <div className="entity-card-heading">
                    <div>
                      <strong>
                        {safeSystemText(documentRequest.title, t.requestDocuments, locale)}
                      </strong>
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
                    <p>
                      {safeSystemText(
                        documentRequest.instructions,
                        t.documentInstructionsFallback,
                        locale,
                      )}
                    </p>
                  )}
                  {documentRequest.file && (
                    <div>
                      <p>
                        {t.uploadedPrefix}: {documentRequest.file.originalName} -{" "}
                        {fileSize(documentRequest.file.sizeBytes, locale)}
                      </p>
                      <div className="row-actions">
                        {documentRequest.file.downloadUrl && (
                          <a
                            className="os-button os-button-secondary"
                            href={documentRequest.file.downloadUrl}
                          >
                            {t.downloadFile}
                          </a>
                        )}
                        <button
                          className="os-button os-button-secondary"
                          disabled={saving}
                          type="button"
                          onClick={() => {
                            if (documentRequest.file) archiveAttachment(documentRequest.file.id);
                          }}
                        >
                          {t.archiveAttachment}
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="client-request-context-grid">
        <article className="client-context-panel" id="client-summary">
          <h2>{t.requestSnapshot}</h2>
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
              <dd>
                {request.serviceItem
                  ? clientName(request.serviceItem, locale)
                  : t.generalServiceItem}
              </dd>
            </div>
            <div>
              <dt>{t.due}</dt>
              <dd>{request.dueAt ? clientDateTime(request.dueAt, locale) : t.noDueDate}</dd>
            </div>
          </dl>
          <p>{localizedFreeText(request.description, locale, t.requestDetail)}</p>
        </article>

        <article className="client-context-panel" id="client-timeline">
          <h2>{t.requestProgress}</h2>
          <ol className="client-timeline-list">
            {clientTimeline.map((item) => (
              <li key={item.id}>
                <span />
                <div>
                  <strong>{item.label}</strong>
                  <small>{clientDateTime(item.at, locale)}</small>
                  <p>{item.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </article>

        <article className="client-context-panel">
          <h2>{t.visibleAttachments}</h2>
          <div className="client-card-list compact">
            {request.attachments.length === 0 ? (
              <p>{t.noAttachments}</p>
            ) : (
              request.attachments.map((file) => (
                <article key={file.id}>
                  <strong>{file.originalName}</strong>
                  <small>{fileSize(file.sizeBytes, locale)}</small>
                  {file.downloadUrl && (
                    <a className="os-button os-button-secondary" href={file.downloadUrl}>
                      {t.downloadFile}
                    </a>
                  )}
                </article>
              ))
            )}
          </div>
        </article>
      </section>

      {request.templateResponse && (
        <section className="client-context-panel">
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
                  <strong>
                    {locale === "ar"
                      ? answer.labelAr || answer.labelEn
                      : answer.labelEn || answer.labelAr}
                  </strong>
                  <small>{templateFieldTypeLabel(answer.fieldType, locale)}</small>
                  <p>{answerValue(answer.value, locale)}</p>
                </article>
              ))
            )}
          </div>
        </section>
      )}

      <section className="client-context-panel client-comments-panel" id="client-comments">
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
