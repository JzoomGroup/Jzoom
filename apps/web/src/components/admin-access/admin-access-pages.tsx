"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import {
  adminAccessErrorMessage,
  createOperatingUser,
  fetchAdminUsersSnapshot,
  resetOperatingUserPassword,
  updateOperatingUserScope,
  type CreateOperatingUserPayload,
  type OperatingUserScopePayload,
} from "../../lib/admin-access-client";
import {
  BentoGrid,
  EmptyState,
  MetricCard,
  PageHeader,
  SectionCard,
  StatusChip,
} from "../premium-os";
import type {
  AdminAccessPermission,
  AdminAccessRole,
  AdminAccessSetup,
  AdminAccessUser,
  AdminAuditLog,
} from "../../lib/admin-access-types";
import { normalizeLocale, type SupportedLocale } from "../../lib/i18n";

const copy = {
  ar: {
    access: "إدارة الوصول",
    accessCenter: "مركز التحكم بالوصول",
    accessCenterDescription:
      "إدارة المستخدمين والأدوار والصلاحيات كنظام واضح ومنظم، مع إبقاء أسرار الدخول خارج الواجهة.",
    active: "نشط",
    actor: "المستخدم",
    allEvents: "كل الأحداث",
    allSeverities: "كل مستويات الخطورة",
    archived: "مؤرشف",
    assignments: "التعيينات",
    auditCenter: "مركز مراجعة الأمان",
    auditCenterDescription:
      "راجع الأحداث الحساسة بسرعة: محاولات الوصول، تغييرات الصلاحيات، وسجلات العمليات التي تحتاج متابعة.",
    auditEntity: "سجل مرتبط",
    auditTrail: "مسار التدقيق",
    auditDescription:
      "أحداث الدخول والصلاحيات والعمليات الحساسة المسجلة في النظام للمراجعة والرقابة.",
    auditCategoryFilter: "تصنيف الحدث",
    auditEventFilter: "نوع الحدث",
    auditFilters: "فلاتر سجل التدقيق",
    auditLogs: "سجل التدقيق",
    auditSearch: "بحث بالمستخدم أو الحدث أو السجل",
    authentication: "الدخول والحسابات",
    capabilities: "القدرات",
    catalogChanges: "تغييرات الكتالوج",
    clientScopes: "نطاقات العملاء",
    code: "المعرف",
    commercialRecords: "السجلات التجارية",
    critical: "حرج",
    customRoles: "أدوار مخصصة",
    disabled: "معطل",
    email: "البريد",
    eventDetails: "تفاصيل الحدث",
    emptyAudit: "لا توجد أحداث تدقيق مسجلة.",
    emptyPermissions: "لا توجد صلاحيات معرفة.",
    emptyRoles: "لا توجد أدوار معرفة.",
    emptyUsers: "لا يوجد مستخدمون.",
    entity: "الكيان",
    event: "الحدث",
    expires: "ينتهي",
    external: "خارجي",
    filteredResults: "النتائج المعروضة",
    high: "مرتفع",
    inherited: "موروثة من الدور",
    internal: "داخلي",
    invited: "مدعو",
    latestEvent: "آخر حدث",
    lastLogin: "آخر دخول",
    locked: "مقفل مؤقتًا",
    lockedUsers: "مقفل مؤقتًا",
    low: "منخفض",
    medium: "متوسط",
    module: "الوحدة",
    moduleCoverage: "تغطية الوحدات",
    never: "لم يسجل",
    noActor: "نظام / غير محدد",
    noAssignments: "لا توجد تعيينات محددة",
    noCapabilities: "لا توجد قدرات موثقة",
    noFilteredAudit: "لا توجد أحداث مطابقة للفلاتر الحالية.",
    noOverrides: "لا توجد صلاحيات مخصصة",
    noRestrictions: "لا توجد قيود موثقة",
    overrides: "استثناءات الصلاحيات",
    permissions: "الصلاحيات",
    permissionsDescription:
      "الصلاحيات التشغيلية مجمعة حسب الوحدة مع حالة كل صلاحية، الإجراء المرتبط بها، وأي قاعدة نطاق ظاهرة.",
    permissionMap: "خريطة الصلاحيات",
    portalUsers: "مستخدمو البوابة",
    reason: "السبب",
    requestLink: "الطلب المرتبط",
    restrictions: "القيود",
    roles: "الأدوار",
    rolesDescription: "ملفات الأدوار والنطاقات وعدد المستخدمين والصلاحيات المرتبطة بكل دور.",
    scopes: "النطاقات",
    security: "الأمان",
    securityNotes: "ملاحظات الأمان",
    severity: "الخطورة",
    sensitiveEvents: "أحداث حساسة",
    status: "الحالة",
    systemRole: "دور نظام",
    total: "الإجمالي",
    type: "النوع",
    unauthorized: "محاولات منع الوصول",
    unknown: "غير محدد",
    usersDescription:
      "عرض مستخدمي البوابة مع أدوارهم ونطاقاتهم وتعييناتهم بدون كشف كلمات المرور أو أسرار الدخول.",
    usersWithOverrides: "صلاحيات مخصصة",
    viewAuditLogs: "عرض سجل التدقيق",
    viewPermissions: "عرض الصلاحيات",
    viewRoles: "عرض الأدوار",
    viewUsers: "عرض المستخدمين",
    when: "الوقت",
  },
  en: {
    access: "Access management",
    accessCenter: "Access control center",
    accessCenterDescription:
      "Manage users, roles, and permissions as a clear operating system while keeping login secrets out of the interface.",
    active: "Active",
    actor: "Actor",
    allEvents: "All events",
    allSeverities: "All severities",
    archived: "Archived",
    assignments: "Assignments",
    auditCenter: "Security review center",
    auditCenterDescription:
      "Review sensitive activity quickly: access attempts, permission changes, and operational records that need follow-up.",
    auditEntity: "Linked record",
    auditTrail: "Audit trail",
    auditDescription:
      "Login, permission, and sensitive operation events recorded for review and control.",
    auditCategoryFilter: "Event category",
    auditEventFilter: "Event type",
    auditFilters: "Audit filters",
    auditLogs: "Audit logs",
    auditSearch: "Search actor, event, or record",
    authentication: "Authentication",
    capabilities: "Capabilities",
    catalogChanges: "Catalog changes",
    clientScopes: "Client scopes",
    code: "Code",
    commercialRecords: "Commercial records",
    critical: "Critical",
    customRoles: "Custom roles",
    disabled: "Disabled",
    email: "Email",
    eventDetails: "Event details",
    emptyAudit: "No audit events are recorded.",
    emptyPermissions: "No permissions are defined.",
    emptyRoles: "No roles are defined.",
    emptyUsers: "No users exist.",
    entity: "Entity",
    event: "Event",
    expires: "Expires",
    external: "External",
    filteredResults: "Visible results",
    high: "High",
    inherited: "Inherited from role",
    internal: "Internal",
    invited: "Invited",
    latestEvent: "Latest event",
    lastLogin: "Last login",
    locked: "Temporarily locked",
    lockedUsers: "Temporarily locked",
    low: "Low",
    medium: "Medium",
    module: "Module",
    moduleCoverage: "Module coverage",
    never: "Never",
    noActor: "System / unknown",
    noAssignments: "No scoped assignments",
    noCapabilities: "No documented capabilities",
    noFilteredAudit: "No audit events match the current filters.",
    noOverrides: "No custom permissions",
    noRestrictions: "No documented restrictions",
    overrides: "Permission overrides",
    permissions: "Permissions",
    permissionsDescription:
      "Operational permissions grouped by module with each permission status, action, and visible scope rule.",
    permissionMap: "Permission map",
    portalUsers: "Portal users",
    reason: "Reason",
    requestLink: "Linked request",
    restrictions: "Restrictions",
    roles: "Roles",
    rolesDescription: "Role profiles, scopes, user counts, and assigned permissions.",
    scopes: "Scopes",
    security: "Security",
    securityNotes: "Security notes",
    severity: "Severity",
    sensitiveEvents: "Sensitive events",
    status: "Status",
    systemRole: "System role",
    total: "Total",
    type: "Type",
    unauthorized: "Denied access attempts",
    unknown: "Unknown",
    usersDescription:
      "Review portal users with roles, scopes, and assignments without exposing passwords or login secrets.",
    usersWithOverrides: "Custom permissions",
    viewAuditLogs: "View audit logs",
    viewPermissions: "View permissions",
    viewRoles: "View roles",
    viewUsers: "View users",
    when: "When",
  },
} as const;

function language(locale: string): SupportedLocale {
  return normalizeLocale(locale);
}

function date(value: string | null, locale: SupportedLocale, fallback: string): string {
  if (!value) return fallback;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function number(value: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-SA").format(value);
}

function roleLabel(
  role: Pick<AdminAccessRole, "name" | "nameAr" | "nameEn">,
  locale: SupportedLocale,
) {
  return locale === "ar" ? (role.nameAr ?? role.name) : (role.nameEn ?? role.name);
}

function formatCode(value: string | null | undefined, locale: SupportedLocale = "en"): string {
  if (!value) return "-";
  if (locale === "ar") {
    const labels: Record<string, string> = {
      ACCESS: "الوصول",
      ACCOUNT_MANAGER: "مدير الحساب",
      ADMIN_ONLY: "الأدمن فقط",
      ALLOW: "سماح",
      APPROVE: "اعتماد",
      AUDIT: "التدقيق",
      CLIENT: "العميل",
      CLIENTS: "العملاء",
      CLIENT_SCOPED: "حسب العميل",
      CREATE: "إنشاء",
      DELETE: "حذف",
      DENY: "منع",
      DOMAIN: "النطاق",
      EXPORT: "تصدير",
      GLOBAL: "عام",
      IMPORT: "استيراد",
      MANAGE: "إدارة",
      MANAGE_USERS: "إدارة المستخدمين",
      MODIFY_USER_PERMISSIONS: "تعديل صلاحيات المستخدمين",
      READ: "عرض",
      REPORTS: "التقارير",
      REQUESTS: "الطلبات",
      SECURITY: "الأمان",
      SETTINGS: "الإعدادات",
      TEAM: "الفريق",
      TEAM_SCOPED: "حسب الفريق",
      UPDATE: "تحديث",
      VIEW: "عرض",
      WRITE: "تعديل",
    };
    const normalized = value
      .replace(/^PERM-/i, "")
      .replace(/^ROLE-/i, "")
      .replace(/[-\s]+/g, "_")
      .toUpperCase();
    if (labels[normalized]) return labels[normalized];
  }
  return value
    .replace(/^PERM-/i, "")
    .replace(/^ROLE-/i, "")
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function localizedAdminText(
  value: string | null | undefined,
  locale: SupportedLocale,
  fallback: string,
): string {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  if (locale === "en" || /[\u0600-\u06ff]/.test(trimmed)) return trimmed;
  const labels: Record<string, string> = {
    "can manage access records": "إدارة سجلات الوصول",
    "full platform administration": "إدارة كاملة للمنصة",
    "manage portal users": "إدارة مستخدمي البوابة",
    "missing permission": "صلاحية غير متوفرة",
    "requires admin permission": "يتطلب صلاحية أدمن",
    "temporary qa access": "صلاحية مؤقتة للاختبار",
  };
  return labels[trimmed.toLowerCase().replace(/\s+/g, " ")] ?? fallback;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function isLocked(user: AdminAccessUser): boolean {
  return Boolean(user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now());
}

function userStatus(user: AdminAccessUser): string {
  return isLocked(user) ? "LOCKED" : user.status;
}

function statusLabel(status: string, locale: SupportedLocale): string {
  const t = copy[locale];
  const labels: Record<string, string> = {
    ACTIVE: t.active,
    ARCHIVED: t.archived,
    DISABLED: t.disabled,
    INVITED: t.invited,
    LOCKED: t.locked,
  };
  return labels[status] ?? formatCode(status, locale);
}

function severityLabel(severity: AdminAuditLog["severity"], locale: SupportedLocale): string {
  const t = copy[locale];
  const labels: Record<AdminAuditLog["severity"], string> = {
    CRITICAL: t.critical,
    HIGH: t.high,
    LOW: t.low,
    MEDIUM: t.medium,
  };
  return labels[severity];
}

function eventLabel(eventCode: string, locale: SupportedLocale): string {
  const labels: Record<string, Record<SupportedLocale, string>> = {
    AUTH_INVITATION_ACCEPTED: { ar: "قبول دعوة مستخدم", en: "Invitation accepted" },
    AUTH_LOGIN_FAILED: { ar: "محاولة دخول فاشلة", en: "Failed login attempt" },
    AUTH_LOGIN_SUCCEEDED: { ar: "تسجيل دخول ناجح", en: "Successful login" },
    AUTH_LOGOUT: { ar: "تسجيل خروج", en: "Sign out" },
    AUTH_PASSWORD_CHANGED: { ar: "تغيير كلمة المرور", en: "Password changed" },
    AUTH_PASSWORD_RESET_COMPLETED: {
      ar: "إتمام إعادة تعيين كلمة المرور",
      en: "Password reset completed",
    },
    AUTH_PASSWORD_RESET_REQUESTED: {
      ar: "طلب إعادة تعيين كلمة المرور",
      en: "Password reset requested",
    },
    AUTH_PASSWORD_RESET_TO_DEFAULT: {
      ar: "إعادة كلمة المرور للافتراضية",
      en: "Password reset to default",
    },
    AUTH_PERMISSION_DENIED: { ar: "منع وصول بسبب الصلاحية", en: "Permission denied" },
    AUTH_PROFILE_PREFERENCES_UPDATED: {
      ar: "تحديث تفضيلات الملف الشخصي",
      en: "Profile preferences updated",
    },
    AUTH_ROLE_DENIED: { ar: "منع وصول بسبب الدور", en: "Role denied" },
    AUTH_SCOPE_DENIED: { ar: "منع وصول بسبب النطاق", en: "Scope denied" },
    AUTH_SESSIONS_INVALIDATED: { ar: "إبطال جلسات المستخدم", en: "User sessions invalidated" },
    ACCOUNT_MANAGER_PORTFOLIO_VIEWED: {
      ar: "عرض محفظة مدير الحساب",
      en: "Account manager portfolio viewed",
    },
    CLIENT_MONTHLY_REPORT_INTERNAL_VIEWED: {
      ar: "عرض تقرير شهري داخلي",
      en: "Internal monthly report viewed",
    },
    CLIENT_MONTHLY_REPORT_PREPARED: {
      ar: "تجهيز تقرير شهري",
      en: "Monthly report prepared",
    },
    CLIENT_MONTHLY_REPORT_PUBLISHED: {
      ar: "نشر تقرير شهري",
      en: "Monthly report published",
    },
    CLIENT_MONTHLY_REPORT_VIEWED: {
      ar: "عرض تقرير شهري للعميل",
      en: "Client monthly report viewed",
    },
    HOURS_LEDGER_VIEWED: { ar: "عرض سجل الساعات", en: "Hours ledger viewed" },
    HOURS_CLOSING_FINALIZED: { ar: "إقفال الساعات", en: "Hours closing finalized" },
    HOURS_CLOSING_PREPARED: { ar: "تجهيز إقفال الساعات", en: "Hours closing prepared" },
    HOURS_CLOSING_VIEWED: { ar: "عرض إقفال الساعات", en: "Hours closing viewed" },
    HOURS_USAGE_SUMMARY_VIEWED: { ar: "عرض ملخص استخدام الساعات", en: "Usage summary viewed" },
    INVOICE_CANCELLED: { ar: "إلغاء فاتورة", en: "Invoice cancelled" },
    INVOICE_CREATED: { ar: "إنشاء فاتورة", en: "Invoice created" },
    INVOICE_ISSUED: { ar: "إصدار فاتورة", en: "Invoice issued" },
    INVOICE_PDF_GENERATED: { ar: "توليد PDF للفاتورة", en: "Invoice PDF generated" },
    INVOICE_STATUS_CHANGED: { ar: "تغيير حالة فاتورة", en: "Invoice status changed" },
    INVOICE_VOIDED: { ar: "إبطال فاتورة", en: "Invoice voided" },
    PLATFORM_CONFIGURATION_VIEWED: {
      ar: "عرض إعدادات المنصة",
      en: "Platform configuration viewed",
    },
    PLATFORM_NOTIFICATION_TEMPLATE_REVISED: {
      ar: "تعديل قالب تنبيه",
      en: "Notification template revised",
    },
    PLATFORM_PDF_TEMPLATE_REVISED: { ar: "تعديل قالب PDF", en: "PDF template revised" },
    PLATFORM_SETTING_CREATED: { ar: "إنشاء إعداد منصة", en: "Platform setting created" },
    PLATFORM_SETTING_REVISED: { ar: "تعديل إعداد منصة", en: "Platform setting revised" },
    PLATFORM_TRANSLATIONS_PUBLISHED: { ar: "نشر الترجمات", en: "Translations published" },
    PLATFORM_WORKFLOW_TEMPLATE_REVISED: {
      ar: "تعديل قالب سير عمل",
      en: "Workflow template revised",
    },
    PRICING_DRAFT_ARCHIVED: { ar: "أرشفة مسودة تسعير", en: "Pricing draft archived" },
    PRICING_DRAFT_CREATED: { ar: "إنشاء مسودة تسعير", en: "Pricing draft created" },
    PRICING_DRAFT_UPDATED: { ar: "تحديث مسودة تسعير", en: "Pricing draft updated" },
    PRICING_PREVIEW_CALCULATED: { ar: "حساب معاينة التسعير", en: "Pricing preview calculated" },
    PRICING_RULE_CREATED: { ar: "إنشاء قاعدة تسعير", en: "Pricing rule created" },
    PRICING_RULE_REORDERED: { ar: "إعادة ترتيب قواعد التسعير", en: "Pricing rules reordered" },
    PRICING_RULE_REVISED: { ar: "تعديل قاعدة تسعير", en: "Pricing rule revised" },
    PRICING_RULE_STATUS_CHANGED: {
      ar: "تغيير حالة قاعدة تسعير",
      en: "Pricing rule status changed",
    },
    QUOTE_ACCEPTED: { ar: "قبول عرض سعر", en: "Quote accepted" },
    QUOTE_CANCELLED: { ar: "إلغاء عرض سعر", en: "Quote cancelled" },
    QUOTE_CLIENT_ONBOARDING_COMPLETED: {
      ar: "تفعيل خدمات العميل بعد الدفع",
      en: "Client services activated after payment",
    },
    QUOTE_CREATED: { ar: "إنشاء عرض سعر", en: "Quote created" },
    QUOTE_EXPIRED: { ar: "انتهاء عرض سعر", en: "Quote expired" },
    QUOTE_PDF_GENERATED: { ar: "توليد PDF لعرض السعر", en: "Quote PDF generated" },
    QUOTE_REJECTED: { ar: "رفض عرض سعر", en: "Quote rejected" },
    QUOTE_STATUS_CHANGED: { ar: "تغيير حالة عرض سعر", en: "Quote status changed" },
    REQUEST_FIELD_LIBRARY_CREATED: {
      ar: "إنشاء حقل في مكتبة النماذج",
      en: "Field library created",
    },
    REQUEST_FIELD_LIBRARY_UPDATED: {
      ar: "تعديل حقل في مكتبة النماذج",
      en: "Field library updated",
    },
    REQUEST_TEMPLATE_ACTIVE_VIEWED: {
      ar: "عرض قالب طلب نشط",
      en: "Active request template viewed",
    },
    REQUEST_TEMPLATE_FORM_RESPONSE_SUBMITTED: {
      ar: "إرسال إجابات نموذج طلب",
      en: "Request template form response submitted",
    },
    REQUEST_TEMPLATE_REVISED: { ar: "تعديل قالب طلب", en: "Request template revised" },
    REQUEST_TEMPLATE_SNAPSHOT_VIEWED: {
      ar: "عرض لقطة نماذج الطلبات",
      en: "Request template snapshot viewed",
    },
    REQUEST_TEMPLATE_SUGGESTED_APPLIED: {
      ar: "تطبيق قالب طلب مقترح",
      en: "Suggested request template applied",
    },
    REQUEST_TEMPLATE_VERSION_STATUS_CHANGED: {
      ar: "تغيير حالة نسخة قالب طلب",
      en: "Request template version status changed",
    },
    REQUEST_ASSIGNMENT_CHANGED: { ar: "تغيير إسناد طلب", en: "Request assignment changed" },
    REQUEST_ATTACHMENT_ARCHIVED: { ar: "أرشفة مرفق طلب", en: "Request attachment archived" },
    REQUEST_ATTACHMENT_METADATA_ADDED: { ar: "إضافة مرفق إلى طلب", en: "Request attachment added" },
    REQUEST_CLIENT_COMMENT_ADDED: { ar: "إضافة تعليق عميل", en: "Client comment added" },
    REQUEST_CLIENT_DOCUMENT_REQUEST_CANCELLED: {
      ar: "إلغاء طلب مستند من العميل",
      en: "Client document request cancelled",
    },
    REQUEST_CLIENT_DOCUMENT_REQUESTED: {
      ar: "طلب مستند من العميل",
      en: "Client document requested",
    },
    REQUEST_CLIENT_DOCUMENT_UPLOADED: {
      ar: "رفع مستند من العميل",
      en: "Client document uploaded",
    },
    REQUEST_COMMENT_ADDED: { ar: "إضافة تعليق على طلب", en: "Request comment added" },
    REQUEST_CREATED: { ar: "إنشاء طلب", en: "Request created" },
    REQUEST_INTERNAL_NOTE_ADDED: { ar: "إضافة ملاحظة داخلية", en: "Internal note added" },
    REQUEST_OUTPUT_CLOSED: { ar: "إغلاق مخرج طلب", en: "Request output closed" },
    REQUEST_OUTPUT_CLIENT_ACCEPTED: { ar: "قبول العميل للمخرج", en: "Client accepted output" },
    REQUEST_OUTPUT_CLIENT_RETURNED: { ar: "إرجاع العميل للمخرج", en: "Client returned output" },
    REQUEST_OUTPUT_CREATED: { ar: "إنشاء مخرج طلب", en: "Request output created" },
    REQUEST_OUTPUT_REVIEWED: { ar: "مراجعة مخرج طلب", en: "Request output reviewed" },
    REQUEST_OUTPUT_SHARED_WITH_CLIENT: {
      ar: "مشاركة مخرج مع العميل",
      en: "Output shared with client",
    },
    REQUEST_OUTPUT_SUBMITTED: { ar: "إرسال مخرج للمراجعة", en: "Output submitted" },
    REQUEST_OUTPUT_UPDATED: { ar: "تحديث مخرج طلب", en: "Request output updated" },
    REQUEST_STATUS_CHANGED: { ar: "تغيير حالة طلب", en: "Request status changed" },
    REQUEST_TASK_CREATED: { ar: "إنشاء مهمة طلب", en: "Request task created" },
    REQUEST_TASK_UPDATED: { ar: "تحديث مهمة طلب", en: "Request task updated" },
    REQUEST_TIME_ENTRY_CREATED: { ar: "إضافة قيد وقت", en: "Time entry created" },
    REQUEST_TIME_ENTRY_REVIEWED: { ar: "مراجعة قيد وقت", en: "Time entry reviewed" },
    REQUEST_TIME_ENTRY_SUBMITTED: { ar: "إرسال قيد وقت", en: "Time entry submitted" },
    REQUEST_TIME_ENTRY_UPDATED: { ar: "تحديث قيد وقت", en: "Time entry updated" },
  };
  return labels[eventCode]?.[locale] ?? formatCode(eventCode, locale);
}

function auditCategory(log: AdminAuditLog, locale: SupportedLocale): string {
  const t = copy[locale];
  if (log.eventCode.startsWith("AUTH_")) return t.authentication;
  if (log.eventCode.startsWith("CATALOG_") || log.entityType.includes("Service")) {
    return t.catalogChanges;
  }
  if (
    log.eventCode.startsWith("QUOTE_") ||
    log.eventCode.startsWith("INVOICE_") ||
    log.entityType.includes("Quote") ||
    log.entityType.includes("Invoice")
  ) {
    return t.commercialRecords;
  }
  return t.auditTrail;
}

function isDeniedEvent(log: AdminAuditLog): boolean {
  return /DENIED|FAILED|INVALID/i.test(log.eventCode);
}

function userTypeLabel(userType: AdminAccessUser["userType"], locale: SupportedLocale): string {
  return userType === "INTERNAL" ? copy[locale].internal : copy[locale].external;
}

function scopesLabel(user: AdminAccessUser, locale: SupportedLocale): string {
  const t = copy[locale];
  if (user.clientAssignments.length > 0) {
    return user.clientAssignments
      .map((assignment) => `${assignment.client.code} - ${assignment.client.name}`)
      .join(", ");
  }
  if (user.scopes.length > 0) {
    return user.scopes
      .map((scope) => scope.client?.code ?? scope.teamCode ?? scope.domain ?? scope.scopeType)
      .join(", ");
  }
  return t.noAssignments;
}

function permissionLabel(
  permission: Pick<AdminAccessPermission, "code" | "name">,
  locale: SupportedLocale,
): string {
  if (locale === "ar") {
    const labels: Record<string, string> = {
      "PERM-MANAGE-CLIENTS": "إدارة العملاء",
      "PERM-MANAGE-INVOICES": "إدارة الفواتير",
      "PERM-MANAGE-PLATFORM-CONFIGURATION": "إدارة إعدادات المنصة",
      "PERM-MANAGE-PRICING-RULES": "إدارة قواعد التسعير",
      "PERM-MANAGE-QUOTES": "إدارة عروض الأسعار",
      "PERM-MANAGE-REQUEST-TEMPLATES": "إدارة نماذج الطلبات",
      "PERM-MANAGE-USERS": "إدارة المستخدمين",
      "PERM-MODIFY-USER-PERMISSIONS": "تعديل صلاحيات المستخدمين",
      "PERM-USE-PRICING-STUDIO": "استخدام استوديو التسعير",
    };
    return labels[permission.code] ?? formatCode(permission.code, locale);
  }
  return permission.name || formatCode(permission.code, locale);
}

function moduleGroups(permissions: AdminAccessPermission[]) {
  return permissions.reduce<Record<string, AdminAccessPermission[]>>((groups, permission) => {
    groups[permission.module] = [...(groups[permission.module] ?? []), permission];
    return groups;
  }, {});
}

function AccessNav({ locale }: { locale: SupportedLocale }) {
  const t = copy[locale];
  return (
    <nav className="access-inline-nav" aria-label={t.access}>
      <Link href="/admin/users">{t.viewUsers}</Link>
      <Link href="/admin/roles">{t.viewRoles}</Link>
      <Link href="/admin/permissions">{t.viewPermissions}</Link>
      <Link href="/admin/audit-logs">{t.viewAuditLogs}</Link>
    </nav>
  );
}

const emptySetup: AdminAccessSetup = {
  clients: [],
  roles: [],
  monthlyServices: [],
  serviceItems: [],
  oneTimeServices: [],
};

const operatingRoleLabels: Record<string, Record<SupportedLocale, string>> = {
  "ROLE-ADMIN": { ar: "أدمن", en: "Admin" },
  "ROLE-AM": { ar: "مدير حساب", en: "Account Manager" },
  "ROLE-MGMT": { ar: "الإدارة", en: "Management" },
  "ROLE-SPECIALIST": { ar: "مختص", en: "Specialist" },
  "ROLE-SUPERVISOR": { ar: "مشرف", en: "Supervisor" },
};

function hasRole(user: AdminAccessUser, roleCode: string): boolean {
  return user.roles.some((role) => role.code === roleCode);
}

function operatingRoleLabel(roleCode: string, locale: SupportedLocale): string {
  return operatingRoleLabels[roleCode]?.[locale] ?? formatCode(roleCode, locale);
}

function serviceLabel(
  value: { code: string; nameAr: string; nameEn: string },
  locale: SupportedLocale,
): string {
  const name = locale === "ar" ? value.nameAr : value.nameEn;
  return `${name || value.code} (${value.code})`;
}

function toggleValue(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function primaryOperatingRoleCode(user: AdminAccessUser): string | null {
  return user.roles.find((role) => Boolean(operatingRoleLabels[role.code]))?.code ?? null;
}

function emptyOperatingUserForm(): CreateOperatingUserPayload {
  return {
    clientIds: [],
    displayName: "",
    email: "",
    monthlyServiceIds: [],
    oneTimeServiceIds: [],
    roleCode: "ROLE-SPECIALIST",
    serviceItemIds: [],
    specialistIds: [],
  };
}

function operatingFormFromUser(user: AdminAccessUser): CreateOperatingUserPayload {
  const roleCode = primaryOperatingRoleCode(user) ?? "ROLE-SPECIALIST";
  return {
    clientIds: uniqueStrings([
      ...user.clientAssignments.map((assignment) => assignment.client.id),
      ...user.specialistServiceScopes.map((scope) => scope.client?.id),
      ...user.assignedSupervisors.map((assignment) => assignment.client?.id),
      ...user.supervisedSpecialists.map((assignment) => assignment.client?.id),
      ...user.scopes.map((scope) => scope.client?.id),
    ]),
    displayName: user.displayName,
    email: user.email,
    monthlyServiceIds: uniqueStrings(
      user.specialistServiceScopes.map((scope) => scope.monthlyService?.id),
    ),
    oneTimeServiceIds: uniqueStrings(
      user.specialistServiceScopes.map((scope) => scope.oneTimeService?.id),
    ),
    roleCode,
    serviceItemIds: uniqueStrings(
      user.specialistServiceScopes.map((scope) => scope.serviceItem?.id),
    ),
    specialistIds: uniqueStrings(
      user.supervisedSpecialists.map((assignment) => assignment.specialist.id),
    ),
    supervisorId: user.assignedSupervisors[0]?.supervisor.id,
  };
}

function scopePayloadFromForm(
  form: CreateOperatingUserPayload,
  roleCode: string,
): OperatingUserScopePayload {
  return {
    clientIds: form.clientIds,
    monthlyServiceIds: roleCode === "ROLE-SPECIALIST" ? form.monthlyServiceIds : [],
    oneTimeServiceIds: roleCode === "ROLE-SPECIALIST" ? form.oneTimeServiceIds : [],
    serviceItemIds: roleCode === "ROLE-SPECIALIST" ? form.serviceItemIds : [],
    specialistIds: roleCode === "ROLE-SUPERVISOR" ? form.specialistIds : [],
    ...(roleCode === "ROLE-SPECIALIST" && form.supervisorId
      ? { supervisorId: form.supervisorId }
      : {}),
  };
}

function operatingScopeLabels(user: AdminAccessUser, locale: SupportedLocale): string[] {
  const labels: string[] = [];
  for (const assignment of user.clientAssignments) {
    labels.push(`${assignment.client.name} (${assignment.roleCode})`);
  }
  for (const scope of user.specialistServiceScopes) {
    const client = scope.client ? `${scope.client.name} / ` : "";
    if (scope.serviceItem) {
      labels.push(`${client}${serviceLabel(scope.serviceItem, locale)}`);
    } else if (scope.monthlyService) {
      labels.push(`${client}${serviceLabel(scope.monthlyService, locale)}`);
    } else if (scope.oneTimeService) {
      labels.push(`${client}${serviceLabel(scope.oneTimeService, locale)}`);
    }
  }
  for (const assignment of user.assignedSupervisors) {
    labels.push(
      locale === "ar"
        ? `مشرف: ${assignment.supervisor.displayName}`
        : `Supervisor: ${assignment.supervisor.displayName}`,
    );
  }
  for (const assignment of user.supervisedSpecialists) {
    labels.push(
      locale === "ar"
        ? `مختص: ${assignment.specialist.displayName}`
        : `Specialist: ${assignment.specialist.displayName}`,
    );
  }
  return labels;
}

export function AdminUsersPageContent({
  locale,
  setup = emptySetup,
  users,
}: {
  locale: string;
  setup?: AdminAccessSetup;
  users: AdminAccessUser[];
}) {
  const lang = language(locale);
  const t = copy[lang];
  const [currentUsers, setCurrentUsers] = useState(users);
  const [currentSetup, setCurrentSetup] = useState(setup);
  const [showCreator, setShowCreator] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateOperatingUserPayload>(emptyOperatingUserForm);
  const [saving, setSaving] = useState(false);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );
  const isEditingScope = editingUserId !== null;
  const activeUsers = currentUsers.filter(
    (user) => user.status === "ACTIVE" && !isLocked(user),
  ).length;
  const disabledUsers = currentUsers.filter((user) => user.status !== "ACTIVE").length;
  const lockedUsers = currentUsers.filter(isLocked).length;
  const usersWithOverrides = currentUsers.filter(
    (user) => user.permissionOverrides.length > 0,
  ).length;
  const specialists = useMemo(
    () => currentUsers.filter((user) => hasRole(user, "ROLE-SPECIALIST")),
    [currentUsers],
  );
  const supervisors = useMemo(
    () => currentUsers.filter((user) => hasRole(user, "ROLE-SUPERVISOR")),
    [currentUsers],
  );
  const selectedMonthlyServiceIds = new Set(form.monthlyServiceIds);
  const visibleServiceItems = currentSetup.serviceItems.filter(
    (item) =>
      form.monthlyServiceIds.length === 0 || selectedMonthlyServiceIds.has(item.monthlyServiceId),
  );

  function closeOperatingForm() {
    setShowCreator(false);
    setEditingUserId(null);
    setForm(emptyOperatingUserForm());
  }

  function openCreateForm() {
    setEditingUserId(null);
    setForm(emptyOperatingUserForm());
    setShowCreator(true);
    setFeedback(null);
  }

  function openScopeEditor(user: AdminAccessUser) {
    if (!primaryOperatingRoleCode(user)) {
      return;
    }
    setEditingUserId(user.id);
    setForm(operatingFormFromUser(user));
    setShowCreator(true);
    setFeedback(null);
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      if (editingUserId) {
        await updateOperatingUserScope(editingUserId, scopePayloadFromForm(form, form.roleCode));
        const snapshot = await fetchAdminUsersSnapshot();
        setCurrentUsers(snapshot.users);
        setCurrentSetup(snapshot.setup);
        closeOperatingForm();
        setFeedback({
          type: "success",
          text:
            lang === "ar"
              ? "تم تحديث نطاق المستخدم التشغيلي بنجاح."
              : "Operating user scope updated successfully.",
        });
        return;
      }

      const payload: CreateOperatingUserPayload = {
        ...form,
        displayName: form.displayName.trim(),
        email: form.email.trim().toLowerCase(),
        ...scopePayloadFromForm(form, form.roleCode),
        ...(form.roleCode === "ROLE-SPECIALIST" && form.supervisorId
          ? { supervisorId: form.supervisorId }
          : {}),
      };
      const response = await createOperatingUser(payload);
      setCurrentUsers(response.snapshot.users);
      setCurrentSetup(response.snapshot.setup);
      closeOperatingForm();
      setFeedback({
        type: "success",
        text:
          lang === "ar"
            ? "تم إنشاء المستخدم التشغيلي وربط نطاقه بنجاح."
            : "Operating user created with the default temporary password. They must change it at first sign-in.",
      });
    } catch (error) {
      setFeedback({ type: "error", text: adminAccessErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword(user: AdminAccessUser) {
    const message =
      lang === "ar"
        ? `هل تريد إعادة كلمة مرور ${user.displayName} إلى كلمة المرور الافتراضية؟ سيُطلب منه تغييرها عند الدخول.`
        : `Reset ${user.displayName}'s password to the default temporary password? They will be required to change it at sign-in.`;
    if (!window.confirm(message)) {
      return;
    }

    setResettingUserId(user.id);
    setFeedback(null);
    try {
      await resetOperatingUserPassword(user.id);
      setCurrentUsers((users) =>
        users.map((currentUser) =>
          currentUser.id === user.id
            ? {
                ...currentUser,
                lockedUntil: null,
                mustChangePassword: true,
                status: "ACTIVE",
                sessionVersion: currentUser.sessionVersion + 1,
              }
            : currentUser,
        ),
      );
      setFeedback({
        type: "success",
        text:
          lang === "ar"
            ? "تمت إعادة كلمة المرور إلى الافتراضية. سيُطلب من المستخدم تغييرها عند الدخول."
            : "Password reset to the default temporary password. The user must change it at sign-in.",
      });
    } catch (error) {
      setFeedback({ type: "error", text: adminAccessErrorMessage(error) });
    } finally {
      setResettingUserId(null);
    }
  }

  return (
    <>
      <PageHeader eyebrow={t.access} title={t.portalUsers} description={t.usersDescription}>
        <AccessNav locale={lang} />
      </PageHeader>

      <section className="access-command">
        <div className="access-command-main">
          <p className="eyebrow">{t.accessCenter}</p>
          <h2>{t.portalUsers}</h2>
          <p>{t.accessCenterDescription}</p>
        </div>
        <div className="access-command-notes">
          <strong>{t.securityNotes}</strong>
          <span>{t.noOverrides}</span>
          <span>{t.inherited}</span>
          <span>{t.lastLogin}</span>
          <button
            className="button-primary"
            type="button"
            onClick={() => {
              if (showCreator) {
                closeOperatingForm();
              } else {
                openCreateForm();
              }
            }}
          >
            {showCreator
              ? lang === "ar"
                ? "إغلاق نموذج الإنشاء"
                : "Close creator"
              : lang === "ar"
                ? "إضافة مستخدم تشغيلي"
                : "Add operating user"}
          </button>
        </div>
      </section>

      {feedback ? (
        <div className={`access-feedback ${feedback.type}`} role="status">
          {feedback.text}
        </div>
      ) : null}

      {showCreator ? (
        <SectionCard
          title={
            isEditingScope
              ? lang === "ar"
                ? "تعديل نطاق مستخدم تشغيلي"
                : "Edit operating user scope"
              : lang === "ar"
                ? "إنشاء مستخدم تشغيلي"
                : "Create operating user"
          }
          eyebrow={lang === "ar" ? "نطاق العمل" : "Operating scope"}
        >
          <form className="operating-user-form" onSubmit={handleCreateUser}>
            <div className="operating-user-grid">
              <label>
                <span>{lang === "ar" ? "الاسم" : "Name"}</span>
                <input
                  required
                  minLength={2}
                  value={form.displayName}
                  disabled={isEditingScope}
                  onChange={(event) => setForm({ ...form, displayName: event.target.value })}
                />
              </label>
              <label>
                <span>{lang === "ar" ? "البريد الإلكتروني" : "Email"}</span>
                <input
                  required
                  type="email"
                  value={form.email}
                  disabled={isEditingScope}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                />
              </label>
              <label>
                <span>{lang === "ar" ? "الدور" : "Role"}</span>
                <select
                  value={form.roleCode}
                  disabled={isEditingScope}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      roleCode: event.target.value,
                      monthlyServiceIds: [],
                      oneTimeServiceIds: [],
                      serviceItemIds: [],
                      specialistIds: [],
                      supervisorId: undefined,
                    })
                  }
                >
                  {currentSetup.roles.map((role) => (
                    <option key={role.code} value={role.code}>
                      {operatingRoleLabel(role.code, lang)}
                    </option>
                  ))}
                </select>
              </label>
              {form.roleCode === "ROLE-SPECIALIST" ? (
                <label>
                  <span>{lang === "ar" ? "المشرف المسؤول" : "Supervisor"}</span>
                  <select
                    value={form.supervisorId ?? ""}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        supervisorId: event.target.value || undefined,
                      })
                    }
                  >
                    <option value="">{lang === "ar" ? "بدون مشرف محدد" : "No supervisor"}</option>
                    {supervisors.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.displayName} - {user.email}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>

            <div className="operating-scope-grid">
              <fieldset>
                <legend>{lang === "ar" ? "العملاء" : "Clients"}</legend>
                <p>
                  {lang === "ar"
                    ? "اختيار العملاء يضيق النطاق. تركها فارغة يجعل النطاق عامًا حسب الدور."
                    : "Selecting clients narrows the scope. Leaving it empty keeps the role-wide scope."}
                </p>
                <div className="scope-picker-grid">
                  {currentSetup.clients.map((client) => (
                    <label key={client.id}>
                      <input
                        type="checkbox"
                        checked={form.clientIds.includes(client.id)}
                        onChange={() =>
                          setForm({ ...form, clientIds: toggleValue(form.clientIds, client.id) })
                        }
                      />
                      <span>
                        {client.name}
                        <small>{client.code}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {form.roleCode === "ROLE-SPECIALIST" ? (
                <>
                  <fieldset>
                    <legend>{lang === "ar" ? "الخدمات الشهرية" : "Monthly services"}</legend>
                    <p>
                      {lang === "ar"
                        ? "يستخدمها النظام لاختيار المختص عند إنشاء طلب على الخدمة."
                        : "Used to route new requests for this service to the specialist."}
                    </p>
                    <div className="scope-picker-grid">
                      {currentSetup.monthlyServices.map((service) => (
                        <label key={service.id}>
                          <input
                            type="checkbox"
                            checked={form.monthlyServiceIds.includes(service.id)}
                            onChange={() =>
                              setForm({
                                ...form,
                                monthlyServiceIds: toggleValue(form.monthlyServiceIds, service.id),
                              })
                            }
                          />
                          <span>{serviceLabel(service, lang)}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset>
                    <legend>{lang === "ar" ? "بنود الخدمات" : "Service items"}</legend>
                    <p>
                      {lang === "ar"
                        ? "البند أدق من الخدمة، وله أولوية أعلى في التوزيع التلقائي."
                        : "Items are more specific than services and win auto-assignment priority."}
                    </p>
                    <div className="scope-picker-grid">
                      {visibleServiceItems.map((item) => (
                        <label key={item.id}>
                          <input
                            type="checkbox"
                            checked={form.serviceItemIds.includes(item.id)}
                            onChange={() =>
                              setForm({
                                ...form,
                                serviceItemIds: toggleValue(form.serviceItemIds, item.id),
                              })
                            }
                          />
                          <span>
                            {serviceLabel(item, lang)}
                            <small>{item.monthlyServiceCode}</small>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset>
                    <legend>{lang === "ar" ? "خدمات المرة الواحدة" : "One-time services"}</legend>
                    <p>
                      {lang === "ar"
                        ? "جاهزة لتوسيع توزيع مشاريع وخدمات المرة الواحدة بنفس نموذج النطاق."
                        : "Prepared for one-time service and project routing using the same scope model."}
                    </p>
                    <div className="scope-picker-grid">
                      {currentSetup.oneTimeServices.map((service) => (
                        <label key={service.id}>
                          <input
                            type="checkbox"
                            checked={form.oneTimeServiceIds.includes(service.id)}
                            onChange={() =>
                              setForm({
                                ...form,
                                oneTimeServiceIds: toggleValue(form.oneTimeServiceIds, service.id),
                              })
                            }
                          />
                          <span>{serviceLabel(service, lang)}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </>
              ) : null}

              {form.roleCode === "ROLE-SUPERVISOR" ? (
                <fieldset>
                  <legend>
                    {lang === "ar" ? "المختصون تحت الإشراف" : "Supervised specialists"}
                  </legend>
                  <p>
                    {lang === "ar"
                      ? "اختيار المختصين يربطهم بهذا المشرف، ويمكن تضييق الربط حسب العملاء أعلاه."
                      : "Selected specialists report to this supervisor, optionally narrowed by selected clients."}
                  </p>
                  <div className="scope-picker-grid">
                    {specialists.map((user) => (
                      <label key={user.id}>
                        <input
                          type="checkbox"
                          checked={form.specialistIds.includes(user.id)}
                          onChange={() =>
                            setForm({
                              ...form,
                              specialistIds: toggleValue(form.specialistIds, user.id),
                            })
                          }
                        />
                        <span>
                          {user.displayName}
                          <small>{user.email}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : null}
            </div>

            <div className="operating-user-actions">
              <button className="button-secondary" type="button" onClick={closeOperatingForm}>
                {lang === "ar" ? "إلغاء" : "Cancel"}
              </button>
              <button className="button-primary" type="submit" disabled={saving}>
                {saving
                  ? lang === "ar"
                    ? "جاري الحفظ..."
                    : "Saving..."
                  : isEditingScope
                    ? lang === "ar"
                      ? "حفظ النطاق"
                      : "Save scope"
                    : lang === "ar"
                      ? "إنشاء وربط النطاق"
                      : "Create and scope"}
              </button>
            </div>
          </form>
        </SectionCard>
      ) : null}

      <BentoGrid compact>
        <MetricCard
          accent
          label={t.total}
          value={number(currentUsers.length, lang)}
          detail={t.portalUsers}
        />
        <MetricCard label={t.active} value={number(activeUsers, lang)} detail={t.status} />
        <MetricCard label={t.disabled} value={number(disabledUsers, lang)} detail={t.security} />
        <MetricCard label={t.lockedUsers} value={number(lockedUsers, lang)} detail={t.security} />
        <MetricCard
          label={t.usersWithOverrides}
          value={number(usersWithOverrides, lang)}
          detail={t.permissions}
        />
      </BentoGrid>

      <SectionCard title={t.portalUsers} eyebrow={t.access}>
        {currentUsers.length === 0 ? (
          <EmptyState title={t.emptyUsers}>{t.usersDescription}</EmptyState>
        ) : (
          <div className="access-user-grid">
            {currentUsers.map((user) => (
              <article className="access-user-card" key={user.id}>
                <div className="access-user-top">
                  <span className="access-avatar" aria-hidden="true">
                    {initials(user.displayName)}
                  </span>
                  <div>
                    <h3>{user.displayName}</h3>
                    <p>{user.email}</p>
                  </div>
                  <StatusChip
                    status={userStatus(user)}
                    label={statusLabel(userStatus(user), lang)}
                  />
                </div>

                <dl className="access-definition-grid">
                  <div>
                    <dt>{t.type}</dt>
                    <dd>{userTypeLabel(user.userType, lang)}</dd>
                  </div>
                  <div>
                    <dt>{t.lastLogin}</dt>
                    <dd>{date(user.lastLoginAt, lang, t.never)}</dd>
                  </div>
                  <div>
                    <dt>{t.roles}</dt>
                    <dd>{user.roles.map((role) => roleLabel(role, lang)).join(", ") || "-"}</dd>
                  </div>
                  <div>
                    <dt>{t.scopes}</dt>
                    <dd>{scopesLabel(user, lang)}</dd>
                  </div>
                </dl>

                <div className="access-chip-list">
                  {user.roles.map((role) => (
                    <span key={role.code}>{roleLabel(role, lang)}</span>
                  ))}
                  {user.permissionOverrides.length > 0 ? (
                    <span className="attention">{t.usersWithOverrides}</span>
                  ) : null}
                  {user.mustChangePassword ? (
                    <span className="attention">
                      {lang === "ar" ? "يتطلب تغيير كلمة المرور" : "Password change required"}
                    </span>
                  ) : null}
                </div>

                {operatingScopeLabels(user, lang).length > 0 ? (
                  <div className="operating-scope-summary">
                    <strong>{lang === "ar" ? "نطاق العمل" : "Operating scope"}</strong>
                    <div className="access-chip-list">
                      {operatingScopeLabels(user, lang)
                        .slice(0, 8)
                        .map((label) => (
                          <span key={label}>{label}</span>
                        ))}
                      {operatingScopeLabels(user, lang).length > 8 ? (
                        <span>+{number(operatingScopeLabels(user, lang).length - 8, lang)}</span>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <details className="access-details">
                  <summary>{t.overrides}</summary>
                  {user.permissionOverrides.length === 0 ? (
                    <p>{t.noOverrides}</p>
                  ) : (
                    <div className="access-override-list">
                      {user.permissionOverrides.map((override) => (
                        <article key={`${user.id}-${override.permission.code}-${override.effect}`}>
                          <strong>
                            {formatCode(override.effect, lang)} -{" "}
                            {permissionLabel(override.permission, lang)}
                          </strong>
                          <small>{override.permission.code}</small>
                          <p>{localizedAdminText(override.reason, lang, t.reason)}</p>
                          {override.expiresAt ? (
                            <span>
                              {t.expires}: {date(override.expiresAt, lang, "-")}
                            </span>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  )}
                </details>
                <div className="operating-user-actions">
                  {primaryOperatingRoleCode(user) ? (
                    <button
                      className="button-secondary"
                      type="button"
                      onClick={() => openScopeEditor(user)}
                    >
                      {lang === "ar" ? "تعديل النطاق" : "Edit scope"}
                    </button>
                  ) : null}
                  <button
                    className="button-secondary"
                    type="button"
                    disabled={resettingUserId === user.id}
                    onClick={() => void handleResetPassword(user)}
                  >
                    {resettingUserId === user.id
                      ? lang === "ar"
                        ? "جاري إعادة التعيين..."
                        : "Resetting..."
                      : lang === "ar"
                        ? "إعادة كلمة المرور للافتراضية"
                        : "Reset to default password"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}

export function AdminRolesPageContent({
  locale,
  permissions,
  roles,
}: {
  locale: string;
  permissions: AdminAccessPermission[];
  roles: AdminAccessRole[];
}) {
  const lang = language(locale);
  const t = copy[lang];
  const systemRoles = roles.filter((role) => role.isSystem).length;
  const customRoles = roles.length - systemRoles;

  return (
    <>
      <PageHeader eyebrow={t.access} title={t.roles} description={t.rolesDescription}>
        <AccessNav locale={lang} />
      </PageHeader>

      <section className="access-command">
        <div className="access-command-main">
          <p className="eyebrow">{t.accessCenter}</p>
          <h2>{t.roles}</h2>
          <p>{t.rolesDescription}</p>
        </div>
        <div className="access-command-notes">
          <strong>{t.securityNotes}</strong>
          <span>
            {t.systemRole}: {number(systemRoles, lang)}
          </span>
          <span>
            {t.customRoles}: {number(customRoles, lang)}
          </span>
          <span>
            {t.permissions}: {number(permissions.length, lang)}
          </span>
        </div>
      </section>

      <BentoGrid compact>
        <MetricCard accent label={t.roles} value={number(roles.length, lang)} detail={t.total} />
        <MetricCard
          label={t.permissions}
          value={number(permissions.length, lang)}
          detail={t.access}
        />
        <MetricCard label={t.systemRole} value={number(systemRoles, lang)} detail={t.security} />
        <MetricCard label={t.customRoles} value={number(customRoles, lang)} detail={t.access} />
      </BentoGrid>

      <SectionCard title={t.roles} eyebrow={t.access}>
        {roles.length === 0 ? (
          <EmptyState title={t.emptyRoles}>{t.rolesDescription}</EmptyState>
        ) : (
          <div className="access-role-grid">
            {roles.map((role) => {
              const visiblePermissions = role.permissions.slice(0, 10);
              const hiddenCount = Math.max(role.permissions.length - visiblePermissions.length, 0);
              return (
                <article className="access-role-card" key={role.id}>
                  <div className="access-role-heading">
                    <div>
                      <small>{role.code}</small>
                      <h3>{roleLabel(role, lang)}</h3>
                      {role.description ? (
                        <p>{localizedAdminText(role.description, lang, t.rolesDescription)}</p>
                      ) : null}
                    </div>
                    <StatusChip status={role.status} label={statusLabel(role.status, lang)} />
                  </div>

                  <dl className="access-definition-grid compact">
                    <div>
                      <dt>{t.type}</dt>
                      <dd>{role.userType === "INTERNAL" ? t.internal : t.external}</dd>
                    </div>
                    <div>
                      <dt>{t.portalUsers}</dt>
                      <dd>{number(role.usersCount, lang)}</dd>
                    </div>
                    <div>
                      <dt>{t.permissions}</dt>
                      <dd>{number(role.permissions.length, lang)}</dd>
                    </div>
                    <div>
                      <dt>{t.scopes}</dt>
                      <dd>{formatCode(role.dataScope, lang)}</dd>
                    </div>
                  </dl>

                  <div className="access-notes-grid">
                    <div>
                      <span>{t.capabilities}</span>
                      <p>{localizedAdminText(role.capabilities, lang, t.noCapabilities)}</p>
                    </div>
                    <div>
                      <span>{t.restrictions}</span>
                      <p>{localizedAdminText(role.restrictions, lang, t.noRestrictions)}</p>
                    </div>
                  </div>

                  <div className="access-chip-list">
                    {visiblePermissions.map((permission) => (
                      <span key={permission.code}>{permissionLabel(permission, lang)}</span>
                    ))}
                    {hiddenCount > 0 ? <span>+{number(hiddenCount, lang)}</span> : null}
                    {role.isSystem ? <span className="dark">{t.systemRole}</span> : null}
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

export function AdminPermissionsPageContent({
  locale,
  permissions,
}: {
  locale: string;
  permissions: AdminAccessPermission[];
}) {
  const lang = language(locale);
  const t = copy[lang];
  const grouped = moduleGroups(permissions);
  const activePermissions = permissions.filter(
    (permission) => permission.status === "ACTIVE",
  ).length;

  return (
    <>
      <PageHeader eyebrow={t.access} title={t.permissions} description={t.permissionsDescription}>
        <AccessNav locale={lang} />
      </PageHeader>

      <section className="access-command">
        <div className="access-command-main">
          <p className="eyebrow">{t.permissionMap}</p>
          <h2>{t.permissions}</h2>
          <p>{t.permissionsDescription}</p>
        </div>
        <div className="access-command-notes">
          <strong>{t.securityNotes}</strong>
          <span>
            {t.moduleCoverage}: {number(Object.keys(grouped).length, lang)}
          </span>
          <span>
            {t.active}: {number(activePermissions, lang)}
          </span>
          <span>
            {t.scopes}: {t.noRestrictions}
          </span>
        </div>
      </section>

      <BentoGrid compact>
        <MetricCard
          accent
          label={t.permissions}
          value={number(permissions.length, lang)}
          detail={t.total}
        />
        <MetricCard
          label={t.module}
          value={number(Object.keys(grouped).length, lang)}
          detail={t.moduleCoverage}
        />
        <MetricCard label={t.active} value={number(activePermissions, lang)} detail={t.status} />
      </BentoGrid>

      {permissions.length === 0 ? (
        <SectionCard title={t.permissions}>
          <EmptyState title={t.emptyPermissions}>{t.permissionsDescription}</EmptyState>
        </SectionCard>
      ) : (
        <>
          <SectionCard title={t.moduleCoverage} eyebrow={t.permissions}>
            <div className="access-module-grid">
              {Object.entries(grouped).map(([module, modulePermissions]) => (
                <article className="access-module-card" key={module}>
                  <span>{t.module}</span>
                  <strong>{formatCode(module, lang)}</strong>
                  <small>
                    {number(modulePermissions.length, lang)} {t.permissions}
                  </small>
                </article>
              ))}
            </div>
          </SectionCard>

          {Object.entries(grouped).map(([module, modulePermissions]) => (
            <SectionCard key={module} title={formatCode(module, lang)} eyebrow={t.module}>
              <div className="access-permission-grid">
                {modulePermissions.map((permission) => (
                  <article className="access-permission-card" key={permission.code}>
                    <div>
                      <small>{permission.code}</small>
                      <h3>{permissionLabel(permission, lang)}</h3>
                      {permission.description ? (
                        <p>
                          {localizedAdminText(
                            permission.description,
                            lang,
                            permissionLabel(permission, lang),
                          )}
                        </p>
                      ) : null}
                    </div>
                    <dl className="access-definition-grid compact">
                      <div>
                        <dt>{t.event}</dt>
                        <dd>{formatCode(permission.action, lang)}</dd>
                      </div>
                      <div>
                        <dt>{t.status}</dt>
                        <dd>
                          <StatusChip
                            status={permission.status}
                            label={statusLabel(permission.status, lang)}
                          />
                        </dd>
                      </div>
                      <div>
                        <dt>{t.scopes}</dt>
                        <dd>{formatCode(permission.scopeRule, lang)}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            </SectionCard>
          ))}
        </>
      )}
    </>
  );
}

export function AdminAuditLogsPageContent({
  locale,
  logs,
}: {
  locale: string;
  logs: AdminAuditLog[];
}) {
  const lang = language(locale);
  const t = copy[lang];
  const criticalLogs = logs.filter((log) => log.severity === "CRITICAL");
  const highLogs = logs.filter((log) => log.severity === "HIGH");
  const deniedLogs = logs.filter(isDeniedEvent);
  const sensitiveLogs = logs.filter(
    (log) => log.severity === "CRITICAL" || log.severity === "HIGH",
  );
  const latestLog = logs[0] ?? null;
  const [filters, setFilters] = useState({
    category: "all",
    eventCode: "all",
    query: "",
    severity: "all",
  });
  const eventOptions = useMemo(
    () => Array.from(new Set(logs.map((log) => log.eventCode))).sort(),
    [logs],
  );
  const categoryOptions = useMemo(
    () => Array.from(new Set(logs.map((log) => auditCategory(log, lang)))).sort(),
    [logs, lang],
  );
  const filteredLogs = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return logs.filter((log) => {
      if (filters.severity !== "all" && log.severity !== filters.severity) return false;
      if (filters.eventCode !== "all" && log.eventCode !== filters.eventCode) return false;
      if (filters.category !== "all" && auditCategory(log, lang) !== filters.category) {
        return false;
      }
      if (!query) return true;
      const actor = log.actor ? `${log.actor.displayName} ${log.actor.email}` : "";
      return [
        actor,
        auditCategory(log, lang),
        eventLabel(log.eventCode, lang),
        log.entityId,
        log.entityType,
        log.eventCode,
        log.reason,
        log.requestId,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [filters, lang, logs]);

  return (
    <>
      <PageHeader eyebrow={t.security} title={t.auditLogs} description={t.auditDescription}>
        <AccessNav locale={lang} />
      </PageHeader>

      <section className="access-command access-audit-command">
        <div className="access-command-main">
          <p className="eyebrow">{t.auditCenter}</p>
          <h2>{t.auditTrail}</h2>
          <p>{t.auditCenterDescription}</p>
        </div>
        <div className="access-command-notes access-audit-review">
          <strong>{t.securityNotes}</strong>
          <span>
            {t.unauthorized}: {number(deniedLogs.length, lang)}
          </span>
          <span>
            {t.sensitiveEvents}: {number(sensitiveLogs.length, lang)}
          </span>
          <span>
            {t.latestEvent}: {latestLog ? date(latestLog.occurredAt, lang, "-") : t.never}
          </span>
        </div>
      </section>

      <BentoGrid compact>
        <MetricCard accent label={t.auditLogs} value={number(logs.length, lang)} detail={t.total} />
        <MetricCard
          label={t.critical}
          value={number(criticalLogs.length, lang)}
          detail={t.severity}
        />
        <MetricCard label={t.high} value={number(highLogs.length, lang)} detail={t.severity} />
        <MetricCard
          label={t.unauthorized}
          value={number(deniedLogs.length, lang)}
          detail={t.security}
        />
        <MetricCard
          label={t.sensitiveEvents}
          value={number(sensitiveLogs.length, lang)}
          detail={t.auditTrail}
        />
      </BentoGrid>
      <SectionCard title={t.auditTrail} eyebrow={t.security} description={t.auditDescription}>
        <div className="catalog-form compact">
          <label>
            {t.auditSearch}
            <input
              placeholder={t.auditSearch}
              value={filters.query}
              onChange={(event) => setFilters({ ...filters, query: event.target.value })}
            />
          </label>
          <label>
            {t.severity}
            <select
              value={filters.severity}
              onChange={(event) => setFilters({ ...filters, severity: event.target.value })}
            >
              <option value="all">{t.allSeverities}</option>
              {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((severity) => (
                <option key={severity} value={severity}>
                  {severityLabel(severity, lang)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t.auditCategoryFilter}
            <select
              value={filters.category}
              onChange={(event) => setFilters({ ...filters, category: event.target.value })}
            >
              <option value="all">{t.auditCategoryFilter}</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t.auditEventFilter}
            <select
              value={filters.eventCode}
              onChange={(event) => setFilters({ ...filters, eventCode: event.target.value })}
            >
              <option value="all">{t.allEvents}</option>
              {eventOptions.map((eventCode) => (
                <option key={eventCode} value={eventCode}>
                  {eventLabel(eventCode, lang)}
                </option>
              ))}
            </select>
          </label>
          <p className="eyebrow">
            {t.filteredResults}: {number(filteredLogs.length, lang)} / {number(logs.length, lang)}
          </p>
        </div>
        {logs.length === 0 ? (
          <EmptyState title={t.emptyAudit}>{t.auditDescription}</EmptyState>
        ) : filteredLogs.length === 0 ? (
          <EmptyState title={t.noFilteredAudit}>{t.auditDescription}</EmptyState>
        ) : (
          <div className="access-audit-list">
            {filteredLogs.map((log) => (
              <article
                className={`access-audit-card severity-${log.severity.toLowerCase()}`}
                key={log.id}
              >
                <div className="access-audit-summary">
                  <div>
                    <small>{auditCategory(log, lang)}</small>
                    <h3>{eventLabel(log.eventCode, lang)}</h3>
                  </div>
                  <StatusChip status={log.severity} label={severityLabel(log.severity, lang)} />
                  <span className="access-audit-code">{log.eventCode}</span>
                  {log.reason ? <p>{localizedAdminText(log.reason, lang, t.reason)}</p> : null}
                </div>
                <dl className="access-definition-grid compact">
                  <div>
                    <dt>{t.actor}</dt>
                    <dd>
                      {log.actor ? `${log.actor.displayName} (${log.actor.email})` : t.noActor}
                    </dd>
                  </div>
                  <div>
                    <dt>{t.auditEntity}</dt>
                    <dd>
                      {log.entityType}
                      {log.entityId ? ` / ${log.entityId}` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt>{t.severity}</dt>
                    <dd>
                      <StatusChip status={log.severity} label={severityLabel(log.severity, lang)} />
                    </dd>
                  </div>
                  <div>
                    <dt>{t.when}</dt>
                    <dd>{date(log.occurredAt, lang, "-")}</dd>
                  </div>
                  <div>
                    <dt>{t.requestLink}</dt>
                    <dd>{log.requestId ?? t.unknown}</dd>
                  </div>
                  <div>
                    <dt>{t.reason}</dt>
                    <dd>{localizedAdminText(log.reason, lang, t.unknown)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}
