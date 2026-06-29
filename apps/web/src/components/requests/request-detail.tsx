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
import { normalizeLocale, type SupportedLocale } from "../../lib/i18n";
import { riyadhDateInputValue } from "../../lib/stable-date";
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

const copy = {
  ar: {
    accountManager: "مدير الحساب",
    activity: "النشاط",
    addChecklistItem: "إضافة بند",
    addComment: "إضافة تعليق",
    addInternalNote: "إضافة ملاحظة داخلية",
    addMetadata: "إضافة البيانات",
    addTime: "إضافة وقت",
    actionShortcuts: "اختصارات التشغيل",
    approved: "معتمد",
    approve: "اعتماد",
    approveRequest: "اعتماد الطلب",
    approvedReady: "معتمد وجاهز للمشاركة",
    assignee: "المسؤول",
    assignments: "الإسناد",
    attachmentMetadata: "بيانات المرفقات",
    attachmentUnavailable: "تحديث بيانات المرفقات متاح لمساحات العمل الداخلية المسندة.",
    backToRequests: "العودة للطلبات",
    basicTimeEntries: "سجل الوقت",
    billable: "قابل للفوترة",
    blocked: "متوقف",
    bytes: "بايت",
    cancel: "إلغاء",
    checklistUnavailable: "تحديث قائمة العمل متاح لمساحات العمل الداخلية المسندة.",
    client: "العميل",
    clientDocumentRequests: "مستندات العميل المطلوبة",
    clientDocuments: "مستندات العميل",
    clientDocumentUnavailable: "طلب مستندات العميل متاح لمساحات العمل الداخلية المسندة.",
    clientVisible: "ظاهر للعميل",
    close: "إغلاق",
    closeDelivery: "إغلاق التسليم",
    comment: "تعليق",
    comments: "التعليقات",
    completeness: "الاكتمال",
    createInternalOutput: "إنشاء مخرج داخلي",
    createdBy: "أنشئ بواسطة",
    current: "الحالة الحالية",
    decisionNote: "ملاحظة القرار",
    description: "الوصف",
    documentTitle: "عنوان المستند",
    done: "منجز",
    due: "الموعد",
    dueAt: "الموعد",
    escalate: "تصعيد",
    generalServiceRequest: "طلب عام على الخدمة",
    hours: "الساعات",
    internal: "داخلي",
    internalChecklist: "قائمة العمل الداخلية",
    internalNotes: "الملاحظات الداخلية",
    internalOnly: "داخلي فقط",
    internalOutputUnavailable: "تجهيز المخرجات متاح للمختصين المسندين والأدوار العامة.",
    internalOutputs: "المخرجات الداخلية",
    internalUser: "مستخدم داخلي",
    instructions: "التعليمات",
    keepAccountManager: "إبقاء مدير الحساب الحالي",
    keepSpecialist: "إبقاء المختص الحالي",
    keepSupervisor: "إبقاء المشرف الحالي",
    lifecycle: "مسار الحالة",
    metadataVisibility: "الظهور",
    mimeType: "نوع الملف",
    noAction: "لا يوجد إجراء معطل الآن.",
    noActionBody: "لا يوجد إجراء مطلوب لهذا الدور في مساحة العمل الحالية.",
    noAnswers: "لا توجد إجابات منظمة مرسلة.",
    noAssignee: "بدون مسؤول",
    noActivity: "لا يوجد نشاط مسجل على الطلب حتى الآن.",
    noAttachments: "لا توجد مرفقات محفوظة على الطلب حتى الآن.",
    noClientDocuments: "لم يتم طلب مستندات من العميل حتى الآن.",
    noComments: "لا توجد تعليقات على الطلب حتى الآن.",
    noInternalChecklist: "لا توجد بنود عمل داخلية حتى الآن.",
    noInternalNotes: "لا توجد ملاحظات داخلية حتى الآن.",
    noInternalOutputs: "لا توجد مخرجات داخلية حتى الآن.",
    noTimeEntries: "لا توجد قيود وقت حتى الآن.",
    notApplicable: "لا ينطبق",
    notSet: "غير محدد",
    note: "ملاحظة",
    nonBillable: "غير قابل للفوترة",
    nextAction: "الإجراء التالي",
    operatingPath: "مسار التشغيل",
    operationsSignals: "مؤشرات تشغيل الطلب",
    operationsWorkbench: "مساحة تشغيل الطلب",
    outputCode: "رمز المخرج",
    package: "الباقة",
    pending: "قيد الانتظار",
    priority: "الأولوية",
    reason: "السبب",
    reject: "رفض",
    requestContext: "سياق الطلب",
    requestDetail: "تفاصيل الطلب",
    requestDocument: "طلب مستند",
    requestSections: "أقسام تفاصيل الطلب",
    returnChanges: "إرجاع للتعديل",
    reviewNote: "ملاحظة المراجعة",
    reviewReason: "سبب مراجعة المشرف",
    reviewedBy: "تمت المراجعة بواسطة",
    saveAssignment: "حفظ الإسناد",
    service: "الخدمة",
    serviceItem: "بند الخدمة",
    shareWithClient: "مشاركة مع العميل",
    sharedAt: "تمت المشاركة",
    sizeBytes: "الحجم بالبايت",
    specialist: "المختص",
    start: "بدء",
    startWork: "بدء العمل",
    status: "الحالة",
    statusUnavailable: "تغيير الحالة متاح للمشرف المسند أو الإدارة أو الأدمن.",
    submit: "إرسال",
    submittedHours: "ساعات مقدمة",
    supervisor: "المشرف",
    supervisorReview: "مراجعة المشرف",
    taskTitle: "عنوان المهمة",
    templateAnswers: "إجابات النموذج",
    timeUnavailable: "تسجيل الوقت متاح للمستخدمين التنفيذيين المسندين والأدوار العامة.",
    title: "العنوان",
    totalChecklistItems: "إجمالي بنود القائمة",
    updateStatus: "تحديث الحالة",
    uploaded: "مرفوعة",
    uploadedByClient: "مرفوعة من العميل",
    uploadedFile: "ملف مرفوع",
    uuidOrClear: "معرف المستخدم أو clear",
    originalName: "اسم الملف",
    visibleToClient: "ظاهر للعميل",
    workDate: "تاريخ العمل",
    workflow: "سير العمل",
    workspace: {
      admin: {
        title: "غرفة تشغيل الأدمن",
        description: "إشراف كامل على الحالة، الإسناد، المخرجات، المستندات، والساعات.",
      },
      management: {
        title: "مراجعة الإدارة",
        description: "رؤية تنفيذية مع صلاحية مراجعة التصعيد والاعتمادات.",
      },
      supervisor: {
        title: "مركز مراجعة المشرف",
        description: "مراجعة الجودة، اعتماد التسليم، متابعة عبء العمل، وقرارات الساعات.",
      },
      specialist: {
        title: "مساحة عمل المختص",
        description: "تنفيذ العمل المسند، قائمة العمل، طلب المستندات، المخرجات، وتسجيل الوقت.",
      },
      accountManager: {
        title: "متابعة مدير الحساب",
        description: "سياق العميل، ملاحظات العلاقة، متابعة المستندات، ورؤية حالة الطلب.",
      },
      default: { title: "مساحة الطلب", description: "رؤية محددة حسب نطاق الصلاحية." },
    },
    nav: {
      activity: "النشاط",
      attachments: "المرفقات",
      checklist: "قائمة العمل",
      comments: "التعليقات",
      documents: "المستندات",
      hours: "الساعات",
      notes: "الملاحظات",
      outputs: "المخرجات",
      summary: "الملخص",
      workflow: "سير العمل",
    },
  },
  en: {
    accountManager: "Account manager",
    activity: "Activity",
    addChecklistItem: "Add checklist item",
    addComment: "Add comment",
    addInternalNote: "Add internal note",
    addMetadata: "Add metadata",
    addTime: "Add time",
    actionShortcuts: "Operations shortcuts",
    approved: "approved",
    approve: "Approve",
    approveRequest: "Approve request",
    approvedReady: "approved and ready to share",
    assignee: "Assignee",
    assignments: "Assignments",
    attachmentMetadata: "Attachment metadata",
    attachmentUnavailable:
      "Attachment metadata updates are available to assigned internal workspaces.",
    backToRequests: "Back to requests",
    basicTimeEntries: "Basic time entries",
    billable: "Billable",
    blocked: "Blocked",
    bytes: "bytes",
    cancel: "Cancel",
    checklistUnavailable: "Checklist updates are limited to assigned internal workspaces.",
    client: "Client",
    clientDocumentRequests: "Client document requests",
    clientDocuments: "Client documents",
    clientDocumentUnavailable:
      "Client document requests are available to assigned internal workspaces.",
    clientVisible: "Client-visible",
    close: "Close",
    closeDelivery: "Close delivery",
    comment: "Comment",
    comments: "Comments",
    completeness: "Completeness",
    createInternalOutput: "Create internal output",
    createdBy: "created by",
    current: "Current",
    decisionNote: "Decision note",
    description: "Description",
    documentTitle: "Document title",
    done: "Done",
    due: "Due",
    dueAt: "Due at",
    escalate: "Escalate",
    generalServiceRequest: "General service request",
    hours: "Hours",
    internal: "Internal",
    internalChecklist: "Internal checklist",
    internalNotes: "Internal notes",
    internalOnly: "Internal-only",
    internalOutputUnavailable:
      "Deliverable preparation is available to assigned specialists and global roles.",
    internalOutputs: "Internal outputs",
    internalUser: "Internal user",
    instructions: "Instructions",
    keepAccountManager: "Keep current account manager",
    keepSpecialist: "Keep current specialist",
    keepSupervisor: "Keep current supervisor",
    lifecycle: "Lifecycle",
    metadataVisibility: "Visibility",
    mimeType: "MIME type",
    noAction: "No blocking operation right now.",
    noActionBody: "The request has no role-specific pending action for your workspace.",
    noAnswers: "No structured answers were submitted.",
    noAssignee: "No assignee",
    noActivity: "No request activity has been recorded yet.",
    noAttachments: "No attachments are stored on this request yet.",
    noClientDocuments: "No client documents requested yet.",
    noComments: "No comments have been added to this request yet.",
    noInternalChecklist: "No internal checklist items yet.",
    noInternalNotes: "No internal notes have been added yet.",
    noInternalOutputs: "No internal outputs prepared yet.",
    noTimeEntries: "No time entries yet.",
    notApplicable: "N/A",
    notSet: "Not set",
    note: "Note",
    nonBillable: "Non-billable",
    nextAction: "Next action",
    operatingPath: "Operating path",
    operationsSignals: "Request operating signals",
    operationsWorkbench: "Operations workbench",
    outputCode: "Output code",
    package: "Package",
    pending: "Pending",
    priority: "Priority",
    reason: "Reason",
    reject: "Reject",
    requestContext: "Request context",
    requestDetail: "Request detail",
    requestDocument: "Request document",
    requestSections: "Request detail sections",
    returnChanges: "Return changes",
    reviewNote: "Review note",
    reviewReason: "Supervisor review reason",
    reviewedBy: "reviewed by",
    saveAssignment: "Save assignment",
    service: "Service",
    serviceItem: "Service item",
    shareWithClient: "Share with client",
    sharedAt: "shared",
    sizeBytes: "Size bytes",
    specialist: "Specialist",
    start: "Start",
    startWork: "Start work",
    status: "Status",
    statusUnavailable:
      "Status changes are handled by the assigned supervisor, management, or admin.",
    submit: "Submit",
    submittedHours: "Submitted hours",
    supervisor: "Supervisor",
    supervisorReview: "Supervisor review",
    taskTitle: "Task title",
    templateAnswers: "Template answers",
    timeUnavailable: "Time registration is available to assigned execution users and global roles.",
    title: "Title",
    totalChecklistItems: "total checklist items",
    updateStatus: "Update status",
    uploaded: "uploaded",
    uploadedByClient: "uploaded by client",
    uploadedFile: "Uploaded",
    uuidOrClear: "UUID or clear",
    originalName: "Original name",
    visibleToClient: "Visible to client",
    workDate: "Work date",
    workflow: "Workflow",
    workspace: {
      admin: {
        title: "Admin operations control",
        description: "Full request control, assignment, review, delivery, and hours oversight.",
      },
      management: {
        title: "Management review",
        description: "Executive visibility with escalation and approval access.",
      },
      supervisor: {
        title: "Supervisor review",
        description: "Quality review, delivery approval, workload, and hours decisions.",
      },
      specialist: {
        title: "Specialist workbench",
        description:
          "Assigned execution, checklist work, document requests, deliverables, and time.",
      },
      accountManager: {
        title: "Account manager follow-up",
        description:
          "Client context, relationship notes, document follow-up, and status visibility.",
      },
      default: { title: "Request workspace", description: "Scoped request visibility." },
    },
    nav: {
      activity: "Activity",
      attachments: "Attachments",
      checklist: "Checklist",
      comments: "Comments",
      documents: "Documents",
      hours: "Hours",
      notes: "Notes",
      outputs: "Outputs",
      summary: "Summary",
      workflow: "Workflow",
    },
  },
} as const;

const statusLabels = {
  ASSIGNED: { ar: "مسند", en: "Assigned" },
  CLOSED: { ar: "مغلق", en: "Closed" },
  COMPLETED: { ar: "مكتمل", en: "Completed" },
  IN_PROGRESS: { ar: "قيد التنفيذ", en: "In progress" },
  NEW: { ar: "جديد", en: "New" },
  REJECTED: { ar: "مرفوض", en: "Rejected" },
  RETURNED: { ar: "معاد للتعديل", en: "Returned" },
  TRIAGE: { ar: "قيد الفرز", en: "In review" },
  WAITING_CLIENT: { ar: "بانتظار العميل", en: "Waiting for client" },
  WAITING_SUPERVISOR: { ar: "بانتظار المشرف", en: "Waiting for supervisor" },
} satisfies Record<RequestStatus, Record<SupportedLocale, string>>;

const priorityLabels = {
  LOW: { ar: "منخفضة", en: "Low" },
  NORMAL: { ar: "عادية", en: "Normal" },
  HIGH: { ar: "عالية", en: "High" },
  URGENT: { ar: "عاجلة", en: "Urgent" },
} as const;

const codeLabels: Record<string, Record<SupportedLocale, string>> = {
  ACCEPTED_BY_CLIENT: { ar: "مقبول من العميل", en: "Accepted by client" },
  ACCOUNT_MANAGER: { ar: "مدير الحساب", en: "Account manager" },
  ADMIN: { ar: "الأدمن", en: "Admin" },
  APPROVED: { ar: "معتمد", en: "Approved" },
  APPROVED_INTERNAL: { ar: "معتمد داخليًا", en: "Approved internally" },
  BLOCKED: { ar: "متوقف", en: "Blocked" },
  CANCELLED: { ar: "ملغي", en: "Cancelled" },
  CLIENT: { ar: "العميل", en: "Client" },
  CLIENT_VISIBLE: { ar: "ظاهر للعميل", en: "Client-visible" },
  CLOSED: { ar: "مغلق", en: "Closed" },
  DRAFT: { ar: "مسودة", en: "Draft" },
  DONE: { ar: "منجز", en: "Done" },
  EMAIL: { ar: "بريد إلكتروني", en: "Email" },
  FILE: { ar: "ملف", en: "File" },
  HIGH: { ar: "عالية", en: "High" },
  IN_PROGRESS: { ar: "قيد التنفيذ", en: "In progress" },
  INTERNAL: { ar: "داخلي", en: "Internal" },
  INTERNAL_REVIEW: { ar: "مراجعة داخلية", en: "Internal review" },
  LOW: { ar: "منخفضة", en: "Low" },
  MANAGEMENT: { ar: "الإدارة", en: "Management" },
  NORMAL: { ar: "عادية", en: "Normal" },
  NOT_APPLICABLE: { ar: "لا ينطبق", en: "Not applicable" },
  NUMBER: { ar: "رقم", en: "Number" },
  PENDING: { ar: "قيد الانتظار", en: "Pending" },
  REJECTED: { ar: "مرفوض", en: "Rejected" },
  REQUESTED: { ar: "مطلوب", en: "Requested" },
  RETURNED_BY_CLIENT: { ar: "معاد من العميل", en: "Returned by client" },
  REVISION_REQUESTED: { ar: "مطلوب تعديل", en: "Revision requested" },
  SELECT: { ar: "اختيار", en: "Select" },
  SHARED_WITH_CLIENT: { ar: "مشارك مع العميل", en: "Shared with client" },
  SPECIALIST: { ar: "المختص", en: "Specialist" },
  START: { ar: "البداية", en: "Start" },
  SUBMITTED: { ar: "مرسل للمراجعة", en: "Submitted" },
  SUPERVISOR: { ar: "المشرف", en: "Supervisor" },
  TEXT: { ar: "نص", en: "Text" },
  TEXTAREA: { ar: "نص طويل", en: "Long text" },
  TODO: { ar: "للعمل", en: "To do" },
  TRIAGE: { ar: "قيد الفرز", en: "In review" },
  UPLOADED: { ar: "مرفوع", en: "Uploaded" },
  URGENT: { ar: "عاجلة", en: "Urgent" },
};

function dateTime(value: string | null, locale: SupportedLocale): string {
  if (!value) return copy[locale].notSet;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function assignee(
  value: ServiceRequest["assignments"]["specialist"],
  locale: SupportedLocale,
): string {
  return value ? value.displayName : copy[locale].noAssignee;
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

function hours(entries: ServiceRequest["timeEntries"], locale: SupportedLocale): string {
  const total = entries.reduce((sum, entry) => sum + Number(entry.hours), 0);
  const value = total.toFixed(total % 1 === 0 ? 0 : 2);
  return locale === "ar" ? `${value} س` : `${value}h`;
}

function serviceName(request: ServiceRequest, locale: SupportedLocale): string {
  return locale === "ar"
    ? request.service.monthlyService.nameAr || request.service.monthlyService.nameEn
    : request.service.monthlyService.nameEn || request.service.monthlyService.nameAr;
}

function serviceLevelLabel(request: ServiceRequest, locale: SupportedLocale): string {
  return locale === "ar"
    ? request.service.serviceLevel.labelAr ||
        request.service.serviceLevel.labelEn ||
        request.service.serviceLevel.code
    : request.service.serviceLevel.labelEn ||
        request.service.serviceLevel.labelAr ||
        request.service.serviceLevel.code;
}

function serviceItemLabel(request: ServiceRequest, locale: SupportedLocale): string {
  if (!request.serviceItem) return copy[locale].generalServiceRequest;
  return locale === "ar"
    ? request.serviceItem.nameAr || request.serviceItem.nameEn
    : request.serviceItem.nameEn || request.serviceItem.nameAr;
}

function statusLabel(status: RequestStatus, locale: SupportedLocale): string {
  return statusLabels[status]?.[locale] ?? status;
}

function priorityLabel(priority: string, locale: SupportedLocale): string {
  return priorityLabels[priority as keyof typeof priorityLabels]?.[locale] ?? priority;
}

function codeLabel(value: string | null | undefined, locale: SupportedLocale): string {
  if (!value) return copy[locale].notSet;
  const requestStatus = statusLabels[value as RequestStatus]?.[locale];
  if (requestStatus) return requestStatus;
  const label = codeLabels[value]?.[locale];
  if (label) return label;
  return locale === "en" ? value.replaceAll("_", " ").toLowerCase() : value;
}

function roleWorkspace(
  user: CurrentUser,
  locale: SupportedLocale,
): { title: string; description: string } {
  const t = copy[locale].workspace;
  if (hasRole(user, "ROLE-ADMIN")) {
    return t.admin;
  }
  if (hasRole(user, "ROLE-MGMT")) {
    return t.management;
  }
  if (hasRole(user, "ROLE-SUPERVISOR")) {
    return t.supervisor;
  }
  if (hasRole(user, "ROLE-SPECIALIST")) {
    return t.specialist;
  }
  if (hasRole(user, "ROLE-AM")) {
    return t.accountManager;
  }
  return t.default;
}

function RequestDetailNav({ locale }: { locale: SupportedLocale }) {
  const t = copy[locale];
  const sections = [
    ["#request-context", t.nav.summary],
    ["#request-lifecycle", t.nav.workflow],
    ["#request-checklist", t.nav.checklist],
    ["#request-outputs", t.nav.outputs],
    ["#request-documents", t.nav.documents],
    ["#request-hours", t.nav.hours],
    ["#request-comments", t.nav.comments],
    ["#request-notes", t.nav.notes],
    ["#request-attachments", t.nav.attachments],
    ["#request-activity", t.nav.activity],
  ] as const;

  return (
    <nav className="request-detail-nav" aria-label={t.requestSections}>
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

function EmptyActivity({ message }: { message: string }) {
  return (
    <article className="activity-empty">
      <strong>{message}</strong>
    </article>
  );
}

function WorkflowStepper({ locale, status }: { locale: SupportedLocale; status: RequestStatus }) {
  const t = copy[locale];
  const currentIndex = workflowStages.indexOf(status);

  return (
    <section className="request-workflow-stepper" aria-label={t.workflow}>
      <div className="request-workflow-heading">
        <div>
          <p className="eyebrow">{t.workflow}</p>
          <h2>{t.operatingPath}</h2>
        </div>
        <StatusChip status={status} label={`${t.current}: ${statusLabel(status, locale)}`} />
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
              <strong>{statusLabel(stage, locale)}</strong>
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
  const locale = normalizeLocale(currentUser.preferredLocale);
  const t = copy[locale];
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
  const workspace = roleWorkspace(currentUser, locale);
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
      ? [
          locale === "ar"
            ? "أسند الطلب إلى مختص قبل بدء التنفيذ."
            : "Assign a specialist before execution starts.",
        ]
      : []),
    ...(canStartWork
      ? [
          locale === "ar"
            ? "ابدأ العمل وانقل الطلب إلى مرحلة التنفيذ."
            : "Start work and move the request into execution.",
        ]
      : []),
    ...(canExecute && returnedOutputs.length > 0
      ? [
          locale === "ar"
            ? `راجع ${returnedOutputs.length} من المخرجات المعادة.`
            : `Revise ${returnedOutputs.length} returned deliverable(s).`,
        ]
      : []),
    ...(canSupervise && reviewOutputs.length > 0
      ? [
          locale === "ar"
            ? `راجع ${reviewOutputs.length} من المخرجات بانتظار اعتماد المشرف.`
            : `Review ${reviewOutputs.length} deliverable(s) waiting for supervisor approval.`,
        ]
      : []),
    ...(canSupervise && readyOutputs.length > 0
      ? [
          locale === "ar"
            ? `شارك ${readyOutputs.length} من المخرجات المعتمدة مع العميل.`
            : `Share ${readyOutputs.length} approved deliverable(s) with the client.`,
        ]
      : []),
    ...(canSupervise && submittedTimeEntries.length > 0
      ? [
          locale === "ar"
            ? `اعتمد أو ارفض ${submittedTimeEntries.length} من قيود الوقت المقدمة.`
            : `Approve or reject ${submittedTimeEntries.length} submitted time entry(s).`,
        ]
      : []),
    ...(canRequestDocuments && uploadedDocumentRequests.length > 0
      ? [
          locale === "ar"
            ? `أغلق ${uploadedDocumentRequests.length} من طلبات مستندات العميل المرفوعة.`
            : `Close ${uploadedDocumentRequests.length} uploaded client document request(s).`,
        ]
      : []),
    ...(request.status === "WAITING_CLIENT"
      ? [
          locale === "ar"
            ? "الطلب بانتظار رد العميل أو رفع مستند."
            : "Request is waiting for a client response or document upload.",
        ]
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

  const operationShortcuts = [
    ...(canAssign
      ? [{ href: "#request-context", label: t.saveAssignment, detail: t.assignments }]
      : []),
    ...(canStartWork
      ? [{ href: "#request-lifecycle", label: t.startWork, detail: t.lifecycle }]
      : []),
    ...(canExecute
      ? [
          { href: "#request-checklist", label: t.addChecklistItem, detail: t.internalChecklist },
          { href: "#request-outputs", label: t.createInternalOutput, detail: t.internalOutputs },
          { href: "#request-hours", label: t.addTime, detail: t.basicTimeEntries },
        ]
      : []),
    ...(canSupervise
      ? [
          { href: "#request-outputs", label: t.supervisorReview, detail: t.internalOutputs },
          { href: "#request-hours", label: t.approve, detail: t.submittedHours },
        ]
      : []),
    ...(canRequestDocuments
      ? [{ href: "#request-documents", label: t.requestDocument, detail: t.clientDocuments }]
      : []),
    { href: "#request-comments", label: t.addComment, detail: t.comments },
  ].slice(0, 6);

  return (
    <>
      <PageHeader
        eyebrow={t.requestDetail}
        title={request.title}
        description={`${request.requestNumber} - ${request.client.name} - ${serviceName(request, locale)}`}
        meta={
          <>
            <StatusChip status={request.status} label={statusLabel(request.status, locale)} />
            <PriorityChip
              priority={request.priority}
              label={priorityLabel(request.priority, locale)}
            />
          </>
        }
      >
        <div className="quote-header-actions">
          <Link className="os-button os-button-secondary" href="/requests">
            {t.backToRequests}
          </Link>
        </div>
      </PageHeader>

      {error && <p className="form-error">{error}</p>}

      <RequestDetailNav locale={locale} />

      <section className="request-ops-command">
        <div className="request-ops-main">
          <p className="eyebrow">{t.operationsWorkbench}</p>
          <h2>{workspace.title}</h2>
          <p>{workspace.description}</p>
          <div className="request-next-actions">
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
          <div className="request-primary-actions" aria-label={t.actionShortcuts}>
            {operationShortcuts.map((action) => (
              <a key={`${action.href}-${action.label}`} href={action.href}>
                <span>{action.detail}</span>
                <strong>{action.label}</strong>
              </a>
            ))}
          </div>
        </div>
        <div className="request-ops-metrics" aria-label={t.operationsSignals}>
          <RequestSignalCard
            label={t.internalChecklist}
            value={openTasks.length}
            detail={`${request.tasks.length} ${t.totalChecklistItems}`}
          />
          <RequestSignalCard
            label={t.supervisorReview}
            value={reviewOutputs.length}
            detail={`${readyOutputs.length} ${t.approvedReady}`}
          />
          <RequestSignalCard
            label={t.clientDocuments}
            value={clientDocumentRequests.length}
            detail={`${uploadedDocumentRequests.length} ${t.uploadedByClient}`}
          />
          <RequestSignalCard
            label={t.submittedHours}
            value={hours(submittedTimeEntries, locale)}
            detail={`${hours(approvedTimeEntries, locale)} ${t.approved}`}
          />
        </div>
      </section>

      <WorkflowStepper locale={locale} status={request.status} />

      <section className="quote-summary-grid" id="request-context">
        <article className="catalog-panel">
          <h2>{t.requestContext}</h2>
          <dl className="quote-definition-list">
            <div>
              <dt>{t.client}</dt>
              <dd>{request.client.name}</dd>
            </div>
            <div>
              <dt>{t.service}</dt>
              <dd>{serviceName(request, locale)}</dd>
            </div>
            <div>
              <dt>{t.package}</dt>
              <dd>{serviceLevelLabel(request, locale)}</dd>
            </div>
            <div>
              <dt>{t.hours}</dt>
              <dd>{request.service.hoursAllocated}</dd>
            </div>
            <div>
              <dt>{t.serviceItem}</dt>
              <dd>{serviceItemLabel(request, locale)}</dd>
            </div>
            <div>
              <dt>{t.due}</dt>
              <dd>{dateTime(request.dueAt, locale)}</dd>
            </div>
          </dl>
          <p>{request.description}</p>
        </article>

        <article className="catalog-panel">
          <h2>{t.assignments}</h2>
          <dl className="quote-definition-list">
            <div>
              <dt>{t.specialist}</dt>
              <dd>{assignee(request.assignments.specialist, locale)}</dd>
            </div>
            <div>
              <dt>{t.supervisor}</dt>
              <dd>{assignee(request.assignments.supervisor, locale)}</dd>
            </div>
            <div>
              <dt>{t.accountManager}</dt>
              <dd>{assignee(request.assignments.accountManager, locale)}</dd>
            </div>
          </dl>
          {canAssign ? (
            <form className="catalog-form" onSubmit={submitAssignment}>
              {assignmentCandidates ? (
                <>
                  <label>
                    {t.specialist}
                    <select
                      value={assignmentForm.assignedSpecialistId}
                      onChange={(event) =>
                        setAssignmentForm({
                          ...assignmentForm,
                          assignedSpecialistId: event.target.value,
                        })
                      }
                    >
                      <option value="">{t.keepSpecialist}</option>
                      <option value="clear">{t.noAssignee}</option>
                      {assignmentCandidates.specialists.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {assignmentCandidateLabel(candidate)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t.supervisor}
                    <select
                      value={assignmentForm.assignedSupervisorId}
                      onChange={(event) =>
                        setAssignmentForm({
                          ...assignmentForm,
                          assignedSupervisorId: event.target.value,
                        })
                      }
                    >
                      <option value="">{t.keepSupervisor}</option>
                      <option value="clear">{t.noAssignee}</option>
                      {assignmentCandidates.supervisors.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {assignmentCandidateLabel(candidate)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t.accountManager}
                    <select
                      value={assignmentForm.accountManagerId}
                      onChange={(event) =>
                        setAssignmentForm({
                          ...assignmentForm,
                          accountManagerId: event.target.value,
                        })
                      }
                    >
                      <option value="">{t.keepAccountManager}</option>
                      <option value="clear">{t.noAssignee}</option>
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
                    {t.specialist}
                    <input
                      placeholder={t.uuidOrClear}
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
                    {t.supervisor}
                    <input
                      placeholder={t.uuidOrClear}
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
                    {t.accountManager}
                    <input
                      placeholder={t.uuidOrClear}
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
                {t.reason}
                <input
                  value={assignmentForm.reason}
                  onChange={(event) =>
                    setAssignmentForm({ ...assignmentForm, reason: event.target.value })
                  }
                />
              </label>
              <button
                className="os-button os-button-primary"
                type="submit"
                disabled={saving === "assignment"}
              >
                {t.saveAssignment}
              </button>
            </form>
          ) : (
            <p>{t.statusUnavailable}</p>
          )}
        </article>
      </section>

      <section className="catalog-panel" id="request-lifecycle">
        <h2>{t.lifecycle}</h2>
        {canManageLifecycle ? (
          <form className="catalog-form" onSubmit={submitStatus}>
            <label>
              {t.status}
              <select
                value={statusForm.status}
                onChange={(event) =>
                  setStatusForm({ ...statusForm, status: event.target.value as RequestStatus })
                }
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status, locale)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t.reason}
              <input
                value={statusForm.reason}
                onChange={(event) => setStatusForm({ ...statusForm, reason: event.target.value })}
              />
            </label>
            <button
              className="os-button os-button-primary"
              type="submit"
              disabled={saving === "status"}
            >
              {t.updateStatus}
            </button>
          </form>
        ) : (
          <p>{t.statusUnavailable}</p>
        )}
        <div className="row-actions">
          {canStartWork && (
            <button
              className="os-button os-button-secondary"
              disabled={saving === "start"}
              type="button"
              onClick={startWork}
            >
              {t.startWork}
            </button>
          )}
          {canSupervise && (
            <>
              <input
                aria-label={t.reviewReason}
                placeholder={t.reviewReason}
                value={reviewReason}
                onChange={(event) => setReviewReason(event.target.value)}
              />
              <button
                className="os-button os-button-secondary"
                type="button"
                onClick={() => supervisorAction("APPROVE")}
              >
                {t.approveRequest}
              </button>
              <button
                className="os-button os-button-secondary"
                type="button"
                onClick={() => supervisorAction("RETURN")}
              >
                {t.returnChanges}
              </button>
              <button
                className="os-button os-button-danger"
                type="button"
                onClick={() => supervisorAction("REJECT")}
              >
                {t.reject}
              </button>
              <button
                className="os-button os-button-secondary"
                type="button"
                onClick={() => supervisorAction("ESCALATE")}
              >
                {t.escalate}
              </button>
            </>
          )}
        </div>
      </section>

      {request.templateResponse && (
        <section className="catalog-panel" id="request-template">
          <h2>{t.templateAnswers}</h2>
          <p>
            {t.completeness}:{" "}
            <StatusChip
              status={request.templateResponse.completenessStatus}
              label={codeLabel(request.templateResponse.completenessStatus, locale)}
            />
          </p>
          <div className="activity-list">
            {request.templateResponse.answers.length === 0 ? (
              <p>{t.noAnswers}</p>
            ) : (
              request.templateResponse.answers.map((answer) => (
                <article key={answer.id}>
                  <strong>
                    {locale === "ar"
                      ? answer.labelAr || answer.labelEn
                      : answer.labelEn || answer.labelAr}
                  </strong>
                  <small>
                    {answer.fieldCode} - {codeLabel(answer.fieldType, locale)} -{" "}
                    {answer.clientVisible ? t.clientVisible : t.internalOnly}
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
          <h2>{t.internalChecklist}</h2>
          {canAddOperationalContext ? (
            <form className="catalog-form" onSubmit={submitTask}>
              <label>
                {t.taskTitle}
                <input
                  required
                  value={taskForm.title}
                  onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })}
                />
              </label>
              {assignmentCandidates ? (
                <label>
                  {t.assignee}
                  <select
                    value={taskForm.assigneeId}
                    onChange={(event) =>
                      setTaskForm({ ...taskForm, assigneeId: event.target.value })
                    }
                  >
                    <option value="">{t.noAssignee}</option>
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
                    {t.assignee}
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
                {t.priority}
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
                      {priorityLabel(priority, locale)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t.dueAt}
                <input
                  type="datetime-local"
                  value={taskForm.dueAt}
                  onChange={(event) => setTaskForm({ ...taskForm, dueAt: event.target.value })}
                />
              </label>
              <label className="form-span">
                {t.description}
                <textarea
                  value={taskForm.description}
                  onChange={(event) =>
                    setTaskForm({ ...taskForm, description: event.target.value })
                  }
                />
              </label>
              <button
                className="os-button os-button-primary"
                type="submit"
                disabled={saving === "task"}
              >
                {t.addChecklistItem}
              </button>
            </form>
          ) : (
            <p>{t.checklistUnavailable}</p>
          )}
          <div className="activity-list">
            {request.tasks.length === 0 ? (
              <p>{t.noInternalChecklist}</p>
            ) : (
              request.tasks.map((task) => (
                <article key={task.id}>
                  <strong>{task.title}</strong>
                  <small>
                    {codeLabel(task.status, locale)} - {priorityLabel(task.priority, locale)} -{" "}
                    {task.assignee?.displayName ?? t.noAssignee}
                  </small>
                  {task.description && <p>{task.description}</p>}
                  {canAddOperationalContext && (
                    <div className="row-actions">
                      <button
                        className="os-button os-button-secondary"
                        type="button"
                        onClick={() => setTaskStatus(task.id, "PENDING")}
                      >
                        {t.pending}
                      </button>
                      <button
                        className="os-button os-button-secondary"
                        type="button"
                        onClick={() => setTaskStatus(task.id, "IN_PROGRESS")}
                      >
                        {t.start}
                      </button>
                      <button
                        className="os-button os-button-secondary"
                        type="button"
                        onClick={() => setTaskStatus(task.id, "DONE")}
                      >
                        {t.done}
                      </button>
                      <button
                        className="os-button os-button-secondary"
                        type="button"
                        onClick={() => setTaskStatus(task.id, "NOT_APPLICABLE")}
                      >
                        {t.notApplicable}
                      </button>
                      <button
                        className="os-button os-button-secondary"
                        type="button"
                        onClick={() => setTaskStatus(task.id, "BLOCKED")}
                      >
                        {t.blocked}
                      </button>
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        </article>

        <article className="catalog-panel" id="request-outputs">
          <h2>{t.internalOutputs}</h2>
          {canExecute ? (
            <form className="catalog-form" onSubmit={submitOutput}>
              <label>
                {t.outputCode}
                <input
                  required
                  value={outputForm.code}
                  onChange={(event) => setOutputForm({ ...outputForm, code: event.target.value })}
                />
              </label>
              <label>
                {t.title}
                <input
                  required
                  value={outputForm.title}
                  onChange={(event) => setOutputForm({ ...outputForm, title: event.target.value })}
                />
              </label>
              <label className="form-span">
                {t.description}
                <textarea
                  value={outputForm.description}
                  onChange={(event) =>
                    setOutputForm({ ...outputForm, description: event.target.value })
                  }
                />
              </label>
              <button
                className="os-button os-button-primary"
                type="submit"
                disabled={saving === "output"}
              >
                {t.createInternalOutput}
              </button>
            </form>
          ) : (
            <p>{t.internalOutputUnavailable}</p>
          )}
          <div className="activity-list">
            {request.outputs.length === 0 ? (
              <p>{t.noInternalOutputs}</p>
            ) : (
              request.outputs.map((output) => (
                <article key={output.id}>
                  <strong>
                    {output.code} - {output.title}
                  </strong>
                  <small>
                    {codeLabel(output.status, locale)} - {t.createdBy}{" "}
                    {output.createdBy?.displayName ?? t.internalUser}
                    {output.reviewedBy ? ` - ${t.reviewedBy} ${output.reviewedBy.displayName}` : ""}
                    {output.sharedAt ? ` - ${t.sharedAt} ${dateTime(output.sharedAt, locale)}` : ""}
                  </small>
                  {output.description && <p>{output.description}</p>}
                  {output.reviewReason && (
                    <p>
                      {t.reviewNote}: {output.reviewReason}
                    </p>
                  )}
                  {output.clientReturnReason && (
                    <p>
                      {t.decisionNote}: {output.clientReturnReason}
                    </p>
                  )}
                  <div className="row-actions">
                    {canExecute && submittableOutputStatuses.includes(output.status) && (
                      <button
                        className="os-button os-button-secondary"
                        type="button"
                        onClick={() => submitOutputForReview(output.id)}
                      >
                        {t.submit}
                      </button>
                    )}
                    {canSupervise && output.status === "INTERNAL_REVIEW" && (
                      <>
                        <button
                          className="os-button os-button-secondary"
                          type="button"
                          onClick={() => reviewOutput(output.id, "APPROVE")}
                        >
                          {t.approve}
                        </button>
                        <button
                          className="os-button os-button-secondary"
                          type="button"
                          onClick={() => reviewOutput(output.id, "RETURN")}
                        >
                          {t.returnChanges}
                        </button>
                        <button
                          className="os-button os-button-danger"
                          type="button"
                          onClick={() => reviewOutput(output.id, "REJECT")}
                        >
                          {t.reject}
                        </button>
                      </>
                    )}
                    {canSupervise && output.status === "APPROVED_INTERNAL" && (
                      <button
                        className="os-button os-button-secondary"
                        type="button"
                        onClick={() => shareOutput(output.id)}
                      >
                        {t.shareWithClient}
                      </button>
                    )}
                    {canSupervise && closableOutputStatuses.includes(output.status) && (
                      <button
                        className="os-button os-button-secondary"
                        type="button"
                        onClick={() => closeOutput(output.id)}
                      >
                        {t.closeDelivery}
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
          <h2>{t.clientDocumentRequests}</h2>
          {canRequestDocuments ? (
            <form className="catalog-form" onSubmit={submitDocumentRequest}>
              <label>
                {t.documentTitle}
                <input
                  required
                  value={documentForm.title}
                  onChange={(event) =>
                    setDocumentForm({ ...documentForm, title: event.target.value })
                  }
                />
              </label>
              <label>
                {t.dueAt}
                <input
                  type="datetime-local"
                  value={documentForm.dueAt}
                  onChange={(event) =>
                    setDocumentForm({ ...documentForm, dueAt: event.target.value })
                  }
                />
              </label>
              <label className="form-span">
                {t.instructions}
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
                {t.requestDocument}
              </button>
            </form>
          ) : (
            <p>{t.clientDocumentUnavailable}</p>
          )}
          <div className="activity-list">
            {request.documentRequests.length === 0 ? (
              <p>{t.noClientDocuments}</p>
            ) : (
              request.documentRequests.map((documentRequest) => (
                <article key={documentRequest.id}>
                  <strong>{documentRequest.title}</strong>
                  <small>
                    {codeLabel(documentRequest.status, locale)} - {t.due}{" "}
                    {dateTime(documentRequest.dueAt, locale)}
                  </small>
                  {documentRequest.instructions && <p>{documentRequest.instructions}</p>}
                  {documentRequest.file && (
                    <p>
                      {t.uploadedFile}: {documentRequest.file.originalName}
                    </p>
                  )}
                  {canRequestDocuments && (
                    <div className="row-actions">
                      {["REQUESTED", "UPLOADED"].includes(documentRequest.status) && (
                        <button
                          className="os-button os-button-secondary"
                          type="button"
                          onClick={() => setDocumentRequestStatus(documentRequest.id, "CLOSED")}
                        >
                          {t.close}
                        </button>
                      )}
                      {documentRequest.status === "REQUESTED" && (
                        <button
                          className="os-button os-button-danger"
                          type="button"
                          onClick={() => setDocumentRequestStatus(documentRequest.id, "CANCELLED")}
                        >
                          {t.cancel}
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
          <h2>{t.basicTimeEntries}</h2>
          {canExecute ? (
            <form className="catalog-form" onSubmit={submitTimeEntry}>
              <label>
                {t.workDate}
                <input
                  required
                  type="date"
                  value={timeForm.workDate}
                  onChange={(event) => setTimeForm({ ...timeForm, workDate: event.target.value })}
                />
              </label>
              <label>
                {t.hours}
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
                {t.billable}
              </label>
              <label className="form-span">
                {t.note}
                <textarea
                  value={timeForm.notes}
                  onChange={(event) => setTimeForm({ ...timeForm, notes: event.target.value })}
                />
              </label>
              <button
                className="os-button os-button-primary"
                type="submit"
                disabled={saving === "time-entry"}
              >
                {t.addTime}
              </button>
            </form>
          ) : (
            <p>{t.timeUnavailable}</p>
          )}
          <div className="activity-list">
            {request.timeEntries.length === 0 ? (
              <p>{t.noTimeEntries}</p>
            ) : (
              request.timeEntries.map((entry) => (
                <article key={entry.id}>
                  <strong>
                    {locale === "ar" ? `${entry.hours} س` : `${entry.hours}h`} -{" "}
                    {entry.user.displayName}
                  </strong>
                  <small>
                    {codeLabel(entry.status, locale)} - {dateTime(entry.workDate, locale)} -{" "}
                    {entry.billable ? t.billable : t.nonBillable}
                  </small>
                  {entry.notes && <p>{entry.notes}</p>}
                  {entry.decisionReason && (
                    <p>
                      {t.decisionNote}: {entry.decisionReason}
                    </p>
                  )}
                  <div className="row-actions">
                    {(hasGlobalOperations || entry.user.id === currentUser.id) &&
                      submittableTimeEntryStatuses.includes(entry.status) && (
                        <button
                          className="os-button os-button-secondary"
                          type="button"
                          onClick={() => submitTimeEntryForReview(entry.id)}
                        >
                          {t.submit}
                        </button>
                      )}
                    {canSupervise && entry.status === "SUBMITTED" && (
                      <>
                        <button
                          className="os-button os-button-secondary"
                          type="button"
                          onClick={() => reviewTimeEntry(entry.id, "APPROVE")}
                        >
                          {t.approve}
                        </button>
                        <button
                          className="os-button os-button-danger"
                          type="button"
                          onClick={() => reviewTimeEntry(entry.id, "REJECT")}
                        >
                          {t.reject}
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
          <h2>{t.comments}</h2>
          <form className="catalog-form" onSubmit={submitComment}>
            <label className="form-span">
              {t.comment}
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
              {t.visibleToClient}
            </label>
            <button
              className="os-button os-button-primary"
              type="submit"
              disabled={saving === "comment"}
            >
              {t.addComment}
            </button>
          </form>
          <div className="activity-list">
            {request.comments.length === 0 ? (
              <EmptyActivity message={t.noComments} />
            ) : (
              request.comments.map((comment) => (
                <article key={comment.id}>
                  <strong>{comment.author.displayName}</strong>
                  <small>
                    {dateTime(comment.createdAt, locale)} -{" "}
                    {comment.isClientVisible ? t.clientVisible : t.internalOnly}
                  </small>
                  <p>{comment.body}</p>
                </article>
              ))
            )}
          </div>
        </article>

        <article className="catalog-panel" id="request-notes">
          <h2>{t.internalNotes}</h2>
          <form className="catalog-form" onSubmit={submitNote}>
            <label className="form-span">
              {t.note}
              <textarea
                required
                value={noteBody}
                onChange={(event) => setNoteBody(event.target.value)}
              />
            </label>
            <button
              className="os-button os-button-primary"
              type="submit"
              disabled={saving === "note"}
            >
              {t.addInternalNote}
            </button>
          </form>
          <div className="activity-list">
            {request.internalNotes.length === 0 ? (
              <EmptyActivity message={t.noInternalNotes} />
            ) : (
              request.internalNotes.map((note) => (
                <article key={note.id}>
                  <strong>{note.author.displayName}</strong>
                  <small>{dateTime(note.createdAt, locale)}</small>
                  <p>{note.body}</p>
                </article>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="quote-summary-grid">
        <article className="catalog-panel" id="request-attachments">
          <h2>{t.attachmentMetadata}</h2>
          {canAttachMetadata ? (
            <form className="catalog-form" onSubmit={submitAttachment}>
              <label>
                {t.originalName}
                <input
                  required
                  value={fileForm.originalName}
                  onChange={(event) =>
                    setFileForm({ ...fileForm, originalName: event.target.value })
                  }
                />
              </label>
              <label>
                {t.mimeType}
                <input
                  required
                  value={fileForm.mimeType}
                  onChange={(event) => setFileForm({ ...fileForm, mimeType: event.target.value })}
                />
              </label>
              <label>
                {t.sizeBytes}
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
                {t.metadataVisibility}
                <select
                  value={fileForm.visibility}
                  onChange={(event) =>
                    setFileForm({
                      ...fileForm,
                      visibility: event.target.value as typeof fileForm.visibility,
                    })
                  }
                >
                  <option value="INTERNAL">{t.internal}</option>
                  <option value="CLIENT_VISIBLE">{t.clientVisible}</option>
                </select>
              </label>
              <button
                className="os-button os-button-primary"
                type="submit"
                disabled={saving === "attachment"}
              >
                {t.addMetadata}
              </button>
            </form>
          ) : (
            <p>{t.attachmentUnavailable}</p>
          )}
          <div className="activity-list">
            {request.attachments.length === 0 ? (
              <EmptyActivity message={t.noAttachments} />
            ) : (
              request.attachments.map((file) => (
                <article key={file.id}>
                  <strong>{file.originalName}</strong>
                  <small>
                    {file.mimeType} - {file.sizeBytes} {t.bytes} -{" "}
                    {codeLabel(file.visibility, locale)}
                  </small>
                </article>
              ))
            )}
          </div>
        </article>

        <article className="catalog-panel" id="request-activity">
          <h2>{t.activity}</h2>
          <div className="activity-list">
            {request.activity.length === 0 ? (
              <EmptyActivity message={t.noActivity} />
            ) : (
              request.activity.map((event) => (
                <article key={event.id}>
                  <strong>
                    {codeLabel(event.fromState?.code ?? "START", locale)} &gt;{" "}
                    {codeLabel(event.toState.code, locale)}
                  </strong>
                  <small>
                    {dateTime(event.occurredAt, locale)} - {codeLabel(event.actorRole, locale)}
                  </small>
                  {event.reason && <p>{event.reason}</p>}
                </article>
              ))
            )}
          </div>
        </article>
      </section>
    </>
  );
}
