"use client";

import { type FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import {
  createPlatformSetting,
  platformConfigurationErrorMessage,
  publishTranslations,
  reviseNotificationTemplate,
  revisePdfTemplate,
  revisePlatformSetting,
  reviseWorkflowTemplate,
} from "../../lib/platform-configuration-client";
import { normalizeLocale, type SupportedLocale } from "../../lib/i18n";
import type {
  NotificationTemplateConfig,
  PdfTemplateConfig,
  PlatformConfigurationSnapshot,
  PlatformSetting,
  SettingValueType,
  WorkflowTemplateConfig,
} from "../../lib/platform-configuration-types";
import {
  BentoGrid,
  ControlDeck,
  ControlTile,
  MetricCard,
  PageHeader,
  SectionCard,
  StatusChip,
} from "../premium-os";
import { CatalogFeedback } from "../catalog/catalog-shared";

const copy = {
  ar: {
    active: "نشط",
    addSetting: "إضافة الإعداد",
    adminConfiguration: "إعدادات الأدمن",
    arabic: "العربية",
    arabicMessage: "الرسالة العربية",
    audience: "الجمهور",
    businessContentSchema: "مخطط المحتوى JSON",
    category: "التصنيف",
    channelsJson: "قنوات الإرسال JSON",
    checklistFoundations: "أسس قوائم العمل",
    configurationJson: "إعدادات قائمة العمل JSON",
    configurationMap: "خريطة الإعدادات",
    configurationMapDescription:
      "تنقل سريع بين الإعدادات، التنبيهات، قوالب المستندات، الترجمة، وقوالب Workflow.",
    configurationReadiness: "جاهزية إعدادات التشغيل",
    configurationReadinessDescription:
      "خريطة عملية توضح ما أصبح قابلًا للتحكم من الإعدادات وما يزال يحتاج إعدادًا قبل اعتباره جاهزًا للأبقريد.",
    configured: "مضبوط",
    createSetting: "إنشاء إعداد",
    createSettingReason: "تم الإنشاء من إعدادات المنصة",
    deepLink: "الرابط الداخلي",
    description: "الوصف",
    direction: "الاتجاه",
    documentOutputs: "مخرجات المستندات",
    english: "English",
    englishMessage: "الرسالة الإنجليزية",
    guardrailA: "القيم المقنعة لا تظهر ولا تعدل من الواجهة.",
    guardrailB: "كل تغيير ينشئ إصدارًا جديدًا ولا يعيد كتابة اللقطات السابقة.",
    guardrailC: "إرسال البريد و SMS و WhatsApp يبقى Sandbox أو مستقبليًا.",
    guardrails: "ضوابط آمنة",
    initialValue: "القيمة الأولية",
    inAppTemplates: "قوالب داخل المنصة",
    key: "المفتاح",
    labelsDescription: "انشر تسميات عربية أو إنجليزية محددة بدون تغيير المفاتيح الداخلية.",
    languageRtlFirst: "العربية RTL أولًا",
    localization: "الترجمة",
    localizationDescription: "إصدارات تسميات عربية وإنجليزية للواجهة.",
    localizationLabels: "تسميات الترجمة",
    localizationPublished: "تم نشر إصدار التسمية.",
    locale: "اللغة",
    ltrDirection: "اتجاه LTR",
    maskedValue: "هذه القيمة محمية ولا يمكن تعديلها من الواجهة.",
    missingSetting: "يحتاج إعداد",
    name: "الاسم",
    namespace: "النطاق",
    nextAction: "الخطوة التالية",
    noRevision: "لا يوجد إصدار",
    notifications: "التنبيهات",
    notificationsDescription:
      "قوالب داخل المنصة وصندوق الإرسال فقط. الإرسال الخارجي يبقى معطلًا أو Sandbox.",
    notificationSaved: (code: string) => `تم إنشاء إصدار جديد لقالب التنبيه ${code}.`,
    pdfDescription:
      "قوالب عروض الأسعار والفواتير تعتمد على لقطات محفوظة وغير قابلة لإعادة الكتابة.",
    pdfSaved: (code: string) => `تم إنشاء إصدار جديد لقالب PDF ${code}.`,
    pdfSettings: "إعدادات قوالب PDF",
    pdfTemplates: "قوالب PDF",
    placeholdersJson: "المتغيرات JSON",
    platformConfiguration: "إعدادات المنصة",
    platformDescription:
      "مركز إعدادات آمن للهوية، الترجمة، التنبيهات، قوالب PDF، Workflow، والنصوص التشغيلية من قاعدة البيانات.",
    platformSettingCreated: "تم إنشاء إعداد المنصة.",
    publishLabel: "نشر إصدار التسمية",
    publishReason: "تم النشر من إعدادات المنصة",
    reason: "سبب التغيير",
    reasonPlaceholder: "لماذا يتم هذا التغيير؟",
    recipientsJson: "المستلمون JSON",
    revisionLabel: (version?: number, status?: string) =>
      version
        ? `v${new Intl.NumberFormat("ar-SA").format(version)} - ${status ?? ""}`
        : "لا يوجد إصدار",
    saveDraftRevision: "حفظ مسودة الإصدار",
    savePdfRevision: "حفظ إصدار PDF",
    saveRevision: "حفظ الإصدار",
    saveTemplateRevision: "حفظ إصدار القالب",
    settingRevised: (key: string) => `تم إنشاء إصدار جديد للإعداد ${key}.`,
    settingKeys: "مفاتيح الإعداد",
    settings: "الإعدادات",
    settingsDescription: "قيم الأعمال والهوية والمنصة مع سجل إصدارات.",
    settingsRegistry: "سجل الإعدادات",
    settingsSectionDescription:
      "إعدادات آمنة بالإصدارات. القيم المقنعة تبقى محمية ولا تظهر في الواجهة.",
    snapshotRule: "لا تغيير رجعي على المستندات أو الطلبات الصادرة.",
    statesTransitions: (states: number, transitions: number) =>
      `${new Intl.NumberFormat("ar-SA").format(states)} حالة - ${new Intl.NumberFormat(
        "ar-SA",
      ).format(transitions)} انتقال`,
    technicalRule: "القاعدة التقنية",
    type: "النوع",
    value: "القيمة",
    workflowDescription:
      "إعداد JSON لقوائم العمل والخطوات الافتراضية فقط. محرر Workflow المرئي الكامل خارج هذه الدفعة.",
    workflowSaved: (code: string) => `تم إنشاء مسودة جديدة لقالب Workflow ${code}.`,
    workflows: "مسارات العمل",
    workflowTemplates: "قوالب Workflow / قوائم العمل",
  },
  en: {
    active: "active",
    addSetting: "Add setting",
    adminConfiguration: "Admin configuration",
    arabic: "Arabic",
    arabicMessage: "Arabic message",
    audience: "Audience",
    businessContentSchema: "Content schema JSON",
    category: "Category",
    channelsJson: "Channels JSON",
    checklistFoundations: "Checklist foundations",
    configurationJson: "Checklist configuration JSON",
    configurationMap: "Configuration map",
    configurationMapDescription:
      "Jump across settings, notifications, document templates, localization, and workflow foundations.",
    configurationReadiness: "Operating configuration readiness",
    configurationReadinessDescription:
      "A practical map of what is already configurable and what still needs settings before upgrade readiness.",
    configured: "Configured",
    createSetting: "Create setting",
    createSettingReason: "Created from Admin Platform Configuration",
    deepLink: "Deep link",
    description: "Description",
    direction: "Direction",
    documentOutputs: "Document outputs",
    english: "English",
    englishMessage: "English message",
    guardrailA: "Masked values are never exposed or edited in the UI.",
    guardrailB: "Every change creates a revision and does not rewrite prior snapshots.",
    guardrailC: "Email, SMS, and WhatsApp delivery stays disabled or sandboxed.",
    guardrails: "Safe controls",
    initialValue: "Initial value",
    inAppTemplates: "In-app templates",
    key: "Key",
    labelsDescription: "Publish focused Arabic or English labels without changing internal keys.",
    languageRtlFirst: "Arabic RTL first",
    localization: "Localization",
    localizationDescription: "Arabic and English UI label revisions.",
    localizationLabels: "Localization labels",
    localizationPublished: "Localization label revision published.",
    locale: "Locale",
    ltrDirection: "LTR",
    maskedValue: "This value is masked and cannot be edited from the UI.",
    missingSetting: "Needs setting",
    name: "Name",
    namespace: "Namespace",
    nextAction: "Next action",
    noRevision: "No revision",
    notifications: "Notifications",
    notificationsDescription:
      "In-app and outbox templates only. External delivery remains disabled or sandboxed.",
    notificationSaved: (code: string) => `${code} notification template revised.`,
    pdfDescription:
      "Quote and invoice PDFs keep using immutable quote/invoice snapshots as their source of truth.",
    pdfSaved: (code: string) => `${code} PDF template revised.`,
    pdfSettings: "PDF template settings",
    pdfTemplates: "PDF templates",
    placeholdersJson: "Placeholders JSON",
    platformConfiguration: "Platform configuration",
    platformDescription:
      "A safe control center for branding, localization, notification, PDF, workflow, and operating text foundations from the database.",
    platformSettingCreated: "Platform setting created.",
    publishLabel: "Publish label revision",
    publishReason: "Published from Admin Platform Configuration",
    reason: "Reason",
    reasonPlaceholder: "Why is this changing?",
    recipientsJson: "Recipients JSON",
    revisionLabel: (version?: number, status?: string) =>
      version ? `v${version} - ${status ?? ""}` : "No revision",
    saveDraftRevision: "Save draft revision",
    savePdfRevision: "Save PDF revision",
    saveRevision: "Save revision",
    saveTemplateRevision: "Save template revision",
    settingRevised: (key: string) => `${key} revised.`,
    settingKeys: "Setting keys",
    settings: "Settings",
    settingsDescription: "Business, branding, and platform values with revision history.",
    settingsRegistry: "Settings registry",
    settingsSectionDescription:
      "Revision-safe configuration records. Masked values stay protected.",
    snapshotRule: "No retroactive changes to issued documents or requests.",
    statesTransitions: (states: number, transitions: number) =>
      `${states} states - ${transitions} transitions`,
    technicalRule: "Technical rule",
    type: "Type",
    value: "Value",
    workflowDescription:
      "Simple JSON checklist/default-step configuration only. Full visual Workflow Builder is excluded.",
    workflowSaved: (code: string) => `${code} workflow template draft created.`,
    workflows: "Workflows",
    workflowTemplates: "Workflow/checklist templates",
  },
} as const;

function language(locale: string | undefined): SupportedLocale {
  return normalizeLocale(locale);
}

function number(value: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-SA").format(value);
}

function pretty(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value ?? {}, null, 2);
}

function parseJson(text: string, fallback: unknown = {}) {
  const trimmed = text.trim();
  if (!trimmed) return fallback;
  return JSON.parse(trimmed) as unknown;
}

function parseSettingValue(type: SettingValueType, text: string, locale: SupportedLocale) {
  if (type === "JSON") return parseJson(text);
  if (type === "SECRET_REFERENCE") return text;
  if (type === "NUMBER") {
    const value = Number(text);
    if (!Number.isFinite(value)) {
      throw new Error(
        locale === "ar"
          ? "إعدادات الأرقام تتطلب رقمًا صالحًا."
          : "Number settings require a finite number.",
      );
    }
    return value;
  }
  if (type === "BOOLEAN") {
    return ["true", "1", "yes", "on"].includes(text.trim().toLowerCase());
  }
  return text;
}

function formatCode(value: string | null | undefined): string {
  if (!value) return "-";
  return value.replaceAll("_", " ").replaceAll("-", " ");
}

function settingCategoryLabel(category: string, locale: SupportedLocale): string {
  if (locale === "en") return formatCode(category);
  const labels: Record<string, string> = {
    branding: "الهوية",
    business_text: "النصوص التشغيلية",
    localization: "الترجمة",
    notification: "التنبيهات",
    platform: "المنصة",
    pricing: "التسعير",
    workflow: "مسارات العمل",
  };
  return labels[category] ?? formatCode(category);
}

interface ReadinessRequirement {
  action: string;
  area: string;
  description: string;
  href: string;
  keys: string[];
}

function readinessRequirements(locale: SupportedLocale): ReadinessRequirement[] {
  if (locale === "ar") {
    return [
      {
        area: "افتراضيات التسعير",
        description: "الضريبة، الخصم، ومدة صلاحية عرض السعر يجب أن تكون إعدادات لا قيمًا ثابتة.",
        href: "/admin/pricing-rules",
        action: "مراجعة قواعد التسعير",
        keys: [
          "pricing.tax.default_pct",
          "pricing.discount.default_pct",
          "pricing.quote.validity_days",
        ],
      },
      {
        area: "الباقات والساعات",
        description:
          "الساعات والأسعار الافتراضية للباقات يجب أن تظهر في التسعير والاشتراكات الجديدة.",
        href: "/admin/packages",
        action: "مراجعة الباقات",
        keys: ["pricing.package.default_hours", "pricing.package.default_price"],
      },
      {
        area: "معاملات التسعير",
        description: "معاملات الموظفين، الفروع، التعقيد، جاهزية البيانات، الحجم، وأولوية البدء.",
        href: "/admin/pricing-studio",
        action: "مراجعة الاستوديو",
        keys: [
          "pricing.factors.employee_count",
          "pricing.factors.branch_count",
          "pricing.factors.complexity",
          "pricing.factors.data_readiness",
          "pricing.factors.transaction_volume",
          "pricing.factors.start_priority",
        ],
      },
      {
        area: "الخدمات والبنود",
        description: "ظهور الخدمات وقوالب الحقول الديناميكية الافتراضية للبنود الجديدة.",
        href: "/admin/request-templates",
        action: "مراجعة نماذج الطلب",
        keys: [
          "services.monthly.default_visibility",
          "services.one_time.default_visibility",
          "service_items.dynamic_fields.defaults",
        ],
      },
      {
        area: "Workflow والاعتمادات",
        description: "مسارات الطلب، الاعتمادات، وSLA يجب أن تكون قابلة للضبط بدون تغيير كود.",
        href: "#workflow-templates",
        action: "مراجعة قوالب Workflow",
        keys: ["workflow.request.default", "approvals.default_route", "sla.default_days"],
      },
      {
        area: "المرفقات",
        description: "أنواع الملفات المسموحة والحد الأقصى للرفع يجب أن تكون إعدادات واضحة.",
        href: "#platform-settings",
        action: "إضافة إعدادات المرفقات",
        keys: ["attachments.allowed_mime_types", "attachments.max_size_mb"],
      },
      {
        area: "صحة العميل والتنبيهات",
        description: "قواعد صحة العميل ووضع التنبيهات الخارجية يجب أن تكون مرئية وآمنة.",
        href: "#notification-templates",
        action: "مراجعة التنبيهات",
        keys: ["client_health.score_rules", "notifications.outbound_mode"],
      },
      {
        area: "الاستيراد والتصدير",
        description: "معاينة الاستيراد وخطة الرجوع يجب أن تكون مفعلة قبل عمليات Import الحساسة.",
        href: "#platform-settings",
        action: "إضافة ضوابط Import",
        keys: ["import_export.preview_required", "import_export.rollback_required"],
      },
    ];
  }
  return [
    {
      area: "Pricing defaults",
      description: "Tax, discount, and quote validity should be settings rather than fixed values.",
      href: "/admin/pricing-rules",
      action: "Review pricing rules",
      keys: [
        "pricing.tax.default_pct",
        "pricing.discount.default_pct",
        "pricing.quote.validity_days",
      ],
    },
    {
      area: "Packages and hours",
      description:
        "Default package hours and prices should flow into pricing and new subscriptions.",
      href: "/admin/packages",
      action: "Review packages",
      keys: ["pricing.package.default_hours", "pricing.package.default_price"],
    },
    {
      area: "Pricing factors",
      description:
        "Employee, branch, complexity, data readiness, transaction, and start-priority factors.",
      href: "/admin/pricing-studio",
      action: "Review studio",
      keys: [
        "pricing.factors.employee_count",
        "pricing.factors.branch_count",
        "pricing.factors.complexity",
        "pricing.factors.data_readiness",
        "pricing.factors.transaction_volume",
        "pricing.factors.start_priority",
      ],
    },
    {
      area: "Services and items",
      description:
        "Service visibility and default dynamic field templates for newly created items.",
      href: "/admin/request-templates",
      action: "Review request templates",
      keys: [
        "services.monthly.default_visibility",
        "services.one_time.default_visibility",
        "service_items.dynamic_fields.defaults",
      ],
    },
    {
      area: "Workflow and approvals",
      description:
        "Request routes, approvals, and SLA should be configurable without code changes.",
      href: "#workflow-templates",
      action: "Review workflow templates",
      keys: ["workflow.request.default", "approvals.default_route", "sla.default_days"],
    },
    {
      area: "Attachments",
      description: "Allowed file types and upload size limits should be explicit settings.",
      href: "#platform-settings",
      action: "Add attachment settings",
      keys: ["attachments.allowed_mime_types", "attachments.max_size_mb"],
    },
    {
      area: "Client health and notifications",
      description: "Client health rules and outbound notification mode should be visible and safe.",
      href: "#notification-templates",
      action: "Review notifications",
      keys: ["client_health.score_rules", "notifications.outbound_mode"],
    },
    {
      area: "Import and export",
      description:
        "Import preview and rollback controls should be enabled before sensitive imports.",
      href: "#platform-settings",
      action: "Add import controls",
      keys: ["import_export.preview_required", "import_export.rollback_required"],
    },
  ];
}

function matchedSettingKeys(settings: PlatformSetting[], keys: string[]): string[] {
  const configured = new Set(
    settings.filter((setting) => setting.status === "ACTIVE").map((setting) => setting.key),
  );
  return keys.filter((key) => configured.has(key));
}

function currentLabel(
  current: { version: number; status: string } | null,
  locale: SupportedLocale,
): string {
  return copy[locale].revisionLabel(current?.version, current?.status);
}

function CardHeader({
  code,
  label,
  status,
  title,
}: {
  code?: string;
  label: string;
  status?: string;
  title: string;
}) {
  return (
    <div className="platform-config-card-header">
      <div>
        <small>{code}</small>
        <h3>{title}</h3>
      </div>
      <StatusChip status={status ?? "ACTIVE"} label={label} />
    </div>
  );
}

function ReadinessCard({
  configuredLabel,
  missingLabel,
  nextActionLabel,
  requirement,
  settingKeysLabel,
  settings,
}: {
  configuredLabel: string;
  missingLabel: string;
  nextActionLabel: string;
  requirement: ReadinessRequirement;
  settingKeysLabel: string;
  settings: PlatformSetting[];
}) {
  const matchedKeys = matchedSettingKeys(settings, requirement.keys);
  const configured = matchedKeys.length > 0;

  return (
    <article className={`platform-readiness-card ${configured ? "ready" : "missing"}`}>
      <div className="platform-readiness-heading">
        <div>
          <small>{settingKeysLabel}</small>
          <h3>{requirement.area}</h3>
        </div>
        <StatusChip
          status={configured ? "ACTIVE" : "DRAFT"}
          label={configured ? configuredLabel : missingLabel}
        />
      </div>
      <p>{requirement.description}</p>
      <div className="platform-readiness-keys">
        {requirement.keys.map((key) => (
          <span className={matchedKeys.includes(key) ? "matched" : undefined} key={key}>
            {key}
          </span>
        ))}
      </div>
      <Link className="os-button os-button-secondary" href={requirement.href}>
        {nextActionLabel}: {requirement.action}
      </Link>
    </article>
  );
}

function SettingCard({
  locale,
  onError,
  onSaved,
  setting,
}: {
  locale: SupportedLocale;
  onError: (message: string) => void;
  onSaved: (snapshot: PlatformConfigurationSnapshot, message: string) => void;
  setting: PlatformSetting;
}) {
  const t = copy[locale];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const snapshot = await revisePlatformSetting(setting.key, {
        reason: String(form.get("reason") ?? "").trim() || undefined,
        value: parseSettingValue(setting.valueType, String(form.get("value") ?? ""), locale),
      });
      onSaved(snapshot, t.settingRevised(setting.key));
    } catch (error) {
      onError(platformConfigurationErrorMessage(error));
    }
  }

  return (
    <article className="platform-config-card">
      <CardHeader
        code={setting.key}
        label={settingCategoryLabel(setting.category, locale)}
        status={setting.status}
        title={currentLabel(setting.current, locale)}
      />
      {setting.current?.masked ? <p className="platform-muted">{t.maskedValue}</p> : null}
      <form className="catalog-form platform-card-form" onSubmit={submit}>
        <label className="full-span">
          {t.value}
          <textarea
            name="value"
            rows={setting.valueType === "JSON" ? 5 : 2}
            defaultValue={pretty(setting.current?.value)}
            disabled={setting.current?.masked}
          />
        </label>
        <label className="full-span">
          {t.reason}
          <input name="reason" placeholder={t.reasonPlaceholder} />
        </label>
        <div className="form-actions">
          <button
            type="submit"
            className="os-button os-button-primary"
            disabled={setting.current?.masked}
          >
            {t.saveRevision}
          </button>
        </div>
      </form>
    </article>
  );
}

function NotificationCard({
  locale,
  onError,
  onSaved,
  template,
}: {
  locale: SupportedLocale;
  onError: (message: string) => void;
  onSaved: (snapshot: PlatformConfigurationSnapshot, message: string) => void;
  template: NotificationTemplateConfig;
}) {
  const t = copy[locale];
  const current = template.current;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const snapshot = await reviseNotificationTemplate(template.id, {
        channels: parseJson(String(form.get("channels") ?? "[]"), []),
        deepLink: String(form.get("deepLink") ?? ""),
        messageAr: String(form.get("messageAr") ?? ""),
        messageEn: String(form.get("messageEn") ?? ""),
        placeholders: parseJson(String(form.get("placeholders") ?? "{}"), {}),
        recipients: parseJson(String(form.get("recipients") ?? "[]"), []),
      });
      onSaved(snapshot, t.notificationSaved(template.code));
    } catch (error) {
      onError(platformConfigurationErrorMessage(error));
    }
  }

  return (
    <article className="platform-config-card">
      <CardHeader
        code={template.event}
        label={currentLabel(current, locale)}
        status={template.status}
        title={template.code}
      />
      <form className="catalog-form platform-card-form" onSubmit={submit}>
        <label className="full-span">
          {t.arabicMessage}
          <textarea name="messageAr" rows={3} defaultValue={current?.messageAr ?? ""} />
        </label>
        <label className="full-span">
          {t.englishMessage}
          <textarea name="messageEn" rows={3} defaultValue={current?.messageEn ?? ""} />
        </label>
        <label>
          {t.deepLink}
          <input name="deepLink" defaultValue={current?.deepLink ?? "/notifications"} />
        </label>
        <label>
          {t.channelsJson}
          <textarea
            name="channels"
            rows={3}
            defaultValue={pretty(current?.channels ?? ["inApp"])}
          />
        </label>
        <label>
          {t.recipientsJson}
          <textarea name="recipients" rows={3} defaultValue={pretty(current?.recipients ?? [])} />
        </label>
        <label>
          {t.placeholdersJson}
          <textarea
            name="placeholders"
            rows={3}
            defaultValue={pretty(current?.placeholders ?? {})}
          />
        </label>
        <div className="form-actions">
          <button type="submit" className="os-button os-button-primary">
            {t.saveTemplateRevision}
          </button>
        </div>
      </form>
    </article>
  );
}

function PdfCard({
  locale,
  onError,
  onSaved,
  template,
}: {
  locale: SupportedLocale;
  onError: (message: string) => void;
  onSaved: (snapshot: PlatformConfigurationSnapshot, message: string) => void;
  template: PdfTemplateConfig;
}) {
  const t = copy[locale];
  const current = template.current;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const snapshot = await revisePdfTemplate(template.id, {
        audience: String(form.get("audience") ?? "").trim(),
        contentSchema: parseJson(String(form.get("contentSchema") ?? "{}"), {}),
        languageDirection: String(form.get("languageDirection") ?? "rtl"),
        name: String(form.get("name") ?? "").trim(),
        technicalRule: String(form.get("technicalRule") ?? "").trim(),
      });
      onSaved(snapshot, t.pdfSaved(template.code));
    } catch (error) {
      onError(platformConfigurationErrorMessage(error));
    }
  }

  return (
    <article className="platform-config-card">
      <CardHeader
        code={template.documentType}
        label={currentLabel(current, locale)}
        status={template.status}
        title={template.name}
      />
      <p className="platform-muted">{t.snapshotRule}</p>
      <form className="catalog-form platform-card-form" onSubmit={submit}>
        <label>
          {t.name}
          <input name="name" defaultValue={template.name} />
        </label>
        <label>
          {t.audience}
          <input name="audience" defaultValue={current?.audience ?? "client"} />
        </label>
        <label>
          {t.direction}
          <select name="languageDirection" defaultValue={current?.languageDirection ?? "rtl"}>
            <option value="rtl">{t.languageRtlFirst}</option>
            <option value="ltr">{t.ltrDirection}</option>
          </select>
        </label>
        <label className="full-span">
          {t.businessContentSchema}
          <textarea name="contentSchema" rows={5} defaultValue={pretty(current?.contentSchema)} />
        </label>
        <label className="full-span">
          {t.technicalRule}
          <textarea name="technicalRule" rows={3} defaultValue={current?.technicalRule ?? ""} />
        </label>
        <div className="form-actions">
          <button type="submit" className="os-button os-button-primary">
            {t.savePdfRevision}
          </button>
        </div>
      </form>
    </article>
  );
}

function WorkflowCard({
  locale,
  onError,
  onSaved,
  workflow,
}: {
  locale: SupportedLocale;
  onError: (message: string) => void;
  onSaved: (snapshot: PlatformConfigurationSnapshot, message: string) => void;
  workflow: WorkflowTemplateConfig;
}) {
  const t = copy[locale];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const snapshot = await reviseWorkflowTemplate(workflow.id, {
        configuration: parseJson(String(form.get("configuration") ?? "{}"), {}),
        name: String(form.get("name") ?? "").trim(),
        revisionStatus: "DRAFT",
      });
      onSaved(snapshot, t.workflowSaved(workflow.code));
    } catch (error) {
      onError(platformConfigurationErrorMessage(error));
    }
  }

  return (
    <article className="platform-config-card">
      <CardHeader
        code={workflow.type}
        label={currentLabel(workflow.current, locale)}
        status={workflow.status}
        title={workflow.name}
      />
      <p className="platform-muted">
        {t.statesTransitions(
          workflow.current?.states.length ?? 0,
          workflow.current?.transitions.length ?? 0,
        )}
      </p>
      <form className="catalog-form platform-card-form" onSubmit={submit}>
        <label>
          {t.name}
          <input name="name" defaultValue={workflow.name} />
        </label>
        <label className="full-span">
          {t.configurationJson}
          <textarea
            name="configuration"
            rows={5}
            defaultValue={pretty(
              workflow.current?.configuration ?? {
                checklistTemplate: [],
                defaultSteps: [],
              },
            )}
          />
        </label>
        <div className="form-actions">
          <button type="submit" className="os-button os-button-primary">
            {t.saveDraftRevision}
          </button>
        </div>
      </form>
    </article>
  );
}

export function PlatformConfigurationManager({
  initialSnapshot,
  locale: localeInput = "en",
}: {
  initialSnapshot: PlatformConfigurationSnapshot;
  locale?: string;
}) {
  const locale = language(localeInput);
  const t = copy[locale];
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();

  const settingsByCategory = useMemo(() => {
    const groups = new Map<string, PlatformSetting[]>();
    for (const setting of snapshot.settings) {
      groups.set(setting.category, [...(groups.get(setting.category) ?? []), setting]);
    }
    return [...groups.entries()];
  }, [snapshot.settings]);
  const readiness = useMemo(() => readinessRequirements(locale), [locale]);
  const configuredReadiness = readiness.filter(
    (requirement) => matchedSettingKeys(snapshot.settings, requirement.keys).length > 0,
  ).length;

  const activeSettings = snapshot.settings.filter((setting) => setting.status === "ACTIVE").length;

  function onSaved(next: PlatformConfigurationSnapshot, message: string) {
    setSnapshot(next);
    setSuccess(message);
    setError(undefined);
  }

  function onError(message: string) {
    setError(message);
    setSuccess(undefined);
  }

  async function createSetting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const valueType = String(form.get("valueType") ?? "STRING") as SettingValueType;
    try {
      const next = await createPlatformSetting({
        category: String(form.get("category") ?? "").trim(),
        key: String(form.get("key") ?? "").trim(),
        reason: t.createSettingReason,
        value: parseSettingValue(valueType, String(form.get("value") ?? ""), locale),
        valueType,
      });
      event.currentTarget.reset();
      onSaved(next, t.platformSettingCreated);
    } catch (caught) {
      onError(platformConfigurationErrorMessage(caught));
    }
  }

  async function publishLabel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const next = await publishTranslations({
        reason: t.publishReason,
        values: [
          {
            description: String(form.get("description") ?? "").trim(),
            key: String(form.get("key") ?? "").trim(),
            locale: String(form.get("locale") ?? "ar").trim(),
            namespace: String(form.get("namespace") ?? "").trim(),
            value: String(form.get("value") ?? ""),
          },
        ],
      });
      onSaved(next, t.localizationPublished);
    } catch (caught) {
      onError(platformConfigurationErrorMessage(caught));
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={t.adminConfiguration}
        title={t.platformConfiguration}
        description={t.platformDescription}
      />
      <CatalogFeedback error={error} success={success} />

      <section className="platform-command" aria-label={t.platformConfiguration}>
        <div className="platform-command-main">
          <p className="eyebrow">{t.configurationMap}</p>
          <h2>{t.configurationMap}</h2>
          <p>{t.configurationMapDescription}</p>
        </div>
        <div className="platform-guardrails">
          <strong>{t.guardrails}</strong>
          <span>{t.guardrailA}</span>
          <span>{t.guardrailB}</span>
          <span>{t.guardrailC}</span>
        </div>
      </section>

      <BentoGrid compact>
        <MetricCard
          accent
          label={t.settings}
          value={number(snapshot.settings.length, locale)}
          detail={`${number(activeSettings, locale)} ${t.active}`}
        />
        <MetricCard
          label={t.notifications}
          value={number(snapshot.notificationTemplates.length, locale)}
          detail={t.inAppTemplates}
        />
        <MetricCard
          label={t.pdfTemplates}
          value={number(snapshot.pdfTemplates.length, locale)}
          detail={t.documentOutputs}
        />
        <MetricCard
          label={t.workflows}
          value={number(snapshot.workflows.length, locale)}
          detail={t.checklistFoundations}
        />
        <MetricCard
          label={t.configurationReadiness}
          value={`${number(configuredReadiness, locale)}/${number(readiness.length, locale)}`}
          detail={t.configured}
        />
      </BentoGrid>

      <ControlDeck title={t.configurationMap} description={t.configurationMapDescription}>
        <ControlTile
          href="#platform-settings"
          meta="01"
          title={t.settings}
          description={t.settingsDescription}
        />
        <ControlTile
          href="#notification-templates"
          meta="02"
          title={t.notifications}
          description={t.notificationsDescription}
        />
        <ControlTile
          href="#pdf-templates"
          meta="03"
          title={t.pdfTemplates}
          description={t.pdfDescription}
        />
        <ControlTile
          href="#localization-labels"
          meta="04"
          title={t.localization}
          description={t.localizationDescription}
        />
        <ControlTile
          href="#workflow-templates"
          meta="05"
          title={t.workflows}
          description={t.workflowDescription}
        />
        <ControlTile
          href="#configuration-readiness"
          meta="06"
          title={t.configurationReadiness}
          description={t.configurationReadinessDescription}
        />
      </ControlDeck>

      <SectionCard
        id="configuration-readiness"
        eyebrow={t.configurationMap}
        title={t.configurationReadiness}
        description={t.configurationReadinessDescription}
      >
        <div className="platform-readiness-grid">
          {readiness.map((requirement) => (
            <ReadinessCard
              key={requirement.area}
              configuredLabel={t.configured}
              missingLabel={t.missingSetting}
              nextActionLabel={t.nextAction}
              requirement={requirement}
              settingKeysLabel={t.settingKeys}
              settings={snapshot.settings}
            />
          ))}
        </div>
      </SectionCard>

      <SectionCard id="platform-settings" eyebrow={t.settingsRegistry} title={t.createSetting}>
        <form className="catalog-form wide-form platform-create-form" onSubmit={createSetting}>
          <label>
            {t.key}
            <input name="key" required placeholder="business_text.new_template" />
          </label>
          <label>
            {t.category}
            <input name="category" required placeholder="business_text" />
          </label>
          <label>
            {t.type}
            <select name="valueType" defaultValue="STRING">
              {snapshot.settingValueTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="full-span">
            {t.initialValue}
            <textarea name="value" rows={3} required />
          </label>
          <div className="form-actions">
            <button type="submit" className="os-button os-button-primary">
              {t.addSetting}
            </button>
          </div>
        </form>
      </SectionCard>

      {settingsByCategory.map(([category, settings]) => (
        <SectionCard
          key={category}
          title={`${settingCategoryLabel(category, locale)} ${t.settings}`}
          description={t.settingsSectionDescription}
        >
          <div className="platform-card-grid">
            {settings.map((setting) => (
              <SettingCard
                key={setting.id}
                locale={locale}
                onError={onError}
                onSaved={onSaved}
                setting={setting}
              />
            ))}
          </div>
        </SectionCard>
      ))}

      <SectionCard
        id="notification-templates"
        title={locale === "ar" ? "قوالب التنبيهات" : "Notification templates"}
        description={t.notificationsDescription}
      >
        <div className="platform-card-grid">
          {snapshot.notificationTemplates.map((template) => (
            <NotificationCard
              key={template.id}
              locale={locale}
              onError={onError}
              onSaved={onSaved}
              template={template}
            />
          ))}
        </div>
      </SectionCard>

      <SectionCard id="pdf-templates" title={t.pdfSettings} description={t.pdfDescription}>
        <div className="platform-card-grid">
          {snapshot.pdfTemplates.map((template) => (
            <PdfCard
              key={template.id}
              locale={locale}
              onError={onError}
              onSaved={onSaved}
              template={template}
            />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        id="localization-labels"
        title={t.localizationLabels}
        description={t.labelsDescription}
      >
        <form className="catalog-form wide-form platform-create-form" onSubmit={publishLabel}>
          <label>
            {t.key}
            <input name="key" required placeholder="common.save" />
          </label>
          <label>
            {t.namespace}
            <input name="namespace" required defaultValue="common" />
          </label>
          <label>
            {t.locale}
            <select name="locale" defaultValue="ar">
              <option value="ar">{t.arabic}</option>
              <option value="en">{t.english}</option>
            </select>
          </label>
          <label>
            {t.description}
            <input name="description" />
          </label>
          <label className="full-span">
            {t.value}
            <textarea name="value" rows={2} required />
          </label>
          <div className="form-actions">
            <button type="submit" className="os-button os-button-primary">
              {t.publishLabel}
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        id="workflow-templates"
        title={t.workflowTemplates}
        description={t.workflowDescription}
      >
        <div className="platform-card-grid">
          {snapshot.workflows.map((workflow) => (
            <WorkflowCard
              key={workflow.id}
              locale={locale}
              onError={onError}
              onSaved={onSaved}
              workflow={workflow}
            />
          ))}
        </div>
      </SectionCard>
    </>
  );
}
