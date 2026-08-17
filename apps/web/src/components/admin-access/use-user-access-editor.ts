"use client";

import { useMemo, useState } from "react";
import { adminAccessCopy } from "../../i18n/admin-access";
import {
  adminAccessErrorMessage,
  fetchAdminUsersSnapshot,
  invalidateAdminUserSessions,
  replaceAdminUserPermissionOverrides,
  replaceAdminUserRoles,
  updateAdminUserProfile,
  updateAdminUserStatus,
  type UserPermissionOverridePayload,
} from "../../lib/admin-access-client";
import type {
  AdminAccessPermission,
  AdminAccessRole,
  AdminAccessUser,
  AdminUsersSnapshot,
} from "../../lib/admin-access-types";
import type { SupportedLocale } from "../../lib/i18n";
import type { AdminAccessFeedback } from "./use-operating-users";

export type UserEditorTab = "profile" | "access" | "scope" | "security" | "activity";

export interface EditablePermissionOverride {
  effect: "ALLOW" | "DENY";
  expiresOn: string;
  permissionCode: string;
  reason: string;
}

function dateInputValue(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

function overridesFromUser(user: AdminAccessUser): EditablePermissionOverride[] {
  return user.permissionOverrides.map((override) => ({
    effect: override.effect === "DENY" ? "DENY" : "ALLOW",
    expiresOn: dateInputValue(override.expiresAt),
    permissionCode: override.permission.code,
    reason: override.reason,
  }));
}

export function summarizeEffectivePermissions({
  overrides,
  permissions,
  roleCodes,
  roles,
  today = new Date().toISOString().slice(0, 10),
}: {
  overrides: EditablePermissionOverride[];
  permissions: AdminAccessPermission[];
  roleCodes: string[];
  roles: AdminAccessRole[];
  today?: string;
}) {
  const state = new Map<string, boolean>();
  const activePermissionCodes = new Set(
    permissions
      .filter((permission) => permission.status === "ACTIVE")
      .map((permission) => permission.code),
  );
  for (const role of roles.filter((entry) => roleCodes.includes(entry.code))) {
    for (const permission of role.permissions) {
      if (!activePermissionCodes.has(permission.code)) continue;
      if (permission.effect === "DENY") {
        state.set(permission.code, false);
      } else if (!state.has(permission.code)) {
        state.set(permission.code, true);
      }
    }
  }
  for (const override of overrides) {
    if (
      activePermissionCodes.has(override.permissionCode) &&
      (!override.expiresOn || override.expiresOn >= today)
    ) {
      state.set(override.permissionCode, override.effect === "ALLOW");
    }
  }
  return {
    allowed: [...state.values()].filter(Boolean).length,
    denied: [...state.values()].filter((allowed) => !allowed).length,
    codes: [...state.entries()].filter(([, allowed]) => allowed).map(([code]) => code),
  };
}

export function useUserAccessEditor({
  locale,
  isCurrentUser,
  onSnapshot,
  permissions,
  roles,
  user,
}: {
  locale: SupportedLocale;
  isCurrentUser: boolean;
  onSnapshot: (snapshot: AdminUsersSnapshot) => void;
  permissions: AdminAccessPermission[];
  roles: AdminAccessRole[];
  user: AdminAccessUser;
}) {
  const t = adminAccessCopy[locale];
  const [tab, setTab] = useState<UserEditorTab>("profile");
  const [profile, setProfile] = useState({
    displayName: user.displayName,
    email: user.email,
    preferredLocale: user.preferredLocale === "en" ? ("en" as const) : ("ar" as const),
  });
  const [roleCodes, setRoleCodes] = useState(user.roles.map((role) => role.code));
  const [overrides, setOverrides] = useState<EditablePermissionOverride[]>(overridesFromUser(user));
  const [selectedPermissionCode, setSelectedPermissionCode] = useState("");
  const [status, setStatus] = useState<AdminAccessUser["status"]>(user.status);
  const [savingAction, setSavingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<AdminAccessFeedback | null>(null);

  const availablePermissions = useMemo(() => {
    const selected = new Set(overrides.map((override) => override.permissionCode));
    return permissions.filter(
      (permission) => permission.status === "ACTIVE" && !selected.has(permission.code),
    );
  }, [overrides, permissions]);

  const effectivePermissions = useMemo(() => {
    return summarizeEffectivePermissions({ overrides, permissions, roleCodes, roles });
  }, [overrides, permissions, roleCodes, roles]);

  async function refresh(message: string) {
    const snapshot = await fetchAdminUsersSnapshot();
    onSnapshot(snapshot);
    setFeedback({ type: "success", text: message });
  }

  async function run(
    action: string,
    operation: () => Promise<void>,
    successMessage: string,
    revokesCurrentSession = false,
  ) {
    setSavingAction(action);
    setFeedback(null);
    try {
      await operation();
      if (isCurrentUser && revokesCurrentSession) {
        window.location.assign("/login");
        return;
      }
      await refresh(successMessage);
    } catch (error) {
      setFeedback({ type: "error", text: adminAccessErrorMessage(error) });
    } finally {
      setSavingAction(null);
    }
  }

  async function saveProfile() {
    await run(
      "profile",
      async () => {
        await updateAdminUserProfile(user.id, {
          displayName: profile.displayName.trim(),
          email: profile.email.trim().toLowerCase(),
          preferredLocale: profile.preferredLocale,
        });
      },
      t.profileSaved,
    );
  }

  async function saveRoles() {
    if (roleCodes.length === 0) {
      setFeedback({ type: "error", text: t.roleRequired });
      return;
    }
    if (!window.confirm(t.rolesSaveConfirmation)) return;
    await run(
      "roles",
      async () => {
        await replaceAdminUserRoles(user.id, roleCodes);
      },
      t.rolesSaved,
      true,
    );
  }

  async function saveOverrides() {
    if (overrides.some((override) => override.reason.trim().length < 3)) {
      setFeedback({ type: "error", text: t.exceptionReasonRequired });
      return;
    }
    const payload: UserPermissionOverridePayload[] = overrides.map((override) => ({
      permissionCode: override.permissionCode,
      effect: override.effect,
      reason: override.reason.trim(),
      ...(override.expiresOn ? { expiresAt: `${override.expiresOn}T23:59:59.999Z` } : {}),
    }));
    await run(
      "overrides",
      async () => {
        await replaceAdminUserPermissionOverrides(user.id, payload);
      },
      t.exceptionsSaved,
      true,
    );
  }

  async function saveStatus() {
    if (status === "INVITED") return;
    if (!window.confirm(t.statusSaveConfirmation)) return;
    await run(
      "status",
      async () => {
        await updateAdminUserStatus(user.id, status);
      },
      t.statusUpdated,
      status !== "ACTIVE",
    );
  }

  async function invalidateSessions() {
    if (!window.confirm(t.invalidateSessionsConfirmation)) return;
    await run(
      "sessions",
      async () => {
        await invalidateAdminUserSessions(user.id);
      },
      t.sessionsInvalidated,
      true,
    );
  }

  function toggleRole(roleCode: string) {
    setRoleCodes((current) =>
      current.includes(roleCode)
        ? current.filter((code) => code !== roleCode)
        : [...current, roleCode],
    );
    setFeedback(null);
  }

  function addOverride() {
    if (!selectedPermissionCode) return;
    setOverrides((current) => [
      ...current,
      { permissionCode: selectedPermissionCode, effect: "ALLOW", reason: "", expiresOn: "" },
    ]);
    setSelectedPermissionCode("");
    setFeedback(null);
  }

  function updateOverride(
    permissionCode: string,
    patch: Partial<Omit<EditablePermissionOverride, "permissionCode">>,
  ) {
    setOverrides((current) =>
      current.map((override) =>
        override.permissionCode === permissionCode ? { ...override, ...patch } : override,
      ),
    );
    setFeedback(null);
  }

  function removeOverride(permissionCode: string) {
    setOverrides((current) =>
      current.filter((override) => override.permissionCode !== permissionCode),
    );
    setFeedback(null);
  }

  return {
    addOverride,
    availablePermissions,
    effectivePermissions,
    feedback,
    invalidateSessions,
    overrides,
    profile,
    removeOverride,
    roleCodes,
    saveOverrides,
    saveProfile,
    saveRoles,
    saveStatus,
    savingAction,
    selectedPermissionCode,
    setProfile,
    setSelectedPermissionCode,
    setStatus,
    setTab,
    status,
    tab,
    toggleRole,
    updateOverride,
  };
}

export type UserAccessEditorController = ReturnType<typeof useUserAccessEditor>;
