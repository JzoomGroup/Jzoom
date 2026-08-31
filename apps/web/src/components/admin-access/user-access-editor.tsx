"use client";

import { useEffect } from "react";
import { Activity, KeyRound, Network, ShieldCheck, UserRound } from "lucide-react";
import { adminAccessCopy } from "../../i18n/admin-access";
import type {
  AdminAccessPermission,
  AdminAccessRole,
  AdminAccessUser,
  AdminUsersSnapshot,
} from "../../lib/admin-access-types";
import type { SupportedLocale } from "../../lib/i18n";
import { UserAccessActivityPanel } from "./user-access-activity-panel";
import { UserAccessProfilePanel } from "./user-access-profile-panel";
import { UserAccessRolesPanel } from "./user-access-roles-panel";
import { UserAccessScopePanel } from "./user-access-scope-panel";
import { UserAccessSecurityPanel } from "./user-access-security-panel";
import { useUserAccessEditor, type UserEditorTab } from "./use-user-access-editor";

const tabIcons = {
  access: ShieldCheck,
  activity: Activity,
  profile: UserRound,
  scope: Network,
  security: KeyRound,
} as const;

export function UserAccessEditor({
  canModifyPermissions,
  isCurrentUser,
  locale,
  onEditScope,
  onBusyChange,
  onResetPassword,
  onSnapshot,
  permissions,
  resettingPassword,
  roles,
  user,
}: {
  canModifyPermissions: boolean;
  isCurrentUser: boolean;
  locale: SupportedLocale;
  onEditScope: (user: AdminAccessUser) => void;
  onBusyChange?: (busy: boolean) => void;
  onResetPassword: (user: AdminAccessUser) => Promise<void>;
  onSnapshot: (snapshot: AdminUsersSnapshot) => void;
  permissions: AdminAccessPermission[];
  resettingPassword: boolean;
  roles: AdminAccessRole[];
  user: AdminAccessUser;
}) {
  const t = adminAccessCopy[locale];
  const editor = useUserAccessEditor({
    isCurrentUser,
    locale,
    onSnapshot,
    permissions,
    roles,
    user,
  });
  useEffect(() => {
    onBusyChange?.(Boolean(editor.savingAction) || resettingPassword);
    return () => onBusyChange?.(false);
  }, [editor.savingAction, onBusyChange, resettingPassword]);
  const tabs: Array<{ id: UserEditorTab; label: string }> = [
    { id: "profile", label: t.userProfile },
    { id: "access", label: t.accessAndRoles },
    { id: "scope", label: t.operatingScope },
    { id: "security", label: t.accountSecurity },
    { id: "activity", label: t.activity },
  ];

  return (
    <section className="user-access-center" aria-label={t.userDetails}>
      <p className="user-access-description">{t.userManagementDescription}</p>

      <nav className="user-access-tabs" aria-label={t.userDetails}>
        {tabs.map((tab) => {
          const Icon = tabIcons[tab.id];
          return (
            <button
              key={tab.id}
              type="button"
              className={editor.tab === tab.id ? "active" : undefined}
              aria-current={editor.tab === tab.id ? "page" : undefined}
              onClick={() => editor.setTab(tab.id)}
            >
              <Icon aria-hidden="true" size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {editor.feedback ? (
        <div className={`access-feedback ${editor.feedback.type}`} role="status">
          {editor.feedback.text}
        </div>
      ) : null}

      {editor.tab === "profile" ? (
        <UserAccessProfilePanel editor={editor} locale={locale} user={user} />
      ) : null}
      {editor.tab === "access" ? (
        <UserAccessRolesPanel
          canModifyPermissions={canModifyPermissions}
          editor={editor}
          locale={locale}
          permissions={permissions}
          roles={roles}
          user={user}
        />
      ) : null}
      {editor.tab === "scope" ? (
        <UserAccessScopePanel locale={locale} onEditScope={onEditScope} user={user} />
      ) : null}
      {editor.tab === "security" ? (
        <UserAccessSecurityPanel
          editor={editor}
          locale={locale}
          onResetPassword={onResetPassword}
          resettingPassword={resettingPassword}
          user={user}
        />
      ) : null}
      {editor.tab === "activity" ? <UserAccessActivityPanel locale={locale} user={user} /> : null}
    </section>
  );
}
