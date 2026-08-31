import { adminAccessCopy } from "../../i18n/admin-access";
import type {
  AdminAccessPermission,
  AdminAccessRole,
  AdminAccessUser,
  AdminAuditLog,
} from "../../lib/admin-access-types";
import { normalizeLocale, platformTimeZone, type SupportedLocale } from "../../lib/i18n";

export function language(locale: string): SupportedLocale {
  return normalizeLocale(locale);
}

export function date(value: string | null, locale: SupportedLocale, fallback: string): string {
  if (!value) return fallback;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: platformTimeZone,
  }).format(new Date(value));
}

export function number(value: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-SA").format(value);
}

export function roleLabel(
  role: Pick<AdminAccessRole, "code" | "name" | "nameAr" | "nameEn">,
  locale: SupportedLocale,
) {
  if (locale === "ar") {
    const labels: Record<string, string> = {
      "ROLE-ADMIN": "مدير النظام",
      "ROLE-AM": "مدير الحساب",
      "ROLE-CLIENT": "العميل",
      "ROLE-MGMT": "الإدارة",
      "ROLE-PROJECT-SPECIALIST": "مختص مشاريع",
      "ROLE-SPECIALIST": "مختص",
      "ROLE-SUPERVISOR": "مشرف",
    };
    return role.nameAr?.trim() || labels[role.code] || formatCode(role.code, locale);
  }
  return role.nameEn?.trim() || role.name;
}

export function formatCode(
  value: string | null | undefined,
  locale: SupportedLocale = "en",
): string {
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
      SPECIALIST: "مختص",
      PROJECT_SPECIALIST: "مختص مشاريع",
      SUPERVISOR: "مشرف",
      MANAGEMENT: "الإدارة",
      ADMIN: "مدير النظام",
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

export function localizedAdminText(
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

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function isLocked(user: AdminAccessUser): boolean {
  return Boolean(user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now());
}

export function userStatus(user: AdminAccessUser): string {
  return isLocked(user) ? "LOCKED" : user.status;
}

export function statusLabel(status: string, locale: SupportedLocale): string {
  const t = adminAccessCopy[locale];
  const labels: Record<string, string> = {
    ACTIVE: t.active,
    ARCHIVED: t.archived,
    DISABLED: t.disabled,
    INVITED: t.invited,
    LOCKED: t.locked,
  };
  return labels[status] ?? formatCode(status, locale);
}

export function severityLabel(
  severity: AdminAuditLog["severity"],
  locale: SupportedLocale,
): string {
  const t = adminAccessCopy[locale];
  const labels: Record<AdminAuditLog["severity"], string> = {
    CRITICAL: t.critical,
    HIGH: t.high,
    LOW: t.low,
    MEDIUM: t.medium,
  };
  return labels[severity];
}

export function eventLabel(eventCode: string, locale: SupportedLocale): string {
  const labels: Record<string, Record<SupportedLocale, string>> = {
    AUTH_INVITATION_ACCEPTED: { ar: "قبول دعوة مستخدم", en: "Invitation accepted" },
    AUTH_INVITATION_CREATED: { ar: "إنشاء دعوة مستخدم", en: "User invitation created" },
    AUTH_LOGIN_FAILED: { ar: "محاولة دخول فاشلة", en: "Failed login attempt" },
    AUTH_LOGIN_SUCCEEDED: { ar: "تسجيل دخول ناجح", en: "Successful login" },
    AUTH_LOGOUT: { ar: "تسجيل خروج", en: "Sign out" },
    AUTH_OPERATING_USER_CREATED: {
      ar: "إنشاء مستخدم تشغيلي",
      en: "Operating user created",
    },
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
    AUTH_ROLE_PERMISSIONS_CHANGED: {
      ar: "تعديل صلاحيات دور",
      en: "Role permissions changed",
    },
    AUTH_SCOPE_DENIED: { ar: "منع وصول بسبب النطاق", en: "Scope denied" },
    AUTH_SESSIONS_INVALIDATED: { ar: "إبطال جلسات المستخدم", en: "User sessions invalidated" },
    AUTH_USER_OPERATING_SCOPE_CHANGED: {
      ar: "تعديل نطاق عمل المستخدم",
      en: "User operating scope changed",
    },
    AUTH_USER_PERMISSION_OVERRIDES_CHANGED: {
      ar: "تعديل استثناءات صلاحيات المستخدم",
      en: "User permission exceptions changed",
    },
    AUTH_USER_PROFILE_CHANGED: { ar: "تعديل بيانات المستخدم", en: "User profile changed" },
    AUTH_USER_ROLES_CHANGED: { ar: "تعديل أدوار المستخدم", en: "User roles changed" },
    AUTH_USER_STATUS_CHANGED: { ar: "تعديل حالة المستخدم", en: "User status changed" },
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

export function auditCategory(log: AdminAuditLog, locale: SupportedLocale): string {
  const t = adminAccessCopy[locale];
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

export function isDeniedEvent(log: AdminAuditLog): boolean {
  return /DENIED|FAILED|INVALID/i.test(log.eventCode);
}

export function userTypeLabel(
  userType: AdminAccessUser["userType"],
  locale: SupportedLocale,
): string {
  return userType === "INTERNAL"
    ? adminAccessCopy[locale].internal
    : adminAccessCopy[locale].external;
}

export function scopesLabel(user: AdminAccessUser, locale: SupportedLocale): string {
  const t = adminAccessCopy[locale];
  if (user.clientAssignments.length > 0) {
    return user.clientAssignments
      .map((assignment) => `${assignment.client.code} - ${assignment.client.name}`)
      .join(", ");
  }
  if (user.scopes.length > 0) {
    return user.scopes
      .map((scope) => {
        const assignedScope = scope.client?.code ?? scope.teamCode ?? scope.domain;
        return assignedScope || formatCode(scope.scopeType, locale);
      })
      .join(", ");
  }
  return t.noAssignments;
}

export function permissionLabel(
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

export function moduleGroups(permissions: AdminAccessPermission[]) {
  return permissions.reduce<Record<string, AdminAccessPermission[]>>((groups, permission) => {
    groups[permission.module] = [...(groups[permission.module] ?? []), permission];
    return groups;
  }, {});
}
