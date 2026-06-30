import { redirect } from "next/navigation";
import { AppShell } from "../../components/app-shell";
import { LogoutButton } from "../../components/logout-button";
import { PageHeader, SectionCard } from "../../components/premium-os";
import { getCurrentUser } from "../../lib/auth";
import { normalizeLocale } from "../../lib/i18n";
import { protectedRouteRedirect } from "../../lib/route-access";

const roleLabels = {
  "ROLE-ADMIN": { ar: "أدمن", en: "Admin" },
  "ROLE-AM": { ar: "مدير حساب", en: "Account Manager" },
  "ROLE-CLIENT": { ar: "عميل", en: "Client" },
  "ROLE-MGMT": { ar: "الإدارة", en: "Management" },
  "ROLE-SPECIALIST": { ar: "مختص", en: "Specialist" },
  "ROLE-SUPERVISOR": { ar: "مشرف", en: "Supervisor" },
} as const;

function accountTypeLabel(userType: "INTERNAL" | "EXTERNAL", locale: "ar" | "en"): string {
  if (userType === "EXTERNAL") {
    return locale === "ar" ? "حساب عميل" : "Client account";
  }
  return locale === "ar" ? "حساب داخلي" : "Internal account";
}

function roleLabel(role: string, locale: "ar" | "en"): string {
  return roleLabels[role as keyof typeof roleLabels]?.[locale] ?? role.replace(/^ROLE-/, "");
}

export default async function ProfilePage() {
  const user = await getCurrentUser();
  const destination = protectedRouteRedirect(user);
  if (destination) {
    redirect(destination);
  }

  const locale = normalizeLocale(user!.preferredLocale);
  const copy =
    locale === "ar"
      ? {
          eyebrow: "الملف الشخصي",
          title: "ملف الحساب",
          lead: "معلومات الدخول والصلاحيات الحالية داخل منصة جزوم.",
          email: "البريد الإلكتروني",
          accountType: "نوع الحساب",
          roles: "الأدوار",
          language: "اللغة",
          signOut: "تسجيل الخروج",
          signingOut: "جاري تسجيل الخروج...",
        }
      : {
          eyebrow: "Authenticated profile",
          title: "Account profile",
          lead: "Current sign-in, role, and permission context for the Jzoom platform.",
          email: "Email",
          accountType: "Account type",
          roles: "Roles",
          language: "Language",
          signOut: "Sign out",
          signingOut: "Signing out...",
        };
  const mode = user!.userType === "EXTERNAL" ? "client" : "internal";

  return (
    <AppShell
      activePath="/profile"
      displayName={user!.displayName}
      isAdmin={user!.roles.includes("ROLE-ADMIN")}
      locale={locale}
      mode={mode}
      permissions={user!.permissions}
      roles={user!.roles}
    >
      <PageHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.lead} />

      <SectionCard title={user!.displayName} description={user!.email}>
        <dl className="profile-list os-definition-list">
          <div>
            <dt>{copy.email}</dt>
            <dd>{user!.email}</dd>
          </div>
          <div>
            <dt>{copy.accountType}</dt>
            <dd>{accountTypeLabel(user!.userType, locale)}</dd>
          </div>
          <div>
            <dt>{copy.roles}</dt>
            <dd>{user!.roles.map((role) => roleLabel(role, locale)).join(", ")}</dd>
          </div>
          <div>
            <dt>{copy.language}</dt>
            <dd>{locale === "ar" ? "العربية" : "English"}</dd>
          </div>
        </dl>
        <LogoutButton label={copy.signOut} submittingLabel={copy.signingOut} />
      </SectionCard>
    </AppShell>
  );
}
