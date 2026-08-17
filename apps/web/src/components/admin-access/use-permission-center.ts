"use client";

import { useEffect, useMemo, useState } from "react";
import { adminAccessCopy } from "../../i18n/admin-access";
import {
  adminAccessErrorMessage,
  fetchAdminRolesSnapshot,
  replaceAdminRolePermissions,
} from "../../lib/admin-access-client";
import type { AdminAccessPermission, AdminAccessRole } from "../../lib/admin-access-types";
import type { SupportedLocale } from "../../lib/i18n";
import type { AdminAccessFeedback } from "./use-operating-users";

const protectedAdminPermissions = new Set(["PERM-MANAGE-USERS", "PERM-MODIFY-USER-PERMISSIONS"]);

function sorted(values: Iterable<string>): string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

export function usePermissionCenter({
  initialRoles,
  currentUserRoleCodes,
  locale,
  permissions,
}: {
  initialRoles: AdminAccessRole[];
  currentUserRoleCodes: string[];
  locale: SupportedLocale;
  permissions: AdminAccessPermission[];
}) {
  const t = adminAccessCopy[locale];
  const [roles, setRoles] = useState(initialRoles);
  const [selectedRoleCode, setSelectedRoleCode] = useState(initialRoles[0]?.code ?? "");
  const [draftPermissionCodes, setDraftPermissionCodes] = useState<string[]>([]);
  const [moduleFilter, setModuleFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<AdminAccessFeedback | null>(null);

  const selectedRole = roles.find((role) => role.code === selectedRoleCode) ?? null;
  const assignedPermissionCodes = useMemo(
    () =>
      new Set(
        selectedRole?.permissions
          .filter((permission) => permission.status === "ACTIVE" && permission.effect !== "DENY")
          .map((permission) => permission.code) ?? [],
      ),
    [selectedRole],
  );
  const draftSet = useMemo(() => new Set(draftPermissionCodes), [draftPermissionCodes]);
  const modules = useMemo(
    () => [...new Set(permissions.map((permission) => permission.module))].sort(),
    [permissions],
  );
  const visiblePermissions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return permissions.filter((permission) => {
      if (moduleFilter !== "all" && permission.module !== moduleFilter) return false;
      if (!normalizedQuery) return true;
      return [permission.code, permission.name, permission.description, permission.action]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    });
  }, [moduleFilter, permissions, query]);
  const dirty =
    sorted(assignedPermissionCodes).join("|") !== sorted(draftPermissionCodes).join("|");

  useEffect(() => {
    setDraftPermissionCodes(sorted(assignedPermissionCodes));
    setFeedback(null);
  }, [assignedPermissionCodes, selectedRoleCode]);

  function selectRole(roleCode: string) {
    setSelectedRoleCode(roleCode);
    setModuleFilter("all");
    setQuery("");
  }

  function isProtected(permissionCode: string): boolean {
    return selectedRoleCode === "ROLE-ADMIN" && protectedAdminPermissions.has(permissionCode);
  }

  function togglePermission(permissionCode: string) {
    const permission = permissions.find((entry) => entry.code === permissionCode);
    if (isProtected(permissionCode) || permission?.status !== "ACTIVE") return;
    setDraftPermissionCodes((current) =>
      current.includes(permissionCode)
        ? current.filter((code) => code !== permissionCode)
        : [...current, permissionCode],
    );
    setFeedback(null);
  }

  function resetDraft() {
    setDraftPermissionCodes(sorted(assignedPermissionCodes));
    setFeedback(null);
  }

  async function saveRolePermissions() {
    if (!selectedRole || !dirty) return;
    const affectsCurrentUser = currentUserRoleCodes.includes(selectedRole.code);
    if (
      !window.confirm(
        affectsCurrentUser
          ? t.rolePermissionsSelfLogoutConfirmation
          : t.rolePermissionsSaveConfirmation,
      )
    ) {
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      await replaceAdminRolePermissions(selectedRole.code, sorted(draftPermissionCodes));
      if (affectsCurrentUser) {
        window.location.assign("/login");
        return;
      }
      const snapshot = await fetchAdminRolesSnapshot();
      setRoles(snapshot.roles);
      setFeedback({ type: "success", text: t.rolePermissionsSaved });
    } catch (error) {
      setFeedback({ type: "error", text: adminAccessErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  }

  return {
    dirty,
    draftSet,
    feedback,
    isProtected,
    moduleFilter,
    modules,
    query,
    resetDraft,
    roles,
    saveRolePermissions,
    saving,
    selectRole,
    selectedRole,
    selectedRoleCode,
    setModuleFilter,
    setQuery,
    togglePermission,
    visiblePermissions,
  };
}
