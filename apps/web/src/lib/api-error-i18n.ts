import type { ApiErrorBody } from "./catalog-types";

const arabicMessages: Record<string, string> = {
  ACCEPTED_QUOTE_REQUIRED_FOR_ONBOARDING: "لا يمكن تفعيل الخدمات قبل تأكيد الدفع.",
  ARCHIVED_CLIENT_IMMUTABLE: "العميل المؤرشف متاح للقراءة فقط ولا يمكن تعديله.",
  ARCHIVED_PRICING_DRAFT_CANNOT_BE_DELETED: "لا يمكن حذف مسودة مؤرشفة؛ ستبقى محفوظة كسجل تاريخي.",
  CLIENT_CODE_ALREADY_EXISTS: "رمز العميل مستخدم مسبقًا. اختر رمزًا آخر.",
  CLIENT_PORTAL_USER_EMAIL_ALREADY_EXISTS: "البريد الإلكتروني مرتبط بمستخدم آخر بالفعل.",
  FILE_REQUIRED: "اختر ملفًا غير فارغ ثم أعد المحاولة.",
  FILE_TOO_LARGE: "حجم الملف يتجاوز الحد المسموح.",
  INVALID_SPECIALIST_ASSIGNMENT: "أحد المختصين المحددين غير متاح حاليًا.",
  DUPLICATE_PERMISSION_OVERRIDE: "لا يمكن إضافة أكثر من استثناء للصلاحية نفسها.",
  INVALID_PERMISSION_OVERRIDE_EXPIRY: "يجب أن يكون تاريخ انتهاء الاستثناء في المستقبل.",
  INVALID_PERMISSION_SELECTION: "إحدى الصلاحيات المحددة غير متاحة حاليًا.",
  LAST_ADMIN_PROTECTED: "لا يمكن تنفيذ التغيير لأنه سيزيل آخر مسار فعال لإدارة النظام.",
  PORTAL_USER_EMAIL_ALREADY_INTERNAL:
    "البريد الإلكتروني مرتبط بمستخدم داخلي ولا يمكن استخدامه للعميل.",
  PRICING_DRAFT_HAS_QUOTES:
    "لا يمكن حذف مسودة مرتبطة بعرض سعر. استخدم الأرشفة للحفاظ على السجل التجاري.",
  PRICING_DRAFT_NOT_FOUND: "تعذر العثور على المسودة أو لا تملك صلاحية الوصول إليها.",
  PROJECT_OUTPUT_FILE_REQUIRED: "أرفق ملفًا واحدًا على الأقل قبل إرسال المخرج للمراجعة.",
  PROJECT_OUTPUT_FILE_LOCKED: "لا يمكن تعديل ملفات هذا المخرج في حالته الحالية.",
  PROJECT_OUTPUT_RETURN_REASON_REQUIRED: "اكتب سببًا واضحًا قبل إعادة المخرج للتعديل.",
  PROJECT_OUTPUT_REVIEW_REASON_REQUIRED: "اكتب ملاحظة المراجعة قبل إعادة المخرج للمختص.",
  PROJECT_OUTPUT_TRANSITION_NOT_ALLOWED: "هذا الانتقال غير متاح في حالة المخرج الحالية.",
  QUOTE_SERVICE_SPECIALIST_REQUIRED: "اختر مختصًا واحدًا على الأقل لكل خدمة قبل التفعيل.",
  REQUEST_NOT_WAITING_SUPERVISOR: "الطلب ليس في مرحلة مراجعة المشرف حاليًا.",
  REQUEST_OUTPUT_REVIEW_REQUIRED: "راجع المخرج المرسل أولًا قبل اعتماد الطلب.",
  REQUEST_OUTPUT_FILE_REQUIRED: "أرفق ملف المخرج قبل إرساله للمراجعة.",
  REQUEST_OUTPUT_NOT_SUBMITTABLE: "ارفع نسخة جديدة من المخرج قبل إرساله للمراجعة.",
  REQUEST_OUTPUT_REVIEW_REASON_REQUIRED: "اكتب ملاحظة واضحة قبل إعادة المخرج أو رفضه.",
  REQUEST_REVIEW_REASON_REQUIRED: "اكتب ملاحظة واضحة قبل إعادة الطلب أو رفضه أو تصعيده.",
  ROLE_USER_TYPE_MISMATCH: "لا يمكن الجمع بين أدوار المستخدمين الداخليين وحسابات العملاء.",
  TIME_ENTRY_REVIEW_REASON_REQUIRED: "اكتب سبب رفض سجل الساعات قبل المتابعة.",
  SPECIALIST_SERVICE_SCOPE_MISMATCH: "أحد المختصين المحددين غير مؤهل لهذه الخدمة.",
  SUPERVISOR_ACCOUNT_MANAGER_ASSIGNMENT_FORBIDDEN: "لا يملك المشرف صلاحية تغيير مدير الحساب.",
  SUPERVISOR_SELF_ASSIGNMENT_REQUIRED: "يمكن للمشرف إسناد مراجعة الطلب إلى نفسه فقط.",
  SUPERVISOR_SPECIALIST_CLEAR_FORBIDDEN: "لا يمكن للمشرف إزالة إسناد المختص من الطلب.",
  SUPERVISOR_TEAM_ASSIGNMENT_REQUIRED: "المختص المحدد ليس ضمن فريق هذا المشرف.",
  USER_EMAIL_ALREADY_EXISTS: "البريد الإلكتروني مرتبط بمستخدم آخر بالفعل.",
  USER_NOT_FOUND: "تعذر العثور على المستخدم أو أن حسابه مؤرشف.",
  VALIDATION_ERROR: "راجع الحقول المدخلة وأكمل القيم المطلوبة بصورة صحيحة.",
};

export function interfaceIsArabic(): boolean {
  return typeof document !== "undefined" && document.documentElement.lang.startsWith("ar");
}

export function localizedApiErrorMessage(
  body: ApiErrorBody,
  englishMessage: string,
  arabicFallback = "تعذر حفظ التغيير. راجع البيانات وحاول مرة أخرى.",
): string {
  if (!interfaceIsArabic()) {
    const fields = body.fieldErrors?.map((field) => field.message).join(" ");
    return fields || englishMessage;
  }
  const arabicMessage = body.code ? arabicMessages[body.code] : undefined;
  if (arabicMessage) return arabicMessage;
  return arabicFallback;
}
