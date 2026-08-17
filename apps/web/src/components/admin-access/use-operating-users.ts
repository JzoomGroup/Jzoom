"use client";

import { useMemo, useState, type FormEvent } from "react";
import { adminAccessCopy } from "../../i18n/admin-access";
import {
  adminAccessErrorMessage,
  createOperatingUser,
  fetchAdminUsersSnapshot,
  resetOperatingUserPassword,
  updateOperatingUserScope,
  type CreateOperatingUserPayload,
} from "../../lib/admin-access-client";
import type { AdminAccessSetup, AdminAccessUser } from "../../lib/admin-access-types";
import type { SupportedLocale } from "../../lib/i18n";
import { isLocked } from "./admin-access-formatters";
import {
  emptyOperatingUserForm,
  hasRole,
  isSpecialistScopeRole,
  operatingFormFromUser,
  primaryOperatingRoleCode,
  scopePayloadFromForm,
} from "./operating-user-scope";

export interface AdminAccessFeedback {
  type: "success" | "error";
  text: string;
}

interface UseOperatingUsersInput {
  initialSetup: AdminAccessSetup;
  initialUsers: AdminAccessUser[];
  locale: SupportedLocale;
}

export function useOperatingUsers({ initialSetup, initialUsers, locale }: UseOperatingUsersInput) {
  const t = adminAccessCopy[locale];
  const [currentUsers, setCurrentUsers] = useState(initialUsers);
  const [currentSetup, setCurrentSetup] = useState(initialSetup);
  const [showCreator, setShowCreator] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateOperatingUserPayload>(emptyOperatingUserForm);
  const [saving, setSaving] = useState(false);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<AdminAccessFeedback | null>(null);

  const specialists = useMemo(
    () =>
      currentUsers.filter(
        (user) => hasRole(user, "ROLE-SPECIALIST") || hasRole(user, "ROLE-PROJECT-SPECIALIST"),
      ),
    [currentUsers],
  );
  const supervisors = useMemo(
    () => currentUsers.filter((user) => hasRole(user, "ROLE-SUPERVISOR")),
    [currentUsers],
  );
  const visibleServiceItems = useMemo(() => {
    const selectedMonthlyServiceIds = new Set(form.monthlyServiceIds);
    return currentSetup.serviceItems.filter(
      (item) =>
        form.monthlyServiceIds.length === 0 || selectedMonthlyServiceIds.has(item.monthlyServiceId),
    );
  }, [currentSetup.serviceItems, form.monthlyServiceIds]);

  const metrics = useMemo(
    () => ({
      activeUsers: currentUsers.filter((user) => user.status === "ACTIVE" && !isLocked(user))
        .length,
      disabledUsers: currentUsers.filter((user) => user.status !== "ACTIVE").length,
      lockedUsers: currentUsers.filter(isLocked).length,
      usersWithOverrides: currentUsers.filter((user) => user.permissionOverrides.length > 0).length,
    }),
    [currentUsers],
  );
  const isEditingScope = editingUserId !== null;

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
    if (!primaryOperatingRoleCode(user)) return;
    setEditingUserId(user.id);
    setForm(operatingFormFromUser(user));
    setShowCreator(true);
    setFeedback(null);
  }

  async function submitOperatingUser(event: FormEvent<HTMLFormElement>) {
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
        setFeedback({ type: "success", text: t.userScopeUpdated });
        return;
      }

      const payload: CreateOperatingUserPayload = {
        ...form,
        displayName: form.displayName.trim(),
        email: form.email.trim().toLowerCase(),
        ...scopePayloadFromForm(form, form.roleCode),
        ...(isSpecialistScopeRole(form.roleCode) && form.supervisorId
          ? { supervisorId: form.supervisorId }
          : {}),
      };
      const response = await createOperatingUser(payload);
      setCurrentUsers(response.snapshot.users);
      setCurrentSetup(response.snapshot.setup);
      closeOperatingForm();
      setFeedback({ type: "success", text: t.userCreated });
    } catch (error) {
      setFeedback({ type: "error", text: adminAccessErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword(user: AdminAccessUser) {
    const message = t.resetPasswordConfirmation.replace("{name}", user.displayName);
    if (!window.confirm(message)) return;

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
      setFeedback({ type: "success", text: t.passwordResetSuccess });
    } catch (error) {
      setFeedback({ type: "error", text: adminAccessErrorMessage(error) });
    } finally {
      setResettingUserId(null);
    }
  }

  return {
    closeOperatingForm,
    currentSetup,
    currentUsers,
    feedback,
    form,
    isEditingScope,
    metrics,
    openCreateForm,
    openScopeEditor,
    resetPassword,
    resettingUserId,
    saving,
    setForm,
    showCreator,
    specialists,
    submitOperatingUser,
    supervisors,
    visibleServiceItems,
  };
}
