import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "../../components/app-shell";
import { LogoutButton } from "../../components/logout-button";
import { PageHeader, SectionCard } from "../../components/premium-os";
import { getCurrentUser, hasBackendAdminAccess } from "../../lib/auth";
import { normalizeLocale } from "../../lib/i18n";
import { protectedRouteRedirect } from "../../lib/route-access";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const destination = protectedRouteRedirect(user, true);
  if (destination) {
    redirect(destination);
  }
  if (!(await hasBackendAdminAccess())) {
    redirect("/403");
  }

  const locale = normalizeLocale(user!.preferredLocale);
  const copy =
    locale === "ar"
      ? {
          eyebrow: "إعدادات الأدمن",
          title: "إعدادات المنصة",
          lead: "الصلاحية محمية من الـ API. تتم إدارة إعدادات المنصة من لوحة التحكم.",
          open: "فتح إعدادات المنصة",
          signOut: "تسجيل الخروج",
          signingOut: "جاري تسجيل الخروج...",
        }
      : {
          eyebrow: "Admin only",
          title: "Platform settings",
          lead: "Access is enforced by the API. Platform configuration is managed from the Admin Console.",
          open: "Open platform configuration",
          signOut: "Sign out",
          signingOut: "Signing out...",
        };

  return (
    <AppShell
      activePath="/settings"
      displayName={user!.displayName}
      isAdmin
      locale={locale}
      mode="admin"
      permissions={user!.permissions}
      roles={user!.roles}
    >
      <PageHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.lead} />

      <SectionCard title={copy.title} description={copy.lead}>
        <div className="row-actions">
          <Link className="os-button os-button-primary" href="/admin/platform-configuration">
            {copy.open}
          </Link>
          <LogoutButton label={copy.signOut} submittingLabel={copy.signingOut} />
        </div>
      </SectionCard>
    </AppShell>
  );
}
