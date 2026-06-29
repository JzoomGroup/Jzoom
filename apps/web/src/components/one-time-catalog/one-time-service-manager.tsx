"use client";

import { useMemo, useState, type FormEvent } from "react";
import { refreshOneTimeCatalog } from "../../lib/one-time-catalog-client";
import type {
  OneTimeCatalogSnapshot,
  OneTimeDeliverable,
  OneTimePhase,
  OneTimeService,
  OneTimeTask,
} from "../../lib/one-time-catalog-types";
import type { CatalogStatus } from "../../lib/catalog-types";
import { normalizeLocale, type SupportedLocale } from "../../lib/i18n";
import {
  CatalogFeedback,
  EmptyState,
  FormActions,
  LifecycleActions,
  OrderControl,
  StatusBadge,
  useCatalogMutation,
} from "../catalog/catalog-shared";
import { BentoGrid, MetricCard, PageHeader, SectionCard } from "../premium-os";

interface EditablePhase {
  code: string;
  nameAr: string;
  nameEn: string;
  description: string;
  sortOrder: number;
  isRequired: boolean;
  status: CatalogStatus;
}

interface EditableTask {
  code: string;
  nameAr: string;
  nameEn: string;
  description: string;
  estimatedHours: number;
  sortOrder: number;
  isRequired: boolean;
  status: CatalogStatus;
}

interface EditableDeliverable {
  code: string;
  phaseCode: string;
  nameAr: string;
  nameEn: string;
  description: string;
  sortOrder: number;
  isRequired: boolean;
  requiresClientApproval: boolean;
  status: CatalogStatus;
  tasks: EditableTask[];
}

function editablePhases(phases: OneTimePhase[] = []): EditablePhase[] {
  return phases.map((phase) => ({
    code: phase.code,
    nameAr: phase.nameAr ?? phase.nameEn,
    nameEn: phase.nameEn,
    description: phase.description ?? "",
    sortOrder: phase.sortOrder,
    isRequired: phase.isRequired,
    status: phase.status,
  }));
}

function editableTasks(tasks: OneTimeTask[]): EditableTask[] {
  return tasks.map((task) => ({
    code: task.code,
    nameAr: task.nameAr,
    nameEn: task.nameEn,
    description: task.description ?? "",
    estimatedHours: task.estimatedHours,
    sortOrder: task.sortOrder,
    isRequired: task.isRequired,
    status: task.status,
  }));
}

function editableDeliverables(deliverables: OneTimeDeliverable[] = []): EditableDeliverable[] {
  return deliverables.map((deliverable) => ({
    code: deliverable.code,
    phaseCode: deliverable.phaseCode ?? "",
    nameAr: deliverable.nameAr ?? deliverable.nameEn,
    nameEn: deliverable.nameEn,
    description: deliverable.description ?? "",
    sortOrder: deliverable.sortOrder,
    isRequired: deliverable.isRequired,
    requiresClientApproval: deliverable.requiresClientApproval,
    status: deliverable.status,
    tasks: editableTasks(deliverable.tasks),
  }));
}

function nextCode(prefix: string, count: number): string {
  return `${prefix}-${String(count + 1).padStart(2, "0")}`;
}

const copy = {
  ar: {
    active: "نشط",
    activeServices: "خدمات نشطة",
    addDeliverable: "إضافة مخرج",
    addOneTimeService: "إضافة خدمة مرة واحدة",
    addPhase: "إضافة مرحلة",
    addTask: "إضافة مهمة",
    allCategories: "كل التصنيفات",
    arabicName: "الاسم العربي",
    archived: "مؤرشف",
    averageBasePrice: "متوسط السعر الأساسي",
    basePrice: "السعر الأساسي",
    basePriceSar: "السعر الأساسي (ر.س)",
    behavior: "السلوك",
    category: "التصنيف",
    clientApproval: "اعتماد العميل",
    code: "الرمز",
    configuredServices: "خدمات المرة الواحدة المفعلة",
    createRevision: "إنشاء إصدار",
    createRevisionDescription: (version: number) =>
      `الحفظ ينشئ الإصدار v${new Intl.NumberFormat("ar-SA").format(version)}؛ والسجلات الصادرة تبقى ثابتة.`,
    createService: "إنشاء الخدمة",
    createServiceDescription: "إنشاء السجل الثابت وأول إصدار للخدمة.",
    createsProject: "تنشئ مشروعًا بعد التفعيل المستقبلي",
    days: "يوم",
    deliverable: (index: number) => `المخرج ${new Intl.NumberFormat("ar-SA").format(index + 1)}`,
    deliverables: "المخرجات:",
    deliverablesAndTasks: "المخرجات والمهام",
    deliverablesDescription: "كل مهمة مرتبطة بمخرج واحد داخل هذا الإصدار.",
    description: "الوصف",
    displayOrder: "ترتيب العرض",
    draft: "مسودة",
    duration: "المدة",
    durationDays: "مدة التنفيذ المتوقعة (بالأيام)",
    editService: (code: string) => `تعديل ${code}`,
    editTemplate: "تعديل التفاصيل والقالب",
    englishName: "الاسم الإنجليزي",
    estimatedHours: "الساعات المقدرة",
    hours: "الساعات",
    inactive: "غير نشط",
    initialStatus: "الحالة الأولية",
    internalHourlyCost: "التكلفة الداخلية للساعة (ر.س)",
    newService: "خدمة مرة واحدة جديدة",
    noCategory: "بدون تصنيف",
    noDescription: "لا يوجد وصف.",
    noDeliverables: "لا توجد مخرجات مهيأة.",
    noPhase: "بدون مرحلة",
    noPhases: "لا توجد مراحل مهيأة.",
    noServices: "لا توجد خدمات مرة واحدة مطابقة لهذا الفلتر.",
    oneTimeCatalog: "كتالوج المرة الواحدة",
    oneTimeServiceStudio: "استوديو خدمات المرة الواحدة",
    oneTimeServiceStudioDescription:
      "إدارة خدمات Build وDigital ذات التسعير المستقل، المراحل، المخرجات، المهام، وسلوك إنشاء المشروع.",
    oneTimeServices: "خدمات المرة الواحدة",
    order: "الترتيب",
    phase: "المرحلة",
    phaseDescription: "رموز المراحل تبقى ثابتة داخل كل إصدار.",
    phaseLabel: (index: number) => `المرحلة ${new Intl.NumberFormat("ar-SA").format(index + 1)}`,
    phases: "المراحل:",
    records: (count: number) => `${new Intl.NumberFormat("ar-SA").format(count)} سجل خدمة ثابت.`,
    remove: "إزالة",
    removeDeliverable: "إزالة المخرج",
    removePhase: "إزالة المرحلة",
    required: "إلزامية",
    requiredOutput: "مخرج إلزامي",
    revision: "الإصدار",
    sar: "ر.س",
    selectCategory: "اختر التصنيف",
    serviceDescription:
      "تهيئة خدمات Build وDigital، الأسعار، المدد، المراحل، المخرجات، والمهام من خلال APIs آمنة بالإصدارات.",
    serviceLine: "مسار / نوع الخدمة",
    servicePath: (path: string) => (path === "Build" ? "بناء" : path === "Digital" ? "رقمي" : path),
    serviceRevisionCreated: "تم إنشاء إصدار جديد لخدمة المرة الواحدة.",
    serviceCreated: "تم إنشاء خدمة المرة الواحدة.",
    servicePhases: "مراحل الخدمة",
    studioRules: "ضوابط الخدمة",
    studioSafetyA:
      "كل تعديل على السعر أو المراحل أو المخرجات ينشئ إصدارًا جديدًا ولا يغيّر الطلبات السابقة.",
    studioSafetyB: "الخدمة المؤرشفة تبقى محفوظة للتاريخ ولا تظهر كطلب جديد للعميل.",
    studioSafetyC: "المخرجات والمهام يجب أن تبقى مرتبطة بإصدار الخدمة حتى لا تنكسر رحلة التنفيذ.",
    status: "الحالة",
    taskArabicName: (index: number) =>
      `اسم المهمة ${new Intl.NumberFormat("ar-SA").format(index + 1)} بالعربية`,
    taskCode: (index: number) => `رمز المهمة ${new Intl.NumberFormat("ar-SA").format(index + 1)}`,
    taskDescription: (index: number) =>
      `وصف المهمة ${new Intl.NumberFormat("ar-SA").format(index + 1)}`,
    taskEnglishName: (index: number) =>
      `اسم المهمة ${new Intl.NumberFormat("ar-SA").format(index + 1)} بالإنجليزية`,
    taskHours: (index: number) =>
      `ساعات المهمة ${new Intl.NumberFormat("ar-SA").format(index + 1)}`,
    taskOrder: (index: number) =>
      `ترتيب المهمة ${new Intl.NumberFormat("ar-SA").format(index + 1)}`,
    taskStatus: (index: number) =>
      `حالة المهمة ${new Intl.NumberFormat("ar-SA").format(index + 1)}`,
    tasks: "المهام",
    templateLinks: "روابط القالب",
    totalServices: "إجمالي الخدمات",
    visibleInPricing: "ظاهرة في التسعير المستقبلي",
  },
  en: {
    active: "Active",
    activeServices: "Active services",
    addDeliverable: "Add deliverable",
    addOneTimeService: "Add one-time service",
    addPhase: "Add phase",
    addTask: "Add task",
    allCategories: "All categories",
    arabicName: "Arabic name",
    archived: "Archived",
    averageBasePrice: "Average base price",
    basePrice: "Base price",
    basePriceSar: "Base price (SAR)",
    behavior: "Behavior",
    category: "Category",
    clientApproval: "Client approval",
    code: "Code",
    configuredServices: "Configured one-time services",
    createRevision: "Create revision",
    createRevisionDescription: (version: number) =>
      `Saving creates revision v${version}; issued history remains pinned.`,
    createService: "Create service",
    createServiceDescription: "Create the stable record and its first template revision.",
    createsProject: "Creates a project after future activation",
    days: "days",
    deliverable: (index: number) => `Deliverable ${index + 1}`,
    deliverables: "Deliverables:",
    deliverablesAndTasks: "Deliverables and tasks",
    deliverablesDescription: "Each task belongs to one deliverable in this revision.",
    description: "Description",
    displayOrder: "Display order",
    draft: "Draft",
    duration: "Duration",
    durationDays: "Estimated duration (days)",
    editService: (code: string) => `Edit ${code}`,
    editTemplate: "Edit details & template",
    englishName: "English name",
    estimatedHours: "Estimated hours",
    hours: "Hours",
    inactive: "Inactive",
    initialStatus: "Initial status",
    internalHourlyCost: "Internal hourly cost (SAR)",
    newService: "New one-time service",
    noCategory: "No category",
    noDescription: "No description provided.",
    noDeliverables: "No deliverables configured.",
    noPhase: "No phase",
    noPhases: "No phases configured.",
    noServices: "No one-time services match this filter.",
    oneTimeCatalog: "One-time catalog",
    oneTimeServiceStudio: "One-time service studio",
    oneTimeServiceStudioDescription:
      "Manage Build and Digital one-time services with standalone pricing, phases, deliverables, tasks, and project behavior.",
    oneTimeServices: "One-time services",
    order: "Order",
    phase: "Phase",
    phaseDescription: "Phase codes remain stable inside each revision.",
    phaseLabel: (index: number) => `Phase ${index + 1}`,
    phases: "Phases:",
    records: (count: number) => `${count} stable service records.`,
    remove: "Remove",
    removeDeliverable: "Remove deliverable",
    removePhase: "Remove phase",
    required: "Required",
    requiredOutput: "Required output",
    revision: "Revision",
    sar: "SAR",
    selectCategory: "Select category",
    serviceDescription:
      "Configure Build and Digital services, pricing, duration, phases, deliverables, and tasks through revision-safe APIs.",
    serviceLine: "Service path/type",
    servicePath: (path: string) => path,
    serviceRevisionCreated: "A new one-time service revision was created.",
    serviceCreated: "One-time service created.",
    servicePhases: "Service phases",
    studioRules: "Service guardrails",
    studioSafetyA:
      "Every price, phase, or deliverable change creates a new revision and never rewrites old requests.",
    studioSafetyB:
      "Archived services stay available for history but do not appear as new client requests.",
    studioSafetyC:
      "Deliverables and tasks must remain tied to the service revision to protect execution workflows.",
    status: "Status",
    taskArabicName: (index: number) => `Task ${index + 1} Arabic name`,
    taskCode: (index: number) => `Task ${index + 1} code`,
    taskDescription: (index: number) => `Task ${index + 1} description`,
    taskEnglishName: (index: number) => `Task ${index + 1} English name`,
    taskHours: (index: number) => `Task ${index + 1} hours`,
    taskOrder: (index: number) => `Task ${index + 1} order`,
    taskStatus: (index: number) => `Task ${index + 1} status`,
    tasks: "Tasks:",
    templateLinks: "Template links",
    totalServices: "Total services",
    visibleInPricing: "Visible in future pricing",
  },
} as const;

const statusLabels = {
  ACTIVE: { ar: "نشط", en: "Active" },
  ARCHIVED: { ar: "مؤرشف", en: "Archived" },
  DRAFT: { ar: "مسودة", en: "Draft" },
  INACTIVE: { ar: "غير نشط", en: "Inactive" },
} satisfies Record<CatalogStatus, Record<SupportedLocale, string>>;

function localizedCategoryName(
  category: { nameAr: string; nameEn: string; code?: string },
  locale: SupportedLocale,
): string {
  return locale === "ar"
    ? category.nameAr || category.nameEn || category.code || ""
    : category.nameEn || category.nameAr || category.code || "";
}

function localizedServiceName(service: OneTimeService, locale: SupportedLocale): string {
  return locale === "ar"
    ? service.revision?.nameAr || service.revision?.nameEn || service.code
    : service.revision?.nameEn || service.revision?.nameAr || service.code;
}

function localizedPhaseName(phase: EditablePhase, locale: SupportedLocale): string {
  return locale === "ar"
    ? phase.nameAr || phase.nameEn || phase.code
    : phase.nameEn || phase.nameAr || phase.code;
}

function number(value: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-SA").format(value);
}

function money(value: number, locale: SupportedLocale): string {
  return locale === "ar" ? `${number(value, locale)} ر.س` : `${value} SAR`;
}

function taskCount(service: OneTimeService): number {
  return (
    service.revision?.deliverables.reduce(
      (total, deliverable) => total + deliverable.tasks.length,
      0,
    ) ?? 0
  );
}

export function OneTimeServiceManager({
  initialSnapshot,
  locale: localeInput = "en",
}: {
  initialSnapshot: OneTimeCatalogSnapshot;
  locale?: string;
}) {
  const locale = normalizeLocale(localeInput);
  const t = copy[locale];
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [editing, setEditing] = useState<OneTimeService | null>(null);
  const [creating, setCreating] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [phases, setPhases] = useState<EditablePhase[]>([]);
  const [deliverables, setDeliverables] = useState<EditableDeliverable[]>([]);
  const mutation = useCatalogMutation(setSnapshot, refreshOneTimeCatalog);
  const visibleServices = useMemo(
    () =>
      snapshot.services.filter(
        (service) => categoryFilter === "ALL" || service.categoryId === categoryFilter,
      ),
    [categoryFilter, snapshot.services],
  );
  const activeServices = snapshot.services.filter((service) => service.status === "ACTIVE").length;
  const pricingVisibleServices = snapshot.services.filter(
    (service) => service.revision?.visibleInPricing,
  ).length;
  const templateLinks = snapshot.services.reduce(
    (sum, service) =>
      sum +
      (service.revision?.phases.length ?? 0) +
      (service.revision?.deliverables.length ?? 0) +
      taskCount(service),
    0,
  );
  const averageBasePrice =
    snapshot.services.length === 0
      ? 0
      : snapshot.services.reduce((sum, service) => sum + (service.revision?.basePriceSar ?? 0), 0) /
        snapshot.services.length;

  function openCreate() {
    mutation.clearFeedback();
    setEditing(null);
    setCreating(true);
    setPhases([]);
    setDeliverables([]);
  }

  function openEdit(service: OneTimeService) {
    mutation.clearFeedback();
    setCreating(false);
    setEditing(service);
    setPhases(editablePhases(service.revision?.phases));
    setDeliverables(editableDeliverables(service.revision?.deliverables));
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
    setPhases([]);
    setDeliverables([]);
  }

  function addPhase() {
    setPhases((current) => [
      ...current,
      {
        code: nextCode("PHASE", current.length),
        nameAr: "",
        nameEn: "",
        description: "",
        sortOrder: current.length,
        isRequired: true,
        status: "ACTIVE",
      },
    ]);
  }

  function updatePhase(index: number, update: Partial<EditablePhase>) {
    setPhases((current) =>
      current.map((phase, candidate) => (candidate === index ? { ...phase, ...update } : phase)),
    );
  }

  function removePhase(index: number) {
    const removedCode = phases[index]?.code;
    setPhases((current) => current.filter((_, candidate) => candidate !== index));
    if (removedCode) {
      setDeliverables((current) =>
        current.map((deliverable) =>
          deliverable.phaseCode === removedCode ? { ...deliverable, phaseCode: "" } : deliverable,
        ),
      );
    }
  }

  function addDeliverable() {
    setDeliverables((current) => [
      ...current,
      {
        code: nextCode("DEL", current.length),
        phaseCode: phases[0]?.code ?? "",
        nameAr: "",
        nameEn: "",
        description: "",
        sortOrder: current.length,
        isRequired: true,
        requiresClientApproval: true,
        status: "ACTIVE",
        tasks: [],
      },
    ]);
  }

  function updateDeliverable(index: number, update: Partial<EditableDeliverable>) {
    setDeliverables((current) =>
      current.map((deliverable, candidate) =>
        candidate === index ? { ...deliverable, ...update } : deliverable,
      ),
    );
  }

  function addTask(deliverableIndex: number) {
    setDeliverables((current) =>
      current.map((deliverable, candidate) =>
        candidate === deliverableIndex
          ? {
              ...deliverable,
              tasks: [
                ...deliverable.tasks,
                {
                  code: nextCode("TASK", deliverable.tasks.length),
                  nameAr: "",
                  nameEn: "",
                  description: "",
                  estimatedHours: 0,
                  sortOrder: deliverable.tasks.length,
                  isRequired: true,
                  status: "ACTIVE",
                },
              ],
            }
          : deliverable,
      ),
    );
  }

  function updateTask(deliverableIndex: number, taskIndex: number, update: Partial<EditableTask>) {
    setDeliverables((current) =>
      current.map((deliverable, candidate) =>
        candidate === deliverableIndex
          ? {
              ...deliverable,
              tasks: deliverable.tasks.map((task, taskCandidate) =>
                taskCandidate === taskIndex ? { ...task, ...update } : task,
              ),
            }
          : deliverable,
      ),
    );
  }

  function removeTask(deliverableIndex: number, taskIndex: number) {
    setDeliverables((current) =>
      current.map((deliverable, candidate) =>
        candidate === deliverableIndex
          ? {
              ...deliverable,
              tasks: deliverable.tasks.filter((_, taskCandidate) => taskCandidate !== taskIndex),
            }
          : deliverable,
      ),
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      ...(creating
        ? {
            code: String(form.get("code") ?? "")
              .trim()
              .toUpperCase(),
            status: String(form.get("status") ?? "DRAFT"),
            sortOrder: Number(form.get("sortOrder") ?? 0),
          }
        : {}),
      categoryId: String(form.get("categoryId") ?? ""),
      serviceLine: String(form.get("serviceLine") ?? ""),
      nameAr: String(form.get("nameAr") ?? "").trim(),
      nameEn: String(form.get("nameEn") ?? "").trim(),
      description: String(form.get("description") ?? "").trim(),
      basePriceSar: Number(form.get("basePriceSar") ?? 0),
      estimatedHours: Number(form.get("estimatedHours") ?? 0),
      internalHourlyCostSar: Number(form.get("internalHourlyCostSar") ?? 0),
      durationDays: Number(form.get("durationDays") ?? 0),
      visibleInPricing: form.get("visibleInPricing") === "on",
      createsProject: form.get("createsProject") === "on",
      phases: phases.map((phase) => ({
        ...phase,
        code: phase.code.trim().toUpperCase(),
      })),
      deliverables: deliverables.map((deliverable) => ({
        ...deliverable,
        code: deliverable.code.trim().toUpperCase(),
        phaseCode: deliverable.phaseCode.trim().toUpperCase() || undefined,
        tasks: deliverable.tasks.map((task) => ({
          ...task,
          code: task.code.trim().toUpperCase(),
        })),
      })),
    };
    const saved = await mutation.mutate(
      creating ? "services/one-time" : `services/one-time/${editing!.id}`,
      {
        method: creating ? "POST" : "PUT",
        body: JSON.stringify(payload),
      },
      creating ? t.serviceCreated : t.serviceRevisionCreated,
    );
    if (saved) {
      closeForm();
    }
  }

  const current = editing?.revision;

  return (
    <>
      <PageHeader
        actions={[{ label: t.addOneTimeService, onClick: openCreate, variant: "primary" }]}
        eyebrow={t.oneTimeCatalog}
        title={t.oneTimeServices}
        description={t.serviceDescription}
      />
      <CatalogFeedback error={mutation.error} success={mutation.success} />

      <section className="one-time-service-command" aria-label={t.oneTimeServiceStudio}>
        <div className="one-time-service-command-main">
          <p className="eyebrow">{t.oneTimeServiceStudio}</p>
          <h2>{t.configuredServices}</h2>
          <p>{t.oneTimeServiceStudioDescription}</p>
        </div>
        <div className="one-time-service-guardrails">
          <strong>{t.studioRules}</strong>
          <span>{t.studioSafetyA}</span>
          <span>{t.studioSafetyB}</span>
          <span>{t.studioSafetyC}</span>
        </div>
      </section>

      <BentoGrid compact>
        <MetricCard
          accent
          label={t.totalServices}
          value={number(snapshot.services.length, locale)}
          detail={`${number(activeServices, locale)} ${t.activeServices}`}
        />
        <MetricCard
          label={t.visibleInPricing}
          value={number(pricingVisibleServices, locale)}
          detail={t.oneTimeCatalog}
        />
        <MetricCard
          label={t.templateLinks}
          value={number(templateLinks, locale)}
          detail={t.deliverablesAndTasks}
        />
        <MetricCard
          label={t.averageBasePrice}
          value={money(Math.round(averageBasePrice), locale)}
          detail={t.basePrice}
        />
      </BentoGrid>

      {creating || editing ? (
        <section className="one-time-service-editor">
          <div className="one-time-service-editor-heading">
            <span>{creating ? t.createService : t.createRevision}</span>
            <h2>{creating ? t.newService : t.editService(editing!.code)}</h2>
            <p>
              {creating
                ? t.createServiceDescription
                : t.createRevisionDescription((current?.version ?? 0) + 1)}
            </p>
          </div>
          <form className="catalog-form wide-form one-time-service-form" onSubmit={submit}>
            {creating ? (
              <label>
                {t.code}
                <input
                  name="code"
                  required
                  pattern="[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*"
                  placeholder="OT-BUILD-WEBSITE"
                />
              </label>
            ) : null}
            <label>
              {t.category}
              <select name="categoryId" required defaultValue={editing?.categoryId ?? ""}>
                <option value="" disabled>
                  {t.selectCategory}
                </option>
                {snapshot.categories
                  .filter((category) => category.status !== "ARCHIVED")
                  .map((category) => (
                    <option value={category.id} key={category.id}>
                      {localizedCategoryName(category, locale)} -{" "}
                      {statusLabels[category.status][locale]}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              {t.serviceLine}
              <select
                name="serviceLine"
                required
                defaultValue={editing?.serviceLine ?? snapshot.servicePaths[0] ?? ""}
              >
                {snapshot.servicePaths.map((path) => (
                  <option value={path} key={path}>
                    {t.servicePath(path)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t.arabicName}
              <input name="nameAr" required dir="rtl" defaultValue={current?.nameAr} />
            </label>
            <label>
              {t.englishName}
              <input name="nameEn" required defaultValue={current?.nameEn} />
            </label>
            <label className="form-span">
              {t.description}
              <textarea name="description" required defaultValue={current?.description} />
            </label>
            <label>
              {t.basePriceSar}
              <input
                name="basePriceSar"
                type="number"
                min="0"
                max="100000000"
                step="0.01"
                required
                defaultValue={current?.basePriceSar ?? 0}
              />
            </label>
            <label>
              {t.estimatedHours}
              <input
                name="estimatedHours"
                type="number"
                min="0"
                max="100000"
                step="0.01"
                required
                defaultValue={current?.estimatedHours ?? 0}
              />
            </label>
            <label>
              {t.internalHourlyCost}
              <input
                name="internalHourlyCostSar"
                type="number"
                min="0"
                max="1000000"
                step="0.01"
                required
                defaultValue={current?.internalHourlyCostSar ?? 0}
              />
            </label>
            <label>
              {t.durationDays}
              <input
                name="durationDays"
                type="number"
                min="0"
                max="3650"
                required
                defaultValue={current?.durationDays ?? 0}
              />
            </label>
            <fieldset className="form-span option-fieldset">
              <legend>{t.behavior}</legend>
              <label className="checkbox-field">
                <input
                  name="visibleInPricing"
                  type="checkbox"
                  defaultChecked={current?.visibleInPricing ?? true}
                />
                {t.visibleInPricing}
              </label>
              <label className="checkbox-field">
                <input
                  name="createsProject"
                  type="checkbox"
                  defaultChecked={current?.createsProject ?? true}
                />
                {t.createsProject}
              </label>
            </fieldset>

            <fieldset className="form-span package-editor">
              <legend>{t.servicePhases}</legend>
              <div className="template-toolbar">
                <p>{t.phaseDescription}</p>
                <button className="os-button os-button-secondary" type="button" onClick={addPhase}>
                  {t.addPhase}
                </button>
              </div>
              {phases.length === 0 ? (
                <EmptyState>{t.noPhases}</EmptyState>
              ) : (
                <div className="template-stack">
                  {phases.map((phase, index) => (
                    <article className="template-editor-card" key={`${index}-${phase.code}`}>
                      <div className="template-card-heading">
                        <strong>{t.phaseLabel(index)}</strong>
                        <button
                          className="os-button os-button-danger"
                          type="button"
                          onClick={() => removePhase(index)}
                        >
                          {t.removePhase}
                        </button>
                      </div>
                      <div className="template-field-grid">
                        <label>
                          {t.code}
                          <input
                            required
                            value={phase.code}
                            onChange={(event) => updatePhase(index, { code: event.target.value })}
                          />
                        </label>
                        <label>
                          {t.englishName}
                          <input
                            required
                            value={phase.nameEn}
                            onChange={(event) => updatePhase(index, { nameEn: event.target.value })}
                          />
                        </label>
                        <label>
                          {t.arabicName}
                          <input
                            required
                            dir="rtl"
                            value={phase.nameAr}
                            onChange={(event) => updatePhase(index, { nameAr: event.target.value })}
                          />
                        </label>
                        <label>
                          {t.order}
                          <input
                            type="number"
                            min="0"
                            value={phase.sortOrder}
                            onChange={(event) =>
                              updatePhase(index, {
                                sortOrder: Number(event.target.value),
                              })
                            }
                          />
                        </label>
                        <label className="form-span">
                          {t.description}
                          <textarea
                            value={phase.description}
                            onChange={(event) =>
                              updatePhase(index, {
                                description: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          {t.status}
                          <select
                            value={phase.status}
                            onChange={(event) =>
                              updatePhase(index, {
                                status: event.target.value as CatalogStatus,
                              })
                            }
                          >
                            <option value="ACTIVE">{t.active}</option>
                            <option value="INACTIVE">{t.inactive}</option>
                            <option value="ARCHIVED">{t.archived}</option>
                          </select>
                        </label>
                        <label className="checkbox-field">
                          <input
                            type="checkbox"
                            checked={phase.isRequired}
                            onChange={(event) =>
                              updatePhase(index, {
                                isRequired: event.target.checked,
                              })
                            }
                          />
                          {t.required}
                        </label>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </fieldset>

            <fieldset className="form-span package-editor">
              <legend>{t.deliverablesAndTasks}</legend>
              <div className="template-toolbar">
                <p>{t.deliverablesDescription}</p>
                <button
                  className="os-button os-button-secondary"
                  type="button"
                  onClick={addDeliverable}
                >
                  {t.addDeliverable}
                </button>
              </div>
              {deliverables.length === 0 ? (
                <EmptyState>{t.noDeliverables}</EmptyState>
              ) : (
                <div className="template-stack">
                  {deliverables.map((deliverable, deliverableIndex) => (
                    <article
                      className="template-editor-card"
                      key={`${deliverableIndex}-${deliverable.code}`}
                    >
                      <div className="template-card-heading">
                        <strong>{t.deliverable(deliverableIndex)}</strong>
                        <button
                          className="os-button os-button-danger"
                          type="button"
                          onClick={() =>
                            setDeliverables((current) =>
                              current.filter((_, candidate) => candidate !== deliverableIndex),
                            )
                          }
                        >
                          {t.removeDeliverable}
                        </button>
                      </div>
                      <div className="template-field-grid">
                        <label>
                          {t.code}
                          <input
                            required
                            value={deliverable.code}
                            onChange={(event) =>
                              updateDeliverable(deliverableIndex, {
                                code: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          {t.phase}
                          <select
                            value={deliverable.phaseCode}
                            onChange={(event) =>
                              updateDeliverable(deliverableIndex, {
                                phaseCode: event.target.value,
                              })
                            }
                          >
                            <option value="">{t.noPhase}</option>
                            {phases.map((phase) => (
                              <option value={phase.code} key={phase.code}>
                                {localizedPhaseName(phase, locale)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          {t.englishName}
                          <input
                            required
                            value={deliverable.nameEn}
                            onChange={(event) =>
                              updateDeliverable(deliverableIndex, {
                                nameEn: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          {t.arabicName}
                          <input
                            required
                            dir="rtl"
                            value={deliverable.nameAr}
                            onChange={(event) =>
                              updateDeliverable(deliverableIndex, {
                                nameAr: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          {t.order}
                          <input
                            type="number"
                            min="0"
                            value={deliverable.sortOrder}
                            onChange={(event) =>
                              updateDeliverable(deliverableIndex, {
                                sortOrder: Number(event.target.value),
                              })
                            }
                          />
                        </label>
                        <label className="form-span">
                          {t.description}
                          <textarea
                            value={deliverable.description}
                            onChange={(event) =>
                              updateDeliverable(deliverableIndex, {
                                description: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          {t.status}
                          <select
                            value={deliverable.status}
                            onChange={(event) =>
                              updateDeliverable(deliverableIndex, {
                                status: event.target.value as CatalogStatus,
                              })
                            }
                          >
                            <option value="ACTIVE">{t.active}</option>
                            <option value="INACTIVE">{t.inactive}</option>
                            <option value="ARCHIVED">{t.archived}</option>
                          </select>
                        </label>
                        <label className="checkbox-field">
                          <input
                            type="checkbox"
                            checked={deliverable.isRequired}
                            onChange={(event) =>
                              updateDeliverable(deliverableIndex, {
                                isRequired: event.target.checked,
                              })
                            }
                          />
                          {t.requiredOutput}
                        </label>
                        <label className="checkbox-field">
                          <input
                            type="checkbox"
                            checked={deliverable.requiresClientApproval}
                            onChange={(event) =>
                              updateDeliverable(deliverableIndex, {
                                requiresClientApproval: event.target.checked,
                              })
                            }
                          />
                          {t.clientApproval}
                        </label>
                      </div>
                      <div className="task-editor">
                        <div className="template-toolbar">
                          <strong>{t.tasks}</strong>
                          <button
                            className="os-button os-button-secondary"
                            type="button"
                            onClick={() => addTask(deliverableIndex)}
                          >
                            {t.addTask}
                          </button>
                        </div>
                        {deliverable.tasks.map((task, taskIndex) => (
                          <div className="task-editor-row" key={`${taskIndex}-${task.code}`}>
                            <input
                              aria-label={t.taskCode(taskIndex)}
                              required
                              value={task.code}
                              onChange={(event) =>
                                updateTask(deliverableIndex, taskIndex, {
                                  code: event.target.value,
                                })
                              }
                            />
                            <input
                              aria-label={t.taskEnglishName(taskIndex)}
                              required
                              placeholder={t.englishName}
                              value={task.nameEn}
                              onChange={(event) =>
                                updateTask(deliverableIndex, taskIndex, {
                                  nameEn: event.target.value,
                                })
                              }
                            />
                            <input
                              aria-label={t.taskArabicName(taskIndex)}
                              required
                              dir="rtl"
                              placeholder={t.arabicName}
                              value={task.nameAr}
                              onChange={(event) =>
                                updateTask(deliverableIndex, taskIndex, {
                                  nameAr: event.target.value,
                                })
                              }
                            />
                            <input
                              aria-label={t.taskDescription(taskIndex)}
                              placeholder={t.description}
                              value={task.description}
                              onChange={(event) =>
                                updateTask(deliverableIndex, taskIndex, {
                                  description: event.target.value,
                                })
                              }
                            />
                            <input
                              aria-label={t.taskHours(taskIndex)}
                              type="number"
                              min="0"
                              step="0.01"
                              value={task.estimatedHours}
                              onChange={(event) =>
                                updateTask(deliverableIndex, taskIndex, {
                                  estimatedHours: Number(event.target.value),
                                })
                              }
                            />
                            <input
                              aria-label={t.taskOrder(taskIndex)}
                              type="number"
                              min="0"
                              value={task.sortOrder}
                              onChange={(event) =>
                                updateTask(deliverableIndex, taskIndex, {
                                  sortOrder: Number(event.target.value),
                                })
                              }
                            />
                            <select
                              aria-label={t.taskStatus(taskIndex)}
                              value={task.status}
                              onChange={(event) =>
                                updateTask(deliverableIndex, taskIndex, {
                                  status: event.target.value as CatalogStatus,
                                })
                              }
                            >
                              <option value="ACTIVE">{t.active}</option>
                              <option value="INACTIVE">{t.inactive}</option>
                              <option value="ARCHIVED">{t.archived}</option>
                            </select>
                            <label className="checkbox-field">
                              <input
                                type="checkbox"
                                checked={task.isRequired}
                                onChange={(event) =>
                                  updateTask(deliverableIndex, taskIndex, {
                                    isRequired: event.target.checked,
                                  })
                                }
                              />
                              {t.required}
                            </label>
                            <button
                              className="os-button os-button-danger"
                              type="button"
                              onClick={() => removeTask(deliverableIndex, taskIndex)}
                            >
                              {t.remove}
                            </button>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </fieldset>

            {creating && (
              <>
                <label>
                  {t.initialStatus}
                  <select name="status" defaultValue="DRAFT">
                    <option value="DRAFT">{t.draft}</option>
                    <option value="ACTIVE">{t.active}</option>
                  </select>
                </label>
                <label>
                  {t.displayOrder}
                  <input name="sortOrder" type="number" min="0" defaultValue="0" />
                </label>
              </>
            )}
            <FormActions
              locale={locale}
              submitting={mutation.submitting}
              onCancel={closeForm}
              submitLabel={creating ? t.createService : t.createRevision}
            />
          </form>
        </section>
      ) : null}

      <SectionCard
        title={t.configuredServices}
        description={t.records(snapshot.services.length)}
        action={
          <label className="compact-filter">
            {t.category}
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="ALL">{t.allCategories}</option>
              {snapshot.categories.map((category) => (
                <option value={category.id} key={category.id}>
                  {localizedCategoryName(category, locale)}
                </option>
              ))}
            </select>
          </label>
        }
      >
        {visibleServices.length === 0 ? (
          <EmptyState>{t.noServices}</EmptyState>
        ) : (
          <div className="one-time-service-grid">
            {visibleServices.map((service) => {
              const revision = service.revision;
              const deliverableCount = revision?.deliverables.length ?? 0;
              const phasesCount = revision?.phases.length ?? 0;
              const tasksCount = taskCount(service);

              return (
                <article className="one-time-service-card" key={service.id}>
                  <div className="one-time-service-card-top">
                    <span className="one-time-service-badge" aria-hidden="true">
                      {service.code.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="one-time-service-card-title">
                      <small>
                        {service.code} - {t.servicePath(service.serviceLine)} -{" "}
                        {localizedCategoryName(service.category, locale)}
                      </small>
                      <h3>{localizedServiceName(service, locale)}</h3>
                      {locale === "en" && revision?.nameAr ? (
                        <p dir="rtl">{revision.nameAr}</p>
                      ) : null}
                    </div>
                    <StatusBadge locale={locale} status={service.status} />
                  </div>

                  <p className="one-time-service-description">
                    {revision?.description || t.noDescription}
                  </p>

                  <dl className="one-time-service-metrics">
                    <div>
                      <dt>{t.basePrice}</dt>
                      <dd>{money(revision?.basePriceSar ?? 0, locale)}</dd>
                    </div>
                    <div>
                      <dt>{t.hours}</dt>
                      <dd>{number(revision?.estimatedHours ?? 0, locale)}</dd>
                    </div>
                    <div>
                      <dt>{t.duration}</dt>
                      <dd>
                        {number(revision?.durationDays ?? 0, locale)} {t.days}
                      </dd>
                    </div>
                    <div>
                      <dt>{t.revision}</dt>
                      <dd>v{revision?.version ?? "-"}</dd>
                    </div>
                  </dl>

                  <div className="one-time-service-flags">
                    {revision?.visibleInPricing ? <span>{t.visibleInPricing}</span> : null}
                    {revision?.createsProject ? <span>{t.createsProject}</span> : null}
                  </div>

                  <div className="one-time-service-template">
                    <span>
                      <strong>{number(phasesCount, locale)}</strong>
                      {t.phases}
                    </span>
                    <span>
                      <strong>{number(deliverableCount, locale)}</strong>
                      {t.deliverables}
                    </span>
                    <span>
                      <strong>{number(tasksCount, locale)}</strong>
                      {t.tasks}
                    </span>
                  </div>

                  <div className="one-time-service-order">
                    <OrderControl
                      locale={locale}
                      path={`services/one-time/${service.id}`}
                      current={service.sortOrder}
                      disabled={mutation.submitting || service.status === "ARCHIVED"}
                      mutate={mutation.mutate}
                    />
                  </div>

                  <div className="one-time-service-actions">
                    <button
                      className="os-button os-button-secondary"
                      type="button"
                      disabled={service.status === "ARCHIVED"}
                      onClick={() => openEdit(service)}
                    >
                      {t.editTemplate}
                    </button>
                    <LifecycleActions
                      locale={locale}
                      path={`services/one-time/${service.id}`}
                      status={service.status}
                      disabled={mutation.submitting}
                      mutate={mutation.mutate}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </SectionCard>
    </>
  );
}
