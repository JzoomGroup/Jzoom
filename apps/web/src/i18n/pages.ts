import type { SupportedLocale } from "../lib/i18n";

export const authPageCopy = {
  login: {
    ar: {
      eyebrow: "منصة جزوم التشغيلية",
      title: "مرحبًا بعودتك.",
      lead: "سجل الدخول بحسابك المخصص للمنصة.",
    },
    en: {
      eyebrow: "Jzoom Operating Platform",
      title: "Welcome back.",
      lead: "Sign in with your assigned platform account.",
    },
  },
  changePassword: {
    ar: {
      eyebrow: "أمان الحساب",
      title: "غيّر كلمة المرور",
      lead: "تم تسجيل دخولك بكلمة مرور مؤقتة. اختر كلمة مرور جديدة وأكدها قبل دخول المنصة.",
    },
    en: {
      eyebrow: "Account security",
      title: "Change your password",
      lead: "You signed in with a temporary password. Choose and confirm a new password before entering the platform.",
    },
  },
  forbidden: {
    ar: {
      eyebrow: "403 - لا توجد صلاحية",
      title: "لا يمكنك فتح هذه الصفحة.",
      lead: "حسابك مسجل الدخول، لكنه لا يملك الصلاحية المطلوبة.",
      back: "العودة إلى الملف الشخصي",
    },
    en: {
      eyebrow: "403 - Permission denied",
      title: "You cannot open this page.",
      lead: "Your account is signed in, but it does not have the required permission.",
      back: "Return to profile",
    },
  },
} as const;

export const systemStateCopy = {
  ar: {
    loading: "جاري تجهيز الصفحة...",
    errorEyebrow: "تعذر إكمال الطلب",
    errorTitle: "حدث خلل مؤقت.",
    errorLead:
      "لم نتمكن من تحميل هذه الصفحة الآن. أعد المحاولة، وإذا استمرت المشكلة تواصل مع مسؤول المنصة.",
    retry: "إعادة المحاولة",
    home: "العودة إلى الرئيسية",
    notFoundEyebrow: "404 - الصفحة غير موجودة",
    notFoundTitle: "لم نعثر على هذه الصفحة.",
    notFoundLead: "قد يكون الرابط تغير أو لم يعد متاحًا لحسابك.",
  },
  en: {
    loading: "Preparing the page...",
    errorEyebrow: "Request interrupted",
    errorTitle: "A temporary problem occurred.",
    errorLead:
      "We could not load this page. Try again, and contact the platform administrator if the problem continues.",
    retry: "Try again",
    home: "Return home",
    notFoundEyebrow: "404 - Page not found",
    notFoundTitle: "We could not find this page.",
    notFoundLead: "The link may have changed or may no longer be available to your account.",
  },
} as const;

export const settingsPageCopy = {
  ar: {
    eyebrow: "إعدادات الأدمن",
    title: "إعدادات المنصة",
    lead: "الصلاحية محمية من الـ API. تتم إدارة إعدادات المنصة من لوحة التحكم.",
    open: "فتح إعدادات المنصة",
    signOut: "تسجيل الخروج",
    signingOut: "جاري تسجيل الخروج...",
  },
  en: {
    eyebrow: "Admin only",
    title: "Platform settings",
    lead: "Access is enforced by the API. Platform configuration is managed from the Admin Console.",
    open: "Open platform configuration",
    signOut: "Sign out",
    signingOut: "Signing out...",
  },
} as const;

export const profilePageCopy = {
  ar: {
    eyebrow: "حسابي",
    title: "إعدادات الحساب",
    lead: "راجع معلومات حسابك وحدّث كلمة المرور من مكان واحد.",
    email: "البريد الإلكتروني",
    accountType: "نوع الحساب",
    roles: "الأدوار",
    language: "اللغة",
    arabic: "العربية",
    english: "English",
    clientAccount: "حساب عميل",
    internalAccount: "حساب داخلي",
    securityTitle: "كلمة المرور",
    securityLead: "استخدم كلمة قوية لا تستعملها في حسابات أخرى.",
    signOut: "تسجيل الخروج",
    signingOut: "جاري تسجيل الخروج...",
  },
  en: {
    eyebrow: "My account",
    title: "Account settings",
    lead: "Review your account information and update your password in one place.",
    email: "Email",
    accountType: "Account type",
    roles: "Roles",
    language: "Language",
    arabic: "العربية",
    english: "English",
    clientAccount: "Client account",
    internalAccount: "Internal account",
    securityTitle: "Password",
    securityLead: "Use a strong password that you do not use for other accounts.",
    signOut: "Sign out",
    signingOut: "Signing out...",
  },
} as const;

const roleLabels: Record<string, Record<SupportedLocale, string>> = {
  "ROLE-ADMIN": { ar: "أدمن", en: "Admin" },
  "ROLE-AM": { ar: "مدير حساب", en: "Account Manager" },
  "ROLE-CLIENT": { ar: "عميل", en: "Client" },
  "ROLE-MGMT": { ar: "الإدارة", en: "Management" },
  "ROLE-PROJECT-SPECIALIST": { ar: "مختص مشاريع", en: "Project Specialist" },
  "ROLE-SPECIALIST": { ar: "مختص", en: "Specialist" },
  "ROLE-SUPERVISOR": { ar: "مشرف", en: "Supervisor" },
};

export function profileRoleLabel(role: string, locale: SupportedLocale): string {
  return roleLabels[role]?.[locale] ?? role.replace(/^ROLE-/, "");
}
