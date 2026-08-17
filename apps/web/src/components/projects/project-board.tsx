"use client";

import Link from "next/link";
import { type FormEvent, useMemo, useState } from "react";
import {
  changeClientProjectOutputStatus,
  changeProjectOutputStatus,
  changeProjectStatus,
  createProjectOutput,
  projectErrorMessage,
  updateProjectTaskStatus,
  uploadProjectOutputFile,
} from "../../lib/project-client";
import type {
  ProjectOutputStatus,
  ProjectStatus,
  ProjectSummary,
  ProjectTaskStatus,
} from "../../lib/project-types";
import { normalizeLocale, type SupportedLocale } from "../../lib/i18n";
import { EmptyState, MetricCard, PageHeader, SectionCard, StatusChip } from "../premium-os";

const projectStatusLabels = {
  ACTIVE: { ar: "نشط", en: "Active" },
  ARCHIVED: { ar: "مؤرشف", en: "Archived" },
  CLIENT_REVIEW: { ar: "بانتظار مراجعة العميل", en: "Client review" },
  CLOSED: { ar: "مغلق", en: "Closed" },
  COMPLETED: { ar: "مكتمل", en: "Completed" },
  DRAFT: { ar: "مسودة", en: "Draft" },
} satisfies Record<ProjectStatus, Record<SupportedLocale, string>>;

const taskStatusLabels = {
  BLOCKED: { ar: "متعثر", en: "Blocked" },
  CANCELLED: { ar: "ملغي", en: "Cancelled" },
  DONE: { ar: "منجز", en: "Done" },
  IN_PROGRESS: { ar: "قيد التنفيذ", en: "In progress" },
  TODO: { ar: "مطلوب", en: "To do" },
} satisfies Record<ProjectTaskStatus, Record<SupportedLocale, string>>;

const outputStatusLabels = {
  ACCEPTED_BY_CLIENT: { ar: "معتمد من العميل", en: "Accepted by client" },
  APPROVED_INTERNAL: { ar: "معتمد داخلياً", en: "Approved internally" },
  CLOSED: { ar: "مغلق", en: "Closed" },
  DRAFT: { ar: "مسودة", en: "Draft" },
  INTERNAL_REVIEW: { ar: "مراجعة داخلية", en: "Internal review" },
  RETURNED_BY_CLIENT: { ar: "معاد من العميل", en: "Returned by client" },
  SHARED_WITH_CLIENT: { ar: "مشارك مع العميل", en: "Shared with client" },
} satisfies Record<ProjectOutputStatus, Record<SupportedLocale, string>>;

const clientVisibleOutputStatuses = new Set<ProjectOutputStatus>([
  "SHARED_WITH_CLIENT",
  "ACCEPTED_BY_CLIENT",
  "RETURNED_BY_CLIENT",
  "CLOSED",
]);

const shareableOutputStatuses = new Set<ProjectOutputStatus>([
  "DRAFT",
  "INTERNAL_REVIEW",
  "APPROVED_INTERNAL",
  "RETURNED_BY_CLIENT",
]);

const projectStatusGuidance = {
  ACTIVE: {
    ar: "المشروع قيد التنفيذ، ويمكن لفريق التشغيل تجهيز المهام والمخرجات قبل مشاركة العميل.",
    en: "The project is in delivery. The team can prepare tasks and outputs before client sharing.",
  },
  ARCHIVED: {
    ar: "المشروع مؤرشف للرجوع فقط ولا يحتاج إجراء تشغيلي.",
    en: "This project is archived for reference and needs no operational action.",
  },
  CLIENT_REVIEW: {
    ar: "المخرجات بانتظار قرار العميل. حافظ على وضوح النسخ والملاحظات.",
    en: "Outputs are waiting for the client decision. Keep versions and notes clear.",
  },
  CLOSED: {
    ar: "المشروع مغلق ولا تظهر عليه إجراءات تشغيلية جديدة.",
    en: "This project is closed and no new delivery actions are expected.",
  },
  COMPLETED: {
    ar: "اكتمل تسليم المشروع. راجع النشاط والمخرجات عند الحاجة.",
    en: "Delivery is complete. Review activity and outputs when needed.",
  },
  DRAFT: {
    ar: "المشروع مسودة ولم يبدأ التشغيل الفعلي بعد.",
    en: "This project is still a draft and delivery has not started yet.",
  },
} satisfies Record<ProjectStatus, Record<SupportedLocale, string>>;

const fallbackPhaseNames: Record<string, Record<SupportedLocale, string>> = {
  DISCOVERY: { ar: "الاكتشاف", en: "Discovery" },
  WORKSHOP: { ar: "ورشة العمل", en: "Workshop" },
  DRAFTING: { ar: "إعداد المسودة", en: "Drafting" },
  REVIEW: { ar: "المراجعة", en: "Review" },
  DELIVERY: { ar: "التسليم", en: "Delivery" },
  SITEMAP: { ar: "هيكلة المحتوى", en: "Sitemap" },
  WIREFRAME: { ar: "المخططات الأولية", en: "Wireframe" },
  DESIGN: { ar: "تصميم الواجهات", en: "Design" },
  UI: { ar: "تصميم الواجهات", en: "UI design" },
  CONTENT: { ar: "إعداد المحتوى", en: "Content" },
  DEVELOPMENT: { ar: "التطوير", en: "Development" },
  TESTING: { ar: "الاختبار وضمان الجودة", en: "Testing" },
  LAUNCH: { ar: "الإطلاق", en: "Launch" },
  "GO-LIVE": { ar: "الإطلاق", en: "Go-live" },
  HANDOVER: { ar: "التسليم ونقل المعرفة", en: "Handover" },
};

const fallbackDeliverableNames: Record<string, Record<SupportedLocale, string>> = {
  VISION: { ar: "الرؤية", en: "Vision" },
  MISSION: { ar: "الرسالة", en: "Mission" },
  "VALUES-DOCUMENT": { ar: "وثيقة القيم", en: "Values document" },
  SITEMAP: { ar: "خريطة الموقع", en: "Sitemap" },
  WIREFRAMES: { ar: "المخططات الأولية", en: "Wireframes" },
  DESIGN: { ar: "تصميم الواجهات", en: "Design" },
  CONTENT: { ar: "المحتوى المعتمد", en: "Content" },
  WEBSITE: { ar: "الموقع الإلكتروني", en: "Website" },
  TESTING: { ar: "تقرير الاختبار", en: "Testing report" },
  HANDOVER: { ar: "حزمة التسليم", en: "Handover package" },
};

const copy = {
  ar: {
    activity: "النشاط",
    addOutput: "إضافة مخرج",
    acceptOutput: "اعتماد المخرج",
    activeProjects: "المشاريع النشطة",
    clientProjects: "مشاريع المرة الواحدة",
    clientProjectsDescription:
      "تابع مشاريع البناء والخدمات ذات المرة الواحدة من بداية التفعيل حتى تسليم المخرجات.",
    clientReviewActions: "قرار العميل",
    completedTasks: "المهام المنجزة",
    deliverables: "المخرجات المتوقعة",
    deliveryPath: "مسار التسليم",
    deliveryPathDescription:
      "كل مرحلة مرتبطة بمخرجات واضحة حتى يعرف الفريق والعميل أين يقف المشروع.",
    description: "الوصف",
    due: "الموعد",
    dueAt: "موعد التسليم",
    empty: "لا توجد مشاريع مفعلة حتى الآن.",
    emptyDescription: "عند اعتماد خدمة مرة واحدة وإنشاء مشروع، سيظهر هنا مع مراحله ومخرجاته.",
    estimatedHours: "الساعات التقديرية",
    fileAndOutputRoom: "غرفة الملفات والمخرجات",
    internalControls: "إجراءات التشغيل",
    internalProjects: "مشاريع العملاء",
    internalProjectsDescription:
      "غرفة تشغيل مخصصة لمشاريع خدمات المرة الواحدة، مرتبطة بالعروض والتكليفات والمخرجات.",
    lastActivity: "آخر حركة",
    markActive: "تفعيل المشروع",
    markClientReview: "إرسال للعميل",
    markCompleted: "تعليم كمكتمل",
    name: "اسم المخرج",
    nextStep: "الخطوة التالية",
    noActivity: "لا توجد حركة مسجلة بعد.",
    noActivityDescription: "ستظهر هنا آخر الحركات المهمة عند مشاركة المخرجات أو اعتمادها.",
    noDeliveryPath: "لم تُربط مراحل تسليم بهذا المشروع بعد.",
    noDeliveryPathDescription: "أضف مراحل ومخرجات الخدمة من إعدادات خدمات المرة الواحدة.",
    noOutputs: "لا توجد مخرجات بعد.",
    noOutputsDescription: "أنشئ أول مخرج داخلي، ثم شاركه مع العميل عندما يكون جاهزًا للمراجعة.",
    noClientOutputsDescription: "عندما يشارك الفريق مخرجًا معك، سيظهر هنا للاعتماد أو طلب التعديل.",
    noTasks: "لا توجد مهام بعد.",
    noTasksDescription: "المهام تُنشأ من خطة خدمة المرة الواحدة وتساعد الفريق على تتبع التنفيذ.",
    notSet: "غير محدد",
    outputDecisionHint: "راجع المخرج، ثم اعتمده أو اطلب تعديله مع ملاحظة واضحة.",
    outputProgress: "اعتماد المخرجات",
    outputReady: "جاهز لمراجعة العميل",
    outputRevision: "النسخة",
    outputCode: "رمز اختياري",
    outputReference: "مخرج",
    outputs: "المخرجات",
    outputFile: "ملف المخرج",
    fileRequired: "اختر ملف المخرج قبل الحفظ.",
    uploadFile: "رفع نسخة جديدة",
    files: "الملفات",
    downloadFile: "تنزيل الملف",
    submitForReview: "إرسال للمراجعة",
    approveInternally: "اعتماد داخلي",
    returnToSpecialist: "إعادة للمختص",
    reviewNote: "ملاحظة المراجعة",
    returnReason: "سبب طلب التعديل",
    returnReasonRequired: "اكتب سببًا واضحًا قبل طلب التعديل.",
    fileSaved: "تم رفع الملف وربطه بالمخرج.",
    overview: "ملخص المشروع",
    phasePlan: "خطة المراحل",
    phaseReference: "مرحلة",
    progress: "نسبة الإنجاز",
    projectDelivery: "تشغيل المشاريع",
    projectNumber: "رقم المشروع",
    projectRoom: "غرفة المشروع",
    projectRoomDescription:
      "مساحة واحدة تجمع حالة المشروع، المهام، المخرجات، وقرار العميل بدون ضياع بين الشاشات.",
    projectRoomClientDescription: "تابع تقدم المشروع والمخرجات التي تحتاج قرارك من مكان واحد واضح.",
    projectsCount: "عدد المشاريع",
    projectSpecialist: "مختص المشاريع",
    projectCreatedFromQuote: "تم إنشاء المشروع من عرض خدمة مرة واحدة معتمد.",
    quote: "عرض السعر",
    saved: "تم حفظ الإجراء وتحديث بيانات المشروع.",
    saveOutput: "حفظ المخرج",
    saving: "جار الحفظ...",
    service: "الخدمة",
    sharedAt: "تاريخ المشاركة",
    shareOutput: "مشاركة المخرج",
    returnOutput: "طلب تعديل",
    startTask: "بدء المهمة",
    tasks: "المهام",
    taskProgress: "إنجاز المهام",
    titleRequired: "اكتب اسم المخرج قبل الحفظ.",
    updatedAt: "آخر تحديث",
    view: "فتح المشروع",
    waitingForClient: "بانتظار قرار العميل",
    waitingForTeam: "بانتظار تجهيز المخرجات",
  },
  en: {
    activity: "Activity",
    addOutput: "Add output",
    acceptOutput: "Accept output",
    activeProjects: "Active projects",
    clientProjects: "One-time projects",
    clientProjectsDescription:
      "Track one-time build and delivery projects from activation through outputs.",
    clientReviewActions: "Client decision",
    completedTasks: "Completed tasks",
    deliverables: "Expected deliverables",
    deliveryPath: "Delivery path",
    deliveryPathDescription:
      "Each phase is tied to clear deliverables so the team and client know where the project stands.",
    description: "Description",
    due: "Due",
    dueAt: "Due date",
    empty: "No activated projects yet.",
    emptyDescription:
      "When a one-time service is approved and a project is created, it will appear here with phases and outputs.",
    estimatedHours: "Estimated hours",
    fileAndOutputRoom: "Files and outputs room",
    internalControls: "Operating actions",
    internalProjects: "Client projects",
    internalProjectsDescription:
      "A delivery room for one-time service projects linked to quotes, assignments, and outputs.",
    lastActivity: "Last activity",
    markActive: "Activate project",
    markClientReview: "Send to client",
    markCompleted: "Mark complete",
    name: "Output name",
    nextStep: "Next step",
    noActivity: "No activity recorded yet.",
    noActivityDescription: "Key activity appears here when outputs are shared or approved.",
    noDeliveryPath: "No delivery phases are linked to this project yet.",
    noDeliveryPathDescription: "Add phases and deliverables from one-time service settings.",
    noOutputs: "No outputs yet.",
    noOutputsDescription: "Create the first internal output, then share it when it is ready.",
    noClientOutputsDescription: "When the team shares an output with you, it will appear here.",
    noTasks: "No tasks yet.",
    noTasksDescription: "Tasks are generated from the one-time service plan to track delivery.",
    notSet: "Not set",
    outputDecisionHint:
      "Review the output, then accept it or request a revision with a clear note.",
    outputProgress: "Output approval",
    outputReady: "Ready for client review",
    outputRevision: "Revision",
    outputCode: "Optional code",
    outputReference: "Output",
    outputs: "Outputs",
    outputFile: "Output file",
    fileRequired: "Choose the output file before saving.",
    uploadFile: "Upload new version",
    files: "Files",
    downloadFile: "Download file",
    submitForReview: "Send for review",
    approveInternally: "Approve internally",
    returnToSpecialist: "Return to specialist",
    reviewNote: "Review note",
    returnReason: "Revision reason",
    returnReasonRequired: "Enter a clear reason before requesting a revision.",
    fileSaved: "The file was uploaded and linked to the output.",
    overview: "Project overview",
    phasePlan: "Phase plan",
    phaseReference: "Phase",
    progress: "Progress",
    projectDelivery: "Project delivery",
    projectNumber: "Project number",
    projectRoom: "Project room",
    projectRoomDescription:
      "One workspace for project status, tasks, outputs, and client decisions.",
    projectRoomClientDescription:
      "Track progress and outputs that need your decision from one clear place.",
    projectsCount: "Projects",
    projectSpecialist: "Project specialist",
    projectCreatedFromQuote: "Project created from an accepted one-time quote.",
    quote: "Quote",
    saved: "Action saved and project data refreshed.",
    saveOutput: "Save output",
    saving: "Saving...",
    service: "Service",
    sharedAt: "Shared",
    shareOutput: "Share output",
    returnOutput: "Request revision",
    startTask: "Start task",
    tasks: "Tasks",
    taskProgress: "Task progress",
    titleRequired: "Enter an output name before saving.",
    updatedAt: "Updated",
    view: "Open project",
    waitingForClient: "Waiting for client decision",
    waitingForTeam: "Waiting for output preparation",
  },
} as const;

function localizedName(
  value: { nameAr?: string | null; nameEn?: string | null },
  locale: SupportedLocale,
) {
  return locale === "ar" ? value.nameAr || value.nameEn || "" : value.nameEn || value.nameAr || "";
}

function lookupKey(code?: string | null, name?: string | null) {
  const source = (code || name || "").trim().toUpperCase();
  return source
    .replace(/^PHASE-\d+-/, "")
    .replace(/^DEL-\d+-/, "")
    .replace(/^DEL-/, "")
    .replace(/\s+/g, "-");
}

function localizedPhaseName(
  phase: { code: string; nameAr?: string | null; nameEn?: string | null },
  locale: SupportedLocale,
) {
  const fallback =
    fallbackPhaseNames[lookupKey(phase.code)] ?? fallbackPhaseNames[lookupKey(null, phase.nameEn)];
  if (locale === "ar") {
    if (fallback) return fallback.ar;
    if (phase.nameAr && /[\u0600-\u06ff]/.test(phase.nameAr)) return phase.nameAr;
    return "مرحلة المشروع";
  }
  return localizedName(phase, locale) || fallback?.[locale] || phase.code;
}

function localizedDeliverableName(
  deliverable: { code: string; nameAr?: string | null; nameEn?: string | null },
  locale: SupportedLocale,
) {
  const fallback =
    fallbackDeliverableNames[lookupKey(deliverable.code)] ??
    fallbackDeliverableNames[lookupKey(null, deliverable.nameEn)];
  if (locale === "ar") {
    if (fallback) return fallback.ar;
    if (deliverable.nameAr && /[\u0600-\u06ff]/.test(deliverable.nameAr)) {
      return deliverable.nameAr;
    }
    return "مخرج المشروع";
  }
  return localizedName(deliverable, locale) || fallback?.[locale] || deliverable.code;
}

function localizedOutputTitle(output: { code: string; title: string }, locale: SupportedLocale) {
  if (locale !== "ar") return output.title;
  const fallback =
    fallbackDeliverableNames[lookupKey(output.code)] ??
    fallbackDeliverableNames[lookupKey(null, output.title)];
  return fallback?.ar ?? output.title;
}

function activityReason(
  event: { actorRole: string; reason: string | null },
  locale: SupportedLocale,
  createdFromQuote: string,
) {
  const reason = event.reason?.trim();
  if (reason) {
    if (/project created from accepted one-time quote item/i.test(reason)) {
      return createdFromQuote;
    }
    if (locale === "ar" && !/[\u0600-\u06ff]/.test(reason)) {
      return "تم تحديث المشروع وتسجيل الإجراء في سجل النشاط.";
    }
    return reason;
  }
  const normalizedRole = event.actorRole.replace(/-/g, "_");
  const actorLabels: Record<string, Record<SupportedLocale, string>> = {
    ROLE_ADMIN: { ar: "مدير النظام", en: "Admin" },
    ROLE_CLIENT: { ar: "العميل", en: "Client" },
    ROLE_SPECIALIST: { ar: "المختص", en: "Specialist" },
    ROLE_PROJECT_SPECIALIST: { ar: "مختص المشاريع", en: "Project specialist" },
    ROLE_SUPERVISOR: { ar: "المشرف", en: "Supervisor" },
  };
  return actorLabels[normalizedRole]?.[locale] ?? event.actorRole;
}

function localizedProjectDescription(
  service: { description: string; nameAr: string; nameEn: string },
  locale: SupportedLocale,
) {
  if (locale === "en") return service.description;
  if (/[\u0600-\u06ff]/.test(service.description)) return service.description;
  return `تنفيذ خدمة ${service.nameAr || service.nameEn} ومتابعة مراحلها ومخرجاتها حتى الاعتماد.`;
}

function localizedOptionalDescription(value: string | null, locale: SupportedLocale) {
  if (!value) return null;
  if (locale === "en" || /[\u0600-\u06ff]/.test(value)) return value;
  return null;
}

function formatDate(value: string | null, locale: SupportedLocale, fallback: string) {
  if (!value) return fallback;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatDateTime(value: string | null, locale: SupportedLocale, fallback: string) {
  if (!value) return fallback;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusLabel(status: ProjectStatus, locale: SupportedLocale) {
  return projectStatusLabels[status]?.[locale] ?? status;
}

function taskStatusLabel(status: ProjectTaskStatus, locale: SupportedLocale) {
  return taskStatusLabels[status]?.[locale] ?? status;
}

function outputStatusLabel(status: ProjectOutputStatus, locale: SupportedLocale) {
  return outputStatusLabels[status]?.[locale] ?? status;
}

function statusGuidance(status: ProjectStatus, locale: SupportedLocale) {
  return projectStatusGuidance[status]?.[locale] ?? status;
}

function progressPercent(project: ProjectSummary) {
  if (project.progress.tasksTotal === 0) return 0;
  return Math.round((project.progress.tasksDone / project.progress.tasksTotal) * 100);
}

function boundedPercent(done: number, total: number) {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((done / total) * 100)));
}

export function ProjectList({
  clientMode = false,
  locale: localeInput = "en",
  projects,
}: {
  clientMode?: boolean;
  locale?: string;
  projects: ProjectSummary[];
}) {
  const locale = normalizeLocale(localeInput);
  const t = copy[locale];
  const basePath = clientMode ? "/client/projects" : "/projects";
  const openProjects = projects.filter(
    (project) => !["COMPLETED", "CLOSED", "ARCHIVED"].includes(project.status),
  ).length;

  return (
    <>
      <PageHeader
        eyebrow={t.projectDelivery}
        title={clientMode ? t.clientProjects : t.internalProjects}
        description={clientMode ? t.clientProjectsDescription : t.internalProjectsDescription}
      />
      <section className="os-bento-grid compact">
        <MetricCard label={t.projectsCount} value={projects.length} detail={t.projectDelivery} />
        <MetricCard label={t.activeProjects} value={openProjects} detail={t.phasePlan} />
        <MetricCard
          accent
          label={t.outputs}
          value={projects.reduce((total, project) => total + project.progress.outputsShared, 0)}
          detail={t.shareOutput}
        />
      </section>
      {projects.length === 0 ? (
        <EmptyState title={t.empty}>{t.emptyDescription}</EmptyState>
      ) : (
        <section className="entity-grid">
          {projects.map((project) => (
            <article className="entity-card" key={project.id}>
              <div className="entity-card-heading">
                <div>
                  <small>
                    {project.projectNumber} - {project.client.name}
                  </small>
                  <h3>{project.name}</h3>
                </div>
                <StatusChip status={project.status} label={statusLabel(project.status, locale)} />
              </div>
              <dl className="entity-meta four-up">
                <div>
                  <dt>{t.service}</dt>
                  <dd>{localizedName(project.service, locale)}</dd>
                </div>
                <div>
                  <dt>{t.due}</dt>
                  <dd>{formatDate(project.dueAt, locale, t.notSet)}</dd>
                </div>
                <div>
                  <dt>{t.completedTasks}</dt>
                  <dd>
                    {project.progress.tasksDone}/{project.progress.tasksTotal}
                  </dd>
                </div>
                <div>
                  <dt>{t.outputs}</dt>
                  <dd>
                    {project.progress.outputsShared}/{project.progress.outputsTotal}
                  </dd>
                </div>
              </dl>
              <div className="progress-track" aria-label={`${progressPercent(project)}%`}>
                <span style={{ inlineSize: `${progressPercent(project)}%` }} />
              </div>
              <div className="row-actions">
                <Link className="os-button os-button-primary" href={`${basePath}/${project.id}`}>
                  {t.view}
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </>
  );
}

export function ProjectDetail({
  clientMode = false,
  locale: localeInput = "en",
  project: initialProject,
}: {
  clientMode?: boolean;
  locale?: string;
  project: ProjectSummary;
}) {
  const locale = normalizeLocale(localeInput);
  const t = copy[locale];
  const [project, setProject] = useState(initialProject);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [outputTitle, setOutputTitle] = useState("");
  const [outputCode, setOutputCode] = useState("");
  const [outputDescription, setOutputDescription] = useState("");
  const [outputFile, setOutputFile] = useState<File | null>(null);
  const [outputFiles, setOutputFiles] = useState<Record<string, File | null>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const visibleOutputs = useMemo(
    () =>
      clientMode
        ? project.outputs.filter((output) => clientVisibleOutputStatuses.has(output.status))
        : project.outputs,
    [clientMode, project.outputs],
  );
  const acceptedOutputs = visibleOutputs.filter(
    (output) => output.status === "ACCEPTED_BY_CLIENT" || output.status === "CLOSED",
  ).length;
  const waitingClientOutputs = visibleOutputs.filter(
    (output) => output.status === "SHARED_WITH_CLIENT",
  ).length;
  const shareableOutputs = visibleOutputs.filter((output) =>
    shareableOutputStatuses.has(output.status),
  ).length;
  const taskPercent = progressPercent(project);
  const outputPercent = clientMode
    ? boundedPercent(acceptedOutputs, visibleOutputs.length)
    : boundedPercent(project.progress.outputsShared, project.progress.outputsTotal);
  const outputProgress = clientMode
    ? `${acceptedOutputs}/${visibleOutputs.length}`
    : `${project.progress.outputsShared}/${project.progress.outputsTotal}`;
  const projectSpecialist =
    project.tasks.find((task) => task.assignee)?.assignee?.displayName ?? t.notSet;
  const latestActivityAt = project.activity[0]?.occurredAt ?? null;
  const nextStep = clientMode
    ? waitingClientOutputs > 0
      ? t.waitingForClient
      : t.waitingForTeam
    : shareableOutputs > 0
      ? t.shareOutput
      : project.status === "CLIENT_REVIEW"
        ? t.waitingForClient
        : t.markClientReview;

  async function runAction(
    key: string,
    action: () => Promise<ProjectSummary>,
    successMessage = t.saved,
  ) {
    setSaving(key);
    setError(null);
    setNotice(null);
    try {
      setProject(await action());
      setNotice(successMessage);
      return true;
    } catch (actionError) {
      setError(projectErrorMessage(actionError));
      return false;
    } finally {
      setSaving(null);
    }
  }

  async function submitOutput(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!outputTitle.trim()) {
      setError(t.titleRequired);
      return;
    }
    if (!outputFile) {
      setError(t.fileRequired);
      return;
    }
    setSaving("output");
    setError(null);
    setNotice(null);
    try {
      const existingIds = new Set(project.outputs.map((output) => output.id));
      const created = await createProjectOutput(project.id, {
        title: outputTitle,
        ...(outputCode.trim() ? { code: outputCode.trim() } : {}),
        ...(outputDescription.trim() ? { description: outputDescription.trim() } : {}),
      });
      setProject(created);
      const createdOutput = created.outputs.find((output) => !existingIds.has(output.id));
      if (!createdOutput) {
        throw new Error(t.fileRequired);
      }
      setProject(await uploadProjectOutputFile(project.id, createdOutput.id, outputFile));
      setNotice(t.fileSaved);
      setOutputTitle("");
      setOutputCode("");
      setOutputDescription("");
      setOutputFile(null);
    } catch (actionError) {
      setError(projectErrorMessage(actionError));
    } finally {
      setSaving(null);
    }
  }

  async function uploadExistingOutput(outputId: string) {
    const file = outputFiles[outputId];
    if (!file) {
      setError(t.fileRequired);
      return;
    }
    const saved = await runAction(`${outputId}-file`, () =>
      uploadProjectOutputFile(project.id, outputId, file),
    );
    if (saved) {
      setOutputFiles((current) => ({ ...current, [outputId]: null }));
    }
  }

  function noteFor(outputId: string) {
    return reviewNotes[outputId]?.trim() ?? "";
  }

  async function returnOutput(outputId: string, target: "DRAFT" | "RETURNED_BY_CLIENT") {
    const reason = noteFor(outputId);
    if (!reason) {
      setError(t.returnReasonRequired);
      return;
    }
    const key = `${outputId}-return`;
    const action =
      target === "DRAFT"
        ? () => changeProjectOutputStatus(project.id, outputId, target, reason)
        : () => changeClientProjectOutputStatus(project.id, outputId, target, reason);
    const saved = await runAction(key, action);
    if (saved) {
      setReviewNotes((current) => ({ ...current, [outputId]: "" }));
    }
  }

  function buttonLabel(key: string, label: string) {
    return saving === key ? t.saving : label;
  }

  return (
    <>
      <PageHeader
        eyebrow={t.projectDelivery}
        title={project.name}
        description={`${project.projectNumber} - ${project.client.name} - ${localizedName(project.service, locale)}`}
        meta={
          <div className="project-status-guide">
            <StatusChip status={project.status} label={statusLabel(project.status, locale)} />
            <span>{statusGuidance(project.status, locale)}</span>
          </div>
        }
      />
      <section className="project-command-strip" aria-label={t.overview}>
        <div>
          <span>{t.service}</span>
          <strong>{localizedName(project.service, locale)}</strong>
        </div>
        <div>
          <span>{t.projectSpecialist}</span>
          <strong>{projectSpecialist}</strong>
        </div>
        <div>
          <span>{t.quote}</span>
          <strong>{project.quote?.quoteNumber ?? t.notSet}</strong>
        </div>
        <div>
          <span>{t.lastActivity}</span>
          <strong>
            {latestActivityAt ? formatDate(latestActivityAt, locale, t.notSet) : t.notSet}
          </strong>
        </div>
      </section>
      <section className="project-room-board" aria-label={t.projectRoom}>
        <div className="project-room-main">
          <p className="os-eyebrow">{t.projectRoom}</p>
          <h2>{clientMode ? t.fileAndOutputRoom : t.internalControls}</h2>
          <p>{clientMode ? t.projectRoomClientDescription : t.projectRoomDescription}</p>
          <div className="project-room-progress-grid">
            <div className="project-room-progress-card">
              <span>{t.taskProgress}</span>
              <strong>
                {project.progress.tasksDone}/{project.progress.tasksTotal}
              </strong>
              <div className="progress-track" aria-label={`${taskPercent}%`}>
                <span style={{ inlineSize: `${taskPercent}%` }} />
              </div>
            </div>
            <div className="project-room-progress-card">
              <span>{t.outputProgress}</span>
              <strong>{outputProgress}</strong>
              <div className="progress-track" aria-label={`${outputPercent}%`}>
                <span style={{ inlineSize: `${outputPercent}%` }} />
              </div>
            </div>
          </div>
        </div>
        <aside className="project-room-next">
          <span>{t.nextStep}</span>
          <strong>{nextStep}</strong>
          <p>{statusGuidance(project.status, locale)}</p>
        </aside>
      </section>
      {error ? (
        <div className="access-feedback error" role="alert">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="access-feedback success" role="status">
          {notice}
        </div>
      ) : null}
      <section className="os-bento-grid compact">
        <MetricCard
          label={t.completedTasks}
          value={`${project.progress.tasksDone}/${project.progress.tasksTotal}`}
        />
        <MetricCard label={t.outputs} value={outputProgress} />
        <MetricCard label={t.estimatedHours} value={project.service.estimatedHours} />
        <MetricCard accent label={t.due} value={formatDate(project.dueAt, locale, t.notSet)} />
      </section>

      {project.capabilities.canSupervise ? (
        <section className="project-room-actions row-actions" aria-label={t.internalControls}>
          <button
            className="os-button os-button-secondary"
            type="button"
            disabled={saving === "ACTIVE"}
            onClick={() => runAction("ACTIVE", () => changeProjectStatus(project.id, "ACTIVE"))}
          >
            {buttonLabel("ACTIVE", t.markActive)}
          </button>
          <button
            className="os-button os-button-secondary"
            type="button"
            disabled={saving === "CLIENT_REVIEW"}
            onClick={() =>
              runAction("CLIENT_REVIEW", () => changeProjectStatus(project.id, "CLIENT_REVIEW"))
            }
          >
            {buttonLabel("CLIENT_REVIEW", t.markClientReview)}
          </button>
          <button
            className="os-button os-button-primary"
            type="button"
            disabled={saving === "COMPLETED"}
            onClick={() =>
              runAction("COMPLETED", () => changeProjectStatus(project.id, "COMPLETED"))
            }
          >
            {buttonLabel("COMPLETED", t.markCompleted)}
          </button>
        </section>
      ) : null}

      <SectionCard title={t.overview} eyebrow={t.service}>
        <dl className="entity-meta four-up">
          <div>
            <dt>{t.service}</dt>
            <dd>{localizedName(project.service, locale)}</dd>
          </div>
          <div>
            <dt>{t.quote}</dt>
            <dd>{project.quote?.quoteNumber ?? t.notSet}</dd>
          </div>
          <div>
            <dt>{t.projectSpecialist}</dt>
            <dd>{projectSpecialist}</dd>
          </div>
          <div>
            <dt>{t.description}</dt>
            <dd>{localizedProjectDescription(project.service, locale)}</dd>
          </div>
        </dl>
      </SectionCard>

      <SectionCard
        title={t.deliveryPath}
        eyebrow={t.phasePlan}
        description={t.deliveryPathDescription}
      >
        {project.phases.length === 0 ? (
          <EmptyState title={t.noDeliveryPath}>{t.noDeliveryPathDescription}</EmptyState>
        ) : (
          <div className="project-timeline">
            {project.phases.map((phase) => {
              const phaseDeliverables = project.deliverables.filter(
                (deliverable) => deliverable.phaseCode === phase.code,
              );
              return (
                <article key={phase.id}>
                  <span>{phase.sortOrder + 1}</span>
                  <div>
                    <small>
                      {t.phaseReference} {phase.sortOrder + 1}
                    </small>
                    <h3>{localizedPhaseName(phase, locale)}</h3>
                    {localizedOptionalDescription(phase.description, locale) ? (
                      <p>{localizedOptionalDescription(phase.description, locale)}</p>
                    ) : null}
                    <ul>
                      {phaseDeliverables.map((deliverable) => (
                        <li key={deliverable.id}>
                          {localizedDeliverableName(deliverable, locale)}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard title={t.tasks}>
        {project.tasks.length === 0 ? (
          <EmptyState title={t.noTasks}>{t.noTasksDescription}</EmptyState>
        ) : (
          <div className="entity-grid">
            {project.tasks.map((task) => (
              <article className="entity-card" key={task.id}>
                <div className="entity-card-heading">
                  <div>
                    <small>{task.assignee?.displayName ?? t.projectSpecialist}</small>
                    <h3>{task.title}</h3>
                  </div>
                  <StatusChip status={task.status} label={taskStatusLabel(task.status, locale)} />
                </div>
                {task.description ? <p>{task.description}</p> : null}
                {project.capabilities.canDeliver ? (
                  <div className="row-actions">
                    <button
                      className="os-button os-button-secondary"
                      type="button"
                      disabled={saving === task.id}
                      onClick={() =>
                        runAction(task.id, () =>
                          updateProjectTaskStatus(project.id, task.id, "IN_PROGRESS"),
                        )
                      }
                    >
                      {buttonLabel(task.id, t.startTask)}
                    </button>
                    <button
                      className="os-button os-button-primary"
                      type="button"
                      disabled={saving === `${task.id}-done`}
                      onClick={() =>
                        runAction(`${task.id}-done`, () =>
                          updateProjectTaskStatus(project.id, task.id, "DONE"),
                        )
                      }
                    >
                      {buttonLabel(`${task.id}-done`, taskStatusLabel("DONE", locale))}
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title={t.outputs}
        eyebrow={t.deliverables}
        description={clientMode ? t.outputDecisionHint : t.noOutputsDescription}
      >
        {!clientMode && project.capabilities.canDeliver ? (
          <form className="operating-user-form" noValidate onSubmit={submitOutput}>
            <div className="operating-user-grid">
              <label>
                <span>{t.name}</span>
                <input
                  placeholder={t.name}
                  value={outputTitle}
                  onChange={(event) => setOutputTitle(event.target.value)}
                />
              </label>
              <label>
                <span>{t.outputFile}</span>
                <input
                  type="file"
                  onChange={(event) => setOutputFile(event.target.files?.[0] ?? null)}
                />
              </label>
              <label>
                <span>{t.outputCode}</span>
                <input
                  placeholder="OUT-01"
                  value={outputCode}
                  onChange={(event) => setOutputCode(event.target.value)}
                />
              </label>
              <label>
                <span>{t.description}</span>
                <input
                  placeholder={t.outputReady}
                  value={outputDescription}
                  onChange={(event) => setOutputDescription(event.target.value)}
                />
              </label>
            </div>
            <div className="row-actions">
              <button
                className="os-button os-button-primary"
                type="submit"
                disabled={saving === "output"}
              >
                {t.saveOutput}
              </button>
            </div>
          </form>
        ) : null}
        {visibleOutputs.length === 0 ? (
          <EmptyState title={t.noOutputs}>
            {clientMode ? t.noClientOutputsDescription : t.noOutputsDescription}
          </EmptyState>
        ) : (
          <div className="entity-grid">
            {visibleOutputs.map((output) => (
              <article className="entity-card" key={output.id}>
                <div className="entity-card-heading">
                  <div>
                    <small>
                      {t.outputReference} {output.sortOrder + 1}
                    </small>
                    <h3>{localizedOutputTitle(output, locale)}</h3>
                  </div>
                  <StatusChip
                    status={output.status}
                    label={outputStatusLabel(output.status, locale)}
                  />
                </div>
                {output.description ? <p>{output.description}</p> : null}
                {output.decisionReason ? (
                  <p className="project-output-callout">
                    {t.reviewNote}: {output.decisionReason}
                  </p>
                ) : null}
                <dl className="entity-meta project-output-meta">
                  <div>
                    <dt>{t.outputRevision}</dt>
                    <dd>{output.revision}</dd>
                  </div>
                  <div>
                    <dt>{t.sharedAt}</dt>
                    <dd>{formatDate(output.sharedAt, locale, t.notSet)}</dd>
                  </div>
                  <div>
                    <dt>{t.dueAt}</dt>
                    <dd>{formatDate(output.dueAt, locale, t.notSet)}</dd>
                  </div>
                  <div>
                    <dt>{t.updatedAt}</dt>
                    <dd>{formatDate(output.updatedAt, locale, t.notSet)}</dd>
                  </div>
                </dl>
                {output.files.length > 0 ? (
                  <div className="project-output-files" aria-label={t.files}>
                    {output.files.map((file) => (
                      <div key={file.id}>
                        <span>{file.originalName}</span>
                        <small>
                          {t.outputRevision} {file.version}
                        </small>
                        {file.downloadUrl ? (
                          <a className="os-button os-button-secondary" href={file.downloadUrl}>
                            {t.downloadFile}
                          </a>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
                {clientMode && output.status === "SHARED_WITH_CLIENT" ? (
                  <p className="project-output-callout">{t.outputDecisionHint}</p>
                ) : null}
                {project.capabilities.canDeliver && output.status === "DRAFT" ? (
                  <div className="row-actions">
                    <button
                      className="os-button os-button-secondary"
                      type="button"
                      disabled={saving === output.id}
                      onClick={() =>
                        runAction(output.id, () =>
                          changeProjectOutputStatus(project.id, output.id, "INTERNAL_REVIEW"),
                        )
                      }
                    >
                      {buttonLabel(output.id, t.submitForReview)}
                    </button>
                  </div>
                ) : null}
                {project.capabilities.canDeliver &&
                ["DRAFT", "RETURNED_BY_CLIENT"].includes(output.status) ? (
                  <div className="project-output-upload">
                    <label>
                      <span>{t.outputFile}</span>
                      <input
                        type="file"
                        onChange={(event) =>
                          setOutputFiles((current) => ({
                            ...current,
                            [output.id]: event.target.files?.[0] ?? null,
                          }))
                        }
                      />
                    </label>
                    <button
                      className="os-button os-button-secondary"
                      type="button"
                      disabled={saving === `${output.id}-file`}
                      onClick={() => uploadExistingOutput(output.id)}
                    >
                      {buttonLabel(`${output.id}-file`, t.uploadFile)}
                    </button>
                  </div>
                ) : null}
                {project.capabilities.canSupervise && output.status === "INTERNAL_REVIEW" ? (
                  <div className="project-review-controls">
                    <label>
                      <span>{t.reviewNote}</span>
                      <textarea
                        value={reviewNotes[output.id] ?? ""}
                        onChange={(event) =>
                          setReviewNotes((current) => ({
                            ...current,
                            [output.id]: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <div className="row-actions">
                      <button
                        className="os-button os-button-primary"
                        type="button"
                        disabled={saving === `${output.id}-approve`}
                        onClick={() =>
                          runAction(`${output.id}-approve`, () =>
                            changeProjectOutputStatus(
                              project.id,
                              output.id,
                              "APPROVED_INTERNAL",
                              noteFor(output.id),
                            ),
                          )
                        }
                      >
                        {buttonLabel(`${output.id}-approve`, t.approveInternally)}
                      </button>
                      <button
                        className="os-button os-button-secondary"
                        type="button"
                        disabled={saving === `${output.id}-return`}
                        onClick={() => returnOutput(output.id, "DRAFT")}
                      >
                        {buttonLabel(`${output.id}-return`, t.returnToSpecialist)}
                      </button>
                    </div>
                  </div>
                ) : null}
                {project.capabilities.canSupervise && output.status === "APPROVED_INTERNAL" ? (
                  <div className="row-actions">
                    <button
                      className="os-button os-button-primary"
                      type="button"
                      disabled={saving === `${output.id}-share`}
                      onClick={() =>
                        runAction(`${output.id}-share`, () =>
                          changeProjectOutputStatus(project.id, output.id, "SHARED_WITH_CLIENT"),
                        )
                      }
                    >
                      {buttonLabel(`${output.id}-share`, t.shareOutput)}
                    </button>
                  </div>
                ) : null}
                {clientMode && output.status === "SHARED_WITH_CLIENT" ? (
                  <div className="project-review-controls">
                    <label>
                      <span>{t.returnReason}</span>
                      <textarea
                        value={reviewNotes[output.id] ?? ""}
                        onChange={(event) =>
                          setReviewNotes((current) => ({
                            ...current,
                            [output.id]: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <div className="row-actions">
                      <button
                        className="os-button os-button-primary"
                        type="button"
                        disabled={saving === `${output.id}-accept`}
                        onClick={() =>
                          runAction(`${output.id}-accept`, () =>
                            changeClientProjectOutputStatus(
                              project.id,
                              output.id,
                              "ACCEPTED_BY_CLIENT",
                            ),
                          )
                        }
                      >
                        {buttonLabel(`${output.id}-accept`, t.acceptOutput)}
                      </button>
                      <button
                        className="os-button os-button-secondary"
                        type="button"
                        disabled={saving === `${output.id}-return`}
                        onClick={() => returnOutput(output.id, "RETURNED_BY_CLIENT")}
                      >
                        {buttonLabel(`${output.id}-return`, t.returnOutput)}
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title={t.activity} description={t.noActivityDescription}>
        {project.activity.length === 0 ? (
          <EmptyState title={t.noActivity}>{t.noActivityDescription}</EmptyState>
        ) : (
          <div className="activity-list">
            {project.activity.map((event) => (
              <article key={event.id}>
                <strong>{activityReason(event, locale, t.projectCreatedFromQuote)}</strong>
                <span>{formatDateTime(event.occurredAt, locale, t.notSet)}</span>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}
